import type React from 'react';
import { useCallback, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from './ThemedText';
import { Colors } from '@/constants/Colors';
import { ActivityType } from '@/models/Activity';
import { formatCentsToCurrency, formatDayAndDate, formatRelativeTime } from '@/utils';
import { Key, BanknoteIcon } from 'lucide-react-native';
import { useActivities } from '@/context/ActivitiesContext';
import type { ActivityWithDates } from '@/services/database';

export const RecentActivitiesList: React.FC = () => {
  // Use the activities from the context
  const { activities, isDbReady } = useActivities();

  // Get only the first 5 most recent activities
  const recentActivities = useMemo(() => {
    return activities.slice(0, 5);
  }, [activities]);

  const handleSeeAll = useCallback(() => {
    router.push('/ActivityList');
  }, []);

  const today = useMemo(() => {
    return formatDayAndDate(new Date());
  }, []);

  const renderActivityItem = useCallback(
    ({ item }: { item: ActivityWithDates }) => (
      <View style={styles.activityCard}>
        <View style={styles.iconContainer}>
          {item.type === ActivityType.Auth ? (
            <Key size={20} color={Colors.almostWhite} />
          ) : (
            <BanknoteIcon size={20} color={Colors.almostWhite} />
          )}
        </View>
        <View style={styles.activityInfo}>
          <ThemedText
            type="subtitle"
            darkColor={Colors.almostWhite}
            lightColor={Colors.almostWhite}
          >
            {item.service_name}
          </ThemedText>
          <ThemedText
            style={styles.typeText}
            darkColor={Colors.dirtyWhite}
            lightColor={Colors.dirtyWhite}
          >
            {item.type === ActivityType.Auth ? 'Login Request' : 'Payment'}
          </ThemedText>
        </View>
        <View style={styles.activityDetails}>
          {item.type === ActivityType.Pay && item.amount !== null && (
            <ThemedText
              style={styles.amount}
              darkColor={item.amount < 0 ? Colors.red : Colors.green}
              lightColor={item.amount < 0 ? Colors.red : Colors.green}
            >
              {formatCentsToCurrency(item.amount)} {item.currency}
            </ThemedText>
          )}
          <ThemedText
            style={styles.timeAgo}
            darkColor={Colors.dirtyWhite}
            lightColor={Colors.dirtyWhite}
          >
            {formatRelativeTime(item.date)}
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
          Recent Activities
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

      {!isDbReady ? (
        <View style={styles.emptyContainer}>
          <ThemedText
            style={styles.emptyText}
            darkColor={Colors.dirtyWhite}
            lightColor={Colors.darkGray}
          >
            Loading activities...
          </ThemedText>
        </View>
      ) : recentActivities.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ThemedText
            style={styles.emptyText}
            darkColor={Colors.dirtyWhite}
            lightColor={Colors.darkGray}
          >
            No recent activities
          </ThemedText>
        </View>
      ) : (
        <>
          <ThemedText
            style={styles.dateHeader}
            darkColor={Colors.dirtyWhite}
            lightColor={Colors.dirtyWhite}
          >
            {today}
          </ThemedText>

          <FlatList
            data={recentActivities}
            keyExtractor={item => item.id}
            renderItem={renderActivityItem}
            scrollEnabled={false}
            removeClippedSubviews={false}
            initialNumToRender={5}
          />
        </>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.darkerGray,
    marginTop: 8,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  dateHeader: {
    fontSize: 14,
    marginBottom: 10,
  },
  seeAll: {
    fontSize: 14,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    minHeight: 72,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  activityInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  activityDetails: {
    alignItems: 'flex-end',
    justifyContent: 'center',
    minWidth: 80,
  },
  typeText: {
    fontSize: 12,
    marginTop: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  timeAgo: {
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
