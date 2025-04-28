import { useEffect, useState, useMemo, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useOnboarding } from '@/context/OnboardingContext';
import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
import { Colors } from '@/constants/Colors';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function Home() {
  const { isOnboardingComplete, isLoading, resetOnboarding } = useOnboarding();
  // This would come from a real user context in the future
  const [userPublicKey, setUserPublicKey] = useState('npub1abcdef1234567890abcdef1234567890abcdef1234567890abcdef123456');

  // Memoize the truncated key to prevent recalculation on every render
  const truncatedPublicKey = useMemo(() => {
    if (!userPublicKey) return '';
    return `${userPublicKey.substring(0, 16)}...${userPublicKey.substring(userPublicKey.length - 16)}`;
  }, [userPublicKey]);

  // Memoize handlers to prevent recreation on every render
  const handleQrScan = useCallback(() => {
    Alert.alert('qr scan page');
  }, []);

  const handleSettingsNavigate = useCallback(() => {
    router.push('/settings');
  }, [router]);

  useEffect(() => {
    if (!isLoading && !isOnboardingComplete) {
      router.replace('/onboarding');
    }
  }, [isLoading, isOnboardingComplete, router]);

  // Don't render anything until we've checked the onboarding status
  if (isLoading) {
    return null;
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <TouchableOpacity style={styles.headerLeft} onPress={handleSettingsNavigate}>
            <ThemedText style={styles.welcomeText} lightColor={Colors.darkGray} darkColor={Colors.dirtyWhite}>
              Welcome back 👋
            </ThemedText>
            <ThemedText style={styles.username} lightColor={Colors.darkGray} darkColor={Colors.almostWhite}>
              satoshi@getportal.cc
            </ThemedText>
            <ThemedText lightColor={Colors.gray} darkColor={Colors.dirtyWhite}>
              {truncatedPublicKey}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.qrButton} onPress={handleQrScan}>
            <FontAwesome6 name="qrcode" size={30} color={Colors.almostWhite} />
          </TouchableOpacity>
        </ThemedView>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    padding: 0,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    width: '100%',
  },
  headerLeft: {
    flex: 1,
    justifyContent: 'center',
  },
  welcomeText: {
    fontSize: 14,
    fontWeight: '400',
  },
  username: {
    fontSize: 22,
    fontWeight: '600',
    marginVertical: 4,
  },
  qrButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.green,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
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