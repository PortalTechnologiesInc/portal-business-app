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
import { useThemeColor } from '@/hooks/useThemeColor';

// Import shared activity row component that we'll create
import { ActivityRow } from './ActivityRow';

export const RecentActivitiesList: React.FC = () => {
  // Use the activities from the context
  const { activities, isDbReady, refreshData } = useActivities();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor({}, 'cardBackground');
  const primaryTextColor = useThemeColor({}, 'textPrimary');
  const secondaryTextColor = useThemeColor({}, 'textSecondary');

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
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.header}>
        <ThemedText type="title" style={[styles.title, { color: primaryTextColor }]}>
          Recent Activities
        </ThemedText>
        <TouchableOpacity onPress={handleSeeAll}>
          <ThemedText style={[styles.seeAll, { color: secondaryTextColor }]}>
            See all &gt;
          </ThemedText>
        </TouchableOpacity>
      </View>

      {!isDbReady ? (
        <View style={[styles.emptyContainer, { backgroundColor: cardBackgroundColor }]}>
          <ThemedText style={[styles.emptyText, { color: secondaryTextColor }]}>
            Loading activities...
          </ThemedText>
        </View>
      ) : recentActivities.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: cardBackgroundColor }]}>
          <ThemedText style={[styles.emptyText, { color: secondaryTextColor }]}>
            No recent activities
          </ThemedText>
        </View>
      ) : (
        <>
          <ThemedText style={[styles.dateHeader, { color: secondaryTextColor }]}>
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
    // backgroundColor handled by theme
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
    // backgroundColor handled by theme
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
