export interface FrequencyBands {
  low: number;
  mid: number;
  high: number;
}

export interface TotemPosition {
  x: number;
  y: number;
}

export interface Totem {
  id: string;
  audioData: string;
  waveform: number[];
  frequencyBands: FrequencyBands;
  colorPrimary: string;
  colorSecondary: string;
  createdAt: number;
  playCount: number;
  ownerId: string;
  position: TotemPosition;
  rotation: number;
  mergedFrom?: string[];
}

export interface CreateTotemRequest {
  audioData: string;
  ownerId: string;
}

export interface MergeTotemRequest {
  sourceId: string;
  targetId: string;
}
