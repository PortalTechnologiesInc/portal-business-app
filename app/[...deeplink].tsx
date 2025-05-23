import { ThemedText } from "@/components/ThemedText";
import {
	useLocalSearchParams,
	router,
	useRootNavigationState,
} from "expo-router";
import { useEffect, useState } from "react";
import { View } from "react-native";

export default function DeeplinkHandler() {
	const params = useLocalSearchParams();
	const [fullUrl, setFullUrl] = useState("");
	const rootNavigationState = useRootNavigationState();

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
		const reconstructed = `${path}${queryParams ? `?${queryParams}` : ""}`;

		setFullUrl(reconstructed);
		console.log("Reconstructed URL:", reconstructed);
	}, [params]);

	// Handle navigation after the navigation state is ready
	useEffect(() => {
		if (rootNavigationState?.key) {
			router.replace("/");
		}
	}, [rootNavigationState?.key]);

	return (
		<View>
			<ThemedText>Full URL: {fullUrl}</ThemedText>
		</View>
	);
}
