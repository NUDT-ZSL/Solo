import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { generatePlan as apiGeneratePlan } from '../api/client';
import type { PlanRequest, TravelPlan, DayPlan, TravelContextType } from '../utils/types';

const TravelContext = createContext<TravelContextType | undefined>(undefined);

export const TravelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [plan, setPlan] = useState<TravelPlan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generatePlan = useCallback(async (request: PlanRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiGeneratePlan(request);
      setPlan(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成计划失败');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reorderDays = useCallback((fromIndex: number, toIndex: number) => {
    setPlan(prev => {
      if (!prev) return null;
      const newPlans = [...prev.dailyPlans];
      const [removed] = newPlans.splice(fromIndex, 1);
      newPlans.splice(toIndex, 0, removed);
      const reorderedPlans = newPlans.map((day, idx) => ({ ...day, day: idx + 1 }));
      return { ...prev, dailyPlans: reorderedPlans };
    });
  }, []);

  const removeDay = useCallback((dayId: string) => {
    setPlan(prev => {
      if (!prev) return null;
      const filtered = prev.dailyPlans.filter(d => d.id !== dayId);
      const renumbered = filtered.map((day, idx) => ({ ...day, day: idx + 1 }));
      return { ...prev, dailyPlans: renumbered, days: renumbered.length };
    });
  }, []);

  const updateDayPlan = useCallback((dayId: string, updatedDay: DayPlan) => {
    setPlan(prev => {
      if (!prev) return null;
      return {
        ...prev,
        dailyPlans: prev.dailyPlans.map(d =>
          d.id === dayId ? updatedDay : d
        ),
      };
    });
  }, []);

  const clearPlan = useCallback(() => {
    setPlan(null);
    setError(null);
  }, []);

  const value: TravelContextType = {
    plan,
    isLoading,
    error,
    generatePlan,
    reorderDays,
    removeDay,
    updateDayPlan,
    clearPlan,
  };

  return (
    <TravelContext.Provider value={value}>
      {children}
    </TravelContext.Provider>
  );
};

export const useTravel = (): TravelContextType => {
  const context = useContext(TravelContext);
  if (context === undefined) {
    throw new Error('useTravel must be used within a TravelProvider');
  }
  return context;
};

export default TravelContext;
