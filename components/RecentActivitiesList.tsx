import React, { useCallback, useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from './ThemedText';
import { Colors } from '@/constants/Colors';
import { Activity, ActivityType } from '@/models/Activity';
import { getMockedActivities } from '@/mocks/Activities';
import { formatCentsToCurrency, formatDayAndDate, formatRelativeTime } from '@/utils';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';

export const RecentActivitiesList: React.FC = () => {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    setActivities(getMockedActivities().slice(0, 5));
  }, []);

  const handleSeeAll = useCallback(() => {
    router.push('/ActivityList');
  }, []);

  const today = useMemo(() => {
    return formatDayAndDate(new Date());
  }, []);

  const renderActivityItem = useCallback(
    ({ item }: { item: Activity }) => (
      <View style={styles.activityCard}>
        <View style={styles.iconContainer}>
          {item.type === ActivityType.Auth ? (
            <FontAwesome6 name="key" size={20} color={Colors.almostWhite} />
          ) : (
            <FontAwesome6 name="money-bill" size={20} color={Colors.almostWhite} />
          )}
        </View>
        <View style={styles.activityInfo}>
          <ThemedText
            type="subtitle"
            darkColor={Colors.almostWhite}
            lightColor={Colors.almostWhite}
          >
            {item.name}
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
          {item.type === ActivityType.Pay && (
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

  if (activities.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText type="title" style={styles.title} darkColor={Colors.almostWhite} lightColor={Colors.almostWhite}>
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

      <ThemedText
        style={styles.dateHeader}
        darkColor={Colors.dirtyWhite}
        lightColor={Colors.dirtyWhite}
      >
        {today}
      </ThemedText>

      <FlatList
        data={activities}
        keyExtractor={(_, index) => index.toString()}
        renderItem={renderActivityItem}
        scrollEnabled={false}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateHeader: {
    fontSize: 14,
    marginBottom: 12,
  },
  seeAll: {
    fontSize: 14,
  },
  activityCard: {
    flexDirection: 'row',
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    minHeight: 72,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
});
