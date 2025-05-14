import React from 'react';
import { Modal, StyleSheet, View, TouchableOpacity, Dimensions } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Colors } from '@/constants/Colors';
import { Key, BanknoteIcon } from 'lucide-react-native';

type QRScanModalProps = {
  visible: boolean;
  onClose: () => void;
  onAccept: () => void;
  requestType: 'payment' | 'login';
  data: {
    name: string;
    amount?: number;
    currency?: string;
    detail: string;
  };
};

export function QRScanModal({ visible, onClose, onAccept, requestType, data }: QRScanModalProps) {
  const { name, amount, currency, detail } = data;

  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <ThemedView style={styles.modalView}>
          <View style={styles.iconContainer}>
            {requestType === 'payment' ? (
              <BanknoteIcon size={32} color={Colors.green} />
            ) : (
              <Key size={32} color={Colors.almostWhite} />
            )}
          </View>

          <ThemedText style={styles.title}>
            {requestType === 'payment' ? 'Payment Request' : 'Login Request'}
          </ThemedText>

          <ThemedText style={styles.serviceName}>{name}</ThemedText>

          {requestType === 'payment' && amount && currency && (
            <ThemedText style={styles.amount}>
              {currency}
              {(amount / 100).toFixed(2)}
            </ThemedText>
          )}

          <ThemedText style={styles.detail}>{detail}</ThemedText>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.declineButton]} onPress={onClose}>
              <ThemedText style={styles.buttonText}>Decline</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.acceptButton]} onPress={onAccept}>
              <ThemedText style={styles.buttonText}>Accept</ThemedText>
            </TouchableOpacity>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
  },
  modalView: {
    width: width * 0.85,
    backgroundColor: '#121212',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(25, 25, 25, 0.8)',
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
  serviceName: {
    fontSize: 18,
    color: Colors.almostWhite,
    marginBottom: 16,
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.green,
    marginBottom: 16,
  },
  detail: {
    fontSize: 14,
    color: Colors.dirtyWhite,
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  button: {
    borderRadius: 12,
    padding: 12,
    width: '48%',
    alignItems: 'center',
  },
  acceptButton: {
    backgroundColor: Colors.green,
  },
  declineButton: {
    backgroundColor: 'rgba(50, 50, 50, 0.8)',
  },
  buttonText: {
    color: Colors.almostWhite,
    fontWeight: 'bold',
    fontSize: 16,
  },
});
