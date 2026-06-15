export type SampleCategory = 'drum' | 'bass' | 'vocal' | 'melody';

export interface Sample {
  id: string;
  name: string;
  category: SampleCategory;
  duration: number;
  frequency: number;
}

export interface Track {
  id: string;
  name: string;
  sampleId: string | null;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
}

export interface BeatPad {
  id: number;
  sampleId: string | null;
}

export interface Project {
  id?: string;
  name: string;
  tracks: Track[];
  beatPads: BeatPad[];
  bpm: number;
  masterVolume: number;
  createdAt?: string;
}

export interface ProjectListItem {
  id: string;
  name: string;
  createdAt: string;
  trackCount: number;
}

export const CATEGORY_COLORS: Record<SampleCategory, string> = {
  drum: '#4A90D9',
  bass: '#50C878',
  vocal: '#FF69B4',
  melody: '#FF8C00'
};

export const CATEGORY_NAMES: Record<SampleCategory, string> = {
  drum: '鼓点',
  bass: '贝斯',
  vocal: '人声',
  melody: '旋律'
};
