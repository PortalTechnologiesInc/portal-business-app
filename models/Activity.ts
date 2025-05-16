export type Activity =
  | {
      type: ActivityType.Pay;
      amount: number;
      currency: Currency;
      name: string;
      detail: string;
      date: Date;
    }
  | {
      type: ActivityType.Auth;
      name: string;
      detail: string;
      date: Date;
    };
export enum ActivityType {
  Auth = 0,
  Pay = 1,
}
export enum Currency {
  Eur = '€',
  USD = '$',
}
