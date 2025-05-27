import type React from "react";
import { View, StyleSheet, FlatList, Dimensions } from "react-native";
import { usePendingRequests } from "../context/PendingRequestsContext";
import { PendingRequestCard } from "./PendingRequestCard";
import { PendingRequestSkeletonCard } from "./PendingRequestSkeletonCard";
import { FailedRequestCard } from "./FailedRequestCard";
import type {
	PendingRequest,
	PendingRequestType,
} from "../models/PendingRequest";
import type { AuthChallengeEvent, SinglePaymentRequest } from "portal-app-lib";
import { useNostrService } from "@/context/NostrServiceContext";
import { ThemedText } from "./ThemedText";
import { Colors } from "@/constants/Colors";
import { useEffect, useState } from "react";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 80; // Adjusted for proper padding
const CARD_MARGIN = 12; // Margin between cards

// Create a skeleton request that adheres to the PendingRequest interface
const createSkeletonRequest = (): PendingRequest => ({
	id: "skeleton",
	metadata: {} as AuthChallengeEvent,
	type: "login",
	timestamp: new Date(),
	result: () => {},
});

export const PendingRequestsList: React.FC = () => {
	const {
		isLoadingRequest,
		requestFailed,
		pendingUrl,
		showSkeletonLoader,
		setRequestFailed,
	} = usePendingRequests();
	const nostrService = useNostrService();
	const [combinedData, setCombinedData] = useState<PendingRequest[]>([]);

	useEffect(() => {
		// Sort requests by timestamp (newest first)
		const sortedRequests = Object.values(nostrService.pendingRequests)
			.filter((request) => {
				// Hide requests that are payments for a subscription
				if (
					request.type === "payment" &&
					(request.metadata as SinglePaymentRequest).content.subscriptionId
				) {
					return false;
				}

				return true;
			})
			.sort(
				(a, b) =>
					new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
			);

		// Create combined data
		let combinedData: PendingRequest[] = [];

		if (requestFailed || isLoadingRequest) {
			// If request failed or loading, add a skeleton item at the beginning of the list
			combinedData = [createSkeletonRequest(), ...sortedRequests];
		} else {
			// Just show the sorted pending requests
			combinedData = sortedRequests;
		}

		setCombinedData(combinedData);
	}, [nostrService.pendingRequests, isLoadingRequest, requestFailed]);

	// Handle retry
	const handleRetry = () => {
		setRequestFailed(false);
		if (pendingUrl) {
			showSkeletonLoader(pendingUrl);
			nostrService.sendAuthInit(pendingUrl);
		}
	};

	// Handle cancel
	const handleCancel = () => {
		setRequestFailed(false);
	};

	return (
		<View style={styles.container}>
			{/* Title section - similar to other homepage sections */}
			<View style={styles.header}>
				<ThemedText
					type="title"
					style={styles.title}
					darkColor={Colors.almostWhite}
					lightColor={Colors.almostWhite}
				>
					Pending Requests
				</ThemedText>
			</View>

			{combinedData.length === 0 && !isLoadingRequest && !requestFailed ? (
				<View style={styles.emptyContainer}>
					<ThemedText
						style={styles.emptyText}
						darkColor={Colors.dirtyWhite}
						lightColor={Colors.darkGray}
					>
						No pending requests
					</ThemedText>
				</View>
			) : (
				<FlatList
					data={combinedData}
					keyExtractor={(item) => item.id}
					renderItem={({ item }) => (
						<View style={styles.itemContainer}>
							{item.id === "skeleton" && requestFailed ? (
								<FailedRequestCard
									onRetry={handleRetry}
									onCancel={handleCancel}
								/>
							) : item.id === "skeleton" ? (
								<PendingRequestSkeletonCard />
							) : (
								<PendingRequestCard request={item} />
							)}
						</View>
					)}
					horizontal
					showsHorizontalScrollIndicator={false}
					pagingEnabled
					snapToInterval={CARD_WIDTH + CARD_MARGIN}
					decelerationRate="fast"
					contentContainerStyle={[
						styles.listContent,
						// If there's only one item, center it
						combinedData.length === 1 && { flex: 1, justifyContent: "center" },
					]}
					style={styles.flatList}
					CellRendererComponent={({ children, index, style, ...props }) => (
						<View
							style={[
								style,
								styles.cellRenderer,
								// First cell gets left padding
								index === 0 && { paddingLeft: 20 },
								// Last cell gets right padding
								index === combinedData.length - 1 && { paddingRight: 20 },
								// All cells except the last get right margin
								index !== combinedData.length - 1 && {
									marginRight: CARD_MARGIN,
								},
							]}
							{...props}
						>
							{children}
						</View>
					)}
				/>
			)}
		</View>
	);
};

const styles = StyleSheet.create({
	container: {
		marginTop: 8,
		marginBottom: 20,
		paddingHorizontal: 20,
	},
	header: {
		flexDirection: "row",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: 12,
	},
	title: {
		fontSize: 24,
		fontWeight: "600",
	},
	emptyContainer: {
		backgroundColor: "#1E1E1E",
		borderRadius: 20,
		padding: 20,
		alignItems: "center",
		justifyContent: "center",
		minHeight: 100,
	},
	emptyText: {
		fontSize: 16,
		textAlign: "center",
	},
	flatList: {
		overflow: "visible",
		marginLeft: -20, // Counteract the container padding for proper alignment
		width, // Ensure full width
	},
	listContent: {
		flexGrow: 1,
	},
	itemContainer: {
		width: CARD_WIDTH,
		alignItems: "center",
		justifyContent: "center",
	},
	cellRenderer: {
		alignItems: "center",
		justifyContent: "center",
	},
});
