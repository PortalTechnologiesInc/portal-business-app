import type React from 'react';
import { View, StyleSheet, FlatList, Dimensions, ActivityIndicator } from 'react-native';
import { usePendingRequests } from '../context/PendingRequestsContext';
import { PendingRequestCard } from './PendingRequestCard';
import { PendingRequestSkeletonCard } from './PendingRequestSkeletonCard';
import { FailedRequestCard } from './FailedRequestCard';
import type { PendingRequest, PendingRequestType } from '../models/PendingRequest';
import type { AuthChallengeEvent, SinglePaymentRequest } from 'portal-app-lib';
import { useNostrService } from '@/context/NostrServiceContext';
import { ThemedText } from './ThemedText';
import { useEffect, useState } from 'react';
import { useThemeColor } from '@/hooks/useThemeColor';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 80; // Adjusted for proper padding
const CARD_MARGIN = 12; // Margin between cards

// Create a skeleton request that adheres to the PendingRequest interface
const createSkeletonRequest = (): PendingRequest => ({
  id: 'skeleton',
  metadata: {} as AuthChallengeEvent,
  type: 'login',
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
    preloadServiceNames,
  } = usePendingRequests();
  const nostrService = useNostrService();
  const [combinedData, setCombinedData] = useState<PendingRequest[]>([]);
  const [isLoadingServiceNames, setIsLoadingServiceNames] = useState(false);

  // Theme colors
  const cardBackgroundColor = useThemeColor({}, 'cardBackground');
  const primaryTextColor = useThemeColor({}, 'textPrimary');
  const secondaryTextColor = useThemeColor({}, 'textSecondary');
  const statusConnectedColor = useThemeColor({}, 'statusConnected');

  useEffect(() => {
    // Add a loading state while fetching service names
    const loadData = async () => {
      if (Object.values(nostrService.pendingRequests).length > 0) {
        setIsLoadingServiceNames(true);

        // Preload service names for all pending requests
        await preloadServiceNames();

        // Add a small delay to ensure everything is properly loaded
        await new Promise(resolve => setTimeout(resolve, 100));

        // Process and deduplicate requests
        processRequests();

        setIsLoadingServiceNames(false);
      } else {
        // If we're loading a request or have a failed request, still process to show skeleton
        if (isLoadingRequest || requestFailed) {
          processRequests();
        } else {
          // No requests and not loading, just clear the list
          setCombinedData([]);
        }
      }
    };

    loadData();
  }, [nostrService.pendingRequests, isLoadingRequest, requestFailed]);

  // Function to process and deduplicate requests
  const processRequests = () => {
    // Sort requests by timestamp (newest first)
    const sortedRequests = Object.values(nostrService.pendingRequests)
      .filter(request => {
        // Hide requests that are payments for a subscription
        if (
          request.type === 'payment' &&
          (request.metadata as SinglePaymentRequest).content.subscriptionId
        ) {
          return false;
        }

        return true;
      })
      // Deduplicate requests from the same service (keep only the newest one)
      .reduce((unique, request) => {
        const serviceKey = request.metadata.serviceKey;
        const existingIndex = unique.findIndex(req => req.metadata.serviceKey === serviceKey);

        if (existingIndex === -1) {
          // No existing request with this service key, add it
          unique.push(request);
        } else {
          // Check if this request is newer than the existing one
          const existingTimestamp = new Date(unique[existingIndex].timestamp).getTime();
          const newTimestamp = new Date(request.timestamp).getTime();

          if (newTimestamp > existingTimestamp) {
            // Replace the older request with this newer one
            unique[existingIndex] = request;
          }
        }

        return unique;
      }, [] as PendingRequest[])
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

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
  };

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

  // Show loading indicator while fetching service names
  if (isLoadingServiceNames) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="title" style={[styles.title, { color: primaryTextColor }]}>
            Pending Requests
          </ThemedText>
        </View>
        <View style={[styles.loadingContainer, { backgroundColor: cardBackgroundColor }]}>
          <ActivityIndicator size="large" color={statusConnectedColor} />
          <ThemedText style={[styles.loadingText, { color: secondaryTextColor }]}>
            Loading requests...
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Title section - similar to other homepage sections */}
      <View style={styles.header}>
        <ThemedText type="title" style={[styles.title, { color: primaryTextColor }]}>
          Pending Requests
        </ThemedText>
      </View>

      {combinedData.length === 0 && !isLoadingRequest && !requestFailed ? (
        <View style={[styles.emptyContainer, { backgroundColor: cardBackgroundColor }]}>
          <ThemedText style={[styles.emptyText, { color: secondaryTextColor }]}>
            No pending requests
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={combinedData}
          keyExtractor={item =>
            item.id === 'skeleton' ? 'skeleton' : `${item.metadata.serviceKey}-${item.id}`
          }
          renderItem={({ item }) => (
            <View style={styles.itemContainer}>
              {item.id === 'skeleton' && requestFailed ? (
                <FailedRequestCard onRetry={handleRetry} onCancel={handleCancel} />
              ) : item.id === 'skeleton' ? (
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
            combinedData.length === 1 && { flex: 1, justifyContent: 'center' },
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  emptyContainer: {
    // backgroundColor handled by theme
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  loadingContainer: {
    // backgroundColor handled by theme
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 72, // Match the height of a single card
    marginBottom: 10, // Match the margin between cards
  },
  loadingText: {
    fontSize: 16,
    marginTop: 10,
    textAlign: 'center',
    // color handled by theme
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  flatList: {
    overflow: 'visible',
    marginLeft: -20, // Counteract the container padding for proper alignment
    width, // Ensure full width
  },
  listContent: {
    flexGrow: 1,
  },
  itemContainer: {
    width: CARD_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellRenderer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
