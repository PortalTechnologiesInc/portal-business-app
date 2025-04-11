import { StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { StorageService, STORAGE_KEYS } from '@/app/utils/storage';

export default function Step2() {
  const handleGenerateKey = async () => {
    // Will handle key generation later
    await StorageService.storeData(STORAGE_KEYS.ONBOARDING_COMPLETE, true);
    router.replace('/');
  };

  const handleImportSeed = async () => {
    // Will handle seed import later
    await StorageService.storeData(STORAGE_KEYS.ONBOARDING_COMPLETE, true);
    router.replace('/');
  };

  return (
    <ThemedView style={styles.container}>

      <View style={styles.contentContainer}>
        <ThemedText type="title" style={styles.headline}>
          Welcome to Portal
        </ThemedText>

        <ThemedText style={styles.button} onPress={handleGenerateKey}>
          Generate your private key
        </ThemedText>

        <ThemedText style={styles.button} onPress={handleImportSeed}>
          Import existing seed
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  logo: {
    marginTop: 200,
    width: 250,
    height: 200,
  },
  logoContainer: {
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  headline: {
    marginBottom: 40,
    textAlign: 'center',
  },
  button: {
    fontSize: 16,
    backgroundColor: 'white',
    color: 'black',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    width: '100%',
    textAlign: 'center',
  },
});