import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ScrollView,
  Text,
  Animated,
  Dimensions,
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
import { useThemeColor } from '@/hooks/useThemeColor';

type ConnectionStatus = 'connected' | 'partial' | 'disconnected';

interface ConnectionStatusIndicatorProps {
  size?: number;
}

// Pure function for wallet status derivation - better performance and testability
const deriveWalletStatus = (
  nwcWallet: any,
  nwcConnectionStatus: boolean | null,
  isWalletConnectedState: boolean
) => {
  const isConfigured = Boolean(nwcWallet);
  if (!isConfigured) {
    return { configured: false, connected: false };
  }

  // Use real NWC connection status if available, otherwise fall back to wallet connected state
  const realWalletStatus =
    nwcConnectionStatus !== null ? nwcConnectionStatus : isWalletConnectedState;
  return { configured: true, connected: realWalletStatus };
};

export const ConnectionStatusIndicator: React.FC<ConnectionStatusIndicatorProps> = ({
  size = 12,
}) => {
  const router = useRouter();
  const [modalVisible, setModalVisible] = useState(false);
  const [scaleValue] = useState(new Animated.Value(1));
  const [opacityValue] = useState(new Animated.Value(1));
  const [isOnline, setIsOnline] = useState(true);
  const [showRelayDetails, setShowRelayDetails] = useState(false);

  // Get screen dimensions for modal height constraint
  const screenHeight = Dimensions.get('window').height;

  const {
    isWalletConnected: isWalletConnectedState,
    nwcWallet,
    getConnectionSummary,
    nwcConnectionStatus,
    nwcConnectionError,
  } = useNostrService();

  // Network connectivity detection
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOnline(state.isConnected ?? false);
    });
    return () => unsubscribe();
  }, []);

  // Memoized relay details from context
  const relayDetails: ConnectionSummary = useMemo(() => {
    return getConnectionSummary();
  }, [getConnectionSummary]);

  // Memoized wallet status - eliminates redundant effect and state
  const walletStatus = useMemo(() => {
    return deriveWalletStatus(nwcWallet, nwcConnectionStatus, isWalletConnectedState);
  }, [nwcWallet, nwcConnectionStatus, isWalletConnectedState]);

  // Optimized overall status calculation with fewer dependencies
  const overallConnectionStatus: ConnectionStatus = useMemo(() => {
    if (!isOnline) return 'disconnected';

    const statusChecks = [relayDetails.allRelaysConnected];

    // Only include wallet status if a wallet is actually configured
    if (walletStatus.configured) {
      statusChecks.push(walletStatus.connected);
    }

    const connectedCount = statusChecks.filter(Boolean).length;
    const totalChecks = statusChecks.length;

    if (connectedCount === totalChecks && totalChecks > 0) return 'connected';
    return 'partial';
  }, [isOnline, relayDetails.allRelaysConnected, walletStatus]);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor({}, 'cardBackground');
  const surfaceSecondaryColor = useThemeColor({}, 'surfaceSecondary');
  const surfaceTertiaryColor = useThemeColor({}, 'surfaceTertiary');
  const textPrimaryColor = useThemeColor({}, 'textPrimary');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const modalBackgroundColor = useThemeColor({}, 'modalBackground');
  const overlayBackgroundColor = useThemeColor({}, 'overlayBackground');
  const shadowColor = useThemeColor({}, 'shadowColor');
  const borderColor = useThemeColor({}, 'borderPrimary');
  const statusConnectedColor = useThemeColor({}, 'statusConnected');
  const statusConnectingColor = useThemeColor({}, 'statusConnecting');
  const statusDisconnectedColor = useThemeColor({}, 'statusDisconnected');

  // Use theme-aware status colors
  const getThemeStatusColor = (status: ConnectionStatus): string => {
    switch (status) {
      case 'connected':
        return statusConnectedColor;
      case 'partial':
        return statusConnectingColor;
      case 'disconnected':
        return statusDisconnectedColor;
      default:
        return statusDisconnectedColor;
    }
  };

  // Optimized animation effect with proper cleanup
  useEffect(() => {
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

  // Optimized press handler with better animation sequence
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

  // Pure helper functions - better testability
  const getConnectionIcon = (isConnected: boolean) => {
    return isConnected ? (
      <CheckCircle size={20} color={statusConnectedColor} />
    ) : (
      <XCircle size={20} color={statusDisconnectedColor} />
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
      params: { source: 'modal' },
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
              backgroundColor: getThemeStatusColor(overallConnectionStatus),
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
          style={[styles.modalOverlay, { backgroundColor: overlayBackgroundColor }]}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity
            style={[styles.modalContent, { backgroundColor: cardBackgroundColor }]}
            activeOpacity={1}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <ThemedText style={[styles.modalTitle, { color: textPrimaryColor }]}>
                Connection Status
              </ThemedText>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <X size={24} color={textSecondaryColor} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={true}>
              {/* Overall Status */}
              <View style={[styles.detailCard, { backgroundColor: cardBackgroundColor }]}>
                <View style={styles.detailRow}>
                  <View
                    style={[
                      styles.detailIcon,
                      { backgroundColor: useThemeColor({}, 'skeletonHighlight') },
                    ]}
                  >
                    <View
                      style={[
                        styles.overallStatusDot,
                        { backgroundColor: getThemeStatusColor(overallConnectionStatus) },
                      ]}
                    />
                  </View>
                  <View style={styles.detailContent}>
                    <ThemedText style={[styles.detailLabel, { color: textSecondaryColor }]}>
                      Overall Status
                    </ThemedText>
                    <ThemedText style={[styles.detailValue, { color: textPrimaryColor }]}>
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
                <>
                  {/* Relay Status - Separate Rounded Row */}
                  <View style={[styles.detailCard, { backgroundColor: surfaceSecondaryColor }]}>
                    <TouchableOpacity
                      style={styles.detailRow}
                      onPress={handleRelayNavigation}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.detailIcon, { backgroundColor: surfaceTertiaryColor }]}>
                        <Wifi
                          size={20}
                          color={
                            relayDetails.allRelaysConnected
                              ? statusConnectedColor
                              : statusConnectingColor
                          }
                        />
                      </View>
                      <View style={styles.detailContent}>
                        <ThemedText style={[styles.detailLabel, { color: textSecondaryColor }]}>
                          Relay Connections
                        </ThemedText>
                        <ThemedText style={[styles.detailValue, { color: textPrimaryColor }]}>
                          {relayDetails.allRelaysConnected ? 'All Connected' : 'Partial Connection'}
                        </ThemedText>
                        <ThemedText
                          style={[styles.detailDescription, { color: textSecondaryColor }]}
                        >
                          {relayDetails.relays.length > 0
                            ? (() => {
                                const connected = relayDetails.relays.filter(
                                  r => r.connected
                                ).length;
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
                            <ThemedText style={[styles.moreInfoText, { color: textPrimaryColor }]}>
                              {showRelayDetails ? 'Less info' : 'More info'}
                            </ThemedText>
                            <ThemedText
                              style={[
                                styles.moreInfoArrow,
                                {
                                  color: textPrimaryColor,
                                  transform: [{ rotate: showRelayDetails ? '180deg' : '0deg' }],
                                },
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
                                    return statusConnectedColor;
                                  case 'Connecting':
                                  case 'Pending':
                                  case 'Initialized':
                                    return statusConnectingColor;
                                  case 'Disconnected':
                                  case 'Terminated':
                                  case 'Banned':
                                    return statusDisconnectedColor;
                                  default:
                                    return statusDisconnectedColor;
                                }
                              };

                              // Get short relay name
                              const getShortRelayName = (url: string) => {
                                try {
                                  const hostname = new URL(url).hostname;
                                  return hostname
                                    .replace('relay.', '')
                                    .replace('.', '')
                                    .slice(0, 8);
                                } catch {
                                  return url.slice(0, 8);
                                }
                              };

                              return (
                                <View
                                  key={relay.url}
                                  style={[
                                    styles.detailedRelayItem,
                                    { backgroundColor: surfaceTertiaryColor },
                                  ]}
                                >
                                  <View style={styles.detailedRelayHeader}>
                                    <ThemedText
                                      style={[
                                        styles.detailedRelayName,
                                        { color: textPrimaryColor },
                                      ]}
                                    >
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
                                  <ThemedText
                                    style={[styles.detailedRelayUrl, { color: textSecondaryColor }]}
                                  >
                                    {relay.url}
                                  </ThemedText>
                                </View>
                              );
                            })}
                        </View>
                      </View>
                    )}
                  </View>

                  {/* Wallet - Separate Rounded Row */}
                  <View style={[styles.detailCard, { backgroundColor: surfaceSecondaryColor }]}>
                    <TouchableOpacity
                      style={styles.detailRow}
                      onPress={handleWalletNavigation}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.detailIcon, { backgroundColor: surfaceTertiaryColor }]}>
                        <Wallet
                          size={20}
                          color={
                            walletStatus.configured
                              ? walletStatus.connected
                                ? statusConnectedColor
                                : statusDisconnectedColor
                              : textSecondaryColor
                          }
                        />
                      </View>
                      <View style={styles.detailContent}>
                        <ThemedText style={[styles.detailLabel, { color: textSecondaryColor }]}>
                          Wallet Connection
                        </ThemedText>
                        <ThemedText style={[styles.detailValue, { color: textPrimaryColor }]}>
                          {walletStatus.configured
                            ? getStatusText(walletStatus.connected)
                            : 'Not configured'}
                        </ThemedText>
                        <ThemedText
                          style={[styles.detailDescription, { color: textSecondaryColor }]}
                        >
                          {walletStatus.configured
                            ? nwcConnectionError || 'NWC wallet configured'
                            : 'No wallet configured in settings'}
                        </ThemedText>
                      </View>
                      <View style={styles.detailRight}>
                        {walletStatus.configured ? (
                          getConnectionIcon(walletStatus.connected)
                        ) : (
                          <AlertCircle size={20} color={textSecondaryColor} />
                        )}
                      </View>
                    </TouchableOpacity>
                  </View>
                </>
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
    // backgroundColor handled by theme (overlayBackground)
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    // backgroundColor handled by theme (cardBackground)
    borderRadius: 12,
    padding: 20,
    width: '90%',
    maxWidth: 380,
    maxHeight: '60%',
    display: 'flex',
    flexDirection: 'column',
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
    // color handled by theme (textPrimary)
  },
  closeButton: {
    padding: 4,
  },
  detailCard: {
    // backgroundColor handled by theme
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    minHeight: 80,
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
    // backgroundColor handled by theme (skeletonHighlight)
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    // color handled by theme (textSecondary)
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 16,
    // color handled by theme (textPrimary)
    fontWeight: '500',
  },
  detailDescription: {
    fontSize: 14,
    // color handled by theme (textSecondary)
    marginTop: 2,
  },
  detailRight: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  separator: {
    height: 1,
    // backgroundColor handled by theme (borderPrimary)
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
    // color handled by theme (textPrimary)
    fontWeight: '500',
    marginRight: 6,
  },
  moreInfoArrow: {
    fontSize: 10,
    // color handled by theme (textPrimary)
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
    // backgroundColor handled by theme
    padding: 12,
    borderRadius: 12,
    marginBottom: 6,
  },
  detailedRelayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 2,
  },
  detailedRelayName: {
    fontSize: 13,
    // color handled by theme (textPrimary)
    fontWeight: '600',
  },
  detailedRelayStatus: {
    fontSize: 11,
    fontWeight: '500',
  },
  detailedRelayUrl: {
    fontSize: 10,
    // color handled by theme (textSecondary)
  },
  relayUrl: {
    fontSize: 12,
    // color handled by theme (textSecondary)
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    maxHeight: '80%',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
});
