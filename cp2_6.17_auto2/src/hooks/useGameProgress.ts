import { useState, useEffect, useCallback } from 'react';
import type { LevelProgress } from '../types';

const STORAGE_KEY = 'darkAlleyProgress';

interface UseGameProgressReturn {
  progress: Record<string, LevelProgress>;
  totalStolen: number;
  totalPossible: number;
  completedLevels: number;
  unlockLevel: (levelId: string) => void;
  markItemStolen: (levelId: string, itemId: string) => void;
  markLevelComplete: (levelId: string) => void;
  isLevelUnlocked: (levelId: string) => boolean;
  getStolenItems: (levelId: string) => string[];
  isLevelComplete: (levelId: string) => boolean;
  resetProgress: () => void;
}

function getDefaultProgress(): Record<string, LevelProgress> {
  return {
    '1': { levelId: '1', stolenItems: [], completed: false, unlocked: true },
    '2': { levelId: '2', stolenItems: [], completed: false, unlocked: false },
    '3': { levelId: '3', stolenItems: [], completed: false, unlocked: false }
  };
}

export function useGameProgress(): UseGameProgressReturn {
  const [progress, setProgress] = useState<Record<string, LevelProgress>>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const defaultProg = getDefaultProgress();
        return { ...defaultProg, ...parsed };
      }
    } catch (e) {
      console.warn('读取本地进度失败，使用默认值');
    }
    return getDefaultProgress();
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
    } catch (e) {
      console.warn('保存进度到本地存储失败');
    }
  }, [progress]);

  const unlockLevel = useCallback((levelId: string) => {
    setProgress(prev => {
      if (!prev[levelId]) return prev;
      if (prev[levelId].unlocked) return prev;
      return {
        ...prev,
        [levelId]: { ...prev[levelId], unlocked: true }
      };
    });
  }, []);

  const markItemStolen = useCallback((levelId: string, itemId: string) => {
    setProgress(prev => {
      const levelProg = prev[levelId] || {
        levelId, stolenItems: [], completed: false, unlocked: true
      };

      if (levelProg.stolenItems.includes(itemId)) return prev;

      return {
        ...prev,
        [levelId]: {
          ...levelProg,
          stolenItems: [...levelProg.stolenItems, itemId]
        }
      };
    });
  }, []);

  const markLevelComplete = useCallback((levelId: string) => {
    setProgress(prev => {
      const levelProg = prev[levelId];
      if (!levelProg) return prev;

      const nextLevelId = String(parseInt(levelId) + 1);
      const updated: Record<string, LevelProgress> = {
        ...prev,
        [levelId]: { ...levelProg, completed: true }
      };

      if (prev[nextLevelId]) {
        updated[nextLevelId] = {
          ...prev[nextLevelId],
          unlocked: true
        };
      }

      return updated;
    });
  }, []);

  const isLevelUnlocked = useCallback((levelId: string) => {
    return progress[levelId]?.unlocked ?? false;
  }, [progress]);

  const getStolenItems = useCallback((levelId: string) => {
    return progress[levelId]?.stolenItems ?? [];
  }, [progress]);

  const isLevelComplete = useCallback((levelId: string) => {
    return progress[levelId]?.completed ?? false;
  }, [progress]);

  const resetProgress = useCallback(() => {
    const defaultProg = getDefaultProgress();
    setProgress(defaultProg);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (e) {}
  }, []);

  const { totalStolen, totalPossible, completedLevels } = Object.values(progress).reduce(
    (acc, level) => {
      acc.totalStolen += level.stolenItems.length;
      acc.totalPossible += 3;
      if (level.completed) acc.completedLevels += 1;
      return acc;
    },
    { totalStolen: 0, totalPossible: 0, completedLevels: 0 }
  );

  return {
    progress,
    totalStolen,
    totalPossible,
    completedLevels,
    unlockLevel,
    markItemStolen,
    markLevelComplete,
    isLevelUnlocked,
    getStolenItems,
    isLevelComplete,
    resetProgress
  };
}
