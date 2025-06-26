import { ThemedText } from "@/components/ThemedText";
import {
	useLocalSearchParams,
	router,
	useRootNavigationState,
} from "expo-router";
import { useEffect, useState, useCallback, useRef } from "react";
import { View } from "react-native";
import * as SecureStore from "expo-secure-store";
import { useOnboarding } from "@/context/OnboardingContext";
import { useMnemonic } from "@/context/MnemonicContext";

// Key for storing pending deeplinks
const PENDING_DEEPLINK_KEY = "PENDING_DEEPLINK";

// Try to import DeeplinkContext but don't fail if it's not available
let useDeeplink: (() => { handleDeepLink: (url: string) => void }) | undefined;
try {
	useDeeplink = require("@/context/DeeplinkContext").useDeeplink;
} catch (error) {
	console.log("DeeplinkContext not available");
}

// Define type for handleDeepLink function
type HandleDeepLinkFn = (url: string) => void;

export default function DeeplinkHandler() {
	const params = useLocalSearchParams();
	const [fullUrl, setFullUrl] = useState("");
	const rootNavigationState = useRootNavigationState();
	const { isOnboardingComplete } = useOnboarding();
	const { mnemonic } = useMnemonic();
	// Flag to track if we've already processed this deeplink
	const hasProcessedDeeplink = useRef(false);

	// Try to get the deeplink context if available
	let handleDeepLink: HandleDeepLinkFn | undefined;
	try {
		if (useDeeplink) {
			const deeplinkContext = useDeeplink();
			handleDeepLink = deeplinkContext?.handleDeepLink;
		}
	} catch (error) {
		console.log("DeeplinkContext not available, will store deeplink for later");
	}

	console.log("params", params);

	// Determine appropriate navigation target based on app state
	const getNavigationTarget = useCallback(() => {
		if (!isOnboardingComplete) {
			return "/onboarding";
		}

		if (!mnemonic) {
			return "/settings";
		}

		return "/(tabs)";
	}, [isOnboardingComplete, mnemonic]);

	useEffect(() => {
		// Skip if we've already processed this deeplink
		if (hasProcessedDeeplink.current) {
			return;
		}

		// Get deeplink segments
		const segments = Array.isArray(params.deeplink)
			? params.deeplink
			: [params.deeplink];

		// Get query params (everything except deeplink)
		const queryParams = Object.entries(params)
			.filter(([key]) => key !== "deeplink")
			.map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
			.join("&");

		// Reconstruct full URL
		const path = segments.join("/");
		// Add portal:// protocol prefix to ensure the URL is properly formatted
		const reconstructed = `portal://${path}${queryParams ? `?${queryParams}` : ""}`;

		setFullUrl(reconstructed);
		console.log("Reconstructed URL:", reconstructed);

		// Mark as processed
		hasProcessedDeeplink.current = true;

		// If DeeplinkContext is available, process the deeplink
		if (reconstructed) {
			if (handleDeepLink) {
				// DeeplinkContext is available, let it handle the navigation
				console.log("Using DeeplinkContext to handle deeplink");
				handleDeepLink(reconstructed);
			} else {
				// DeeplinkContext not ready, store the deeplink for later processing
				console.log("DeeplinkContext not ready, storing deeplink for later");
				SecureStore.setItemAsync(PENDING_DEEPLINK_KEY, reconstructed)
					.then(() => {
						console.log("Stored deeplink for later processing:", reconstructed);
						// Navigate based on app state to avoid loops
						const target = getNavigationTarget();
						console.log("Navigating to:", target);
						// Use replace to avoid creating navigation history
						router.replace(target);
					})
					.catch((error) => {
						console.error("Failed to store deeplink:", error);
						router.replace(getNavigationTarget());
					});
			}
		}
	}, [params, getNavigationTarget, handleDeepLink]);

	return (
		<View>
			<ThemedText>Processing deeplink...</ThemedText>
		</View>
	);
}
