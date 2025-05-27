import { ThemedText } from "@/components/ThemedText";
import {
	useLocalSearchParams,
	router,
	useRootNavigationState,
} from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { useDeeplink } from "@/context/DeeplinkContext";

export default function DeeplinkHandler() {
	const params = useLocalSearchParams();
	const [fullUrl, setFullUrl] = useState("");
	const rootNavigationState = useRootNavigationState();
	const { handleDeepLink } = useDeeplink();

	console.log("params", params);

	useEffect(() => {
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

		// Process the deeplink URL
		if (reconstructed) {
			handleDeepLink(reconstructed);
		}
	}, [params, handleDeepLink]);

	// Handle navigation after the navigation state is ready
	useEffect(() => {
		if (rootNavigationState?.key) {
			router.replace("/(tabs)");
		}
	}, [rootNavigationState?.key]);

	return (
		<View>
			<ThemedText>Processing deeplink...</ThemedText>
		</View>
	);
}
