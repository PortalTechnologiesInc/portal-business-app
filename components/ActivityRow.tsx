import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Key, BanknoteIcon } from 'lucide-react-native';
import { ThemedText } from './ThemedText';
import { Colors } from '@/constants/Colors';
import { ActivityType } from '@/models/Activity';
import { formatRelativeTime } from '@/utils';
import type { ActivityWithDates } from '@/services/database';

interface ActivityRowProps {
  activity: ActivityWithDates;
}

export const ActivityRow: React.FC<ActivityRowProps> = ({ activity }) => {
  return (
    <View style={styles.activityCard}>
      <View style={styles.iconContainer}>
        {activity.type === ActivityType.Auth ? (
          <Key size={20} color={Colors.almostWhite} />
        ) : (
          <BanknoteIcon size={20} color={Colors.almostWhite} />
        )}
      </View>
      <View style={styles.activityInfo}>
        <ThemedText type="subtitle" darkColor={Colors.almostWhite} lightColor={Colors.almostWhite}>
          {activity.service_name}
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
        {activity.type === ActivityType.Pay && activity.amount !== null && (
          <ThemedText style={styles.amount} darkColor={Colors.red} lightColor={Colors.red}>
            {activity.amount} sats
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
  );
};

const styles = StyleSheet.create({
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
});
