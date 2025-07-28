import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  TouchableOpacity,
  Dimensions,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Nfc, CheckCircle, XCircle, Settings } from 'lucide-react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';

interface NFCScanUIProps {
  // State props
  isNFCEnabled: boolean | null;
  scanState: 'ready' | 'scanning' | 'success' | 'error';
  
  // Event handlers
  onBackPress: () => void;
}

export default function NFCScanUI({
  isNFCEnabled,
  scanState,
  onBackPress,
}: NFCScanUIProps) {
  // Animation refs
  const glowAnimation = useRef(new Animated.Value(1)).current;
  const scanLineAnimation = useRef(new Animated.Value(0)).current;
  
  // Screen dimensions
  const { width: screenWidth } = Dimensions.get('window');
  const scanAreaSize = Math.min(screenWidth * 0.7, 280);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackgroundColor = useThemeColor({}, 'cardBackground');
  const primaryTextColor = useThemeColor({}, 'textPrimary');
  const secondaryTextColor = useThemeColor({}, 'textSecondary');
  const buttonPrimaryColor = useThemeColor({}, 'buttonPrimary');
  const buttonPrimaryTextColor = useThemeColor({}, 'buttonPrimaryText');
  const statusConnectedColor = useThemeColor({}, 'statusConnected');
  const statusErrorColor = useThemeColor({}, 'statusError');
  const statusWarningColor = useThemeColor({}, 'statusWarning');
  const borderPrimaryColor = useThemeColor({}, 'borderPrimary');
  const surfaceSecondaryColor = useThemeColor({}, 'surfaceSecondary');

  // Start glowing animation
  const startGlowAnimation = () => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnimation, {
          toValue: 1.3,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Start scan line animation
  const startScanLineAnimation = () => {
    scanLineAnimation.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(scanLineAnimation, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    ).start();
  };

  // Stop animations
  const stopAnimations = () => {
    glowAnimation.stopAnimation();
    scanLineAnimation.stopAnimation();
    Animated.timing(glowAnimation, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
    Animated.timing(scanLineAnimation, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  };

  // Handle animation state changes
  useEffect(() => {
    if (scanState === 'scanning' && isNFCEnabled) {
      startGlowAnimation();
      startScanLineAnimation();
    } else {
      stopAnimations();
    }
  }, [scanState, isNFCEnabled]);

  const scanMessage = isNFCEnabled === null
    ? 'Checking NFC status...'
    : isNFCEnabled
      ? scanState === 'scanning'
        ? 'Hold your device near an NFC tag to write'
        : scanState === 'success'
        ? 'NFC tag written successfully!'
        : scanState === 'error'
        ? 'Writing failed. Use retry button below to try again.'
        : 'Ready to write NFC tags'
      : 'Please enable NFC to use this feature';

  const getScanAreaColor = () => {
    if (isNFCEnabled === null) return borderPrimaryColor;
    if (!isNFCEnabled) return statusWarningColor;

    switch (scanState) {
      case 'scanning':
        return buttonPrimaryColor;
      case 'success':
        return statusConnectedColor;
      case 'error':
        return statusErrorColor;
      default:
        return buttonPrimaryColor;
    }
  };

  const getScanIcon = () => {
    if (isNFCEnabled === null) {
      return <ActivityIndicator size="large" color={borderPrimaryColor} />;
    }

    if (!isNFCEnabled) {
      return <Settings size={60} color={statusWarningColor} />;
    }

    switch (scanState) {
      case 'scanning':
        return (
          <Animated.View style={{ transform: [{ scale: glowAnimation }] }}>
            <Nfc size={60} color={buttonPrimaryColor} />
          </Animated.View>
        );
      case 'success':
        return <CheckCircle size={60} color={statusConnectedColor} />;
      case 'error':
        return <XCircle size={60} color={statusErrorColor} />;
      default:
        return <Nfc size={60} color={buttonPrimaryColor} />;
    }
  };

  const getActionButton = () => {
    if (isNFCEnabled === null) {
      return (
        <View style={[styles.actionButton, { backgroundColor: surfaceSecondaryColor }]}>
          <ActivityIndicator size="small" color={primaryTextColor} style={{ marginRight: 8 }} />
          <ThemedText style={[styles.actionButtonText, { color: primaryTextColor }]}>
            Checking NFC...
          </ThemedText>
        </View>
      );
    }

    // No button needed for scanning, success, or initial ready state
    return null;
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top']}>
      {/* Header */}
      <ThemedView style={styles.header}>
        <TouchableOpacity onPress={onBackPress} style={styles.backButton}>
          <ArrowLeft size={24} color={primaryTextColor} />
        </TouchableOpacity>
        <ThemedText style={[styles.headerText, { color: primaryTextColor }]}>
          NFC Scanner
        </ThemedText>
      </ThemedView>

      {/* Main Content */}
      <ThemedView style={styles.container}>
        {/* Status Card */}
        <ThemedView style={[styles.statusCard, { backgroundColor: cardBackgroundColor }]}>
          <ThemedText type="subtitle" style={[styles.statusTitle, { color: primaryTextColor }]}>
            {isNFCEnabled === null
              ? 'Checking NFC...'
              : isNFCEnabled
                ? scanState === 'scanning'
                  ? 'Writing...'
                  : scanState === 'success'
                  ? 'Scan Successful'
                  : scanState === 'error'
                  ? 'Scan Failed'
                  : 'NFC Ready'
                : 'NFC Required'
            }
          </ThemedText>
          <ThemedText style={[styles.statusMessage, { color: secondaryTextColor }]}>
            {scanMessage}
          </ThemedText>
        </ThemedView>

        {/* Scan Area */}
        <View style={styles.scanContainer}>
          <View
            style={[
              styles.scanArea,
              {
                width: scanAreaSize,
                height: scanAreaSize,
                borderColor: getScanAreaColor(),
                backgroundColor: surfaceSecondaryColor,
              },
            ]}
          >
            {/* Corner Indicators */}
            <View style={[styles.corner, styles.topLeft, { borderColor: getScanAreaColor() }]} />
            <View style={[styles.corner, styles.topRight, { borderColor: getScanAreaColor() }]} />
            <View style={[styles.corner, styles.bottomLeft, { borderColor: getScanAreaColor() }]} />
            <View style={[styles.corner, styles.bottomRight, { borderColor: getScanAreaColor() }]} />

            {/* Scan Line Animation - only show during scanning */}
            {scanState === 'scanning' && isNFCEnabled && (
              <Animated.View
                style={[
                  styles.scanLine,
                  {
                    backgroundColor: getScanAreaColor(),
                    transform: [
                      {
                        translateX: scanLineAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [-scanAreaSize / 2 + 10, scanAreaSize / 2 - 10], // Move from left to right within bounds
                        }),
                      },
                    ],
                  },
                ]}
              />
            )}

            {/* Center Icon */}
            <View style={styles.centerIcon}>
              {getScanIcon()}
            </View>
          </View>
        </View>

        {/* Instructions */}
        <ThemedView style={[styles.instructionsCard, { backgroundColor: cardBackgroundColor }]}>
          <ThemedText type="defaultSemiBold" style={[styles.instructionsTitle, { color: primaryTextColor }]}>
            {isNFCEnabled
              ? scanState === 'error'
                ? 'Scan Failed - Try Again:'
                : 'How to write Portal NFC Tags:'
              : 'How to Enable NFC:'
            }
          </ThemedText>
          {isNFCEnabled ? (
            <>
              <ThemedText style={[styles.instructionItem, { color: secondaryTextColor }]}>
                • NFC writing starts automatically once when enabled
              </ThemedText>
              <ThemedText style={[styles.instructionItem, { color: secondaryTextColor }]}>
                • Hold your device close to an NFC tag (within 4cm)
              </ThemedText>
              <ThemedText style={[styles.instructionItem, { color: secondaryTextColor }]}>
                • Keep the device steady until write completes
              </ThemedText>
            </>
          ) : (
            <>
              <ThemedText style={[styles.instructionItem, { color: secondaryTextColor }]}>
                • Tap "Open NFC Settings" below to access device settings
              </ThemedText>
              <ThemedText style={[styles.instructionItem, { color: secondaryTextColor }]}>
                • Enable NFC in your device settings
              </ThemedText>
              <ThemedText style={[styles.instructionItem, { color: secondaryTextColor }]}>
                • Make sure NFC is turned on for contactless features
              </ThemedText>
            </>
          )}
        </ThemedView>

        {/* Action Button */}
        {getActionButton() && (
          <View style={styles.actionContainer}>
            {getActionButton()}
          </View>
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  container: {
    flex: 1,
    padding: 16,
  },
  statusCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    alignItems: 'center',
  },
  statusTitle: {
    marginBottom: 8,
    textAlign: 'center',
  },
  statusMessage: {
    textAlign: 'center',
    lineHeight: 22,
  },
  monitoringIndicator: {
    marginTop: 8,
    textAlign: 'center',
    fontSize: 12,
    fontStyle: 'italic',
  },
  scanContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  scanArea: {
    borderWidth: 3,
    borderRadius: 20,
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderWidth: 3,
  },
  topLeft: {
    top: -3,
    left: -3,
    borderBottomWidth: 0,
    borderRightWidth: 0,
    borderTopLeftRadius: 20,
  },
  topRight: {
    top: -3,
    right: -3,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopRightRadius: 20,
  },
  bottomLeft: {
    bottom: -3,
    left: -3,
    borderTopWidth: 0,
    borderRightWidth: 0,
    borderBottomLeftRadius: 20,
  },
  bottomRight: {
    bottom: -3,
    right: -3,
    borderTopWidth: 0,
    borderLeftWidth: 0,
    borderBottomRightRadius: 20,
  },
  centerIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructionsCard: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  instructionsTitle: {
    marginBottom: 12,
  },
  instructionItem: {
    marginBottom: 6,
    lineHeight: 20,
  },
  actionContainer: {
    marginBottom: 16,
  },
  actionButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  scanLine: {
    position: 'absolute',
    width: 3,
    height: '100%',
    opacity: 0.8,
    shadowColor: '#000',
    shadowOffset: {
      width: 1,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3,
  },
}); 