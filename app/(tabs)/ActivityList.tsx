import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '../../components/ThemedText';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { Activity, ActivityType } from '../../models/Activity'
import { getMockedActivities } from '@/mocks/Activities';
import { formatCentsToCurrency } from '@/utils';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import Feather from '@expo/vector-icons/Feather';

const ItemList: React.FC = () => {
  const [items, setItems] = useState<Activity[]>([]);
  const [filter, setFilter] = useState<ActivityType | null>(null);

  const filteredItems = filter === null
    ? items
    : items.filter(item => item.type === filter);

  const groupedItems = filteredItems.reduce((acc, item) => {
    const dateString = item.date.toDateString();
    if (!acc[dateString]) {
      acc[dateString] = [];
    }
    acc[dateString].push(item);
    return acc;
  }, {} as Record<string, Activity[]>);

  useEffect(() => {
    setItems(getMockedActivities())
  }, []);

  const renderItem = ({ activity: activity }: { activity: Activity }) => (
    <View style={styles.itemCard}>
      <View style={styles.itemContainer}>
        <View style={styles.itemIconContainer}>
          {activity.type === ActivityType.Auth ? (
            <FontAwesome6 name="unlock-keyhole" size={24} color={Colors.almostWhite} />
          ) : (
            <FontAwesome6 name="dollar-sign" size={24} color={Colors.almostWhite} />
          )}
        </View>
        <View style={styles.itemTextContainer}>
          <ThemedText type="subtitle" darkColor={Colors.almostWhite} lightColor={Colors.almostWhite}>{activity.name}</ThemedText>
          <ThemedText darkColor={Colors.dirtyWhite} lightColor={Colors.dirtyWhite}>{activity.detail}</ThemedText>
        </View>
        {activity.type === ActivityType.Pay ? (
          <>
            {
              activity.amount < 0 ? (
                <>
                  <Feather name="arrow-up-left" size={16} color={Colors.dirtyWhite} />
                  <ThemedText lightColor={Colors.red} darkColor={Colors.red} type='defaultSemiBold'>{formatCentsToCurrency(activity.amount) + activity.currency}</ThemedText>
                </>
              ) : (
                <>
                  <Feather name="arrow-down-right" size={16} color={Colors.dirtyWhite} />
                  <ThemedText lightColor={Colors.green} darkColor={Colors.green} type='defaultSemiBold'>{formatCentsToCurrency(activity.amount) + activity.currency}</ThemedText>
                </>
              )
            }
          </>
        ) : (
          <ThemedText lightColor={Colors.dirtyWhite} darkColor={Colors.dirtyWhite} type='defaultSemiBold'>{"Auth"}</ThemedText>
        )}
      </View>
    </View>
  );

  const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
    <ThemedText style={styles.sectionHeader}>{title}</ThemedText>
  );

  return (
    <ThemedView lightColor={Colors.darkerGray} darkColor={Colors.darkerGray} style={styles.container}>
      <ThemedText type="title">Your activities</ThemedText>
      <View style={styles.filterContainer}>
        <TouchableOpacity
          style={[styles.filterChip, filter === null && styles.filterChipActive]}
          onPress={() => setFilter(null)}
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
          onPress={() => setFilter(ActivityType.Pay)}
        >
          <ThemedText
            type="subtitle"
            style={[styles.filterChipText, filter === ActivityType.Pay && styles.filterChipTextActive]}
          >
            Pay
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterChip, filter === ActivityType.Auth && styles.filterChipActive]}
          onPress={() => setFilter(ActivityType.Auth)}
        >
          <ThemedText
            type="subtitle"
            style={[styles.filterChipText, filter === ActivityType.Auth && styles.filterChipTextActive]}
          >
            Auth
          </ThemedText>
        </TouchableOpacity>
      </View>
      <FlatList
        showsVerticalScrollIndicator={false}
        data={Object.entries(groupedItems).map(([title, data]) => ({ title, data }))}
        renderItem={({ item }) => (
          <>
            {renderSectionHeader({ section: { title: item.title } })}
            {item.data.map((item, index) => (
              <React.Fragment key={index}>
                {renderItem({ activity: item })}
              </React.Fragment>
            ))}
          </>
        )}
        keyExtractor={(item, index) => index.toString()}
        ListFooterComponent={<View style={{ height: 20 }}></View>}
      />
    </ThemedView>
  );
};


const styles = StyleSheet.create({
  container: {
    width: '100%', // Make items take up full width
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  filterContainer: {
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: "center"
  },
  filterChipActive: {
    backgroundColor: Colors.dirtyWhite,
  },
  filterChipText: {
    color: Colors.darkerGray, // Darker text color
  },
  filterChipTextActive: {
    color: Colors.darkGray, // Darkest text color for active chip
  },
  filterChip: {
    backgroundColor: Colors.darkGray,
    paddingVertical: 4,
    paddingHorizontal: 16,
    marginEnd: 8,
    borderRadius: 8,
  },
  itemContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  itemTextContainer: {
    flex: 1,
  },
  itemIconContainer: {
    marginHorizontal: 16
  },
  itemCard: {
    backgroundColor: Colors.darkGray,
    padding: 8,
    marginVertical: 8,
    borderRadius: 8,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  date: {
    color: Colors.dirtyWhite,
  },
});

export default ItemList;
