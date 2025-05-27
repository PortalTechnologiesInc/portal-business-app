import { createContext, useContext, useCallback, type ReactNode } from "react";
import { useEffect } from "react";
import * as Linking from "expo-linking";
import { parseAuthInitUrl } from "portal-app-lib";
import { usePendingRequests } from "@/context/PendingRequestsContext";
import { useNostrService } from "@/context/NostrServiceContext";
import { router } from "expo-router";

// Define the context type
type DeeplinkContextType = {
	handleDeepLink: (url: string) => void;
};

// Create the context
const DeeplinkContext = createContext<DeeplinkContextType | undefined>(
	undefined,
);

// Provider component
export const DeeplinkProvider = ({ children }: { children: ReactNode }) => {
	const { showSkeletonLoader } = usePendingRequests();
	const nostrService = useNostrService();

	// Handle deeplink URLs
	const handleDeepLink = useCallback(
		(url: string) => {
			console.log("Handling deeplink URL:", url);

			try {
				// Parse the URL
				const parsedUrl = parseAuthInitUrl(url);

				// Show the skeleton loader
				showSkeletonLoader(parsedUrl);

				// Send auth init request
				nostrService.sendAuthInit(parsedUrl);

				// Navigate to tabs
				setTimeout(() => {
					router.replace("/(tabs)");
				}, 500);
			} catch (error) {
				console.error("Failed to handle deeplink URL:", error);
			}
		},
		[showSkeletonLoader, nostrService],
	);

	// Listen for deeplink events
	useEffect(() => {
		// Handle URLs that the app was opened with
		const getInitialURL = async () => {
			const initialUrl = await Linking.getInitialURL();
			if (initialUrl) {
				console.log("App opened with URL:", initialUrl);
				handleDeepLink(initialUrl);
			}
		};

		getInitialURL();

		// Add event listener for URL events that happen while the app is running
		const subscription = Linking.addEventListener("url", (event) => {
			console.log("Got URL event:", event.url);
			handleDeepLink(event.url);
		});

		return () => {
			subscription.remove();
		};
	}, [handleDeepLink]);

	// Provide context value
	const contextValue: DeeplinkContextType = {
		handleDeepLink,
	};

	return (
		<DeeplinkContext.Provider value={contextValue}>
			{children}
		</DeeplinkContext.Provider>
	);
};

// Hook to use the deeplink context
export const useDeeplink = (): DeeplinkContextType => {
	const context = useContext(DeeplinkContext);
	if (!context) {
		throw new Error("useDeeplink must be used within a DeeplinkProvider");
	}
	return context;
};
