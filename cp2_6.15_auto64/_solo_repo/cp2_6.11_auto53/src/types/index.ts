export type ProgrammingLanguage = 'JavaScript' | 'Python' | 'C++' | 'Go';

export type AlgorithmType = 'bubbleSort' | 'binarySearch' | 'fibonacciRecursive';

export type RaceStatus = 'idle' | 'running' | 'finished';

export interface RaceItem {
  language: ProgrammingLanguage;
  progress: number;
  status: RaceStatus;
  elapsedMs: number;
  fps: number;
}

export interface AlgorithmResult {
  language: ProgrammingLanguage;
  elapsedMs: number;
  rank: number;
  gapPercent: number;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  algorithm: AlgorithmType;
  results: { language: ProgrammingLanguage; elapsedMs: number }[];
}

export const LANGUAGE_COLORS: Record<ProgrammingLanguage, string> = {
  'JavaScript': '#F7DF1E',
  'Python': '#3776AB',
  'C++': '#00599C',
  'Go': '#00ADD8'
};

export const LANGUAGE_LABELS: Record<ProgrammingLanguage, string> = {
  'JavaScript': 'JavaScript',
  'Python': 'Python',
  'C++': 'C++',
  'Go': 'Go'
};

export const ALGORITHM_LABELS: Record<AlgorithmType, string> = {
  'bubbleSort': '冒泡排序',
  'binarySearch': '二分搜索',
  'fibonacciRecursive': '斐波那契递归'
};

export const MEDAL_COLORS: Record<number, string> = {
  1: '#FFD700',
  2: '#C0C0C0',
  3: '#CD7F32'
};
