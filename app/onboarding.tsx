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
import { ThemedText } from '@/components/ThemedText';
import { useOnboarding } from '@/context/OnboardingContext';
import { IntroPage } from '@/components/onboarding/IntroPage';
import { OptionsPage } from '@/components/onboarding/OptionsPage';
import { SeedPhrasePage } from '@/components/onboarding/SeedPhrasePage';
import { ButtonBar } from '@/components/onboarding/ButtonBar';
import { Asset } from 'expo-asset';
import * as SplashScreen from 'expo-splash-screen';
import { SafeAreaView } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Preload all required assets
const onboardingLogo = require('../assets/images/logoFull.png');

export default function Onboarding() {
  const { completeOnboarding } = useOnboarding();
  const [currentPage, setCurrentPage] = useState(0);
  const [seedPhrase, setSeedPhrase] = useState<string[]>([]);
  const [assetsLoaded, setAssetsLoaded] = useState(false);
  const translateX = useSharedValue(0);
  const contentOpacity = useSharedValue(1);
  const buttonsOpacity = useSharedValue(1);

  const { width: SCREEN_WIDTH } = Dimensions.get('window');

  // Preload assets when component mounts
  useEffect(() => {
    async function loadAssets() {
      try {
        // Preload the logo image
        await Asset.loadAsync([onboardingLogo]);
      } catch (error) {
        console.error('Error preloading assets:', error);
      } finally {
        setAssetsLoaded(true);
      }
    }

    loadAssets();
  }, []);

  // Initialize seed phrase once
  useEffect(() => {
    // In a real app, this would be generated or imported
    setSeedPhrase([
      'word1',
      'word2',
      'word3',
      'word4',
      'word5',
      'word6',
      'word7',
      'word8',
      'word9',
      'word10',
      'word11',
      'word12',
    ]);
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
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });

      setCurrentPage(currentPage + 1);
    }
  };

  const goToPrevPage = () => {
    if (currentPage > 0) {
      translateX.value = withTiming(-SCREEN_WIDTH * (currentPage - 1), {
        duration: 400,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      });

      setCurrentPage(currentPage - 1);
    }
  };

  const performFinishAnimation = () => {
    // Fade out content
    contentOpacity.value = withTiming(0, {
      duration: 400,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    buttonsOpacity.value = withTiming(0, {
      duration: 400,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
    });

    // After 500ms, navigate to home
    setTimeout(() => {
      completeOnboarding();
    }, 500);
  };

  // Create pan gesture handler
  const panGesture = Gesture.Pan()
    .onUpdate(e => {
      // Calculate the destination page based on current page and swipe direction
      const newX = -SCREEN_WIDTH * currentPage + e.translationX;

      // Only allow panning within bounds (between first and last page)
      if (newX <= 0 && newX >= -SCREEN_WIDTH * 2) {
        translateX.value = newX;
      }
    })
    .onEnd(e => {
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

  const pagesStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      width: SCREEN_WIDTH * 3,
      flexDirection: 'row',
    };
  });

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }));

  const buttonsStyle = useAnimatedStyle(() => ({
    opacity: buttonsOpacity.value,
  }));

  // Show loading view while assets are being loaded
  if (!assetsLoaded) {
    return (
      <ThemedView style={[styles.container, styles.loadingContainer]}>
        <ThemedText>Loading...</ThemedText>
      </ThemedView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <View style={styles.logoContainer}>
          <Image
            source={onboardingLogo}
            style={styles.logo}
            resizeMode="contain"
          />
        </View>

        <GestureDetector gesture={panGesture}>
          <Animated.View style={[styles.pagesContainer, contentStyle]}>
            <Animated.View style={[styles.pagesWrapper, pagesStyle]}>
              {/* Page 1: Intro */}
              <IntroPage onNext={goToNextPage} pageWidth={SCREEN_WIDTH} />

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
          </Animated.View>
        </GestureDetector>
        <Animated.View style={buttonsStyle}>
          <ButtonBar
            currentPage={currentPage}
            onNext={goToNextPage}
            onGenerateKey={goToNextPage}
            onImportSeed={completeOnboarding}
            onFinish={performFinishAnimation}
          />
        </Animated.View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
    paddingHorizontal: 20,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 40,
  },
  logo: {
    width: 200,
    height: 80,
  },
  pagesContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  pagesWrapper: {
    flex: 1,
    flexDirection: 'row',
  },
});
