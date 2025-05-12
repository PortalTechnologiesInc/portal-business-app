import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo, useCallback } from 'react';
import { PendingRequest, PendingRequestType } from '../models/PendingRequest';
import { mockPendingRequests } from '../mocks/PendingRequests';

// Preload mock data to avoid loading delay when the context is used
const PRELOADED_REQUESTS = mockPendingRequests;

interface PendingRequestsContextType {
  pendingRequests: PendingRequest[];
  getByType: (type: PendingRequestType) => PendingRequest[];
  getById: (id: string) => PendingRequest | undefined;
  approve: (id: string) => void;
  deny: (id: string) => void;
  hasPending: boolean;
}

const PendingRequestsContext = createContext<PendingRequestsContextType | undefined>(undefined);

export const PendingRequestsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use preloaded data to avoid loading delay on mount
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>(PRELOADED_REQUESTS);
  
  // Memoize hasPending to avoid recalculation on every render
  const hasPending = useMemo(() => {
    return pendingRequests.some(req => req.status === 'pending');
  }, [pendingRequests]);

  // Memoize these functions to prevent recreation on every render
  const getByType = useCallback((type: PendingRequestType) => {
    return pendingRequests.filter(request => request.type === type);
  }, [pendingRequests]);

  const getById = useCallback((id: string) => {
    return pendingRequests.find(request => request.id === id);
  }, [pendingRequests]);

  const approve = useCallback((id: string) => {
    setPendingRequests(prev =>
      prev.map(request => (request.id === id ? { ...request, status: 'approved' } : request))
    );
    // In a real implementation, you would send this to an API
    console.log(`Request ${id} approved`);
  }, []);

  const deny = useCallback((id: string) => {
    setPendingRequests(prev =>
      prev.map(request => (request.id === id ? { ...request, status: 'denied' } : request))
    );
    // In a real implementation, you would send this to an API
    console.log(`Request ${id} denied`);
  }, []);

  // Memoize the context value to prevent recreation on every render
  const contextValue = useMemo(() => ({
    pendingRequests,
    getByType,
    getById,
    approve,
    deny,
    hasPending,
  }), [pendingRequests, getByType, getById, approve, deny, hasPending]);

  return (
    <PendingRequestsContext.Provider value={contextValue}>
      {children}
    </PendingRequestsContext.Provider>
  );
};

export const usePendingRequests = () => {
  const context = useContext(PendingRequestsContext);
  if (context === undefined) {
    throw new Error('usePendingRequests must be used within a PendingRequestsProvider');
  }
  return context;
};
