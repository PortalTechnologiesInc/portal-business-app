import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

const ONBOARDING_KEY = 'portal_onboarding_complete';

export function useOnboardingState() {
  const [isReady, setIsReady] = useState(false);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  // Load state on mount
  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then(value => {
        setIsOnboardingComplete(value === 'true');
        setIsReady(true);
      })
      .catch(() => {
        setIsOnboardingComplete(false);
        setIsReady(true);
      });
  }, []);

  // Complete onboarding
  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, 'true');
    } catch (error) {
      console.log('error')
    } finally {
      console.log('onboarding done')
      setIsOnboardingComplete(true);
      router.replace('/');
    }
  };

  // Reset onboarding
  const resetOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, 'false');
    setIsOnboardingComplete(false);
    console.log('resetted onboarding')
    router.replace('/onboarding');
  };

  return {
    isReady,
    isOnboardingComplete,
    completeOnboarding,
    resetOnboarding
  };
}