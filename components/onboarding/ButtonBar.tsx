import React from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { TouchableOpacity } from 'react-native-gesture-handler';
import { ThemedText } from '@/components/ThemedText';

type ButtonBarProps = {
  currentPage: number;
  onNext: () => void;
  onGenerateKey: () => void;
  onImportSeed: () => void;
  onFinish: () => void;
};

export function ButtonBar({
  currentPage,
  onNext,
  onGenerateKey,
  onImportSeed,
  onFinish
}: ButtonBarProps) {
  return (
    <View style={styles.container}>
      {currentPage === 0 && (
        <Animated.View
          style={styles.buttonWrapper}
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
        >
          <TouchableOpacity style={styles.button} onPress={onNext}>
            <ThemedText style={styles.buttonText}>Next</ThemedText>
          </TouchableOpacity>
        </Animated.View>
      )}

      {currentPage === 1 && (
        <Animated.View
          style={styles.buttonGroupWrapper}
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
        >
          <TouchableOpacity style={styles.button} onPress={onGenerateKey}>
            <ThemedText style={styles.buttonText}>Generate your private key</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={onImportSeed}>
            <ThemedText style={styles.buttonText}>Import existing seed</ThemedText>
          </TouchableOpacity>
        </Animated.View>
      )}

      {currentPage === 2 && (
        <Animated.View
          style={styles.buttonWrapper}
          entering={FadeIn.duration(300)}
          exiting={FadeOut.duration(300)}
        >
          <TouchableOpacity style={styles.button} onPress={onFinish}>
            <ThemedText style={styles.buttonText}>Finish</ThemedText>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    padding: 20,
    marginBottom: 30,
  },
  buttonWrapper: {
    width: '100%',
  },
  buttonGroupWrapper: {
    width: '100%',
    gap: 10,
  },
  button: {
    backgroundColor: 'white',
    padding: 15,
    borderRadius: 8,
    marginVertical: 5,
    width: '100%',
  },
  buttonText: {
    fontSize: 16,
    color: 'black',
    textAlign: 'center',
  },
});