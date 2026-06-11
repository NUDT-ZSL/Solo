export type AlgorithmName = 'bubbleSort' | 'binarySearch' | 'fibonacci';
export type LanguageName = 'JavaScript' | 'Python' | 'C++' | 'Go';

export interface AlgorithmResult {
  language: LanguageName;
  algorithm: AlgorithmName;
  timeMs: number;
}

const LANGUAGE_MULTIPLIERS: Record<LanguageName, Record<AlgorithmName, number>> = {
  'C++': {
    bubbleSort: 0.12,
    binarySearch: 0.15,
    fibonacci: 0.08,
  },
  'Go': {
    bubbleSort: 0.25,
    binarySearch: 0.2,
    fibonacci: 0.15,
  },
  'JavaScript': {
    bubbleSort: 1.0,
    binarySearch: 1.0,
    fibonacci: 1.0,
  },
  'Python': {
    bubbleSort: 8.5,
    binarySearch: 5.0,
    fibonacci: 12.0,
  },
};

const INPUT_SIZES: Record<AlgorithmName, number> = {
  bubbleSort: 5000,
  binarySearch: 100000,
  fibonacci: 30,
};

function bubbleSort(arr: number[]): void {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        const temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
  }
}

function binarySearch(arr: number[], target: number): number {
  let left = 0;
  let right = arr.length - 1;
  while (left <= right) {
    const mid = Math.floor((left + right) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) left = mid + 1;
    else right = mid - 1;
  }
  return -1;
}

function fibonacci(n: number): number {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

function runAlgorithm(algorithm: AlgorithmName): number {
  const size = INPUT_SIZES[algorithm];

  switch (algorithm) {
    case 'bubbleSort': {
      const arr = Array.from({ length: size }, () => Math.random() * size);
      const start = performance.now();
      bubbleSort(arr);
      return performance.now() - start;
    }
    case 'binarySearch': {
      const arr = Array.from({ length: size }, (_, i) => i);
      const target = size - 1;
      const start = performance.now();
      for (let i = 0; i < 10000; i++) {
        binarySearch(arr, target);
      }
      return performance.now() - start;
    }
    case 'fibonacci': {
      const start = performance.now();
      fibonacci(size);
      return performance.now() - start;
    }
  }
}

export function executeAlgorithm(
  language: LanguageName,
  algorithm: AlgorithmName
): Promise<AlgorithmResult> {
  return new Promise((resolve) => {
    setTimeout(() => {
      const jsTime = runAlgorithm(algorithm);
      const multiplier = LANGUAGE_MULTIPLIERS[language][algorithm];
      const simulatedTime = Math.round(jsTime * multiplier * 100) / 100;
      const jitter = simulatedTime * (0.9 + Math.random() * 0.2);
      const finalTime = Math.round(jitter * 100) / 100;
      resolve({
        language,
        algorithm,
        timeMs: finalTime,
      });
    }, 16);
  });
}

export const ALGORITHM_LABELS: Record<AlgorithmName, string> = {
  bubbleSort: '冒泡排序',
  binarySearch: '二分搜索',
  fibonacci: '斐波那契递归',
};

export const LANGUAGE_COLORS: Record<LanguageName, string> = {
  'C++': '#FF6B6B',
  'Go': '#4ECDC4',
  'JavaScript': '#FFE66D',
  'Python': '#A78BFA',
};

export const ALL_LANGUAGES: LanguageName[] = ['JavaScript', 'Python', 'C++', 'Go'];
export const ALL_ALGORITHMS: AlgorithmName[] = ['bubbleSort', 'binarySearch', 'fibonacci'];
