import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Dimensions, Animated } from 'react-native';
import { ThemedText } from './ThemedText';
import { Colors } from '@/constants/Colors';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 50; // Full width minus padding

// Animated pulse component for skeleton loading effect
const SkeletonPulse = ({ style }: { style: any }) => {
  const translateX = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(translateX, {
        toValue: CARD_WIDTH,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    
    animation.start();
    
    return () => {
      animation.stop();
    };
  }, [translateX]);

  return (
    <View style={[styles.skeletonContainer, style]}>
      <View style={[styles.pulse, style]} />
      <Animated.View 
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]} 
      />
    </View>
  );
};

export const PendingRequestSkeletonCard: React.FC = () => {
  return (
    <View style={styles.card}>
      <SkeletonPulse style={styles.requestTypeSkeleton} />
      <SkeletonPulse style={styles.serviceNameSkeleton} />
      <SkeletonPulse style={styles.serviceInfoSkeleton} />
      
      {/* Add spacing to match the buttons area height */}
      <View style={styles.actionsArea}>
        <SkeletonPulse style={styles.actionsSkeleton} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 22,
    width: CARD_WIDTH,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  skeletonContainer: {
    position: 'relative',
    overflow: 'hidden',
  },
  pulse: {
    backgroundColor: '#333333',
    borderRadius: 4,
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: 60,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    transform: [{ skewX: '-20deg' }],
  },
  requestTypeSkeleton: {
    height: 14,
    width: '40%',
    marginBottom: 8,
  },
  serviceNameSkeleton: {
    height: 26,
    width: '80%',
    marginBottom: 4,
  },
  serviceInfoSkeleton: {
    height: 14,
    width: '60%',
    marginBottom: 20,
  },
  actionsArea: {
    height: 40, // Match the height of the action buttons
  },
  actionsSkeleton: {
    height: 15,
    width: '90%',
    opacity: 0.5,
  }
}); 