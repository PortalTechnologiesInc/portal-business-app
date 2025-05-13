import React from 'react';
import { View, StyleSheet, FlatList, Dimensions } from 'react-native';
import { usePendingRequests } from '../context/PendingRequestsContext';
import { PendingRequestCard } from './PendingRequestCard';
import { PendingRequest } from '../models/PendingRequest';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 48; // Full width minus padding
const CARD_MARGIN = 12; // Margin between cards

export const PendingRequestsList: React.FC = () => {
  const { pendingRequests, hasPending } = usePendingRequests();

  // Only show requests with pending status
  const pendingOnly = pendingRequests.filter(req => req.status === 'pending');

  if (!hasPending) {
    return null;
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={pendingOnly}
        keyExtractor={item => item.id}
        renderItem={({ item }) => (
          <View style={styles.itemContainer}>
            <PendingRequestCard request={item} />
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
          pendingOnly.length === 1 && { flex: 1, justifyContent: 'center' },
        ]}
        CellRendererComponent={({ children, index, style, ...props }) => (
          <View
            style={[
              style,
              styles.cellRenderer,
              // First cell gets left padding
              index === 0 && { paddingLeft: (width - CARD_WIDTH) / 2 },
              // Last cell gets right padding
              index === pendingOnly.length - 1 && { paddingRight: (width - CARD_WIDTH) / 2 },
              // All cells except the last get right margin
              index !== pendingOnly.length - 1 && { marginRight: CARD_MARGIN },
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
