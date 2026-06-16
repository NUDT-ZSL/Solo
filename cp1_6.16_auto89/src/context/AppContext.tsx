import React, { createContext, useContext, useState, ReactNode } from 'react';

interface AppContextType {
  isLoggedIn: boolean;
  isEditMode: boolean;
  setIsLoggedIn: (value: boolean) => void;
  setIsEditMode: (value: boolean) => void;
  toggleLogin: () => void;
  toggleEditMode: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const toggleLogin = () => {
    setIsLoggedIn((prev) => !prev);
    if (isEditMode) {
      setIsEditMode(false);
    }
  };

  const toggleEditMode = () => {
    if (isLoggedIn) {
      setIsEditMode((prev) => !prev);
    }
  };

  return (
    <AppContext.Provider
      value={{
        isLoggedIn,
        isEditMode,
        setIsLoggedIn,
        setIsEditMode,
        toggleLogin,
        toggleEditMode,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
