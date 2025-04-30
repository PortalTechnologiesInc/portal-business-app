import { Currency } from '@/models/Activity';
import { UpcomingPayment } from '@/models/UpcomingPayment';

export function getMockedUpcomingPayments(): UpcomingPayment[] {
  // Create future dates
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 7);

  const nextMonth = new Date();
  nextMonth.setDate(nextMonth.getDate() + 30);

  return [
    {
      id: '1',
      serviceName: 'Netflix',
      amount: 1499,
      currency: Currency.Eur,
      dueDate: nextWeek,
    },
    {
      id: '2',
      serviceName: 'Spotify',
      amount: 999,
      currency: Currency.Eur,
      dueDate: nextMonth,
    },
  ];
}
