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
  isLoadingRequest: boolean;
  requestFailed: boolean;
  showSkeletonLoader: () => void;
  setRequestFailed: (failed: boolean) => void;
}

const PendingRequestsContext = createContext<PendingRequestsContextType | undefined>(undefined);

export const PendingRequestsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Use preloaded data to avoid loading delay on mount
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>(PRELOADED_REQUESTS);
  const [isLoadingRequest, setIsLoadingRequest] = useState(false);
  const [requestFailed, setRequestFailed] = useState(false);
  const [timeoutId, setTimeoutId] = useState<NodeJS.Timeout | null>(null);
  
  // Memoize hasPending to avoid recalculation on every render
  const hasPending = useMemo(() => {
    return pendingRequests.some(req => req.status === 'pending') || isLoadingRequest;
  }, [pendingRequests, isLoadingRequest]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [timeoutId]);

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

  // Show skeleton loader and set timeout for request
  const showSkeletonLoader = useCallback(() => {
    // Clean up any existing timeout
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    setIsLoadingRequest(true);
    setRequestFailed(false);
    
    // Set new timeout for 10 seconds
    const newTimeoutId = setTimeout(() => {
      setIsLoadingRequest(false);
      setRequestFailed(true);
    }, 10000);
    
    setTimeoutId(newTimeoutId);
  }, [timeoutId]);

  // Memoize the context value to prevent recreation on every render
  const contextValue = useMemo(() => ({
    pendingRequests,
    getByType,
    getById,
    approve,
    deny,
    hasPending,
    isLoadingRequest,
    requestFailed,
    showSkeletonLoader,
    setRequestFailed,
  }), [
    pendingRequests, 
    getByType, 
    getById, 
    approve, 
    deny, 
    hasPending, 
    isLoadingRequest, 
    requestFailed,
    showSkeletonLoader,
    setRequestFailed
  ]);

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
