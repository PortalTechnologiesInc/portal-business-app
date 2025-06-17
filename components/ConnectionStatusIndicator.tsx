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
import { useRouter } from 'expo-router';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import {
  useNostrService,
  type RelayInfo,
  type ConnectionSummary,
} from '@/context/NostrServiceContext';
import { isWalletConnected, walletUrlEvents } from '@/services/SecureStorageService';
import { Wifi, WifiOff, Wallet, X, CheckCircle, AlertCircle, XCircle } from 'lucide-react-native';

type ConnectionStatus = 'connected' | 'partial' | 'disconnected';

interface ConnectionStatusIndicatorProps {
  size?: number;
}

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  size = 12,
}) => {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [scaleValue] = useState(new Animated.Value(1));
  const [opacityValue] = useState(new Animated.Value(1));
  const [isOnline, setIsOnline] = useState(true);
  const [isWalletConfigured, setIsWalletConfigured] = useState(false);
  const [showRelayDetails, setShowRelayDetails] = useState(false);

  const {
    isInitialized: nostrInitialized,
    isWalletConnected: isWalletConnectedState,
    nwcWallet,
    getConnectionSummary,
    nwcConnectionStatus,
    refreshNwcConnectionStatus,
    nwcConnectionError,
  } = useNostrService();

  // Network connectivity detection
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });

    return () => unsubscribe();
  }, []);

  // Check wallet configuration
  useEffect(() => {
    const checkWalletConfiguration = async () => {
      try {
        const configured = await isWalletConnected();
        setIsWalletConfigured(configured);
      } catch (error) {
        console.error('Error checking wallet configuration:', error);
        setIsWalletConfigured(false);
      }
    };

    checkWalletConfiguration();

    // Subscribe to wallet URL changes to update configuration status immediately
    const subscription = walletUrlEvents.addListener('walletUrlChanged', async newUrl => {
      setIsWalletConfigured(Boolean(newUrl?.trim()));
    });

    return () => subscription.remove();
  }, []);

  // Get relay details from context
  const relayDetails: ConnectionSummary = useMemo(() => {
    return getConnectionSummary();
  }, [getConnectionSummary]);

  // Calculate overall status
  const overallConnectionStatus: ConnectionStatus = useMemo(() => {
    // If device is offline, status is disconnected (red)
    if (!isOnline) return 'disconnected';

    // When online, check relay status and wallet (only if wallet is configured)
    const statusChecks = [];

    // Check relay status
    statusChecks.push(relayDetails.allRelaysConnected);

    // Only include wallet status if a wallet is actually configured
    if (isWalletConfigured) {
      // Use real NWC connection status if available, otherwise fall back to wallet connected state
      const realWalletStatus =
        nwcConnectionStatus !== null ? nwcConnectionStatus : isWalletConnectedState;
      statusChecks.push(realWalletStatus);
    }

    const connectedCount = statusChecks.filter(Boolean).length;
    const totalChecks = statusChecks.length;

    // Green only when ALL systems are connected
    if (connectedCount === totalChecks && totalChecks > 0) return 'connected';

    // Orange for any partial connection (some relays have issues OR wallet issues)
    // This means if even 1 relay is not "Connected", we show orange
    return 'partial';
  }, [
    isOnline,
    relayDetails.allRelaysConnected,
    isWalletConnectedState,
    isWalletConfigured,
    nwcConnectionStatus,
  ]);

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
    if (overallConnectionStatus !== 'connected') {
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
  }, [overallConnectionStatus, opacityValue]);

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

  // Navigation handlers
  const handleWalletNavigation = () => {
    setModalVisible(false);
    router.push({
      pathname: '/wallet',
      params: {
        source: 'modal',
      },
    });
  };

  const handleRelayNavigation = () => {
    setModalVisible(false);
    router.push('/relays');
  };

  return (
    <>
      <TouchableOpacity onPress={handlePress} style={styles.container} activeOpacity={0.7}>
        <Animated.View
          style={[
            styles.statusDot,
            {
              backgroundColor: getStatusColor(overallConnectionStatus),
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
                        { backgroundColor: getStatusColor(overallConnectionStatus) },
                      ]}
                    />
                  </View>
                  <View style={styles.detailContent}>
                    <ThemedText style={styles.detailLabel}>Overall Status</ThemedText>
                    <ThemedText style={styles.detailValue}>
                      {!isOnline && 'Device Offline'}
                      {isOnline &&
                        overallConnectionStatus === 'connected' &&
                        'All Systems Connected'}
                      {isOnline &&
                        overallConnectionStatus === 'partial' &&
                        'Connection Issues Detected'}
                      {isOnline &&
                        overallConnectionStatus === 'disconnected' &&
                        'Connection Issues'}
                    </ThemedText>
                  </View>
                </View>
              </View>

              {/* Connection Details - only show when online */}
              {isOnline && (
                <View style={styles.detailCard}>
                  {/* Relay Status */}
                  <TouchableOpacity
                    style={styles.detailRow}
                    onPress={handleRelayNavigation}
                    activeOpacity={0.7}
                  >
                    <View style={styles.detailIcon}>
                      <Wifi
                        size={20}
                        color={relayDetails.allRelaysConnected ? Colors.green : '#FFA500'}
                      />
                    </View>
                    <View style={styles.detailContent}>
                      <ThemedText style={styles.detailLabel}>Relay Connections</ThemedText>
                      <ThemedText style={styles.detailValue}>
                        {relayDetails.allRelaysConnected ? 'All Connected' : 'Partial Connection'}
                      </ThemedText>
                      <ThemedText style={styles.detailDescription}>
                        {relayDetails.relays.length > 0
                          ? (() => {
                              const connected = relayDetails.relays.filter(r => r.connected).length;
                              const total = relayDetails.relays.length;
                              return `${connected}/${total} relays connected`;
                            })()
                          : 'Nostr relay connections for messaging'}
                      </ThemedText>

                      {/* More Info Toggle */}
                      {relayDetails.relays.length > 0 && (
                        <TouchableOpacity
                          style={styles.moreInfoButton}
                          onPress={e => {
                            e.stopPropagation(); // Prevent parent row navigation
                            setShowRelayDetails(!showRelayDetails);
                          }}
                        >
                          <ThemedText style={styles.moreInfoText}>
                            {showRelayDetails ? 'Less info' : 'More info'}
                          </ThemedText>
                          <ThemedText
                            style={[
                              styles.moreInfoArrow,
                              { transform: [{ rotate: showRelayDetails ? '180deg' : '0deg' }] },
                            ]}
                          >
                            ▼
                          </ThemedText>
                        </TouchableOpacity>
                      )}
                    </View>
                    <View style={styles.detailRight}>
                      {getConnectionIcon(relayDetails.allRelaysConnected)}
                    </View>
                  </TouchableOpacity>

                  {/* Expandable Relay Details */}
                  {showRelayDetails && relayDetails.relays.length > 0 && (
                    <View style={styles.expandedRelayDetails}>
                      <View style={styles.compactRelayGrid}>
                        {relayDetails.relays
                          .slice() // Create a copy to avoid mutating original array
                          .sort((a, b) => a.url.localeCompare(b.url)) // Sort by URL for consistent order
                          .map((relay: RelayInfo) => {
                            // Get status color
                            const getStatusColor = (status: string) => {
                              switch (status) {
                                case 'Connected':
                                  return Colors.green;
                                case 'Connecting':
                                case 'Pending':
                                case 'Initialized':
                                  return '#FFA500';
                                case 'Disconnected':
                                case 'Terminated':
                                case 'Banned':
                                  return '#FF4444';
                                default:
                                  return Colors.gray;
                              }
                            };

                            // Get short relay name
                            const getShortRelayName = (url: string) => {
                              try {
                                const hostname = new URL(url).hostname;
                                return hostname.replace('relay.', '').replace('.', '').slice(0, 8);
                              } catch {
                                return url.slice(0, 8);
                              }
                            };

                            return (
                              <View key={relay.url} style={styles.detailedRelayItem}>
                                <View style={styles.detailedRelayHeader}>
                                  <ThemedText style={styles.detailedRelayName}>
                                    {getShortRelayName(relay.url)}
                                  </ThemedText>
                                  <ThemedText
                                    style={[
                                      styles.detailedRelayStatus,
                                      { color: getStatusColor(relay.status) },
                                    ]}
                                  >
                                    {relay.status}
                                  </ThemedText>
                                </View>
                                <ThemedText style={styles.detailedRelayUrl}>{relay.url}</ThemedText>
                              </View>
                            );
                          })}
                      </View>
                    </View>
                  )}

                  <View style={styles.separator} />

                  {/* Wallet */}
                  <TouchableOpacity
                    style={styles.detailRow}
                    onPress={handleWalletNavigation}
                    activeOpacity={0.7}
                  >
                    <View style={styles.detailIcon}>
                      <Wallet
                        size={20}
                        color={
                          isWalletConfigured
                            ? nwcConnectionStatus !== null
                              ? nwcConnectionStatus
                                ? Colors.green
                                : '#FF4444'
                              : isWalletConnectedState
                                ? Colors.green
                                : '#FF4444'
                            : Colors.gray
                        }
                      />
                    </View>
                    <View style={styles.detailContent}>
                      <ThemedText style={styles.detailLabel}>Wallet Connection</ThemedText>
                      <ThemedText style={styles.detailValue}>
                        {isWalletConfigured
                          ? nwcConnectionStatus !== null
                            ? getStatusText(nwcConnectionStatus)
                            : getStatusText(isWalletConnectedState)
                          : 'Not configured'}
                      </ThemedText>
                      <ThemedText style={styles.detailDescription}>
                        {isWalletConfigured
                          ? nwcConnectionError || 'NWC wallet configured'
                          : 'No wallet configured in settings'}
                      </ThemedText>
                    </View>
                    <View style={styles.detailRight}>
                      {isWalletConfigured ? (
                        nwcConnectionStatus !== null ? (
                          getConnectionIcon(nwcConnectionStatus)
                        ) : (
                          getConnectionIcon(isWalletConnectedState)
                        )
                      ) : (
                        <AlertCircle size={20} color={Colors.gray} />
                      )}
                    </View>
                  </TouchableOpacity>
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
    padding: 20,
    width: '90%',
    maxWidth: 380,
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
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
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
  moreInfoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    paddingVertical: 4,
  },
  moreInfoText: {
    fontSize: 12,
    color: Colors.almostWhite,
    fontWeight: '500',
    marginRight: 6,
  },
  moreInfoArrow: {
    fontSize: 10,
    color: Colors.almostWhite,
  },
  expandedRelayDetails: {
    marginTop: 12,
    paddingLeft: 16,
  },
  compactRelayGrid: {
    flexDirection: 'column',
    gap: 4,
  },
  detailedRelayItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: 8,
    borderRadius: 6,
  },
  detailedRelayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  detailedRelayName: {
    fontSize: 13,
    color: Colors.almostWhite,
    fontWeight: '600',
  },
  detailedRelayStatus: {
    fontSize: 11,
    fontWeight: '500',
  },
  detailedRelayUrl: {
    fontSize: 10,
    color: Colors.dirtyWhite,
  },
  relayUrl: {
    fontSize: 12,
    color: Colors.dirtyWhite,
  },
});
