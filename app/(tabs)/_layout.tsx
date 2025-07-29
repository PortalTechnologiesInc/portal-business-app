import React, { useMemo } from 'react';
import { Tabs } from 'expo-router';
import { Calculator, Ticket, Settings, Workflow } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { View, Platform, ToastAndroid } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { HapticTab } from '@/components/HapticTab';
import { useThemeColor } from '@/hooks/useThemeColor';

// Memoized tab icons to prevent unnecessary re-rendering
const KeypadIcon = React.memo(({ color }: { color: string }) => (
  <Calculator size={24} color={color} />
));

const TicketIcon = React.memo(({ color }: { color: string }) => <Ticket size={24} color={color} />);

const AutomationIcon = React.memo(({ color }: { color: string }) => (
  <Workflow size={24} color={color} />
));

const SettingsIcon = React.memo(({ color }: { color: string }) => (
  <Settings size={24} color={color} />
));

// Memoized tab bar background to prevent unnecessary re-rendering
const TabBarBackground = React.memo(() => {
  const backgroundColor = useThemeColor({}, 'background');
  return (
    <View
      style={{
        backgroundColor,
        height: '100%',
        width: '100%',
        position: 'absolute',
      }}
    />
  );
});

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const tabBarBackgroundColor = useThemeColor({}, 'background');
  const tabBarActiveTintColor = useThemeColor(
    { light: Colors.primary, dark: Colors.almostWhite },
    'text'
  );
  const tabBarInactiveTintColor = useThemeColor(
    { light: Colors.gray600, dark: Colors.unselectedGray },
    'text'
  );

  // Memoize tab options to prevent recreation on every render
  const screenOptions = useMemo(
    () => ({
      tabBarActiveTintColor,
      tabBarInactiveTintColor,
      headerShown: false,
      tabBarStyle: {
        paddingTop: 16,
        alignItems: 'center' as const,
        backgroundColor: tabBarBackgroundColor,
        height: Platform.OS === 'ios' ? 80 : 70,
        borderTopWidth: 0,
        paddingBottom: Platform.OS === 'ios' ? insets.bottom : 16,
        shadowColor: 'transparent',
        elevation: 0,
      },
      tabBarBackground: () => <TabBarBackground />,
      tabBarHideOnKeyboard: true,
      tabBarButton: (props: any) => <HapticTab {...props} />,
      // Preload adjacent tabs for smoother navigation
      lazy: false,
      // Optimize tab transition animation
      animationEnabled: true,
      // Preventing excessive re-renders
      freezeOnBlur: false,
      // Use hardware acceleration where possible
      detachInactiveScreens: false,
    }),
    [insets.bottom, tabBarBackgroundColor, tabBarActiveTintColor, tabBarInactiveTintColor]
  );

  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Keypad',
          tabBarIcon: ({ color }) => <KeypadIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="Tickets"
        options={{
          title: 'Tickets',
          tabBarIcon: ({ color }) => <TicketIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="Automation"
        options={{
          title: 'Automation',
          tabBarIcon: ({ color }) => <AutomationIcon color={color} />,
        }}
      />
      <Tabs.Screen
        name="Settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => <SettingsIcon color={color} />,
        }}
      />
      {/* Hide all other screens from tab bar */}
      <Tabs.Screen
        name="Keypad"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="OldTickets"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="ActivityList"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="Certificates"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="IdentityList"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="Subscriptions"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
