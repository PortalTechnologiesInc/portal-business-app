import React from "react";
import { StyleSheet, View } from 'react-native';
import { ThemedText } from "@/components/ThemedText";

interface Step1Props {
  onNext: () => void;
}

export default function Step1({ onNext }: Step1Props) {
  return (
    <View style={styles.container}>
      <View style={styles.contentContainer}>
        <ThemedText type="title">Portal</ThemedText>
        <ThemedText type="title">Your digital Identity Provider</ThemedText>
      </View>

      <ThemedText style={styles.button} onPress={onNext}>
        Next
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    padding: 20,
  },
  contentContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    fontSize: 16,
    backgroundColor: 'white',
    color: 'black',
    padding: 15,
    borderRadius: 8,
    marginBottom: 40,
    width: '100%',
    textAlign: 'center',
  },
});