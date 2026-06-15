import type { SortStep, AlgorithmType, SortResult } from '../types';

export function generateRandomArray(length: number, min: number, max: number): number[] {
  return Array.from({ length }, () => Math.floor(Math.random() * (max - min + 1)) + min);
}

function cloneArray(arr: number[]): number[] {
  return [...arr];
}

export function simulateSort(algorithm: AlgorithmType, inputArray: number[]): SortResult {
  const startTime = performance.now();
  const array = cloneArray(inputArray);
  const steps: SortStep[] = [];
  let compareCount = 0;
  let swapCount = 0;
  let sortedCount = 0;

  const addStep = (type: SortStep['type'], indices: number[], currentArray: number[]) => {
    steps.push({
      type,
      indices: [...indices],
      array: cloneArray(currentArray),
      compareCount,
      swapCount,
      sortedCount,
    });
  };

  switch (algorithm) {
    case 'bubble':
      bubbleSort(array, addStep, () => compareCount++, () => swapCount++, (c) => sortedCount = c);
      break;
    case 'selection':
      selectionSort(array, addStep, () => compareCount++, () => swapCount++, (c) => sortedCount = c);
      break;
    case 'insertion':
      insertionSort(array, addStep, () => compareCount++, () => swapCount++, (c) => sortedCount = c);
      break;
  }

  const totalTime = performance.now() - startTime;

  return {
    algorithm,
    initialArray: cloneArray(inputArray),
    steps,
    totalComparisons: compareCount,
    totalSwaps: swapCount,
    totalTime,
  };
}

function bubbleSort(
  arr: number[],
  addStep: (type: SortStep['type'], indices: number[], array: number[]) => void,
  incCompare: () => void,
  incSwap: () => void,
  setSortedCount: (c: number) => void
): void {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - i - 1; j++) {
      incCompare();
      addStep('compare', [j, j + 1], arr);
      
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        incSwap();
        addStep('swap', [j, j + 1], arr);
        swapped = true;
      }
    }
    setSortedCount(i + 1);
    addStep('sorted', [n - i - 1], arr);
    
    if (!swapped) {
      for (let k = 0; k < n - i - 1; k++) {
        setSortedCount(n);
        addStep('sorted', [k], arr);
      }
      break;
    }
  }
  setSortedCount(n);
  addStep('sorted', [0], arr);
}

function selectionSort(
  arr: number[],
  addStep: (type: SortStep['type'], indices: number[], array: number[]) => void,
  incCompare: () => void,
  incSwap: () => void,
  setSortedCount: (c: number) => void
): void {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    let minIdx = i;
    for (let j = i + 1; j < n; j++) {
      incCompare();
      addStep('compare', [minIdx, j], arr);
      if (arr[j] < arr[minIdx]) {
        minIdx = j;
      }
    }
    
    if (minIdx !== i) {
      [arr[i], arr[minIdx]] = [arr[minIdx], arr[i]];
      incSwap();
      addStep('swap', [i, minIdx], arr);
    }
    
    setSortedCount(i + 1);
    addStep('sorted', [i], arr);
  }
  setSortedCount(n);
  addStep('sorted', [n - 1], arr);
}

function insertionSort(
  arr: number[],
  addStep: (type: SortStep['type'], indices: number[], array: number[]) => void,
  incCompare: () => void,
  incSwap: () => void,
  setSortedCount: (c: number) => void
): void {
  const n = arr.length;
  setSortedCount(1);
  addStep('sorted', [0], arr);
  
  for (let i = 1; i < n; i++) {
    let j = i;
    while (j > 0) {
      incCompare();
      addStep('compare', [j - 1, j], arr);
      
      if (arr[j - 1] > arr[j]) {
        [arr[j - 1], arr[j]] = [arr[j], arr[j - 1]];
        incSwap();
        addStep('swap', [j - 1, j], arr);
        j--;
      } else {
        break;
      }
    }
    setSortedCount(i + 1);
    addStep('sorted', [i], arr);
  }
}

export const algorithmNames: Record<AlgorithmType, string> = {
  bubble: '冒泡排序',
  selection: '选择排序',
  insertion: '插入排序',
};

export function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}
