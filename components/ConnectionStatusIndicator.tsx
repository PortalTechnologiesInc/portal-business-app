import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Text,
  Animated,
} from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useNostrService } from '@/context/NostrServiceContext';
import { Wifi, WifiOff, Wallet, X, CheckCircle, AlertCircle, XCircle } from 'lucide-react-native';

type ConnectionStatus = 'connected' | 'partial' | 'disconnected';

interface ConnectionStatusIndicatorProps {
  size?: number;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  size = 12,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [scaleValue] = useState(new Animated.Value(1));
  const [opacityValue] = useState(new Animated.Value(1));
  const [isOnline, setIsOnline] = useState(true);
  const [relayStatus, setRelayStatus] = useState(false); // Will be updated with actual relay status

  const { isInitialized: nostrInitialized, isWalletConnected, nwcWallet } = useNostrService();

  // Network connectivity detection
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, []);

  // Calculate overall status
  const connectionStatus: ConnectionStatus = useMemo(() => {
    // If device is offline, status is disconnected
    if (!isOnline) return 'disconnected';

    // When online, check relay status and wallet (only if wallet is connected)
    const statusChecks = [relayStatus]; // Start with relay status

    // Only include wallet status if a wallet is actually connected
    if (nwcWallet) {
      statusChecks.push(isWalletConnected);
    }

    const connectedCount = statusChecks.filter(Boolean).length;
    const totalChecks = statusChecks.length;

    if (connectedCount === totalChecks && totalChecks > 0) return 'connected';
    if (connectedCount > 0) return 'partial';
    return 'disconnected';
  }, [isOnline, relayStatus, isWalletConnected, nwcWallet]);

  // Get status color
  const getStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case 'connected':
        return Colors.green;
      case 'partial':
        return '#FFA500'; // Orange
      case 'disconnected':
        return '#FF4444'; // Red
      default:
        return Colors.gray;
    }
  };

  // Pulse animation for non-green status
  React.useEffect(() => {
    if (connectionStatus !== 'connected') {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(opacityValue, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      opacityValue.setValue(1);
    }
  }, [connectionStatus, opacityValue]);

  // Handle press with animation
  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleValue, {
        toValue: 0.8,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleValue, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    setModalVisible(true);
  };

  const getConnectionIcon = (isConnected: boolean) => {
    return isConnected ? (
      <CheckCircle size={20} color={Colors.green} />
    ) : (
      <XCircle size={20} color="#FF4444" />
    );
  };

  const getStatusText = (isConnected: boolean) => {
    return isConnected ? 'Connected' : 'Disconnected';
  };

  return (
    <>
      <TouchableOpacity onPress={handlePress} style={styles.container} activeOpacity={0.7}>
        <Animated.View
          style={[
            styles.statusDot,
            {
              backgroundColor: getStatusColor(connectionStatus),
              width: size,
              height: size,
              borderRadius: size / 2,
              opacity: opacityValue,
              transform: [{ scale: scaleValue }],
            },
          ]}
        />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={styles.modalTitle}>Connection Status</ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <X size={24} color={Colors.dirtyWhite} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Overall Status */}
              <View style={styles.detailCard}>
                <View style={styles.detailRow}>
                  <View style={styles.detailIcon}>
                    <View
                      style={[
                        styles.overallStatusDot,
                        { backgroundColor: getStatusColor(connectionStatus) },
                      ]}
                    />
                  </View>
                  <View style={styles.detailContent}>
                    <ThemedText style={styles.detailLabel}>Overall Status</ThemedText>
                    <ThemedText style={styles.detailValue}>
                      {!isOnline && 'Device Offline'}
                      {isOnline && connectionStatus === 'connected' && 'All Systems Connected'}
                      {isOnline && connectionStatus === 'partial' && 'Partial Connection'}
                      {isOnline && connectionStatus === 'disconnected' && 'Connection Issues'}
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Connection Details - only show when online */}
              {isOnline && (
                <View style={styles.detailCard}>
                  {/* Relay Status */}
                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Wifi size={20} color={relayStatus ? Colors.green : '#FF4444'} />
                    </View>
                    <View style={styles.detailContent}>
                      <ThemedText style={styles.detailLabel}>Relay Connections</ThemedText>
                      <ThemedText style={styles.detailValue}>
                        {getStatusText(relayStatus)}
                      </ThemedText>
                      <ThemedText style={styles.detailDescription}>
                        Nostr relay connections for messaging
                      </ThemedText>
                    </View>
                    <View style={styles.detailRight}>{getConnectionIcon(relayStatus)}</View>
                  </View>

                  <View style={styles.separator} />

                  {/* Wallet */}
                  <View style={styles.detailRow}>
                    <View style={styles.detailIcon}>
                      <Wallet
                        size={20}
                        color={
                          nwcWallet ? (isWalletConnected ? Colors.green : '#FF4444') : Colors.gray
                        }
                      />
                    </View>
                    <View style={styles.detailContent}>
                      <ThemedText style={styles.detailLabel}>Wallet Connection</ThemedText>
                      <ThemedText style={styles.detailValue}>
                        {nwcWallet ? getStatusText(isWalletConnected) : 'Not connected'}
                      </ThemedText>
                      <ThemedText style={styles.detailDescription}>
                        {nwcWallet ? 'NWC wallet connected' : 'No wallet configured'}
                      </ThemedText>
                    </View>
                    <View style={styles.detailRight}>
                      {nwcWallet ? (
                        getConnectionIcon(isWalletConnected)
                      ) : (
                        <AlertCircle size={20} color={Colors.gray} />
                      )}
                    </View>
                  </View>
                </View>
              )}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
  },
  statusDot: {
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
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
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.almostWhite,
  },
  closeButton: {
    padding: 4,
  },
  detailCard: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
  },
  detailIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.dirtyWhite,
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    color: Colors.almostWhite,
    fontWeight: '500',
  },
  detailDescription: {
    fontSize: 14,
    color: Colors.dirtyWhite,
    marginTop: 2,
  },
  detailRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginVertical: 8,
  },
  overallStatusDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
});
