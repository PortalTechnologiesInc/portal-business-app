import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  View,
  Modal,
  BackHandler,
} from 'react-native';
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
import { getWalletUrl, saveWalletUrl } from '@/services/SecureStorageService';
import { useNostrService } from '@/context/NostrServiceContext';

// Simple validation function
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

export default function WalletManagementScreen() {
  const router = useRouter();
  const [walletUrl, setWalletUrlState] = useState('');
  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [scannedUrl, setScannedUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const hasChanged = inputValue !== walletUrl;
  const params = useLocalSearchParams();
  const handledUrlRef = useRef<string | null>(null);

  // Use context as single source of truth
  const { nwcConnectionStatus, nwcConnectionError } = useNostrService();

  // Simple connection state derivation
  const getConnectionState = () => {
    if (!walletUrl) return 'none';
    if (nwcConnectionStatus === null) return 'connecting';
    if (nwcConnectionStatus === true) return 'connected';
    return 'disconnected';
  };

  const getConnectionDisplay = () => {
    const state = getConnectionState();
    switch (state) {
      case 'none':
        return {
          icon: <AlertTriangle size={20} color={Colors.gray} />,
          text: 'No Wallet Configured',
          color: Colors.gray,
          description: 'Enter a wallet URL above to connect your wallet',
        };
      case 'connecting':
        return {
          icon: <CheckCircle size={20} color="#FFA500" />,
          text: 'Connecting...',
          color: '#FFA500',
          description: null,
        };
      case 'connected':
        return {
          icon: <CheckCircle size={20} color={Colors.green} />,
          text: 'Connected',
          color: Colors.green,
          description: null,
        };
      case 'disconnected':
        return {
          icon: <XCircle size={20} color="#FF4444" />,
          text: 'Disconnected',
          color: '#FF4444',
          description: nwcConnectionError || 'Unable to connect to wallet service',
        };
    }
  };

  // Load wallet data on mount
  useEffect(() => {
    const loadWalletData = async () => {
      try {
        const url = await getWalletUrl();
        setWalletUrlState(url);
        setInputValue(url);
      } catch (error) {
        console.error('Error loading wallet data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWalletData();
  }, []);

  // Handle scanned URL from QR code
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

  // Handle hardware back button
  useEffect(() => {
    const handleHardwareBack = () => {
      router.back();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);
    return () => backHandler.remove();
  }, [router]);

  const handleScanQrCode = () => {
    router.push({
      pathname: '/qr/wallet',
      params: {
        source: 'wallet',
        returnToWallet: 'true',
      },
    });
  };

  const handleClearInput = async () => {
    setInputValue('');
    try {
      await saveWalletUrl('');
      setWalletUrlState('');
    } catch (error) {
      console.error('Error clearing wallet URL:', error);
      Alert.alert('Error', 'Failed to clear wallet URL. Please try again.');
    }
  };

  const handleSaveWalletUrl = async (urlToSave = inputValue) => {
    // Validate URL format first
    const validation = validateNwcUrl(urlToSave);
    if (!validation.isValid) {
      Alert.alert('Invalid URL', validation.error || 'Invalid URL format');
      return false;
    }

    try {
      await saveWalletUrl(urlToSave);
      setWalletUrlState(urlToSave);
      setIsEditing(false);
      setShowConfirmModal(false);
      handledUrlRef.current = null;
      router.setParams({});
      return true;
    } catch (error) {
      console.error('Error saving wallet URL:', error);
      Alert.alert('Error', 'Failed to save wallet URL. Please try again.');
      return false;
    }
  };

  const handleIconPress = () => {
    if (!isEditing) {
      setIsEditing(true);
      return;
    }

    if (hasChanged) {
      handleSaveWalletUrl();
    } else {
      handleClearInput();
      setIsEditing(false);
    }
  };

  const handleCloseModal = () => {
    setShowConfirmModal(false);
    setScannedUrl('');
    handledUrlRef.current = null;
    router.setParams({});
  };

  const handleBackPress = () => {
    const sourceParam = params.source as string | undefined;
    if (sourceParam === 'settings') {
      router.replace('/settings');
    } else {
      router.back();
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

  const connectionDisplay = getConnectionDisplay();

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <TouchableOpacity onPress={handleBackPress} style={styles.backButton}>
            <ArrowLeft size={20} color={Colors.almostWhite} />
          </TouchableOpacity>
          <ThemedText
            style={styles.headerText}
            lightColor={Colors.darkGray}
            darkColor={Colors.almostWhite}
          >
            Wallet Management
          </ThemedText>
        </ThemedView>

        <ThemedView style={styles.content}>
          <ThemedText style={styles.description}>
            Connect your wallet by entering the wallet URL below or scanning a QR code. This allows
            you to manage your crypto assets and make seamless transactions within the app.
          </ThemedText>

          {/* Wallet URL Input with QR Code button */}
          <View style={styles.walletUrlContainer}>
            <View style={styles.walletUrlInputContainer}>
              <TextInput
                style={styles.walletUrlInput}
                value={inputValue}
                onChangeText={setInputValue}
                placeholder="Enter wallet URL"
                placeholderTextColor={Colors.gray}
                onFocus={() => setIsEditing(true)}
              />
              <TouchableOpacity style={styles.walletUrlAction} onPress={handleIconPress}>
                {!isEditing ? (
                  <Pencil size={20} color={Colors.almostWhite} />
                ) : hasChanged ? (
                  <Check size={20} color={Colors.green} />
                ) : (
                  <X size={20} color={Colors.almostWhite} />
                )}
              </TouchableOpacity>
            </View>
            <TouchableOpacity style={styles.qrCodeButton} onPress={handleScanQrCode}>
              <QrCode size={24} color={Colors.almostWhite} />
            </TouchableOpacity>
          </View>

          {/* Connection Status Display */}
          <View style={styles.connectionStatusContainer}>
            <View style={styles.connectionStatusRow}>
              <View style={styles.connectionStatusIcon}>{connectionDisplay.icon}</View>
              <View style={styles.connectionStatusContent}>
                <ThemedText style={styles.connectionStatusLabel}>Wallet Connection</ThemedText>
                <ThemedText
                  style={[styles.connectionStatusValue, { color: connectionDisplay.color }]}
                >
                  {connectionDisplay.text}
                </ThemedText>
                {connectionDisplay.description && (
                  <ThemedText style={styles.connectionStatusDescription}>
                    {connectionDisplay.description}
                  </ThemedText>
                )}
              </View>
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
    backgroundColor: '#000000',
  },
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 20,
    backgroundColor: '#000000',
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
    color: Colors.almostWhite,
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
    borderBottomColor: Colors.gray,
    marginRight: 12,
  },
  walletUrlInput: {
    flex: 1,
    color: Colors.almostWhite,
    fontSize: 16,
    paddingVertical: 8,
  },
  walletUrlAction: {
    paddingHorizontal: 8,
  },
  qrCodeButton: {
    backgroundColor: Colors.darkGray,
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
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
  },
  connectionStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  connectionStatusIcon: {
    marginRight: 12,
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
  connectionStatusDescription: {
    fontSize: 13,
    color: '#FF4444',
    fontStyle: 'italic',
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
