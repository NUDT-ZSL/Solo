import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, USERS } from '../types';

interface UserContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  isTransitioning: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<User>(USERS[0]);
  const [isTransitioning, setIsTransitioning] = useState(false);

  const setCurrentUser = (user: User) => {
    if (user.id === currentUser.id) return;
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentUserState(user);
      setTimeout(() => setIsTransitioning(false), 300);
    }, 300);
  };

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, isTransitioning }}>
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
