import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList } from 'react-native';
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

  // Memoize renderItem to prevent recreation on every render
  const renderItem = useCallback(
    ({ item }: { item: Subscription }) => (
      <View style={styles.subscriptionCard}>
        <View style={styles.activityInfo}>
          <Collapsible darkColor='transparent' lightColor='transparent' header={
            <View style={styles.header}>
              <View style={styles.headerTexts}>
                <ThemedText type='subtitle'>
                  {item.serviceName}
                </ThemedText>
                <ThemedText
                  style={styles.typeText}
                  darkColor={Colors.dirtyWhite}
                  lightColor={Colors.dirtyWhite}
                >
                  {item.recurrence.calendar}
                </ThemedText>
              </View>
              <View style={styles.activityDetails}>
                <ThemedText
                  style={styles.amount}
                >
                  {item.currency} {formatCentsToCurrency(item.amount)}
                </ThemedText>
              </View>
            </View>
          }>
            {/* <View style={styles.detailsContainer}> */}
            <View>
              <ThemedText
                darkColor={Colors.dirtyWhite}
                lightColor={Colors.dirtyWhite}
              >
                {`☝️ First payment: ${formatDayAndDate(new Date(item.recurrence.firstPaymentDue))}`}
              </ThemedText>
              <ThemedText
                darkColor={Colors.dirtyWhite}
                lightColor={Colors.dirtyWhite}
              >
                {`💸 Next payment in ${getNextRecurrenceDay(new Date(item.recurrence.firstPaymentDue ?? 0), item.recurrence.calendar)}`}
              </ThemedText>
              {item.amount && (
                <ThemedText
                  darkColor={Colors.dirtyWhite}
                  lightColor={Colors.dirtyWhite}
                >
                  {`🏃 ${getRemainingRecurrenceCount(new Date(item.recurrence.firstPaymentDue ?? 0), item.recurrence.calendar, item.recurrence.maxPayments ?? 0)} payments left`}
                </ThemedText>
              )}
              <ThemedText
                darkColor={Colors.dirtyWhite}
                lightColor={Colors.dirtyWhite}
              >
                {`⏳ Until: ${formatDayAndDate(new Date(item.recurrence.until ?? 0))}`}
              </ThemedText>
            </View>
          </Collapsible>
        </View>
      </View>
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    minHeight: 60,
    flex: 1
  },
  headerTexts: {
    flex: 1,
    justifyContent: 'center',
    marginRight: 16
  },
  typeText: {
    fontSize: 12,
    marginTop: 4
  },
  subscriptionCard: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    width: '100%'
  },
  activityInfo: {
    flex: 1,
    justifyContent: 'center'
  },
  activityDetails: {
    justifyContent: 'center',
    alignItems: 'flex-end',
    minWidth: '30%'
  },
  amount: {
    fontSize: 20,
    fontWeight: '300',
    textAlign: 'right'
  },
  container: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
    backgroundColor: Colors.darkerGray
  },
  list: {
    marginTop: 32,
    flex: 1,
    width: '100%'
  },
  listContent: {
    paddingVertical: 32,
    width: '100%'
  },
});
