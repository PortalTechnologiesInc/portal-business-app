import { Timestamp } from "react-native-reanimated/lib/typescript/commonTypes";
import { Currency } from "./Activity";

interface RecurringPaymentsRequestContent {
    amount: number;
    currency: Currency;
    recurrence: RecurrenceInfo;
    currentExchangeRate?: any;
    expiresAt: Timestamp;
    authToken?: string;
}
interface RecurrenceInfo {
    until?: Timestamp;
    calendar: string;
    maxPayments?: Number;
    firstPaymentDue: Timestamp;
}

export type Subscription = RecurringPaymentsRequestContent & {
    id:string;
    serviceName: string;
    servicePub: String;
}
