import { create } from 'zustand';

export interface MotionState {
  heartRate: number;
  cadence: number;
  isRunning: boolean;
  totalTime: number;
  avgHeartRate: number;
  calories: number;
  heartRateHistory: number[];
  simulationPhase: 'idle' | 'warmup' | 'steady' | 'cooldown';
  simulationStep: number;
  intervalId: ReturnType<typeof setInterval> | null;
  startSimulation: () => void;
  stopSimulation: () => void;
  resetStats: () => void;
}

function getHeartRateForPhase(
  phase: 'idle' | 'warmup' | 'steady' | 'cooldown',
  step: number,
  currentHR: number
): number {
  const jitter = () => (Math.random() - 0.5) * 4;

  switch (phase) {
    case 'warmup': {
      const target = 120 + Math.min(step, 10) * 3;
      return Math.round(currentHR + (target - currentHR) * 0.15 + jitter());
    }
    case 'steady': {
      const base = 140 + Math.sin(step * 0.3) * 8;
      return Math.round(base + jitter());
    }
    case 'cooldown': {
      const decay = currentHR - 2 - Math.random() * 2;
      return Math.round(Math.max(80, decay));
    }
    default:
      return 72;
  }
}

function getCadenceForPhase(
  phase: 'idle' | 'warmup' | 'steady' | 'cooldown',
  step: number,
  currentCadence: number
): number {
  const jitter = () => (Math.random() - 0.5) * 3;

  switch (phase) {
    case 'warmup': {
      const target = 140 + Math.min(step, 10) * 2;
      return Math.round(currentCadence + (target - currentCadence) * 0.12 + jitter());
    }
    case 'steady': {
      const base = 160 + Math.sin(step * 0.25) * 5;
      return Math.round(base + jitter());
    }
    case 'cooldown': {
      const decay = currentCadence - 3 - Math.random() * 2;
      return Math.round(Math.max(80, decay));
    }
    default:
      return 0;
  }
}

function advancePhase(
  phase: 'idle' | 'warmup' | 'steady' | 'cooldown',
  step: number
): { phase: 'idle' | 'warmup' | 'steady' | 'cooldown'; step: number } {
  switch (phase) {
    case 'warmup':
      if (step >= 15) return { phase: 'steady', step: 0 };
      return { phase, step: step + 1 };
    case 'steady':
      if (step >= 20) return { phase: 'cooldown', step: 0 };
      return { phase, step: step + 1 };
    case 'cooldown':
      if (step >= 10) return { phase: 'warmup', step: 0 };
      return { phase, step: step + 1 };
    default:
      return { phase: 'warmup', step: 0 };
  }
}

export const useMotionStore = create<MotionState>((set, get) => ({
  heartRate: 72,
  cadence: 0,
  isRunning: false,
  totalTime: 0,
  avgHeartRate: 72,
  calories: 0,
  heartRateHistory: [72],
  simulationPhase: 'idle',
  simulationStep: 0,
  intervalId: null,

  startSimulation: () => {
    const state = get();
    if (state.isRunning) return;

    const id = setInterval(() => {
      const s = get();
      const newPhaseData = advancePhase(s.simulationPhase, s.simulationStep);
      const newHR = getHeartRateForPhase(newPhaseData.phase, newPhaseData.step, s.heartRate);
      const newCadence = getCadenceForPhase(newPhaseData.phase, newPhaseData.step, s.cadence);
      const newTotalTime = s.totalTime + 2;
      const historySlice = [...s.heartRateHistory, newHR].slice(-30);
      const avgHR = Math.round(historySlice.reduce((a, b) => a + b, 0) / historySlice.length);
      const calIncrement = (newHR * 0.04 + newCadence * 0.02) * 2 / 60;
      const newCalories = s.calories + calIncrement;

      set({
        heartRate: newHR,
        cadence: newCadence,
        totalTime: newTotalTime,
        avgHeartRate: avgHR,
        calories: parseFloat(newCalories.toFixed(1)),
        heartRateHistory: historySlice,
        simulationPhase: newPhaseData.phase,
        simulationStep: newPhaseData.step
      });
    }, 2000);

    set({
      isRunning: true,
      simulationPhase: 'warmup',
      simulationStep: 0,
      intervalId: id
    });
  },

  stopSimulation: () => {
    const state = get();
    if (state.intervalId) {
      clearInterval(state.intervalId);
    }
    set({
      isRunning: false,
      intervalId: null,
      cadence: 0,
      simulationPhase: 'idle',
      simulationStep: 0
    });
  },

  resetStats: () => {
    const state = get();
    if (state.intervalId) {
      clearInterval(state.intervalId);
    }
    set({
      heartRate: 72,
      cadence: 0,
      isRunning: false,
      totalTime: 0,
      avgHeartRate: 72,
      calories: 0,
      heartRateHistory: [72],
      simulationPhase: 'idle',
      simulationStep: 0,
      intervalId: null
    });
  }
}));
