import React from 'react';
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

export const FailedRequestCard: React.FC<FailedRequestCardProps> = ({
  onRetry,
  onCancel,
}) => {
  return (
    <View style={styles.card}>
      <View style={styles.iconContainer}>
        <AlertTriangle size={32} color={WARNING_COLOR} />
      </View>
      
      <ThemedText style={styles.title}>Request Failed</ThemedText>
      
      <ThemedText style={styles.description}>
        The request timed out. Would you like to try again?
      </ThemedText>
      
      <View style={styles.actions}>
        <TouchableOpacity 
          style={[styles.button, styles.cancelButton]} 
          onPress={onCancel}
        >
          <ThemedText style={styles.buttonText}>Cancel</ThemedText>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.button, styles.retryButton]} 
          onPress={onRetry}
        >
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
    alignItems: 'center',
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 177, 66, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.almostWhite,
    marginBottom: 8,
  },
  description: {
    fontSize: 16,
    color: Colors.dirtyWhite,
    textAlign: 'center',
    marginBottom: 24,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginHorizontal: 8,
  },
  buttonText: {
    color: Colors.almostWhite,
    fontSize: 16,
    fontWeight: '600',
  },
  buttonIcon: {
    marginRight: 8,
  },
  cancelButton: {
    backgroundColor: 'rgba(80, 80, 80, 0.6)',
  },
  retryButton: {
    backgroundColor: Colors.light.tint,
  },
}); 