import { Currency } from './Activity';

export interface UpcomingPayment {
  id: string;
  serviceName: string;
  amount: number;
  currency: Currency;
  dueDate: Date;
}
