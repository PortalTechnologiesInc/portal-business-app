import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, Platform } from 'react-native';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Ticket } from '@/utils/types';
import { Colors } from '@/constants/Colors';
import { Nfc, CheckCircle, XCircle } from 'lucide-react-native';
import NfcManager from 'react-native-nfc-manager';
import * as Linking from 'expo-linking';
import TicketCard from '@/components/TicketCard';
import { useECash } from '@/context/ECashContext';
import uuid from 'react-native-uuid';

export default function OldTicketsScreen() {
  const [filter, setFilter] = useState<'all' | 'active' | 'used' | 'expired'>('all');
  const [focusedCardId, setFocusedCardId] = useState<string | null>(null);
  const [isNFCEnabled, setIsNFCEnabled] = useState<boolean | null>(null);
  const [isCheckingNFC, setIsCheckingNFC] = useState(false);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const scrollViewRef = useRef<ScrollView>(null);
  const { wallets } = useECash();
  const [walletUpdateTrigger, setWalletUpdateTrigger] = useState(0);

  // Listen for wallet balance changes
  useEffect(() => {
    const setupWalletBalanceListener = async () => {
      try {
        const { globalEvents } = await import('@/utils/index');
        const handleWalletBalancesChanged = () => {
          console.log('Tickets: wallet balances changed, triggering re-render');
          setWalletUpdateTrigger(prev => prev + 1);
        };

        globalEvents.on('walletBalancesChanged', handleWalletBalancesChanged);

        return () => {
          globalEvents.off('walletBalancesChanged', handleWalletBalancesChanged);
        };
      } catch (error) {
        console.error('Error setting up wallet balance listener:', error);
        return () => {};
      }
    };

    let cleanup: (() => void) | undefined;
    setupWalletBalanceListener().then(cleanupFn => {
      cleanup = cleanupFn;
    });

    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []);

  useEffect(() => {
    async function mapWallets() {
      console.log('Tickets: mapping wallets, count:', Object.keys(wallets).length);
      const allTickets: Ticket[] = [];

      for (const [_, wallet] of Object.entries(wallets)) {
        const unitInfo = await wallet.getUnitInfo();
        const balance = await wallet.getBalance();
        console.log('Tickets: wallet balance', balance, 'unit:', wallet.unit());
        console.log('Tickets: full unitInfo:', JSON.stringify(unitInfo, null, 2));

        if (unitInfo?.showIndividually) {
          // Create separate tickets for each unit when showIndividually is true
          for (let i = 0; i < balance; i++) {
            allTickets.push({
              id: uuid.v4(),
              title: unitInfo?.title || wallet.unit(),
              description: unitInfo?.description,
              isNonFungible: unitInfo?.showIndividually || false,
              mintUrl: wallet.getMintUrl(),
              balance: BigInt(1), // Each ticket represents 1 unit
              // Rich metadata
              frontCardBackground: unitInfo?.frontCardBackground,
              backCardBackground: unitInfo?.backCardBackground,
              location: unitInfo?.kind?.tag === 'Event' ? unitInfo.kind.inner.location : undefined,
              date: unitInfo?.kind?.tag === 'Event' ? unitInfo.kind.inner.date : undefined,
              kind: unitInfo?.kind?.tag || 'Other',
            });
          }
        } else {
          // Create a single aggregated ticket when showIndividually is false
          if (balance > 0) {
            allTickets.push({
              id: uuid.v4(),
              title: unitInfo?.title || wallet.unit(),
              description: unitInfo?.description,
              isNonFungible: unitInfo?.showIndividually || false,
              mintUrl: wallet.getMintUrl(),
              balance: balance, // balance is already bigint from wallet.getBalance()
              // Rich metadata
              frontCardBackground: unitInfo?.frontCardBackground,
              backCardBackground: unitInfo?.backCardBackground,
              location: unitInfo?.kind?.tag === 'Event' ? unitInfo.kind.inner.location : undefined,
              date: unitInfo?.kind?.tag === 'Event' ? unitInfo.kind.inner.date : undefined,
              kind: unitInfo?.kind?.tag || 'Other',
            });
          }
        }
      }

      setTickets(allTickets);
    }

    mapWallets();
  }, [wallets, walletUpdateTrigger]);

  const checkNFCStatus = async (): Promise<boolean> => {
    try {
      const isSupported = await NfcManager.isSupported();
      if (!isSupported) {
        console.log('NFC not supported on this device');
        return false;
      }

      const isEnabled = await NfcManager.isEnabled();
      setIsNFCEnabled(isEnabled);
      return isEnabled;
    } catch (error) {
      console.error('Error checking NFC status:', error);
      return false;
    }
  };

  const openNFCSettings = async () => {
    if (Platform.OS === 'ios') {
      await Linking.openURL('App-Prefs:NFC');
    } else {
      await Linking.openURL('android.settings.NFC_SETTINGS');
    }
  };

  const showNFCEnableDialog = () => {
    Alert.alert(
      'NFC Required',
      'NFC is required to use tickets. Please enable NFC in your device settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Open Settings', onPress: openNFCSettings },
      ]
    );
  };

  const handleCardPress = useCallback(
    async (ticket: Ticket) => {
      if (isCheckingNFC) return;

      setIsCheckingNFC(true);
      try {
        const isNFCEnabled = await checkNFCStatus();
        if (!isNFCEnabled) {
          showNFCEnableDialog();
          return;
        }

        setFocusedCardId(ticket.id);
        console.log('Tickets: Starting NFC session for ticket:', ticket.id);

        // Start NFC session
        await NfcManager.start();
        const tag = await NfcManager.requestTechnology(NfcManager.Ndef);
        console.log('Tickets: NFC tag detected:', tag);

        // Here you would implement the actual ticket validation logic
        // For now, we'll just simulate a successful validation
        Alert.alert('Success', 'Ticket validated successfully!');
      } catch (error) {
        console.error('Tickets: NFC error:', error);
        Alert.alert('Error', 'Failed to validate ticket. Please try again.');
      } finally {
        try {
          await NfcManager.cancelTechnologyRequest();
        } catch (error) {
          console.error('Tickets: Error canceling NFC:', error);
        }
        setIsCheckingNFC(false);
        setFocusedCardId(null);
      }
    },
    [isCheckingNFC]
  );

  const filteredTickets = useMemo(() => {
    const now = new Date();
    return tickets.filter(ticket => {
      switch (filter) {
        case 'active':
          return ticket.kind === 'Event' && ticket.date && new Date(ticket.date) > now;
        case 'used':
          return ticket.kind === 'Event' && ticket.date && new Date(ticket.date) <= now;
        case 'expired':
          return ticket.kind === 'Event' && ticket.date && new Date(ticket.date) <= now;
        default:
          return true;
      }
    });
  }, [tickets, filter]);

  const getFilterButtonStyle = (filterType: 'all' | 'active' | 'used' | 'expired') => ({
    ...styles.filterButton,
    backgroundColor: filter === filterType ? Colors.primary : 'transparent',
  });

  const getFilterTextStyle = (filterType: 'all' | 'active' | 'used' | 'expired') => ({
    ...styles.filterText,
    color: filter === filterType ? Colors.white : Colors.gray600,
  });

  return (
    <SafeAreaView style={styles.container}>
      <ThemedView style={styles.header}>
        <ThemedText style={styles.title}>Tickets</ThemedText>
      </ThemedView>

      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
          <TouchableOpacity style={getFilterButtonStyle('all')} onPress={() => setFilter('all')}>
            <ThemedText style={getFilterTextStyle('all')}>All</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={getFilterButtonStyle('active')}
            onPress={() => setFilter('active')}
          >
            <ThemedText style={getFilterTextStyle('active')}>Active</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={getFilterButtonStyle('used')} onPress={() => setFilter('used')}>
            <ThemedText style={getFilterTextStyle('used')}>Used</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={getFilterButtonStyle('expired')}
            onPress={() => setFilter('expired')}
          >
            <ThemedText style={getFilterTextStyle('expired')}>Expired</ThemedText>
          </TouchableOpacity>
        </ScrollView>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredTickets.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyStateText}>
              {filter === 'all' ? 'No tickets available' : `No ${filter} tickets`}
            </ThemedText>
          </View>
        ) : (
          filteredTickets.map(ticket => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onPress={() => handleCardPress(ticket)}
              isFocused={focusedCardId === ticket.id}
              isCheckingNFC={isCheckingNFC && focusedCardId === ticket.id}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  filterContainer: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  filterScroll: {
    paddingHorizontal: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.gray600,
  },
});
