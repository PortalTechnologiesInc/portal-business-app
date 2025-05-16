import { useEffect, useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { PendingRequestsList } from '@/components/PendingRequestsList';
import { UpcomingPaymentsList } from '@/components/UpcomingPaymentsList';
import { RecentActivitiesList } from '@/components/RecentActivitiesList';
import { useOnboarding } from '@/context/OnboardingContext';
import { useUserProfile } from '@/context/UserProfileContext';
import { QrCode } from 'lucide-react-native';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Home() {
  const { isOnboardingComplete, isLoading, resetOnboarding } = useOnboarding();
  const { username } = useUserProfile();

  // This would come from a real user context in the future
  const [userPublicKey, setUserPublicKey] = useState(
    'npub1abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456'
  );

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
  }, []);

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
                  Welcome back 👋
                </ThemedText>
                <View style={styles.userInfoContainer}>
                  <View style={styles.userTextContainer}>
                    {username ? (
                      <ThemedText
                        style={styles.username}
                        lightColor={Colors.darkGray}
                        darkColor={Colors.almostWhite}
                      >
                        {username}
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

          {/* Pending Requests Section */}
          <PendingRequestsList />

          {/* Upcoming Payments Section */}
          <UpcomingPaymentsList />

          {/* Recent Activities Section */}
          <RecentActivitiesList />
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
});
