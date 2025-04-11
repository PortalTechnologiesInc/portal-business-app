import React from "react";
import { StyleSheet, View } from 'react-native';
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";

interface Step2Props {
  onGenerateKey: () => void;
  onImportSeed: () => void;
}

export default function Step2({ onGenerateKey, onImportSeed }: Step2Props) {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.contentContainer}>
        <ThemedText type="title" style={styles.headline}>
          Welcome to Portal
        </ThemedText>

        <ThemedText style={styles.button} onPress={onGenerateKey}>
          Generate your private key
        </ThemedText>

        <ThemedText style={styles.button} onPress={onImportSeed}>
          Import existing seed
        </ThemedText>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
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