import { create } from 'zustand';
import { StarParams, StarStage } from '@/core/types';
import { STAR_PRESETS, MAX_AGE } from '@/data/starData';

interface StarState {
  currentMass: number;
  currentTime: number;
  isPlaying: boolean;
  starParams: StarParams;
  showDataCompare: boolean;
  stageNotification: { show: boolean; name: string } | null;
  setCurrentMass: (mass: number) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setStarParams: (params: StarParams) => void;
  setShowDataCompare: (show: boolean) => void;
  showStageNotification: (name: string) => void;
  hideStageNotification: () => void;
}

const defaultPreset = STAR_PRESETS.find(p => p.mass === 1) || STAR_PRESETS[0];
const defaultStage = defaultPreset.stages[0];

export const useStarStore = create<StarState>((set) => ({
  currentMass: 1,
  currentTime: 0,
  isPlaying: false,
  starParams: {
    mass: 1,
    radius: defaultStage.startRadius,
    temperature: defaultStage.startTemp,
    luminosity: defaultStage.startLuminosity,
    stage: StarStage.PROTOSTAR,
    age: 0,
    color: defaultStage.color,
    scale: defaultStage.scale,
  },
  showDataCompare: false,
  stageNotification: null,
  setCurrentMass: (mass) => set({ currentMass: mass, currentTime: 0 }),
  setCurrentTime: (time) => set({ currentTime: Math.max(0, Math.min(time, MAX_AGE)) }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setStarParams: (params) => set({ starParams: params }),
  setShowDataCompare: (show) => set({ showDataCompare: show }),
  showStageNotification: (name) => set({ stageNotification: { show: true, name } }),
  hideStageNotification: () => set({ stageNotification: null }),
}));
