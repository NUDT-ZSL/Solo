import React, { createContext, useContext, useState, ReactNode } from 'react';
import { User, USERS } from '../types';

type SlideDirection = 'left' | 'right' | null;

interface UserContextType {
  currentUser: User;
  setCurrentUser: (user: User) => void;
  isTransitioning: boolean;
  slideDirection: SlideDirection;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUserState] = useState<User>(USERS[0]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [slideDirection, setSlideDirection] = useState<SlideDirection>(null);

  const setCurrentUser = (user: User) => {
    if (user.id === currentUser.id) return;

    const currentIndex = USERS.findIndex((u) => u.id === currentUser.id);
    const newIndex = USERS.findIndex((u) => u.id === user.id);
    const direction: SlideDirection = newIndex > currentIndex ? 'right' : 'left';

    setSlideDirection(direction);
    setIsTransitioning(true);

    setTimeout(() => {
      setCurrentUserState(user);
      setTimeout(() => {
        setIsTransitioning(false);
        setTimeout(() => setSlideDirection(null), 50);
      }, 350);
    }, 300);
  };

  return (
    <UserContext.Provider value={{ currentUser, setCurrentUser, isTransitioning, slideDirection }}>
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
