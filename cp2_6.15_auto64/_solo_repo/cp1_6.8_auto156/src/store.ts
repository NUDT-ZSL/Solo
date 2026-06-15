import { create } from 'zustand';
import { type PitchName, type RhythmType } from './types';

export interface GameStore {
  playing: boolean;
  bpm: number;
  currentBeat: number;
  totalBeats: number;
  selectedPitch: PitchName;
  selectedRhythm: RhythmType;
  dragging: boolean;
  dragX: number;
  dragY: number;
  togglePlay: () => void;
  setPlaying: (playing: boolean) => void;
  setBpm: (bpm: number) => void;
  setCurrentBeat: (beat: number) => void;
  setTotalBeats: (total: number) => void;
  setSelectedPitch: (pitch: PitchName) => void;
  setSelectedRhythm: (rhythm: RhythmType) => void;
  setDragging: (dragging: boolean, x?: number, y?: number) => void;
  setDragPosition: (x: number, y: number) => void;
  reset: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  playing: false,
  bpm: 120,
  currentBeat: 0,
  totalBeats: 0,
  selectedPitch: 'C',
  selectedRhythm: 'quarter',
  dragging: false,
  dragX: 0,
  dragY: 0,
  togglePlay: () => set((s) => ({ playing: !s.playing })),
  setPlaying: (playing) => set({ playing }),
  setBpm: (bpm) => set({ bpm: Math.max(60, Math.min(200, bpm)) }),
  setCurrentBeat: (currentBeat) => set({ currentBeat }),
  setTotalBeats: (totalBeats) => set({ totalBeats }),
  setSelectedPitch: (selectedPitch) => set({ selectedPitch }),
  setSelectedRhythm: (selectedRhythm) => set({ selectedRhythm }),
  setDragging: (dragging, x, y) => set({ dragging, dragX: x ?? 0, dragY: y ?? 0 }),
  setDragPosition: (dragX, dragY) => set({ dragX, dragY }),
  reset: () => set({ playing: false, currentBeat: 0, totalBeats: 0 }),
}));
