import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useOnboarding } from '@/app/context/OnboardingContext';

export default function Home() {
  const { isOnboardingComplete, isLoading, resetOnboarding } = useOnboarding();

  useEffect(() => {
    if (!isLoading && !isOnboardingComplete) {
      router.replace('/onboarding');
    }
  }, [isLoading, isOnboardingComplete]);

  // Don't render anything until we've checked the onboarding status
  if (isLoading) {
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