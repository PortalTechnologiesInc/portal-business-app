import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  ScrollView,
  Image,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { PendingRequestsList } from '@/components/PendingRequestsList';
import { UpcomingPaymentsList } from '@/components/UpcomingPaymentsList';
import { RecentActivitiesList } from '@/components/RecentActivitiesList';
import { ConnectionStatusIndicator } from '@/components/ConnectionStatusIndicator';
import { useOnboarding } from '@/context/OnboardingContext';
import { useUserProfile } from '@/context/UserProfileContext';
import { useNostrService } from '@/context/NostrServiceContext';
import { QrCode, ArrowRight, User } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { generateRandomGamertag } from '@/utils';
import { useThemeColor } from '@/hooks/useThemeColor';

const FIRST_LAUNCH_KEY = 'portal_first_launch_completed';

export default function Home() {
  const { isLoading } = useOnboarding();
  const { username, avatarUri, fetchProfile, syncStatus, setUsername } = useUserProfile();
  const nostrService = useNostrService();
  const [isFirstLaunch, setIsFirstLaunch] = useState<boolean | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const isMounted = useRef(true);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor(
    { light: Colors.secondaryWhite, dark: '#1E1E1E' },
    'cardBackground'
  );
  const primaryTextColor = useThemeColor(
    { light: Colors.gray900, dark: Colors.almostWhite },
    'text'
  );
  const secondaryTextColor = useThemeColor(
    { light: Colors.gray600, dark: Colors.dirtyWhite },
    'text'
  );
  const iconColor = useThemeColor({ light: Colors.gray700, dark: Colors.almostWhite }, 'text');

  // This would come from a real user context in the future
  const [userPublicKey, setUserPublicKey] = useState('unknown pubkey');

  // Function to mark the welcome screen as viewed
  const markWelcomeAsViewed = useCallback(async () => {
    try {
      if (isMounted.current) {
        await SecureStore.setItemAsync(FIRST_LAUNCH_KEY, 'true');
        setIsFirstLaunch(false);
      }
    } catch (e) {
      console.error('Failed to mark welcome as viewed:', e);
    }
  }, []);

  useEffect(() => {
    // Cleanup function to set mounted state to false
    return () => {
      isMounted.current = false;
    };
  }, []);

  // Periodic connection status monitoring (only when homepage is focused)
  useFocusEffect(
    useCallback(() => {
      console.log('🏠 Entered Homepage: Starting connection monitoring');

      // Initial fetch when entering homepage - trigger immediately with shorter delay
      const initialCheck = () => {
        nostrService.refreshConnectionStatus();
        nostrService.refreshNwcConnectionStatus();
      };

      // Immediate check
      initialCheck();

      // Also check again after a brief delay to catch any quick state changes
      const quickRecheck = setTimeout(initialCheck, 500);

      // Set up periodic refresh for connection status with shorter interval
      const interval = setInterval(() => {
        if (isMounted.current) {
          nostrService.refreshConnectionStatus();
          nostrService.refreshNwcConnectionStatus();
        }
      }, 2000); // Check every 2 seconds (reduced from 5 seconds)

      return () => {
        console.log('🏠 Leaved Homepage: Stopping connection monitoring');
        clearTimeout(quickRecheck);
        clearInterval(interval);
      };
    }, [nostrService.refreshConnectionStatus, nostrService.refreshNwcConnectionStatus])
  );

  useEffect(() => {
    setUserPublicKey(nostrService.publicKey || '');

    // Check if this is the user's first launch after onboarding
    const checkFirstLaunch = async () => {
      try {
        if (!isMounted.current) return;

        const firstLaunchCompleted = await SecureStore.getItemAsync(FIRST_LAUNCH_KEY);
        setIsFirstLaunch(firstLaunchCompleted !== 'true');
        // We no longer set the flag here - we'll set it after user interaction
      } catch (e) {
        console.error('Failed to check first launch status:', e);
      }
    };

    checkFirstLaunch();
  }, [nostrService]);

  // Add state to prevent multiple concurrent initializations
  const [isInitializing, setIsInitializing] = useState(false);

  // Fetch profile when NostrService is ready and initialize if needed
  useEffect(() => {
    const initializeProfile = async () => {
      // Only proceed if we have a public key and service is initialized
      if (!nostrService.isInitialized || !nostrService.publicKey || !nostrService.portalApp) {
        return;
      }

      // Only run on first load (syncStatus === 'idle')
      if (syncStatus !== 'idle') {
        return;
      }

      // Prevent concurrent initializations
      if (isInitializing) {
        console.log('Profile initialization already in progress, skipping...');
        return;
      }

      console.log('Setting isInitializing to true');
      setIsInitializing(true);

      // Prevent re-initialization if already done
      const hasInitialized = await SecureStore.getItemAsync('profile_initialized');
      if (hasInitialized === 'true') {
        return;
      }

      console.log('Starting profile initialization for:', nostrService.publicKey);

      try {
        // Check if this was a generated or imported seed
        const seedOrigin = await SecureStore.getItemAsync('portal_seed_origin');
        console.log('Seed origin:', seedOrigin);

        let currentUsername = '';

        if (seedOrigin === 'imported') {
          console.log('Imported seed detected, checking for existing profile...');

          // First, check if we already have a local profile for this key
          const existingLocalUsername = await SecureStore.getItemAsync('portal_username');

          if (
            existingLocalUsername &&
            existingLocalUsername.trim() &&
            existingLocalUsername !== 'Loading...'
          ) {
            console.log('Found existing local profile:', existingLocalUsername);
            currentUsername = existingLocalUsername;
          } else {
            console.log('No local profile found, fetching from network...');

            // Set loading username while waiting for relays
            await setUsername('Loading...');

            // Wait for at least one relay to be connected before attempting profile fetch
            const waitForRelayConnection = async (): Promise<boolean> => {
              const maxWait = 10000; // 10 seconds max wait (reduced since we attempt fetch anyway)
              const checkInterval = 1000; // Check every 1 second
              const startTime = Date.now();

              console.log('Waiting for relay connections...');

              // Check immediately first (no initial delay)
              await nostrService.refreshConnectionStatus();
              await new Promise(resolve => setTimeout(resolve, 100));
              let connectionSummary = nostrService.getConnectionSummary();
              if (connectionSummary.connectedCount > 0) {
                console.log('Relays connected successfully!');
                return true;
              }

              while (Date.now() - startTime < maxWait) {
                // Log less frequently to reduce noise
                if ((Date.now() - startTime) % 5000 < 1100) {
                  console.log('Still waiting for relay connections...');
                }

                // Wait before next check
                await new Promise(resolve => setTimeout(resolve, checkInterval));

                // Refresh connection status to get the latest data
                await nostrService.refreshConnectionStatus();
                // Small delay to allow state to update
                await new Promise(resolve => setTimeout(resolve, 100));

                connectionSummary = nostrService.getConnectionSummary();
                if (connectionSummary.connectedCount > 0) {
                  console.log('Relays connected successfully!');
                  return true;
                }
              }
              console.log(
                'Timeout waiting for relay connections - proceeding with profile fetch anyway'
              );
              return false;
            };

            const hasRelayConnection = await waitForRelayConnection();
            console.log('DEBUG: hasRelayConnection result:', hasRelayConnection);
            console.log(
              'DEBUG: Connection summary after wait:',
              nostrService.getConnectionSummary()
            );

            // Try to fetch profile regardless of relay connection status
            // The profile fetch might still work if some relays connect during the fetch
            console.log('DEBUG: Attempting profile fetch...');
            try {
              const profileResult = await fetchProfile(nostrService.publicKey);

              // Check if profile fetch was successful and has username
              if (profileResult.found && profileResult.username) {
                currentUsername = profileResult.username;
                console.log('Profile fetch completed, found username:', currentUsername);
              } else {
                console.log('Profile fetch failed or no profile found on network');
                // Clear loading username if no profile found
                await setUsername('');
              }
            } catch (error) {
              console.log('Profile fetch error:', error);
              // Clear loading username on error
              await setUsername('');
            }
          }
        } else {
          // For generated seeds, skip fetch (new keypair = no existing profile)
          console.log('Generated seed detected, skipping profile fetch...');

          // Check if we already have a local username (shouldn't happen, but be safe)
          currentUsername = (await SecureStore.getItemAsync('portal_username')) || '';
        }

        // Clean up the seed origin flag after first use
        await SecureStore.deleteItemAsync('portal_seed_origin');

        // Check if we should allow manual profile entry instead of dummy profile
        if (!currentUsername.trim()) {
          if (seedOrigin === 'imported') {
            console.log('No profile found on network. For imported seeds, this could mean:');
            console.log('1. Profile was never published to relays');
            console.log('2. Network connectivity issues');
            console.log('3. Profile exists on different relays');
            console.log('Creating dummy profile, but user can change it in settings...');
          }

          if (seedOrigin === 'generated' || seedOrigin === 'imported') {
            console.log('No existing profile found, creating dummy profile...');

            // Double-check that we're still the only initialization running
            const recentInitCheck = await SecureStore.getItemAsync('profile_initialized');
            if (recentInitCheck === 'true') {
              console.log(
                'Profile was initialized by another process, aborting dummy profile creation'
              );
              return;
            }

            const randomGamertag = generateRandomGamertag();
            console.log('Generated random gamertag:', randomGamertag);

            // Set local username first
            await setUsername(randomGamertag);

            // Then set the profile on the nostr network
            await nostrService.setUserProfile({
              nip05: `${randomGamertag}@getportal.cc`,
              name: randomGamertag,
              picture: '',
              displayName: randomGamertag,
            });

            console.log('Dummy profile created successfully:', randomGamertag);
          }
        } else {
          console.log('Existing profile found:', currentUsername);
        }

        // Mark as initialized to prevent re-runs
        await SecureStore.setItemAsync('profile_initialized', 'true');
      } catch (error) {
        console.error('Profile initialization failed:', error);
        // Don't retry automatically - user can manually refresh
      } finally {
        setIsInitializing(false);
      }
    };

    initializeProfile();
  }, [nostrService.isInitialized, nostrService.publicKey, syncStatus, isInitializing]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      // Refresh connection status for both relays and NWC wallet
      await nostrService.refreshConnectionStatus();
      await nostrService.refreshNwcConnectionStatus();
    } catch (error) {
      console.error('Error refreshing connection status:', error);
    }
    setRefreshing(false);
  };

  // Memoize the truncated key to prevent recalculation on every render
  const truncatedPublicKey = useMemo(() => {
    if (!userPublicKey) return '';

    // Get screen width to determine how many characters to show
    const screenWidth = Dimensions.get('window').width;

    // Adjust number of characters based on screen width
    let charsToShow = 15;
    if (screenWidth < 375) {
      charsToShow = 8;
    } else if (screenWidth < 414) {
      charsToShow = 12;
    }

    return `${userPublicKey.substring(0, charsToShow)}...${userPublicKey.substring(userPublicKey.length - charsToShow)}`;
  }, [userPublicKey]);

  // Calculate if we need to truncate the username based on screen width
  const screenWidth = Dimensions.get('window').width;
  const maxUsernameWidth = screenWidth * 0.8; // 80% of screen width

  // Approximate the character count based on average character width
  // This is an estimation since actual rendering width depends on font and character types
  const getEstimatedTextWidth = (text: string) => {
    // Estimate avg char width (varies by font, this is a rough approximation)
    const avgCharWidth = 10; // pixels per character
    return text.length * avgCharWidth;
  };

  // Memoize the username display logic - use username directly with @getportal.cc suffix
  const truncatedUsername = useMemo(() => {
    if (!username) return '';

    const fullUsername = `${username}@getportal.cc`;

    // Check if username is likely to exceed 80% of screen width
    if (getEstimatedTextWidth(fullUsername) > maxUsernameWidth) {
      const maxChars = Math.floor(maxUsernameWidth / 10);
      const charsPerSide = Math.floor((maxChars - 3) / 2);
      return `${fullUsername.substring(0, charsPerSide)}...${fullUsername.substring(fullUsername.length - charsPerSide)}`;
    }

    return fullUsername;
  }, [username, maxUsernameWidth]);

  // Memoize handlers to prevent recreation on every render
  const handleQrScan = useCallback(() => {
    // Using 'modal' navigation to ensure cleaner navigation history
    router.replace({
      pathname: '/qr',
      params: {
        source: 'homepage',
        timestamp: Date.now(), // Prevent caching issues
      },
    });

    // Mark welcome as viewed when user scans QR code
    if (isFirstLaunch) {
      markWelcomeAsViewed();
    }
  }, [isFirstLaunch, markWelcomeAsViewed]);

  const handleSettingsNavigate = useCallback(() => {
    router.push('/settings');
  }, []);

  // Don't render anything until we've checked the onboarding status and first launch status
  if (isLoading || isFirstLaunch === null) {
    return (
      <View style={[styles.loaderContainer, { backgroundColor }]}>
        <ActivityIndicator size="large" color={Colors.green} />
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top']}>
      <ThemedView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[Colors.green]}
              tintColor={Colors.green}
              title="Pull to refresh profile"
              titleColor={secondaryTextColor}
            />
          }
        >
          <ThemedView style={styles.header}>
            <View style={styles.headerContent}>
              <TouchableOpacity style={styles.headerLeft} onPress={handleSettingsNavigate}>
                <View style={styles.welcomeRow}>
                  <ThemedText
                    style={styles.welcomeText}
                    lightColor={Colors.gray700}
                    darkColor={Colors.dirtyWhite}
                    numberOfLines={1}
                    ellipsizeMode="middle"
                  >
                    {username ? `Welcome back, ${username} 👋` : 'Welcome back 👋'}
                  </ThemedText>
                  <ConnectionStatusIndicator size={10} />
                </View>
                <View style={styles.userInfoContainer}>
                  {/* Profile Avatar */}
                  <View style={styles.avatarContainer}>
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <User size={18} color={iconColor} />
                      </View>
                    )}
                  </View>

                  <View style={styles.userTextContainer}>
                    {username ? (
                      <ThemedText
                        style={[
                          styles.username,
                          username.length > 15 && { fontSize: 18 },
                          username.length > 20 && { fontSize: 16 },
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="middle"
                        lightColor={Colors.gray900}
                        darkColor={Colors.almostWhite}
                      >
                        <ThemedText>{username}</ThemedText>
                        <ThemedText>@getportal.cc</ThemedText>
                      </ThemedText>
                    ) : null}
                    <ThemedText
                      style={styles.publicKey}
                      lightColor={username ? Colors.gray600 : Colors.gray700}
                      darkColor={username ? Colors.dirtyWhite : Colors.almostWhite}
                    >
                      {truncatedPublicKey}
                    </ThemedText>
                  </View>
                  <TouchableOpacity style={styles.qrButton} onPress={handleQrScan}>
                    <QrCode size={40} color={iconColor} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          </ThemedView>

          {isFirstLaunch === true ? (
            <View style={styles.welcomeContainer}>
              <View style={[styles.welcomeCard, { backgroundColor: cardBackgroundColor }]}>
                <ThemedText
                  type="title"
                  style={styles.welcomeTitle}
                  darkColor={Colors.almostWhite}
                  lightColor={Colors.gray900}
                >
                  Welcome to Portal App!
                </ThemedText>

                <ThemedText
                  style={styles.welcomeSubtitle}
                  darkColor={Colors.dirtyWhite}
                  lightColor={Colors.gray700}
                >
                  Your secure portal to the web3 world
                </ThemedText>

                <View style={styles.illustrationContainer}>
                  <QrCode size={80} color={Colors.green} style={styles.illustration} />
                </View>

                <ThemedText
                  style={styles.welcomeDescription}
                  darkColor={Colors.dirtyWhite}
                  lightColor={Colors.gray700}
                >
                  Get started by scanning a QR code to log in to a website or make a payment.
                </ThemedText>

                <View style={styles.scanQrContainer}>
                  <TouchableOpacity style={styles.scanQrButton} onPress={handleQrScan}>
                    <QrCode size={24} color={Colors.white} style={styles.qrIcon} />
                    <ThemedText
                      style={styles.scanQrText}
                      darkColor={Colors.almostWhite}
                      lightColor={Colors.white}
                    >
                      Scan QR Code
                    </ThemedText>
                    <ArrowRight size={18} color={Colors.white} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.dismissButton} onPress={markWelcomeAsViewed}>
                  <ThemedText
                    style={styles.dismissText}
                    darkColor={Colors.dirtyWhite}
                    lightColor={Colors.gray600}
                  >
                    Dismiss Welcome
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <>
              {/* Pending Requests Section */}
              <PendingRequestsList />

              {/* Upcoming Payments Section */}
              <UpcomingPaymentsList />

              {/* Recent Activities Section */}
              <RecentActivitiesList />
            </>
          )}
        </ScrollView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 0,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    width: '100%',
  },
  headerContent: {
    width: '100%',
  },
  headerLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  welcomeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '400',
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarContainer: {
    width: 55,
    height: 55,
    borderRadius: 32,
    backgroundColor: Colors.gray,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 55,
    height: 55,
    borderRadius: 32,
  },
  avatarPlaceholder: {
    width: 55,
    height: 55,
    borderRadius: 32,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  userTextContainer: {
    flex: 1,
  },
  username: {
    fontSize: 22,
    fontWeight: '600',
    marginBottom: 4,
    flexShrink: 1,
  },
  publicKey: {
    fontSize: 14,
    fontWeight: '400',
  },
  qrButton: {
    width: 72,
    height: 72,
    borderRadius: 50,
    backgroundColor: Colors.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },

  welcomeContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  welcomeCard: {
    borderRadius: 20,
    padding: 24,
    minHeight: 200,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  welcomeSubtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    fontStyle: 'italic',
  },
  illustrationContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
  },
  illustration: {
    opacity: 0.9,
  },
  welcomeDescription: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 30,
  },
  scanQrContainer: {
    alignItems: 'center',
  },
  scanQrButton: {
    flexDirection: 'row',
    backgroundColor: Colors.green,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qrIcon: {
    marginRight: 10,
  },
  scanQrText: {
    fontSize: 18,
    fontWeight: '600',
    marginRight: 10,
  },
  button: {
    fontSize: 16,
    backgroundColor: 'white',
    color: 'black',
    padding: 15,
    borderRadius: 8,
    marginVertical: 10,
    width: '80%',
    textAlign: 'center',
  },
  dismissButton: {
    marginTop: 20,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '500',
  },
  loaderContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
