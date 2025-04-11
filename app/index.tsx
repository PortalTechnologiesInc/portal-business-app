import { GestureResponderEvent, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { router } from 'expo-router';
import { STORAGE_KEYS, StorageService } from './utils/storage';

export default function Home() {

  const resetOnboarding = async () => {
    await StorageService.storeData(STORAGE_KEYS.ONBOARDING_COMPLETE, false);
    router.replace('/onboarding');
  };

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
  },
  button: {
    fontSize: 16,
    backgroundColor: '#000000',
    color: 'white',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    width: '100%',
    textAlign: 'center',
  },
});