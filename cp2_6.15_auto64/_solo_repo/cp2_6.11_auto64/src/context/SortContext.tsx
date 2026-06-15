import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import type { AlgorithmType, SortStep, HistoryRecord, SortResult } from '../types';
import { simulateSort, generateRandomArray, algorithmNames } from '../utils/sortSimulator';

interface SortContextType {
  algorithm: AlgorithmType;
  setAlgorithm: (alg: AlgorithmType) => void;
  arrayLength: number;
  setArrayLength: (len: number) => void;
  valueMin: number;
  setValueMin: (v: number) => void;
  valueMax: number;
  setValueMax: (v: number) => void;
  currentArray: number[];
  steps: SortStep[];
  currentStepIndex: number;
  setCurrentStepIndex: (idx: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
  speed: number;
  setSpeed: (s: number) => void;
  history: HistoryRecord[];
  generateArray: () => void;
  startSort: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  jumpToStep: (idx: number) => void;
  saveHistory: (result: SortResult) => Promise<void>;
  loadHistory: (record: HistoryRecord) => void;
  fetchHistory: () => Promise<void>;
  isComplete: boolean;
  initialArray: number[];
}

const SortContext = createContext<SortContextType | null>(null);

export const SortProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [algorithm, setAlgorithm] = useState<AlgorithmType>('bubble');
  const [arrayLength, setArrayLength] = useState(10);
  const [valueMin, setValueMin] = useState(1);
  const [valueMax, setValueMax] = useState(100);
  const [initialArray, setInitialArray] = useState<number[]>([]);
  const [currentArray, setCurrentArray] = useState<number[]>([]);
  const [steps, setSteps] = useState<SortStep[]>([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [isComplete, setIsComplete] = useState(false);
  const historySavedRef = useRef(false);

  const generateArray = useCallback(() => {
    const arr = generateRandomArray(arrayLength, valueMin, valueMax);
    setInitialArray(arr);
    setCurrentArray(arr);
    setSteps([]);
    setCurrentStepIndex(0);
    setIsPlaying(false);
    setIsComplete(false);
    historySavedRef.current = false;
  }, [arrayLength, valueMin, valueMax]);

  const startSort = useCallback(() => {
    if (initialArray.length === 0) {
      generateArray();
      return;
    }
    const result = simulateSort(algorithm, initialArray);
    setSteps(result.steps);
    setCurrentStepIndex(0);
    setCurrentArray(initialArray);
    setIsComplete(false);
    setIsPlaying(true);
    historySavedRef.current = false;
  }, [algorithm, initialArray, generateArray]);

  const stepForward = useCallback(() => {
    if (currentStepIndex < steps.length - 1) {
      const nextIdx = currentStepIndex + 1;
      setCurrentStepIndex(nextIdx);
      if (steps[nextIdx]) {
        setCurrentArray(steps[nextIdx].array);
      }
      if (nextIdx >= steps.length - 1) {
        setIsPlaying(false);
        setIsComplete(true);
      }
    } else if (steps.length > 0 && currentStepIndex === steps.length - 1) {
      setIsComplete(true);
      setIsPlaying(false);
    }
  }, [currentStepIndex, steps]);

  const stepBackward = useCallback(() => {
    if (currentStepIndex > 0) {
      const prevIdx = currentStepIndex - 1;
      setCurrentStepIndex(prevIdx);
      if (steps[prevIdx]) {
        setCurrentArray(steps[prevIdx].array);
      }
      setIsComplete(false);
    }
  }, [currentStepIndex, steps]);

  const jumpToStep = useCallback((idx: number) => {
    const clampedIdx = Math.max(0, Math.min(idx, steps.length - 1));
    setCurrentStepIndex(clampedIdx);
    if (steps[clampedIdx] && steps.length > 0) {
      setCurrentArray(steps[clampedIdx].array);
    }
    setIsComplete(clampedIdx >= steps.length - 1 && steps.length > 0);
  }, [steps]);

  const saveHistory = useCallback(async (result: SortResult) => {
    try {
      const response = await fetch('/api/history', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          algorithm: algorithmNames[result.algorithm as AlgorithmType] || result.algorithm,
          initialArray: result.initialArray,
          totalSteps: result.steps.length,
          totalTime: result.totalTime,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setHistory((prev) => [data.data, ...prev].slice(0, 50));
      }
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    try {
      const response = await fetch('/api/history');
      const data = await response.json();
      if (data.success) {
        setHistory(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch history:', error);
    }
  }, []);

  const loadHistory = useCallback((record: HistoryRecord) => {
    const algKey = Object.entries(algorithmNames);
    let alg: AlgorithmType = 'bubble';
    for (const [key, value] of algKey) {
      if (value === record.algorithm) {
        alg = key as AlgorithmType;
        break;
      }
    }
    setAlgorithm(alg);
    setArrayLength(record.initialArray.length);
    const minVal = Math.min(...record.initialArray);
    const maxVal = Math.max(...record.initialArray);
    setValueMin(minVal);
    setValueMax(maxVal > minVal ? maxVal : 100);
    setInitialArray(record.initialArray);
    setCurrentArray(record.initialArray);
    const result = simulateSort(alg, record.initialArray);
    setSteps(result.steps);
    setCurrentStepIndex(0);
    setIsPlaying(false);
    setIsComplete(false);
    historySavedRef.current = false;
  }, []);

  useEffect(() => {
    generateArray();
    fetchHistory();
  }, []);

  useEffect(() => {
    if (isComplete && !historySavedRef.current && steps.length > 0) {
      historySavedRef.current = true;
      const result: SortResult = {
        algorithm,
        initialArray,
        steps,
        totalComparisons: steps[steps.length - 1]?.compareCount || 0,
        totalSwaps: steps[steps.length - 1]?.swapCount || 0,
        totalTime: 0,
      };
      saveHistory(result);
    }
  }, [isComplete, steps, algorithm, initialArray, saveHistory]);

  return (
    <SortContext.Provider
      value={{
        algorithm,
        setAlgorithm,
        arrayLength,
        setArrayLength,
        valueMin,
        setValueMin,
        valueMax,
        setValueMax,
        currentArray,
        steps,
        currentStepIndex,
        setCurrentStepIndex,
        isPlaying,
        setIsPlaying,
        speed,
        setSpeed,
        history,
        generateArray,
        startSort,
        stepForward,
        stepBackward,
        jumpToStep,
        saveHistory,
        loadHistory,
        fetchHistory,
        isComplete,
        initialArray,
      }}
    >
      {children}
    </SortContext.Provider>
  );
};

export const useSort = (): SortContextType => {
  const ctx = useContext(SortContext);
  if (!ctx) {
    throw new Error('useSort must be used within a SortProvider');
  }
  return ctx;
};
