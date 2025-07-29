import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { AppState } from 'react-native';
import {
  AuthChallengeEvent,
  KeyHandshakeUrl,
  Mnemonic,
  Profile,
  RecurringPaymentResponseContent,
  Nwc,
  AuthChallengeListener,
  PaymentRequestListener,
  SinglePaymentRequest,
  RecurringPaymentRequest,
  LookupInvoiceResponse,
  AuthResponseStatus,
  CloseRecurringPaymentResponse,
  ClosedRecurringPaymentListener,
  RelayStatusListener,
  KeypairInterface,
  PaymentStatusNotifier,
  PaymentStatus,
  PortalBusinessInterface,
  KeyHandshakeListener,
  PublicKey,
  LogCallback,
  LogEntry,
  LogLevel,
  initLogger,
  SinglePaymentRequestContent,
  MakeInvoiceRequest,
  MakeInvoiceResponse,
  PaymentResponseContent,
  CashuRequestContent,
  CashuResponseContent,
  CashuDirectContent,
  keyToHex,
} from 'portal-business-app-lib';
import { DatabaseService, Tag } from '@/services/database';
import { useSQLiteContext } from 'expo-sqlite';
import { PortalAppManager } from '@/services/PortalAppManager';
import type {
  PendingRequest,
  RelayConnectionStatus,
  RelayInfo,
  WalletInfo,
  WalletInfoState,
} from '@/utils/types';
import { handleErrorWithToastAndReinit } from '@/utils/Toast';
import { useECash } from './ECashContext';

// Constants and helper classes from original NostrService
const DEFAULT_RELAYS = [
  'wss://relay.getportal.cc',
  'wss://relay.nostr.band',
  'wss://nos.lol',
  'wss://offchain.pub',
];

// Helper function to extract service name from profile (nip05 only)
const getServiceNameFromProfile = (profile: any): string | null => {
  return profile?.nip05 || null;
};

// Note: RelayConnectionStatus, RelayInfo, and ConnectionSummary are now imported from centralized types

// Map numeric RelayStatus values to string status names
// Based on the actual Rust enum from portal-business-app-lib:
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

export class LocalKeyHandhakeListener implements KeyHandshakeListener {
  private callback: (userPubkey: string) => Promise<void>;
  private token: string;

  constructor(
    token: string,
    callback: (userPubkey: string) => Promise<void>,
  ) {
    this.token = token;
    this.callback = callback;
  }
  onKeyHandshake(pubkey: PublicKey): Promise<void> {
    console.log('onKeyHandshake', pubkey.toString());

    this.callback(pubkey.toString());

    return Promise.resolve();
  }
}

// Note: WalletInfo and WalletInfoState are now imported from centralized types

// Context type definition
interface NostrServiceContextType {
  isInitialized: boolean;
  isWalletConnected: boolean;
  publicKey: string | null;
  nwcWallet: Nwc | null;
  pendingRequests: { [key: string]: PendingRequest };
  payInvoice: (invoice: string) => Promise<string>;
  lookupInvoice: (invoice: string, paymnetHash: string) => Promise<LookupInvoiceResponse>;
  makeInvoice: (amount: bigint, description: string) => Promise<MakeInvoiceResponse>;
  disconnectWallet: () => void;
  getServiceName: (publicKey: string) => Promise<string | null>;
  dismissPendingRequest: (id: string) => void;
  setUserProfile: (profile: Profile) => Promise<void>;
  submitNip05: (nip05: string) => Promise<void>;
  submitImage: (imageBase64: string) => Promise<void>;
  allRelaysConnected: boolean;
  connectedCount: number;
  issueJWT: ((targetKey: string, expiresInHours: bigint) => string) | undefined;

  // Connection management functions
  startPeriodicMonitoring: () => void;
  stopPeriodicMonitoring: () => void;

  // NWC wallet connection monitoring
  nwcConnectionStatus: boolean | null;
  nwcConnectionError: string | null;
  refreshNwcConnectionStatus: () => Promise<void>;

  // Wallet info from getinfo method
  walletInfo: WalletInfoState;
  refreshWalletInfo: () => Promise<void>;
  getWalletInfo: () => Promise<WalletInfo | null>;
  relayStatuses: RelayInfo[];
  setKeyHandshakeCallbackWithTimeout: (token: string, callback: (userPubkey: string) => Promise<void>) => void;
  clearKeyHandshakeCallback: () => void;
  setActiveToken: (token: string | null) => void;
  activeToken: string | null;

  // PortalBusiness payment methods
  requestSinglePayment: (mainKey: string, subkeys: string[], paymentRequest: SinglePaymentRequestContent) => Promise<any>;
  requestRecurringPayment: (
    mainKey: string,
    subkeys: string[],
    paymentRequest: any
  ) => Promise<any>;
  authenticateKey: (mainKey: string, subkeys: string[]) => Promise<any>;
  requestCashu: (mainKey: string, subkeys: string[], content: CashuRequestContent) => Promise<CashuResponseContent | undefined>;
  sendCashuDirect: (mainKey: string, subkeys: string[], content: CashuDirectContent) => Promise<void>;
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
  const [portalApp, setPortalApp] = useState<PortalBusinessInterface | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [pendingRequests, setPendingRequests] = useState<{ [key: string]: PendingRequest }>({});
  const [nwcWallet, setNwcWallet] = useState<Nwc | null>(null);
  const [nwcConnectionStatus, setNwcConnectionStatus] = useState<boolean | null>(null);
  const [nwcConnectionError, setNwcConnectionError] = useState<string | null>(null);
  const [nwcTimeoutUntil, setNwcTimeoutUntil] = useState<number | null>(null);
  const [nwcCheckInProgress, setNwcCheckInProgress] = useState(false);
  const [lastNwcCheck, setLastNwcCheck] = useState<number>(0);
  const [appIsActive, setAppIsActive] = useState(true);
  const [walletInfo, setWalletInfo] = useState<WalletInfoState>({
    data: null,
    isLoading: false,
    error: null,
    lastUpdated: null,
  });
  const [relayStatuses, setRelayStatuses] = useState<RelayInfo[]>([]);
  const [keypair, setKeypair] = useState<KeypairInterface | null>(null);
  const [reinitKey, setReinitKey] = useState(0);
  const [keyHandshakeCallback, setKeyHandshakeCallback] = useState<{
    [token: string]: (userPubkey: string) => Promise<void>;
  }>({});
  const [activeToken, setActiveToken] = useState<string | null>(null);
  const [callbackTimeoutId, setCallbackTimeoutId] = useState<number | null>(null);
  const [incomingRequests, setIncomingRequests] = useState<[string, string][]>([]);

  // Remove the in-memory deduplication system
  // const processedCashuTokens = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    if (incomingRequests.length === 0) {
      return;
    }

    const [token, pubkey] = incomingRequests[0];

    console.log('keyHandshakeCallback', keyHandshakeCallback);

    if (keyHandshakeCallback[token]) {
      keyHandshakeCallback[token](pubkey);
    } else {
      console.log(`🚫 No callback found for tag: "${token}"`);
    }
    setIncomingRequests(prev => prev.slice(1));
  }, [incomingRequests, keyHandshakeCallback]);

  class LocalRelayStatusListener implements RelayStatusListener {
    onRelayStatusChange(relay_url: string, status: number): Promise<void> {
      setRelayStatuses(prev => {
        const index = prev.findIndex(relay => relay.url === relay_url);

        // If relay is terminated, remove it from the list
        if (status === 5) {
          return prev.filter(relay => relay.url !== relay_url);
        }

        // If relay is not in the list, add it
        if (index === -1) {
          return [
            ...prev,
            { url: relay_url, status: mapNumericStatusToString(status), connected: status === 3 },
          ];
        }

        // Otherwise, update the relay list
        return [
          ...prev.slice(0, index),
          { url: relay_url, status: mapNumericStatusToString(status), connected: status === 3 },
          ...prev.slice(index + 1),
        ];
      });
      return Promise.resolve();
    }
  }

  const allRelaysConnected = relayStatuses.length > 0 && relayStatuses.every(r => r.connected);
  const connectedCount = relayStatuses.filter(r => r.connected).length;

  // Refs to store current values for stable AppState listener
  const portalAppRef = useRef<PortalBusinessInterface | null>(null);
  const refreshNwcConnectionStatusRef = useRef<(() => Promise<void>) | null>(null);
  const activeTokenRef = useRef<string | null>(null);

  const sqliteContext = useSQLiteContext();
  const DB = new DatabaseService(sqliteContext);

  // Add reinit logic
  const triggerReinit = useCallback(() => {
    setIsInitialized(false);
    setPortalApp(null);
    setPublicKey(null);
    setReinitKey(k => k + 1);
  }, []);

  // Update activeToken ref when activeToken state changes
  useEffect(() => {
    activeTokenRef.current = activeToken;
  }, [activeToken]);

  // Initialize the NostrService
  useEffect(() => {
    const abortController = new AbortController();

    if (!mnemonic) {
      console.log('No mnemonic provided, initialization skipped');
      return;
    }

    // Prevent re-initialization if already initialized
    if (isInitialized && portalApp) {
      console.log('NostrService already initialized, skipping re-initialization');
      return;
    }

    const initializeNostrService = async () => {
      try {
        console.log('Initializing NostrService with mnemonic');

        // Create Mnemonic object
        const mnemonicObj = new Mnemonic(mnemonic);
        const keypair = mnemonicObj.getKeypair();
        setKeypair(keypair);
        const publicKeyStr = keypair.publicKey().toString();

        // Set public key
        setPublicKey(publicKeyStr);

        // Create and initialize portal app

        let relays = (await DB.getRelays()).map(relay => relay.ws_uri);
        if (relays.length === 0) {
          DEFAULT_RELAYS.forEach(relay => relays.push(relay));
          await DB.updateRelays(DEFAULT_RELAYS);
        }
        const app = await PortalAppManager.getInstance(
          keypair,
          relays,
          new LocalRelayStatusListener()
        );

        // Start listening and give it a moment to establish connections
        app.listen({ signal: abortController.signal });
        console.log('PortalApp listening started...');

        // console.warn(keyToHex(publicKeyStr));
        // try {
        //   await app.setProfile({
        //     nip05: 'business@getportal.cc',
        //     name: 'Portal Business',
        //     displayName: 'Portal Business',
        //     picture: undefined,
        //   });
        //   await app.registerNip05('business');
        // } catch(e) {
        //   console.warn(e.inner);
        // }
        // console.log('Profile set');

        console.log('Setting up key handshake listeners for tags...');

        for (const tag of await DB.getTags()) {
          console.log(`📋 Setting up listener for tag: "${tag.token}" (${tag.description})`);

          app.listenForKeyHandshake(
            tag.token,
            new LocalKeyHandhakeListener(tag.token, (pubkey) => {
              setIncomingRequests(prev => [...prev, [tag.token, pubkey]]);
              return Promise.resolve();
            })
          );

          console.log(`✅ Listener set up for tag: "${tag.token}"`);
        }

        console.log('All key handshake listeners set up.');

        // Save portal app instance
        setPortalApp(app);
        console.log('🎯 NostrService: PortalApp saved, listeners are now active');
        console.log('NostrService initialized successfully with public key:', publicKeyStr);
        console.log('Running on those relays:', relays);
        console.log('🎯 Business app is now listening for handshakes on token-filtered basis');
        console.log('🔗 Relay connectivity: All 4 relays should be connected for best results');

        // Mark as initialized
        setIsInitialized(true);
      } catch (error) {
        console.error('Failed to initialize NostrService:', error);
        setIsInitialized(false);
      }
    };

    initializeNostrService();

    return () => {
      console.log('Aborting NostrService initialization');
      abortController.abort();
    };
  }, [mnemonic, reinitKey]);

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
            console.log('info: ', await wallet.getInfo());
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
    async (invoice: string, paymnetHash: string): Promise<LookupInvoiceResponse> => {
      if (!nwcWallet) {
        throw new Error('NWC wallet not connected');
      }
      return nwcWallet.lookupInvoice(invoice, paymnetHash);
    },
    [nwcWallet]
  );

  const makeInvoice = useCallback(
    async (amount: bigint, description: string): Promise<MakeInvoiceResponse> => {
      if (!nwcWallet) {
        throw new Error('NWC wallet not connected');
      }
      return nwcWallet.makeInvoice({amount, description, descriptionHash: undefined, expiry: undefined});
    },
    [nwcWallet]
  );

  // Disconnect wallet
  const disconnectWallet = useCallback(() => {
    setNwcWallet(null);
  }, []);

  // Get service name with database caching
  const getServiceName = useCallback(
    async (pubKey: string): Promise<string | null> => {
      if (!portalApp) {
        throw new Error('PortalApp not initialized');
      }

      try {
        // Step 1: Check for valid cached entry (not expired)
        const cachedName = await DB.getCachedServiceName(pubKey);
        if (cachedName) {
          console.log('DEBUG: Using cached service name for:', pubKey, '->', cachedName);
          return cachedName;
        }

        // Step 2: Check relay connection status before attempting network fetch
        if (!relayStatuses.length || relayStatuses.every(r => r.status === 'Disconnected')) {
          console.warn('DEBUG: No relays connected, cannot fetch service profile for:', pubKey);
          throw new Error(
            'No relay connections available. Please check your internet connection and try again.'
          );
        }

        // Check if at least one relay is connected
        let connectedCount = 0;
        for (const relay of relayStatuses) {
          if (relay.status === 'Connected') {
            connectedCount++;
          }
        }

        if (connectedCount === 0) {
          console.warn(
            'DEBUG: No relays in Connected state, cannot fetch service profile for:',
            pubKey
          );
          throw new Error(
            'No relay connections available. Please check your internet connection and try again.'
          );
        }

        console.log('DEBUG: NostrService.getServiceName fetching from network for pubKey:', pubKey);
        console.log('DEBUG: Connected relays:', connectedCount, '/', relayStatuses.length);

        // Step 3: Fetch from network
        const profile = await portalApp.fetchProfile(pubKey);
        console.log('DEBUG: portalApp.fetchProfile returned:', profile);

        // Step 4: Extract service name from profile
        const serviceName = getServiceNameFromProfile(profile);

        if (serviceName) {
          // Step 5: Cache the result
          await DB.setCachedServiceName(pubKey, serviceName);
          console.log('DEBUG: Cached new service name for:', pubKey, '->', serviceName);
          return serviceName;
        } else {
          console.log('DEBUG: No service name found in profile for:', pubKey);
          return null;
        }
      } catch (error) {
        console.log('DEBUG: getServiceName error for:', pubKey, error);
        throw error;
      }
    },
    [portalApp, relayStatuses]
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
      return;
    }

    // Skip if we're in timeout period (60 seconds after last timeout)
    const now = Date.now();
    if (nwcTimeoutUntil && now < nwcTimeoutUntil) {
      return;
    }

    // Add debounce: Skip if we've checked within the last 3 seconds
    if (now - lastNwcCheck < 3000) {
      return;
    }

    // Set in-progress flag to prevent concurrent calls
    setNwcCheckInProgress(true);
    setLastNwcCheck(now);

    try {
      setNwcConnectionError(null);

      // Use optimized timeout with proper cleanup
      const { promise: timeoutPromise, cleanup } = createTimeoutPromise(10000);

      try {
        // Call getInfo first to establish relay connections before checking status
        await Promise.race([currentWallet.getInfo(), timeoutPromise]);

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

        // Always clear in-progress flag on successful completion
        setNwcCheckInProgress(false);
      } catch (raceError) {
        cleanup();
        throw raceError;
      }
    } catch (error: any) {
      // Always clear in-progress flag on error
      setNwcCheckInProgress(false);

      if (currentWallet === nwcWallet) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const userFriendlyError = categorizeNwcError(error);

        setNwcConnectionStatus(false);
        setNwcConnectionError(userFriendlyError);

        // If timeout error, set timeout period without logging
        if (errorMessage.includes('timeout')) {
          const timeoutUntil = Date.now() + 60000; // 60 seconds from now
          setNwcTimeoutUntil(timeoutUntil);
        } else {
          // Log other errors normally (keep real errors)
          console.error('NostrService: Error fetching NWC connection status:', error.inner);
        }
      }
    }
  }, [nwcWallet]); // Only depend on nwcWallet to prevent infinite recreation

  // Centralized NWC polling - only when wallet is configured
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;

    if (nwcWallet) {
      // Start periodic polling every 5 seconds (unified with relay polling)
      interval = setInterval(() => {
        if (refreshNwcConnectionStatusRef.current) {
          refreshNwcConnectionStatusRef.current();
        }
      }, 5000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [nwcWallet]); // Only start/stop when wallet configuration changes

  // Initial connection status fetch with delay to allow relay connections to establish
  useEffect(() => {
    // Add a small delay to allow relay connections to establish after initialization
    const timer = setTimeout(() => {
      if (refreshNwcConnectionStatusRef.current) {
        refreshNwcConnectionStatusRef.current();
      }
    }, 2000); // 2 second delay to allow relay connections to establish

    return () => clearTimeout(timer);
  }, []); // Empty dependency array - only run once on mount

  // Update refs when values change (no effect recreation)
  useEffect(() => {
    portalAppRef.current = portalApp;
  }, [portalApp]);

  useEffect(() => {
    refreshNwcConnectionStatusRef.current = refreshNwcConnectionStatus;
  }, [refreshNwcConnectionStatus]);

  // Stable AppState listener - runs only once, never recreated
  useEffect(() => {
    console.log('🔄 Setting up STABLE AppState listener (runs once)');

    const handleAppStateChange = async (nextAppState: string) => {
      console.log('AppState changed to:', nextAppState);

      // Update app active state
      setAppIsActive(nextAppState === 'active');

      if (nextAppState === 'active') {
        if (portalAppRef.current) {
          console.log('📱 App became active - refreshing connection status');
          try {
            if (refreshNwcConnectionStatusRef.current) {
              await refreshNwcConnectionStatusRef.current();
            }
          } catch (error: any) {
            console.error('Error refreshing connection status on app active:', error.inner);
          }
        } else {
          console.log('⚠️ App became active but portalApp is null - will re-initialize');
        }
      }
    };

    // Subscribe to app state changes
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      console.log('🧹 Removing STABLE AppState listener (only on unmount)');
      subscription?.remove();
    };
  }, []); // EMPTY dependency array - never recreated

  // Remove the old unstable AppState listener
  // (commenting out the old one that was being recreated constantly)

  const submitNip05 = useCallback(
    async (nip05: string) => {
      if (!portalApp) {
        throw new Error('PortalApp not initialized');
      }
      await portalApp.registerNip05(nip05);
    },
    [portalApp]
  );

  const submitImage = useCallback(
    async (imageBase64: string) => {
      if (!portalApp) {
        throw new Error('PortalApp not initialized');
      }
      await portalApp.registerImg(imageBase64);
    },
    [portalApp]
  );

  // Wallet info functions
  const getWalletInfo = useCallback(async (): Promise<WalletInfo | null> => {
    if (!nwcWallet) {
      console.log('No NWC wallet available for getInfo');
      return null;
    }

    try {
      setWalletInfo(prev => ({ ...prev, isLoading: true, error: null }));

      console.log('Fetching wallet info via getInfo...');
      const info: any = await nwcWallet.getInfo();
      const balance = await nwcWallet.getBalance();

      console.log('Balance:', balance);

      console.log('Wallet info received:', info);

      // Map the response properties to our WalletInfo interface
      // Using flexible property access to handle different response formats
      const walletData: WalletInfo = {
        alias: info.alias,
        get_balance: Number(balance),
      };

      setWalletInfo({
        data: walletData,
        isLoading: false,
        error: null,
        lastUpdated: new Date(),
      });

      return walletData;
    } catch (error: any) {
      console.error('Error fetching wallet info:', error.inner);
      const errorMessage = error instanceof Error ? error.message : 'Failed to fetch wallet info';

      setWalletInfo(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage,
      }));

      return null;
    }
  }, [nwcWallet]);

  const refreshWalletInfo = useCallback(async () => {
    await getWalletInfo();
  }, [getWalletInfo]);

  // Auto-refresh wallet info when wallet connects/changes
  useEffect(() => {
    if (nwcWallet && nwcConnectionStatus === true) {
      console.log('Wallet connected, fetching wallet info...');
      refreshWalletInfo();
    } else if (!nwcWallet) {
      // Clear wallet info when wallet disconnects
      setWalletInfo({
        data: null,
        isLoading: false,
        error: null,
        lastUpdated: null,
      });
    }
  }, [nwcWallet, nwcConnectionStatus, refreshWalletInfo]);

  const issueJWT = (targetKey: string, expiresInHours: bigint) => {
    return keypair!.issueJwt(targetKey, expiresInHours);
  };

  // PortalBusiness payment methods
  const requestSinglePayment = useCallback(
    async (mainKey: string, subkeys: string[], paymentRequest: any) => {
      if (!portalApp) {
        throw new Error('PortalApp not initialized');
      }
      return portalApp.requestSinglePayment(mainKey, subkeys, paymentRequest);
    },
    [portalApp]
  );

  const requestRecurringPayment = useCallback(
    async (mainKey: string, subkeys: string[], paymentRequest: any) => {
      if (!portalApp) {
        throw new Error('PortalApp not initialized');
      }
      return portalApp.requestRecurringPayment(mainKey, subkeys, paymentRequest);
    },
    [portalApp]
  );

  const authenticateKey = useCallback(
    async (mainKey: string, subkeys: string[]) => {
      if (!portalApp) {
        throw new Error('PortalApp not initialized');
      }
      return portalApp.authenticateKey(mainKey, subkeys);
    },
    [portalApp]
  );

  const requestCashu = useCallback(
    async (mainKey: string, subkeys: string[], content: CashuRequestContent) => {
      if (!portalApp) {
        throw new Error('PortalApp not initialized');
      }
      return portalApp.requestCashu(mainKey, subkeys, content);
    },
    [portalApp]
  );

  const sendCashuDirect = useCallback(
    async (mainKey: string, subkeys: string[], content: any) => {
      if (!portalApp) {
        throw new Error('PortalApp not initialized');
      }
      return portalApp.sendCashuDirect(mainKey, subkeys, content);
    },
    [portalApp]
  );

  // Wrapped setKeyHandshakeCallback with global timeout
  const setKeyHandshakeCallbackWithTimeout = (token: string, callback: (userPubkey: string) => Promise<void>) => {
      console.log(`🔊 setKeyHandshakeCallbackWithTimeout called`);

      // Clear any existing timeout
      if (callbackTimeoutId) {
        clearTimeout(callbackTimeoutId);
        setCallbackTimeoutId(null);
      }

      console.log('setting for token', token);

      // Set the new callback
      const wrappedCallback = async (userPubkeyStr: string) => {
        console.log(`wrapped callback stacktrace`, new Error().stack?.split('\n')[2]?.trim());

        // Delete callback so it's not used twice
        // setKeyHandshakeCallback(prev => ({ ...prev, [token]: async () => {} }));

        // Call the original callback with proper conversion
        callback(userPubkeyStr);
      };

      setKeyHandshakeCallback(prev => ({ ...prev, [token]: wrappedCallback }));
      console.log(`🔊 Global timeout: Callback set, will timeout in 60 seconds if no handshake`);

      // Start new timeout
      const timeoutId = setTimeout(async () => {
        console.log(`⏰ Global timeout: 60 seconds elapsed, clearing callback`);

        // Clear the callback by setting an empty function
        // setKeyHandshakeCallback(prev => ({ ...prev, [token]: async () => {} }));
        setCallbackTimeoutId(null);

        // Emit global event so components can react to timeout
        const { globalEvents } = await import('@/utils/index');
        globalEvents.emit('callbackTimeout', {
          reason: 'timeout',
          message: 'Callback timed out after 60 seconds',
        });
      }, 60000); // 60 seconds

      setCallbackTimeoutId(timeoutId);
    };

  // Function to manually clear callback and timeout
  const clearKeyHandshakeCallback = useCallback(() => {
    if (callbackTimeoutId) {
      clearTimeout(callbackTimeoutId);
      setCallbackTimeoutId(null);
    }

    // setKeyHandshakeCallback(async () => {
    //   console.log(`🚫 Handshake received but no active callback`);
    // });

    console.log(`🔇 Global timeout: Callback manually cleared`);
  }, [callbackTimeoutId, setKeyHandshakeCallback]);

  useEffect(() => {
    class Logger implements LogCallback {
      log(entry: LogEntry) {
        if (entry.target.indexOf('tungstenite') !== -1 || entry.target.indexOf('nostr_relay_pool') !== -1) {
          return;
        }

        const message = `[${entry.target}] ${entry.message}`;
        switch (entry.level) {
          case LogLevel.Trace:
            console.trace(message);
            break;
          case LogLevel.Debug:
            console.debug(message);
            break;
          case LogLevel.Info:
            console.info(message);
            break;
          case LogLevel.Warn:
            console.warn(message);
            break;
          case LogLevel.Error:
            console.error(message);
            break;
        }
      }
    }
    try {
      // initLogger(new Logger(), LogLevel.Trace)
      console.log('Logger initialized');
    } catch (error) {
      console.error('Error initializing logger:', error);
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (callbackTimeoutId) {
        clearTimeout(callbackTimeoutId);
      }
    };
  }, [callbackTimeoutId]);

  // Context value
  const contextValue: NostrServiceContextType = {
    isInitialized,
    isWalletConnected: nwcWallet !== null,
    publicKey,
    nwcWallet,
    pendingRequests,
    payInvoice,
    lookupInvoice,
    makeInvoice,
    disconnectWallet,
    getServiceName,
    dismissPendingRequest,
    setUserProfile,
    startPeriodicMonitoring,
    stopPeriodicMonitoring,
    nwcConnectionStatus,
    nwcConnectionError,
    refreshNwcConnectionStatus,
    submitNip05,
    submitImage,
    walletInfo,
    refreshWalletInfo,
    getWalletInfo,
    relayStatuses,
    allRelaysConnected,
    connectedCount,
    issueJWT,
    setKeyHandshakeCallbackWithTimeout,
    clearKeyHandshakeCallback,
    setActiveToken,
    activeToken,
    requestSinglePayment,
    requestRecurringPayment,
    authenticateKey,
    requestCashu,
    sendCashuDirect,
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
