import { useState, useEffect } from "react";
import type { FC } from "react";
import {
	View,
	Text,
	StyleSheet,
	TouchableOpacity,
	Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { PendingRequest } from "../models/PendingRequest";
import { usePendingRequests } from "../context/PendingRequestsContext";
import { getNostrServiceInstance } from "@/services/nostr/NostrService";
import type { SinglePaymentRequest, RecurringPaymentRequest } from "portal-app-lib";

const { width } = Dimensions.get("window");
const CARD_WIDTH = width - 50;

interface PendingRequestCardProps {
	request: PendingRequest;
}

const getRequestTypeText = (type: string) => {
	switch (type) {
		case "login":
			return "Login Request";
		case "payment":
			return "Payment Request";
		case "subscription":
			return "Subscription Request";
		case "certificate":
			return "Certificate Request";
		case "identity":
			return "Identity Request";
		default:
			return "Unknown Request";
	}
};

// Function to truncate a pubkey to the format: "npub1...123456"
const truncatePubkey = (pubkey: string | undefined) => {
	if (!pubkey) return "";
	return `${pubkey.substring(0, 16)}...${pubkey.substring(pubkey.length - 16)}`;
};

// Function to format a payment amount with currency symbol
const formatAmount = (amount: number, currency = "EUR") => {
	// Format the amount to show 2 decimal places and add the currency symbol
	return new Intl.NumberFormat("en-US", {
		style: "currency",
		currency: typeof currency === "string" ? currency : "EUR",
	}).format(amount);
};

export const PendingRequestCard: FC<PendingRequestCardProps> = ({
	request,
}) => {
	const { approve, deny } = usePendingRequests();
	const { id, metadata, type } = request;
	const [serviceName, setServiceName] = useState<string | undefined>(undefined);

	useEffect(() => {
		const fetchServiceName = async () => {
			try {
				const name = await getNostrServiceInstance().getServiceName(
					metadata.serviceKey,
				);
				console.log(name)
				setServiceName(name?.nip05 ? name.nip05 : "Unknown Service");
			} catch (error) {
				console.error("Error fetching service name:", error);
			}
		};

		fetchServiceName();
	}, [metadata.serviceKey]);

	const recipientPubkey = metadata.recipient;

	// Extract payment information if this is a payment request
	const isPaymentRequest = type === "payment";

	const amount = (metadata as SinglePaymentRequest)?.content?.amount ||
			(metadata as RecurringPaymentRequest)?.content?.amount;

			console.log(amount)

	return (
		<View style={styles.card}>
			<Text style={styles.requestType}>{getRequestTypeText(type)}</Text>

			<Text style={styles.serviceName}>{serviceName}</Text>

			<Text style={styles.serviceInfo}>{truncatePubkey(recipientPubkey)}</Text>

			{isPaymentRequest && amount !== null && (
				<View style={styles.amountContainer}>
					<Text style={styles.amountText}>
						{Number(amount) / 1000} sats
					</Text>
				</View>
			)}

			<View style={styles.actions}>
				<TouchableOpacity
					style={[styles.button, styles.approveButton]}
					onPress={() => approve(id)}
				>
					<Ionicons name="checkmark-outline" size={20} color="#FFFFFF" />
					<Text style={styles.buttonText}>Approve</Text>
				</TouchableOpacity>
				<TouchableOpacity
					style={[styles.button, styles.denyButton]}
					onPress={() => deny(id)}
				>
					<Ionicons name="close-outline" size={20} color="#FFFFFF" />
					<Text style={styles.buttonText}>Deny</Text>
				</TouchableOpacity>
			</View>
		</View>
	);
};

const styles = StyleSheet.create({
	card: {
		backgroundColor: "#1E1E1E",
		borderRadius: 20,
		padding: 14,
		width: CARD_WIDTH,
		shadowColor: "#000",
		shadowOffset: { width: 0, height: 2 },
		shadowOpacity: 0.1,
		shadowRadius: 4,
		elevation: 2,
	},
	requestType: {
		color: "#8A8A8E",
		fontSize: 14,
		fontWeight: "400",
		marginBottom: 8,
	},
	serviceName: {
		color: "#FFFFFF",
		fontSize: 26,
		fontWeight: "600",
		marginBottom: 4,
	},
	serviceInfo: {
		color: "#8A8A8E",
		fontSize: 14,
		marginBottom: 12,
	},
	amountContainer: {
		borderWidth: 1,
		borderColor: "#8A8A8E",
		textAlign: "center",
		borderRadius: 8,
		paddingHorizontal: 10,
		paddingVertical: 20,
		alignSelf: "center",
		marginBottom: 20,
		width: "100%",
	},
	amountText: {
		color: "#FFFFFF",
		fontSize: 30,
		fontWeight: "700",
		textAlign: "center",
	},
	actions: {
		flexDirection: "row",
		justifyContent: "space-between",
	},
	button: {
		paddingHorizontal: 16,
		paddingVertical: 10,
		borderRadius: 20,
		flexDirection: "row",
		alignItems: "center",
		justifyContent: "center",
		flex: 1,
		marginHorizontal: 4,
	},
	denyButton: {
		backgroundColor: "#E53935",
	},
	approveButton: {
		backgroundColor: "#4CAF50",
	},
	buttonText: {
		color: "#FFFFFF",
		fontWeight: "600",
		marginLeft: 6,
	},
});
