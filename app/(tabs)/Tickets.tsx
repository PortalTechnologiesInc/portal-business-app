import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Plus, ArrowLeft } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import {
  useOperation,
  createTicketVerifyOperation,
  createTicketSellOperation,
} from '@/context/OperationContext';
import DropdownPill from '@/components/DropdownPill';
import TicketCard from '@/components/TicketCard';
import { useSQLiteContext } from 'expo-sqlite';
import { DatabaseService, type Ticket as DatabaseTicket } from '@/services/database';
import { useDatabaseStatus } from '@/services/database/DatabaseProvider';
import { useNostrService } from '@/context/NostrServiceContext';
import { useECash } from '@/context/ECashContext';
import uuid from 'react-native-uuid';
import { Currency } from 'portal-business-app-lib';

export default function TicketsScreen() {
  const [tickets, setTickets] = useState<DatabaseTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [db, setDb] = useState<DatabaseService | null>(null);
  const {
    startOperation,
    addOperationStep,
    updateOperationStep,
    navigateToPending,
    completeOperation,
    failOperation,
  } = useOperation();

  // Get database initialization status
  const dbStatus = useDatabaseStatus();

  const { setKeyHandshakeCallbackWithTimeout, activeToken, requestCashu, requestSinglePayment, sendCashuDirect, makeInvoice } = useNostrService();
  const { addWallet } = useECash();

  // Only try to access SQLite context if the database is initialized
  let sqliteContext = null;
  try {
    // This will throw an error if SQLiteProvider is not available
    if (dbStatus.isDbInitialized && dbStatus.shouldInitDb) {
      sqliteContext = useSQLiteContext();
    }
  } catch (error) {
    // SQLiteContext is not available, which is expected sometimes
    console.log('SQLite context not available yet, ticket loading will be delayed');
  }

  // Initialize DB safely when the SQLite context becomes available
  useEffect(() => {
    let isMounted = true;

    const initDb = async () => {
      // Skip if database is not ready or SQLite context is not available
      if (!dbStatus.isDbInitialized || !sqliteContext) {
        if (isMounted) {
          setDb(null);
          if (!dbStatus.isDbInitialized) {
            console.log('Database not yet initialized, skipping SQLite context access');
          }
        }
        return;
      }

      try {
        if (isMounted && sqliteContext) {
          console.log('SQLite context obtained, initializing database service');
          const newDb = new DatabaseService(sqliteContext);
          setDb(newDb);
          console.log('Database service successfully initialized');
        }
      } catch (error) {
        if (isMounted) {
          setDb(null);
          console.error('Error initializing database service:', error);
        }
      }
    };

    initDb();

    return () => {
      isMounted = false;
    };
  }, [dbStatus.isDbInitialized, sqliteContext]);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceSecondaryColor = useThemeColor({}, 'surfaceSecondary');
  const primaryTextColor = useThemeColor({}, 'textPrimary');
  const secondaryTextColor = useThemeColor({}, 'textSecondary');
  const buttonPrimaryColor = useThemeColor({}, 'buttonPrimary');
  const buttonPrimaryTextColor = useThemeColor({}, 'buttonPrimaryText');

  // Fetch tickets from database
  useEffect(() => {
    const fetchTickets = async () => {
      if (!db) {
        console.log('Database not ready, skipping ticket fetch');
        setIsLoading(false);
        return;
      }

      try {
        const fetchedTickets = await db.getTickets();
        setTickets(fetchedTickets);
      } catch (error) {
        console.error('Error fetching tickets:', error);
        setTickets([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTickets();
  }, [db]);

  const handleAddTicket = () => {
    router.push('/add-ticket');
  };

  // Refresh tickets when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      const refreshTickets = async () => {
        if (!db) {
          console.log('Database not ready, skipping ticket refresh');
          return;
        }
        try {
          const fetchedTickets = await db.getTickets();
          setTickets(fetchedTickets);
        } catch (error) {
          console.error('Error refreshing tickets:', error);
        }
      };
      refreshTickets();
    }, [db])
  );

  const handleDeleteTicket = async (id: string) => {
    if (!db) {
      Alert.alert('Error', 'Database not ready');
      return;
    }

    Alert.alert('Delete Ticket', 'Are you sure you want to delete this ticket?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            await db.deleteTicket(id);
            setTickets(prev => prev.filter(ticket => ticket.id !== id));
          } catch (error) {
            console.error('Error deleting ticket:', error);
            Alert.alert('Error', 'Failed to delete ticket');
          }
        },
      },
    ]);
  };

  const handleVerifyTicket = async (id: string) => {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return;

    Alert.alert('Verify Ticket', `Verify ticket for ${ticket.unit}?`, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Verify',
        onPress: () => {
          startTicketVerification(id, ticket);
        },
      },
    ]);
  };

  const handleSellTicket = async (id: string) => {
    const ticket = tickets.find(t => t.id === id);
    if (!ticket) return;

    Alert.alert('Sell Ticket', `Sell ticket for ${ticket.unit}?`, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Sell',
        onPress: () => {
          startTicketSale(id, ticket);
        },
      },
    ]);
  };

  // Start ticket verification process
  const startTicketVerification = async (ticketId: string, ticket: DatabaseTicket) => {
    const operationData = createTicketVerifyOperation(ticketId, ticket.unit);
    const operationId = startOperation('verify_ticket', operationData);

    navigateToPending(operationId);
    simulateTicketVerification(operationId, ticketId, ticket);
  };

  // Start ticket sale process
  const startTicketSale = async (ticketId: string, ticket: DatabaseTicket) => {
    const operationData = createTicketSellOperation(ticketId, ticket.unit, ticket.price);
    const operationId = startOperation('sell_ticket', operationData);

    navigateToPending(operationId);
    simulateTicketSale(operationId, ticketId, ticket);
  };

  // Simulate ticket verification process
  const simulateTicketVerification = async (
    operationId: string,
    ticketId: string,
    ticket: DatabaseTicket
  ) => {
    try {
      // Step 1: Validating ticket
      addOperationStep(operationId, {
        id: 'validate',
        status: 'pending',
        title: 'Waiting for customer...',
        subtitle: 'Ask customer to tap their tag or scan QR',
      });

      updateOperationStep(operationId, 'validate', {
        status: 'completed',
        title: 'Waiting for customer...',
        subtitle: 'Ask customer to tap their tag or scan QR',
      });

      let received = false;
      setKeyHandshakeCallbackWithTimeout(activeToken || '', async (userPubkey: string) => {
        if (received) {
          return;
        }
        received = true;

        // Step 2: Waiting for customer
        addOperationStep(operationId, {
          id: 'waiting',
          status: 'pending',
          title: 'Waiting for customer...',
          subtitle: 'Ask customer to tap their tag or scan QR',
        });

        const response = await requestCashu(userPubkey, [], {
          requestId: uuid.v4(),
          mintUrl: ticket.mint_url,
          unit: ticket.unit,
          amount: BigInt(1),
        }).catch(error => {
          console.log('Error:', error);
        });

        if (response?.status.tag !== 'Success') {
          failOperation(operationId, 'An unexpected error occurred during verification');
          return;
        }

        updateOperationStep(operationId, 'waiting', {
          status: 'completed',
          title: 'Requesting ticket...',
          subtitle: 'Requesting ticket from mint',
        });

        addOperationStep(operationId, {
          id: 'received',
          status: 'pending',
          title: 'Received ticket...',
          subtitle: 'Confirming validity of ticket',
        });

        const wallet = await addWallet(ticket.mint_url, ticket.unit);
        try {
          await wallet.receiveToken(response.status.inner.token);

          updateOperationStep(operationId, 'received', {
            status: 'success',
            title: 'Verification complete',
            subtitle: 'Ticket successfully verified',
          });

          completeOperation(operationId, {
            verificationId: `ver_${Date.now()}`,
            ticketId,
            status: 'verified',
            verifiedAt: new Date().toISOString(),
          });
        } catch (error) {
          failOperation(operationId, 'An unexpected error occurred during verification');
        }
     });
    } catch (error) {
      failOperation(operationId, 'An unexpected error occurred during verification');
    }
  };

  // Simulate ticket sale process
  const simulateTicketSale = async (
    operationId: string,
    ticketId: string,
    ticket: DatabaseTicket
  ) => {
    try {
      // Step 1: Validating ticket
      addOperationStep(operationId, {
        id: 'validate',
        status: 'pending',
        title: 'Waiting for customer...',
        subtitle: 'Ask customer to tap their tag or scan QR',
      });

      updateOperationStep(operationId, 'validate', {
        status: 'completed',
        title: 'Waiting for customer...',
        subtitle: 'Ask customer to tap their tag or scan QR',
      });

      let received = false;
      setKeyHandshakeCallbackWithTimeout(activeToken || '', async (userPubkey: string) => {
        if (received) {
          return;
        }
        received = true;

        const invoice = await makeInvoice(BigInt(ticket.price * 1000), 'Ticket sale');
        console.log('Invoice created:', invoice);

        // Step 2: Waiting for customer
        addOperationStep(operationId, {
          id: 'waiting',
          status: 'pending',
          title: 'Waiting for customer...',
          subtitle: 'Ask customer to tap their tag or scan QR',
        });

        const response = await requestSinglePayment(userPubkey, [], {
          amount: BigInt(ticket.price * 1000),
          currency: new Currency.Millisats(),
          description: 'Ticket sale',
          authToken: undefined,
          invoice: '',
          currentExchangeRate: undefined,
          expiresAt: BigInt((new Date().getTime() + 1000 * 60 * 60 * 24)),
          subscriptionId: undefined,
          requestId: uuid.v4(),
        }).catch(error => {
          console.log('Error:', error);
        });

        if (response.status.tag === "Approved") {
          console.log('Payment approved');
        } else {
          console.log('Payment failed');
          failOperation(operationId, 'Payment failed');
        }

        updateOperationStep(operationId, 'waiting', {
          status: 'completed',
          title: 'Payment received, issuing ticket...',
          subtitle: 'Issuing ticket to customer',
        });

        addOperationStep(operationId, {
          id: 'connecting',
          status: 'pending',
          title: 'Connecting to mint...',
          subtitle: 'Issuing ticket to customer',
        });

        const walletMint = await addWallet(ticket.mint_url, ticket.unit);
        console.log('before minting');
        const mintResponse = await walletMint.mintToken(BigInt(1));
        console.warn('minted token', mintResponse);

        updateOperationStep(operationId, 'connecting', {
          status: 'completed',
          title: 'Token minted, sending to customer...',
          subtitle: 'Sending token to customer',
        });

        addOperationStep(operationId, {
          id: 'issued',
          status: 'pending',
          title: 'Sending token to customer...',
          subtitle: 'Sending token to customer',
        });

        await sendCashuDirect(userPubkey, [], {
          token: mintResponse,
        }).catch(error => {
          console.log('Error:', error);
        });

        completeOperation(operationId, {
          transactionId: `txn_${Date.now()}`,
          amount: BigInt(ticket.price * 1000),
          currency: 'SAT',
        });
      });
    } catch (error) {
      failOperation(operationId, 'An unexpected error occurred during verification');
    }
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor }]} edges={['top']}>
      <ThemedView style={styles.container}>
        <View style={styles.dropdownContainer}>
          <DropdownPill />
        </View>
        <View style={styles.content}>
          {isLoading ? (
            <View style={[styles.emptyContainer, { backgroundColor: surfaceSecondaryColor }]}>
              <ThemedText style={[styles.emptyText, { color: secondaryTextColor }]}>
                Loading tickets...
              </ThemedText>
            </View>
          ) : tickets.length === 0 ? (
            <View style={[styles.emptyContainer, { backgroundColor: surfaceSecondaryColor }]}>
              <ThemedText style={[styles.emptyText, { color: secondaryTextColor }]}>
                No tickets found
              </ThemedText>
            </View>
          ) : (
            <FlatList
              data={tickets}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TicketCard
                  ticket={item}
                  onDelete={handleDeleteTicket}
                  onVerify={handleVerifyTicket}
                  onSell={handleSellTicket}
                />
              )}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.listContainer}
            />
          )}
        </View>

        <View style={styles.addButtonOverlay}>
          <TouchableOpacity
            style={[styles.addButton, { backgroundColor: buttonPrimaryColor }]}
            onPress={handleAddTicket}
            activeOpacity={0.7}
          >
            <Plus size={24} color={buttonPrimaryTextColor} />
          </TouchableOpacity>
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 0,
  },
  dropdownContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  backButton: {
    marginRight: 16,
  },
  headerText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyContainer: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
  addButtonOverlay: {
    position: 'absolute',
    bottom: 20,
    right: 30,
  },
  addButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  listContainer: {
    paddingBottom: 100, // Space for floating action button
  },
});
