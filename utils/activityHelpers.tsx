import React from 'react';
import { CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react-native';
import { ActivityType } from '@/models/Activity';

export type ActivityStatus = 'success' | 'failed' | 'pending';

export const getActivityStatus = (detail: string): ActivityStatus => {
  const lowerDetail = detail.toLowerCase();
  if (lowerDetail.includes('approved') || lowerDetail.includes('success')) {
    return 'success';
  } else if (
    lowerDetail.includes('failed') ||
    lowerDetail.includes('denied') ||
    lowerDetail.includes('error') ||
    lowerDetail.includes('rejected')
  ) {
    return 'failed';
  } else {
    return 'pending';
  }
};

export const getStatusColor = (
  status: ActivityStatus,
  colors: {
    statusConnected: string;
    statusWarning: string;
    statusError: string;
    textSecondary: string;
  }
): string => {
  switch (status) {
    case 'success':
      return colors.statusConnected;
    case 'pending':
      return colors.statusWarning;
    case 'failed':
      return colors.statusError;
    default:
      return colors.textSecondary;
  }
};

export const getStatusIcon = (
  status: ActivityStatus,
  colors: {
    statusConnected: string;
    statusWarning: string;
    statusError: string;
    textSecondary: string;
  },
  size: number = 16
): React.ReactElement => {
  switch (status) {
    case 'success':
      return <CheckCircle size={size} color={colors.statusConnected} />;
    case 'pending':
      return <Clock size={size} color={colors.statusWarning} />;
    case 'failed':
      return <XCircle size={size} color={colors.statusError} />;
    default:
      return <AlertCircle size={size} color={colors.textSecondary} />;
  }
};

export const getStatusText = (status: ActivityStatus): string => {
  switch (status) {
    case 'success':
      return 'Completed';
    case 'pending':
      return 'Pending';
    case 'failed':
      return 'Failed';
    default:
      return 'Unknown';
  }
};

export const getActivityTypeText = (type: string): string => {
  return type === ActivityType.Auth ? 'Login Request' : 'Payment';
};

export const getActivityDescription = (type: string, status: ActivityStatus, detail: string): string => {
  if (type === ActivityType.Auth) {
    switch (status) {
      case 'success':
        return 'You successfully authenticated with this service';
      case 'failed':
        if (detail.toLowerCase().includes('denied')) {
          return 'You denied the authentication request';
        }
        return 'Authentication was denied or failed';
      case 'pending':
        return 'Authentication is being processed';
      default:
        return 'Authentication request';
    }
  } else {
    switch (status) {
      case 'success':
        return 'Payment was completed successfully';
      case 'failed':
        if (detail.toLowerCase().includes('denied')) {
          return 'You denied the payment request';
        }
        return 'Payment failed or was rejected';
      case 'pending':
        return 'Payment is being processed';
      default:
        return 'Payment request';
    }
  }
};

export const formatSatsToUSD = (sats: number, conversionRate: number = 0.0004): string => {
  return `≈ $${(sats * conversionRate).toFixed(2)} USD`;
}; 