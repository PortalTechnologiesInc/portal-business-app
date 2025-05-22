import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import { ActivityType as ActivityTypeEnum } from '../../models/Activity';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ActivityWithDates } from '@/services/database';
import { useActivities } from '@/context/ActivitiesContext';
import { ActivityRow } from '@/components/ActivityRow';
import { router } from 'expo-router';

const ItemList: React.FC = () => {
  const { activities, isDbReady, refreshData } = useActivities();
  const [filter, setFilter] = useState<ActivityTypeEnum | null>(null);

  // Refresh data when component mounts or becomes focused
  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Memoize filtered items to prevent recalculation on every render
  const filteredItems = useMemo(
    () => (filter === null ? activities : activities.filter(item => item.type === filter)),
    [filter, activities]
  );

  // Memoize grouped items to prevent recalculation on every render
  const groupedItems = useMemo(() => {
    return filteredItems.reduce(
      (acc, item) => {
        const dateString = item.date.toDateString();
        if (!acc[dateString]) {
          acc[dateString] = [];
        }
        acc[dateString].push(item);
        return acc;
      },
      {} as Record<string, ActivityWithDates[]>
    );
  }, [filteredItems]);

  // Memoize data for FlatList to prevent new array creation on every render
  const listData = useMemo(
    () => Object.entries(groupedItems).map(([title, data]) => ({ title, data })),
    [groupedItems]
  );

  // Memoize section header to prevent recreation on every render
  const renderSectionHeader = useCallback(
    ({ section: { title } }: { section: { title: string } }) => (
      <ThemedText type="subtitle" style={styles.date}>
        {title}
      </ThemedText>
    ),
    []
  );

  // Memoize filter handlers
  const handleFilterAll = useCallback(() => setFilter(null), []);
  const handleFilterPay = useCallback(() => setFilter(ActivityTypeEnum.Pay), []);
  const handleFilterAuth = useCallback(() => setFilter(ActivityTypeEnum.Auth), []);

  // Memoized list header and footer components
  const ListHeaderComponent = useMemo(() => <View style={{ height: 16 }} />, []);
  const ListFooterComponent = useMemo(() => <View style={{ height: 24 }} />, []);

  // link handler
  const handleLinkPress = useCallback((activity: ActivityWithDates) => {
    router.push({
      pathname: '/activity/[id]',
      params: { id: activity.id },
    });
  }, []);

  // Memoize list item renderer
  const listItemRenderer = useCallback(
    ({ item }: { item: { title: string; data: ActivityWithDates[] } }) => (
      <>
        {renderSectionHeader({ section: { title: item.title } })}
        {item.data.map((activity: ActivityWithDates) => (
          <React.Fragment key={`${activity.id}-${activity.date.getTime()}`}>
            <ActivityRow activity={activity} />
          </React.Fragment>
        ))}
      </>
    ),
    [renderSectionHeader]
  );

  // Show a database initialization message when database isn't ready
  if (!isDbReady) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedView style={styles.container}>
          <ThemedText type="title" darkColor={Colors.almostWhite}>
            Your activities
          </ThemedText>
          <View style={styles.emptyContainer}>
            <ThemedText
              style={styles.emptyText}
              darkColor={Colors.dirtyWhite}
              lightColor={Colors.darkGray}
            >
              Activities will be available after setup is complete
            </ThemedText>
          </View>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <ThemedText type="title" darkColor={Colors.almostWhite}>
          Your activities
        </ThemedText>
        <View style={styles.filterContainer}>
          <TouchableOpacity
            style={[styles.filterChip, filter === null && styles.filterChipActive]}
            onPress={handleFilterAll}
          >
            <ThemedText
              type="subtitle"
              style={[styles.filterChipText, filter === null && styles.filterChipTextActive]}
            >
              All
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filter === ActivityTypeEnum.Pay && styles.filterChipActive]}
            onPress={handleFilterPay}
          >
            <ThemedText
              type="subtitle"
              style={[
                styles.filterChipText,
                filter === ActivityTypeEnum.Pay && styles.filterChipTextActive,
              ]}
            >
              Pay
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filter === ActivityTypeEnum.Auth && styles.filterChipActive]}
            onPress={handleFilterAuth}
          >
            <ThemedText
              type="subtitle"
              style={[
                styles.filterChipText,
                filter === ActivityTypeEnum.Auth && styles.filterChipTextActive,
              ]}
            >
              Login
            </ThemedText>
          </TouchableOpacity>
        </View>

        {listData.length === 0 ? (
          <View style={styles.emptyContainer}>
            <ThemedText
              style={styles.emptyText}
              darkColor={Colors.dirtyWhite}
              lightColor={Colors.darkGray}
            >
              No activities found
            </ThemedText>
          </View>
        ) : (
          <FlatList
            showsVerticalScrollIndicator={false}
            data={listData}
            renderItem={listItemRenderer}
            keyExtractor={item => item.title}
            ListHeaderComponent={ListHeaderComponent}
            ListFooterComponent={ListFooterComponent}
            removeClippedSubviews={true}
            maxToRenderPerBatch={10}
            windowSize={10}
            initialNumToRender={8}
          />
        )}
      </ThemedView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.darkerGray,
  },
  container: {
    width: '100%',
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    backgroundColor: Colors.darkerGray,
  },
  filterContainer: {
    paddingVertical: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  filterChipActive: {
    backgroundColor: Colors.dirtyWhite,
  },
  filterChipText: {
    color: Colors.darkerGray,
  },
  filterChipTextActive: {
    color: Colors.darkGray,
  },
  filterChip: {
    backgroundColor: Colors.darkGray,
    paddingVertical: 4,
    paddingHorizontal: 16,
    marginEnd: 8,
    borderRadius: 8,
  },
  date: {
    marginBottom: 6,
    color: Colors.dirtyWhite,
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});

export default ItemList;
