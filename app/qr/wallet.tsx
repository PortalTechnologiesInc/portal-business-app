import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Colors } from '@/constants/Colors';
import { router } from 'expo-router';
import { useWallet } from '@/context/WalletContext';
import { ArrowLeft, Flashlight, FlashlightOff } from 'lucide-react-native';
import { Ionicons } from '@expo/vector-icons';

// Define the type for the barcode scanner result
type BarcodeResult = {
  type: string;
  data: string;
};

export default function WalletQRScannerScreen() {
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [enableTorch, setEnableTorch] = useState(false);
  const { setWalletUrl } = useWallet();

  const toggleTorch = () => {
    setEnableTorch(!enableTorch);
  };

  const handleBarCodeScanned = async (result: BarcodeResult) => {
    const { data } = result;
    setScanned(true);
    
    try {
      // Save the scanned wallet URL directly
      await setWalletUrl(data);
      
      // Show success message
      Alert.alert(
        "Success",
        "Wallet URL saved successfully",
        [
          {
            text: "OK",
            onPress: () => router.push('/wallet')
          }
        ]
      );
    } catch (error) {
      console.error('Error saving wallet URL:', error);
      Alert.alert(
        "Error",
        "Failed to save wallet URL. Please try again.",
        [
          {
            text: "OK",
            onPress: () => setScanned(false)
          }
        ]
      );
    }
  };

  if (!permission) {
    // Camera permissions are still loading
    return (
      <View style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (!permission.granted) {
    // Camera permissions are not granted yet
    return (
      <View style={styles.container}>
        <Text style={styles.instructions}>We need your permission to use the camera</Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={styles.camera}
        facing="back"
        enableTorch={enableTorch}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      >
        <View style={styles.overlay}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={28} color="white" />
          </TouchableOpacity>
          <View style={styles.upperSection} />
          <View style={styles.middleSection}>
            <View style={styles.leftSection} />
            <View style={styles.scanner}>
              <View style={styles.scannerCorner} />
              <View style={[styles.scannerCorner, styles.topRight]} />
              <View style={[styles.scannerCorner, styles.bottomRight]} />
              <View style={[styles.scannerCorner, styles.bottomLeft]} />
            </View>
            <View style={styles.rightSection} />
          </View>
          <View style={styles.lowerSection}>
            <TouchableOpacity style={styles.flashButton} onPress={toggleTorch}>
              {enableTorch ? (
                <Flashlight size={24} color="white" />
              ) : (
                <FlashlightOff size={24} color="white" />
              )}
            </TouchableOpacity>
            <Text style={styles.instructions}>Scan a wallet QR code</Text>
          </View>
        </View>
      </CameraView>

      {scanned && (
        <View style={styles.scannedOverlay}>
          <Text style={styles.scannedText}>Wallet URL Scanned!</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
    width: '100%',
  },
  overlay: {
    flex: 1,
  },
  upperSection: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  middleSection: {
    flexDirection: 'row',
    height: 250,
  },
  leftSection: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanner: {
    width: 250,
    height: 250,
    alignSelf: 'center',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  scannerCorner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: Colors.light.tint,
    borderWidth: 3,
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  topRight: {
    right: 0,
    top: 0,
    left: undefined,
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 0,
  },
  bottomRight: {
    right: 0,
    bottom: 0,
    top: undefined,
    left: undefined,
    borderLeftWidth: 0,
    borderRightWidth: 3,
    borderTopWidth: 0,
  },
  bottomLeft: {
    left: 0,
    bottom: 0,
    top: undefined,
    borderRightWidth: 0,
    borderTopWidth: 0,
  },
  rightSection: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  lowerSection: {
    flex: 2,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 30,
  },
  instructions: {
    color: 'white',
    fontSize: 16,
    marginTop: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
  },
  flashButton: {
    padding: 10,
    borderRadius: 50,
    backgroundColor: 'rgba(50, 50, 50, 0.8)',
  },
  permissionButton: {
    backgroundColor: Colors.light.tint,
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
  },
  permissionButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  scannedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannedText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
}); 