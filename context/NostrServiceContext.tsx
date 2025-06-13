import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
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
  PaymentStatus,
  RecurringPaymentStatus,
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
  'wss://relay.orangepill.dev',
  'wss://nostr.milou.lol',
  'wss://nostr.wine',
  'wss://relay.orangepill.dev',
  'wss://nostr.milou.lol',
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
  closeRecurringPayment: (pubkey: string, subscriptionId: string) => Promise<void>;

  // Connection management functions
  getConnectionSummary: () => ConnectionSummary;
  refreshConnectionStatus: () => Promise<void>;
  connectionStatus: any; // Keep for backwards compatibility, but prefer getConnectionSummary
}

// Create context with default values
const NostrServiceContext = createContext<NostrServiceContextType | null>(null);

// Provider component
interface NostrServiceProviderProps {
  mnemonic: string;
  walletUrl: string | null;
  children: React.ReactNode;
}

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
        app.listen(); // Listen asynchronously

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

  // Connect wallet when walletUrl changes
  useEffect(() => {
    if (!isInitialized || !walletUrl) {
      return;
    }

    const connectWallet = () => {
      try {
        console.log('Connecting to wallet with URL');
        const wallet = new Nwc(walletUrl);
        setNwcWallet(wallet);
        console.log('Wallet connected successfully');
      } catch (error) {
        console.error('Failed to connect wallet:', error);
        setNwcWallet(null);
      }
    };

    connectWallet();
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
      const service = await portalApp.fetchProfile(pubKey);
      return service;
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
        console.log('🔍 NostrService: Fetching connection status from portalApp...');
        const status = await portalApp.connectionStatus();
        console.log('🔍 NostrService: Raw connectionStatus from portalApp:', status);
        console.log('🔍 NostrService: Status type:', typeof status);
        console.log('🔍 NostrService: Is Map?:', status instanceof Map);

        if (status instanceof Map) {
          console.log('🔍 NostrService: Map entries:', Array.from(status.entries()));
        }

        setConnectionStatus(status);
        setLastConnectionUpdate(new Date());
      } catch (error) {
        console.error('🔍 NostrService: Error fetching connection status:', error);
        setConnectionStatus(null);
        setLastConnectionUpdate(new Date());
      }
    }
  }, [portalApp]);

  // Get processed connection summary
  const getConnectionSummary = useCallback((): ConnectionSummary => {
    console.log(
      '🔍 NostrService: getConnectionSummary called with connectionStatus:',
      connectionStatus
    );

    if (!connectionStatus) {
      console.log('🔍 NostrService: connectionStatus is null/undefined');
      return {
        allRelaysConnected: false,
        connectedCount: 0,
        totalCount: 0,
        relays: [],
      };
    }

    if (connectionStatus instanceof Map) {
      const relayEntries = Array.from(connectionStatus.entries());
      console.log('🔍 NostrService: Processing relay entries:', relayEntries);

      const relays: RelayInfo[] = relayEntries
        .map(([url, status]) => {
          console.log(
            `🔍 NostrService: Processing relay ${url}: status = ${status}, type = ${typeof status}`
          );

          // Convert numeric status to string using the mapping function
          const finalStatus: RelayConnectionStatus =
            typeof status === 'number' ? mapNumericStatusToString(status) : 'Unknown';

          console.log(`🔍 NostrService: Mapped status for ${url}: ${status} -> ${finalStatus}`);

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

      console.log('🔍 NostrService: Processed connection summary:', {
        allRelaysConnected,
        connectedCount,
        totalCount,
        relays,
      });

      return {
        allRelaysConnected,
        connectedCount,
        totalCount,
        relays,
      };
    }

    console.log(
      '🔍 NostrService: connectionStatus is not a Map, type:',
      typeof connectionStatus,
      'value:',
      connectionStatus
    );
    return {
      allRelaysConnected: false,
      connectedCount: 0,
      totalCount: 0,
      relays: [],
    };
  }, [connectionStatus]);

  // Fetch connection status periodically
  useEffect(() => {
    refreshConnectionStatus();

    // Set up periodic refresh
    const interval = setInterval(refreshConnectionStatus, 5000); // Check every 5 seconds

    return () => clearInterval(interval);
  }, [refreshConnectionStatus]);

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
