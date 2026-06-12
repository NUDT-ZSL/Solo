import { useContext } from 'react';
import { AppContext, type AppContextType } from './stateManager';

export function useAppState(): AppContextType {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppState must be used within an AppProvider');
  }
  return context;
}
