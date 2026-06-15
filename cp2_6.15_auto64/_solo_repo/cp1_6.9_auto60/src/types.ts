export interface WaveformPoint {
  x: number
  y: number
}

export interface SpectrumPeak {
  time: number
  frequency: number
  magnitude: number
}

export interface VolumePoint {
  time: number
  volume: number
}

export interface EmotionPoint {
  time: number
  value: number
}

export interface AudioAnalysisResult {
  duration: number
  waveform: number[]
  spectrumPeaks: SpectrumPeak[]
  volumeEnvelope: VolumePoint[]
  emotionCurve: EmotionPoint[]
  sampleRate: number
}

export interface ThemeConfig {
  name: string
  bgStart: string
  bgEnd: string
  volumeColor: string
  emotionStart: string
  emotionEnd: string
  waveformColor: string
  textColor: string
  peakColor: string
}

export interface HistoryItem {
  id: string
  timestamp: number
  fileName: string
  svgString: string
  analysisResult: AudioAnalysisResult
  themeConfig: ThemeConfig
  thumbnail: string
}

export interface UploadedFile {
  fileUrl: string
  fileName: string
  size: number
  isRecording?: boolean
}

export type ThemeName = 'aurora' | 'sunset' | 'meadow' | 'deepsea' | 'cyberpunk' | 'custom'

export type PresetThemeName = 'aurora' | 'sunset' | 'meadow' | 'deepsea' | 'cyberpunk'

export const PRESET_THEMES: Record<PresetThemeName, ThemeConfig> = {
  aurora: {
    name: '深空极光',
    bgStart: '#0F0C29',
    bgEnd: '#302B63',
    volumeColor: '#00E5FF',
    emotionStart: '#FF6B6B',
    emotionEnd: '#48C774',
    waveformColor: '#1A1A2E',
    textColor: '#FFFFFF',
    peakColor: '#FFD700'
  },
  sunset: {
    name: '暖阳落日',
    bgStart: '#FF6B35',
    bgEnd: '#F7C59F',
    volumeColor: '#00D4AA',
    emotionStart: '#FF4757',
    emotionEnd: '#FFA502',
    waveformColor: '#533483',
    textColor: '#FFFFFF',
    peakColor: '#2ED573'
  },
  meadow: {
    name: '草甸微风',
    bgStart: '#134E5E',
    bgEnd: '#71B280',
    volumeColor: '#A8E6CF',
    emotionStart: '#FF8B94',
    emotionEnd: '#FFEAA7',
    waveformColor: '#2C3E50',
    textColor: '#FFFFFF',
    peakColor: '#FDCB6E'
  },
  deepsea: {
    name: '深海荧蓝',
    bgStart: '#0A2463',
    bgEnd: '#3E92CC',
    volumeColor: '#00F5D4',
    emotionStart: '#FF006E',
    emotionEnd: '#8338EC',
    waveformColor: '#0D1B2A',
    textColor: '#FFFFFF',
    peakColor: '#FB5607'
  },
  cyberpunk: {
    name: '赛博霓虹',
    bgStart: '#1A0033',
    bgEnd: '#4A00E0',
    volumeColor: '#00FFA3',
    emotionStart: '#FF0099',
    emotionEnd: '#00FFFF',
    waveformColor: '#0D0D0D',
    textColor: '#FFFFFF',
    peakColor: '#FFFF00'
  }
}
