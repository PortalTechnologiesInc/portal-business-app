import React, { useEffect, useState } from 'react';
import { StyleSheet, View, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { getMockedSubscriptions, Subscription } from '@/mocks/Subscriptions';
import { formatCentsToCurrency, formatDayAndDate, formatRelativeTime, getNextRecurrenceDay, getRemainingRecurrenceCount } from '@/utils';
import { FontAwesome6 } from '@expo/vector-icons';

// Mock payment history for a subscription
interface PaymentHistory {
  id: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  date: number;
}

const getMockPaymentHistory = (subscriptionId: string): PaymentHistory[] => {
  // Create some mock payment history entries
  const today = new Date().getTime();
  const oneDay = 24 * 60 * 60 * 1000;
  
  return [
    {
      id: `${subscriptionId}-1`,
      amount: 500,
      currency: 'EUR',
      status: 'completed',
      date: today - (30 * oneDay),
    },
    {
      id: `${subscriptionId}-2`,
      amount: 500,
      currency: 'EUR',
      status: 'completed',
      date: today - (60 * oneDay),
    },
    {
      id: `${subscriptionId}-3`,
      amount: 500,
      currency: 'EUR',
      status: 'completed',
      date: today - (90 * oneDay),
    },
  ];
};

export default function SubscriptionDetailScreen() {
  const { id } = useLocalSearchParams();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      // Get the subscription with the matching ID
      const subscriptions = getMockedSubscriptions();
      const foundSubscription = subscriptions.find(sub => sub.id === id);
      
      if (foundSubscription) {
        setSubscription(foundSubscription);
        // Get mock payment history for this subscription
        setPaymentHistory(getMockPaymentHistory(id as string));
      }
      
      setLoading(false);
    }
  }, [id]);

  const handleBackPress = () => {
    router.back();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return Colors.green;
      case 'pending':
        return Colors.gray;
      case 'failed':
        return Colors.red;
      default:
        return Colors.dirtyWhite;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.almostWhite} />
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!subscription) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.container}>
          <View style={styles.header}>
            <FontAwesome6 
              name="arrow-left" 
              size={24} 
              color={Colors.almostWhite} 
              onPress={handleBackPress}
              style={styles.backButton}
            />
            <ThemedText type="title" style={styles.title}>
              Subscription Not Found
            </ThemedText>
          </View>
          <ThemedText style={styles.noDataText}>
            The subscription you're looking for doesn't exist.
          </ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <FontAwesome6 
            name="arrow-left" 
            size={24} 
            color={Colors.almostWhite} 
            onPress={handleBackPress}
            style={styles.backButton}
          />
          <ThemedText type="title" style={styles.title}>
            Subscription Details
          </ThemedText>
        </View>

        <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <View style={styles.serviceHeader}>
              <ThemedText type="subtitle" style={styles.serviceName}>
                {subscription.serviceName}
              </ThemedText>
              <ThemedText style={styles.amount}>
                {subscription.currency} {formatCentsToCurrency(subscription.amount)}
              </ThemedText>
            </View>
            
            <View style={styles.recurrencyBadge}>
              <ThemedText
                style={styles.recurrency}
                type='defaultSemiBold'
                darkColor={Colors.dirtyWhite}
                lightColor={Colors.dirtyWhite}
              >
                {subscription.recurrence.calendar}
              </ThemedText>
            </View>

            <View style={styles.detailsContainer}>
              <ThemedText
                style={styles.detail}
                darkColor={Colors.dirtyWhite}
                lightColor={Colors.dirtyWhite}
              >
                {`☝️ First payment: ${formatDayAndDate(new Date(subscription.recurrence.firstPaymentDue))}`}
              </ThemedText>
              <ThemedText
                style={styles.detail}
                darkColor={Colors.dirtyWhite}
                lightColor={Colors.dirtyWhite}
              >
                {`💸 Next payment in ${getNextRecurrenceDay(new Date(subscription.recurrence.firstPaymentDue ?? 0), subscription.recurrence.calendar)}`}
              </ThemedText>
              {subscription.amount && (
                <ThemedText
                  style={styles.detail}
                  darkColor={Colors.dirtyWhite}
                  lightColor={Colors.dirtyWhite}
                >
                  {`🏃 ${getRemainingRecurrenceCount(new Date(subscription.recurrence.firstPaymentDue ?? 0), subscription.recurrence.calendar, subscription.recurrence.maxPayments ?? 0)} payments left`}
                </ThemedText>
              )}
              <ThemedText
                style={styles.detail}
                darkColor={Colors.dirtyWhite}
                lightColor={Colors.dirtyWhite}
              >
                {`⏳ Until: ${formatDayAndDate(new Date(subscription.recurrence.until ?? 0))}`}
              </ThemedText>
            </View>
          </View>

          <View style={styles.paymentHistoryContainer}>
            <ThemedText type="subtitle" style={styles.sectionTitle}>
              Payment History
            </ThemedText>
            
            {paymentHistory.length > 0 ? (
              paymentHistory.map(payment => (
                <View key={payment.id} style={styles.paymentItem}>
                  <View style={styles.paymentInfo}>
                    <ThemedText style={styles.paymentDate}>
                      {formatDayAndDate(new Date(payment.date))}
                    </ThemedText>
                    <ThemedText 
                      style={styles.paymentStatus}
                      darkColor={getStatusColor(payment.status)}
                      lightColor={getStatusColor(payment.status)}
                    >
                      {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                    </ThemedText>
                  </View>
                  <ThemedText style={styles.paymentAmount}>
                    {payment.currency} {formatCentsToCurrency(payment.amount)}
                  </ThemedText>
                </View>
              ))
            ) : (
              <ThemedText style={styles.noDataText}>
                No payment history available
              </ThemedText>
            )}
          </View>
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.darkerGray,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.darkerGray,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.darkerGray,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  scrollContainer: {
    flex: 1,
  },
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 20,
    marginTop: 16,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 20,
  },
  amount: {
    fontSize: 20,
    fontWeight: '300',
  },
  recurrencyBadge: {
    marginBottom: 16,
  },
  recurrency: {
    marginVertical: 8,
  },
  detailsContainer: {
    marginTop: 8,
  },
  detail: {
    marginVertical: 4,
  },
  paymentHistoryContainer: {
    marginTop: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  paymentItem: {
    backgroundColor: '#1E1E1E',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  paymentInfo: {
    flex: 1,
  },
  paymentDate: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.almostWhite,
    marginBottom: 4,
  },
  paymentStatus: {
    fontSize: 14,
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.almostWhite,
  },
  noDataText: {
    textAlign: 'center',
    marginTop: 24,
    color: Colors.dirtyWhite,
  },
}); 