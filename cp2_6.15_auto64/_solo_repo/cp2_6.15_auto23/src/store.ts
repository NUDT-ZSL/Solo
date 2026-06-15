import { create } from 'zustand';
import type { GridData, Rules } from './evolutionEngine.worker';
import EvolutionEngineWorker from './evolutionEngine.worker?worker';

export type { Rules };

export interface Cell {
  alive: boolean;
  age: number;
  isNew: boolean;
  isDying: boolean;
  flashTime: number;
}

export type Grid = Cell[][][];

interface StoreState {
  grid: Grid;
  gridSize: number;
  rules: Rules;
  isRunning: boolean;
  speed: number;
  generation: number;
  performanceMode: boolean;
  worker: Worker | null;
  showSizeWarning: boolean;
  animationPhase: number;
  isExploding: boolean;

  initWorker: () => void;
  setRunning: (running: boolean) => void;
  setSpeed: (speed: number) => void;
  setRules: (rules: Rules) => void;
  step: () => void;
  randomInit: () => void;
  clear: () => void;
  toggleCell: (x: number, y: number, z: number) => void;
  toggleCells: (cells: [number, number, number][]) => void;
  setPerformanceMode: (enabled: boolean) => void;
  setGridFromWorker: (gridData: GridData, generation: number) => void;
  setAnimationPhase: (phase: number) => void;
  setIsExploding: (exploding: boolean) => void;
}

const DEFAULT_GRID_SIZE = 16;
const DEFAULT_RULES: Rules = { survive: [2, 3], birth: [3] };
const LARGE_GRID_THRESHOLD = 16;

function createEmptyGrid(size: number): Grid {
  const grid: Grid = [];
  for (let x = 0; x < size; x++) {
    grid[x] = [];
    for (let y = 0; y < size; y++) {
      grid[x][y] = [];
      for (let z = 0; z < size; z++) {
        grid[x][y][z] = {
          alive: false,
          age: 0,
          isNew: false,
          isDying: false,
          flashTime: 0,
        };
      }
    }
  }
  return grid;
}

function createRandomGrid(size: number): Grid {
  const grid: Grid = [];
  for (let x = 0; x < size; x++) {
    grid[x] = [];
    for (let y = 0; y < size; y++) {
      grid[x][y] = [];
      for (let z = 0; z < size; z++) {
        const alive = Math.random() < 0.5;
        grid[x][y][z] = {
          alive,
          age: 0,
          isNew: alive,
          isDying: false,
          flashTime: 0,
        };
      }
    }
  }
  return grid;
}

function gridToGridData(grid: Grid, size: number): GridData {
  const total = size * size * size;
  const data = new Uint8Array(total * 2);
  for (let x = 0; x < size; x++) {
    for (let y = 0; y < size; y++) {
      for (let z = 0; z < size; z++) {
        const idx = (x * size * size + y * size + z) * 2;
        const cell = grid[x][y][z];
        data[idx] = cell.alive ? 1 : 0;
        data[idx + 1] = cell.age;
      }
    }
  }
  return data;
}

export const useStore = create<StoreState>((set, get) => ({
  grid: createEmptyGrid(DEFAULT_GRID_SIZE),
  gridSize: DEFAULT_GRID_SIZE,
  rules: DEFAULT_RULES,
  isRunning: false,
  speed: 5,
  generation: 0,
  performanceMode: false,
  worker: null,
  showSizeWarning: DEFAULT_GRID_SIZE > LARGE_GRID_THRESHOLD,
  animationPhase: 1,
  isExploding: false,

  initWorker: () => {
    const { gridSize, rules, worker } = get();
    if (worker) return;

    const newWorker = new EvolutionEngineWorker();

    newWorker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'gridUpdate') {
        get().setGridFromWorker(e.data.grid, e.data.generation);
      }
    };

    newWorker.postMessage({
      type: 'init',
      gridSize,
      rules,
    });

    set({ worker: newWorker });
  },

  setGridFromWorker: (gridData: GridData, generation: number) => {
    const { gridSize } = get();
    const newGrid = createEmptyGrid(gridSize);
    const oldGrid = get().grid;

    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        for (let z = 0; z < gridSize; z++) {
          const idx = (x * gridSize * gridSize + y * gridSize + z) * 2;
          const alive = gridData[idx] === 1;
          const age = gridData[idx + 1];
          const oldCell = oldGrid[x][y][z];

          newGrid[x][y][z] = {
            alive,
            age,
            isNew: alive && (!oldCell.alive || oldCell.isNew),
            isDying: !alive && oldCell.alive,
            flashTime: oldCell.flashTime > 0 ? oldCell.flashTime - 1 : 0,
          };
        }
      }
    }

    set({ grid: newGrid, generation });

    setTimeout(() => {
      set((state) => {
        const clearedGrid = state.grid.map((layer) =>
          layer.map((row) =>
            row.map((cell) => ({
              ...cell,
              isNew: false,
              isDying: false,
            }))
          )
        );
        return { grid: clearedGrid };
      });
    }, 200);
  },

  setRunning: (running: boolean) => {
    const { worker, speed } = get();
    if (!worker) return;

    if (running) {
      worker.postMessage({ type: 'start', speed });
    } else {
      worker.postMessage({ type: 'stop' });
    }
    set({ isRunning: running });
  },

  setSpeed: (speed: number) => {
    const { worker, isRunning } = get();
    if (worker && isRunning) {
      worker.postMessage({ type: 'stop' });
      worker.postMessage({ type: 'start', speed });
    }
    set({ speed });
  },

  setRules: (rules: Rules) => {
    const { worker, isRunning, grid, gridSize } = get();
    if (worker) {
      worker.postMessage({ type: 'setRules', rules });
      if (!isRunning) {
        const gridData = gridToGridData(grid, gridSize);
        worker.postMessage({ type: 'setGrid', grid: gridData });
      }
    }
    set({ rules });
  },

  step: () => {
    const { worker } = get();
    if (!worker) return;
    worker.postMessage({ type: 'step' });
  },

  randomInit: () => {
    const { worker, gridSize } = get();
    const newGrid = createRandomGrid(gridSize);

    if (worker) {
      const gridData = gridToGridData(newGrid, gridSize);
      worker.postMessage({ type: 'setGrid', grid: gridData });
    }

    set({ grid: newGrid, generation: 0, isExploding: true, animationPhase: 0 });

    const startTime = performance.now();
    const duration = 1000;
    const animate = () => {
      const elapsed = performance.now() - startTime;
      const phase = Math.min(elapsed / duration, 1);
      set({ animationPhase: phase });
      if (phase < 1) {
        requestAnimationFrame(animate);
      } else {
        set({ isExploding: false, animationPhase: 1 });
      }
    };
    requestAnimationFrame(animate);
  },

  clear: () => {
    const { worker, gridSize } = get();
    const newGrid = createEmptyGrid(gridSize);

    if (worker) {
      const gridData = gridToGridData(newGrid, gridSize);
      worker.postMessage({ type: 'setGrid', grid: gridData });
    }

    set({ grid: newGrid, generation: 0, isRunning: false });
  },

  toggleCell: (x: number, y: number, z: number) => {
    const { worker, gridSize } = get();
    set((state) => {
      const newGrid = state.grid.map((layer) => layer.map((row) => [...row]));
      const cell = newGrid[x][y][z];
      const newAlive = !cell.alive;
      newGrid[x][y][z] = {
        ...cell,
        alive: newAlive,
        age: newAlive ? 0 : 0,
        isNew: newAlive,
        isDying: !newAlive && cell.alive,
        flashTime: 12,
      };

      if (worker) {
        const gridData = gridToGridData(newGrid, gridSize);
        worker.postMessage({ type: 'setGrid', grid: gridData });
      }

      setTimeout(() => {
        set((s) => {
          const clearedGrid = s.grid.map((l) =>
            l.map((r) =>
              r.map((c) => ({
                ...c,
                isNew: false,
                isDying: false,
              }))
            )
          );
          return { grid: clearedGrid };
        });
      }, 300);

      return { grid: newGrid };
    });
  },

  toggleCells: (cells: [number, number, number][]) => {
    const { worker, gridSize } = get();
    set((state) => {
      const newGrid = state.grid.map((layer) => layer.map((row) => [...row]));

      cells.forEach(([x, y, z]) => {
        const cell = newGrid[x][y][z];
        const newAlive = !cell.alive;
        newGrid[x][y][z] = {
          ...cell,
          alive: newAlive,
          age: newAlive ? 0 : 0,
          isNew: newAlive,
          isDying: !newAlive && cell.alive,
          flashTime: 12,
        };
      });

      if (worker) {
        const gridData = gridToGridData(newGrid, gridSize);
        worker.postMessage({ type: 'setGrid', grid: gridData });
      }

      setTimeout(() => {
        set((s) => {
          const clearedGrid = s.grid.map((l) =>
            l.map((r) =>
              r.map((c) => ({
                ...c,
                isNew: false,
                isDying: false,
              }))
            )
          );
          return { grid: clearedGrid };
        });
      }, 300);

      return { grid: newGrid };
    });
  },

  setPerformanceMode: (enabled: boolean) => {
    set({ performanceMode: enabled });
  },

  setAnimationPhase: (phase: number) => {
    set({ animationPhase: phase });
  },

  setIsExploding: (exploding: boolean) => {
    set({ isExploding: exploding });
  },
}));
