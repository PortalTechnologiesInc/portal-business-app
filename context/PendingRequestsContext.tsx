import type React from "react";
import {
	createContext,
	useContext,
	useState,
	useEffect,
	type ReactNode,
	useMemo,
	useCallback,
} from "react";
import {
	PendingRequest,
	PendingRequestType,
} from "../models/PendingRequest";
import {
	getNostrServiceInstance,
	LocalAuthChallengeListener,
	LocalPaymentRequestListener,
} from "../services/nostr/NostrService";
import {
	AuthChallengeEvent,
	AuthInitUrl,
	PaymentRequestEvent,
	PaymentResponseContent,
	PaymentStatus,
	RecurringPaymentRequest,
  RecurringPaymentResponseContent,
  RecurringPaymentStatus,
  SinglePaymentRequest,
} from "portal-app-lib";
import uuid from "react-native-uuid";

interface PendingRequestsContextType {
	pendingRequests: PendingRequest[];
	getByType: (type: PendingRequestType) => PendingRequest[];
	getById: (id: string) => PendingRequest | undefined;
	approve: (id: string) => void;
	deny: (id: string) => void;
	hasPending: boolean;
	isLoadingRequest: boolean;
	requestFailed: boolean;
	pendingUrl: AuthInitUrl | undefined;
	showSkeletonLoader: (parsedUrl: AuthInitUrl) => void;
	setRequestFailed: (failed: boolean) => void;
}

const PendingRequestsContext = createContext<
	PendingRequestsContextType | undefined
>(undefined);

export const PendingRequestsProvider: React.FC<{ children: ReactNode }> = ({
	children,
}) => {
	// Use preloaded data to avoid loading delay on mount
	const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
	const [isLoadingRequest, setIsLoadingRequest] = useState(false);
	const [pendingUrl, setPendingUrl] = useState<AuthInitUrl | undefined>(
		undefined,
	);
	const [requestFailed, setRequestFailed] = useState(false);
	const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
	const [resolvers, setResolvers] = useState<
		Map<string, (value: boolean | PaymentResponseContent | RecurringPaymentResponseContent) => void>
	>(new Map());

	// Memoize hasPending to avoid recalculation on every render
	const hasPending = useMemo(() => {
		return (
			pendingRequests.some((req) => req.status === "pending") ||
			isLoadingRequest
		);
	}, [pendingRequests, isLoadingRequest]);

	// Cleanup timeout on unmount
	useEffect(() => {
		return () => {
			if (timeoutId) {
				clearTimeout(timeoutId);
			}
		};
	}, [timeoutId]);

	// Memoize these functions to prevent recreation on every render
	const getByType = useCallback(
		(type: PendingRequestType) => {
			return pendingRequests.filter((request) => request.type === type);
		},
		[pendingRequests],
	);

	const getById = useCallback(
		(id: string) => {
			return pendingRequests.find((request) => request.id === id);
		},
		[pendingRequests],
	);

	getNostrServiceInstance().setAuthChallengeListener(
		new LocalAuthChallengeListener((event: AuthChallengeEvent) => {
			// aggiorna lista
			const id = uuid.v4();

			console.log("auth challenge", event);

			setPendingRequests((prev) => [
				...prev,
				{
					id,
					metadata: event,
					timestamp: new Date().toISOString(),
					status: "pending",
					type: "login",
				},
			]);

			if (pendingUrl?.mainKey === event.serviceKey) {
				cancelSkeletonLoader();
			}

			return new Promise((resolve) => {
				resolvers.set(id, resolve as (value: boolean | PaymentResponseContent | RecurringPaymentResponseContent) => void);
				setResolvers(resolvers);
			});
		}),
	);

	getNostrServiceInstance().setPaymentRequestListeners(
		new LocalPaymentRequestListener(
			(event: SinglePaymentRequest) => {
				// aggiorna lista
				const id = uuid.v4();

				setPendingRequests((prev) => [
					...prev,
					{
						id,
						metadata: event,
						timestamp: new Date().toISOString(),
						status: "pending",
						type: "payment",
					},
				]);

				if (pendingUrl?.mainKey === event.serviceKey) {
					cancelSkeletonLoader();
				}

				return new Promise((resolve) => {
					resolvers.set(id, resolve as (value: boolean | PaymentResponseContent | RecurringPaymentResponseContent) => void);
					setResolvers(resolvers);
				});
			},
			(event: RecurringPaymentRequest) => {
				// aggiorna lista
				const id = uuid.v4();

				setPendingRequests((prev) => [
					...prev,
					{
						id,
						metadata: event,
						timestamp: new Date().toISOString(),
						status: "pending",
						type: "subscription",
					},
				]);

				if (pendingUrl?.mainKey === event.serviceKey) {
					cancelSkeletonLoader();
				}

				return new Promise((resolve) => {
					resolvers.set(id, resolve as (value: boolean | PaymentResponseContent | RecurringPaymentResponseContent) => void);
					setResolvers(resolvers);
				});
			},
		),
	);

	const approve = useCallback((id: string) => {

    const request = getById(id);

    setPendingRequests((prev) =>
			prev.map((request) =>
				request.id === id ? { ...request, status: "approved" } : request,
			),
		);

		const resolver = resolvers.get(id);

		console.log("approve", id, resolver);

		if (resolver) {
			switch (request?.type) {
				case "login":
					resolver(true);
					break;
				case "payment":
					resolver({
						status: new PaymentStatus.Pending(),
						requestId: (request.metadata as SinglePaymentRequest).content.requestId,
					});
					break;
				case "subscription":
					resolver({
						status: new RecurringPaymentStatus.Confirmed({
							subscriptionId: "randomsubscriptionid",
							authorizedAmount: (request.metadata as SinglePaymentRequest).content.amount,
							authorizedCurrency: (request.metadata as SinglePaymentRequest).content.currency,
							authorizedRecurrence: (request.metadata as RecurringPaymentRequest).content.recurrence,
						  }),
						requestId: (request.metadata as RecurringPaymentRequest).content.requestId,
					});
					break;
			}
      //TODO mandare payment
			resolvers.delete(id);
			setResolvers(resolvers);
		}
	}, [getById, resolvers]);

	const deny = useCallback((id: string) => {
		setPendingRequests((prev) =>
			prev.map((request) =>
				request.id === id ? { ...request, status: "denied" } : request,
			),
		);

    const request = getById(id);

		const resolver = resolvers.get(id);
		if (resolver) {
			switch (request?.type) {
				case "login":
					resolver(false);
					break;
				case "payment":
					resolver({
						status: new PaymentStatus.Rejected({ reason: 'User rejected' }),
						requestId: (request.metadata as SinglePaymentRequest).content.requestId,
					});
					break;
				case "subscription":
					resolver({
						status: new RecurringPaymentStatus.Rejected({ reason: 'User rejected' }),
						requestId: (request.metadata as RecurringPaymentRequest).content.requestId,
					});
					break;
			}
			resolvers.delete(id);
			setResolvers(resolvers);
		}
	}, [getById, resolvers]);

	// Show skeleton loader and set timeout for request
	const showSkeletonLoader = useCallback(
		(parsedUrl: AuthInitUrl) => {
			// Clean up any existing timeout
			if (timeoutId) {
				clearTimeout(timeoutId);
			}

			setIsLoadingRequest(true);
			setPendingUrl(parsedUrl);
			setRequestFailed(false);

			// Set new timeout for 10 seconds
			const newTimeoutId = setTimeout(() => {
				setIsLoadingRequest(false);
				setRequestFailed(true);
			}, 10000);

			setTimeoutId(newTimeoutId);
		},
		[timeoutId],
	);

	const cancelSkeletonLoader = useCallback(() => {
		if (timeoutId) {
			clearTimeout(timeoutId);
		}

		setIsLoadingRequest(false);
		setRequestFailed(false);
	}, [timeoutId]);

	// Memoize the context value to prevent recreation on every render
	// biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
		const contextValue = useMemo(
		() => ({
			pendingRequests,
			getByType,
			getById,
			approve,
			deny,
			hasPending,
			isLoadingRequest,
			requestFailed,
			pendingUrl,
			showSkeletonLoader,
			setRequestFailed,
		}),
		[
			pendingRequests,
			getByType,
			getById,
			approve,
			deny,
			hasPending,
			isLoadingRequest,
			requestFailed,
			pendingUrl,
			showSkeletonLoader,
			setRequestFailed,
		],
	);

	return (
		<PendingRequestsContext.Provider value={contextValue}>
			{children}
		</PendingRequestsContext.Provider>
	);
};

export const usePendingRequests = () => {
	const context = useContext(PendingRequestsContext);
	if (context === undefined) {
		throw new Error(
			"usePendingRequests must be used within a PendingRequestsProvider",
		);
	}
	return context;
};
