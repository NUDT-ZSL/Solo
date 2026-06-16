export interface AudioClip {
  id: string;
  name: string;
  fileName: string;
  color: string;
  pcmData: Float32Array;
  sampleRate: number;
  channels: number;
  duration: number;
  startTime: number;
  trimStart: number;
  trimEnd: number;
  volume: number;
  fadeIn: number;
  fadeOut: number;
}

export interface Project {
  id: string;
  name: string;
  userId: string;
  clips: AudioClip[];
  lastModified: string;
  thumbnail: string;
}

export interface User {
  id: string;
  username: string;
}

export interface WaveformData {
  peaks: Float32Array;
  sampleRate: number;
  duration: number;
}

export const PALETTE = ['#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'];

export const THEME = {
  bg: '#0F0F1A',
  panel: '#1A1A2E',
  card: '#2D2D4A',
  text: '#EAEAEA',
  accent: '#6C63FF',
  danger: '#FF4757',
  sliderTrack: '#4A4A5A',
  sliderThumb: '#6C63FF',
  waveformBg: '#2D2D4A',
  waveformColor: '#6C63FF',
  mixerRowBg: '#1E1E2E',
  borderColor: '#2D2D4A',
  overlayWave: '#2C3E50',
};

export const MAX_DURATION = 300;
export const SAMPLE_RATE = 44100;
export const BIT_DEPTH = 16;
