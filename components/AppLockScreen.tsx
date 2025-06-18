import React, { useEffect, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Image, ActivityIndicator, Text } from 'react-native';
import { Shield, Fingerprint } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppLock } from '@/context/AppLockContext';
import { useThemeColor } from '@/hooks/useThemeColor';

const appLogo = require('../assets/images/appLogo.png');

export const AppLockScreen: React.FC = () => {
  const { unlock, isAuthenticating } = useAppLock();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textPrimary = useThemeColor({}, 'textPrimary');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const surfaceSecondary = useThemeColor({}, 'surfaceSecondary');
  const buttonPrimary = useThemeColor({}, 'buttonPrimary');
  const buttonPrimaryText = useThemeColor({}, 'buttonPrimaryText');
  const buttonSecondary = useThemeColor({}, 'buttonSecondary');

  // Memoize the unlock function to prevent unnecessary re-renders
  const handleAutoUnlock = useCallback(async () => {
    if (!isAuthenticating) {
      await unlock();
    }
  }, [unlock, isAuthenticating]);

  // Automatically trigger biometric authentication when the component mounts
  useEffect(() => {
    // Only trigger automatically once when component first mounts
    handleAutoUnlock();
  }, []); // Empty dependency array to run only once

  const handleUnlock = async () => {
    await unlock();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor }]}>
      <View style={[styles.content, { backgroundColor }]}>
        <View style={styles.logoContainer}>
          <Image source={appLogo} style={styles.logo} />
        </View>

        <View style={[styles.lockIconContainer, { backgroundColor: surfaceSecondary }]}>
          <Shield size={60} color={textPrimary} />
        </View>

        <Text style={[styles.title, { color: textPrimary }]}>App Locked</Text>

        <Text style={[styles.subtitle, { color: textSecondary }]}>
          {isAuthenticating ? 'Authenticating...' : 'Please authenticate to access Portal App'}
        </Text>

        <TouchableOpacity
          style={[
            styles.unlockButton,
            { backgroundColor: buttonPrimary },
            isAuthenticating && { backgroundColor: buttonSecondary },
          ]}
          onPress={handleUnlock}
          disabled={isAuthenticating}
        >
          {isAuthenticating ? (
            <ActivityIndicator size="small" color={buttonPrimaryText} />
          ) : (
            <Fingerprint size={24} color={buttonPrimaryText} />
          )}
          <Text style={[styles.unlockButtonText, { color: buttonPrimaryText }]}>
            {isAuthenticating ? 'Authenticating...' : 'Unlock'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor handled by theme
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    // backgroundColor handled by theme
  },
  logoContainer: {
    marginBottom: 40,
  },
  logo: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
  },
  lockIconContainer: {
    marginBottom: 30,
    // backgroundColor handled by theme
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    // color handled by theme
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    // color handled by theme
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  unlockButton: {
    // backgroundColor handled by theme
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
  },
  unlockButtonText: {
    // color handled by theme
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});
