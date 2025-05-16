import type React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';

const ONBOARDING_KEY = 'portal_onboarding_complete';

type OnboardingContextType = {
  isOnboardingComplete: boolean;
  isLoading: boolean;
  completeOnboarding: () => Promise<void>;
  resetOnboarding: () => Promise<void>;
};

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export const OnboardingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnboardingComplete, setIsOnboardingComplete] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load the value on mount
  useEffect(() => {
    const loadOnboardingState = async () => {
      try {
        const value = await SecureStore.getItemAsync(ONBOARDING_KEY);
        setIsOnboardingComplete(value === 'true');
      } catch (e) {
        console.error('Failed to load onboarding state:', e);
      } finally {
        setIsLoading(false);
      }
    };

    loadOnboardingState();
  }, []);

  const completeOnboarding = async () => {
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'true');
    setIsOnboardingComplete(true);
    router.replace('/');
  };

  const resetOnboarding = async () => {
    await SecureStore.setItemAsync(ONBOARDING_KEY, 'false');
    setIsOnboardingComplete(false);
    router.replace('/onboarding');
  };

  return (
    <OnboardingContext.Provider
      value={{ isOnboardingComplete, isLoading, completeOnboarding, resetOnboarding }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within an OnboardingProvider');
  }
  return context;
};

export default OnboardingProvider;
