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

function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

async function bubbleSortChunked(arr: number[]): Promise<number> {
  const start = performance.now();
  const n = arr.length;
  const TIME_SLICE = 8;

  for (let i = 0; i < n - 1; i++) {
    for (let j = 0; j < n - i - 1; j++) {
      if (arr[j] > arr[j + 1]) {
        const temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
      }
    }
    if (i % 50 === 0 && performance.now() - start > TIME_SLICE) {
      await yieldToMain();
    }
  }
  return performance.now() - start;
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

async function fibonacciChunked(n: number): Promise<{ result: number; elapsed: number }> {
  const start = performance.now();
  const TIME_SLICE = 8;
  const memo = new Map<number, number>();

  async function fib(k: number): Promise<number> {
    if (k <= 1) return k;
    if (memo.has(k)) return memo.get(k)!;
    if (performance.now() - start > TIME_SLICE) {
      await yieldToMain();
    }
    const a = await fib(k - 1);
    const b = await fib(k - 2);
    const res = a + b;
    memo.set(k, res);
    return res;
  }

  const result = await fib(n);
  return { result, elapsed: performance.now() - start };
}

async function binarySearchChunked(arr: number[], target: number): Promise<number> {
  const start = performance.now();
  let iterations = 0;
  for (let i = 0; i < 10000; i++) {
    binarySearch(arr, target);
    iterations++;
    if (iterations % 1000 === 0) {
      await yieldToMain();
    }
  }
  return performance.now() - start;
}

async function runAlgorithm(algorithm: AlgorithmName): Promise<number> {
  const size = INPUT_SIZES[algorithm];

  switch (algorithm) {
    case 'bubbleSort': {
      const arr = Array.from({ length: size }, () => Math.random() * size);
      return await bubbleSortChunked(arr);
    }
    case 'binarySearch': {
      const arr = Array.from({ length: size }, (_, i) => i);
      const target = size - 1;
      return await binarySearchChunked(arr, target);
    }
    case 'fibonacci': {
      const { elapsed } = await fibonacciChunked(size);
      return elapsed;
    }
  }
}

export async function executeAlgorithm(
  language: LanguageName,
  algorithm: AlgorithmName
): Promise<AlgorithmResult> {
  await yieldToMain();
  const jsTime = await runAlgorithm(algorithm);
  const multiplier = LANGUAGE_MULTIPLIERS[language][algorithm];
  const simulatedTime = Math.round(jsTime * multiplier * 100) / 100;
  const jitter = simulatedTime * (0.9 + Math.random() * 0.2);
  const finalTime = Math.round(jitter * 100) / 100;
  return {
    language,
    algorithm,
    timeMs: finalTime,
  };
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
