import type React from 'react';
import { useCallback, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from './ThemedText';
import { Colors } from '@/constants/Colors';
import type { UpcomingPayment } from '@/models/UpcomingPayment';
import { formatCentsToCurrency, formatRelativeTime } from '@/utils';

export const UpcomingPaymentsList: React.FC = () => {
  // Initialize with empty array - will be populated with real data later
  const [upcomingPayments] = useState<UpcomingPayment[]>([]);

  const handleSeeAll = useCallback(() => {
    // Will be implemented when we have a dedicated page
    // Currently just an alert or placeholder
    router.push('/(tabs)/Subscriptions');
  }, []);

  const renderPaymentItem = useCallback(
    ({ item }: { item: UpcomingPayment }) => (
      <View style={styles.paymentCard}>
        <View style={styles.paymentInfo}>
          <ThemedText
            type="subtitle"
            darkColor={Colors.almostWhite}
            lightColor={Colors.almostWhite}
          >
            {item.serviceName}
          </ThemedText>
        </View>
        <View style={styles.paymentDetails}>
          <ThemedText style={styles.amount} darkColor={Colors.red} lightColor={Colors.red}>
            {formatCentsToCurrency(item.amount)} {item.currency}
          </ThemedText>
          <ThemedText
            style={styles.dueDate}
            darkColor={Colors.dirtyWhite}
            lightColor={Colors.dirtyWhite}
          >
            {formatRelativeTime(item.dueDate)}
          </ThemedText>
        </View>
      </View>
    ),
    []
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText
          type="title"
          style={styles.title}
          darkColor={Colors.almostWhite}
          lightColor={Colors.almostWhite}
        >
          Upcoming Payments
        </ThemedText>
        <TouchableOpacity onPress={handleSeeAll}>
          <ThemedText
            style={styles.seeAll}
            darkColor={Colors.dirtyWhite}
            lightColor={Colors.dirtyWhite}
          >
            See all &gt;
          </ThemedText>
        </TouchableOpacity>
      </View>

      {upcomingPayments.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ThemedText
            style={styles.emptyText}
            darkColor={Colors.dirtyWhite}
            lightColor={Colors.darkGray}
          >
            No upcoming payments
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={upcomingPayments}
          keyExtractor={item => item.id}
          renderItem={renderPaymentItem}
          scrollEnabled={false}
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
  seeAll: {
    fontSize: 14,
  },
  paymentCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
  },
  paymentInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  paymentDetails: {
    alignItems: 'flex-end',
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
  },
  dueDate: {
    fontSize: 12,
    marginTop: 4,
  },
  emptyContainer: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 100,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
