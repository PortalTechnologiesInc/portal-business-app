import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

const ONBOARDING_COMPLETE = 'onboarding_complete';

export default function Home() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Check onboarding status when component mounts
    checkOnboardingStatus();
  }, []);

  async function checkOnboardingStatus() {
    try {
      const status = await SecureStore.getItemAsync(ONBOARDING_COMPLETE);

      if (status !== 'true') {
        // If onboarding is not complete, navigate to onboarding
        router.replace('/onboarding');
        return;
      }

      setInitialized(true);
    } catch (error) {
      console.error('Error checking onboarding status:', error);
      router.replace('/onboarding');
    }
  }

  const resetOnboarding = async () => {
    try {
      await SecureStore.deleteItemAsync(ONBOARDING_COMPLETE);
      router.replace('/onboarding');
    } catch (error) {
      console.error('Error resetting onboarding:', error);
    }
  };

  // Don't render anything until we've checked the onboarding status
  if (!initialized) {
    return null;
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Portal Homepage</ThemedText>
      <ThemedText style={styles.button} onPress={resetOnboarding}>
        Reset onboarding
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  button: {
    fontSize: 16,
    backgroundColor: 'white',
    color: 'black',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    width: '80%',
    textAlign: 'center',
  },
});