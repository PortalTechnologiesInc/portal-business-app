import { useEffect, useState } from "react";
import { Text, View, Platform, SafeAreaView, AppState } from "react-native";
import type { AppStateStatus } from "react-native";
import { Stack, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import * as SecureStore from "expo-secure-store";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { OnboardingProvider } from "@/context/OnboardingContext";
import { PendingRequestsProvider } from "@/context/PendingRequestsContext";
import { UserProfileProvider } from "@/context/UserProfileContext";
import { WalletProvider } from "@/context/WalletContext";
import { StatusBar } from "expo-status-bar";
import { Colors } from "@/constants/Colors";
import { Asset } from "expo-asset";
import { getMnemonic, mnemonicEvents } from "@/services/SecureStorageService";
import { Mnemonic } from "portal-app-lib";
import { getNostrServiceInstance } from "@/services/nostr/NostrService";
import { SQLiteDatabase, SQLiteProvider } from "expo-sqlite";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Preload all commonly used images
const preloadImages = async () => {
	const images = [
		require("../assets/images/appLogo.png"),
		require("../assets/images/logoFull.png"),
	];

	return Asset.loadAsync(images);
};

export default function RootLayout() {
	const [isReady, setIsReady] = useState(false);
	const [mnemonic, setMnemonic] = useState<string | null>(null);

	const router = useRouter();

	useEffect(() => {
		// Handle links when app is already running
		const subscription = Linking.addEventListener("url", (event) => {
			const { path, queryParams } = Linking.parse(event.url);
			console.log("Received link:", path, queryParams);

			// Update the navigation line
			if (path) {
				// Cast to any since we're getting dynamic path from deep link
				// eslint-disable-next-line @typescript-eslint/no-explicit-any
				router.navigate(path as any);

				// Or check for specific routes you know exist:
				if (path === "onboarding") {
					router.navigate("/onboarding");
				} else if (path === "login") {
					router.navigate("/"); // Or wherever login should go
				}
			}
		});

		// Check for initial URL that launched the app
		const checkInitialLink = async () => {
			const initialUrl = await Linking.getInitialURL();
			if (initialUrl) {
				const { path, queryParams } = Linking.parse(initialUrl);
				console.log("Initial link:", path, queryParams);
				// Handle the initial link
			}
		};

		checkInitialLink();
		return () => subscription.remove();
	}, [router]);

	useEffect(() => {
		async function prepare() {
			try {
				// Preload required assets
				await preloadImages();

				// Add a shorter delay to ensure initialization is complete
				await new Promise((resolve) => setTimeout(resolve, 300));
				setIsReady(true);
			} catch (error) {
				console.error("Error preparing app:", error);
			} finally {
				await SplashScreen.hideAsync();
			}
		}

		prepare();
	}, []);

	// Check for mnemonic existence and log its status
	useEffect(() => {
		const checkMnemonic = async () => {
			try {
				const mnemonicValue = await getMnemonic();
				setMnemonic(mnemonicValue);
			} catch (error) {
				console.error("SecureStore access failed:", error);
			}
		};

		// Check on initial load
		checkMnemonic();

		// Also check when app returns to foreground
		const appStateSubscription = AppState.addEventListener(
			"change",
			(nextAppState: AppStateStatus) => {
				if (nextAppState === "active") {
					console.log("App became active, checking mnemonic...");
					checkMnemonic();
				}
			},
		);

		// Subscribe to mnemonic change events
		const mnemonicSubscription = mnemonicEvents.addListener(
			"mnemonicChanged",
			(newMnemonicValue) => {
				console.log("Mnemonic change event received!");
				setMnemonic(newMnemonicValue);
			},
		);

		return () => {
			appStateSubscription.remove();
			mnemonicSubscription.remove();
		};
	}, []);

	// Log whenever mnemonic changes
	useEffect(() => {
		console.log("Mnemonic value:", mnemonic);
		const initializeNostrService = async () => {
			if (mnemonic) {
				console.log("Initializing PortalApp with mnemonic");
				try {
					const mnemonicObj = new Mnemonic(mnemonic);
					const nostrService = getNostrServiceInstance(mnemonicObj);

					// Make sure initialization completes before continuing
					if (!nostrService.isInitialized()) {
						await nostrService.initialize(mnemonicObj);
					}

					console.log(
						"NostrService initialized successfully with public key:",
						nostrService.getPublicKey(),
					);
				} catch (error) {
					console.error("Failed to initialize NostrService:", error);
				}
			} else {
				console.log("Mnemonic does not exist");
			}
		};

		initializeNostrService();
	}, [mnemonic]);

	if (!isReady) {
		return (
			<SafeAreaView style={{ flex: 1, backgroundColor: "#000000" }}>
				<StatusBar style="light" />
				<View
					style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
				>
					<Text style={{ color: Colors.almostWhite }}>Loading...</Text>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<GestureHandlerRootView style={{ flex: 1, backgroundColor: "#000000" }}>
			<StatusBar style="light" />
            <SQLiteProvider databaseName="portal-app.db" onInit={migrateDbIfNeeded}>
			  <OnboardingProvider>
			  	<UserProfileProvider>
			  		<WalletProvider>
			  			<PendingRequestsProvider>
			  				<Stack
			  					screenOptions={{
			  						headerShown: false,
			  						contentStyle: {
			  							backgroundColor: "#000000",
			  						},
			  					}}
			  				>
			  					<Stack.Screen name="(tabs)" options={{ headerShown: false }} />
			  					<Stack.Screen name="index" />
			  					<Stack.Screen name="onboarding" />
			  					<Stack.Screen
			  						name="settings"
			  						options={{ presentation: "modal" }}
			  					/>
			  					<Stack.Screen
			  						name="wallet"
			  						options={{ presentation: "modal" }}
			  					/>
			  					<Stack.Screen
			  						name="qr"
			  						options={{ presentation: "fullScreenModal" }}
			  					/>
			  					<Stack.Screen name="subscription" />
			  				</Stack>
			  			</PendingRequestsProvider>
			  		</WalletProvider>
			  	</UserProfileProvider>
			  </OnboardingProvider>
            </SQLiteProvider>
		</GestureHandlerRootView>
	);

  async function migrateDbIfNeeded(db: SQLiteDatabase) {
    const DATABASE_VERSION = 2;
    let { user_version: currentDbVersion } = await db.getFirstAsync<{ user_version: number }>(
      'PRAGMA user_version'
    ) ?? { user_version: 0 };

    if (currentDbVersion >= DATABASE_VERSION) {
      return;
    }

    if (currentDbVersion <= 0) {
      await db.execAsync(`
        PRAGMA journal_mode = 'wal';
      `);
      currentDbVersion = 1;
    }

    if (currentDbVersion <= 1) {
      // Create activities table
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS activities (
          id TEXT PRIMARY KEY NOT NULL,
          type TEXT NOT NULL CHECK (type IN ('auth', 'pay')), -- Maps to ActivityType enum
          service_name TEXT NOT NULL,
          service_key TEXT NOT NULL,
          detail TEXT NOT NULL,
          date INTEGER NOT NULL, -- Unix timestamp
          amount INTEGER, -- NULL for Auth type
          currency TEXT, -- NULL for Auth type
          request_id TEXT NOT NULL, -- Reference to the original request if applicable
          created_at INTEGER NOT NULL -- Unix timestamp
        );

        -- Create subscriptions table for recurring payments
        CREATE TABLE IF NOT EXISTS subscriptions (
          id TEXT PRIMARY KEY NOT NULL,
          request_id TEXT NOT NULL, -- Reference to the original subscription request
          service_name TEXT NOT NULL,
          service_key TEXT NOT NULL,
          amount INTEGER NOT NULL,
          currency TEXT NOT NULL,
          recurrence_calendar TEXT NOT NULL,
          recurrence_max_payments INTEGER,
          recurrence_until INTEGER,
          recurrence_first_payment_due INTEGER NOT NULL,
          status TEXT NOT NULL CHECK (status IN ('active', 'paused', 'cancelled', 'expired')),
          last_payment_date INTEGER, -- Unix timestamp of last successful payment
          next_payment_date INTEGER, -- Unix timestamp of next scheduled payment
          created_at INTEGER NOT NULL -- Unix timestamp
        );

        -- Create indexes for better query performance
        CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);
        CREATE INDEX IF NOT EXISTS idx_activities_type ON activities(type);
        CREATE INDEX IF NOT EXISTS idx_subscriptions_next_payment ON subscriptions(next_payment_date);
      `);
      currentDbVersion = 2;
    }

    await db.execAsync(`PRAGMA user_version = ${DATABASE_VERSION}`);
  }
}
