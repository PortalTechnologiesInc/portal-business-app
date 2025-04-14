import React, { useEffect } from 'react';
import { StyleSheet, View, Dimensions, Image, TouchableOpacity } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useOnboarding } from '@/context/OnboardingContext';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

export default function SeedPhraseScreen() {
  // Example seed phrase (in reality, you would generate or import this)
  const seedPhrase = ["word1", "word2", "word3", "word4", "word5", "word6",
                      "word7", "word8", "word9", "word10", "word11", "word12"];

  const { completeOnboarding } = useOnboarding();

  // Animation values
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const logoOpacity = useSharedValue(0);

  const performFinishAnimation = () => {
    // First show the logo
    logoOpacity.value = withTiming(1, { duration: 300 });

    // Scale the logo to fill the screen
    scale.value = withTiming(SCREEN_WIDTH / 200 * 2, {
      duration: 800,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1)
    });

    // After 2 seconds, fade out and navigate to home
    setTimeout(() => {
      opacity.value = withTiming(0, {
        duration: 500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1)
      }, (finished) => {
        if (finished) {
          runOnJS(completeOnboarding)();
        }
      });
    }, 2000);
  };

  const logoStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: logoOpacity.value,
    };
  });

  const containerStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
    };
  });

  // Rendering UI
  return (
    <Animated.View style={[styles.container, containerStyle]}>
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
          onPress={performFinishAnimation}
        >
          <ThemedText style={styles.buttonText}>Finish</ThemedText>
        </TouchableOpacity>
      </ThemedView>

      <Animated.View style={[styles.logoOverlay, logoStyle]}>
        <Image
          source={require('../../assets/images/logowhite.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
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
  logoOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  logo: {
    width: 200,
    height: 100,
  },
});