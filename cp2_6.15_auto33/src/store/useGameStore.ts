import { create } from 'zustand';
import type { GameState, PlayerId, LeaderboardEntry } from '../shared/types';

interface GameStore {
  playerName: string;
  setPlayerName: (name: string) => void;
  
  playerId: PlayerId | null;
  setPlayerId: (id: PlayerId | null) => void;
  
  gameId: string | null;
  setGameId: (id: string | null) => void;
  
  queueId: string | null;
  setQueueId: (id: string | null) => void;
  
  matchStatus: 'idle' | 'waiting' | 'matched' | 'playing' | 'ended' | 'failed';
  setMatchStatus: (status: 'idle' | 'waiting' | 'matched' | 'playing' | 'ended' | 'failed') => void;
  
  gameState: GameState | null;
  setGameState: (state: GameState | null) => void;
  
  winner: PlayerId | 'draw' | null;
  setWinner: (winner: PlayerId | 'draw' | null) => void;
  
  leaderboard: LeaderboardEntry[];
  setLeaderboard: (entries: LeaderboardEntry[]) => void;
  
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
  setConnectionStatus: (status: 'disconnected' | 'connecting' | 'connected' | 'reconnecting') => void;
  
  resetGame: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  playerName: '',
  setPlayerName: (name) => set({ playerName: name }),
  
  playerId: null,
  setPlayerId: (id) => set({ playerId: id }),
  
  gameId: null,
  setGameId: (id) => set({ gameId: id }),
  
  queueId: null,
  setQueueId: (id) => set({ queueId: id }),
  
  matchStatus: 'idle',
  setMatchStatus: (status) => set({ matchStatus: status }),
  
  gameState: null,
  setGameState: (state) => set({ gameState: state }),
  
  winner: null,
  setWinner: (winner) => set({ winner }),
  
  leaderboard: [],
  setLeaderboard: (entries) => set({ leaderboard: entries }),
  
  connectionStatus: 'disconnected',
  setConnectionStatus: (status) => set({ connectionStatus: status }),
  
  resetGame: () => set({
    gameId: null,
    queueId: null,
    matchStatus: 'idle',
    gameState: null,
    winner: null,
    playerId: null,
    connectionStatus: 'disconnected',
  }),
}));
