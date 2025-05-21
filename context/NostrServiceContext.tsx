import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
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
} from 'portal-app-lib';
import { PendingRequest } from '@/models/PendingRequest';
import uuid from 'react-native-uuid';

// Constants and helper classes from original NostrService
const DEFAULT_RELAYS = ['wss://relay.damus.io', 'wss://relay.nostr.net'];

export class LocalAuthChallengeListener implements AuthChallengeListener {
  private callback: (event: AuthChallengeEvent) => Promise<boolean>;

  constructor(callback: (event: AuthChallengeEvent) => Promise<boolean>) {
    this.callback = callback;
  }

  onAuthChallenge(event: AuthChallengeEvent): Promise<boolean> {
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
  pendingRequests: {[key: string]: PendingRequest};
  payInvoice: (invoice: string) => Promise<string>;
  lookupInvoice: (invoice: string) => Promise<LookupInvoiceResponse>;
  disconnectWallet: () => void;
  sendAuthInit: (url: AuthInitUrl) => Promise<void>;
  getServiceName: (publicKey: string) => Promise<Profile | undefined>;
  dismissPendingRequest: (id: string) => void;
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
  children
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [portalApp, setPortalApp] = useState<PortalAppInterface | null>(null);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [nwcWallet, setNwcWallet] = useState<Nwc | null>(null);
  const [pendingRequests, setPendingRequests] = useState<{[key: string]: PendingRequest}>({});

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
        const app = await PortalApp.create(keypair, DEFAULT_RELAYS);
        app.listen(); // Listen asynchronously

        app.listenForAuthChallenge(
          new LocalAuthChallengeListener((event: AuthChallengeEvent) => {
            const id = uuid.v4();

            console.log(`Auth challenge with id ${id} received`, event);

            return new Promise(resolve => {
              setPendingRequests(prev => {
                const newPendingRequests = { ...prev };
                newPendingRequests[id] = {
                  id,
                  metadata: event,
                  timestamp: new Date(),
                  type: 'login',
                  result: resolve as (value: boolean | PaymentResponseContent | RecurringPaymentResponseContent) => void,
                };
                console.log('Updated pending requests map:', pendingRequests);

                return newPendingRequests;
              })
            });
          })
        ).catch((e) => {
            console.error('Error listening for auth challenge', e);
            // TODO: re-initialize the app
        });

        app.listenForPaymentRequest(
          new LocalPaymentRequestListener(
            (event: SinglePaymentRequest) => {
              const id = uuid.v4();

              console.log(`Single payment request with id ${id} received`, event);

              return new Promise(resolve => {
                setPendingRequests(prev => {
                  const newPendingRequests = { ...prev };
                  newPendingRequests[id] = {
                    id,
                    metadata: event,
                    timestamp: new Date(),
                    type: 'payment',
                    result: resolve as (value: boolean | PaymentResponseContent | RecurringPaymentResponseContent) => void,
                  };

                  return newPendingRequests;
                });
              });
            },
            (event: RecurringPaymentRequest) => {
              const id = uuid.v4();

              console.log(`Recurring payment request with id ${id} received`, event);

              return new Promise(resolve => {
                setPendingRequests(prev => {
                  const newPendingRequests = { ...prev };
                  newPendingRequests[id] = {
                    id,
                    metadata: event,
                    timestamp: new Date(),
                    type: 'subscription',
                    result: resolve as (value: boolean | PaymentResponseContent | RecurringPaymentResponseContent) => void,
                  };

                  return newPendingRequests;
                });
              });
            }
          )
        ).catch((e) => {
          console.error('Error listening for payment request', e);
          // TODO: re-initialize the app
        });
        
        // Save portal app instance
        setPortalApp(app);
        console.log('NostrService initialized successfully with public key:', publicKeyStr);
        
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
  const payInvoice = useCallback(async (invoice: string): Promise<string> => {
    if (!nwcWallet) {
      throw new Error('NWC wallet not connected');
    }
    return nwcWallet.payInvoice(invoice);
  }, [nwcWallet]);

  // Lookup invoice via wallet
  const lookupInvoice = useCallback(async (invoice: string): Promise<LookupInvoiceResponse> => {
    if (!nwcWallet) {
      throw new Error('NWC wallet not connected');
    }
    return nwcWallet.lookupInvoice(invoice);
  }, [nwcWallet]);

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setNwcWallet(null);
  }, []);

  // Send auth init
  const sendAuthInit = useCallback(async (url: AuthInitUrl): Promise<void> => {
    if (!portalApp) {
      throw new Error('PortalApp not initialized');
    }
    console.log('Sending auth init', url);
    return portalApp.sendAuthInit(url);
  }, [portalApp]);

  // Get service name
  const getServiceName = useCallback(async (pubKey: string): Promise<Profile | undefined> => {
    if (!portalApp) {
      throw new Error('PortalApp not initialized');
    }
    const service = await portalApp.fetchProfile(pubKey);
    return service;
  }, [portalApp]);

  const dismissPendingRequest = useCallback((id: string) => {
    setPendingRequests(prev => {
      const newPendingRequests = { ...prev };
      delete newPendingRequests[id];
      return newPendingRequests;
    });
  }, []);

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
  };

  return (
    <NostrServiceContext.Provider value={contextValue}>
      {children}
    </NostrServiceContext.Provider>
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