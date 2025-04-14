import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';

type OptionsPageProps = {
  onGenerateKey: () => void;
  onImportSeed: () => void;
  pageWidth: number;
  containerStyles?: any;
};

export function OptionsPage({
  onGenerateKey,
  onImportSeed,
  pageWidth,
  containerStyles
}: OptionsPageProps) {
  return (
    <View style={[styles.pageContainer, { width: pageWidth }, containerStyles]}>
      <View style={styles.contentContainer}>
        <ThemedText type="title" style={styles.headline}>
          Welcome to Portal
        </ThemedText>

        <TouchableOpacity style={styles.buttonContainer} onPress={onGenerateKey}>
          <ThemedText style={styles.buttonText}>Generate your private key</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.buttonContainer} onPress={onImportSeed}>
          <ThemedText style={styles.buttonText}>Import existing seed</ThemedText>
        </TouchableOpacity>
      </View>
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
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  headline: {
    marginBottom: 20,
    textAlign: 'center',
  },
  buttonContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    width: '100%',
  },
  buttonText: {
    fontSize: 16,
    color: 'black',
    textAlign: 'center',
  },
});