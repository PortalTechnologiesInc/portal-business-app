import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import {
  formatCentsToCurrency,
  formatDayAndDate,
} from '@/utils';
import { FontAwesome6 } from '@expo/vector-icons';
import { useActivities } from '@/context/ActivitiesContext';
import { parseCalendar } from 'portal-app-lib';
import { useSQLiteContext } from 'expo-sqlite';
import { DatabaseService, fromUnixSeconds, type SubscriptionWithDates } from '@/services/database';

// Mock payment history for a subscription
interface PaymentHistory {
  id: string;
  amount: number;
  currency: string;
  status: 'completed' | 'pending' | 'failed';
  date: number;
}

export default function SubscriptionDetailScreen() {
  const { id } = useLocalSearchParams();
  const { subscriptions } = useActivities();
  const [subscription, setSubscription] = useState<SubscriptionWithDates | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const sqliteContext = useSQLiteContext();

  const DB = new DatabaseService(sqliteContext);

  useEffect(() => {
    if (id) {
      // Get the subscription with the matching ID
      const foundSubscription = subscriptions.find(sub => sub.id === id);

      if (foundSubscription) {
        setSubscription(foundSubscription);

        DB.getSubscriptionPayments(id as string).then(
          (payments) => setPaymentHistory(payments.map((payment) => ({
            id: payment.id,
            amount: payment.amount ?? 0,
            currency: payment.currency ?? 'sats',
            status: 'completed',
            date: payment.date.getTime(),
          }))
        ));
      }

      setLoading(false);
    }
  }, [id, subscriptions, DB]);

  const handleBackPress = () => {
    router.back();
  };

  const handleStopSubscription = () => {
    if (!subscription) return;

    Alert.alert(
      'Cancel Subscription',
      `Are you sure you want to cancel your subscription to ${subscription.service_name}?`,
      [
        {
          text: 'No',
          style: 'cancel',
        },
        {
          text: 'Yes, Cancel',
          onPress: () => {
            // In a real app, this would call an API to cancel the subscription
            Alert.alert(
              'Subscription Cancelled',
              'Your subscription has been cancelled successfully.'
            );
            router.back();
          },
          style: 'destructive',
        },
      ]
    );
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

  const parsedCalendar = parseCalendar(subscription.recurrence_calendar);
  const nextPayment =
    subscription.recurrence_first_payment_due > new Date() || !subscription.last_payment_date
      ? subscription.recurrence_first_payment_due
      : fromUnixSeconds(parsedCalendar.nextOccurrence(
          BigInt(subscription.last_payment_date?.getTime() ?? 0)
        ) ?? 0);

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
                {subscription.service_name}
              </ThemedText>
              <ThemedText style={styles.amount}>
                {subscription.amount} {subscription.currency}
              </ThemedText>
            </View>

            <View style={styles.recurrencyBadge}>
              <ThemedText
                style={styles.recurrency}
                type="defaultSemiBold"
                darkColor={Colors.dirtyWhite}
                lightColor={Colors.dirtyWhite}
              >
                {parsedCalendar.toHumanReadable(false)}
              </ThemedText>
            </View>

            <View style={styles.detailsContainer}>
              <ThemedText
                style={styles.detail}
                darkColor={Colors.dirtyWhite}
                lightColor={Colors.dirtyWhite}
              >
                First payment: {formatDayAndDate(new Date(subscription.recurrence_first_payment_due))}
              </ThemedText>
              <ThemedText
                style={styles.detail}
                darkColor={Colors.dirtyWhite}
                lightColor={Colors.dirtyWhite}
              >
                Next payment: {formatDayAndDate(nextPayment)}
              </ThemedText>
              {subscription.recurrence_max_payments && (
                <ThemedText
                  style={styles.detail}
                  darkColor={Colors.dirtyWhite}
                  lightColor={Colors.dirtyWhite}
                >
                  {subscription.recurrence_max_payments - paymentHistory.length} payments left
                </ThemedText>
              )}
              {subscription.recurrence_until && (
                <ThemedText
                style={styles.detail}
                darkColor={Colors.dirtyWhite}
                lightColor={Colors.dirtyWhite}
              >
                Until: {formatDayAndDate(new Date(subscription.recurrence_until ?? 0))}
              </ThemedText>)}
            </View>
          </View>

          <TouchableOpacity
            style={styles.stopButton}
            onPress={handleStopSubscription}
            activeOpacity={0.7}
          >
            <View style={styles.stopButtonContent}>
              <FontAwesome6
                name="stop-circle"
                size={18}
                color={Colors.almostWhite}
                style={styles.stopIcon}
              />
              <ThemedText
                style={styles.stopButtonText}
                darkColor={Colors.almostWhite}
                lightColor={Colors.almostWhite}
              >
                Stop Subscription
              </ThemedText>
            </View>
          </TouchableOpacity>

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
              <ThemedText style={styles.noDataText}>No payment history available</ThemedText>
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
  stopButton: {
    backgroundColor: '#bc1c3d',
    borderRadius: 12,
    padding: 16,
    marginTop: 24,
    marginBottom: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  stopButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopIcon: {
    marginRight: 8,
  },
  stopButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
