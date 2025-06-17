import type React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Key, BanknoteIcon } from 'lucide-react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Colors } from '@/constants/Colors';
import { ActivityType } from '@/models/Activity';
import { formatRelativeTime } from '@/utils';
import type { ActivityWithDates } from '@/services/database';
import { router } from 'expo-router';
import { useThemeColor } from '@/hooks/useThemeColor';

interface ActivityRowProps {
  activity: ActivityWithDates;
}

export const ActivityRow: React.FC<ActivityRowProps> = ({ activity }) => {
  const handlePress = () => {
    router.push(`/activity/${activity.id}`);
  };

  const cardBackgroundColor = useThemeColor({}, 'cardBackground');
  const iconBackgroundColor = useThemeColor(
    { light: Colors.gray300, dark: Colors.gray700 },
    'background'
  );
  const iconColor = useThemeColor({ light: Colors.gray600, dark: Colors.almostWhite }, 'text');

  const getActivityStatus = (detail: string): 'success' | 'failed' | 'pending' => {
    const lowerDetail = detail.toLowerCase();
    if (lowerDetail.includes('approved') || lowerDetail.includes('success')) {
      return 'success';
    } else if (
      lowerDetail.includes('failed') ||
      lowerDetail.includes('denied') ||
      lowerDetail.includes('error') ||
      lowerDetail.includes('rejected')
    ) {
      return 'failed';
    } else {
      return 'pending';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return Colors.success;
      case 'pending':
        return Colors.warning;
      case 'failed':
        return Colors.error;
      default:
        return Colors.gray;
    }
  };

  const activityStatus = getActivityStatus(activity.detail);
  const statusColor = getStatusColor(activityStatus);

  return (
    <TouchableOpacity
      style={[
        styles.activityCard,
        { borderLeftWidth: 3, borderLeftColor: statusColor, backgroundColor: cardBackgroundColor },
      ]}
      onPress={handlePress}
      activeOpacity={0.7}
    >
      <View style={[styles.iconContainer, { backgroundColor: iconBackgroundColor }]}>
        {activity.type === ActivityType.Auth ? (
          <Key size={20} color={iconColor} />
        ) : (
          <BanknoteIcon size={20} color={iconColor} />
        )}
      </View>
      <View style={styles.activityInfo}>
        <ThemedText type="subtitle" darkColor={Colors.almostWhite} lightColor={Colors.gray900}>
          {activity.service_name}
        </ThemedText>
        <ThemedText
          style={styles.typeText}
          darkColor={Colors.dirtyWhite}
          lightColor={Colors.gray600}
        >
          {activity.type === ActivityType.Auth ? 'Login Request' : 'Payment'}
        </ThemedText>
      </View>
      <View style={styles.activityDetails}>
        {activity.type === ActivityType.Pay && activity.amount !== null && (
          <ThemedText
            style={styles.amount}
            darkColor={Colors.almostWhite}
            lightColor={Colors.gray900}
          >
            {activity.amount} sats
          </ThemedText>
        )}
        <ThemedText
          style={styles.timeAgo}
          darkColor={Colors.dirtyWhite}
          lightColor={Colors.gray600}
        >
          {formatRelativeTime(activity.date)}
        </ThemedText>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  activityCard: {
    flexDirection: 'row',
    borderRadius: 20,
    padding: 14,
    marginBottom: 10,
    minHeight: 72,
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    alignSelf: 'center',
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
