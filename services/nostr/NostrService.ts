import portalLib, { AuthChallengeEvent, AuthInitUrl, Mnemonic, parseAuthInitUrl, PaymentResponseContent, PaymentStatusContent, Profile, RecurringPaymentResponseContent, RecurringPaymentStatusContent } from 'portal-app-lib';
import { AuthChallengeListener, LookupInvoiceResponse, Nwc, PaymentRequestListener, PortalAppInterface, RecurringPaymentRequest, SinglePaymentRequest } from 'portal-app-lib/lib/typescript/src/generated/app';

const DEFAULT_RELAYS = [
    'wss://relay.damus.io',
    'wss://relay.nostr.net'
];

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

    constructor(singleCb: (event: SinglePaymentRequest) => Promise<PaymentResponseContent>, recurringCb: (event: RecurringPaymentRequest) => Promise<RecurringPaymentResponseContent>) {
        this.singleCb = singleCb;
        this.recurringCb = recurringCb;
    }

    onSinglePaymentRequest(event: SinglePaymentRequest): Promise<PaymentResponseContent> {
        return this.singleCb(event);
    }

    onRecurringPaymentRequest(event: RecurringPaymentRequest): Promise<RecurringPaymentResponseContent> {
        return this.recurringCb(event);
    }
}
class NostrService {
    private static instance: NostrService;
    private initialized: boolean = false;
    private portalApp: PortalAppInterface | null = null;

    private authChallengeListener: AuthChallengeListener | null = null;
    private paymentRequestListener: PaymentRequestListener | null = null;
    private dedup = new Map<string, boolean>();

    private publicKey: string | null = null;

    private constructor() {
        // Private constructor to prevent direct construction calls with 'new'
    }

    public static getInstance(mnemonic: Mnemonic | null = null): NostrService {
        if (!NostrService.instance) {
            NostrService.instance = new NostrService();
            if (!mnemonic) throw Error("Not yet initialized, pass the mnemonic as argument.")
            NostrService.instance.initialize(mnemonic);
        }
        return NostrService.instance;
    }

    private nwcWallet: Nwc | null = null; // Replace 'any' with proper NWC type when available

    /**
     * Connect to a Nostr Wallet (NWC) using the provided URL
     * This is separate from NostrService initialization and can be called anytime
     */
    public connectNWC(nwcUrl: string): Nwc {
        try {
            // Assuming NWC is available from your portalLib or needs to be imported
            this.nwcWallet = new portalLib.app.Nwc(nwcUrl);
            return this.nwcWallet;
        } catch (error) {
            console.error('Failed to initialize NWC wallet:', error);
            throw error;
        }
    }

    /**
     * Checks if an NWC wallet is currently connected
     */
    public isNWCConnected(): boolean {
        return this.nwcWallet !== null;
    }

    /**
     * Disconnects the currently connected NWC wallet
     */
    public disconnectNWC(): void {
        this.nwcWallet = null;
    }

    public async payInvoice(invoice: string): Promise<string> {
        if (!this.nwcWallet) {
            throw new Error('NWC wallet not connected. Call connectNWC() first.');
        }
        return this.nwcWallet.payInvoice(invoice);
    }

    public async lookupInvoice(invoice: string): Promise<LookupInvoiceResponse> {
        if (!this.nwcWallet) {
            throw new Error('NWC wallet not connected. Call connectNWC() first.');
        }
        return this.nwcWallet.lookupInvoice(invoice);
    }

    public getNWCWallet(): Nwc {
        if (!this.nwcWallet) {
            throw new Error('NWC wallet not connected. Call connectNWC() first.');
        }
        return this.nwcWallet;
    }

    public async initialize(mnemonic: Mnemonic): Promise<void> {
        try {
            if (this.initialized) {
                return;
            }
            this.initialized = true;
            console.log('Initializing NostrService');

            // Initialize the portal app
            const keypair = mnemonic.getKeypair();

            this.publicKey = keypair.publicKey().toString();

            this.portalApp = await portalLib.app.PortalApp.create(keypair, DEFAULT_RELAYS);
            this.portalApp.listen(); // Listen asynchronously
            console.log('Portal app initialized', this.portalApp);

            const _self = this;
            this.portalApp.listenForAuthChallenge(new LocalAuthChallengeListener((event) => {
                console.log('Auth challenge event', event);
                return _self.authChallengeListener?.onAuthChallenge(event) ?? Promise.resolve(false);
            }));
            this.portalApp.listenForPaymentRequest(new LocalPaymentRequestListener((singleEvent) => {
                console.log('Single payment request', singleEvent);
                console.log(_self.paymentRequestListener, 'sono il request listener');
                return _self.paymentRequestListener?.onSinglePaymentRequest(singleEvent) ?? Promise.resolve(new PaymentStatusContent.Rejected({ reason: 'Not implemented' }));
            }, (recurringEvent) => {
                const key = `${recurringEvent.serviceKey.toString()}-${recurringEvent.content.amount.toString()}-${recurringEvent.expiresAt.toString()}`;
                console.log('Recurring payment request', recurringEvent);
                return _self.paymentRequestListener?.onRecurringPaymentRequest(recurringEvent) ?? Promise.resolve(new RecurringPaymentStatusContent.Rejected({ reason: 'Not implemented' }));
            }));
        } catch (error) {
            console.error('Failed to initialize NostrService:', error);
            throw error;
        }
    }

    public setAuthChallengeListener(listener: AuthChallengeListener): void {
        this.authChallengeListener = listener;
    }

    public setPaymentRequestListeners(listener: PaymentRequestListener): void {
        this.paymentRequestListener = listener;
    }

    private checkInitialized(): PortalAppInterface {
        if (!this.portalApp) {
            throw new Error('PortalApp not initialized. Call initialize() first.');
        }

        return this.portalApp;
    }

    public sendAuthInit(url: AuthInitUrl): Promise<void> {
        console.log('Sending auth init', url);
        return this.checkInitialized().sendAuthInit(url);
    }

    public getPortalApp(): PortalAppInterface {
        return this.checkInitialized();
    }

    public async reset(): Promise<void> {
        this.portalApp = null;
    }

    public isInitialized(): boolean {
        return this.portalApp !== null;
    }

    public async getServiceName(publicKey: string): Promise<Profile | undefined> {
        if (!this.portalApp) {
            throw new Error('PortalApp not initialized. Call initialize() first.');
        }

        const service = await this.portalApp.fetchProfile(publicKey);
        console.log('Service in nostrservice:', service);
        return service;
    }

    public getPublicKey(): string | null {
        return this.publicKey;
    }
}

// Export a single instance
export function getNostrServiceInstance(mnemonic: Mnemonic | null = null) {
    return NostrService.getInstance(mnemonic)
}