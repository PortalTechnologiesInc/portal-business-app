import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { PendingRequest, PendingRequestType } from '../models/PendingRequest';
import { mockPendingRequests } from '../mocks/PendingRequests';

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
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [hasPending, setHasPending] = useState(false);

  useEffect(() => {
    // In a real implementation, this would fetch data from an API
    setPendingRequests(mockPendingRequests);
  }, []);

  useEffect(() => {
    setHasPending(pendingRequests.some(req => req.status === 'pending'));
  }, [pendingRequests]);

  const getByType = (type: PendingRequestType) => {
    return pendingRequests.filter(request => request.type === type);
  };

  const getById = (id: string) => {
    return pendingRequests.find(request => request.id === id);
  };

  const approve = (id: string) => {
    setPendingRequests(prev => 
      prev.map(request => 
        request.id === id ? { ...request, status: 'approved' } : request
      )
    );
    // In a real implementation, you would send this to an API
    console.log(`Request ${id} approved`);
  };

  const deny = (id: string) => {
    setPendingRequests(prev => 
      prev.map(request => 
        request.id === id ? { ...request, status: 'denied' } : request
      )
    );
    // In a real implementation, you would send this to an API
    console.log(`Request ${id} denied`);
  };

  return (
    <PendingRequestsContext.Provider 
      value={{ 
        pendingRequests, 
        getByType, 
        getById, 
        approve, 
        deny, 
        hasPending 
      }}
    >
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