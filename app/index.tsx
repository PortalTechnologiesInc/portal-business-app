import { GestureResponderEvent, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { router } from 'expo-router';

export default function Home() {
  function handleGenerateKey(event: GestureResponderEvent): void {
    router.replace('/screens/onboarding/Step1');
  }

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title">Portal Homepage</ThemedText>
      <ThemedText style={styles.button} onPress={handleGenerateKey}>
        back to onboarding
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    fontSize: 16,
    backgroundColor: '#0a7ea4',
    color: 'white',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    width: '100%',
    textAlign: 'center',
  },
});