import { PendingRequest } from '../models/PendingRequest';

export const mockPendingRequests: PendingRequest[] = [
  {
    id: '1',
    type: 'login',
    status: 'pending',
    timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
    title: 'New login attempt',
    description: 'Someone is trying to login to your account from a new device',
    metadata: {
      ipAddress: '192.168.1.1',
      device: 'iPhone 14',
      location: 'Milan, Italy',
      requester: 'musicify.com',
      recipient: 'npub1qyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqs0lh9nc',
    },
  },
  {
    id: '2',
    type: 'payment',
    status: 'pending',
    timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    title: 'Payment authorization',
    description: 'Authorization required for a payment of €150',
    metadata: {
      amount: 150,
      requester: 'shop.xyz',
      recipient: 'npub2qyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqsnf5754',
    },
  },
  {
    id: '3',
    type: 'certificate',
    status: 'pending',
    timestamp: new Date(Date.now() - 2 * 3600000).toISOString(),
    title: 'Certificate signature request',
    description: 'A document requires your digital signature',
    metadata: {
      certificateType: 'Document Signature',
      requester: 'HR Department',
      recipient: 'npub3qyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqsn839xy',
    },
  },
  {
    id: '4',
    type: 'identity',
    status: 'pending',
    timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
    title: 'Identity verification',
    description: 'A service is requesting to verify your identity',
    metadata: {
      requester: 'defiapp.finance',
      recipient: 'npub4qyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqszqgpqyqsabcdef',
    },
  },
]; 