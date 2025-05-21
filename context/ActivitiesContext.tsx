import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { useSQLiteContext } from 'expo-sqlite';
import { DatabaseService, type ActivityWithDates, type SubscriptionWithDates } from '@/services/database';
import { useDatabaseStatus } from '@/services/database/DatabaseProvider';

interface ActivitiesContextType {
  activities: ActivityWithDates[];
  subscriptions: SubscriptionWithDates[];
  fetchActivities: () => Promise<void>;
  fetchSubscriptions: () => Promise<void>;
  refreshData: () => void;
  addActivity: (activity: Omit<ActivityWithDates, 'id' | 'created_at'>) => Promise<string | null>;
  isDbReady: boolean;
}

const ActivitiesContext = createContext<ActivitiesContextType | undefined>(undefined);

export const ActivitiesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [activities, setActivities] = useState<ActivityWithDates[]>([]);
  const [subscriptions, setSubscriptions] = useState<SubscriptionWithDates[]>([]);
  const [isDbReady, setIsDbReady] = useState(false);
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
    console.log('SQLite context not available yet, activity tracking will be delayed');
  }

  // Initialize DB safely when the SQLite context becomes available
  useEffect(() => {
    let isMounted = true;

    const initDb = async () => {
      // Skip if database is not ready or SQLite context is not available
      if (!dbStatus.isDbInitialized || !sqliteContext) {
        if (isMounted) {
          setDb(null);
          setIsDbReady(false);
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
          setIsDbReady(true);
          console.log('Database service successfully initialized');
        }
      } catch (error) {
        if (isMounted) {
          setDb(null);
          setIsDbReady(false);
          console.error('Error initializing database service:', error);
        }
      }
    };

    initDb();

    return () => {
      isMounted = false;
    };
  }, [dbStatus.isDbInitialized, sqliteContext]);

  const fetchActivities = useCallback(async () => {
    if (!db || !isDbReady) return;

    try {
      const fetchedActivities = await db.getActivities();
      setActivities(fetchedActivities);
    } catch (error) {
      console.error('Failed to fetch activities:', error);
      // If database is closed, reset the database state
      if (
        error instanceof Error &&
        (error.message.includes('closed resource') || error.message.includes('has been rejected'))
      ) {
        setIsDbReady(false);
        setDb(null);
      }
    }
  }, [db, isDbReady]);

  const fetchSubscriptions = useCallback(async () => {
    if (!db || !isDbReady) return;

    try {
      const fetchedSubscriptions = await db.getSubscriptions();
      setSubscriptions(fetchedSubscriptions);
    } catch (error) {
      console.error('Failed to fetch subscriptions:', error);
      // If database is closed, reset the database state
      if (
        error instanceof Error &&
        (error.message.includes('closed resource') || error.message.includes('has been rejected'))
      ) {
        setIsDbReady(false);
        setDb(null);
      }
    }
  }, [db, isDbReady]);

  // Initial fetch
  useEffect(() => {
    if (db && isDbReady) {
      fetchActivities();
      fetchSubscriptions();
    }
  }, [fetchActivities, fetchSubscriptions, db, isDbReady]);

  // Create a refresh function that can be called from outside components
  const refreshData = useCallback(() => {
    if (db && isDbReady) {
      fetchActivities();
      fetchSubscriptions();
    }
  }, [db, isDbReady, fetchActivities, fetchSubscriptions]);

  // Add refresh function to the context value below

  const addActivity = useCallback(
    async (activity: Omit<ActivityWithDates, 'id' | 'created_at'>) => {
      if (!db || !isDbReady) return null;

      try {
        const id = await db.addActivity(activity);
        await fetchActivities(); // Refresh the activities list
        return id;
      } catch (error) {
        console.error('Failed to add activity:', error);
        // If database is closed, reset the database state
        if (
          error instanceof Error &&
          (error.message.includes('closed resource') || error.message.includes('has been rejected'))
        ) {
          setIsDbReady(false);
          setDb(null);
        }
        return null;
      }
    },
    [db, fetchActivities, isDbReady]
  );

  const contextValue = useMemo(
    () => ({
      activities,
      subscriptions,
      fetchActivities,
      fetchSubscriptions,
      refreshData,
      addActivity,
      isDbReady,
    }),
    [activities, subscriptions, fetchActivities, fetchSubscriptions, refreshData, addActivity, isDbReady]
  );

  return <ActivitiesContext.Provider value={contextValue}>{children}</ActivitiesContext.Provider>;
};

export const useActivities = () => {
  const context = useContext(ActivitiesContext);
  if (context === undefined) {
    throw new Error('useActivities must be used within an ActivitiesProvider');
  }
  return context;
};
