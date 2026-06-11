import { create } from 'zustand';
import type { SortState, AlgorithmType, SortStep, HistoryRecord } from './types';
import { generateRandomArray, simulateSort } from './utils/sortSimulator';
import { algorithmNames } from './utils/sortSimulator';

interface SortStore extends SortState {
  setAlgorithm: (algo: AlgorithmType) => void;
  setArrayLength: (length: number) => void;
  setValueRange: (min: number, max: number) => void;
  setSpeed: (speed: number) => void;
  generateArray: () => void;
  startSort: () => void;
  togglePlay: () => void;
  stepForward: () => void;
  stepBackward: () => void;
  setCurrentStep: (index: number) => void;
  resetSort: () => void;
  saveHistory: () => Promise<void>;
  loadHistory: () => Promise<void>;
  replayHistory: (record: HistoryRecord) => void;
  setIsComplete: (complete: boolean) => void;
}

const initialArray = generateRandomArray(10, 1, 100);
const initialSim = simulateSort('bubble', initialArray);

export const useSortStore = create<SortStore>((set, get) => ({
  algorithm: 'bubble',
  arrayLength: 10,
  valueRange: [1, 100],
  currentArray: initialArray,
  steps: initialSim.steps,
  currentStepIndex: 0,
  isPlaying: false,
  speed: 1,
  history: [],
  isComplete: false,
  startTime: null,

  setAlgorithm: (algo) => {
    const { currentArray } = get();
    const result = simulateSort(algo, currentArray);
    set({
      algorithm: algo,
      steps: result.steps,
      currentStepIndex: 0,
      isPlaying: false,
      isComplete: false,
      startTime: null,
    });
  },

  setArrayLength: (length) => {
    set