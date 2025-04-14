import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Dimensions, Image, BackHandler } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ThemedView } from '@/components/ThemedView';
import { useOnboarding } from '@/context/OnboardingContext';
import { IntroPage } from '@/components/onboarding/IntroPage';
import { OptionsPage } from '@/components/onboarding/OptionsPage';
import { SeedPhrasePage } from '@/components/onboarding/SeedPhrasePage';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function Onboarding() {
  const { completeOnboarding } = useOnboarding();
  const [currentPage, setCurrentPage] = useState(0);
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const rotateValue = useSharedValue(0);
  const translateX = useSharedValue(0);
  const scale = useSharedValue(1);
  const logoOpacity = useSharedValue(1);

  // Initialize seed phrase once
  useEffect(() => {
    // In a real app, this would be generated or imported
    setSeedPhrase(["word1", "word2", "word3", "word4", "word5", "word6",
                   "word7", "word8", "word9", "word10", "word11", "word12"]);
  }, []);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (currentPage > 0) {
        goToPrevPage();
        return true; // Prevent default behavior
      }
      return false; // Let system handle default behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [currentPage]);

  const goToNextPage = () => {
    if (currentPage < 2) {
      translateX.value = withTiming(-SCREEN_WIDTH * (currentPage + 1), {
        duration: 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1)
      });

      // Only rotate the logo for the first two pages
      if (currentPage < 1) {
        rotateValue.value = withTiming((currentPage + 1) * 180, {
          duration: 800,
          easing: Easing.bezier(0.25, 0.1, 0.25, 1)
        });
      }

      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      translateX.value = withTiming(-SCREEN_WIDTH * (currentPage - 1), {
        duration: 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1)
      });

      rotateValue.value = withTiming((currentPage - 1) * 180, {
        duration: 800,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1)
      });

      setCurrentPage(currentPage - 1);
    }
  };

  const performFinishAnimation = () => {
    // Scale the logo to fill the screen
    scale.value = withTiming(SCREEN_WIDTH / 200 * 2, {
      duration: 800,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1)
    });

    // After 2 seconds, fade out and navigate to home
    setTimeout(() => {
      logoOpacity.value = withTiming(0, {
        duration: 500,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1)
      }, (finished) => {
        if (finished) {
          runOnJS(completeOnboarding)();
        }
      });
    }, 2000);
  };

  // Create pan gesture handler
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      // Calculate the destination page based on current page and swipe direction
      const newX = -SCREEN_WIDTH * currentPage + e.translationX;

      // Only allow panning within bounds (between first and last page)
      if (newX <= 0 && newX >= -SCREEN_WIDTH * 2) {
        translateX.value = newX;
      }
    })
    .onEnd((e) => {
      if (e.translationX < -SCREEN_WIDTH / 3 && currentPage < 2) {
        // Swipe left
        runOnJS(goToNextPage)();
      } else if (e.translationX > SCREEN_WIDTH / 3 && currentPage > 0) {
        // Swipe right
        runOnJS(goToPrevPage)();
      } else {
        // Snap back to current page
        translateX.value = withTiming(-SCREEN_WIDTH * currentPage, { duration: 300 });
      }
    });

  const logoStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { rotate: `${rotateValue.value}deg` },
        { scale: scale.value }
      ],
      opacity: logoOpacity.value,
    };
  });

  const pagesStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      width: SCREEN_WIDTH * 3,
      flexDirection: 'row',
    };
  });

  return (
    <ThemedView style={styles.container}>
      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <Image
          source={require('../assets/images/logowhite.png')}
          style={{width: 200, height: 100}}
          resizeMode="contain"
        />
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <View style={styles.pagesContainer}>
          <Animated.View style={[styles.pagesWrapper, pagesStyle]}>
            {/* Page 1: Intro */}
            <IntroPage
              onNext={goToNextPage}
              pageWidth={SCREEN_WIDTH}
            />

            {/* Page 2: Options */}
            <OptionsPage
              onGenerateKey={goToNextPage}
              onImportSeed={completeOnboarding}
              pageWidth={SCREEN_WIDTH}
            />

            {/* Page 3: Seed Phrase */}
            <SeedPhrasePage
              onFinish={performFinishAnimation}
              pageWidth={SCREEN_WIDTH}
              seedPhrase={seedPhrase}
            />
          </Animated.View>
        </View>
      </GestureDetector>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  logoContainer: {
    position: 'relative',
    zIndex: 10,
    top: 150,
    alignSelf: 'center',
  },
  pagesContainer: {
    flex: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  pagesWrapper: {
    flex: 1,
    flexDirection: 'row',
    height: '100%',
  },
});