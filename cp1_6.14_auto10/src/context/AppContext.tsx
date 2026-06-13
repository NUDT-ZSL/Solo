import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import type { User, Meeting, Proposal } from '../types';
import { userApi } from '../api';

interface AppContextType {
  currentUser: User | null;
  currentMeeting: Meeting | null;
  currentProposal: Proposal | null;
  login: (userId: string) => Promise<void>;
  logout: () => void;
  setCurrentMeeting: (meeting: Meeting | null) => void;
  setCurrentProposal: (proposal: Proposal | null) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null);
  const [currentProposal, setCurrentProposal] = useState<Proposal | null>(null);

  const login = useCallback(async (userId: string) => {
    const user = await userApi.login(userId);
    setCurrentUser(user);
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setCurrentMeeting(null);
    setCurrentProposal(null);
  }, []);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        currentMeeting,
        currentProposal,
        login,
        logout,
        setCurrentMeeting,
        setCurrentProposal,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
