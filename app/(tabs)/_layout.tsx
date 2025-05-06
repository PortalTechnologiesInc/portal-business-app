import React, { useMemo } from 'react';
import { Tabs } from 'expo-router';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { Colors } from '@/constants/Colors';
import { View, Platform, ToastAndroid } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticTab } from '@/components/HapticTab';

// Memoized tab icons to prevent unnecessary re-rendering
const HomeIcon = React.memo(({ color }: { color: string }) => (
  <FontAwesome6 name="house-chimney-user" size={24} color={color} />
));

const ActivityIcon = React.memo(({ color }: { color: string }) => (
  <FontAwesome6 name="list" size={24} color={color} />
));

const SubscriptionIcon = React.memo(({ color }: { color: string }) => (
  <FontAwesome6 name="receipt" size={24} color={color} />
));

const CertificateIcon = React.memo(({ color }: { color: string }) => (
  <FontAwesome6 name="certificate" size={24} color={color} />
));

const IdentityIcon = React.memo(({ color }: { color: string }) => (
  <FontAwesome6 name="id-card" size={24} color={color} />
));

// Memoized tab bar background to prevent unnecessary re-rendering
const TabBarBackground = React.memo(() => (
  <View
    style={{
      backgroundColor: '#000000',
      height: '100%',
      width: '100%',
      position: 'absolute',
    }}
  />
));

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  // Memoize tab options to prevent recreation on every render
  const screenOptions = useMemo(
    () => ({
      tabBarActiveTintColor: Colors.almostWhite,
      tabBarInactiveTintColor: Colors.unselectedGray,
      headerShown: false,
      tabBarStyle: {
        paddingTop: 16,
        alignItems: 'center' as const,
        backgroundColor: '#000',
        height: Platform.OS === 'ios' ? 80 : 70,
        borderTopWidth: 0,
        paddingBottom: Platform.OS === 'ios' ? insets.bottom : 16,
        shadowColor: 'transparent',
        elevation: 0,
      },
      tabBarBackground: () => <TabBarBackground />,
      tabBarHideOnKeyboard: true,
      tabBarButton: (props: any) => <HapticTab {...props} />,
      // Improve performance by not mounting screens until they are viewed
      lazy: true,
      // Faster tab transitions
      animationEnabled: true,
    }),
    [insets.bottom]
  );

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <HomeIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="ActivityList"
        options={{
          title: 'Activities',
          tabBarIcon: ({ color }) => <ActivityIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="Subscriptions"
        options={{
          title: 'Subscriptions',
          tabBarIcon: ({ color }) => <SubscriptionIcon color={color} />,
        }}
      />
      {/* remove listeners to enable buttons*/}
      <Tabs.Screen
        name="Certificates"
        listeners={{
          tabPress: e => {
            e.preventDefault(); // <-- this function bl<-- this function blocks 
            ToastAndroid.showWithGravity(
              'Coming soon!',
              ToastAndroid.SHORT,
              ToastAndroid.CENTER,
            );
          },
        }}
        options={{
          title: 'Certificates',
          tabBarIcon: ({ color }) => <CertificateIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="IdentityList"
        options={{
          title: 'Identities',
          tabBarIcon: ({ color }) => <IdentityIcon color={color} />,
        }}
      />
    </Tabs>
  );
}
