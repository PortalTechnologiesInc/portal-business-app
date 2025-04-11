import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { STORAGE_KEYS, StorageService } from '@/app/utils/storage';
import * as SplashScreen from 'expo-splash-screen';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function checkOnboarding() {
      try {
        const onboardingComplete = await StorageService.getData(STORAGE_KEYS.ONBOARDING_COMPLETE);
        const initialRoute = onboardingComplete === true ? '/' : '/onboarding';
        router.replace(initialRoute);
      } catch (e) {
        console.warn('Failed to get onboarding status, defaulting to onboarding:', e);
        router.replace('/onboarding');
      } finally {
        setLoading(false);
        await SplashScreen.hideAsync();
      }
    }

    checkOnboarding();
  }, [router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
    </Stack>
  );
}