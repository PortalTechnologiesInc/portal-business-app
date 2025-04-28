import React, { useCallback } from 'react';
import { BottomTabBarButtonProps } from '@react-navigation/bottom-tabs';
import { PlatformPressable } from '@react-navigation/elements';
import * as Haptics from 'expo-haptics';

const HapticTabInner = (props: BottomTabBarButtonProps) => {
  // Memoize the onPressIn handler to prevent recreation on every render
  const handlePressIn = useCallback((ev: any) => {
    // Only trigger haptics on iOS for better performance on Android
    if (process.env.EXPO_OS === 'ios') {
      // Add a soft haptic feedback when pressing down on the tabs.
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    props.onPressIn?.(ev);
  }, [props.onPressIn]);

  return (
    <PlatformPressable
      {...props}
      onPressIn={handlePressIn}
    />
  );
};

// Memoize the component to prevent unnecessary re-renders
export const HapticTab = React.memo(HapticTabInner);
