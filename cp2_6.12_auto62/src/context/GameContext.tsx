import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { PlayerProgress } from '../types';
import { loadProgress, saveProgress, updateDailyTaskProgress, unlockCard, addFragments, calculateLevel } from '../utils/storage';
import { CardData } from '../data/cards';

interface GameContextType {
  progress: PlayerProgress;
  setProgress: React.Dispatch<React.SetStateAction<PlayerProgress>>;
  refreshGalleryViews: () => void;
  refreshBattleParticipation: () => void;
  refreshBattleWin: () => void;
  tryUnlockCard: (cardId: string) => boolean;
  addRandomFragment: () => { cardId: string; amount: number };
  addExperience: (amount: number) => void;
  getUnlockedCardData: () => CardData[];
  selectedBattleCard: CardData | null;
  setSelectedBattleCard: (card: CardData | null) => void;
}

const GameContext = createContext<GameContextType | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress());
  const [selectedBattleCard, setSelectedBattleCard] = useState<CardData | null>(null);

  useEffect(() => {
    saveProgress(progress);
  }, [progress]);

  const refreshGalleryViews = useCallback(() => {
    setProgress(prev => {
      let updated = { ...prev, totalGalleryViews: prev.totalGalleryViews + 1 };
      updated = updateDailyTaskProgress(updated, 'gallery_view', 1);
      return updated;
    });
  }, []);

  const refreshBattleParticipation = useCallback(() => {
    setProgress(prev => {
      let updated = { ...prev, totalBattles: prev.totalBattles + 1 };
      updated = updateDailyTaskProgress(updated, 'battle_participate', 1);
      return updated;
    });
  }, []);

  const refreshBattleWin = useCallback(() => {
    setProgress(prev => {
      let updated = { ...prev, totalWins: prev.totalWins + 1 };
      updated = updateDailyTaskProgress(updated, 'battle_win', 1);
      return updated;
    });
  }, []);

  const tryUnlockCard = useCallback((cardId: string): boolean => {
    let unlocked = false;
    setProgress(prev => {
      const newProgress = unlockCard(prev, cardId);
      if (newProgress !== prev) {
        unlocked = true;
        return newProgress;
      }
      return prev;
    });
    return unlocked;
  }, []);

  const addRandomFragment = useCallback((): { cardId: string; amount: number } => {
    let result: { cardId: string; amount: number } = { cardId: '', amount: 0 };
    setProgress(prev => {
      const randomIndex = Math.floor(Math.random() * Math.min(5, prev.unlockedCards.length + 3));
      const availablePool = prev.unlockedCards.length > 0
        ? prev.unlockedCards.slice(0, 5)
        : ['dandelion', 'butterfly', 'dragonfly', 'sunflower', 'bee'];
      const cardId = availablePool[randomIndex % availablePool.length];
      const amount = Math.random() < 0.3 ? 2 : 1;
      result = { cardId, amount };
      return addFragments(prev, cardId, amount);
    });
    return result;
  }, []);

  const addExperience = useCallback((amount: number) => {
    setProgress(prev => {
      const newExp = prev.experience + amount;
      return {
        ...prev,
        experience: newExp,
        level: calculateLevel(newExp)
      };
    });
  }, []);

  const getUnlockedCardData = useCallback((): CardData[] => {
    return [];
  }, []);

  const value = useMemo(() => ({
    progress,
    setProgress,
    refreshGalleryViews,
    refreshBattleParticipation,
    refreshBattleWin,
    tryUnlockCard,
    addRandomFragment,
    addExperience,
    getUnlockedCardData,
    selectedBattleCard,
    setSelectedBattleCard
  }), [
    progress,
    refreshGalleryViews,
    refreshBattleParticipation,
    refreshBattleWin,
    tryUnlockCard,
    addRandomFragment,
    addExperience,
    getUnlockedCardData,
    selectedBattleCard
  ]);

  return (
    <GameContext.Provider value={value}>
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextType => {
  const ctx = useContext(GameContext);
  if (!ctx) {
    throw new Error('useGame must be used within a GameProvider');
  }
  return ctx;
};
