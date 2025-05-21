import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, BackHandler } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { router } from 'expo-router';
import { usePendingRequests } from '@/context/PendingRequestsContext';
import { parseAuthInitUrl } from 'portal-app-lib';
import { useNostrService } from '@/context/NostrServiceContext';

// Define the type for the barcode scanner result
type BarcodeResult = {
  type: string;
  data: string;
};

export default function QRScannerScreen() {
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [enableTorch, setEnableTorch] = useState(false);
  const { showSkeletonLoader } = usePendingRequests();
  const nostrService = useNostrService();

  // Handle hardware back button
  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      // Replace navigation stack to return to tabs cleanly
      router.replace('/(tabs)');
      return true;
    });

    return () => backHandler.remove();
  }, []);

  const toggleTorch = () => {
    // setEnableTorch(!enableTorch);

    // Show the skeleton loader
    const parsedUrl = parseAuthInitUrl("portal://npub1ek206p7gwgqzgc6s7sfedmlu87cz9894jzzq0283t72lhz3uuxwsgn9stz?relays=wss%3A%2F%2Frelay.nostr.net,wss%3A%2F%2Frelay.damus.io&token=4c254144-2dde-4ead-8a7d-83dcb5a48bfb");
    showSkeletonLoader(parsedUrl);
    nostrService.sendAuthInit(parsedUrl);

    // Use router.replace to completely replace the navigation stack
    // This will make it so that when the user gets to the home page,
    // there's no QR scanner page in the history
    setTimeout(() => {
      router.replace('/(tabs)');
    }, 300);
 
  };

  const handleBarCodeScanned = (result: BarcodeResult) => {
    // Prevent multiple scans
    if (scanned) return;

    const { type, data } = result;
    setScanned(true);
    console.log(`Bar code with type ${type} and data ${data} has been scanned!`);

    // Show the skeleton loader
    const parsedUrl = parseAuthInitUrl(data);
    showSkeletonLoader(parsedUrl);
    nostrService.sendAuthInit(parsedUrl);

    // Use router.replace to completely replace the navigation stack
    // This will make it so that when the user gets to the home page,
    // there's no QR scanner page in the history
    setTimeout(() => {
      router.replace('/(tabs)');
    }, 300);
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
          <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/(tabs)')}>
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
              <Ionicons name={enableTorch ? 'flash' : 'flash-off'} size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.instructions}>Position QR code in the scanner</Text>
          </View>
        </View>
      </CameraView>

      {scanned && (
        <View style={styles.scannedOverlay}>
          <Text style={styles.scannedText}>QR Code Scanned!</Text>
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
    borderTopWidth: 0,
    borderRightWidth: 3,
    borderBottomWidth: 3,
  },
  bottomLeft: {
    left: 0,
    bottom: 0,
    top: undefined,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomWidth: 3,
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
  flashButton: {
    padding: 10,
    borderRadius: 50,
    backgroundColor: 'rgba(50, 50, 50, 0.8)',
  },
  scannedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannedText: {
    color: Colors.light.tint,
    fontSize: 22,
    fontWeight: 'bold',
  },
  permissionButton: {
    marginTop: 20,
    padding: 12,
    backgroundColor: Colors.light.tint,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  backButton: {
    position: 'absolute',
    top: 50,
    left: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 50,
  },
});
