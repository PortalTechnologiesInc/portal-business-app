import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Stack } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import * as SplashScreen from 'expo-splash-screen';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const ONBOARDING_COMPLETE = 'onboarding_complete';

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    async function prepare() {
      try {
        // Add a deliberate delay to ensure SecureStore is ready
        await new Promise(resolve => setTimeout(resolve, 500));

        // Just initialize the app - navigation happens in the screens
        setIsReady(true);
      } catch (error) {
        console.error('Error preparing app:', error);
      } finally {
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  if (!isReady) {
    return <Text>Loading...</Text>;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}