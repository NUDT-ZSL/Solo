import { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

export type ThemeMode = 'light' | 'dark';
export type DataState = 'loading' | 'empty' | 'error' | 'normal';

export interface AppState {
  selectedComponentId: string;
  theme: ThemeMode;
  dataState: DataState;
}

export interface AppContextType extends AppState {
  setSelectedComponentId: (id: string) => void;
  toggleTheme: () => void;
  setDataState: (state: DataState) => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const initialAppState: AppState = {
  selectedComponentId: 'button',
  theme: 'light',
  dataState: 'normal',
};

export function useAppState(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
}

export type { ReactNode };
