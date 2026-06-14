export type InstrumentType = 'piano' | 'drums' | 'bass';
export type EffectType = 'reverb' | 'delay' | 'chorus';
export type TimeSignature = '4/4' | '3/4' | '6/8';

export interface Note {
  id: string;
  trackId: string;
  step: number;
  pitch: number;
  velocity: number;
  duration: number;
}

export interface MixerParams {
  pan: number;
  level: number;
}

export interface Effect {
  type: EffectType;
  params: Record<string, number>;
  enabled: boolean;
}

export interface Track {
  id: string;
  name: string;
  instrument: InstrumentType;
  volume: number;
  muted: boolean;
  solo: boolean;
  transpose: number;
  speedMultiplier: number;
  mixer: MixerParams;
  effects: Effect[];
}

export interface ProjectState {
  bpm: number;
  timeSignature: TimeSignature;
  tracks: Track[];
  notes: Note[];
  loopStart: number;
  loopEnd: number;
  isPlaying: boolean;
  currentStep: number;
}

export interface LevelData {
  trackId: string;
  level: number;
}

export const INSTRUMENT_COLORS: Record<InstrumentType, string> = {
  piano: '#4fc3f7',
  drums: '#ff7043',
  bass: '#81c784',
};

export const PITCH_NAMES = [
  'C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B',
];

export const STEPS_PER_BAR = 16;
export const TOTAL_BARS = 32;
export const TOTAL_STEPS = STEPS_PER_BAR * TOTAL_BARS;
export const GRID_WIDTH = 30;
export const GRID_HEIGHT = 24;
