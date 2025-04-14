import React from 'react';
import { View, StyleSheet } from 'react-native';
import { ThemedText } from '@/components/ThemedText';

type IntroPageProps = {
  onNext: () => void;
  pageWidth: number;
  containerStyles?: any;
};

export function IntroPage({ pageWidth, containerStyles }: IntroPageProps) {
  return (
    <View style={[styles.pageContainer, { width: pageWidth }, containerStyles]}>
      <View style={styles.contentContainer}>
        <ThemedText type="title">Portal</ThemedText>
        <ThemedText type="title">Your digital Identity Provider</ThemedText>
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