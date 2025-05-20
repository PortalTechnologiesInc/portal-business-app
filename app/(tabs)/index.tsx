import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, ScrollView, Image } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { PendingRequestsList } from '@/components/PendingRequestsList';
import { UpcomingPaymentsList } from '@/components/UpcomingPaymentsList';
import { RecentActivitiesList } from '@/components/RecentActivitiesList';
import { useOnboarding } from '@/context/OnboardingContext';
import { useUserProfile } from '@/context/UserProfileContext';
import { QrCode, ArrowRight, User } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getNostrServiceInstance } from '@/services/nostr/NostrService';
import * as SecureStore from 'expo-secure-store';

const FIRST_LAUNCH_KEY = 'portal_first_launch_completed';

export default function Home() {
  const { isLoading } = useOnboarding();
  const { username, avatarUri } = useUserProfile();
  const [isFirstLaunch, setIsFirstLaunch] = useState(true);

  // This would come from a real user context in the future
  const [userPublicKey, setUserPublicKey] = useState('unknown pubkey');

  // Function to mark the welcome screen as viewed
  const markWelcomeAsViewed = useCallback(async () => {
    try {
      await SecureStore.setItemAsync(FIRST_LAUNCH_KEY, 'true');
      setIsFirstLaunch(false);
    } catch (e) {
      console.error('Failed to mark welcome as viewed:', e);
    }
  }, []);

  useEffect(() => {
    const fetchPublicKey = async () => {
      try {
        const nostrService = getNostrServiceInstance();
        let publicKey = nostrService.getPublicKey();

        // If no public key is available yet, try again after a short delay
        if (!publicKey || publicKey === 'unknown pubkey') {
          // Wait a bit for NostrService to initialize
          await new Promise(resolve => setTimeout(resolve, 1000));
          publicKey = nostrService.getPublicKey();
        }

        setUserPublicKey(publicKey || 'unknown pubkey');
        console.log('Current public key:', publicKey);
      } catch (e) {
        console.error('Failed to get public key:', e);
        setUserPublicKey('unknown pubkey');
      }
    };

    fetchPublicKey();

    // Check if this is the user's first launch after onboarding
    const checkFirstLaunch = async () => {
      try {
        const firstLaunchCompleted = await SecureStore.getItemAsync(FIRST_LAUNCH_KEY);
        setIsFirstLaunch(firstLaunchCompleted !== 'true');
        // We no longer set the flag here - we'll set it after user interaction
      } catch (e) {
        console.error('Failed to check first launch status:', e);
      }
    };

    checkFirstLaunch();

    // Set up an interval to periodically check for the public key if it's not available
    let intervalId: NodeJS.Timeout | null = null;

    if (!userPublicKey || userPublicKey === 'unknown pubkey') {
      intervalId = setInterval(fetchPublicKey, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [userPublicKey]);

  // Memoize the truncated key to prevent recalculation on every render
  const truncatedPublicKey = useMemo(() => {
    if (!userPublicKey) return '';
    return `${userPublicKey.substring(0, 16)}...${userPublicKey.substring(userPublicKey.length - 16)}`;
  }, [userPublicKey]);

  // Memoize handlers to prevent recreation on every render
  const handleQrScan = useCallback(() => {
    // Using 'modal' navigation to ensure cleaner navigation history
    router.push({
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

  // Don't render anything until we've checked the onboarding status
  if (isLoading) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          <ThemedView style={styles.header}>
            <View style={styles.headerContent}>
              <TouchableOpacity style={styles.headerLeft} onPress={handleSettingsNavigate}>
                <ThemedText
                  style={styles.welcomeText}
                  lightColor={Colors.darkGray}
                  darkColor={Colors.dirtyWhite}
                >
                  {username ? `Welcome back, ${username} 👋` : 'Welcome back 👋'}
                </ThemedText>
                <View style={styles.userInfoContainer}>
                  {/* Profile Avatar */}
                  <View style={styles.avatarContainer}>
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} style={styles.avatar} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <User size={18} color={Colors.almostWhite} />
                      </View>
                    )}
                  </View>

                  <View style={styles.userTextContainer}>
                    {username ? (
                      <ThemedText
                        style={styles.username}
                        lightColor={Colors.darkGray}
                        darkColor={Colors.almostWhite}
                      >
                        {`${username}@getportal.cc`}
                      </ThemedText>
                    ) : null}
                    <ThemedText
                      style={styles.publicKey}
                      lightColor={username ? Colors.gray : Colors.darkGray}
                      darkColor={username ? Colors.dirtyWhite : Colors.almostWhite}
                    >
                      {truncatedPublicKey}
                    </ThemedText>
                  </View>
                  <TouchableOpacity style={styles.qrButton} onPress={handleQrScan}>
                    <QrCode size={35} color={Colors.almostWhite} />
                  </TouchableOpacity>
                </View>
              </TouchableOpacity>
            </View>
          </ThemedView>

          {isFirstLaunch ? (
            <View style={styles.welcomeContainer}>
              <View style={styles.welcomeCard}>
                <ThemedText
                  type="title"
                  style={styles.welcomeTitle}
                  darkColor={Colors.almostWhite}
                  lightColor={Colors.almostWhite}
                >
                  Welcome to Portal App!
                </ThemedText>

                <ThemedText
                  style={styles.welcomeSubtitle}
                  darkColor={Colors.dirtyWhite}
                  lightColor={Colors.darkGray}
                >
                  Your secure portal to the web3 world
                </ThemedText>

                <View style={styles.illustrationContainer}>
                  <QrCode size={80} color={Colors.green} style={styles.illustration} />
                </View>

                <ThemedText
                  style={styles.welcomeDescription}
                  darkColor={Colors.dirtyWhite}
                  lightColor={Colors.darkGray}
                >
                  Get started by scanning a QR code to log in to a website or make a payment.
                </ThemedText>

                <View style={styles.scanQrContainer}>
                  <TouchableOpacity style={styles.scanQrButton} onPress={handleQrScan}>
                    <QrCode size={24} color={Colors.almostWhite} style={styles.qrIcon} />
                    <ThemedText
                      style={styles.scanQrText}
                      darkColor={Colors.almostWhite}
                      lightColor={Colors.almostWhite}
                    >
                      Scan QR Code
                    </ThemedText>
                    <ArrowRight size={18} color={Colors.almostWhite} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.dismissButton} onPress={markWelcomeAsViewed}>
                  <ThemedText
                    style={styles.dismissText}
                    darkColor={Colors.dirtyWhite}
                    lightColor={Colors.darkGray}
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
    backgroundColor: Colors.darkerGray,
  },
  container: {
    flex: 1,
    padding: 0,
    backgroundColor: Colors.darkerGray,
  },
  header: {
    backgroundColor: Colors.darkerGray,
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
  welcomeText: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 8,
  },
  userInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.gray,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  avatarPlaceholder: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.green,
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
  },
  publicKey: {
    fontSize: 14,
    fontWeight: '400',
  },
  qrButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.green,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  welcomeContainer: {
    paddingHorizontal: 20,
    marginTop: 20,
  },
  welcomeCard: {
    backgroundColor: '#1E1E1E',
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
});
