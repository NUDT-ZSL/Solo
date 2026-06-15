import { create } from 'zustand'
import type { AudioData } from './AudioAnalyzer'

interface AudioState {
  spectrum: Float32Array
  beat: boolean
  volume: number
  lowFreqEnergy: number
  midFreqEnergy: number
  highFreqEnergy: number
  sourceType: string
  uploadProgress: number
  beatPulse: number
  colorIntensity: number
  setAudioData: (data: AudioData) => void
  setSourceType: (type: string) => void
  setUploadProgress: (progress: number) => void
  setBeatPulse: (value: number) => void
  setColorIntensity: (value: number) => void
}

export const useAudioStore = create<AudioState>((set) => ({
  spectrum: new Float32Array(128),
  beat: false,
  volume: 0,
  lowFreqEnergy: 0,
  midFreqEnergy: 0,
  highFreqEnergy: 0,
  sourceType: 'none',
  uploadProgress: 0,
  beatPulse: 0,
  colorIntensity: 1.0,

  setAudioData: (data: AudioData) => set({
    spectrum: data.spectrum,
    beat: data.beat,
    volume: data.volume,
    lowFreqEnergy: data.lowFreqEnergy,
    midFreqEnergy: data.midFreqEnergy,
    highFreqEnergy: data.highFreqEnergy,
  }),

  setSourceType: (type: string) => set({ sourceType: type }),
  setUploadProgress: (progress: number) => set({ uploadProgress: progress }),
  setBeatPulse: (value: number) => set({ beatPulse: value }),
  setColorIntensity: (value: number) => set({ colorIntensity: value }),
}))
