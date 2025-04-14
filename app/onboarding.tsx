import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Dimensions, Image, TouchableOpacity, BackHandler } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
  runOnJS,
} from 'react-native-reanimated';
import { router } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';
import { useOnboarding } from '@/context/OnboardingContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function Onboarding() {
  const { completeOnboarding } = useOnboarding();
  const [currentPage, setCurrentPage] = useState(0);
  const rotateValue = useSharedValue(0);
  const translateX = useSharedValue(0);

  // Handle Android back button
  useEffect(() => {
    const backAction = () => {
      if (currentPage === 1) {
        goToPrevPage();
        return true; // Prevent default behavior
      }
      return false; // Let system handle default behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [currentPage]);

  const goToNextPage = () => {
    rotateValue.value = withTiming(180, {
      duration: 800,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1)
    });
    translateX.value = withTiming(-SCREEN_WIDTH, {
      duration: 400,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1)
    });
    setCurrentPage(1);
  };

  const goToPrevPage = () => {
    rotateValue.value = withTiming(0, {
      duration: 800,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1)
    });
    translateX.value = withTiming(0, {
      duration: 400,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1)
    });
    setCurrentPage(0);
  };

  // Create pan gesture handler for both next and previous swiping
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      if (currentPage === 0) {
        // When on first page, ONLY allow negative translations (left swipes)
        // Prevent any positive translation (right swipe) since there's no previous page
        translateX.value = e.translationX <= 0 ? e.translationX : 0;
      } else if (currentPage === 1) {
        // When on second page, ONLY allow positive translations (right swipes)
        // Prevent any negative translation (left swipe) since there's no next page
        const newTranslation = -SCREEN_WIDTH + e.translationX;
        translateX.value = newTranslation >= -SCREEN_WIDTH ? newTranslation : -SCREEN_WIDTH;
      }
    })
    .onEnd((e) => {
      // Going to next page (swiping left on first page)
      if (currentPage === 0 && e.translationX < -SCREEN_WIDTH / 3) {
        runOnJS(goToNextPage)();
      }
      // Going to previous page (swiping right on second page)
      else if (currentPage === 1 && e.translationX > SCREEN_WIDTH / 3) {
        runOnJS(goToPrevPage)();
      }
      // Snap back to current page
      else {
        translateX.value = withTiming(
          currentPage === 0 ? 0 : -SCREEN_WIDTH,
          { duration: 300 }
        );
      }
    });

  const logoStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotateValue.value}deg` }],
    };
  });

  const pagesStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      width: SCREEN_WIDTH * 2,
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
            {/* Page 1 */}
            <View style={[styles.pageContainer, { width: SCREEN_WIDTH }]}>
              <View style={styles.contentContainer}>
                <ThemedText type="title">Portal</ThemedText>
                <ThemedText type="title">Your digital Identity Provider</ThemedText>
              </View>

              <TouchableOpacity style={styles.buttonContainer} onPress={goToNextPage}>
                <ThemedText style={styles.buttonText}>Next</ThemedText>
              </TouchableOpacity>
            </View>

            {/* Page 2 */}
            <View style={[styles.pageContainer, { width: SCREEN_WIDTH }]}>
              <View style={styles.contentContainer}>
                <ThemedText type="title" style={styles.headline}>
                  Welcome to Portal
                </ThemedText>

                <TouchableOpacity style={styles.buttonContainer} onPress={() => router.push('/screens/SeedPhraseScreen')}>
                  <ThemedText style={styles.buttonText}>Generate your private key</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity style={styles.buttonContainer} onPress={completeOnboarding}>
                  <ThemedText style={styles.buttonText}>Import existing seed</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
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
  headline: {
    marginBottom: 20,
    textAlign: 'center',
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
  swipeHint: {
    marginTop: 40,
    opacity: 0.7,
    fontSize: 14,
  }
});