import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { FontAwesome6 } from '@expo/vector-icons';
import { Share } from 'lucide-react-native';
import { ThemedText } from '@/components/ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';

interface ActivityHeaderProps {
  isAuth: boolean;
  onBackPress: () => void;
  onShare: () => void;
}

export const ActivityHeader: React.FC<ActivityHeaderProps> = ({
  isAuth,
  onBackPress,
  onShare,
}) => {
  const primaryTextColor = useThemeColor({}, 'textPrimary');

  return (
    <View style={styles.header}>
      <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
        <FontAwesome6 name="arrow-left" size={20} color={primaryTextColor} />
      </TouchableOpacity>
      <ThemedText type="title" style={[styles.title, { color: primaryTextColor }]}>
        {isAuth ? 'Login Details' : 'Payment Details'}
      </ThemedText>
      <View style={styles.headerActions}>
        <TouchableOpacity onPress={onShare} style={styles.headerButton}>
          <Share size={20} color={primaryTextColor} />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerActions: {
    flexDirection: 'row',
  },
  headerButton: {
    padding: 8,
  },
}); 