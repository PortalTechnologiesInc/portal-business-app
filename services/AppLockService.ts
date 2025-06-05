import * as SecureStore from 'expo-secure-store';
import { isBiometricAuthAvailable } from './BiometricAuthService';

const APP_LOCK_ENABLED_KEY = 'portal_app_lock_enabled';

/**
 * Check if app lock is enabled
 */
export const isAppLockEnabled = async (): Promise<boolean> => {
  try {
    const isEnabled = await SecureStore.getItemAsync(APP_LOCK_ENABLED_KEY);
    return isEnabled === 'true';
  } catch (error) {
    console.error('Error checking app lock status:', error);
    return false;
  }
};

/**
 * Enable or disable app lock
 */
export const setAppLockEnabled = async (enabled: boolean): Promise<void> => {
  try {
    await SecureStore.setItemAsync(APP_LOCK_ENABLED_KEY, enabled.toString());
  } catch (error) {
    console.error('Error setting app lock status:', error);
    throw error;
  }
};

/**
 * Check if biometric authentication is available and app lock can be enabled
 */
export const canEnableAppLock = async (): Promise<boolean> => {
  return await isBiometricAuthAvailable();
};
