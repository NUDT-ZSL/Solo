import { createContext, useContext } from 'react';
import { SoundWave } from './SoundWaveEngine';
import { Wall, Gem } from './MazeGen';

export interface GameContextType {
  walls: Wall[];
  gems: Gem[];
  waves: SoundWave[];
  score: number;
  timeLeft: number;
  gameState: 'playing' | 'ended';
  playerX: number;
  playerY: number;
  mazeOffsetX: number;
  mazeOffsetY: number;
}

export const GameContext = createContext<GameContextType | null>(null);

export const useGameContext = (): GameContextType => {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGameContext must be used within GameProvider');
  }
  return ctx;
};
