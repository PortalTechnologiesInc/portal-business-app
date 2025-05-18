import { useEffect, useState } from 'react';
import { Text, View, Platform, SafeAreaView, AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import * as SecureStore from 'expo-secure-store';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { PendingRequestsProvider } from '@/context/PendingRequestsContext';
import { UserProfileProvider } from '@/context/UserProfileContext';
import { WalletProvider } from '@/context/WalletContext';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/Colors';
import { Asset } from 'expo-asset';
import { mnemonicEvents } from '@/services/SecureStorageService';
import { PortalApp, Mnemonic, parseAuthInitUrl } from 'portal-app-lib';
import { getNostrServiceInstance } from '@/services/nostr/NostrService';

// Define the mnemonic key constant to match the one in SecureStorageService.ts
const MNEMONIC_KEY = 'portal_mnemonic';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Preload all commonly used images
const preloadImages = async () => {
  const images = [
    require('../assets/images/appLogo.png'),
    require('../assets/images/logoFull.png'),
  ];

  return Asset.loadAsync(images);
};

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [mnemonic, setMnemonic] = useState<string | null>(null);

  const router = useRouter();

  useEffect(() => {
    // Handle links when app is already running
    const subscription = Linking.addEventListener('url', event => {
      const { path, queryParams } = Linking.parse(event.url);
      console.log('Received link:', path, queryParams);

      // Update the navigation line
      if (path) {
        // Cast to any since we're getting dynamic path from deep link
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        // Preload required assets
        await preloadImages();

        // Add a shorter delay to ensure initialization is complete
        await new Promise(resolve => setTimeout(resolve, 300));
        setIsReady(true);
      } catch (error) {
        console.error('Error preparing app:', error);
      } finally {
        await SplashScreen.hideAsync();
      }
    }

    prepare();
  }, []);

  // Check for mnemonic existence and log its status
  useEffect(() => {
    const checkMnemonic = async () => {
      console.log('Checking mnemonic status...');
      const mnemonicValue = await SecureStore.getItemAsync(MNEMONIC_KEY);
      setMnemonic(mnemonicValue);
    };

    // Check on initial load
    checkMnemonic();

    // Also check when app returns to foreground
    const appStateSubscription = AppState.addEventListener('change', (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        console.log('App became active, checking mnemonic...');
        checkMnemonic();
      }
    });

    // Subscribe to mnemonic change events
    const mnemonicSubscription = mnemonicEvents.addListener('mnemonicChanged', (newMnemonicValue) => {
      console.log('Mnemonic change event received!');
      setMnemonic(newMnemonicValue);
    });

    return () => {
      appStateSubscription.remove();
      mnemonicSubscription.remove();
    };
  }, []);

  // Log whenever mnemonic changes
  useEffect(() => {
    const initPortalApp = async () => {
      if (mnemonic) {
        console.log('Initializing PortalApp with mnemonic');
        const mnemonicObj = new Mnemonic(mnemonic);
        getNostrServiceInstance(mnemonicObj)

      } else {
        console.log('Mnemonic does not exist');
      }
    };

    initPortalApp().catch(error => {
      console.error('Error initializing PortalApp:', error);
    });
  }, [mnemonic]);

  if (!isReady) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#000000' }}>
        <StatusBar style="light" />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ color: Colors.almostWhite }}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: '#000000' }}>
      <StatusBar style="light" />
      <OnboardingProvider>
        <UserProfileProvider>
          <WalletProvider>
            <PendingRequestsProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                  contentStyle: {
                    backgroundColor: '#000000',
                  },
                }}
              >
                <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                <Stack.Screen name="index" />
                <Stack.Screen name="onboarding" />
                <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
                <Stack.Screen name="wallet" options={{ presentation: 'modal' }} />
                <Stack.Screen name="qr" options={{ presentation: 'fullScreenModal' }} />
                <Stack.Screen name="qr/wallet" options={{ presentation: 'fullScreenModal' }} />
              </Stack>
            </PendingRequestsProvider>
          </WalletProvider>
        </UserProfileProvider>
      </OnboardingProvider>
    </GestureHandlerRootView>
  );
}
