import { useEffect, useState } from 'react';
import { Text, View, SafeAreaView, AppState } from 'react-native';
import type { AppStateStatus } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { OnboardingProvider } from '@/context/OnboardingContext';
import { UserProfileProvider } from '@/context/UserProfileContext';
import { PendingRequestsProvider } from '@/context/PendingRequestsContext';
import { ActivitiesProvider } from '@/context/ActivitiesContext';
import { DatabaseProvider } from '@/services/database/DatabaseProvider';
import { StatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/Colors';
import { Asset } from 'expo-asset';
import {
  getMnemonic,
  mnemonicEvents,
  getWalletUrl,
  walletUrlEvents,
} from '@/services/SecureStorageService';
import { Mnemonic } from 'portal-app-lib';
import { getNostrServiceInstance } from '@/services/nostr/NostrService';

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Function to preload images for performance
const preloadImages = async () => {
  try {
    // Preload any local assets needed on startup
    const assetPromises = [
      Asset.loadAsync(require('../assets/images/appLogo.png')),
      // Add any other assets that need to be preloaded here
    ];

    await Promise.all(assetPromises);
    console.log('Assets preloaded successfully');
  } catch (error) {
    console.error('Error preloading assets:', error);
  }
};

export default function RootLayout() {
  const [isReady, setIsReady] = useState(false);
  const [mnemonic, setMnemonic] = useState<string | null>(null);
  const [walletURL, setWalletURL] = useState<string | null>(null);
  const router = useRouter();

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

  // Handle deeplinks
  useEffect(() => {
    // Handle links when app is already running
    const subscription = Linking.addEventListener('url', event => {
      console.log('Received link:', event.url);
      router.push({
        pathname: '/deeplink',
        params: { url: event.url },
      });
    });

    // Check for initial URL that launched the app
    const checkInitialLink = async () => {
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('Initial link:', initialUrl);
        router.push({
          pathname: '/deeplink',
          params: { url: initialUrl },
        });
      }
    };

    checkInitialLink();
    return () => subscription.remove();
  }, [router]);

  // Check for mnemonic and wallet URL existence and log their status
  useEffect(() => {
    const checkSecureStorage = async () => {
      try {
        const mnemonicValue = await getMnemonic();
        setMnemonic(mnemonicValue);

        const walletUrlValue = await getWalletUrl();
        setWalletURL(walletUrlValue || null);
      } catch (error) {
        console.error('SecureStore access failed:', error);
      }
    };

    // Check on initial load
    checkSecureStorage();

    // Also check when app returns to foreground
    const appStateSubscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          console.log('App became active, checking secure storage...');
          checkSecureStorage();
        }
      }
    );

    // Subscribe to mnemonic change events
    const mnemonicSubscription = mnemonicEvents.addListener('mnemonicChanged', newMnemonicValue => {
      console.log('Mnemonic change event received!');
      setMnemonic(newMnemonicValue as string | null);
    });

    // Subscribe to wallet URL change events
    const walletUrlSubscription = walletUrlEvents.addListener('walletUrlChanged', newWalletUrl => {
      console.log('Wallet URL change event received!');
      setWalletURL(newWalletUrl as string | null);
    });

    return () => {
      appStateSubscription.remove();
      mnemonicSubscription.remove();
      walletUrlSubscription.remove();
    };
  }, []);

  // Log whenever mnemonic changes
  useEffect(() => {
    console.log('Mnemonic value:', mnemonic);
    const initializeNostrService = async () => {
      if (mnemonic) {
        console.log('Initializing PortalApp with mnemonic');
        try {
          const mnemonicObj = new Mnemonic(mnemonic);
          const nostrService = getNostrServiceInstance(mnemonicObj);

          // Make sure initialization completes before continuing
          if (!nostrService.isInitialized()) {
            await nostrService.initialize(mnemonicObj);
          }

          // Initialize wallet if wallet URL is available
          if (walletURL) {
            console.log('Connecting to wallet with URL');
            try {
              nostrService.connectNWC(walletURL);
              console.log('Wallet connected successfully');
            } catch (error) {
              console.error('Failed to connect wallet:', error);
            }
          } else {
            console.log('No wallet URL available, skipping wallet connection');
          }

          console.log(
            'NostrService initialized successfully with public key:',
            nostrService.getPublicKey()
          );
        } catch (error) {
          console.error('Failed to initialize NostrService:', error);
        }
      } else {
        console.log('Mnemonic does not exist');
      }
    };

    initializeNostrService();
  }, [mnemonic, walletURL]); // Add walletURL to dependencies to reinitialize if it changes

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
          <DatabaseProvider>
            <ActivitiesProvider>
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
                  <Stack.Screen name="subscription" />
                </Stack>
              </PendingRequestsProvider>
            </ActivitiesProvider>
          </DatabaseProvider>
        </UserProfileProvider>
      </OnboardingProvider>
    </GestureHandlerRootView>
  );
}
