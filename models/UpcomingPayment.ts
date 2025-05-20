import type { Currency } from './Activity';

export interface UpcomingPayment {
  id: string;
  serviceName: string;
  amount: number;
  currency: string;
  dueDate: Date;
}
