import { createContext, useContext } from 'react';
import { FishManager } from './FishManager';
import { SonarSystem } from './SonarSystem';

export interface SimContextType {
  fishManager: FishManager;
  sonarSystem: SonarSystem;
}

export const SimContext = createContext<SimContextType | null>(null);

export function useSim() {
  const ctx = useContext(SimContext);
  if (!ctx) throw new Error('useSim must be used within SimProvider');
  return ctx;
}
