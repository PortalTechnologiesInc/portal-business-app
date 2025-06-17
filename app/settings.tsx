import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Image,
  View,
  ScrollView,
  RefreshControl,
  Switch,
} from 'react-native';
import Clipboard from '@react-native-clipboard/clipboard';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, Pencil, ChevronRight, Fingerprint, Shield } from 'lucide-react-native';
import { Moon, Sun, Smartphone } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useOnboarding } from '@/context/OnboardingContext';
import { useUserProfile } from '@/context/UserProfileContext';
import {
  isWalletConnected,
  walletUrlEvents,
  deleteMnemonic,
  getMnemonic,
} from '@/services/SecureStorageService';
import * as ImagePicker from 'expo-image-picker';
import { resetDatabase } from '@/services/database/DatabaseProvider';
import { useNostrService } from '@/context/NostrServiceContext';
import { showToast } from '@/utils/Toast';
import { authenticateForSensitiveAction } from '@/services/BiometricAuthService';
import { isAppLockEnabled, setAppLockEnabled, canEnableAppLock } from '@/services/AppLockService';
import { useAppLock } from '@/context/AppLockContext';
import { useTheme, ThemeMode } from '@/context/ThemeContext';
import { useThemeColor } from '@/hooks/useThemeColor';

export default function SettingsScreen() {
  const router = useRouter();
  const { resetOnboarding } = useOnboarding();
  const { username, avatarUri, setUsername, setAvatarUri, isProfileEditable, fetchProfile } =
    useUserProfile();
  const nostrService = useNostrService();
  const { refreshLockStatus } = useAppLock();
  const { themeMode, setThemeMode } = useTheme();
  const [isWalletConnectedState, setIsWalletConnectedState] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [usernameInput, setUsernameInput] = useState('');
  const [profileIsLoading, setProfileIsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [appLockEnabled, setAppLockEnabledState] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor({}, 'cardBackground');
  const primaryTextColor = useThemeColor({}, 'textPrimary');
  const secondaryTextColor = useThemeColor({}, 'textSecondary');
  const inputBackgroundColor = useThemeColor({}, 'inputBackground');
  const inputBorderColor = useThemeColor({}, 'inputBorder');
  const inputPlaceholderColor = useThemeColor({}, 'inputPlaceholder');
  const buttonPrimaryColor = useThemeColor({}, 'buttonPrimary');
  const buttonSecondaryColor = useThemeColor({}, 'buttonSecondary');
  const buttonDangerColor = useThemeColor({}, 'buttonDanger');
  const buttonPrimaryTextColor = useThemeColor({}, 'buttonPrimaryText');
  const buttonSecondaryTextColor = useThemeColor({}, 'buttonSecondaryText');
  const buttonDangerTextColor = useThemeColor({}, 'buttonDangerText');
  const statusConnectedColor = useThemeColor({}, 'statusConnected');

  // Get real NWC connection status
  const { nwcConnectionStatus } = nostrService;

  // Initialize wallet connection status and app lock settings
  useEffect(() => {
    const checkWalletConnection = async () => {
      try {
        const walletConnected = await isWalletConnected();
        // Use real NWC connection status if available, otherwise fall back to URL existence
        const realConnectionStatus =
          nwcConnectionStatus !== null ? nwcConnectionStatus : walletConnected;
        setIsWalletConnectedState(realConnectionStatus);
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    };

    const checkAppLockSettings = async () => {
      try {
        const [lockEnabled, biometricEnabled] = await Promise.all([
          isAppLockEnabled(),
          canEnableAppLock(),
        ]);
        setAppLockEnabledState(lockEnabled);
        setBiometricAvailable(biometricEnabled);
      } catch (error) {
        console.error('Error checking app lock settings:', error);
      }
    };

    const initializeSettings = async () => {
      await Promise.all([checkWalletConnection(), checkAppLockSettings()]);
      setIsLoading(false);
    };

    initializeSettings();

    // Subscribe to wallet URL changes
    const subscription = walletUrlEvents.addListener('walletUrlChanged', async newUrl => {
      setIsWalletConnectedState(Boolean(newUrl?.trim()));
    });

    return () => subscription.remove();
  }, [nwcConnectionStatus]);

  // Update wallet connection status when nwcConnectionStatus changes
  useEffect(() => {
    if (nwcConnectionStatus !== null) {
      setIsWalletConnectedState(nwcConnectionStatus);
    }
  }, [nwcConnectionStatus]);

  useEffect(() => {
    if (username) {
      setUsernameInput(username);
    }
  }, [username]);

  const handleAvatarPress = async () => {
    // Don't allow avatar change during sync
    if (!isProfileEditable) {
      Alert.alert(
        'Profile Sync in Progress',
        'Please wait for profile synchronization to complete before making changes.'
      );
      return;
    }

    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!permissionResult.granted) {
        Alert.alert(
          'Permission Required',
          'You need to allow access to your photos to change your avatar.'
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        await setAvatarUri(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleRefreshProfile = async () => {
    try {
      // Get the current public key from NostrService to refresh profile
      if (nostrService.publicKey) {
        console.log('Public key:', nostrService.publicKey);
        await fetchProfile(nostrService.publicKey);
        showToast('Profile refreshed successfully', 'success');
      } else {
        showToast('Unable to refresh profile', 'error');
      }
    } catch (error) {
      // Silently handle profile fetch errors
      showToast('Failed to refresh profile', 'error');
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await handleRefreshProfile();
    setRefreshing(false);
  };

  const handleSaveProfile = async () => {
    // Don't allow profile save during sync
    if (!isProfileEditable) {
      Alert.alert(
        'Profile Sync in Progress',
        'Please wait for profile synchronization to complete before making changes.'
      );
      return;
    }

    try {
      setProfileIsLoading(true);

      const username = usernameInput.trim();

      await setUsername(username);

      await nostrService.setUserProfile({
        nip05: `${username}@getportal.cc`,
        name: username,
        picture: avatarUri || '',
        displayName: username,
      });

      handleRefreshProfile();

      Alert.alert('Success', 'Profile updated successfully');
    } catch (error) {
      console.error('Error saving profile:', error);
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setProfileIsLoading(false);
    }
  };

  const handleClearAppData = () => {
    Alert.alert(
      'Reset App',
      'This will reset all app data and take you back to onboarding. Are you sure?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Clear Data',
          style: 'destructive',
          onPress: () => {
            // Require biometric authentication before proceeding with the destructive action
            authenticateForSensitiveAction(async () => {
              try {
                // Clear user profile data but maintain pubkey format
                await setUsername('');
                await setAvatarUri(null);

                // Delete mnemonic first - this triggers database disconnection
                deleteMnemonic();

                // Reset the database (will work with new connection)
                await resetDatabase();

                // Reset onboarding state (this navigates to onboarding screen)
                await resetOnboarding();
              } catch (error) {
                console.error('Error clearing app data:', error);
                Alert.alert('Error', 'Failed to Reset App. Please try again.');
              }
            }, 'Authenticate to reset all app data');
          },
        },
      ]
    );
  };

  const handleWalletCardPress = () => {
    router.push({
      pathname: '/wallet',
      params: {
        source: 'settings',
      },
    });
  };

  const handleNostrCardPress = () => {
    // Navigate to nostr management page with proper source parameter
    router.push({
      pathname: '/relays',
      params: {
        source: 'settings',
      },
    });
  };

  const handleExportMnemonic = () => {
    authenticateForSensitiveAction(async () => {
      console.log('Exporting mnemonic...');
      try {
        const mnemonic = await getMnemonic();
        console.log('Mnemonic:', mnemonic);
        if (mnemonic) {
          Clipboard.setString(mnemonic);
          showToast('Mnemonic copied to clipboard', 'success');
        } else {
          showToast('No mnemonic found', 'error');
        }
      } catch (error) {
        console.error('Error exporting mnemonic:', error);
        showToast('Failed to export mnemonic', 'error');
      }
    }, 'Authenticate to export your seed phrase');
  };

  const handleExportAppData = () => {
    authenticateForSensitiveAction(async () => {
      console.log('Exporting app data...');
      // TODO: Implement app data export logic
      showToast('App data export not yet implemented', 'success');
    }, 'Authenticate to export app data');
  };

  const handleToggleAppLock = async (enabled: boolean) => {
    if (enabled && !biometricAvailable) {
      Alert.alert(
        'Biometric Authentication Required',
        'To enable app lock, you need to set up biometric authentication (fingerprint, face recognition, or PIN) on your device first.',
        [{ text: 'OK' }]
      );
      return;
    }

    if (enabled) {
      // When enabling, require authentication to confirm
      authenticateForSensitiveAction(async () => {
        try {
          await setAppLockEnabled(true);
          setAppLockEnabledState(true);
          // Don't lock immediately when user is actively enabling it
          await refreshLockStatus(false);
          showToast('App lock enabled', 'success');
        } catch (error) {
          console.error('Error enabling app lock:', error);
          showToast('Failed to enable app lock', 'error');
        }
      }, 'Authenticate to enable app lock');
    } else {
      // When disabling, require authentication to confirm
      authenticateForSensitiveAction(async () => {
        try {
          await setAppLockEnabled(false);
          setAppLockEnabledState(false);
          // When disabling, unlock the app
          await refreshLockStatus(false);
          showToast('App lock disabled', 'success');
        } catch (error) {
          console.error('Error disabling app lock:', error);
          showToast('Failed to disable app lock', 'error');
        }
      }, 'Authenticate to disable app lock');
    }
  };

  const handleThemeChange = () => {
    // Cycle through theme options: auto -> light -> dark -> auto
    const nextTheme: ThemeMode =
      themeMode === 'auto' ? 'light' : themeMode === 'light' ? 'dark' : 'auto';

    setThemeMode(nextTheme);
    showToast(
      `Theme changed to ${
        nextTheme === 'auto' ? 'Auto (System)' : nextTheme === 'light' ? 'Light' : 'Dark'
      }`,
      'success'
    );
  };

  if (isLoading) {
    return (
      <SafeAreaView style={[styles.safeArea, { backgroundColor: backgroundColor }]} edges={['top']}>
        <ThemedView style={styles.container}>
          <ThemedView style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
              <ArrowLeft size={20} color={primaryTextColor} />
            </TouchableOpacity>
            <ThemedText
              style={styles.headerText}
              lightColor={primaryTextColor}
              darkColor={primaryTextColor}
            >
              Settings
            </ThemedText>
          </ThemedView>
          <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
            <ThemedText style={{ color: primaryTextColor }}>Loading...</ThemedText>
          </ScrollView>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: backgroundColor }]} edges={['top']}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={primaryTextColor} />
          </TouchableOpacity>
          <ThemedText
            style={styles.headerText}
            lightColor={primaryTextColor}
            darkColor={primaryTextColor}
          >
            Settings
          </ThemedText>
        </ThemedView>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[statusConnectedColor]}
              tintColor={statusConnectedColor}
              title="Pull to refresh profile"
              titleColor={primaryTextColor}
            />
          }
        >
          {/* Profile Section */}
          <ThemedView style={styles.section}>
            <View style={styles.sectionHeader}>
              <ThemedText style={[styles.sectionTitle, { color: primaryTextColor }]}>
                Profile
              </ThemedText>
            </View>
            <ThemedView style={styles.profileSection}>
              <TouchableOpacity
                style={[
                  styles.avatarContainer,
                  !isProfileEditable && styles.avatarContainerDisabled,
                ]}
                onPress={handleAvatarPress}
                disabled={!isProfileEditable}
              >
                {avatarUri ? (
                  <Image
                    source={{ uri: avatarUri }}
                    style={[styles.avatar, { borderColor: inputBorderColor }]}
                  />
                ) : (
                  <View
                    style={[
                      styles.avatarPlaceholder,
                      { backgroundColor: cardBackgroundColor, borderColor: inputBorderColor },
                    ]}
                  >
                    <User size={40} color={primaryTextColor} />
                  </View>
                )}
                <View
                  style={[
                    styles.avatarEditBadge,
                    { backgroundColor: cardBackgroundColor, borderColor: inputBorderColor },
                    !isProfileEditable && styles.avatarEditBadgeDisabled,
                  ]}
                >
                  <Pencil size={12} color={primaryTextColor} />
                </View>
              </TouchableOpacity>

              <View style={[styles.usernameContainer, { borderBottomColor: inputBorderColor }]}>
                <TextInput
                  style={[
                    styles.usernameInput,
                    { color: primaryTextColor },
                    !isProfileEditable && styles.usernameInputDisabled,
                  ]}
                  value={usernameInput}
                  onChangeText={setUsernameInput}
                  placeholder="username"
                  placeholderTextColor={inputPlaceholderColor}
                  autoCapitalize="none"
                  autoCorrect={false}
                  editable={isProfileEditable}
                />
                <ThemedText style={[styles.usernameSuffix, { color: secondaryTextColor }]}>
                  @getportal.cc
                </ThemedText>
              </View>

              <View style={styles.profileButtonsContainer}>
                <TouchableOpacity
                  style={[
                    styles.saveButton,
                    { backgroundColor: buttonPrimaryColor },
                    (!isProfileEditable || profileIsLoading) && {
                      backgroundColor: inputBorderColor,
                      opacity: 0.5,
                    },
                  ]}
                  onPress={handleSaveProfile}
                  disabled={!isProfileEditable || profileIsLoading}
                >
                  <ThemedText
                    style={[
                      styles.saveButtonText,
                      { color: buttonPrimaryTextColor },
                      (!isProfileEditable || profileIsLoading) && { color: secondaryTextColor },
                    ]}
                  >
                    {profileIsLoading ? 'Saving...' : 'Save Profile'}
                  </ThemedText>
                </TouchableOpacity>
              </View>
            </ThemedView>
          </ThemedView>

          {/* Wallet Section */}
          <ThemedView style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: primaryTextColor }]}>
              Wallet
            </ThemedText>
            <ThemedView style={styles.walletSection}>
              <TouchableOpacity
                style={[styles.card, { backgroundColor: cardBackgroundColor }]}
                onPress={handleWalletCardPress}
                activeOpacity={0.7}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardLeft}>
                    <ThemedText style={[styles.cardTitle, { color: primaryTextColor }]}>
                      Wallet Connect
                    </ThemedText>
                    <ThemedText style={[styles.cardStatus, { color: secondaryTextColor }]}>
                      {isWalletConnectedState ? 'Connected' : 'Not connected'}
                    </ThemedText>
                  </View>
                  <ChevronRight size={24} color={secondaryTextColor} />
                </View>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>

          {/* Nostr Section */}
          <ThemedView style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: primaryTextColor }]}>
              Relays
            </ThemedText>
            <ThemedView style={styles.walletSection}>
              <TouchableOpacity
                style={[styles.card, { backgroundColor: cardBackgroundColor }]}
                onPress={handleNostrCardPress}
                activeOpacity={0.7}
              >
                <View style={styles.cardContent}>
                  <View style={styles.cardLeft}>
                    <ThemedText style={[styles.cardTitle, { color: primaryTextColor }]}>
                      Nostr relays
                    </ThemedText>
                    <ThemedText style={[styles.cardStatus, { color: secondaryTextColor }]}>
                      Manage the Nostr relays your app connects to
                    </ThemedText>
                  </View>
                  <ChevronRight size={24} color={secondaryTextColor} />
                </View>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>

          {/* Theme Section */}
          <ThemedView style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: primaryTextColor }]}>
              Appearance
            </ThemedText>
            <ThemedView style={styles.themeSection}>
              <ThemedView style={[styles.themeCard, { backgroundColor: cardBackgroundColor }]}>
                <TouchableOpacity
                  onPress={handleThemeChange}
                  activeOpacity={0.7}
                  style={styles.themeCardTouchable}
                >
                  <View style={styles.themeCardContent}>
                    <View style={styles.themeCardLeft}>
                      <View style={styles.themeIconContainer}>
                        {themeMode === 'auto' ? (
                          <Smartphone size={24} color={buttonPrimaryColor} />
                        ) : themeMode === 'light' ? (
                          <Sun size={24} color={statusConnectedColor} />
                        ) : (
                          <Moon size={24} color={buttonPrimaryColor} />
                        )}
                      </View>
                      <View style={styles.themeTextContainer}>
                        <ThemedText style={[styles.themeTitle, { color: primaryTextColor }]}>
                          Theme
                        </ThemedText>
                        <ThemedText style={[styles.themeStatus, { color: secondaryTextColor }]}>
                          {themeMode === 'auto'
                            ? 'Auto (System)'
                            : themeMode === 'light'
                              ? 'Light'
                              : 'Dark'}
                        </ThemedText>
                      </View>
                    </View>
                    <View style={[styles.themeIndicator, { backgroundColor: buttonPrimaryColor }]}>
                      <ThemedText style={[styles.tapToChange, { color: buttonPrimaryTextColor }]}>
                        Tap to change
                      </ThemedText>
                    </View>
                  </View>
                </TouchableOpacity>
              </ThemedView>
            </ThemedView>
          </ThemedView>

          {/* Security Section */}
          <ThemedView style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: primaryTextColor }]}>
              Security
            </ThemedText>
            <ThemedView style={styles.securitySection}>
              <View style={[styles.appLockOption, { backgroundColor: cardBackgroundColor }]}>
                <View style={styles.appLockLeft}>
                  <View style={styles.appLockIconContainer}>
                    <Shield size={24} color={primaryTextColor} />
                  </View>
                  <View style={styles.appLockTextContainer}>
                    <ThemedText style={[styles.appLockTitle, { color: primaryTextColor }]}>
                      App Lock
                    </ThemedText>
                    <ThemedText style={[styles.appLockDescription, { color: secondaryTextColor }]}>
                      {biometricAvailable
                        ? 'Require biometric authentication to open the app'
                        : 'Biometric authentication not available'}
                    </ThemedText>
                  </View>
                </View>
                <Switch
                  value={appLockEnabled}
                  onValueChange={handleToggleAppLock}
                  disabled={!biometricAvailable}
                  trackColor={{
                    false: inputBorderColor,
                    true: buttonPrimaryColor,
                  }}
                  thumbColor={appLockEnabled ? primaryTextColor : secondaryTextColor}
                  ios_backgroundColor={inputBorderColor}
                />
              </View>
            </ThemedView>
          </ThemedView>

          {/* Export Section */}
          <ThemedView style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: primaryTextColor }]}>
              Export
            </ThemedText>
            <ThemedView style={styles.exportSection}>
              <TouchableOpacity
                style={[styles.exportButton, { backgroundColor: buttonPrimaryColor }]}
                onPress={handleExportMnemonic}
              >
                <View style={styles.exportButtonContent}>
                  <ThemedText style={[styles.exportButtonText, { color: buttonPrimaryTextColor }]}>
                    Export Mnemonic
                  </ThemedText>
                  <View style={styles.fingerprintIcon}>
                    <Fingerprint size={20} color={buttonPrimaryTextColor} />
                  </View>
                </View>
              </TouchableOpacity>
            </ThemedView>
            <ThemedView style={styles.exportSection}>
              <TouchableOpacity
                style={[styles.exportButton, { backgroundColor: buttonPrimaryColor }]}
                onPress={handleExportAppData}
              >
                <View style={styles.exportButtonContent}>
                  <ThemedText style={[styles.exportButtonText, { color: buttonPrimaryTextColor }]}>
                    Export App Data
                  </ThemedText>
                  <View style={styles.fingerprintIcon}>
                    <Fingerprint size={20} color={buttonPrimaryTextColor} />
                  </View>
                </View>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>

          {/* Extra Section */}
          <ThemedView style={styles.section}>
            <ThemedText style={[styles.sectionTitle, { color: primaryTextColor }]}>
              Extra
            </ThemedText>
            <ThemedView style={styles.extraSection}>
              <TouchableOpacity
                style={[styles.clearDataButton, { backgroundColor: buttonDangerColor }]}
                onPress={handleClearAppData}
              >
                <View style={styles.clearDataButtonContent}>
                  <ThemedText
                    style={[styles.clearDataButtonText, { color: buttonDangerTextColor }]}
                  >
                    Reset App
                  </ThemedText>
                  <View style={styles.fingerprintIcon}>
                    <Fingerprint size={20} color={buttonDangerTextColor} />
                  </View>
                </View>
              </TouchableOpacity>
            </ThemedView>
          </ThemedView>
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
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
  },
  backButton: {
    marginRight: 15,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  contentContainer: {
    paddingVertical: 12,
  },
  section: {
    marginBottom: 24,
    width: '100%',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 12,
    width: '100%',
  },
  walletSection: {
    paddingVertical: 12,
    width: '100%',
  },
  themeSection: {
    paddingVertical: 12,
    width: '100%',
  },
  extraSection: {
    paddingVertical: 12,
    width: '100%',
  },
  exportSection: {
    paddingVertical: 6,
    width: '100%',
  },
  card: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  cardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardLeft: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  cardStatus: {
    fontSize: 14,
  },
  avatarContainer: {
    position: 'relative',
    width: 120,
    height: 120,
    marginBottom: 24,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 8,
    right: 8,
    width: 35,
    height: 35,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    marginBottom: 24,
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  usernameInput: {
    fontSize: 16,
    flex: 1,
    paddingVertical: 8,
  },
  usernameSuffix: {
    fontSize: 16,
  },
  profileButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    maxWidth: 500,
    alignSelf: 'center',
  },
  saveButton: {
    padding: 16,
    borderRadius: 8,
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    alignSelf: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonTextDisabled: {
    opacity: 0.5,
  },
  clearDataButton: {
    padding: 16,
    borderRadius: 8,
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    alignSelf: 'center',
  },
  clearDataButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    alignSelf: 'center',
    justifyContent: 'center',
    width: '100%',
    maxWidth: 500,
    marginRight: 0,
    paddingRight: 0,
    paddingLeft: 0,
    marginLeft: 0,
  },
  avatarContainerDisabled: {
    opacity: 0.5,
  },
  avatarEditBadgeDisabled: {
    opacity: 0.5,
  },
  usernameInputDisabled: {
    opacity: 0.5,
  },
  exportButton: {
    padding: 16,
    borderRadius: 8,
    width: '100%',
    maxWidth: 500,
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 8,
  },
  exportButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  exportButtonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  clearDataButtonContent: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    position: 'relative',
  },
  fingerprintIcon: {
    position: 'absolute',
    right: 0,
  },
  securitySection: {
    paddingVertical: 12,
    width: '100%',
  },
  appLockOption: {
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appLockLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  appLockIconContainer: {
    marginRight: 12,
  },
  appLockTextContainer: {
    flex: 1,
  },
  appLockTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  appLockDescription: {
    fontSize: 14,
    lineHeight: 18,
  },
  themeCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  themeCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  themeCardLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  themeIconContainer: {
    marginRight: 12,
  },
  themeTextContainer: {
    flex: 1,
  },
  themeTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  themeStatus: {
    fontSize: 14,
  },
  themeIndicator: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tapToChange: {
    fontSize: 12,
    fontWeight: '500',
  },
  themeCardTouchable: {
    width: '100%',
  },
});
