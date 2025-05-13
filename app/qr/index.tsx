import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ActivityType, Currency } from '@/models/Activity';
import type { Activity } from '@/models/Activity';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { router } from 'expo-router';
import { getMockedActivities } from '@/mocks/Activities';
import { QRScanModal } from '@/components/QRScanModal';

// Define the type for the barcode scanner result
type BarcodeResult = {
  type: string;
  data: string;
};

// Define a simple type for our modal data
type ModalData = {
  name: string;
  amount?: number;
  currency?: string;
  detail: string;
};

export default function QRScannerScreen() {
  const [scanned, setScanned] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [enableTorch, setEnableTorch] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalData, setModalData] = useState<ModalData>({
    name: '',
    amount: 0,
    currency: Currency.Eur,
    detail: '',
  });

  const toggleTorch = () => {
    setEnableTorch(!enableTorch);
  };

  const handleBarCodeScanned = (result: BarcodeResult) => {
    const { type, data } = result;
    setScanned(true);
    console.log(`Bar code with type ${type} and data ${data} has been scanned!`);

    // For demo purposes, we'll randomly choose between payment and auth request
    // In a real app, you would parse the QR code data to determine the type and details
    const isPayment = Math.random() > 0.5; // 50% chance for payment, 50% for login

    if (isPayment) {
      // Create a payment request
      const requestData = {
        name: 'Demo Payment',
        amount: 1000, // 10.00 in the selected currency
        currency: Currency.Eur,
        detail: data.substring(0, 30) + (data.length > 30 ? '...' : ''),
      };
      setModalData(requestData);
      setModalVisible(true);
    } else {
      // Create an auth request
      const requestData = {
        name: 'Demo Login',
        detail: data.substring(0, 30) + (data.length > 30 ? '...' : ''),
      };
      setModalData(requestData);
      setModalVisible(true);
    }
  };

  const handleAccept = () => {
    // Determine the type of activity to create based on whether amount exists
    const isPayment = modalData.amount !== undefined;

    let newActivity: Activity;
    if (isPayment) {
      // Create a payment activity
      newActivity = {
        type: ActivityType.Pay,
        amount: modalData.amount || 0,
        currency: modalData.currency as Currency,
        name: modalData.name,
        detail: modalData.detail,
        date: new Date(),
      };
    } else {
      // Create an auth activity
      newActivity = {
        type: ActivityType.Auth,
        name: modalData.name,
        detail: modalData.detail,
        date: new Date(),
      };
    }

    console.log('Created new activity:', newActivity);

    // Add to mocked activities - this is a simulation as there's no global state
    try {
      const mockedActivities = getMockedActivities();
      mockedActivities.unshift(newActivity);
      console.log('Activity added to activities list');

      // Close modal
      setModalVisible(false);

      // Navigate to the activity list to show the result
      setTimeout(() => {
        router.push('/ActivityList');
      }, 500);
    } catch (error) {
      console.error('Error adding activity:', error);
    }
  };

  const handleDecline = () => {
    setModalVisible(false);
    // Reset scanner after closing modal
    setTimeout(() => {
      setScanned(false);
    }, 500);
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
              <Ionicons name={enableTorch ? 'flash' : 'flash-off'} size={24} color="white" />
            </TouchableOpacity>
            <Text style={styles.instructions}>Position QR code in the scanner</Text>
          </View>
        </View>
      </CameraView>

      {scanned && !modalVisible && (
        <View style={styles.scannedOverlay}>
          <Text style={styles.scannedText}>QR Code Scanned!</Text>
        </View>
      )}

      <QRScanModal
        visible={modalVisible}
        onClose={handleDecline}
        onAccept={handleAccept}
        requestType={modalData.amount !== undefined ? 'payment' : 'login'}
        data={modalData}
      />
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
