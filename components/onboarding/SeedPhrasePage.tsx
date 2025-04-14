import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

type SeedPhrasePageProps = {
  onFinish: () => void;
  pageWidth: number;
  containerStyles?: any;
  seedPhrase: string[];
};

export function SeedPhrasePage({
  onFinish,
  pageWidth,
  containerStyles,
  seedPhrase
}: SeedPhrasePageProps) {
  return (
    <View style={[styles.pageContainer, { width: pageWidth }, containerStyles]}>
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>Your Seed Phrase</ThemedText>
        <ThemedText style={styles.subtitle}>Write down these 12 words and keep them safe</ThemedText>

        <View style={styles.seedContainer}>
          {seedPhrase.map((word, index) => (
            <View key={index} style={styles.wordContainer}>
              <ThemedText style={styles.wordText}>
                {index + 1}. {word}
              </ThemedText>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={styles.buttonContainer}
          onPress={onFinish}
        >
          <ThemedText style={styles.buttonText}>Finish</ThemedText>
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
  seedContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 40,
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
  buttonContainer: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    width: '100%',
  },
  buttonText: {
    fontSize: 16,
    color: 'black',
    textAlign: 'center',
  },
});