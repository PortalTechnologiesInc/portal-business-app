import type React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';

const USERNAME_KEY = 'portal_username';
const AVATAR_KEY = 'portal_avatar';

type UserProfileContextType = {
  username: string;
  avatarUri: string | null;
  setUsername: (username: string) => Promise<void>;
  setAvatarUri: (uri: string | null) => Promise<void>;
};

const UserProfileContext = createContext<UserProfileContextType | null>(null);

export const UserProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [username, setUsernameState] = useState<string>('');
  const [avatarUri, setAvatarUriState] = useState<string | null>(null);

  useEffect(() => {
    const loadUserProfile = async () => {
      try {
        const savedUsername = await SecureStore.getItemAsync(USERNAME_KEY);
        if (savedUsername) {
          setUsernameState(savedUsername);
        }

        const savedAvatarUri = await SecureStore.getItemAsync(AVATAR_KEY);
        if (savedAvatarUri) {
          setAvatarUriState(savedAvatarUri);
        }
      } catch (e) {
        console.error('Failed to load user profile:', e);
      }
    };

    loadUserProfile();
  }, []);

  const setUsername = async (newUsername: string) => {
    try {
      await SecureStore.setItemAsync(USERNAME_KEY, newUsername);
      setUsernameState(newUsername);
    } catch (e) {
      console.error('Failed to save username:', e);
    }
  };

  const setAvatarUri = async (uri: string | null) => {
    try {
      if (uri) {
        await SecureStore.setItemAsync(AVATAR_KEY, uri);
      } else {
        await SecureStore.deleteItemAsync(AVATAR_KEY);
      }
      setAvatarUriState(uri);
    } catch (e) {
      console.error('Failed to save avatar URI:', e);
    }
  };

  return (
    <UserProfileContext.Provider
      value={{
        username,
        avatarUri,
        setUsername,
        setAvatarUri,
      }}
    >
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => {
  const context = useContext(UserProfileContext);
  if (!context) {
    throw new Error('useUserProfile must be used within a UserProfileProvider');
  }
  return context;
};

export default UserProfileProvider;
