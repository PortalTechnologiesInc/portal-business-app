import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { PendingRequest } from '../models/PendingRequest';
import { usePendingRequests } from '../context/PendingRequestsContext';

const { width } = Dimensions.get('window');
const CARD_WIDTH = width - 64; // Full width minus padding

interface PendingRequestCardProps {
  request: PendingRequest;
}

const getRequestTypeText = (type: string) => {
  switch (type) {
    case 'login':
      return 'Login Request';
    case 'payment':
      return 'Payment Request';
    case 'certificate':
      return 'Certificate Request';
    case 'identity':
      return 'Identity Request';
    default:
      return 'Unknown Request';
  }
};

const getIconName = (type: string) => {
  switch (type) {
    case 'login':
      return 'login';
    case 'payment':
      return 'payment';
    case 'certificate':
      return 'verified';
    case 'identity':
      return 'person';
    default:
      return 'error';
  }
};

// Function to truncate a pubkey to the format: "npub1...123456"
const truncatePubkey = (pubkey: string | undefined) => {
  if (!pubkey) return '';
  return `${pubkey.substring(0, 16)}...${pubkey.substring(pubkey.length - 16)}`;
};

export const PendingRequestCard: React.FC<PendingRequestCardProps> = ({ request }) => {
  const { approve, deny } = usePendingRequests();
  const { id, type, metadata } = request;

  const requester = metadata.requester || 'Unknown Service';
  const recipientPubkey = metadata.recipient;

  return (
    <View style={styles.card}>
      <Text style={styles.requestType}>{getRequestTypeText(type)}</Text>

      <Text style={styles.serviceName}>{requester}</Text>

      <Text style={styles.serviceInfo}>{truncatePubkey(recipientPubkey)}</Text>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.button, styles.approveButton]} onPress={() => approve(id)}>
          <Ionicons name="checkmark-outline" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.denyButton]} onPress={() => deny(id)}>
          <Ionicons name="close-outline" size={20} color="#FFFFFF" />
          <Text style={styles.buttonText}>Deny</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 16,
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
  serviceName: {
    color: '#FFFFFF',
    fontSize: 26,
    fontWeight: '600',
    marginBottom: 4,
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
  denyButton: {
    backgroundColor: '#E53935',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 6,
  },
});
