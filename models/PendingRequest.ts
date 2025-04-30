export type PendingRequestType = 'login' | 'payment' | 'certificate' | 'identity';

export interface PendingRequest {
  id: string;
  type: PendingRequestType;
  status: 'pending' | 'approved' | 'denied';
  timestamp: string;
  title: string;
  description: string;
  metadata: {
    requester?: string;
    amount?: number;
    recipient?: string;
    ipAddress?: string;
    device?: string;
    location?: string;
    certificateType?: string;
  };
} 