import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  View,
  Modal,
  BackHandler,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Pencil,
  X,
  QrCode,
  Check,
  AlertTriangle,
  CheckCircle,
  XCircle,
} from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getWalletUrl,
  saveWalletUrl,
  isWalletConnected,
  walletUrlEvents,
} from '@/services/SecureStorageService';
import { useNostrService } from '@/context/NostrServiceContext';
import { useThemeColor } from '@/hooks/useThemeColor';

// NWC connection states
type NwcConnectionState = 'none' | 'connecting' | 'connected' | 'disconnected' | 'error';

// Pure function for NWC URL validation - better testability and reusability
const validateNwcUrl = (url: string): { isValid: boolean; error?: string } => {
  if (!url.trim()) {
    return { isValid: false, error: 'URL cannot be empty' };
  }

  try {
    const urlObj = new URL(url);

    if (!url.startsWith('nostr+walletconnect://')) {
      return { isValid: false, error: 'URL must start with nostr+walletconnect://' };
    }

    const searchParams = urlObj.searchParams;
    const relay = searchParams.get('relay');
    const secret = searchParams.get('secret');

    if (!relay) {
      return { isValid: false, error: 'Missing relay parameter' };
    }
    if (!secret) {
      return { isValid: false, error: 'Missing secret parameter' };
    }
    if (!relay.startsWith('wss://') && !relay.startsWith('ws://')) {
      return { isValid: false, error: 'Relay must be a websocket URL (wss:// or ws://)' };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Invalid URL format' };
  }
};

// Pure function for connection state derivation - eliminates complex state management
const deriveConnectionState = (
  walletUrl: string,
  nwcConnectionStatus: boolean | null,
  nwcConnectionError: string | null,
  isValidating: boolean
): { state: NwcConnectionState; error: string } => {
  if (!walletUrl.trim()) {
    return { state: 'none', error: '' };
  }

  if (isValidating || nwcConnectionStatus === null) {
    return { state: 'connecting', error: '' };
  }

  if (nwcConnectionStatus === true) {
    return { state: 'connected', error: '' };
  }

  return {
    state: 'disconnected',
    error: nwcConnectionError || 'Unable to connect to wallet service',
  };
};

export default function WalletManagementScreen() {
  const router = useRouter();
  const [walletUrl, setWalletUrlState] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [scannedUrl, setScannedUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isValidating, setIsValidating] = useState(false);
  const hasChanged = inputValue !== walletUrl;
  const params = useLocalSearchParams();
  const handledUrlRef = useRef<string | null>(null);

  const { nwcConnectionStatus, nwcConnectionError, refreshNwcConnectionStatus } = useNostrService();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor({}, 'cardBackground');
  const surfaceSecondaryColor = useThemeColor({}, 'surfaceSecondary');
  const primaryTextColor = useThemeColor({}, 'textPrimary');
  const secondaryTextColor = useThemeColor({}, 'textSecondary');
  const inputBackgroundColor = useThemeColor({}, 'inputBackground');
  const inputBorderColor = useThemeColor({}, 'inputBorder');
  const inputPlaceholderColor = useThemeColor({}, 'inputPlaceholder');
  const buttonPrimaryColor = useThemeColor({}, 'buttonPrimary');
  const buttonPrimaryTextColor = useThemeColor({}, 'buttonPrimaryText');
  const statusConnectedColor = useThemeColor({}, 'statusConnected');
  const statusConnectingColor = useThemeColor({}, 'statusConnecting');
  const statusErrorColor = useThemeColor({}, 'statusError');
  const shadowColor = useThemeColor({}, 'shadowColor');
  const modalBackgroundColor = useThemeColor({}, 'modalBackground');

  // Memoized connection state derivation - eliminates complex state updates
  const connectionState = useMemo(() => {
    return deriveConnectionState(walletUrl, nwcConnectionStatus, nwcConnectionError, isValidating);
  }, [walletUrl, nwcConnectionStatus, nwcConnectionError, isValidating]);

  // Optimized wallet data loading with better error handling
  const loadWalletData = useCallback(async () => {
    try {
      const [url, connected] = await Promise.all([getWalletUrl(), isWalletConnected()]);

      setWalletUrlState(url);
      setInputValue(url);

      // Use real NWC connection status if available
      const realConnectionStatus = nwcConnectionStatus !== null ? nwcConnectionStatus : connected;
      setIsConnected(realConnectionStatus);
    } catch (error) {
      console.error('Error loading wallet data:', error);
      // Error state is handled by connectionState derivation
    } finally {
      setIsLoading(false);
    }
  }, [nwcConnectionStatus]);

  // Initial load effect
  useEffect(() => {
    loadWalletData();
  }, [loadWalletData]);

  // Monitor NWC connection status when wallet page is focused
  useFocusEffect(
    useCallback(() => {
      console.log('🔐 Entered Wallet Page: Starting NWC connection monitoring');

      // Only refresh NWC status if we have a wallet configured
      if (walletUrl && walletUrl.trim()) {
        // Initial check when entering the page
        refreshNwcConnectionStatus();

        // Set up periodic refresh for NWC connection status
        const interval = setInterval(() => {
          if (walletUrl && walletUrl.trim()) {
            refreshNwcConnectionStatus();
          }
        }, 8000); // Check every 8 seconds (less frequent than homepage to reduce load)

        return () => {
          console.log('🔐 Left Wallet Page: Stopping NWC connection monitoring');
          clearInterval(interval);
        };
      } else {
        console.log('🔐 No wallet configured, skipping NWC monitoring');
        return () => {}; // No cleanup needed if no wallet
      }
    }, [walletUrl]) // Only depend on walletUrl to avoid unnecessary re-runs
  );

  // Optimized wallet URL change subscription with proper cleanup
  useEffect(() => {
    const subscription = walletUrlEvents.addListener('walletUrlChanged', async newUrl => {
      setWalletUrlState(newUrl || '');
      setIsConnected(Boolean(newUrl?.trim()));
    });

    return () => subscription.remove();
  }, []);

  // Optimized NWC status effect with better dependency management
  useEffect(() => {
    if (nwcConnectionStatus !== null) {
      setIsConnected(nwcConnectionStatus);

      // Stop validating when we have a definitive status
      if (isValidating) {
        setIsValidating(false);
      }
    }
  }, [nwcConnectionStatus, isValidating]);

  // Scanned URL handling effect
  useEffect(() => {
    const scannedUrlParam = params.scannedUrl as string | undefined;
    if (scannedUrlParam && scannedUrlParam !== handledUrlRef.current) {
      setScannedUrl(scannedUrlParam);
      setShowConfirmModal(true);
      handledUrlRef.current = scannedUrlParam;

      if (params.scannedUrl) {
        const { ...restParams } = params;
        router.setParams(restParams);
      }
    }
  }, [params, router]);

  // Optimized clear input handler with better async handling
  const handleClearInput = useCallback(async () => {
    setInputValue('');
    try {
      await saveWalletUrl('');
      setWalletUrlState('');
      setIsConnected(false);

      // Refresh NWC connection status after clearing
      try {
        await refreshNwcConnectionStatus();
      } catch (error) {
        console.error('Error refreshing NWC connection status after clear:', error);
      }
    } catch (error) {
      console.error('Error clearing wallet URL:', error);
      Alert.alert('Error', 'Failed to clear wallet URL. Please try again.');
    }
  }, [refreshNwcConnectionStatus]);

  // Optimized validation and save with better state management
  const validateAndSaveWalletUrl = useCallback(
    async (urlToSave = inputValue) => {
      const validation = validateNwcUrl(urlToSave);
      if (!validation.isValid) {
        Alert.alert('Invalid URL', validation.error || 'Invalid URL format');
        return false;
      }

      try {
        setIsValidating(true);

        await saveWalletUrl(urlToSave);
        setWalletUrlState(urlToSave);
        setIsConnected(Boolean(urlToSave.trim()));
        setIsEditing(false);
        setShowConfirmModal(false);

        handledUrlRef.current = null;
        router.setParams({});

        // Trigger immediate refresh of NWC connection status for faster UI feedback
        try {
          await refreshNwcConnectionStatus();
        } catch (error) {
          console.error('Error refreshing NWC connection status after save:', error);
        }

        // Set timeout to prevent infinite validating state
        const timeoutId = setTimeout(() => {
          if (isValidating) {
            console.log('Wallet connection validation timeout');
            setIsValidating(false);
          }
        }, 15000);

        return () => clearTimeout(timeoutId);
      } catch (error) {
        console.error('Error saving wallet URL:', error);
        Alert.alert('Error', 'Failed to save wallet URL. Please try again.');
        return false;
      } finally {
        setIsValidating(false);
      }
    },
    [inputValue, isValidating, router]
  );

  const handleScanQrCode = () => {
    // Navigate to wallet QR scanner with returnToWallet parameter
    router.push({
      pathname: '/qr/wallet',
      params: {
        source: 'wallet',
        returnToWallet: 'true',
      },
    });
  };

  const handleIconPress = () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    if (hasChanged) {
      validateAndSaveWalletUrl();
    } else {
      handleClearInput();
      setIsEditing(false);
    }
  };

  // Legacy function for QR code flow compatibility
  const handleSaveWalletUrl = async (urlToSave = inputValue) => {
    return await validateAndSaveWalletUrl(urlToSave);
  };

  // Manual refresh function for connection status
  const handleRefreshConnection = useCallback(async () => {
    if (walletUrl && walletUrl.trim()) {
      console.log('🔄 Manual NWC connection refresh triggered');
      await refreshNwcConnectionStatus();
    }
  }, [walletUrl, refreshNwcConnectionStatus]);

  const handleCloseModal = () => {
    setShowConfirmModal(false);
    setScannedUrl('');

    // Get navigation parameters
    const sourceParam = params.source as string | undefined;
    const returnToWalletParam = params.returnToWallet as string | undefined;

    // Clear the handled URL ref to prevent duplicate processing
    handledUrlRef.current = null;

    // Clear all params first to prevent infinite loops
    router.setParams({});

    // Check if we should return to wallet management (from QR scan inside wallet management)
    if (returnToWalletParam === 'true') {
      // Already cleared params, so no need to navigate
      return;
    }

    // Otherwise, navigate back to the source screen if specified
    if (sourceParam === 'settings') {
      setTimeout(() => {
        router.replace('/settings');
      }, 100);
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ThemedView style={styles.container}>
          <ThemedView style={styles.header}>
            <ThemedText
              style={styles.headerText}
              lightColor={Colors.darkGray}
              darkColor={Colors.almostWhite}
            >
              Wallet Management
            </ThemedText>
          </ThemedView>
          <ThemedView style={styles.content}>
            <ThemedText>Loading...</ThemedText>
          </ThemedView>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top']}>
      <ThemedView style={[styles.container, { backgroundColor }]}>
        <ThemedView style={[styles.header, { backgroundColor }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={20} color={primaryTextColor} />
          </TouchableOpacity>
          <ThemedText style={[styles.headerText, { color: primaryTextColor }]}>
            Wallet Management
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.content}>
          <ThemedText style={[styles.description, { color: secondaryTextColor }]}>
            Connect your wallet by entering the wallet URL below or scanning a QR code. This allows
            you to manage your crypto assets and make seamless transactions within the app.
          </ThemedText>

          {/* Wallet URL Input with QR Code button */}
          <View style={styles.walletUrlContainer}>
            <View style={styles.walletUrlInputContainer}>
              <TextInput
                style={[
                  styles.walletUrlInput,
                  { color: primaryTextColor, borderBottomColor: inputBorderColor },
                ]}
                value={inputValue}
                onChangeText={setInputValue}
                placeholder="Enter wallet URL"
                placeholderTextColor={inputPlaceholderColor}
                onFocus={() => setIsEditing(true)}
              />
              <TouchableOpacity style={styles.walletUrlAction} onPress={handleIconPress}>
                {!isEditing ? (
                  <Pencil size={20} color={primaryTextColor} />
                ) : hasChanged ? (
                  <Check size={20} color={statusConnectedColor} />
                ) : (
                  <X size={20} color={primaryTextColor} />
                )}
              </TouchableOpacity>
            </View>
            <TouchableOpacity
              style={[styles.qrCodeButton, { backgroundColor: cardBackgroundColor }]}
              onPress={handleScanQrCode}
            >
              <QrCode size={24} color={primaryTextColor} />
            </TouchableOpacity>
          </View>

          {/* Connection Status Display */}
          <View
            style={[styles.connectionStatusContainer, { backgroundColor: cardBackgroundColor }]}
          >
            <View style={styles.connectionStatusRow}>
              <View
                style={[styles.connectionStatusIcon, { backgroundColor: surfaceSecondaryColor }]}
              >
                {connectionState.state === 'connected' && (
                  <CheckCircle size={20} color={statusConnectedColor} />
                )}
                {connectionState.state === 'connecting' && (
                  <View style={styles.loadingSpinner}>
                    <CheckCircle size={20} color={statusConnectingColor} />
                  </View>
                )}
                {connectionState.state === 'disconnected' && (
                  <XCircle size={20} color={statusErrorColor} />
                )}
                {connectionState.state === 'error' && (
                  <AlertTriangle size={20} color={statusErrorColor} />
                )}
                {connectionState.state === 'none' && (
                  <AlertTriangle size={20} color={secondaryTextColor} />
                )}
              </View>
              <View style={styles.connectionStatusContent}>
                <ThemedText style={[styles.connectionStatusLabel, { color: primaryTextColor }]}>
                  Wallet Connection
                </ThemedText>
                <ThemedText
                  style={[
                    styles.connectionStatusValue,
                    connectionState.state === 'connected' && { color: statusConnectedColor },
                    connectionState.state === 'connecting' && { color: statusConnectingColor },
                    (connectionState.state === 'disconnected' ||
                      connectionState.state === 'error') && {
                      color: statusErrorColor,
                    },
                    connectionState.state === 'none' && { color: secondaryTextColor },
                  ]}
                >
                  {connectionState.state === 'connected' && 'Connected'}
                  {connectionState.state === 'connecting' && 'Connecting...'}
                  {connectionState.state === 'disconnected' && 'Disconnected'}
                  {connectionState.state === 'error' && 'Connection Error'}
                  {connectionState.state === 'none' && 'No Wallet Configured'}
                </ThemedText>
                {connectionState.error && (
                  <ThemedText style={[styles.connectionStatusError, { color: statusErrorColor }]}>
                    {connectionState.error}
                  </ThemedText>
                )}
                {connectionState.state === 'none' && (
                  <ThemedText
                    style={[styles.connectionStatusDescription, { color: secondaryTextColor }]}
                  >
                    Enter a wallet URL above to connect your wallet
                  </ThemedText>
                )}
              </View>
              {/* Refresh button for manual connection check */}
              {walletUrl && walletUrl.trim() && connectionState.state !== 'connecting' && (
                <TouchableOpacity
                  style={[styles.refreshButton, { backgroundColor: surfaceSecondaryColor }]}
                  onPress={handleRefreshConnection}
                >
                  <ThemedText style={[styles.refreshButtonText, { color: primaryTextColor }]}>
                    ↻
                  </ThemedText>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ThemedView>

        {/* Confirmation Modal for scanned URL */}
        <Modal
          visible={showConfirmModal}
          transparent={true}
          animationType="fade"
          onRequestClose={handleCloseModal}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <ThemedText style={styles.modalTitle}>Confirm Wallet URL</ThemedText>

              <ThemedText style={styles.modalText}>
                Do you want to connect to this wallet?
              </ThemedText>

              <ThemedText style={styles.modalUrl}>{scannedUrl}</ThemedText>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonCancel]}
                  onPress={handleCloseModal}
                >
                  <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modalButton, styles.modalButtonConfirm]}
                  onPress={() => handleSaveWalletUrl(scannedUrl)}
                >
                  <ThemedText style={styles.modalButtonText}>Connect</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    // backgroundColor handled by theme
  },
  container: {
    flex: 1,
    // backgroundColor handled by theme
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    // backgroundColor handled by theme
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
    paddingVertical: 20,
  },
  description: {
    // color handled by theme
    fontSize: 16,
    lineHeight: 24,
    marginBottom: 24,
  },
  walletUrlContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  walletUrlInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    // borderBottomColor handled by theme
    marginRight: 12,
  },
  walletUrlInput: {
    flex: 1,
    // color handled by theme
    fontSize: 16,
    paddingVertical: 8,
  },
  walletUrlAction: {
    paddingHorizontal: 8,
  },
  qrCodeButton: {
    // backgroundColor handled by theme
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  statusText: {
    fontSize: 16,
    color: Colors.almostWhite,
  },
  connectionStatusContainer: {
    // backgroundColor handled by theme
    borderRadius: 20,
    padding: 16,
    marginTop: 16,
    minHeight: 80,
  },
  connectionStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionStatusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    // backgroundColor handled by theme
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  loadingSpinner: {
    // Could add rotation animation here if needed
  },
  connectionStatusContent: {
    flex: 1,
  },
  connectionStatusLabel: {
    fontSize: 14,
    color: Colors.dirtyWhite,
    marginBottom: 4,
  },
  connectionStatusValue: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  connectionStatusError: {
    fontSize: 13,
    color: '#FF4444',
    fontStyle: 'italic',
  },
  connectionStatusDescription: {
    fontSize: 13,
    color: Colors.gray,
    fontStyle: 'italic',
  },
  refreshButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  refreshButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#121212',
    borderRadius: 12,
    padding: 24,
    width: '85%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.almostWhite,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: Colors.almostWhite,
    marginBottom: 16,
    textAlign: 'center',
  },
  modalUrl: {
    fontSize: 14,
    color: Colors.light.tint,
    marginBottom: 24,
    textAlign: 'center',
    padding: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 6,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  modalButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: Colors.darkGray,
    marginRight: 8,
  },
  modalButtonConfirm: {
    backgroundColor: Colors.light.tint,
    marginLeft: 8,
  },
  modalButtonText: {
    color: Colors.almostWhite,
    fontSize: 16,
    fontWeight: 'bold',
  },
});
