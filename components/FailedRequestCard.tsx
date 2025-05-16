import type React from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { ThemedText } from './ThemedText';
import { Colors } from '@/constants/Colors';
import { AlertTriangle, RefreshCw } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 50; // Full width minus padding

// Colors
const WARNING_COLOR = '#FFB142'; // Orange warning color

interface FailedRequestCardProps {
  onRetry: () => void;
  onCancel: () => void;
}

export const FailedRequestCard: React.FC<FailedRequestCardProps> = ({ onRetry, onCancel }) => {
  return (
    <View style={styles.card}>
      {/* Request type row */}
      <ThemedText style={styles.requestType}>Request Status</ThemedText>

      {/* Title row with icon */}
      <View style={styles.titleRow}>
        <AlertTriangle size={22} color={WARNING_COLOR} style={styles.titleIcon} />
        <ThemedText style={styles.serviceName}>Request Failed</ThemedText>
      </View>

      <ThemedText style={styles.serviceInfo}>
        The request timed out. Would you like to try again?
      </ThemedText>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onCancel}>
          <ThemedText style={styles.buttonText}>Cancel</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, styles.retryButton]} onPress={onRetry}>
          <RefreshCw size={16} color={Colors.almostWhite} style={styles.buttonIcon} />
          <ThemedText style={styles.buttonText}>Retry</ThemedText>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 20,
    padding: 14,
    width: CARD_WIDTH,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  requestType: {
    color: '#8A8A8E',
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  titleIcon: {
    marginRight: 8,
  },
  serviceName: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '600',
  },
  serviceInfo: {
    color: '#8A8A8E',
    fontSize: 14,
    marginBottom: 20,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  buttonText: {
    color: Colors.almostWhite,
    fontWeight: '600',
    marginLeft: 6,
  },
  buttonIcon: {
    marginRight: 2,
  },
  cancelButton: {
    backgroundColor: 'rgba(80, 80, 80, 0.6)',
  },
  retryButton: {
    backgroundColor: Colors.light.tint,
  },
});
