import type React from 'react';
import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
  useMemo,
  useCallback,
} from 'react';
import type { PendingRequest, PendingRequestType } from '../models/PendingRequest';
import {
  getNostrServiceInstance,
  LocalAuthChallengeListener,
  LocalPaymentRequestListener,
} from '../services/nostr/NostrService';
import type {
  AuthChallengeEvent,
  AuthInitUrl,
  PaymentResponseContent,
  RecurringPaymentRequest,
  RecurringPaymentResponseContent,
  SinglePaymentRequest,
} from 'portal-app-lib';
import { Mnemonic, PaymentStatus, RecurringPaymentStatus } from 'portal-app-lib';
import uuid from 'react-native-uuid';
import { useSQLiteContext } from 'expo-sqlite';
import { DatabaseService, fromUnixSeconds } from '@/services/database';
import type { ActivityWithDates, SubscriptionWithDates } from '@/services/database';
import { useDatabaseStatus } from '@/services/database/DatabaseProvider';
import type { NostrService } from '@/services/nostr/NostrService';
import { mnemonicEvents } from '@/services/SecureStorageService';

// Define a type for pending activities
type PendingActivity = Omit<ActivityWithDates, 'id' | 'created_at'>;
type PendingSubscription = Omit<SubscriptionWithDates, 'id' | 'created_at'>;

interface PendingRequestsContextType {
  pendingRequests: PendingRequest[];
  getByType: (type: PendingRequestType) => PendingRequest[];
  getById: (id: string) => PendingRequest | undefined;
  approve: (id: string) => void;
  deny: (id: string) => void;
  hasPending: boolean;
  isLoadingRequest: boolean;
  requestFailed: boolean;
  pendingUrl: AuthInitUrl | undefined;
  showSkeletonLoader: (parsedUrl: AuthInitUrl) => void;
  setRequestFailed: (failed: boolean) => void;
}

const PendingRequestsContext = createContext<PendingRequestsContextType | undefined>(undefined);

export const PendingRequestsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use preloaded data to avoid loading delay on mount
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [isLoadingRequest, setIsLoadingRequest] = useState(false);
  const [pendingUrl, setPendingUrl] = useState<AuthInitUrl | undefined>(undefined);
  const [requestFailed, setRequestFailed] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  const [resolvers, setResolvers] = useState<
    Map<string, (value: boolean | PaymentResponseContent | RecurringPaymentResponseContent) => void>
  >(new Map());

  const [mnemonic, setMnemonic] = useState<string | null>(null);
  mnemonicEvents.addListener('mnemonicChanged', newValue => {
    setMnemonic(newValue);
  });

  // Create database instance for adding activities, but handle case where it's not ready
  const [db, setDb] = useState<DatabaseService | null>(null);

  // Queue for activities that couldn't be recorded due to DB not being ready
  const [pendingActivities, setPendingActivities] = useState<PendingActivity[]>([]);
  const [pendingSubscriptions, setPendingSubscriptions] = useState<PendingSubscription[]>([]);
  // Get database initialization status
  const dbStatus = useDatabaseStatus();

  // Get SQLite context - this is now safe because we've reordered the providers in _layout.tsx
  let sqliteContext = null;
  try {
    // This will only be accessed when the SQLiteProvider is available
    sqliteContext = dbStatus.shouldInitDb && dbStatus.isDbInitialized ? useSQLiteContext() : null;
  } catch (error) {
    console.log('SQLite context not available yet:', error);
  }

  // Initialize DB when SQLite context is available
  useEffect(() => {
    if (!sqliteContext || !dbStatus.shouldInitDb || !dbStatus.isDbInitialized) {
      console.log('Database prerequisites not met, waiting...');
      return;
    }

    try {
      console.log('Initializing DatabaseService in PendingRequestsContext');
      const databaseService = new DatabaseService(sqliteContext);
      setDb(databaseService);
    } catch (error) {
      console.error('Failed to initialize DatabaseService:', error);
      setDb(null);
    }
  }, [sqliteContext, dbStatus.shouldInitDb, dbStatus.isDbInitialized]);

  // Process any pending activities when DB becomes available
  useEffect(() => {
    const processPendingActivities = async () => {
      if (!db || pendingActivities.length === 0) return;

      console.log(`Processing ${pendingActivities.length} pending activities`);

      const activitiesToProcess = [...pendingActivities];
      setPendingActivities([]); // Clear the queue

      for (const activity of activitiesToProcess) {
        try {
          await db.addActivity(activity);
          console.log('Successfully recorded delayed activity:', activity.type);
        } catch (error) {
          console.error('Failed to record delayed activity:', error);
          // Re-queue failed activities
          setPendingActivities(prev => [...prev, activity]);
        }
      }
    };

    processPendingActivities();
  }, [db, pendingActivities]);

  // Helper function to add an activity with fallback to queue
  const addActivityWithFallback = useCallback(
    (activity: PendingActivity) => {
      if (!db) {
        console.log('Database not ready, queuing activity for later recording');
        setPendingActivities(prev => [...prev, activity]);
        return;
      }

      try {
        console.log('Adding activity to database:', activity.type);
        db.addActivity(activity)
          .then(() => {
            console.log('Activity recorded successfully:', activity.type);
          })
          .catch(err => {
            console.error('Error recording activity, queuing for later:', err);
            setPendingActivities(prev => [...prev, activity]);
          });
      } catch (error) {
        console.error('Exception while trying to record activity, queuing for later:', error);
        setPendingActivities(prev => [...prev, activity]);
      }
    },
    [db]
  );

  // Helper function to add a subscription with fallback to queue
  const addSubscriptionWithFallback = useCallback(
    (subscription: PendingSubscription) => {
      if (!db) {
        console.log('Database not ready, queuing subscription for later recording');
        setPendingSubscriptions(prev => [...prev, subscription]);
        return;
      }

      try {
        console.log('Adding subscription to database:', subscription.request_id);
        db.addSubscription(subscription);
      } catch (error) {
        console.error('Exception while trying to record subscription, queuing for later:', error);
        setPendingSubscriptions(prev => [...prev, subscription]);
      }
    },
    [db]
  );

  // Memoize hasPending to avoid recalculation on every render
  const hasPending = useMemo(() => {
    return pendingRequests.some(req => req.status === 'pending') || isLoadingRequest;
  }, [pendingRequests, isLoadingRequest]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

  // Memoize these functions to prevent recreation on every render
  const getByType = useCallback(
    (type: PendingRequestType) => {
      return pendingRequests.filter(request => request.type === type);
    },
    [pendingRequests]
  );

  const getById = useCallback(
    (id: string) => {
      return pendingRequests.find(request => request.id === id);
    },
    [pendingRequests]
  );

  // Add this useEffect to manage NostrService listeners
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
    useEffect(() => {
    if (!mnemonic) return;

    let nostrService: NostrService | null = null;
    try {
      const mnemonicObj = new Mnemonic(mnemonic);
      nostrService = getNostrServiceInstance(mnemonicObj);
    } catch (e) {
      return;
    }

    // Set up listeners
    nostrService.setAuthChallengeListener(
      new LocalAuthChallengeListener((event: AuthChallengeEvent) => {
        // aggiorna lista
        const id = uuid.v4();

        console.log('auth challenge', event);

        setPendingRequests(prev => [
          ...prev,
          {
            id,
            metadata: event,
            timestamp: new Date().toISOString(),
            status: 'pending',
            type: 'login',
          },
        ]);

        if (pendingUrl?.mainKey === event.serviceKey) {
          cancelSkeletonLoader();
        }

        return new Promise(resolve => {
          resolvers.set(
            id,
            resolve as (
              value: boolean | PaymentResponseContent | RecurringPaymentResponseContent
            ) => void
          );
          setResolvers(resolvers);
        });
      })
    );
    nostrService.setPaymentRequestListeners(
      new LocalPaymentRequestListener(
        (event: SinglePaymentRequest) => {
          // aggiorna lista
          const id = uuid.v4();

          const showPendingPayment = () => {
            setPendingRequests(prev => [
              ...prev,
              {
                id,
                metadata: event,
                timestamp: new Date().toISOString(),
                status: 'pending',
                type: 'payment',
              },
            ]);

            if (pendingUrl?.mainKey === event.serviceKey) {
              cancelSkeletonLoader();
            }
          };

          return new Promise(resolve => {
            if (event.content.subscriptionId && db) {
              db.getSubscription(event.content.subscriptionId)
                .then(subscription => {
                  if (subscription) {
                    // TODO: check amount
                    resolve({
                      status: new PaymentStatus.Pending(),
                      requestId: event.content.requestId,
                    });

                    getNostrServiceInstance().payInvoice(
                      event.content.invoice
                    );
                  } else {
                    showPendingPayment();
                  }
                });
            } else {
              showPendingPayment();
            }

            resolvers.set(
              id,
              resolve as (
                value: boolean | PaymentResponseContent | RecurringPaymentResponseContent
              ) => void
            );
            setResolvers(resolvers);
          });
        },
        (event: RecurringPaymentRequest) => {
          // aggiorna lista
          const id = uuid.v4();

          setPendingRequests(prev => [
            ...prev,
            {
              id,
              metadata: event,
              timestamp: new Date().toISOString(),
              status: 'pending',
              type: 'subscription',
            },
          ]);

          if (pendingUrl?.mainKey === event.serviceKey) {
            cancelSkeletonLoader();
          }

          return new Promise(resolve => {
            resolvers.set(
              id,
              resolve as (
                value: boolean | PaymentResponseContent | RecurringPaymentResponseContent
              ) => void
            );
            setResolvers(resolvers);
          });
        }
      )
    );

    // Cleanup: remove listeners on unmount or mnemonic change
    return () => {
      nostrService.setAuthChallengeListener(null);
      nostrService.setPaymentRequestListeners(null);
    };
  }, [mnemonic]);

  const approve = useCallback(
    (id: string) => {
      const request = getById(id);

      setPendingRequests(prev =>
        prev.map(request => (request.id === id ? { ...request, status: 'approved' } : request))
      );

      const resolver = resolvers.get(id);

      console.log('approve', id, resolver);

      if (resolver && request) {
        switch (request.type) {
          case 'login':
            resolver(true);
            // Add an activity record directly via the database service
            getNostrServiceInstance()
              .getServiceName(request.metadata.serviceKey)
              .then(serviceName => {
                addActivityWithFallback({
                  type: 'auth',
                  service_key: request.metadata.serviceKey,
                  detail: 'User approved login',
                  date: new Date(),
                  service_name: serviceName?.nip05 ?? 'Unknown Service',
                  amount: null,
                  currency: null,
                  request_id: id,
                  subscription_id: null,
                });
              });
            break;
          case 'payment':
            resolver({
              status: new PaymentStatus.Pending(),
              requestId: (request.metadata as SinglePaymentRequest).content.requestId,
            });
            // Add payment activity
            try {
              // Convert BigInt to number if needed
              const amount =
                typeof (request.metadata as SinglePaymentRequest).content.amount === 'bigint'
                  ? Number((request.metadata as SinglePaymentRequest).content.amount)
                  : (request.metadata as SinglePaymentRequest).content.amount;

              // Extract currency symbol from the Currency object
              let currency: string | null = null;
              const currencyObj = (request.metadata as SinglePaymentRequest).content.currency;
              if (currencyObj) {
                // If it's a simple string, use it directly
                if (typeof currencyObj === 'string') {
                  currency = currencyObj;
                } else {
                  // Otherwise try to get the symbol - default to € if can't determine
                  currency = '€';
                }
              }

              getNostrServiceInstance()
                .getServiceName(request.metadata.serviceKey)
                .then(serviceName => {
                  addActivityWithFallback({
                    type: 'pay',
                    service_key: request.metadata.serviceKey,
                    service_name: serviceName?.nip05 ?? 'Unknown Service',
                    detail: 'Payment approved',
                    date: new Date(),
                    amount: Number(amount) / 1000,
                    currency,
                    request_id: id,
                    subscription_id: null,
                  });
                });
            } catch (err) {
              console.log('Error adding payment activity:', err);
            }
            getNostrServiceInstance().payInvoice(
              (request?.metadata as SinglePaymentRequest).content.invoice
            );
            break;
          case 'subscription':
            resolver({
              status: new RecurringPaymentStatus.Confirmed({
                subscriptionId: 'randomsubscriptionid',
                authorizedAmount: (request.metadata as SinglePaymentRequest).content.amount,
                authorizedCurrency: (request.metadata as SinglePaymentRequest).content.currency,
                authorizedRecurrence: (request.metadata as RecurringPaymentRequest).content
                  .recurrence,
              }),
              requestId: (request.metadata as RecurringPaymentRequest).content.requestId,
            });
            // Add subscription activity
            try {
              // Convert BigInt to number if needed
              const req = request.metadata as RecurringPaymentRequest;
              const amount =
                typeof req.content.amount === 'bigint'
                  ? Number(req.content.amount)
                  : req.content.amount;

              // Extract currency symbol from the Currency object
              const currencyObj = req.content.currency;

              getNostrServiceInstance()
                .getServiceName(request.metadata.serviceKey)
                .then(serviceName => {
                  addSubscriptionWithFallback({
                    request_id: id,
                    service_name: serviceName?.nip05 ?? 'Unknown Service',
                    service_key: request.metadata.serviceKey,
                    amount: Number(amount) / 1000,
                    currency: 'sats',
                    status: 'active',
                    recurrence_until: req.content.recurrence.until
                      ? fromUnixSeconds(req.content.recurrence.until)
                      : null,
                    recurrence_first_payment_due: fromUnixSeconds(
                      req.content.recurrence.firstPaymentDue
                    ),
                    last_payment_date: null,
                    next_payment_date: fromUnixSeconds(req.content.recurrence.firstPaymentDue),
                    recurrence_calendar: req.content.recurrence.calendar.inner.toCalendarString(),
                    recurrence_max_payments: req.content.recurrence.maxPayments || null,
                  });
                });
            } catch (err) {
              console.log('Error adding subscription activity:', err);
            }
            break;
        }

        resolvers.delete(id);
        setResolvers(resolvers);
      }
    },
    [getById, resolvers, addActivityWithFallback, addSubscriptionWithFallback]
  );

  const deny = useCallback(
    (id: string) => {
      setPendingRequests(prev =>
        prev.map(request => (request.id === id ? { ...request, status: 'denied' } : request))
      );

      const request = getById(id);

      const resolver = resolvers.get(id);
      if (resolver) {
        switch (request?.type) {
          case 'login':
            resolver(false);
            break;
          case 'payment':
            resolver({
              status: new PaymentStatus.Rejected({ reason: 'User rejected' }),
              requestId: (request.metadata as SinglePaymentRequest).content.requestId,
            });
            break;
          case 'subscription':
            resolver({
              status: new RecurringPaymentStatus.Rejected({
                reason: 'User rejected',
              }),
              requestId: (request.metadata as RecurringPaymentRequest).content.requestId,
            });
            break;
        }
        resolvers.delete(id);
        setResolvers(resolvers);
      }
    },
    [getById, resolvers]
  );

  // Show skeleton loader and set timeout for request
  const showSkeletonLoader = useCallback(
    (parsedUrl: AuthInitUrl) => {
      // Clean up any existing timeout
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      setIsLoadingRequest(true);
      setPendingUrl(parsedUrl);
      setRequestFailed(false);

      // Set new timeout for 10 seconds
      const newTimeoutId = setTimeout(() => {
        setIsLoadingRequest(false);
        setRequestFailed(true);
      }, 10000);

      setTimeoutId(newTimeoutId);
    },
    [timeoutId]
  );

  const cancelSkeletonLoader = useCallback(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    setIsLoadingRequest(false);
    setRequestFailed(false);
  }, [timeoutId]);

  // Memoize the context value to prevent recreation on every render
  // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
  const contextValue = useMemo(
    () => ({
      pendingRequests,
      getByType,
      getById,
      approve,
      deny,
      hasPending,
      isLoadingRequest,
      requestFailed,
      pendingUrl,
      showSkeletonLoader,
      setRequestFailed,
    }),
    [
      pendingRequests,
      getByType,
      getById,
      approve,
      deny,
      hasPending,
      isLoadingRequest,
      requestFailed,
      pendingUrl,
      showSkeletonLoader,
      setRequestFailed,
    ]
  );

  return (
    <PendingRequestsContext.Provider value={contextValue}>
      {children}
    </PendingRequestsContext.Provider>
  );
};

export const usePendingRequests = () => {
  const context = useContext(PendingRequestsContext);
  if (context === undefined) {
    throw new Error('usePendingRequests must be used within a PendingRequestsProvider');
  }
  return context;
};
