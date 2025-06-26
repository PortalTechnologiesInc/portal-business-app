import type React from 'react';
import { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import * as FileSystem from 'expo-file-system';
import { useNostrService } from './NostrServiceContext';
import { formatAvatarUri, generateRandomGamertag } from '@/utils';
import { keyToHex } from 'portal-app-lib';

// Helper function to validate image
const validateImage = async (uri: string): Promise<{ isValid: boolean; error?: string }> => {
  try {
    console.log('DEBUG: Validating image URI:', uri);
    
    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(uri);
    console.log('DEBUG: File info:', fileInfo);

    if (!fileInfo.exists) {
      console.log('DEBUG: File does not exist');
      return { isValid: false, error: 'File does not exist' };
    }

    // Check file size (3MB limit - reduced from 5MB)
    if (fileInfo.size && fileInfo.size > 3 * 1024 * 1024) {
      console.log('DEBUG: File too large:', fileInfo.size, 'bytes');
      const sizeInMB = (fileInfo.size / (1024 * 1024)).toFixed(2);
      return { isValid: false, error: `Image is ${sizeInMB}MB. Please choose an image smaller than 3MB.` };
    }

    console.log('DEBUG: File size OK:', fileInfo.size, 'bytes');

    // Check file extension for GIF
    const extension = uri.toLowerCase().split('.').pop();
    console.log('DEBUG: File extension:', extension);
    
    if (extension === 'gif') {
      console.log('DEBUG: GIF files not supported');
      return { isValid: false, error: 'GIF images are not supported' };
    }

    // Check MIME type if available (additional GIF check)
    const mimeTypes = ['image/gif'];
    if (fileInfo.uri && mimeTypes.some(type => fileInfo.uri.includes(type))) {
      console.log('DEBUG: GIF MIME type detected');
      return { isValid: false, error: 'GIF images are not supported' };
    }

    console.log('DEBUG: Image validation passed');
    return { isValid: true };
  } catch (error) {
    console.error('DEBUG: Image validation error:', error);
    return { isValid: false, error: 'Failed to validate image' };
  }
};

// Helper function to check if a string is base64 data
const isBase64String = (str: string): boolean => {
  // Base64 strings are typically much longer and contain only valid base64 characters
  if (str.length < 100) return false; // Too short to be an image
  
  // Check if it contains only valid base64 characters
  const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
  return base64Regex.test(str) && !str.startsWith('data:') && !str.startsWith('file:') && !str.startsWith('http');
};

const USERNAME_KEY = 'portal_username';
const AVATAR_URI_KEY = 'portal_avatar_uri';

type ProfileSyncStatus = 'idle' | 'syncing' | 'completed' | 'failed';

type UserProfileContextType = {
  username: string;
  avatarUri: string | null;
  syncStatus: ProfileSyncStatus;
  isProfileEditable: boolean;
  avatarRefreshKey: number; // Add refresh key to force image cache invalidation
  setUsername: (username: string) => Promise<void>;
  setAvatarUri: (uri: string | null) => Promise<void>;
  setProfile: (username: string, avatarUri?: string | null) => Promise<void>;
  fetchProfile: (
    publicKey: string
  ) => Promise<{ found: boolean; username?: string; avatarUri?: string }>;
};

const UserProfileContext = createContext<UserProfileContextType | null>(null);

export const UserProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [username, setUsernameState] = useState<string>('');
  const [avatarUri, setAvatarUriState] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<ProfileSyncStatus>('idle');
  const [avatarRefreshKey, setAvatarRefreshKey] = useState<number>(Date.now());
  
  // Track what's actually saved on the network (for change detection)
  const [networkUsername, setNetworkUsername] = useState<string>('');
  const [networkAvatarUri, setNetworkAvatarUri] = useState<string | null>(null);

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

        // Load cached avatar URI from SecureStore
        const savedAvatarUri = await SecureStore.getItemAsync(AVATAR_URI_KEY);
        if (savedAvatarUri) {
          setAvatarUriState(savedAvatarUri);
        }
      } catch (e) {
        console.error('Failed to load local user profile:', e);
      }
    };

    loadLocalProfile();
  }, []);

  // Auto-fetch profile on app load when NostrService is ready
  useEffect(() => {
    const autoFetchProfile = async () => {
      // Only proceed if NostrService is ready and we have a public key
      if (!nostrService.isInitialized || !nostrService.publicKey || !nostrService.portalApp) {
        return;
      }

      // Only fetch if we're in idle state (not already syncing)
      if (syncStatus !== 'idle') {
        return;
      }

      console.log('🚀 Auto-fetching profile on app load for:', nostrService.publicKey);
      
      try {
        // Fetch the profile from the network
        const result = await fetchProfile(nostrService.publicKey);
        
        if (result.found) {
          console.log('✅ Auto-fetch successful - profile found and loaded');
        } else {
          console.log('ℹ️ Auto-fetch completed - no profile found on network');
          
          // Check if this is a newly generated seed (new user)
          try {
            const seedOrigin = await SecureStore.getItemAsync('portal_seed_origin');
            if (seedOrigin === 'generated') {
              console.log('🎯 New user detected - auto-generating profile');
              
              // Generate a random username for new users
              const randomUsername = generateRandomGamertag();
              console.log('🎲 Generated random username:', randomUsername);
              
              // Set the username locally and update state
              await setUsername(randomUsername);
              setNetworkUsername(''); // Keep network state empty since nothing is saved yet
              
              // Clear the seed origin flag so this only happens once
              await SecureStore.deleteItemAsync('portal_seed_origin');
              
              console.log('✅ Auto-generated profile setup completed');
              console.log('💡 User can now edit and save their profile in settings');
            } else {
              console.log('📥 Imported seed - no auto-generation, waiting for user to set profile');
            }
          } catch (error) {
            console.log('⚠️ Could not check seed origin, skipping auto-generation:', error);
          }
        }
      } catch (error) {
        console.log('⚠️ Auto-fetch failed:', error);
        // Don't throw - this is a background operation
      }
    };

    autoFetchProfile();
  }, [nostrService.isInitialized, nostrService.publicKey, nostrService.portalApp, syncStatus]);

  const fetchProfile = async (
    publicKey: string
  ): Promise<{ found: boolean; username?: string; avatarUri?: string }> => {
    if (!publicKey || syncStatus === 'syncing') {
      console.log('Profile fetch skipped: no publicKey or already syncing');
      return { found: false };
    }

    // Check if NostrService is ready
    if (!nostrService.isInitialized || !nostrService.portalApp) {
      console.log('NostrService not ready, will retry profile fetch later');
      setSyncStatus('failed');
      return { found: false };
    }

    console.log('Starting profile fetch for:', publicKey);
    setSyncStatus('syncing');

    try {
      // Fetch fresh profile data
      console.log('DEBUG: About to call nostrService.getServiceName with pubkey:', publicKey);
      const fetchedProfile = await nostrService.getServiceName(publicKey);
      console.log('DEBUG: getServiceName returned:', fetchedProfile);

      if (fetchedProfile) {
        console.log('Fetched profile:', fetchedProfile);

        // Extract data from fetched profile
        const fetchedUsername = fetchedProfile.nip05?.split('@')[0] || fetchedProfile.name || '';
        const fetchedAvatarUri = fetchedProfile.picture || null; // Ensure null instead of empty string

        console.log('Extracted username from profile:', fetchedUsername);
        console.log('Extracted avatar from profile:', fetchedAvatarUri);

        // Save the fetched data to local storage
        if (fetchedUsername) {
          await setUsername(fetchedUsername);
        }

        // Always update avatar to match network profile (even if null/empty)
        console.log('Updating avatar to match network profile:', fetchedAvatarUri || 'null');
        setAvatarUriState(fetchedAvatarUri);
        
        // Force avatar refresh to bust cache
        setAvatarRefreshKey(Date.now());
        
        if (fetchedAvatarUri) {
          // Cache the avatar URL in SecureStore
          await SecureStore.setItemAsync(AVATAR_URI_KEY, fetchedAvatarUri);
        } else {
          // No avatar in profile - clear cached avatar
          await SecureStore.deleteItemAsync(AVATAR_URI_KEY);
        }

        // Update network state to reflect what was fetched
        setNetworkUsername(fetchedUsername);
        setNetworkAvatarUri(fetchedAvatarUri);
        console.log('DEBUG: Updated network state from fetch - username:', fetchedUsername, 'avatar:', fetchedAvatarUri ? 'present' : 'none');

        setSyncStatus('completed');

        // Return the fetched data directly
        return {
          found: true,
          username: fetchedUsername || undefined,
          avatarUri: fetchedAvatarUri || undefined,
        };
      } else {
        console.log('No profile found for public key');
        setSyncStatus('completed');
        return { found: false }; // No profile found
      }
    } catch (error) {
      // Handle specific connection errors more gracefully
      const errorMessage = error instanceof Error ? error.message : String(error);

      if (
        errorMessage.includes('ListenerDisconnected') ||
        errorMessage.includes('AppError.ListenerDisconnected')
      ) {
        console.log('Nostr listener disconnected during profile fetch, will retry...');
        setSyncStatus('failed');
        return { found: false };
      }

      console.log('Failed to fetch profile:', error);
      setSyncStatus('failed');
      return { found: false };
    }
  };

  const setUsername = async (newUsername: string) => {
    try {
      await SecureStore.setItemAsync(USERNAME_KEY, newUsername);
      setUsernameState(newUsername);
      // Note: We no longer call registerNip05 here
      // Profile setting is now handled by setProfile method
    } catch (e) {
      console.error('Failed to save username:', e);
    }
  };

  const setAvatarUri = async (uri: string | null) => {
    try {
      if (uri) {
        // Validate the image
        const validation = await validateImage(uri);
        if (!validation.isValid) {
          throw new Error(validation.error || 'Invalid image');
        }
      }

      // Just update the state, no SecureStorage saving
      setAvatarUriState(uri);

      // Note: Image processing and uploading is now handled by setProfile method
    } catch (e) {
      console.error('Failed to set avatar URI:', e);
      throw e; // Re-throw so the UI can handle the error
    }
  };

  const setProfile = async (newUsername: string, newAvatarUri?: string | null) => {
    try {
      if (!nostrService.portalApp || !nostrService.publicKey) {
        throw new Error('Portal app or public key not initialized');
      }

      setSyncStatus('syncing');

      // Determine what has actually changed (compare against network state, not local state)
      const usernameChanged = newUsername !== networkUsername;
      const avatarChanged = newAvatarUri !== networkAvatarUri;

      console.log('🔄🔄🔄 NEW PROFILE FLOW STARTED 🔄🔄🔄');
      console.log('📝 Username changed:', usernameChanged, `("${networkUsername}" -> "${newUsername}")`);
      console.log('🖼️ Avatar changed:', avatarChanged, `("${networkAvatarUri}" -> "${newAvatarUri}")`);

      if (!usernameChanged && !avatarChanged) {
        console.log('⚠️ No changes detected, skipping profile update');
        setSyncStatus('completed');
        return;
      }

      // Step 1: Handle username changes (submitNip05)
      let nip05Error: string | null = null;
      let actualUsernameToUse = networkUsername; // Default to current network username
      
      if (usernameChanged) {
        console.log('🚀 STEP 1: Submitting NIP05 registration');
        console.log('📝 Registering username:', newUsername);
        
        try {
          await nostrService.submitNip05(newUsername);
          console.log('✅ NIP05 registration successful');
          actualUsernameToUse = newUsername; // Use new username if successful
        } catch (error) {
          console.error('❌ NIP05 registration failed:', error);
          
          // Store the error but don't throw - continue with other updates
          const errorMessage = error instanceof Error ? error.message : String(error);
          if (errorMessage.toLowerCase().includes('already taken') || 
              errorMessage.toLowerCase().includes('exists') ||
              errorMessage.toLowerCase().includes('unavailable')) {
            
            nip05Error = `Username "${newUsername}" is already taken. Please choose a different name.`;
          } else {
            nip05Error = `Failed to register username: ${errorMessage}`;
          }
          
          console.log('⚠️ NIP05 failed, but continuing with other profile updates...');
          // Keep actualUsernameToUse as networkUsername (previous valid username)
        }
      }

      // Step 2: Handle avatar changes (submitImage)
      let imageUrl = '';
      if (avatarChanged && newAvatarUri) {
        console.log('🚀 STEP 2: Processing and uploading image');
        console.log('🖼️ Processing avatar URI:', newAvatarUri);
        
        let cleanBase64 = '';
        
        // Check if the avatar is already base64 (from network fetch)
        if (isBase64String(newAvatarUri)) {
          console.log('📄 Avatar is already base64, using directly');
          cleanBase64 = newAvatarUri;
        } else {
          console.log('📁 Avatar is file URI, validating and converting to base64');
          
          // Validate the image file
          const validation = await validateImage(newAvatarUri);
          if (!validation.isValid) {
            console.error('❌ Image validation failed:', validation.error);
            throw new Error(validation.error || 'Invalid image');
          }
          
          console.log('✅ Image validation passed, reading as base64');
          
          // Read image as base64
          try {
            cleanBase64 = await FileSystem.readAsStringAsync(newAvatarUri, {
              encoding: FileSystem.EncodingType.Base64,
            });
            console.log('✅ Successfully converted to base64, length:', cleanBase64.length);
          } catch (error) {
            console.error('❌ Failed to read image as base64:', error);
            throw new Error('Failed to process image file');
          }
        }

        // Remove data URL prefix if present (submitImage expects clean base64)
        if (cleanBase64.startsWith('data:image/')) {
          const commaIndex = cleanBase64.indexOf(',');
          if (commaIndex !== -1) {
            cleanBase64 = cleanBase64.substring(commaIndex + 1);
            console.log('🧹 Removed data URL prefix, clean base64 length:', cleanBase64.length);
          }
        }

        console.log('🚀 Uploading image to portal servers');
        try {
          await nostrService.submitImage(cleanBase64);
          console.log('✅ Image upload successful');
          
          // Generate portal image URL using hex pubkey
          const hexPubkey = keyToHex(nostrService.publicKey);
          imageUrl = `https://profile.getportal.cc/${hexPubkey}`;
          console.log('🔗 Generated image URL:', imageUrl);
        } catch (error) {
          console.error('❌ Image upload failed:', error);
          const errorMessage = error instanceof Error ? error.message : String(error);
          throw new Error(`Failed to upload image: ${errorMessage}`);
        }
      } else if (!avatarChanged && networkAvatarUri) {
        // Keep existing image URL if avatar didn't change
        console.log('🔄 Keeping existing avatar');
        if (networkAvatarUri.startsWith('https://profile.getportal.cc/')) {
          imageUrl = networkAvatarUri;
        }
      }

      // Step 3: Set complete profile (setUserProfile)
      console.log('🚀 STEP 3: Setting complete profile');
      
      const profileUpdate = {
        nip05: `${actualUsernameToUse}@getportal.cc`,
        name: actualUsernameToUse,
        displayName: actualUsernameToUse,
        picture: imageUrl, // Use the portal image URL or empty string
      };

      console.log('📦📦📦 FINAL PROFILE OBJECT 📦📦📦');
      console.log('📦 Profile:', JSON.stringify(profileUpdate, null, 2));
      console.log('📦 Picture URL:', profileUpdate.picture || 'EMPTY');

      await nostrService.setUserProfile(profileUpdate);
      console.log('✅ Profile set successfully');

      // Update local state - use the actual username that worked
      await setUsername(actualUsernameToUse);
      if (avatarChanged) {
        // Store the portal image URL, not the local file URI
        setAvatarUriState(imageUrl || null);
        
        // Force avatar refresh to bust cache when avatar changes
        setAvatarRefreshKey(Date.now());
        
        // Cache the image URL in SecureStore after successful upload
        if (imageUrl) {
          await SecureStore.setItemAsync(AVATAR_URI_KEY, imageUrl);
          console.log('💾 Cached avatar URL in SecureStore:', imageUrl);
        } else {
          await SecureStore.deleteItemAsync(AVATAR_URI_KEY);
          console.log('🗑️ Cleared cached avatar URL from SecureStore');
        }
      }

      // Update network state to reflect what was actually saved
      setNetworkUsername(actualUsernameToUse);
      setNetworkAvatarUri(imageUrl || null);
      console.log('✅ Updated network state after save');
      
      if (nip05Error) {
        // Profile was partially updated but NIP05 failed
        console.log('⚠️⚠️⚠️ PROFILE UPDATE COMPLETED WITH NIP05 ERROR ⚠️⚠️⚠️');
        setSyncStatus('completed'); // Still mark as completed so user can edit again
        throw new Error(nip05Error); // Throw the NIP05 error to show to user
      } else {
        console.log('🎉🎉🎉 PROFILE UPDATE COMPLETED SUCCESSFULLY 🎉🎉🎉');
        setSyncStatus('completed');
      }
    } catch (error) {
      setSyncStatus('failed');
      console.error('❌❌❌ PROFILE UPDATE FAILED ❌❌❌', error);
      throw error;
    }
  };

  return (
    <UserProfileContext.Provider
      value={{
        username,
        avatarUri,
        syncStatus,
        isProfileEditable,
        avatarRefreshKey,
        setUsername,
        setAvatarUri,
        setProfile,
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
