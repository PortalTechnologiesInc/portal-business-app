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
import { ArrowLeft, Pencil, X, QrCode, Check } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  getWalletUrl,
  saveWalletUrl,
  isWalletConnected,
  walletUrlEvents,
} from '@/services/SecureStorageService';

export default function WalletManagementScreen() {
  const router = useRouter();
  const [walletUrl, setWalletUrlState] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [scannedUrl, setScannedUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const hasChanged = inputValue !== walletUrl;
  const params = useLocalSearchParams();
  // Use a ref to track if we've handled the current scannedUrl
  const handledUrlRef = useRef<string | null>(null);

  // Load wallet data on mount
  useEffect(() => {
    const loadWalletData = async () => {
      try {
        const url = await getWalletUrl();
        const connected = await isWalletConnected();
        setWalletUrlState(url);
        setInputValue(url);
        setIsConnected(connected);
      } catch (error) {
        console.error('Error loading wallet data:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadWalletData();

    // Subscribe to wallet URL changes
    const subscription = walletUrlEvents.addListener('walletUrlChanged', async newUrl => {
      setWalletUrlState(newUrl || '');
      setIsConnected(Boolean(newUrl?.trim()));
    });

    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // Handle scanned URL from QR code - only process if it's not the same URL we've already handled
    const scannedUrlParam = params.scannedUrl as string | undefined;
    if (scannedUrlParam && scannedUrlParam !== handledUrlRef.current) {
      setScannedUrl(scannedUrlParam);
      setShowConfirmModal(true);
      handledUrlRef.current = scannedUrlParam;

      // Clear the URL parameter immediately to prevent re-processing
      // This prevents the infinite loop of rendering when the modal is displayed
      if (params.scannedUrl) {
        const { ...restParams } = params;
        router.setParams(restParams);
      }
    }
  }, [params, router]);

  // Handle hardware back button
  useEffect(() => {
    const handleHardwareBack = () => {
      // Navigate back to previous screen (settings)
      router.back();
      return true; // Prevent default behavior
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleHardwareBack);

    return () => backHandler.remove();
  }, [router]);

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

  const handleClearInput = async () => {
    setInputValue('');
    try {
      // Clear the wallet URL in storage
      await saveWalletUrl('');
      setWalletUrlState('');
      setIsConnected(false);
    } catch (error) {
      console.error('Error clearing wallet URL:', error);
      Alert.alert('Error', 'Failed to clear wallet URL. Please try again.');
    }
  };

  const handleSaveWalletUrl = async (urlToSave = inputValue) => {
    try {
      await saveWalletUrl(urlToSave);
      setWalletUrlState(urlToSave);
      setIsConnected(Boolean(urlToSave.trim()));
      setIsEditing(false);
      setShowConfirmModal(false);

      // Reset the handled URL reference to prevent duplicate processing
      handledUrlRef.current = null;

      // Get source and return parameters
      const sourceParam = params.source as string | undefined;
      const returnToWalletParam = params.returnToWallet as string | undefined;

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
    } catch (error) {
      console.error('Error saving wallet URL:', error);
      Alert.alert('Error', 'Failed to save wallet URL. Please try again.');
    }
  };

  const handleIconPress = () => {
    if (!isEditing) {
      // If not editing, start editing
      setIsEditing(true);
      return;
    }

    if (hasChanged) {
      // If value has changed, save it
      handleSaveWalletUrl();
    } else {
      // If value is the same and we're editing, clear it
      handleClearInput();
      setIsEditing(false);
    }
  };

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

  // Navigate back to previous screen
  const handleBackPress = () => {
    // Check navigation parameters
    const sourceParam = params.source as string | undefined;
    const returnToWalletParam = params.returnToWallet as string | undefined;

    // If we have a source param and it's not a QR scan from wallet itself, navigate directly to that screen
    if (sourceParam === 'settings') {
      router.replace('/settings');
    } else {
      // Otherwise use normal back navigation
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

          {/* Connection status */}
          <ThemedView style={styles.statusContainer}>
            <ThemedText style={styles.statusText}>
              Status: {isConnected ? 'Connected' : 'Not connected'}
            </ThemedText>
          </ThemedView>
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
