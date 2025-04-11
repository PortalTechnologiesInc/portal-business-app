import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { STORAGE_KEYS, StorageService } from '@/app/utils/storage';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function Layout() {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  useEffect(() => {
    async function checkOnboardingStatus() {
      const onboardingComplete = await StorageService.getData(STORAGE_KEYS.ONBOARDING_COMPLETE);
      setInitialRoute(onboardingComplete ? 'index' : 'onboarding');
      SplashScreen.hideAsync();
    }

    checkOnboardingStatus();
  }, []);

  // Don't render anything until we know which screen to show
  if (!initialRoute) {
    return null;
  }

  return (
    <Stack initialRouteName={initialRoute}>
      <Stack.Screen
        name="onboarding"
        options={{
          headerShown: false
        }}
      />
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
          title: "Home"
        }}
      />
    </Stack>
  );
}