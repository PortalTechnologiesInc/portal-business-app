import { Stack } from 'expo-router';
import { Colors } from '@/constants/Colors';

export default function SubscriptionLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.darkerGray },
        animation: 'slide_from_right',
      }}
    />
  );
} 