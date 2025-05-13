import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

type OptionsPageProps = {
  onGenerateKey: () => void;
  onImportSeed: () => void;
  pageWidth: number;
  containerStyles?: any;
};

export function OptionsPage({ pageWidth, containerStyles, onGenerateKey, onImportSeed }: OptionsPageProps) {
  return (
    <View style={[styles.pageContainer, { width: pageWidth }, containerStyles]}>
      <ThemedView style={styles.contentContainer}>
        <ThemedText type="title" style={styles.headline}>
          Welcome to Portal
        </ThemedText>
        
        <ThemedText style={styles.description}>
          Your secure digital identity provider that puts you in control of your personal data.
        </ThemedText>
        
        <ThemedText style={styles.description}>
          Get started by generating a new private key or importing an existing one.
        </ThemedText>
        
        <View style={styles.buttonGroup}>
          <TouchableOpacity style={styles.buttonContainer} onPress={onGenerateKey}>
            <ThemedText style={styles.buttonText}>Generate your private key</ThemedText>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.buttonContainer} onPress={onImportSeed}>
            <ThemedText style={styles.buttonText}>Import existing seed</ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    </View>
  );
}

const styles = StyleSheet.create({
  pageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: 16,
  },
  headline: {
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 28,
  },
  description: {
    textAlign: 'center',
    marginBottom: 12,
    fontSize: 16,
    lineHeight: 24,
    opacity: 0.8,
    maxWidth: '90%',
  },
  buttonGroup: {
    width: '100%',
    marginTop: 24,
    gap: 12,
  },
  buttonContainer: {
    backgroundColor: 'white',
    padding: 12,
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
