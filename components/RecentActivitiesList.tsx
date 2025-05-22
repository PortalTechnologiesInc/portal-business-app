import React, { useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from './ThemedText';
import { Colors } from '@/constants/Colors';
import { ActivityType } from '@/models/Activity';
import { formatCentsToCurrency, formatDayAndDate, formatRelativeTime } from '@/utils';
import { Key, BanknoteIcon } from 'lucide-react-native';
import { useActivities } from '@/context/ActivitiesContext';
import type { ActivityWithDates } from '@/services/database';

// Import shared activity row component that we'll create
import { ActivityRow } from './ActivityRow';

export const RecentActivitiesList: React.FC = () => {
  // Use the activities from the context
  const { activities, isDbReady, refreshData } = useActivities();

  // Refresh data when component mounts
  useEffect(() => {
    refreshData();
  }, [refreshData]);

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
            renderItem={({ item }) => <ActivityRow activity={item} />}
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
  title: {
    fontSize: 24,
    fontWeight: '600',
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
