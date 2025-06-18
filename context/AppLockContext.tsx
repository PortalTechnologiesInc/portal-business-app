import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { isAppLockEnabled } from '@/services/AppLockService';
import { authenticateAsync } from '@/services/BiometricAuthService';

type AppLockContextType = {
  isLocked: boolean;
  isAuthenticating: boolean;
  unlock: () => Promise<void>;
  refreshLockStatus: (shouldLockImmediately?: boolean) => Promise<void>;
};

const AppLockContext = createContext<AppLockContextType | undefined>(undefined);

export const useAppLock = () => {
  const context = useContext(AppLockContext);
  if (context === undefined) {
    throw new Error('useAppLock must be used within an AppLockProvider');
  }
  return context;
};

type AppLockProviderProps = {
  children: React.ReactNode;
};

export const AppLockProvider: React.FC<AppLockProviderProps> = ({ children }) => {
  const [isLocked, setIsLocked] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const appState = useRef(AppState.currentState);
  const hasInitialized = useRef(false);

  // Check if app lock should be enabled on mount
  useEffect(() => {
    const checkAppLockOnInit = async () => {
      try {
        const lockEnabled = await isAppLockEnabled();
        if (lockEnabled) {
          setIsLocked(true);
        }
        hasInitialized.current = true;
      } catch (error) {
        console.error('Error checking app lock on init:', error);
        // Default to unlocked on error to prevent app from being unusable
        setIsLocked(false);
        hasInitialized.current = true;
      }
    };

    checkAppLockOnInit();
  }, []);

  // Listen for app state changes
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      // Only check when app comes to foreground and has been initialized
      if (
        hasInitialized.current &&
        appState.current.match(/inactive|background/) &&
        nextAppState === 'active'
      ) {
        try {
          const lockEnabled = await isAppLockEnabled();
          if (lockEnabled) {
            setIsLocked(true);
          }
        } catch (error) {
          console.error('Error checking app lock on foreground:', error);
        }
      }

      appState.current = nextAppState;
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []);

  const unlock = async (): Promise<void> => {
    if (isAuthenticating) return;

    setIsAuthenticating(true);
    try {
      const result = await authenticateAsync('Please authenticate to unlock the app');

      if (result.success) {
        setIsLocked(false);
      } else {
        // If authentication fails, keep the app locked
        console.warn('Authentication failed:', result.error);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      // On error, keep the app locked for security
    } finally {
      setIsAuthenticating(false);
    }
  };

  const refreshLockStatus = async (shouldLockImmediately = true): Promise<void> => {
    try {
      const lockEnabled = await isAppLockEnabled();
      if (lockEnabled && shouldLockImmediately) {
        setIsLocked(true);
      } else if (!lockEnabled) {
        setIsLocked(false);
      }
      // If lockEnabled is true but shouldLockImmediately is false, we don't change the lock state
    } catch (error) {
      console.error('Error refreshing lock status:', error);
    }
  };

  const value: AppLockContextType = {
    isLocked,
    isAuthenticating,
    unlock,
    refreshLockStatus,
  };

  return <AppLockContext.Provider value={value}>{children}</AppLockContext.Provider>;
};
