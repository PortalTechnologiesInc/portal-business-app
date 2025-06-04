import type React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Profile } from 'portal-app-lib';
import { useNostrService } from './NostrServiceContext';

const USERNAME_KEY = 'portal_username';
const AVATAR_KEY = 'portal_avatar';

type ProfileSyncStatus = 'idle' | 'syncing' | 'completed' | 'failed';

type UserProfileContextType = {
  username: string;
  avatarUri: string | null;
  syncStatus: ProfileSyncStatus;
  isProfileEditable: boolean;
  setUsername: (username: string) => Promise<void>;
  setAvatarUri: (uri: string | null) => Promise<void>;
  fetchProfile: (publicKey: string) => Promise<void>;
};

const UserProfileContext = createContext<UserProfileContextType | null>(null);

export const UserProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [username, setUsernameState] = useState<string>('');
  const [avatarUri, setAvatarUriState] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<ProfileSyncStatus>('idle');

  const nostrService = useNostrService();

  // Profile is editable only when sync is not in progress
  const isProfileEditable = syncStatus !== 'syncing';

  // Load local profile data on mount
  useEffect(() => {
    const loadLocalProfile = async () => {
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
        console.error('Failed to load local user profile:', e);
      }
    };

    loadLocalProfile();
  }, []);

  const fetchProfile = async (publicKey: string) => {
    if (!publicKey || syncStatus === 'syncing') {
      console.log('Profile fetch skipped: no publicKey or already syncing');
      return;
    }

    // Check if NostrService is ready
    if (!nostrService.isInitialized || !nostrService.portalApp) {
      console.log('NostrService not ready, will retry profile fetch later');
      setSyncStatus('failed');
      return;
    }

    console.log('Starting profile fetch for:', publicKey);
    setSyncStatus('syncing');

    try {
      // Fetch fresh profile data
      const fetchedProfile = await nostrService.getServiceName(publicKey);

      if (fetchedProfile) {
        console.log('Fetched profile:', fetchedProfile);

        // Get current local data
        const currentUsername = await SecureStore.getItemAsync(USERNAME_KEY);
        const currentAvatarUri = await SecureStore.getItemAsync(AVATAR_KEY);

        // Extract data from fetched profile
        const fetchedUsername = fetchedProfile.nip05?.split('@')[0] || '';
        const fetchedAvatarUri = fetchedProfile.picture || '';

        let needsUpdate = false;

        // Check username sync
        if (!currentUsername && fetchedUsername) {
          // Local is empty, save fetched data
          console.log('Local username empty, saving fetched username:', fetchedUsername);
          await setUsername(fetchedUsername);
          needsUpdate = true;
        } else if (currentUsername && fetchedUsername && currentUsername !== fetchedUsername) {
          // Data mismatch, update with fetched data
          console.log('Username mismatch, updating:', currentUsername, '->', fetchedUsername);
          await setUsername(fetchedUsername);
          needsUpdate = true;
        }

        // Check avatar sync
        if (!currentAvatarUri && fetchedAvatarUri) {
          // Local is empty, save fetched data
          console.log('Local avatar empty, saving fetched avatar');
          await setAvatarUri(fetchedAvatarUri);
          needsUpdate = true;
        } else if (currentAvatarUri && fetchedAvatarUri && currentAvatarUri !== fetchedAvatarUri) {
          // Data mismatch, update with fetched data
          console.log('Avatar mismatch, updating');
          await setAvatarUri(fetchedAvatarUri);
          needsUpdate = true;
        }

        if (needsUpdate) {
          console.log('Profile data updated from fetch');
        } else {
          console.log('Profile data already in sync');
        }
      } else {
        console.log('No profile found for public key');
      }

      setSyncStatus('completed');
    } catch (error) {
      console.error('Failed to fetch profile:', error);
      setSyncStatus('failed');
    }
  };

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
        syncStatus,
        isProfileEditable,
        setUsername,
        setAvatarUri,
        fetchProfile,
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
