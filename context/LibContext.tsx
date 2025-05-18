import { AuthChallengeEvent, RecurringPaymentRequest, SinglePaymentRequest } from "portal-app-lib";
import { createContext, ReactNode, useMemo } from "react";

interface LibContextType {
    authChallengeEvent: AuthChallengeEvent[];
    singlePaymentRequest: SinglePaymentRequest[];
    recurringPaymentRequest: RecurringPaymentRequest[];
    approve: (id: string) => void;
    deny: (id: string) => void;
    hasPending: boolean;
}

const LibContext = createContext<LibContextType | null>(null);
export const LibProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const contextValue = useMemo(() => ({
        authChallengeEvent,
        singlePaymentRequest,
        recurringPaymentRequest,
        approve,
        deny,
        hasPending,
    }), [
        authChallengeEvent,
        singlePaymentRequest,
        recurringPaymentRequest,
        approve,
        deny,
        hasPending,
    ]);
    return (
        <LibContext.Provider
            value={{ isLoading }}
        >
            {children}
        </LibContext.Provider>
    );
}