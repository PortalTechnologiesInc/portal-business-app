import * as SecureStore from 'expo-secure-store';

// Key constants
const MNEMONIC_KEY = 'portal_mnemonic';

// Type for mnemonic data
type MnemonicData = string | null;

// Create a simple event system using a class since we're in React Native
class MnemonicEventEmitter {
  private listeners: Record<string, Array<(data: MnemonicData) => void>> = {};

  addListener(event: string, callback: (data: MnemonicData) => void) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
    return {
      remove: () => {
        this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
      }
    };
  }

  emit(event: string, data: MnemonicData) {
    if (this.listeners[event]) {
      for (const callback of this.listeners[event]) {
        callback(data);
      }
    }
  }
}

// Create an event emitter to broadcast mnemonic changes
export const mnemonicEvents = new MnemonicEventEmitter();

/**
 * Save mnemonic phrase to secure storage
 * @param mnemonic The mnemonic phrase to store
 * @returns Promise that resolves when the operation is complete
 */
export const saveMnemonic = async (mnemonic: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(MNEMONIC_KEY, mnemonic);
    // Emit an event when mnemonic is saved
    mnemonicEvents.emit('mnemonicChanged', mnemonic);
  } catch (error) {
    console.error('Failed to save mnemonic:', error);
    throw error;
  }
};

/**
 * Get mnemonic phrase from secure storage
 * @returns Promise that resolves with the mnemonic phrase or null if not found
 */
export const getMnemonic = async (): Promise<string | null> => {
  try {
    const mnemonic = await SecureStore.getItemAsync(MNEMONIC_KEY);
    return mnemonic;
  } catch (error) {
    console.error('Failed to get mnemonic:', error);
    throw error;
  }
};

/**
 * Delete mnemonic phrase from secure storage
 * @returns Promise that resolves when the operation is complete
 */
export const deleteMnemonic = async (): Promise<void> => {
  try {
    await SecureStore.deleteItemAsync(MNEMONIC_KEY);
    // Emit an event when mnemonic is deleted
    mnemonicEvents.emit('mnemonicChanged', null);
  } catch (error) {
    console.error('Failed to delete mnemonic:', error);
    throw error;
  }
};