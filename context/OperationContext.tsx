import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { router } from 'expo-router';

// Define operation types
export type OperationType = 'charge' | 'verify_ticket' | 'sell_ticket';

// Define operation status
export type OperationStatus = 'idle' | 'pending' | 'success' | 'error';

// Define operation step (reusing existing PaymentStep pattern)
export interface OperationStep {
  id: string;
  status: 'pending' | 'completed' | 'error' | 'success';
  title: string;
  subtitle: string;
  errorType?: 'insufficient_funds' | 'network_error' | 'payment_declined' | 'unknown_error';
}

// Define operation data structure
export interface OperationData {
  id: string;
  type: OperationType;
  status: OperationStatus;
  data?: any; // Operation-specific data (amount, ticket info, etc.)
  steps?: OperationStep[];
  error?: string;
  result?: any; // Operation result data
  startTime?: Date;
  endTime?: Date;
}

// Context type definition
interface OperationContextType {
  currentOperation: OperationData | null;

  // Operation management
  startOperation: (type: OperationType, data?: any) => string;
  updateOperationStatus: (
    id: string,
    status: OperationStatus,
    error?: string,
    result?: any
  ) => void;
  updateOperationSteps: (id: string, steps: OperationStep[]) => void;
  addOperationStep: (id: string, step: OperationStep) => void;
  updateOperationStep: (id: string, stepId: string, updates: Partial<OperationStep>) => void;
  completeOperation: (id: string, result?: any) => void;
  failOperation: (id: string, error: string) => void;
  cancelOperation: (id: string) => void;
  clearOperation: () => void;

  // Navigation helpers
  navigateToPending: (operationId: string) => void;
  navigateToResult: (operationId: string) => void;
  navigateBack: () => void;
}

const OperationContext = createContext<OperationContextType | undefined>(undefined);

export const OperationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentOperation, setCurrentOperation] = useState<OperationData | null>(null);

  // Generate unique operation ID
  const generateOperationId = useCallback(() => {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }, []);

  // Start a new operation
  const startOperation = useCallback(
    (type: OperationType, data?: any): string => {
      const operationId = generateOperationId();
      const newOperation: OperationData = {
        id: operationId,
        type,
        status: 'pending',
        data,
        steps: [],
        startTime: new Date(),
      };

      setCurrentOperation(newOperation);
      return operationId;
    },
    [generateOperationId]
  );

  // Update operation status
  const updateOperationStatus = useCallback(
    (id: string, status: OperationStatus, error?: string, result?: any) => {
      setCurrentOperation(prev => {
        if (!prev || prev.id !== id) return prev;

        const updates: Partial<OperationData> = { status };

        if (status === 'success' || status === 'error') {
          updates.endTime = new Date();
        }

        if (error) {
          updates.error = error;
        }

        if (result !== undefined) {
          updates.result = result;
        }

        return { ...prev, ...updates };
      });
    },
    []
  );

  // Update operation steps
  const updateOperationSteps = useCallback((id: string, steps: OperationStep[]) => {
    setCurrentOperation(prev => {
      if (!prev || prev.id !== id) return prev;
      return { ...prev, steps };
    });
  }, []);

  // Add a new step to operation
  const addOperationStep = useCallback((id: string, step: OperationStep) => {
    setCurrentOperation(prev => {
      if (!prev || prev.id !== id) return prev;
      const newSteps = [...(prev.steps || []), step];
      return { ...prev, steps: newSteps };
    });
  }, []);

  // Update specific step in operation
  const updateOperationStep = useCallback(
    (id: string, stepId: string, updates: Partial<OperationStep>) => {
      setCurrentOperation(prev => {
        if (!prev || prev.id !== id) return prev;

        const newSteps = (prev.steps || []).map(step =>
          step.id === stepId ? { ...step, ...updates } : step
        );

        return { ...prev, steps: newSteps };
      });
    },
    []
  );

  // Complete operation successfully
  const completeOperation = useCallback(
    (id: string, result?: any) => {
      updateOperationStatus(id, 'success', undefined, result);
    },
    [updateOperationStatus]
  );

  // Fail operation with error
  const failOperation = useCallback(
    (id: string, error: string) => {
      updateOperationStatus(id, 'error', error);
    },
    [updateOperationStatus]
  );

  // Cancel operation
  const cancelOperation = useCallback((id: string) => {
    setCurrentOperation(prev => {
      if (!prev || prev.id !== id) return prev;
      return {
        ...prev,
        status: 'error',
        error: 'Operation cancelled by user',
        endTime: new Date(),
      };
    });
  }, []);

  // Clear current operation
  const clearOperation = useCallback(() => {
    setCurrentOperation(null);
  }, []);

  // Navigation helpers
  const navigateToPending = useCallback((operationId: string) => {
    router.push(`/operation-pending?id=${operationId}`);
  }, []);

  const navigateToResult = useCallback((operationId: string) => {
    router.replace(`/operation-result?id=${operationId}`);
  }, []);

  const navigateBack = useCallback(() => {
    router.back();
  }, []);

  const contextValue: OperationContextType = {
    currentOperation,
    startOperation,
    updateOperationStatus,
    updateOperationSteps,
    addOperationStep,
    updateOperationStep,
    completeOperation,
    failOperation,
    cancelOperation,
    clearOperation,
    navigateToPending,
    navigateToResult,
    navigateBack,
  };

  return <OperationContext.Provider value={contextValue}>{children}</OperationContext.Provider>;
};

// Custom hook to use operation context
export const useOperation = () => {
  const context = useContext(OperationContext);
  if (context === undefined) {
    throw new Error('useOperation must be used within an OperationProvider');
  }
  return context;
};

// Helper functions for common operation patterns
export const createChargeOperation = (amount: number, currency: string) => ({
  amount,
  currency,
  description: `Charge ${amount} ${currency}`,
});

export const createTicketVerifyOperation = (ticketId: string, ticketTitle?: string) => ({
  ticketId,
  ticketTitle,
  description: `Verify ticket: ${ticketTitle || ticketId}`,
});

export const createTicketSellOperation = (
  ticketId: string,
  ticketTitle?: string,
  price?: number
) => ({
  ticketId,
  ticketTitle,
  price,
  description: `Sell ticket: ${ticketTitle || ticketId}`,
});
