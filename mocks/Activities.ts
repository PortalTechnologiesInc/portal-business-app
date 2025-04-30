import { Activity, ActivityType, Currency } from '@/models/Activity';

export function getMockedActivities(): Activity[] {
  return [
    { type: ActivityType.Auth, name: 'Instagram', detail: 'a3qp4Idn3iNDi3Ld...', date: new Date() },
    {
      type: ActivityType.Pay,
      amount: -800,
      currency: Currency.Eur,
      name: 'Musicfly',
      detail: 'a3qp4Idn3iNDi3Ld...',
      date: new Date(),
    },
    {
      type: ActivityType.Pay,
      amount: 5000,
      currency: Currency.Eur,
      name: 'JustEat',
      detail: 'a3qp4Idn3iNDi3Ld...',
      date: new Date(),
    },
    { type: ActivityType.Auth, name: 'Facebook', detail: 'a3qp4Idn3iNDi3Ld...', date: new Date() },
    { type: ActivityType.Auth, name: 'INPS', detail: 'a3qp4Idn3iNDi3Ld...', date: new Date() },
    {
      type: ActivityType.Pay,
      amount: 6000,
      currency: Currency.Eur,
      name: '888caino',
      detail: 'a3qp4Idn3iNDi3Ld...',
      date: new Date(),
    },
    { type: ActivityType.Auth, name: '888caino', detail: 'a3qp4Idn3iNDi3Ld...', date: new Date() },
    {
      type: ActivityType.Pay,
      amount: 5040,
      currency: Currency.Eur,
      name: 'YouTube',
      detail: 'a3qp4Idn3iNDi3Ld...',
      date: new Date(),
    },
    {
      type: ActivityType.Pay,
      amount: -999,
      currency: Currency.Eur,
      name: 'JustEat',
      detail: 'a3qp4Idn3iNDi3Ld...',
      date: new Date(),
    },
  ];
}
