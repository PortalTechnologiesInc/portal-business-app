import { useEffect, useState } from "react";
import { Text, View, Platform, SafeAreaView, AppState } from "react-native";
import type { AppStateStatus } from "react-native";
import { Stack, useRouter } from "expo-router";
import * as Linking from "expo-linking";
import * as SplashScreen from "expo-splash-screen";
import * as SecureStore from "expo-secure-store";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { OnboardingProvider } from "@/context/OnboardingContext";
import { UserProfileProvider } from "@/context/UserProfileContext";
import { PendingRequestsProvider } from "@/context/PendingRequestsContext";
import { StatusBar } from "expo-status-bar";
import { Colors } from "@/constants/Colors";
import { Asset } from "expo-asset";
import { getMnemonic, mnemonicEvents, getWalletUrl, walletUrlEvents } from "@/services/SecureStorageService";
import { Mnemonic } from "portal-app-lib";
import { getNostrServiceInstance } from "@/services/nostr/NostrService";

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
	const [walletURL, setWalletURL] = useState<string | null>(null);

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

	// Check for mnemonic and wallet URL existence and log their status
	useEffect(() => {
		const checkSecureStorage = async () => {
			try {
				const mnemonicValue = await getMnemonic();
				setMnemonic(mnemonicValue);

				const walletUrlValue = await getWalletUrl();
				setWalletURL(walletUrlValue || null);
			} catch (error) {
				console.error("SecureStore access failed:", error);
			}
		};

		// Check on initial load
		checkSecureStorage();

		// Also check when app returns to foreground
		const appStateSubscription = AppState.addEventListener(
			"change",
			(nextAppState: AppStateStatus) => {
				if (nextAppState === "active") {
					console.log("App became active, checking secure storage...");
					checkSecureStorage();
				}
			},
		);

		// Subscribe to mnemonic change events
		const mnemonicSubscription = mnemonicEvents.addListener(
			"mnemonicChanged",
			(newMnemonicValue) => {
				console.log("Mnemonic change event received!");
				setMnemonic(newMnemonicValue as string | null);
			},
		);

		// Subscribe to wallet URL change events
		const walletUrlSubscription = walletUrlEvents.addListener(
			"walletUrlChanged",
			(newWalletUrl) => {
				console.log("Wallet URL change event received!");
				setWalletURL(newWalletUrl as string | null);
			},
		);

		return () => {
			appStateSubscription.remove();
			mnemonicSubscription.remove();
			walletUrlSubscription.remove();
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

					// Initialize wallet if wallet URL is available
					if (walletURL) {
						console.log("Connecting to wallet with URL");
						try {
							nostrService.connectNWC(walletURL);
							console.log("Wallet connected successfully");
						} catch (error) {
							console.error("Failed to connect wallet:", error);
						}
					} else {
						console.log("No wallet URL available, skipping wallet connection");
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
	}, [mnemonic, walletURL]); // Add walletURL to dependencies to reinitialize if it changes

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
			<OnboardingProvider>
				<UserProfileProvider>
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
				</UserProfileProvider>
			</OnboardingProvider>
		</GestureHandlerRootView>
	);
}
