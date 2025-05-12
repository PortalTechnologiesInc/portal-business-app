import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useOnboarding } from '@/context/OnboardingContext';
import { Colors } from '@/constants/Colors';

type RouteType = '/(tabs)' | '/onboarding' | null;

export default function Index() {
  const { isOnboardingComplete, isLoading } = useOnboarding();
  const [initialRoute, setInitialRoute] = useState<RouteType>(null);

  useEffect(() => {
    // Only set the route once we've loaded the onboarding state
    if (!isLoading) {
      setInitialRoute(isOnboardingComplete ? '/(tabs)' : '/onboarding');
    }
  }, [isLoading, isOnboardingComplete]);

  // Show a loading indicator while determining the route
  if (isLoading || initialRoute === null) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#000000' }}>
        <ActivityIndicator size="large" color={Colors.almostWhite} />
      </View>
    );
  }

  // Redirect to the appropriate route once determined
  return <Redirect href={initialRoute} />;
}
