import portalLib, { AuthChallengeEvent, Mnemonic, parseAuthInitUrl, PaymentStatusContent, RecurringPaymentStatusContent } from 'portal-app-lib';
import type { AuthChallengeListener, PaymentRequestListener, PortalAppInterface, RecurringPaymentRequest, SinglePaymentRequest } from 'portal-app-lib/lib/typescript/src/generated/app';

const DEFAULT_RELAYS = [
    'wss://relay.damus.io',
    'wss://relay.nostr.net'
];

class LocalAuthChallengeListener implements AuthChallengeListener {

    private callback: (event: AuthChallengeEvent) => Promise<boolean>;

    constructor(callback: (event: AuthChallengeEvent) => Promise<boolean>) {
        this.callback = callback;
    }

    onAuthChallenge(event: AuthChallengeEvent): Promise<boolean> {
        return this.callback(event);
    }
}

class LocalPaymentRequestListener implements PaymentRequestListener {

    private singleCb: (event: SinglePaymentRequest) => Promise<PaymentStatusContent>;

    private recurringCb: (event: RecurringPaymentRequest) => Promise<RecurringPaymentStatusContent>;

    constructor(singleCb: (event: SinglePaymentRequest) => Promise<PaymentStatusContent>, recurringCb: (event: RecurringPaymentRequest) => Promise<RecurringPaymentStatusContent>) {
        this.singleCb = singleCb;
        this.recurringCb = recurringCb;
    }

    onSinglePaymentRequest(event: SinglePaymentRequest): Promise<PaymentStatusContent> {
        return this.singleCb(event);
    }

    onRecurringPaymentRequest(event: RecurringPaymentRequest): Promise<RecurringPaymentStatusContent> {
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

    public static getInstance(mnemonic: Mnemonic): NostrService {
        if (!NostrService.instance) {
            NostrService.instance = new NostrService();
            NostrService.instance.initialize(mnemonic);
        }
        return NostrService.instance;
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
                if (_self.dedup.has(event.challenge)) {
                    return Promise.resolve(false);
                }
                _self.dedup.set(event.challenge, true);
                return _self.authChallengeListener?.onAuthChallenge(event) ?? Promise.resolve(false);
            }));
            this.portalApp.listenForPaymentRequest(new LocalPaymentRequestListener((singleEvent) => {
                console.log('Single payment request', singleEvent);
                if (_self.dedup.has(singleEvent.content.invoice)) {
                    return Promise.resolve(new PaymentStatusContent.Rejected({ reason: 'Duplicate payment request' }));
                }
                _self.dedup.set(singleEvent.content.invoice, true);
                return _self.paymentRequestListener?.onSinglePaymentRequest(singleEvent) ?? Promise.resolve(new PaymentStatusContent.Rejected({ reason: 'Not implemented' }));
            }, (recurringEvent) => {
                const key = `${recurringEvent.serviceKey.toString()}-${recurringEvent.content.amount.toString()}-${recurringEvent.expiresAt.toString()}`;
                if (_self.dedup.has(key)) {
                    return Promise.resolve(new RecurringPaymentStatusContent.Rejected({ reason: 'Duplicate recurring payment request' }));
                }
                _self.dedup.set(key, true);
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

    public sendAuthInit(url: string): Promise<void> {
        console.log('Sending auth init', url);
        const parsedUrl = parseAuthInitUrl(url);
        return this.checkInitialized().sendAuthInit(parsedUrl);
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
}

// Export a single instance
export default NostrService.getInstance