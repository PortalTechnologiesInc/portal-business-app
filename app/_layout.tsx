import { useEffect, useState } from 'react';
import { Text } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { OnboardingProvider } from '@/context/OnboardingContext';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);

  const router = useRouter();

  useEffect(() => {
    // Handle links when app is already running
    const subscription = Linking.addEventListener('url', (event) => {
      const { path, queryParams } = Linking.parse(event.url);
      console.log('Received link:', path, queryParams);

      // Update the navigation line
      if (path) {
        // Cast to any since we're getting dynamic path from deep link
        router.navigate(path as any);

        // Or check for specific routes you know exist:
        if (path === 'onboarding') {
          router.navigate('/onboarding');
        } else if (path === 'login') {
          router.navigate('/'); // Or wherever login should go
        }
      }
    });

    // Check for initial URL that launched the app
    const checkInitialLink = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        const { path, queryParams } = Linking.parse(initialUrl);
        console.log('Initial link:', path, queryParams);
        // Handle the initial link
      }
    };

    checkInitialLink();
    return () => subscription.remove();
  }, [router]);

  useEffect(() => {
    async function prepare() {
      try {
        // Add a deliberate delay to ensure initialization is complete
        await new Promise(resolve => setTimeout(resolve, 500));
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
    <GestureHandlerRootView style={{ flex: 1 }}>
      <OnboardingProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
        </Stack>
      </OnboardingProvider>
    </GestureHandlerRootView>
  );
}