import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Dimensions, Image, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { ThemedView } from '@/components/ThemedView';
import { ThemedText } from '@/components/ThemedText';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ONBOARDING_COMPLETE = 'onboarding_complete';

export default function Onboarding() {
  const [currentPage, setCurrentPage] = useState(0);
  const slideX = useSharedValue(0);
  const rotateValue = useSharedValue(0);

  useEffect(() => {
    // Animate the logo rotation when page changes
    if (currentPage === 1) {
      rotateValue.value = withTiming(180, {
        duration: 800,
        easing: Easing.bezier(0.25, 0.1, 0.25, 1)
      });
    }
  }, [currentPage]);

  const logoStyle = useAnimatedStyle(() => {
    return {
      transform: [{ rotate: `${rotateValue.value}deg` }],
    };
  });

  const firstPageStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: currentPage === 0 ? 0 : -SCREEN_WIDTH }],
      opacity: currentPage === 0 ? 1 : 0,
      position: 'absolute',
      width: SCREEN_WIDTH,
      height: '100%',
    };
  });

  const secondPageStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: currentPage === 1 ? 0 : SCREEN_WIDTH }],
      opacity: currentPage === 1 ? 1 : 0,
      position: 'absolute',
      width: SCREEN_WIDTH,
      height: '100%',
    };
  });

  const completeOnboarding = async () => {
    try {
      await SecureStore.setItemAsync(ONBOARDING_COMPLETE, 'true');
      router.replace('/');
    } catch (error) {
      console.error('Error completing onboarding:', error);
    }
  };

  const goToNextPage = () => {
    slideX.value = withTiming(-SCREEN_WIDTH, {
      duration: 500,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1)
    });
    setCurrentPage(1);
  };

  return (
    <ThemedView style={styles.container}>
      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <Image
          source={require('../assets/images/logowhite.png')}
          style={{width: 200, height: 100}}
          resizeMode="contain"
        />
      </Animated.View>

      <View style={styles.pagesContainer}>
        <Animated.View style={[styles.pageContainer, firstPageStyle]}>
          <View style={styles.contentContainer}>
            <ThemedText type="title">Portal</ThemedText>
            <ThemedText type="title">Your digital Identity Provider</ThemedText>
          </View>

          <TouchableOpacity style={styles.buttonContainer} onPress={goToNextPage}>
            <ThemedText style={styles.buttonText}>Next</ThemedText>
          </TouchableOpacity>
        </Animated.View>

        <Animated.View style={[styles.pageContainer, secondPageStyle]}>
          <View style={styles.contentContainer}>
            <ThemedText type="title" style={styles.headline}>
              Welcome to Portal
            </ThemedText>

            <TouchableOpacity style={styles.buttonContainer} onPress={completeOnboarding}>
              <ThemedText style={styles.buttonText}>Generate your private key</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={styles.buttonContainer} onPress={completeOnboarding}>
              <ThemedText style={styles.buttonText}>Import existing seed</ThemedText>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </View>
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
  },
  headline: {
    marginBottom: 40,
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
  }
});