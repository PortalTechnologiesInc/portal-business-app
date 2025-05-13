import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

type IntroPageProps = {
  onNext: () => void;
  pageWidth: number;
  containerStyles?: any;
};

export function IntroPage({ pageWidth, containerStyles }: IntroPageProps) {
  return (
    <View style={[styles.pageContainer, { width: pageWidth }, containerStyles]}>
      <ThemedView style={styles.contentContainer}>
        <ThemedText type="title" style={styles.title}>Portal</ThemedText>
        <ThemedText style={styles.subtitle}>Your digital Identity Provider</ThemedText>
        
        <View style={styles.descriptionContainer}>
          <ThemedText style={styles.description}>
            Secure your digital identity with cryptographic keys and take control of your personal data.
          </ThemedText>
          
          <ThemedText style={styles.description}>
            Portal lets you securely authenticate with websites and services without exposing sensitive information.
          </ThemedText>
        </View>
        
        <ThemedText style={styles.instruction}>
          Swipe left to begin
        </ThemedText>
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
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: 20,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    marginBottom: 40,
    textAlign: 'center',
    opacity: 0.8,
  },
  descriptionContainer: {
    marginBottom: 40,
    width: '100%',
    maxWidth: 350,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 20,
    textAlign: 'center',
    opacity: 0.7,
  },
  instruction: {
    fontSize: 16,
    opacity: 0.6,
    fontStyle: 'italic',
  },
});
