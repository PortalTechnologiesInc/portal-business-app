import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { Activity, ActivityType } from '../../models/Activity';
import { getMockedActivities } from '@/mocks/Activities';
import { formatCentsToCurrency, formatRelativeTime } from '@/utils';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';

const ItemList: React.FC = () => {
  const [items, setItems] = useState<Activity[]>([]);
  const [filter, setFilter] = useState<ActivityType | null>(null);

  // Memoize filtered items to prevent recalculation on every render
  const filteredItems = useMemo(
    () => (filter === null ? items : items.filter(item => item.type === filter)),
    [filter, items]
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
      {} as Record<string, Activity[]>
    );
  }, [filteredItems]);

  // Memoize data for FlatList to prevent new array creation on every render
  const listData = useMemo(
    () => Object.entries(groupedItems).map(([title, data]) => ({ title, data })),
    [groupedItems]
  );

  useEffect(() => {
    setItems(getMockedActivities());
  }, []);

  // Memoize renderItem to prevent recreation on every render
  const renderItem = useCallback(
    ({ activity }: { activity: Activity }) => (
      <View style={styles.activityCard}>
        <View style={styles.iconContainer}>
          {activity.type === ActivityType.Auth ? (
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
            {activity.name}
          </ThemedText>
          <ThemedText
            style={styles.typeText}
            darkColor={Colors.dirtyWhite}
            lightColor={Colors.dirtyWhite}
          >
            {activity.type === ActivityType.Auth ? 'Login Request' : 'Payment'}
          </ThemedText>
        </View>
        <View style={styles.activityDetails}>
          {activity.type === ActivityType.Pay && (
            <ThemedText
              style={styles.amount}
              darkColor={activity.amount < 0 ? Colors.red : Colors.green}
              lightColor={activity.amount < 0 ? Colors.red : Colors.green}
            >
              {formatCentsToCurrency(activity.amount)} {activity.currency}
            </ThemedText>
          )}
          <ThemedText
            style={styles.timeAgo}
            darkColor={Colors.dirtyWhite}
            lightColor={Colors.dirtyWhite}
          >
            {formatRelativeTime(activity.date)}
          </ThemedText>
        </View>
      </View>
    ),
    []
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
  const handleFilterPay = useCallback(() => setFilter(ActivityType.Pay), []);
  const handleFilterAuth = useCallback(() => setFilter(ActivityType.Auth), []);

  // Memoized list header and footer components
  const ListHeaderComponent = useMemo(() => <View style={{ height: 16 }} />, []);
  const ListFooterComponent = useMemo(() => <View style={{ height: 24 }} />, []);

  // Memoize list item renderer
  const listItemRenderer = useCallback(
    ({ item }: { item: { title: string; data: Activity[] } }) => (
      <>
        {renderSectionHeader({ section: { title: item.title } })}
        {item.data.map((activity: Activity, index: number) => (
          <React.Fragment key={index}>{renderItem({ activity })}</React.Fragment>
        ))}
      </>
    ),
    [renderItem, renderSectionHeader]
  );

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
            style={[styles.filterChip, filter === ActivityType.Pay && styles.filterChipActive]}
            onPress={handleFilterPay}
          >
            <ThemedText
              type="subtitle"
              style={[
                styles.filterChipText,
                filter === ActivityType.Pay && styles.filterChipTextActive,
              ]}
            >
              Pay
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.filterChip, filter === ActivityType.Auth && styles.filterChipActive]}
            onPress={handleFilterAuth}
          >
            <ThemedText
              type="subtitle"
              style={[
                styles.filterChipText,
                filter === ActivityType.Auth && styles.filterChipTextActive,
              ]}
            >
              Login
            </ThemedText>
          </TouchableOpacity>
        </View>
        <FlatList
          showsVerticalScrollIndicator={false}
          data={listData}
          renderItem={listItemRenderer}
          keyExtractor={(item, index) => index.toString()}
          ListHeaderComponent={ListHeaderComponent}
          ListFooterComponent={ListFooterComponent}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          initialNumToRender={8}
        />
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
  amount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  timeAgo: {
    fontSize: 12,
    marginTop: 4,
  },
  date: {
    marginBottom: 6,
    color: Colors.dirtyWhite,
  },
});

export default ItemList;
