import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useOnboarding } from '@/context/OnboardingContext';
import { Colors } from '@/constants/Colors';
import * as Linking from 'expo-linking';

type RouteType = '/(tabs)' | '/onboarding' | null;

export default function Index() {
  const { isOnboardingComplete, isLoading } = useOnboarding();
  const [initialRoute, setInitialRoute] = useState<RouteType>(null);
  const [isCheckingDeeplink, setIsCheckingDeeplink] = useState(true);
  const [hasDeeplink, setHasDeeplink] = useState(false);

  useEffect(() => {
    const checkForDeeplink = async () => {
      try {
        // Check if app was opened with a deeplink
        const initialUrl = await Linking.getInitialURL();
        
        if (initialUrl) {
          // App was opened with a deeplink, let the deeplink handler manage navigation completely
          console.log('App opened with deeplink, preventing index redirect:', initialUrl);
          setHasDeeplink(true);
          setIsCheckingDeeplink(false);
          return;
        }
        
        // No deeplink, proceed with normal navigation logic
        if (!isLoading) {
          setInitialRoute(isOnboardingComplete ? '/(tabs)' : '/onboarding');
        }
      } catch (error) {
        console.error('Error checking for deeplink:', error);
        // On error, proceed with normal navigation
        if (!isLoading) {
          setInitialRoute(isOnboardingComplete ? '/(tabs)' : '/onboarding');
        }
      } finally {
        setIsCheckingDeeplink(false);
      }
    };

    checkForDeeplink();
  }, [isLoading, isOnboardingComplete]);

  // Show loading while checking for deeplink or determining route
  if (isLoading || isCheckingDeeplink) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: '#000000',
        }}
      >
        <ActivityIndicator size="large" color={Colors.almostWhite} />
      </View>
    );
  }

  // If app was opened with deeplink, don't render any redirect - let deeplink handler take over
  if (hasDeeplink) {
    return null;
  }

  // Only redirect if we determined a route and no deeplink
  if (initialRoute) {
    return <Redirect href={initialRoute} />;
  }

  // Fallback loading state
  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#000000',
      }}
    >
      <ActivityIndicator size="large" color={Colors.almostWhite} />
    </View>
  );
}
