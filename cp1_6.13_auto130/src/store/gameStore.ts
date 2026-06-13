import { create } from 'zustand';
import type { GameState, Card, Target, GameStats, GameRecord, AIConfig } from '../../shared/types';
import { GameEngine } from '../game/gameEngine';
import { AIPlayer } from '../ai/aiPlayer';
import { cardApi, statsApi, aiConfigApi } from '../utils/api';

interface GameStore {
  gameEngine: GameEngine | null;
  aiPlayer: AIPlayer | null;
  gameState: GameState | null;
  gameStats: GameStats;
  cardPool: Card[];
  aiConfig: AIConfig | null;
  gameRecords: GameRecord[];
  selectedCardId: string | null;
  selectedUnitId: string | null;
  isAiThinking: boolean;
  gameStartTime: string | null;
  isLoading: boolean;
  error: string | null;
  
  initGame: () => Promise<void>;
  loadCardPool: () => Promise<void>;
  loadAIConfig: () => Promise<void>;
  loadGameRecords: () => Promise<void>;
  saveGameRecord: (winner: 'player' | 'ai') => Promise<void>;
  selectCard: (cardId: string | null) => void;
  selectUnit: (unitId: string | null) => void;
  playCard: (target: Target) => void;
  unitAttack: (attackerId: string, target: Target) => void;
  endTurn: () => void;
  runAITurn: () => Promise<void>;
  resetGame: () => void;
  setError: (error: string | null) => void;
}

const defaultAIConfig: AIConfig = {
  thinkTimeMs: 2000,
  attackUnitPriority: 1.5,
  lowHealthThreshold: 15,
  defenseUrgencyWeight: 2.0,
  summonWhenNoUnitBonus: 3.0,
};

export const useGameStore = create<GameStore>((set, get) => ({
  gameEngine: null,
  aiPlayer: null,
  gameState: null,
  gameStats: {
    totalDamage: 0,
    totalShield: 0,
    unitsKilled: 0,
    totalTurns: 0,
  },
  cardPool: [],
  aiConfig: null,
  gameRecords: [],
  selectedCardId: null,
  selectedUnitId: null,
  isAiThinking: false,
  gameStartTime: null,
  isLoading: false,
  error: null,

  initGame: async () => {
    set({ isLoading: true, error: null });
    try {
      const state = get();
      let cardPool = state.cardPool;
      let aiConfig = state.aiConfig;

      if (cardPool.length === 0) {
        cardPool = await cardApi.getCards();
      }
      if (!aiConfig) {
        aiConfig = await aiConfigApi.getConfig();
      }

      const gameEngine = new GameEngine(cardPool);
      const aiPlayer = new AIPlayer(aiConfig);
      
      set({
        gameEngine,
        aiPlayer,
        gameState: gameEngine.getState(),
        gameStats: gameEngine.getStats(),
        cardPool,
        aiConfig,
        selectedCardId: null,
        selectedUnitId: null,
        isAiThinking: false,
        gameStartTime: new Date().toISOString(),
        isLoading: false,
      });
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : '初始化游戏失败' 
      });
    }
  },

  loadCardPool: async () => {
    set({ isLoading: true });
    try {
      const cards = await cardApi.getCards();
      set({ cardPool: cards, isLoading: false });
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : '加载卡牌库失败' 
      });
    }
  },

  loadAIConfig: async () => {
    set({ isLoading: true });
    try {
      const config = await aiConfigApi.getConfig();
      set({ aiConfig: config, isLoading: false });
    } catch (error) {
      set({ 
        aiConfig: defaultAIConfig,
        isLoading: false, 
      });
    }
  },

  loadGameRecords: async () => {
    set({ isLoading: true });
    try {
      const records = await statsApi.getStats();
      set({ gameRecords: records, isLoading: false });
    } catch (error) {
      set({ 
        isLoading: false, 
        error: error instanceof Error ? error.message : '加载战绩失败' 
      });
    }
  },

  saveGameRecord: async (winner: 'player' | 'ai') => {
    const state = get();
    if (!state.gameState || !state.gameStartTime) return;

    try {
      const record: Omit<GameRecord, '_id'> = {
        startTime: state.gameStartTime,
        endTime: new Date().toISOString(),
        winner,
        playerRemainingHealth: state.gameState.player.hero.health,
        aiRemainingHealth: state.gameState.ai.hero.health,
        totalTurns: state.gameStats.totalTurns,
        playerStats: {
          totalDamage: state.gameStats.totalDamage,
          totalShield: state.gameStats.totalShield,
          unitsKilled: state.gameStats.unitsKilled,
        },
      };
      await statsApi.saveStats(record);
    } catch (error) {
      console.error('保存战绩失败:', error);
    }
  },

  selectCard: (cardId: string | null) => {
    set({ selectedCardId: cardId, selectedUnitId: null });
  },

  selectUnit: (unitId: string | null) => {
    set({ selectedUnitId: unitId, selectedCardId: null });
  },

  playCard: (target: Target) => {
    const state = get();
    if (!state.gameEngine || !state.selectedCardId) return;
    if (state.gameState?.currentPlayer !== 'player') return;

    const result = state.gameEngine.playCard('player', state.selectedCardId, target);
    if (result.success) {
      set({
        gameState: result.newState,
        gameStats: state.gameEngine.getStats(),
        selectedCardId: null,
      });
    }
  },

  unitAttack: (attackerId: string, target: Target) => {
    const state = get();
    if (!state.gameEngine) return;
    if (state.gameState?.currentPlayer !== 'player') return;

    const result = state.gameEngine.unitAttack(attackerId, target);
    if (result.success) {
      set({
        gameState: result.newState,
        gameStats: state.gameEngine.getStats(),
        selectedUnitId: null,
      });
    }
  },

  endTurn: () => {
    const state = get();
    if (!state.gameEngine) return;
    if (state.gameState?.currentPlayer !== 'player') return;

    const newState = state.gameEngine.endTurn();
    set({
      gameState: newState,
      gameStats: state.gameEngine.getStats(),
      selectedCardId: null,
      selectedUnitId: null,
    });
  },

  runAITurn: async () => {
    const state = get();
    if (!state.gameEngine || !state.aiPlayer || !state.gameState) return;
    if (state.gameState.currentPlayer !== 'ai') return;
    if (state.gameState.phase === 'end') return;

    set({ isAiThinking: true });

    const thinkTime = state.aiPlayer.getThinkTime();
    await new Promise(resolve => setTimeout(resolve, thinkTime));

    const currentState = state.gameEngine.getState();
    if (currentState.phase === 'end') {
      set({ isAiThinking: false });
      return;
    }

    const cardAction = state.aiPlayer.chooseBestAction(currentState);
    if (cardAction) {
      const target: Target = {
        type: cardAction.targetType,
        owner: 'player',
        id: cardAction.targetId,
      };
      const result = state.gameEngine.playCard('ai', cardAction.card.id, target);
      if (result.success) {
        set({
          gameState: result.newState,
          gameStats: state.gameEngine.getStats(),
        });
      }
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    let unitAction = state.aiPlayer.chooseBestUnitAction(state.gameEngine.getState());
    while (unitAction && state.gameEngine.getState().phase !== 'end') {
      const result = state.gameEngine.unitAttack(unitAction.attackerId, unitAction.target);
      if (result.success) {
        set({
          gameState: result.newState,
          gameStats: state.gameEngine.getStats(),
        });
      }
      await new Promise(resolve => setTimeout(resolve, 500));
      unitAction = state.aiPlayer.chooseBestUnitAction(state.gameEngine.getState());
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    if (state.gameEngine.getState().phase !== 'end') {
      const newState = state.gameEngine.endTurn();
      set({
        gameState: newState,
        gameStats: state.gameEngine.getStats(),
        isAiThinking: false,
      });
    } else {
      set({ isAiThinking: false });
    }
  },

  resetGame: () => {
    set({
      gameEngine: null,
      aiPlayer: null,
      gameState: null,
      gameStats: {
        totalDamage: 0,
        totalShield: 0,
        unitsKilled: 0,
        totalTurns: 0,
      },
      selectedCardId: null,
      selectedUnitId: null,
      isAiThinking: false,
      gameStartTime: null,
    });
  },

  setError: (error: string | null) => {
    set({ error });
  },
}));
