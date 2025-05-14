import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, FlatList, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getMockedSubscriptions, Subscription } from '@/mocks/Subscriptions';
import { formatCentsToCurrency, formatDayAndDate, formatRelativeTime, getNextRecurrenceDay } from '@/utils';

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
        <View style={styles.cardContent}>
          <View style={styles.headerRow}>
            <ThemedText type='subtitle'>{item.serviceName}</ThemedText>
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
          
          <ThemedText
            style={styles.nextPayment}
            darkColor={Colors.dirtyWhite}
            lightColor={Colors.dirtyWhite}
          >
            Next payment in {getNextRecurrenceDay(new Date(item.recurrence.firstPaymentDue ?? 0), item.recurrence.calendar)}
          </ThemedText>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  recurrency: {
    marginBottom: 12,
  },
  nextPayment: {
    marginVertical: 2,
  },
  subscriptionCard: {
    backgroundColor: '#1E1E1E',
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
