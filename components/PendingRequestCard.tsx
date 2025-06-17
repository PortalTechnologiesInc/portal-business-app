import { useState, useEffect, useRef } from 'react';
import type { FC } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { PendingRequest } from '../models/PendingRequest';
import { usePendingRequests } from '../context/PendingRequestsContext';
import { useNostrService } from '@/context/NostrServiceContext';
import type { SinglePaymentRequest, RecurringPaymentRequest } from 'portal-app-lib';
import { serviceNameCache } from '@/utils/serviceNameCache';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { Colors } from '@/constants/Colors';
import { useThemeColor } from '@/hooks/useThemeColor';

const { width } = Dimensions.get('window');

interface PendingRequestCardProps {
  request: PendingRequest;
  key?: string;
}

const getRequestTypeText = (type: string) => {
  switch (type) {
    case 'login':
      return 'Login Request';
    case 'payment':
      return 'Payment Request';
    case 'subscription':
      return 'Subscription Request';
    case 'certificate':
      return 'Certificate Request';
    case 'identity':
      return 'Identity Request';
    default:
      return 'Unknown Request';
  }
};

// Function to truncate a pubkey to the format: "npub1...123456"
const truncatePubkey = (pubkey: string | undefined) => {
  if (!pubkey) return '';
  return `${pubkey.substring(0, 16)}...${pubkey.substring(pubkey.length - 16)}`;
};

export const PendingRequestCard: FC<PendingRequestCardProps> = ({ request }) => {
  const { approve, deny, preloadServiceNames } = usePendingRequests();
  const { id, metadata, type } = request;
  const nostrService = useNostrService();
  const [serviceName, setServiceName] = useState<string>(
    serviceNameCache[metadata.serviceKey] || 'Unknown Service'
  );
  const isMounted = useRef(true);

  // Theme colors
  const cardBackgroundColor = useThemeColor(
    { light: Colors.secondaryWhite, dark: '#1E1E1E' },
    'cardBackground'
  );
  const primaryTextColor = useThemeColor({ light: Colors.gray900, dark: '#FFFFFF' }, 'text');
  const secondaryTextColor = useThemeColor({ light: Colors.gray600, dark: '#8A8A8E' }, 'text');
  const borderColor = useThemeColor({ light: Colors.gray300, dark: '#8A8A8E' }, 'text');

  // Add debug logging when a card is rendered
  console.log(`Rendering card ${id} of type ${type} with service key ${metadata.serviceKey}`);

  const calendarObj =
    type === 'subscription'
      ? (metadata as RecurringPaymentRequest)?.content?.recurrence.calendar
      : null;

  const recurrence = calendarObj?.inner.toHumanReadable(false);

  useEffect(() => {
    // First check if we already have the service name in cache
    if (serviceNameCache[metadata.serviceKey]) {
      setServiceName(serviceNameCache[metadata.serviceKey]);
      return;
    }

    // If not in cache, trigger a preload of all service names
    preloadServiceNames().then(() => {
      // After preloading, check the cache again
      if (isMounted.current && serviceNameCache[metadata.serviceKey]) {
        setServiceName(serviceNameCache[metadata.serviceKey]);
      }
    });

    // Cleanup function to prevent state updates after unmount
    return () => {
      isMounted.current = false;
    };
  }, [metadata.serviceKey, preloadServiceNames]);

  const recipientPubkey = metadata.recipient;

  // Extract payment information if this is a payment request
  const isPaymentRequest = type === 'payment';
  const isSubscriptionRequest = type === 'subscription';

  const amount =
    (metadata as SinglePaymentRequest)?.content?.amount ||
    (metadata as RecurringPaymentRequest)?.content?.amount;

  return (
    <View style={[styles.card, { backgroundColor: cardBackgroundColor }]}>
      <Text style={[styles.requestType, { color: secondaryTextColor }]}>
        {getRequestTypeText(type)}
      </Text>

      <Text style={[styles.serviceName, { color: primaryTextColor }]}>{serviceName}</Text>

      <Text style={[styles.serviceInfo, { color: secondaryTextColor }]}>
        {truncatePubkey(recipientPubkey)}
      </Text>

      {(isPaymentRequest || isSubscriptionRequest) && amount !== null && (
        <View style={[styles.amountContainer, { borderColor }]}>
          {isSubscriptionRequest ? (
            <View style={styles.amountRow}>
              <Text style={[styles.amountText, { color: primaryTextColor }]}>
                {Number(amount) / 1000} sats
              </Text>
              <Text style={[styles.recurranceText, { color: primaryTextColor }]}>
                {recurrence?.toLowerCase()}
              </Text>
            </View>
          ) : (
            <Text style={[styles.amountText, { color: primaryTextColor }]}>
              {Number(amount) / 1000} sats
            </Text>
          )}
        </View>
      )}

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
    borderRadius: 20,
    padding: 14,
    width: '100%',
    minWidth: width - 90, // Ensure minimum width
    marginHorizontal: 5, // Add margin to ensure separation
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  requestType: {
    fontSize: 14,
    fontWeight: '400',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 26,
    fontWeight: '600',
    marginBottom: 4,
  },
  serviceInfo: {
    fontSize: 14,
    marginBottom: 12,
  },
  amountContainer: {
    borderWidth: 1,
    textAlign: 'center',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 20,
    alignSelf: 'center',
    marginBottom: 20,
    width: '100%',
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    width: '100%',
  },
  amountText: {
    fontSize: 30,
    fontWeight: '700',
    textAlign: 'center',
  },
  recurranceText: {
    fontSize: 15,
    fontWeight: '400',
    marginLeft: 15,
    alignSelf: 'flex-end',
    paddingBottom: 5,
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
