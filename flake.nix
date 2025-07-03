{
  description = "React native flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs =
    {
      self,
      nixpkgs,
      flake-utils,
    }:
    flake-utils.lib.eachDefaultSystem (
      system:
      let
        pkgs = import nixpkgs {
          inherit system;

          config.android_sdk.accept_license = true;
          config.allowUnfree = true;
        };
        android = {
          buildToolsVersion = "35.0.0";
          cmakeVersion = "3.22.1";
          ndkVersion = "27.1.12297006";
        };
        androidComposition = pkgs.androidenv.composeAndroidPackages {
          buildToolsVersions = [ android.buildToolsVersion "34.0.0" ];
          platformVersions = [ "35" ];
          includeNDK = true;
          ndkVersion = android.ndkVersion;
          cmakeVersions = [ android.cmakeVersion ];
        };
        
        # Read package.json to get version
        packageJson = builtins.fromJSON (builtins.readFile ./package.json);
        
        # Fetch the template manually to avoid network accesses during the expo prebuild
        expoTemplate = pkgs.stdenv.mkDerivation {
          name = "expo-template-bare-minimum";
          src = pkgs.fetchFromGitHub {
            owner = "expo";
            repo = "expo";
            # NOTE: update this with new major expo versions. This is for sdk-53
            rev = "2b05fed7f45dc643175e4f1aad114e33402c6584";
            sha256 = "sha256-cMb+hE8rCgZSoLJGvGrqa0dvU+wn+GZBNDK3Fj4egII=";
            sparseCheckout = [ "templates/expo-template-bare-minimum" ];
          };
          nativeBuildInputs = [ pkgs.nodejs_23 ];
          buildPhase = ''
            # Set up npm environment to avoid permission issues
            export HOME=$TMPDIR
            export npm_config_cache=$TMPDIR/.npm
            export npm_config_tmp=$TMPDIR
            
            # Pack the local template directory, not a package from npm registry
            cd templates/expo-template-bare-minimum
            npm pack
          '';
          installPhase = ''
            mkdir -p $out
            cp expo-template-bare-minimum-*.tgz $out/expo-template-bare-minimum.tar.gz
          '';
        };
        
        # First stage: Generate native Android project using Expo
        expo-prebuild = pkgs.buildNpmPackage {
          pname = "portal-expo-prebuild";
          version = packageJson.version;
          src = pkgs.lib.cleanSourceWith {
            src = ./.;
            filter = path: type: let
              baseName = baseNameOf path;
            in
              # Exclude flake.nix and flake.lock to prevent rebuilds when only Nix config changes
              baseName != "flake.nix" &&
              baseName != "flake.lock" &&
              # Exclude common development files
              baseName != "result" &&
              baseName != ".git" &&
              baseName != ".gitignore" &&
              baseName != "README.md" &&
              # Include everything else
              true;
          };
          
          npmDepsHash = "sha256-TSFjyuWOX2rmeYufHS+t8YCgIOS7wQ7ohi9d1N41YUk=";
          
          nativeBuildInputs = with pkgs; [
            nodejs_23
          ];

          buildPhase = ''
            # Generate the native Android project (non-interactive)
            # Use local template tarball to avoid network access
            EXPO_NO_GIT_STATUS=1 npx expo prebuild \
              --platform android \
              --clean \
              --no-install \
              --template ${expoTemplate}/expo-template-bare-minimum.tar.gz
          '';

          installPhase = ''
            mkdir -p $out
            cp -r * $out/
          '';
        };

        ANDROID_HOME = "${androidComposition.androidsdk}/libexec/android-sdk";
        GRADLE_JAVA_OPTS = "-Porg.gradle.java.installations.auto-detect=false -Porg.gradle.java.installations.auto-download=false -Porg.gradle.java.installations.paths=${pkgs.openjdk17.home}";
        GRADLE_OPTS = "-Dorg.gradle.project.android.aapt2FromMavenOverride=${ANDROID_HOME}/build-tools/${android.buildToolsVersion}/aapt2 ";

        # Inspired by https://rafael.ovh/posts/packaging-gradle-software-with-nix/
        android-bundle = pkgs.stdenv.mkDerivation rec {
          name = "portal-android-bundle";
          src = expo-prebuild;
          nativeBuildInputs = with pkgs; [ gradle nodejs_23 zip ];
          
          GRADLE_ARGS = "--no-daemon --write-verification-metadata sha512";
          JAVA_HOME = pkgs.openjdk17.home;

          inherit ANDROID_HOME GRADLE_OPTS;
          
          dontFixup = true;
          
          buildPhase = ''
            export HOME=$TMPDIR

            cd android
            GRADLE_USER_HOME=$(pwd)/.gradle ./gradlew ${GRADLE_JAVA_OPTS} ${GRADLE_ARGS} assembleRelease
          '';
          
          installPhase = ''
            mkdir -p $out/bin
            
            # Copy the release APK
            find ./app/build/outputs/apk/release -name "*.apk" -exec cp {} $out/bin/portal-android-release.apk \;

            # Strip signature made with a random key
            zip -d $out/bin/portal-android-release.apk "META-INF/*"
          '';
          
          outputHashAlgo = "sha256";
          outputHashMode = "recursive";
          outputHash = "sha256-PADwFlhqgDtV7RmmQZuLAv6ZR/221h87w364MbXqPKk=";
        };
      in
      {
        packages = {
          inherit expo-prebuild android-bundle;
        };

        devShells = {
          default = pkgs.mkShell rec {
            name = "rn-shell";
            # Packages included in the environment
            buildInputs = with pkgs; [
              aider-chat
              nodejs_23
              openjdk17
            ];

            ANDROID_SDK_ROOT = "${androidComposition.androidsdk}/libexec/android-sdk";
            ANDROID_HOME = "${ANDROID_SDK_ROOT}";
            ANDROID_NDK_ROOT = "${ANDROID_SDK_ROOT}/ndk-bundle";
            JAVA_HOME = pkgs.openjdk17.home;

            # Ensures that we don't have to use a FHS env by using the nix store's aapt2.
            GRADLE_OPTS = "-Dorg.gradle.project.android.aapt2FromMavenOverride=${ANDROID_SDK_ROOT}/build-tools/${android.buildToolsVersion}/aapt2";

            # Run when the shell is started up
            shellHook = ''
              export PATH="$HOME/.npm-global/bin:$PATH"
              export PATH="./node_modules/.bin:$PATH"
              npm config set prefix "$HOME/.npm-global"

              if ! command -v npx expo &> /dev/null; then
                echo "installing expo..."
                npm install -g @expo/cli
              fi
            '';
          };
        };
      }
    );
}
