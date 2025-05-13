import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

type SeedPhrasePageProps = {
  onFinish: () => void;
  pageWidth: number;
  containerStyles?: any;
  seedPhrase: string[];
};

export function SeedPhrasePage({ pageWidth, containerStyles, seedPhrase }: SeedPhrasePageProps) {
  return (
    <View style={[styles.pageContainer, { width: pageWidth }, containerStyles]}>
      <ThemedView style={styles.content}>
        <ThemedText type="title" style={styles.title}>
          Your Seed Phrase
        </ThemedText>
        <ThemedText style={styles.subtitle}>
          Write down these 12 words and keep them safe
        </ThemedText>

        <View style={styles.seedContainer}>
          {seedPhrase.map((word, index) => (
            <View key={index} style={styles.wordContainer}>
              <ThemedText style={styles.wordText}>
                {index + 1}. {word}
              </ThemedText>
            </View>
          ))}
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
  content: {
    flex: 1,
    padding: 16,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  title: {
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.7,
  },
  seedContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: 32,
  },
  wordContainer: {
    width: '40%',
    padding: 8,
    margin: 4,
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
