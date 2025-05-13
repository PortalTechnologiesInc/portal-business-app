import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMockedSubscriptions, Subscription } from '@/mocks/Subscriptions';
import { formatCentsToCurrency, formatDayAndDate, formatRelativeTime, getNextRecurrenceDay, getRemainingRecurrenceCount } from '@/utils';
import { Collapsible } from '@/components/Collapsible';

export default function SubscriptionsScreen() {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);

  useEffect(() => {
    setSubscriptions(getMockedSubscriptions());
  }, []);

  const handleSubscriptionPress = useCallback((subscriptionId: string) => {
    router.push({
      pathname: "/subscription/[id]",
      params: { id: subscriptionId }
    });
  }, []);

  // Memoize renderItem to prevent recreation on every render
  const renderItem = useCallback(
    ({ item }: { item: Subscription }) => (
      <TouchableOpacity 
        style={styles.subscriptionCard} 
        onPress={() => handleSubscriptionPress(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.activityInfo}>
          <Collapsible darkColor='transparent' lightColor='transparent' header={
            <View style={styles.header}>
              <View style={styles.headerTexts}>
                <ThemedText type='subtitle'>
                  {item.serviceName}
                </ThemedText>
                <ThemedText style={styles.amount}>
                  {item.currency} {formatCentsToCurrency(item.amount)}
                </ThemedText>
              </View>
              <ThemedText
                style={styles.recurrency}
                type='defaultSemiBold'
                darkColor={Colors.dirtyWhite}
                lightColor={Colors.dirtyWhite}
              >
                {item.recurrence.calendar}
              </ThemedText>
            </View>
          }>
            <View>
              <ThemedText
                style={styles.detail}
                darkColor={Colors.dirtyWhite}
                lightColor={Colors.dirtyWhite}
              >
                {`☝️ First payment: ${formatDayAndDate(new Date(item.recurrence.firstPaymentDue))}`}
              </ThemedText>
              <ThemedText
                style={styles.detail}
                darkColor={Colors.dirtyWhite}
                lightColor={Colors.dirtyWhite}
              >
                {`💸 Next payment in ${getNextRecurrenceDay(new Date(item.recurrence.firstPaymentDue ?? 0), item.recurrence.calendar)}`}
              </ThemedText>
              {item.amount && (
                <ThemedText
                  style={styles.detail}
                  darkColor={Colors.dirtyWhite}
                  lightColor={Colors.dirtyWhite}
                >
                  {`🏃 ${getRemainingRecurrenceCount(new Date(item.recurrence.firstPaymentDue ?? 0), item.recurrence.calendar, item.recurrence.maxPayments ?? 0)} payments left`}
                </ThemedText>
              )}
              <ThemedText
                style={styles.detail}
                darkColor={Colors.dirtyWhite}
                lightColor={Colors.dirtyWhite}
              >
                {`⏳ Until: ${formatDayAndDate(new Date(item.recurrence.until ?? 0))}`}
              </ThemedText>
            </View>
          </Collapsible>
        </View>
      </TouchableOpacity>
    ),
    []
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" darkColor={Colors.almostWhite}>
          Your subscriptions
        </ThemedText>
        <FlatList
          showsVerticalScrollIndicator={false}
          style={styles.list}
          contentContainerStyle={styles.listContent}
          data={subscriptions}
          renderItem={renderItem}
          keyExtractor={item => item.id}
        />
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.darkerGray,
  },
  header: {
    justifyContent: 'space-between',
    width: '100%',
  },
  headerTexts: {
    paddingEnd: 10,
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between'
  },
  recurrency: {
    marginVertical: 6
  },
  subscriptionCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
  },
  activityInfo: {
    justifyContent: 'center'
  },
  detail: {
    marginVertical: 2,
  },
  amount: {
    fontSize: 20,
    fontWeight: '300',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: Colors.darkerGray
  },
  list: {
    marginTop: 24,
    flex: 1,
  },
  listContent: {
    paddingVertical: 24,
  },
});
