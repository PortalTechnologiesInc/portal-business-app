import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Image,
  TouchableOpacity,
  TextInput,
  BackHandler,
  ScrollView,
  Alert,
} from 'react-native';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useOnboarding } from '@/context/OnboardingContext';
import { useMnemonic } from '@/context/MnemonicContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { generateMnemonic, Mnemonic } from 'portal-app-lib';

// Preload all required assets
const onboardingLogo = require('../assets/images/appLogo.png');

export default function Onboarding() {
  const { completeOnboarding } = useOnboarding();
  const { setMnemonic } = useMnemonic();
  const [currentPage, setCurrentPage] = useState<'intro' | 'generate' | 'import' | 'splash'>(
    'intro'
  );

  const [seedPhrase, setSeedPhrase] = useState('');

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (currentPage !== 'intro') {
        setCurrentPage('intro');
        return true;
      }
      return false; // Let system handle default behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [currentPage]);

  const handleGenerate = async () => {
    const mnemonic = generateMnemonic().toString();
    setSeedPhrase(mnemonic);

    setCurrentPage('generate');
  };

  const validateImportedMnemonic = (phrase: string): { isValid: boolean; error?: string } => {
    const trimmedPhrase = phrase.trim().toLowerCase();

    if (!trimmedPhrase) {
      return { isValid: false, error: 'Please enter a seed phrase' };
    }

    const words = trimmedPhrase.split(/\s+/);

    if (words.length !== 12) {
      return { isValid: false, error: 'Seed phrase must be exactly 12 words' };
    }

    try {
      // Use portal-app-lib's Mnemonic class for validation
      // If the mnemonic is invalid, the constructor will throw an error
      new Mnemonic(trimmedPhrase);
      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: 'Invalid seed phrase. Please check your words and try again.',
      };
    }
  };

  const handleGenerateComplete = async () => {
    try {
      // Save the mnemonic using our provider
      await setMnemonic(seedPhrase);

      // Show splash screen before completing onboarding
      setCurrentPage('splash');

      // Complete onboarding after a short delay
      setTimeout(() => {
        completeOnboarding();
      }, 2000);
    } catch (error) {
      console.error('Failed to save mnemonic:', error);
      // Still continue with onboarding even if saving fails
      setCurrentPage('splash');
      setTimeout(() => {
        completeOnboarding();
      }, 2000);
    }
  };

  const handleImport = async () => {
    await setSeedPhrase('');

    setCurrentPage('import');
  };

  const handleImportComplete = async () => {
    const validation = validateImportedMnemonic(seedPhrase);

    if (!validation.isValid) {
      Alert.alert(
        'Invalid Seed Phrase',
        validation.error || 'Please check your seed phrase and try again.'
      );
      return;
    }

    try {
      const normalizedPhrase = seedPhrase.trim().toLowerCase();
      await setMnemonic(normalizedPhrase);

      setCurrentPage('splash');
      setTimeout(() => {
        completeOnboarding();
      }, 2000);
    } catch (error) {
      console.error('Failed to save imported mnemonic:', error);
      Alert.alert('Error', 'Failed to save your seed phrase. Please try again.');
    }
  };

  useEffect(() => {
    console.log('seedPhrase', seedPhrase);
  }, [seedPhrase]);

  // Show splash screen when transitioning to home
  if (currentPage === 'splash') {
    return (
      <ThemedView style={[styles.container, styles.splashContainer]}>
        <Image source={onboardingLogo} style={styles.splashLogo} resizeMode="contain" />
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <View style={styles.logoContainer}>
          <Image source={onboardingLogo} style={styles.logo} resizeMode="contain" />
        </View>

        {currentPage === 'intro' && (
          <View style={styles.pageContainer}>
            <ThemedText type="title" style={styles.mainTitle}>
              Your identity in your inventory
            </ThemedText>

            <View style={styles.buttonGroup}>
              <TouchableOpacity style={styles.button} onPress={handleGenerate}>
                <ThemedText style={styles.buttonText}>Generate your private key</ThemedText>
              </TouchableOpacity>

              <TouchableOpacity style={styles.button} onPress={handleImport}>
                <ThemedText style={styles.buttonText}>Import existing seed</ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {currentPage === 'generate' && (
          <ScrollView>
            <ThemedText type="title" style={styles.title}>
              Your Seed Phrase
            </ThemedText>
            <ThemedText style={styles.subtitle}>
              Write down these 12 words and keep them safe
            </ThemedText>

            <View style={styles.seedContainer}>
              {seedPhrase.split(' ').map((word: string, index: number) => (
                <View key={`word-${index}-${word}`} style={styles.wordContainer}>
                  <ThemedText style={styles.wordText}>
                    {index + 1}. {word}
                  </ThemedText>
                </View>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.button, styles.finishButton]}
              onPress={handleGenerateComplete}
            >
              <ThemedText style={styles.buttonText}>Finish</ThemedText>
            </TouchableOpacity>
          </ScrollView>
        )}

        {currentPage === 'import' && (
          <View style={styles.pageContainer}>
            <ThemedText type="title" style={styles.title}>
              Import Seed Phrase
            </ThemedText>
            <ThemedText style={styles.subtitle}>Enter your 12-word seed phrase</ThemedText>

            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Enter your seed phrase separated by spaces"
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={seedPhrase}
                onChangeText={setSeedPhrase}
                multiline
                numberOfLines={4}
                autoCorrect={false}
                autoCapitalize="none"
              />
            </View>

            <TouchableOpacity
              style={[styles.button, styles.finishButton]}
              onPress={handleImportComplete}
            >
              <ThemedText style={styles.buttonText}>Import</ThemedText>
            </TouchableOpacity>
          </View>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
    padding: 20,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  logo: {
    width: '100%',
    height: 100,
  },
  pageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  mainTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 'auto',
    textAlign: 'center',
    marginTop: 'auto',
  },
  mainSubtitle: {
    fontSize: 18,
    marginBottom: 60,
    textAlign: 'center',
    opacity: 0.8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 30,
    textAlign: 'center',
    opacity: 0.7,
  },
  buttonGroup: {
    width: '100%',
    marginTop: 'auto',
    gap: 15,
  },
  button: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    marginVertical: 5,
  },
  buttonText: {
    fontSize: 16,
    color: 'black',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  finishButton: {
    marginTop: 30,
  },
  seedContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 20,
  },
  wordContainer: {
    width: '40%',
    padding: 10,
    margin: 5,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
  },
  wordText: {
    textAlign: 'center',
  },
  inputContainer: {
    width: '100%',
    marginBottom: 20,
  },
  input: {
    width: '100%',
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 8,
    padding: 15,
    color: 'white',
    minHeight: 120,
    textAlignVertical: 'top',
  },
  splashContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  splashLogo: {
    width: '70%',
    height: '30%',
    maxWidth: 300,
  },
});
