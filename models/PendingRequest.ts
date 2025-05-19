import { AuthChallengeEvent, RecurringPaymentRequest, SinglePaymentRequest } from "portal-app-lib";

export type PendingRequestType = 'login' | 'payment' | 'certificate' | 'identity' | 'subscription';

export interface PendingRequest {
  id: string;
  metadata: AuthChallengeEvent | RecurringPaymentRequest | SinglePaymentRequest;
  status: 'pending' | 'approved' | 'denied';
  type: PendingRequestType;
  timestamp: string;
}