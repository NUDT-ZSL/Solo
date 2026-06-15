import express, { Request, Response } from 'express';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import type { AlgorithmType, HistoryRecord, SortResult, SortStep } from '../src/types';

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

let historyStore: HistoryRecord[] = [];

type StepType = 'compare' | 'swap' | 'sorted';

function cloneArray(arr: number[]): number[] {
  return [...arr];
}

function simulateSort(algorithm: AlgorithmType, inputArray: number[]): SortResult {
  const startTime = performance.now();
  const array = cloneArray(inputArray);
  const steps: SortStep[] = [];
  let compareCount = 0;
  let swapCount = 0;
  let sortedCount = 0;

  const addStep = (type: StepType, indices: number[], currentArray: number[]) => {
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
  addStep: (type: StepType, indices: number[], array: number[]) => void,
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
  addStep: (type: StepType, indices: number[], array: number[]) => void,
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
  addStep: (type: StepType, indices: number[], array: number[]) => void,
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

app.post('/api/simulate', (req: Request, res: Response) => {
  try {
    const { algorithm, array } = req.body as { algorithm: AlgorithmType; array: number[] };
    
    if (!algorithm || !array || !Array.isArray(array)) {
      return res.status(400).json({ success: false, error: 'Invalid request body' });
    }
    
    const result = simulateSort(algorithm, array);
    
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/history', (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: historyStore });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/api/history', (req: Request, res: Response) => {
  try {
    const { algorithm, initialArray, totalSteps, totalTime } = req.body as {
      algorithm: string;
      initialArray: number[];
      totalSteps: number;
      totalTime: number;
    };
    
    if (!algorithm || !initialArray || !Array.isArray(initialArray)) {
      return res.status(400).json({ success: false, error: 'Invalid request body' });
    }
    
    const record: HistoryRecord = {
      id: uuidv4(),
      algorithm,
      initialArray,
      totalSteps,
      totalTime,
      timestamp: Date.now(),
    };
    
    historyStore.unshift(record);
    
    if (historyStore.length > 50) {
      historyStore = historyStore.slice(0, 50);
    }
    
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.get('/api/history/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const record = historyStore.find((r) => r.id === id);
    
    if (!record) {
      return res.status(404).json({ success: false, error: 'Record not found' });
    }
    
    res.json({ success: true, data: record });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Sort Theater server is running on port ${PORT}`);
});
