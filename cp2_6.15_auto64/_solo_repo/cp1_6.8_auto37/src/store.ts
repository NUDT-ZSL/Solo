import { create } from 'zustand';

export interface AudioData {
  frequencies: Uint8Array;
  amplitudes: Uint8Array;
  beat: {
    detected: boolean;
    intensity: number;
    bpm: number;
  };
  volume: number;
}

interface AppState {
  isPlaying: boolean;
  audioSource: 'mic' | 'file' | null;
  audioData: AudioData | null;
  fileName: string | null;
  setIsPlaying: (playing: boolean) => void;
  setAudioSource: (source: 'mic' | 'file' | null) => void;
  setAudioData: (data: AudioData) => void;
  setFileName: (name: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  isPlaying: false,
  audioSource: null,
  audioData: null,
  fileName: null,
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setAudioSource: (source) => set({ audioSource: source }),
  setAudioData: (data) => set({ audioData: data }),
  setFileName: (name) => set({ fileName: name }),
}));
