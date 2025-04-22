import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from './ThemedText';
import Feather from '@expo/vector-icons/Feather';
import { Activity, ActivityType } from './../models/Activity'
import { getMockedActivities } from '@/mocks/Activities';
import { formatCentsToCurrency } from '@/utils';

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
            <Feather name="unlock" size={24} color="white" />
          ) : (
            <Feather name="dollar-sign" size={24} color="white" />
          )}
        </View>
        <View style={styles.itemTextContainer}>
          <ThemedText type="subtitle">{activity.name}</ThemedText>
          <ThemedText>{activity.detail}</ThemedText>
        </View>
        {activity.type === ActivityType.Pay ? (
          <>
            {
              activity.amount < 0 ? (
                <ThemedText lightColor='#b12729' darkColor='#b12729' type='defaultSemiBold'>{formatCentsToCurrency(activity.amount)+activity.currency}</ThemedText>
              ) : (
                <ThemedText lightColor='#007f4e' darkColor='#007f4e' type='defaultSemiBold'>{formatCentsToCurrency(activity.amount)+activity.currency}</ThemedText>
              )
            }
          </>
        ) : (
          <ThemedText lightColor='gray' darkColor='gray' type='defaultSemiBold'>{"Auth"}</ThemedText>
        )}
      </View>
    </View>
  );

  const renderSectionHeader = ({ section: { title } }: { section: { title: string } }) => (
    <ThemedText style={styles.sectionHeader}>{title}</ThemedText>
  );

  return (
    <View style={styles.container}>
      <View style={styles.filterContainer}>
        <ThemedText type="subtitle">Filter: </ThemedText>
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
      />
    </View>
  );
};


const styles = StyleSheet.create({
  container: {
    width: '100%', // Make items take up full width
    flex: 1,
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
    marginRight: 16
  },
  itemCard: {
    backgroundColor: '#333',
    padding: 8,
    margin: 8,
    borderRadius: 8,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    padding: 8,
  },
  date: {
    color: '#999',
  },
  filterChipActive: {
    backgroundColor: '#ddd',
  },
  filterChipText: {
    color: '#333', // Darker text color
  },
  filterChipTextActive: {
    color: 'black', // Darkest text color for active chip
  },
  filterChip: {
    padding: 4,
    margin: 4,
    borderRadius: 8,
  },
  filterContainer: {
    flexDirection: 'row',
    padding: 4,
    alignItems: "center"
  },
});

export default ItemList;
