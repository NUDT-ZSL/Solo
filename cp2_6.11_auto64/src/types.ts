export type StepType = 'compare' | 'swap' | 'sorted';

export type AlgorithmType = 'bubble' | 'selection' | 'insertion';

export interface SortStep {
  type: StepType;
  indices: number[];
  array: number[];
  compareCount: number;
  swapCount: number;
  sortedCount: number;
}

export interface SortResult {
  algorithm: string;
  initialArray: number[];
  steps: SortStep[];
  totalComparisons: number;
  totalSwaps: number;
  totalTime: number;
}

export interface HistoryRecord {
  id: string;
  algorithm: string;
  initialArray: number[];
  totalSteps: number;
  totalTime: number;
  timestamp: number;
}

export interface SortState {
  algorithm: AlgorithmType;
  arrayLength: number;
  valueRange: [number, number];
  currentArray: number[];
  steps: SortStep[];
  currentStepIndex: number;
  isPlaying: boolean;
  speed: number;
  history: HistoryRecord[];
  isComplete: boolean;
  startTime: number | null;
}
