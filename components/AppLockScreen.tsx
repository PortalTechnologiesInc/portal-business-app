import React, { useEffect } from 'react';
import { StyleSheet, View, TouchableOpacity, Image, ActivityIndicator, Text } from 'react-native';
import { Colors } from '@/constants/Colors';
import { Shield, Fingerprint } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppLock } from '@/context/AppLockContext';

const appLogo = require('../assets/images/appLogo.png');

export const AppLockScreen: React.FC = () => {
  const { unlock, isAuthenticating } = useAppLock();

  // Automatically trigger biometric authentication when the component mounts
  useEffect(() => {
    const autoUnlock = async () => {
      if (!isAuthenticating) {
        await unlock();
      }
    };

    autoUnlock();
  }, []);

  const handleUnlock = async () => {
    await unlock();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Image source={appLogo} style={styles.logo} />
        </View>

        <View style={styles.lockIconContainer}>
          <Shield size={60} color={Colors.almostWhite} />
        </View>

        <Text style={styles.title}>App Locked</Text>

        <Text style={styles.subtitle}>
          {isAuthenticating ? 'Authenticating...' : 'Please authenticate to access Portal App'}
        </Text>

        <TouchableOpacity
          style={[styles.unlockButton, isAuthenticating && styles.unlockButtonDisabled]}
          onPress={handleUnlock}
          disabled={isAuthenticating}
        >
          {isAuthenticating ? (
            <ActivityIndicator size="small" color={Colors.almostWhite} />
          ) : (
            <Fingerprint size={24} color={Colors.almostWhite} />
          )}
          <Text style={styles.unlockButtonText}>
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
    backgroundColor: '#000000',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    backgroundColor: '#000000',
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
    backgroundColor: Colors.darkGray,
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: Colors.almostWhite,
    marginBottom: 12,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: Colors.dirtyWhite,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  unlockButton: {
    backgroundColor: Colors.green,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 160,
  },
  unlockButtonDisabled: {
    backgroundColor: Colors.gray,
  },
  unlockButtonText: {
    color: Colors.almostWhite,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});
