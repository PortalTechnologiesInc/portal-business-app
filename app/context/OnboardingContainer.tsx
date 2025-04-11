import React, { useRef, createContext } from 'react';
import { Dimensions, StyleSheet, View, Image } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedScrollHandler,
  SharedValue,
  useAnimatedStyle,
  interpolate
} from 'react-native-reanimated';
import { ThemedView } from '@/components/ThemedView';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Create context for scroll values
type OnboardingContextType = {
  scrollX: SharedValue<number>;
  screenWidth: number;
}

export const OnboardingContext = createContext<OnboardingContextType | null>(null);

// Hook to use scroll values
export const useOnboardingScroll = () => {
  const context = React.useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboardingScroll must be used within OnboardingContainer');
  }
  return context;
};

type OnboardingContainerProps = {
  children: React.ReactNode;
};

export default function OnboardingContainer({ children }: OnboardingContainerProps) {
  const scrollX = useSharedValue(0);
  const scrollViewRef = useRef<Animated.ScrollView>(null);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
    },
  });

  const numberOfPages = React.Children.count(children);

  const logoAnimatedStyle = useAnimatedStyle(() => {
    // Map full scroll range to 0-360 degrees
    const rotate = interpolate(
      scrollX.value,
      [0, SCREEN_WIDTH * (numberOfPages - 1)],
      [0, 180 * (numberOfPages - 1)]
    );

    return { transform: [{ rotate: `${rotate}deg` }] };
  });

  return (
    <ThemedView style={styles.container}>
      <OnboardingContext.Provider value={{ scrollX, screenWidth: SCREEN_WIDTH }}>
      <Animated.View style={[styles.fixedLogo, logoAnimatedStyle]}>
        <Image
          source={require('../../assets/images/logowhite.png')}
          style={{width: 200, height: 100}}
          resizeMode="contain"
        />
      </Animated.View>
        <Animated.ScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={scrollHandler}
          style={styles.scrollView}
        >
          {React.Children.map(children, (child, index) => (
            <View key={index} style={[styles.pageContainer, { width: SCREEN_WIDTH }]}>
              {child}
            </View>
          ))}
        </Animated.ScrollView>
      </OnboardingContext.Provider>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  fixedLogo: {
    position: 'relative',
    zIndex: 10,
    top: 150,
    alignSelf: 'center',
  },
  pageContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});