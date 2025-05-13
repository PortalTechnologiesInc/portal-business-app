import React, { useState } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

type ImportSeedPhrasePageProps = {
  onImport: (seedPhrase: string) => void;
  pageWidth: number;
  containerStyles?: any;
};

export function ImportSeedPhrasePage({ pageWidth, containerStyles, onImport }: ImportSeedPhrasePageProps) {
  const [seedPhrase, setSeedPhrase] = useState('');

  const handleImport = () => {
    if (seedPhrase.trim()) {
      console.log('Seed phrase imported:', seedPhrase);
      onImport(seedPhrase);
    }
  };

  return (
    <View style={[styles.pageContainer, { width: pageWidth }, containerStyles]}>
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Import Seed Phrase
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Enter your 12-word seed phrase
        </ThemedText>

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

        <TouchableOpacity style={styles.importButton} onPress={handleImport}>
          <ThemedText style={styles.buttonText}>Import</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  title: {
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 30,
    textAlign: 'center',
    opacity: 0.7,
  },
  inputContainer: {
    width: '100%',
    marginBottom: 30,
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
  importButton: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    width: '100%',
  },
  buttonText: {
    fontSize: 16,
    color: 'black',
    textAlign: 'center',
    fontWeight: 'bold',
  },
}); 