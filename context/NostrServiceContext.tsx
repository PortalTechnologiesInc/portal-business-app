import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState } from 'react-native';
import {
  AuthChallengeEvent,
  AuthInitUrl,
  Mnemonic,
  PaymentResponseContent,
  Profile,
  RecurringPaymentResponseContent,
  PortalApp,
  Nwc,
  AuthChallengeListener,
  PaymentRequestListener,
  SinglePaymentRequest,
  RecurringPaymentRequest,
  LookupInvoiceResponse,
  PortalAppInterface,
  AuthResponseStatus,
  CloseRecurringPaymentResponse,
  ClosedRecurringPaymentListener,
} from 'portal-app-lib';
import { PendingRequest } from '@/models/PendingRequest';
import uuid from 'react-native-uuid';
import { DatabaseService } from '@/services/database';
import { useSQLiteContext } from 'expo-sqlite';

// Constants and helper classes from original NostrService
const DEFAULT_RELAYS = [
  'wss://relay.damus.io',
  'wss://nostr.wine',
  // Add more reliable and diverse relays
  'wss://nostr-pub.wellorder.net',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://relay.snort.social',
  'wss://offchain.pub',
];

// Types for connection management
export type RelayConnectionStatus =
  | 'Connected'
  | 'Connecting'
  | 'Pending'
  | 'Initialized'
  | 'Disconnected'
  | 'Terminated'
  | 'Banned'
  | 'Unknown';

export interface RelayInfo {
  url: string;
  status: RelayConnectionStatus;
  connected: boolean;
}

export interface ConnectionSummary {
  allRelaysConnected: boolean;
  connectedCount: number;
  totalCount: number;
  relays: RelayInfo[];
}

// Map numeric RelayStatus values to string status names
// Based on the actual Rust enum from portal-app-lib:
// pub enum RelayStatus { Initialized, Pending, Connecting, Connected, Disconnected, Terminated, Banned }
function mapNumericStatusToString(numericStatus: number): RelayConnectionStatus {
  switch (numericStatus) {
    case 0:
      return 'Initialized';
    case 1:
      return 'Pending';
    case 2:
      return 'Connecting';
    case 3:
      return 'Connected';
    case 4:
      return 'Disconnected';
    case 5:
      return 'Terminated';
    case 6:
      return 'Banned';
    default:
      console.warn(`🔍 NostrService: Unknown numeric RelayStatus: ${numericStatus}`);
      return 'Unknown';
  }
}

export class LocalAuthChallengeListener implements AuthChallengeListener {
  private callback: (event: AuthChallengeEvent) => Promise<AuthResponseStatus>;

  constructor(callback: (event: AuthChallengeEvent) => Promise<AuthResponseStatus>) {
    this.callback = callback;
  }

  onAuthChallenge(event: AuthChallengeEvent): Promise<AuthResponseStatus> {
    return this.callback(event);
  }
}

export class LocalPaymentRequestListener implements PaymentRequestListener {
  private singleCb: (event: SinglePaymentRequest) => Promise<PaymentResponseContent>;
  private recurringCb: (event: RecurringPaymentRequest) => Promise<RecurringPaymentResponseContent>;

  constructor(
    singleCb: (event: SinglePaymentRequest) => Promise<PaymentResponseContent>,
    recurringCb: (event: RecurringPaymentRequest) => Promise<RecurringPaymentResponseContent>
  ) {
    this.singleCb = singleCb;
    this.recurringCb = recurringCb;
  }

  onSinglePaymentRequest(event: SinglePaymentRequest): Promise<PaymentResponseContent> {
    return this.singleCb(event);
  }

  onRecurringPaymentRequest(
    event: RecurringPaymentRequest
  ): Promise<RecurringPaymentResponseContent> {
    return this.recurringCb(event);
  }
}

// Context type definition
interface NostrServiceContextType {
  isInitialized: boolean;
  isWalletConnected: boolean;
  publicKey: string | null;
  portalApp: PortalAppInterface | null;
  nwcWallet: Nwc | null;
  pendingRequests: { [key: string]: PendingRequest };
  payInvoice: (invoice: string) => Promise<string>;
  lookupInvoice: (invoice: string) => Promise<LookupInvoiceResponse>;
  disconnectWallet: () => void;
  sendAuthInit: (url: AuthInitUrl) => Promise<void>;
  getServiceName: (publicKey: string) => Promise<Profile | undefined>;
  dismissPendingRequest: (id: string) => void;
  setUserProfile: (profile: Profile) => Promise<void>;
  submitNip05: (nip05: string) => Promise<void>;
  submitImage: (imageBase64: string) => Promise<void>;
  closeRecurringPayment: (pubkey: string, subscriptionId: string) => Promise<void>;

  // Connection management functions
  getConnectionSummary: () => ConnectionSummary;
  refreshConnectionStatus: () => Promise<void>;
  forceReconnect: () => Promise<void>;
  startPeriodicMonitoring: () => void;
  stopPeriodicMonitoring: () => void;
  connectionStatus: any; // Keep for backwards compatibility, but prefer getConnectionSummary

  // NWC wallet connection monitoring
  nwcConnectionStatus: boolean | null;
  nwcConnectionError: string | null;
  refreshNwcConnectionStatus: () => Promise<void>;
}

// Create context with default values
const NostrServiceContext = createContext<NostrServiceContextType | null>(null);

// Provider component
interface NostrServiceProviderProps {
  mnemonic: string;
  walletUrl: string | null;
  children: React.ReactNode;
}

// Pure function for status interpretation - better testability and reusability
const interpretNwcStatus = (status: any): boolean => {
  if (status === null || status === undefined) {
    return false;
  }

  // If status is a Map and has entries, consider it connected
  if (status instanceof Map) {
    return status.size > 0;
  }
  // If status is a boolean
  else if (typeof status === 'boolean') {
    return status;
  }
  // If status is a number, consider >=0 as connected (permissive approach)
  else if (typeof status === 'number') {
    return status >= 0;
  }
  // If status is a string, be more permissive
  else if (typeof status === 'string') {
    const statusStr = status.toLowerCase();
    return (
      !statusStr.includes('disconnected') &&
      !statusStr.includes('error') &&
      !statusStr.includes('failed')
    );
  }
  // If status is an object, check for explicit failure indicators
  else if (typeof status === 'object') {
    const hasExplicitFailure =
      (status as any).connected === false ||
      (status as any).success === false ||
      (status as any).status === 'disconnected' ||
      (status as any).error;
    return !hasExplicitFailure;
  }
  // Default: if we get any response without timeout, consider it connected
  return true;
};

// Pure function for error categorization - better maintainability
const categorizeNwcError = (error: unknown): string => {
  const errorMessage = error instanceof Error ? error.message : String(error);

  if (errorMessage.includes('timeout')) {
    return 'Connection timeout - wallet may be unreachable';
  } else if (errorMessage.includes('network')) {
    return 'Network error - check your connection';
  } else if (errorMessage.includes('connection')) {
    return 'Unable to connect to wallet service';
  }
  return 'Connection failed';
};

// Optimized timeout wrapper with proper cleanup
const createTimeoutPromise = (
  timeoutMs: number
): { promise: Promise<never>; cleanup: () => void } => {
  let timeoutId: number;

  const promise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Connection timeout')), timeoutMs);
  });

  const cleanup = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  };

  return { promise, cleanup };
};

export const NostrServiceProvider: React.FC<NostrServiceProviderProps> = ({
  mnemonic,
  walletUrl,
  children,
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [portalApp, setPortalApp] = useState<PortalAppInterface | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [nwcWallet, setNwcWallet] = useState<Nwc | null>(null);
  const [pendingRequests, setPendingRequests] = useState<{ [key: string]: PendingRequest }>({});
  const [connectionStatus, setConnectionStatus] = useState<Map<string, any> | null>(null);
  const [lastConnectionUpdate, setLastConnectionUpdate] = useState<Date | null>(null);
  const [nwcConnectionStatus, setNwcConnectionStatus] = useState<boolean | null>(null);
  const [nwcConnectionError, setNwcConnectionError] = useState<string | null>(null);

  // Simple NWC timeout handling: wait 60 seconds after timeout
  const [nwcTimeoutUntil, setNwcTimeoutUntil] = useState<number | null>(null);
  const [nwcCheckInProgress, setNwcCheckInProgress] = useState(false);
  const [lastNwcCheck, setLastNwcCheck] = useState<number>(0);

  const sqliteContext = useSQLiteContext();
  const DB = new DatabaseService(sqliteContext);

  // Initialize the NostrService
  useEffect(() => {
    if (!mnemonic) {
      console.log('No mnemonic provided, initialization skipped');
      return;
    }

    const initializeNostrService = async () => {
      try {
        console.log('Initializing NostrService with mnemonic');

        // Create Mnemonic object
        const mnemonicObj = new Mnemonic(mnemonic);
        const keypair = mnemonicObj.getKeypair();
        const publicKeyStr = keypair.publicKey().toString();

        // Set public key
        setPublicKey(publicKeyStr);

        // Create and initialize portal app

        let relays = (await DB.getRelays()).map(relay => relay.ws_uri);
        if (relays.length === 0) {
          DEFAULT_RELAYS.forEach(relay => relays.push(relay));
          await DB.updateRelays(DEFAULT_RELAYS);
        }
        const app = await PortalApp.create(keypair, relays);
        
        // Start listening and give it a moment to establish connections
        app.listen(); // Listen asynchronously
        console.log('PortalApp listening started...');

        app
          .listenForAuthChallenge(
            new LocalAuthChallengeListener((event: AuthChallengeEvent) => {
              const id = uuid.v4();

              console.log(`Auth challenge with id ${id} received`, event);

              return new Promise<AuthResponseStatus>(resolve => {
                setPendingRequests(prev => {
                  const newPendingRequests = { ...prev };
                  newPendingRequests[id] = {
                    id,
                    metadata: event,
                    timestamp: new Date(),
                    type: 'login',
                    result: resolve as (
                      value:
                        | AuthResponseStatus
                        | PaymentResponseContent
                        | RecurringPaymentResponseContent
                    ) => void,
                  };
                  console.log('Updated pending requests map:', pendingRequests);

                  return newPendingRequests;
                });
              });
            })
          )
          .catch(e => {
            console.error('Error listening for auth challenge', e);
            // TODO: re-initialize the app
          });

        app
          .listenForPaymentRequest(
            new LocalPaymentRequestListener(
              (event: SinglePaymentRequest) => {
                const id = uuid.v4();

                console.log(`Single payment request with id ${id} received`, event);

                return new Promise<PaymentResponseContent>(resolve => {
                  setPendingRequests(prev => {
                    const newPendingRequests = { ...prev };
                    newPendingRequests[id] = {
                      id,
                      metadata: event,
                      timestamp: new Date(),
                      type: 'payment',
                      result: resolve as (
                        value:
                          | AuthResponseStatus
                          | PaymentResponseContent
                          | RecurringPaymentResponseContent
                      ) => void,
                    };

                    return newPendingRequests;
                  });
                });
              },
              (event: RecurringPaymentRequest) => {
                const id = uuid.v4();

                console.log(`Recurring payment request with id ${id} received`, event);

                return new Promise<RecurringPaymentResponseContent>(resolve => {
                  setPendingRequests(prev => {
                    const newPendingRequests = { ...prev };
                    newPendingRequests[id] = {
                      id,
                      metadata: event,
                      timestamp: new Date(),
                      type: 'subscription',
                      result: resolve as (
                        value:
                          | AuthResponseStatus
                          | PaymentResponseContent
                          | RecurringPaymentResponseContent
                      ) => void,
                    };

                    return newPendingRequests;
                  });
                });
              }
            )
          )
          .catch(e => {
            console.error('Error listening for payment request', e);
            // TODO: re-initialize the app
          });

        // Listen for closed recurring payments
        class ClosedRecurringPaymentListenerImpl implements ClosedRecurringPaymentListener {
          async onClosedRecurringPayment(event: CloseRecurringPaymentResponse): Promise<void> {
            console.log('Closed subscription received', event);
            // Handle closed recurring payment event
            // You can add additional logic here if needed
          }
        }
        app.listenClosedRecurringPayment(new ClosedRecurringPaymentListenerImpl());

        // Save portal app instance
        setPortalApp(app);
        console.log('NostrService initialized successfully with public key:', publicKeyStr);
        console.log('Running on those relays:', relays);

        // Mark as initialized
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize NostrService:', error);
        setIsInitialized(false);
      }
    };

    initializeNostrService();
  }, [mnemonic]);

  useEffect(() => {
    console.log('Updated pending requests:', pendingRequests);
  }, [pendingRequests]);

  // Optimized wallet connection effect with better separation of concerns
  useEffect(() => {
    if (!isInitialized) return;

    // Always reset connection status when wallet URL changes (including when cleared)
    console.log(
      'NostrServiceContext: Wallet URL changed to:',
      walletUrl,
      'resetting connection status'
    );
    setNwcConnectionStatus(null);
    setNwcConnectionError(null);

    // Clear any timeout state
    setNwcTimeoutUntil(null);
    setNwcCheckInProgress(false);

    if (!walletUrl) {
      console.log('Wallet URL cleared, disconnecting wallet');
      setNwcWallet(null);
      return;
    }

    let timeoutId: number;
    let isCancelled = false;

    const connectWallet = async () => {
      try {
        console.log('Connecting to wallet with URL:', walletUrl);
        const wallet = new Nwc(walletUrl);

        if (isCancelled) return;
        setNwcWallet(wallet);
        console.log('Wallet connected successfully');

        // Schedule initial status check with proper cleanup
        timeoutId = setTimeout(async () => {
          if (isCancelled) return;

          try {
            // Call getInfo first to establish relay connections before checking status
            console.log('Calling getInfo to establish relay connections...');
            await wallet.getInfo();
            if (isCancelled) return;

            console.log('getInfo completed, now checking connection status...');
            const status = await wallet.connectionStatus();
            if (isCancelled) return;

            const isConnected = interpretNwcStatus(status);
            setNwcConnectionStatus(isConnected);
            setNwcConnectionError(isConnected ? null : 'Unable to connect to wallet service');
            console.log('Initial NWC wallet connection status:', isConnected);
          } catch (error) {
            if (isCancelled) return;

            const errorMessage = error instanceof Error ? error.message : String(error);

            // Handle specific NWC errors more gracefully
            if (errorMessage.includes('AppError.Nwc')) {
              console.log('NWC wallet not ready or unavailable during initial check');
              setNwcConnectionStatus(false);
              setNwcConnectionError('Wallet not available - will retry automatically');
            } else if (errorMessage.includes('timeout')) {
              console.log('NWC initial connection timeout - will retry automatically');
              setNwcConnectionStatus(false);
              setNwcConnectionError('Connection timeout - will retry automatically');
            } else {
              console.error('Error checking initial NWC connection status:', error);
              setNwcConnectionStatus(false);
              setNwcConnectionError('Failed to verify wallet connection');
            }
          }
        }, 1000);
      } catch (error) {
        if (isCancelled) return;
        console.error('Failed to connect wallet:', error);
        setNwcWallet(null);
        setNwcConnectionStatus(null);
        setNwcConnectionError('Failed to connect to wallet');
      }
    };

    connectWallet();

    // Cleanup function to prevent race conditions and memory leaks
    return () => {
      isCancelled = true;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [walletUrl, isInitialized]);

  // Pay invoice via wallet
  const payInvoice = useCallback(
    async (invoice: string): Promise<string> => {
      if (!nwcWallet) {
        throw new Error('NWC wallet not connected');
      }
      return nwcWallet.payInvoice(invoice);
    },
    [nwcWallet]
  );

  // Lookup invoice via wallet
  const lookupInvoice = useCallback(
    async (invoice: string): Promise<LookupInvoiceResponse> => {
      if (!nwcWallet) {
        throw new Error('NWC wallet not connected');
      }
      return nwcWallet.lookupInvoice(invoice);
    },
    [nwcWallet]
  );

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setNwcWallet(null);
  }, []);

  // Send auth init
  const sendAuthInit = useCallback(
    async (url: AuthInitUrl): Promise<void> => {
      if (!portalApp) {
        throw new Error('PortalApp not initialized');
      }

      console.log('Sending auth init', url);
      return portalApp.sendAuthInit(url);
    },
    [portalApp]
  );

  // Get service name
  const getServiceName = useCallback(
    async (pubKey: string): Promise<Profile | undefined> => {
      if (!portalApp) {
        throw new Error('PortalApp not initialized');
      }
      console.log('DEBUG: NostrService.getServiceName called with pubKey:', pubKey);
      console.log('DEBUG: PortalApp is initialized:', !!portalApp);

      try {
        const service = await portalApp.fetchProfile(pubKey);
        console.log('DEBUG: portalApp.fetchProfile returned:', service);
        return service;
      } catch (error) {
        console.log('DEBUG: portalApp.fetchProfile error:', error);
        throw error;
      }
    },
    [portalApp]
  );

  const dismissPendingRequest = useCallback((id: string) => {
    setPendingRequests(prev => {
      const newPendingRequests = { ...prev };
      delete newPendingRequests[id];
      return newPendingRequests;
    });
  }, []);

  const setUserProfile = useCallback(
    async (profile: Profile) => {
      if (!portalApp) {
        throw new Error('PortalApp not initialized');
      }
      await portalApp.setProfile(profile);
    },
    [portalApp]
  );

  const closeRecurringPayment = useCallback(
    async (pubkey: string, subscriptionId: string) => {
      if (!portalApp) {
        throw new Error('PortalApp not initialized');
      }
      await portalApp.closeRecurringPayment(pubkey, subscriptionId);
    },
    [portalApp]
  );

  // Refresh connection status from portal app
  const refreshConnectionStatus = useCallback(async () => {
    if (portalApp) {
      try {
        const status = await portalApp.connectionStatus();
        setConnectionStatus(status);
        setLastConnectionUpdate(new Date());
      } catch (error) {
        console.error('NostrService: Error fetching connection status:', error);
        setConnectionStatus(null);
        setLastConnectionUpdate(new Date());
      }
    }
  }, [portalApp]);

  // Get processed connection summary
  const getConnectionSummary = useCallback((): ConnectionSummary => {
    if (!connectionStatus) {
      return {
        allRelaysConnected: false,
        connectedCount: 0,
        totalCount: 0,
        relays: [],
      };
    }

    if (connectionStatus instanceof Map) {
      const relayEntries = Array.from(connectionStatus.entries());

      const relays: RelayInfo[] = relayEntries
        .map(([url, status]) => {
          // Convert numeric status to string using the mapping function
          const finalStatus: RelayConnectionStatus =
            typeof status === 'number' ? mapNumericStatusToString(status) : 'Unknown';

          return {
            url,
            status: finalStatus,
            connected: finalStatus === 'Connected',
          };
        })
        .sort((a, b) => a.url.localeCompare(b.url)); // Sort by URL for consistent order

      const connectedCount = relays.filter(relay => relay.connected).length;
      const totalCount = relays.length;
      const allRelaysConnected = totalCount > 0 && connectedCount === totalCount;

      return {
        allRelaysConnected,
        connectedCount,
        totalCount,
        relays,
      };
    }

    return {
      allRelaysConnected: false,
      connectedCount: 0,
      totalCount: 0,
      relays: [],
    };
  }, [connectionStatus]);

  // Simple monitoring control functions (to be used by navigation-based polling)
  const startPeriodicMonitoring = useCallback(() => {
    console.warn('startPeriodicMonitoring is deprecated. Use navigation-based monitoring instead.');
  }, []);

  const stopPeriodicMonitoring = useCallback(() => {
    console.warn('stopPeriodicMonitoring is deprecated. Use navigation-based monitoring instead.');
  }, []);

  // Simple NWC connection status refresh - prevent concurrent calls
  const refreshNwcConnectionStatus = useCallback(async () => {
    const currentWallet = nwcWallet;

    if (!currentWallet) {
      setNwcConnectionStatus(null);
      setNwcConnectionError(null);
      return;
    }

    // Skip if another check is already in progress
    if (nwcCheckInProgress) {
      console.log('⏸️ Skipping NWC check - already in progress');
      return;
    }

    // Skip if we're in timeout period (60 seconds after last timeout)
    const now = Date.now();
    if (nwcTimeoutUntil && now < nwcTimeoutUntil) {
      return;
    }

    // Add debounce: Skip if we've checked within the last 3 seconds
    if (now - lastNwcCheck < 3000) {
      console.log('⏸️ Skipping NWC check - too frequent (debounced)');
      return;
    }

    // Set in-progress flag to prevent concurrent calls
    setNwcCheckInProgress(true);
    setLastNwcCheck(now);

    try {
      console.log('Checking NWC wallet connection status...');
      setNwcConnectionError(null);

      // Use optimized timeout with proper cleanup
      const { promise: timeoutPromise, cleanup } = createTimeoutPromise(10000);

      try {
        // Call getInfo first to establish relay connections before checking status
        console.log('Calling getInfo to establish relay connections...');
        await Promise.race([currentWallet.getInfo(), timeoutPromise]);

        console.log('getInfo completed, now checking connection status...');
        const status: any = await Promise.race([currentWallet.connectionStatus(), timeoutPromise]);

        cleanup();

        // Use pure function for status interpretation
        const isConnected = interpretNwcStatus(status);

        setNwcConnectionStatus(isConnected);
        setNwcConnectionError(isConnected ? null : 'Unable to connect to wallet service');

        // Clear timeout on successful connection
        if (isConnected) {
          setNwcTimeoutUntil(null);
        }

        console.log('NWC wallet connection status:', isConnected ? 'Connected' : 'Disconnected');

        // Always clear in-progress flag on successful completion
        setNwcCheckInProgress(false);
      } catch (raceError) {
        cleanup();
        throw raceError;
      }
    } catch (error) {
      // Always clear in-progress flag on error
      setNwcCheckInProgress(false);

      if (currentWallet === nwcWallet) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const userFriendlyError = categorizeNwcError(error);

        setNwcConnectionStatus(false);
        setNwcConnectionError(userFriendlyError);

        // If timeout error, just log as info since it's expected
        if (errorMessage.includes('timeout')) {
          console.log('NWC connection timeout - will retry in 60 seconds');
          const timeoutUntil = Date.now() + 60000; // 60 seconds from now
          setNwcTimeoutUntil(timeoutUntil);
        } else {
          // Log other errors normally
          console.error('NostrService: Error fetching NWC connection status:', error);
        }
      }
    }
  }, [nwcWallet, nwcTimeoutUntil, nwcCheckInProgress, lastNwcCheck]);

  // Force reconnect function to trigger immediate reconnection
  const forceReconnect = useCallback(async () => {
    if (!portalApp) {
      console.warn('PortalApp not initialized, cannot force reconnect');
      return;
    }

    console.log('🔄 Force reconnecting to relays...');

    try {
      // Only refresh connection status, don't trigger recursive calls
      await refreshConnectionStatus();

      console.log('✅ Force reconnect initiated');
    } catch (error) {
      console.error('❌ Error during force reconnect:', error);
    }
  }, [portalApp, refreshConnectionStatus]);

  // Initial connection status fetch with delay to allow relay connections to establish
  useEffect(() => {
    // Add a small delay to allow relay connections to establish after initialization
    const timer = setTimeout(() => {
      refreshConnectionStatus();
      // Also refresh NWC status when wallet changes
      refreshNwcConnectionStatus();
    }, 2000); // 2 second delay to allow relay connections to establish

    return () => clearTimeout(timer);
  }, [refreshConnectionStatus, refreshNwcConnectionStatus]);

  // Add AppState listener to handle background/foreground transitions
  useEffect(() => {
    const handleAppStateChange = (nextAppState: string) => {
      console.log('🔄 AppState changed to:', nextAppState);

      if (nextAppState === 'active' && portalApp) {
        console.log('📱 App became active - refreshing connection status');
        // Only trigger connection status refresh when app becomes active
        // Remove the recursive forceReconnect call to prevent loops
        refreshConnectionStatus();
        refreshNwcConnectionStatus();
      }
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, [portalApp, refreshConnectionStatus, refreshNwcConnectionStatus]);


  const submitNip05 = useCallback(async (nip05: string) => {
    if (!portalApp) {
      throw new Error('PortalApp not initialized');
    }
    await portalApp.registerNip05(nip05);
  }, [portalApp]);

  const submitImage = useCallback(async (imageBase64: string) => {
    if (!portalApp) {
      throw new Error('PortalApp not initialized');
    }
    await portalApp.registerImg(imageBase64);
  }, [portalApp]);

  // Context value
  const contextValue: NostrServiceContextType = {
    isInitialized,
    isWalletConnected: nwcWallet !== null,
    publicKey,
    portalApp,
    nwcWallet,
    pendingRequests,
    payInvoice,
    lookupInvoice,
    disconnectWallet,
    sendAuthInit,
    getServiceName,
    dismissPendingRequest,
    setUserProfile,
    closeRecurringPayment,
    getConnectionSummary,
    refreshConnectionStatus,
    connectionStatus,
    startPeriodicMonitoring,
    stopPeriodicMonitoring,
    nwcConnectionStatus,
    nwcConnectionError,
    refreshNwcConnectionStatus,
    forceReconnect,
    submitNip05,
    submitImage,
  };

  return (
    <NostrServiceContext.Provider value={contextValue}>{children}</NostrServiceContext.Provider>
  );
};

// Hook to use the NostrService context
export const useNostrService = () => {
  const context = useContext(NostrServiceContext);
  if (!context) {
    throw new Error('useNostrService must be used within a NostrServiceProvider');
  }
  return context;
};

export default NostrServiceProvider;
