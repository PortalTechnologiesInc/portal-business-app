import React, { useCallback } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { formatDayAndDate } from '@/utils';
import { useActivities } from '@/context/ActivitiesContext';
import { fromUnixSeconds, type SubscriptionWithDates } from '@/services/database';
import { parseCalendar } from 'portal-app-lib';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function SubscriptionsScreen() {
  const { subscriptions, isDbReady } = useActivities();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceSecondaryColor = useThemeColor({}, 'surfaceSecondary');
  const primaryTextColor = useThemeColor({}, 'textPrimary');
  const secondaryTextColor = useThemeColor({}, 'textSecondary');

  const handleSubscriptionPress = useCallback((subscriptionId: string) => {
    router.push({
      pathname: '/subscription/[id]',
      params: { id: subscriptionId },
    });
  }, []);

  // Memoize renderItem to prevent recreation on every render
  const renderItem = useCallback(
    ({ item }: { item: SubscriptionWithDates }) => {
      const parsedCalendar = parseCalendar(item.recurrence_calendar);
      const nextPayment =
        item.recurrence_first_payment_due > new Date() || !item.last_payment_date
          ? item.recurrence_first_payment_due
          : fromUnixSeconds(
              parsedCalendar.nextOccurrence(
                BigInt((item.last_payment_date?.getTime() ?? 0) / 1000)
              ) ?? 0
            );

      return (
        <TouchableOpacity
          style={[styles.subscriptionCard, { backgroundColor: surfaceSecondaryColor }]}
          onPress={() => handleSubscriptionPress(item.id)}
          activeOpacity={0.7}
        >
          <View style={styles.cardContent}>
            <View style={styles.headerRow}>
              <ThemedText type="subtitle" style={{ color: primaryTextColor }}>
                {item.service_name}
              </ThemedText>
              <ThemedText style={[styles.amount, { color: primaryTextColor }]}>
                {item.amount} {item.currency}
              </ThemedText>
            </View>

            <ThemedText
              style={[styles.recurrency, { color: secondaryTextColor }]}
              type="defaultSemiBold"
            >
              {parsedCalendar.toHumanReadable(false)}
            </ThemedText>

            <ThemedText style={[styles.nextPayment, { color: secondaryTextColor }]}>
              Next payment: {formatDayAndDate(nextPayment)}
            </ThemedText>
          </View>
        </TouchableOpacity>
      );
    },
    [handleSubscriptionPress, surfaceSecondaryColor, primaryTextColor, secondaryTextColor]
  );

  // Show a database initialization message when database isn't ready
  if (!isDbReady) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top']}>
        <ThemedView style={styles.container}>
          <ThemedText type="title" style={{ color: primaryTextColor }}>
            Your subscriptions
          </ThemedText>
          <View style={[styles.emptyContainer, { backgroundColor: surfaceSecondaryColor }]}>
            <ThemedText style={[styles.emptyText, { color: secondaryTextColor }]}>
              Subscriptions will be available after setup is complete
            </ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top']}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" style={{ color: primaryTextColor }}>
          Your subscriptions
        </ThemedText>

        {subscriptions.length === 0 ? (
          <View style={[styles.emptyContainer, { backgroundColor: surfaceSecondaryColor }]}>
            <ThemedText style={[styles.emptyText, { color: secondaryTextColor }]}>
              No subscriptions found
            </ThemedText>
          </View>
        ) : (
          <FlatList
            showsVerticalScrollIndicator={false}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            data={subscriptions}
            renderItem={renderItem}
            keyExtractor={item => item.id}
          />
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // backgroundColor handled by theme
  },
  header: {
    justifyContent: 'space-between',
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recurrency: {
    marginBottom: 12,
    // color handled by theme
  },
  nextPayment: {
    marginVertical: 2,
    // color handled by theme
  },
  subscriptionCard: {
    // backgroundColor handled by theme
    borderRadius: 20,
    padding: 18,
    marginBottom: 10,
  },
  cardContent: {
    flex: 1,
  },
  amount: {
    fontSize: 20,
    fontWeight: '300',
    // color handled by theme
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    // backgroundColor handled by theme
  },
  list: {
    marginTop: 24,
    flex: 1,
  },
  listContent: {
    paddingVertical: 24,
  },
  emptyContainer: {
    flex: 1,
    // backgroundColor handled by theme
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    // color handled by theme
  },
});
