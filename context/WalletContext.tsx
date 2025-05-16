import type React from 'react';
import { createContext, useState, useContext, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type WalletContextType = {
  walletUrl: string;
  setWalletUrl: (url: string) => Promise<void>;
  isConnected: boolean;
};

const WalletContext = createContext<WalletContextType | undefined>(undefined);

const WALLET_URL_KEY = '@portal_wallet_url';

export const WalletProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [walletUrl, setWalletUrlState] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Load saved wallet URL on mount
  useEffect(() => {
    const loadWalletUrl = async () => {
      try {
        const savedWalletUrl = await AsyncStorage.getItem(WALLET_URL_KEY);
        if (savedWalletUrl) {
          setWalletUrlState(savedWalletUrl);
        }
      } catch (error) {
        console.error('Error loading wallet URL:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWalletUrl();
  }, []);

  // Function to set and persist wallet URL
  const setWalletUrl = async (url: string) => {
    try {
      if (url.trim()) {
        await AsyncStorage.setItem(WALLET_URL_KEY, url);
      } else {
        await AsyncStorage.removeItem(WALLET_URL_KEY);
      }
      setWalletUrlState(url);
    } catch (error) {
      console.error('Error saving wallet URL:', error);
      throw error;
    }
  };

  // Calculate if wallet is connected
  const isConnected = Boolean(walletUrl.trim());

  // Don't render children until initial loading is complete
  if (isLoading) {
    return null;
  }

  return (
    <WalletContext.Provider
      value={{
        walletUrl,
        setWalletUrl,
        isConnected,
      }}
    >
      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = (): WalletContextType => {
  const context = useContext(WalletContext);
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider');
  }
  return context;
};
