import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, FlatList, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useThemeColor } from '@/hooks/useThemeColor';
import { Plus, ArrowLeft } from 'lucide-react-native';
import { router, useFocusEffect } from 'expo-router';
import DropdownPill from '@/components/DropdownPill';
import TicketCard from '@/components/TicketCard';
import { useSQLiteContext } from 'expo-sqlite';
import { DatabaseService, type Ticket } from '@/services/database';
import { useDatabaseStatus } from '@/services/database/DatabaseProvider';

export default function TicketsScreen() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [db, setDb] = useState<DatabaseService | null>(null);

  // Get database initialization status
  const dbStatus = useDatabaseStatus();

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
    Alert.alert('Verify Ticket', `Verify ticket ${id}?`, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Verify',
        onPress: () => {
          // TODO: Implement verify logic
          console.log('Verify ticket:', id);
        },
      },
    ]);
  };

  const handleSellTicket = async (id: string) => {
    Alert.alert('Sell Ticket', `Sell ticket ${id}?`, [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Sell',
        onPress: () => {
          // TODO: Implement sell logic
          console.log('Sell ticket:', id);
        },
      },
    ]);
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
