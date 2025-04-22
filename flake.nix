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
        };
      in
      {
        devShells = {
          default = pkgs.mkShell {
            name = "rn-shell";
            # Packages included in the environment
            buildInputs = with pkgs; [
              aider-chat
              nodejs_23
            ];

            # Run when the shell is started up
            shellHook = ''
              export PATH="$HOME/.npm-global/bin:$PATH"
              export PATH="./node_modules/.bin:$PATH"
              npm config set prefix "$HOME/.npm-global"

              if ! command -v expo &> /dev/null; then
	              echo "installing expo..."
                npm install -g @expo/cli
              fi
            '';
          };
        };
      }
    );
}
