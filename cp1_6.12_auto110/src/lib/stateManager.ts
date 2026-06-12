import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import * as React from 'react';

export type ThemeMode = 'light' | 'dark';
export type DataState = 'loading' | 'empty' | 'error' | 'normal';

interface AppState {
  selectedComponentId: string;
  theme: ThemeMode;
  dataState: DataState;
}

interface AppContextType extends AppState {
  setSelectedComponentId: (id: string) => void;
  toggleTheme: () => void;
  setDataState: (state: DataState) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const initialState: AppState = {
  selectedComponentId: 'button',
  theme: 'light',
  dataState: 'normal',
};

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, setState] = useState<AppState>(initialState);

  const setSelectedComponentId = useCallback((id: string) => {
    setState(prev => ({ ...prev, selectedComponentId: id }));
  }, []);

  const toggleTheme = useCallback(() => {
    setState(prev => ({
      ...prev,
      theme: prev.theme === 'light' ? 'dark' : 'light',
    }));
  }, []);

  const setDataState = useCallback((dataState: DataState) => {
    setState(prev => ({ ...prev, dataState }));
  }, []);

  const contextValue: AppContextType = {
    ...state,
    setSelectedComponentId,
    toggleTheme,
    setDataState,
  };

  return React.createElement(
    AppContext.Provider,
    { value: contextValue },
    children
  );
};

export const useAppState = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
};
