import React from 'react';
import { Modal, StyleSheet, View, TouchableOpacity, Dimensions } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Colors } from '@/constants/Colors';
import { Link } from 'lucide-react-native';

type WalletConfirmModalProps = {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  walletUrl: string;
};

export function WalletConfirmModal({ visible, onClose, onConfirm, walletUrl }: WalletConfirmModalProps) {
  return (
    <Modal animationType="fade" transparent={true} visible={visible} onRequestClose={onClose}>
      <View style={styles.centeredView}>
        <ThemedView style={styles.modalView}>
          <View style={styles.iconContainer}>
            <Link size={32} color={Colors.almostWhite} />
          </View>

          <ThemedText style={styles.title}>
            Connect Wallet
          </ThemedText>

          <ThemedText style={styles.walletUrlLabel}>Wallet URL:</ThemedText>
          <ThemedText style={styles.walletUrl}>{walletUrl}</ThemedText>

          <ThemedText style={styles.detail}>
            Do you want to connect to this wallet? This will allow you to manage your assets and make transactions.
          </ThemedText>

          <View style={styles.buttonContainer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={onClose}>
              <ThemedText style={styles.buttonText}>Cancel</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity style={[styles.button, styles.confirmButton]} onPress={onConfirm}>
              <ThemedText style={styles.buttonText}>Connect</ThemedText>
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
    marginBottom: 16,
  },
  walletUrlLabel: {
    fontSize: 14,
    color: Colors.dirtyWhite,
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  walletUrl: {
    fontSize: 16,
    color: Colors.almostWhite,
    marginBottom: 16,
    padding: 12,
    backgroundColor: 'rgba(50, 50, 50, 0.5)',
    borderRadius: 8,
    width: '100%',
    textAlign: 'center',
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
  confirmButton: {
    backgroundColor: Colors.green,
  },
  cancelButton: {
    backgroundColor: 'rgba(50, 50, 50, 0.8)',
  },
  buttonText: {
    color: Colors.almostWhite,
    fontWeight: 'bold',
    fontSize: 16,
  },
}); 