import type React from 'react';
import { View, StyleSheet, FlatList, Dimensions } from 'react-native';
import { usePendingRequests } from '../context/PendingRequestsContext';
import { PendingRequestCard } from './PendingRequestCard';
import { PendingRequestSkeletonCard } from './PendingRequestSkeletonCard';
import { FailedRequestCard } from './FailedRequestCard';
import type { PendingRequest, PendingRequestType } from '../models/PendingRequest';
import { AuthChallengeEvent } from 'portal-app-lib';
import { getNostrServiceInstance } from '@/services/nostr/NostrService';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48; // Full width minus padding
const CARD_MARGIN = 12; // Margin between cards

// Create a skeleton request that adheres to the PendingRequest interface
const createSkeletonRequest = (): PendingRequest => ({
  id: 'skeleton',
  metadata: {} as AuthChallengeEvent,
  status: 'pending',
  timestamp: new Date().toISOString(),
});

export const PendingRequestsList: React.FC = () => {
  const {
    pendingRequests,
    hasPending,
    isLoadingRequest,
    requestFailed,
    pendingUrl,
    showSkeletonLoader,
    setRequestFailed,
  } = usePendingRequests();

  // Only show requests with pending status
  const pendingOnly = pendingRequests.filter(req => req.status === 'pending');

  // Sort requests by timestamp (newest first)
  const sortedRequests = [...pendingOnly].sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  // If nothing to show, return null
  if (!hasPending && !isLoadingRequest && !requestFailed) {
    return null;
  }

  // Create combined data
  let combinedData;

  if (requestFailed || isLoadingRequest) {
    // If request failed or loading, add a skeleton item at the beginning of the list
    combinedData = [createSkeletonRequest(), ...sortedRequests];
  } else {
    // Just show the sorted pending requests
    combinedData = sortedRequests;
  }

  // Handle retry
  const handleRetry = () => {
    setRequestFailed(false);
    const url = pendingUrl!;
    showSkeletonLoader(url);
    getNostrServiceInstance().sendAuthInit(url.toString());
  };

  // Handle cancel
  const handleCancel = () => {
    setRequestFailed(false);
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={combinedData}
        keyExtractor={item => item.id}
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
        CellRendererComponent={({ children, index, style, ...props }) => (
          <View
            style={[
              style,
              styles.cellRenderer,
              // First cell gets left padding
              index === 0 && { paddingLeft: (width - CARD_WIDTH) / 2 },
              // Last cell gets right padding
              index === combinedData.length - 1 && { paddingRight: (width - CARD_WIDTH) / 2 },
              // All cells except the last get right margin
              index !== combinedData.length - 1 && { marginRight: CARD_MARGIN },
            ]}
            {...props}
          >
            {children}
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 12,
    marginBottom: 20,
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
