import { AuthChallengeEvent, PaymentRequestEvent, RecurringPaymentRequest } from "portal-app-lib";

export type PendingRequestType = 'login' | 'payment' | 'certificate' | 'identity';

export interface PendingRequest {
  id: string;
  metadata: AuthChallengeEvent | PaymentRequestEvent | RecurringPaymentRequest;
  status: 'pending' | 'approved' | 'denied';
  type: PendingRequestType;
  timestamp: string;
}