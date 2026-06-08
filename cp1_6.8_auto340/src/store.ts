import { create } from 'zustand';

export type ThemeName = 'neon' | 'aurora' | 'lava' | 'deepSea' | 'stardust';
export type VisualizationMode = 'ripple' | 'fountain' | 'spectrum';
export type ColorSpeed = 'slow' | 'medium' | 'fast';
export type Brightness = 'dark' | 'medium' | 'bright';
export type AudioSource = 'none' | 'file' | 'microphone';
export type ExportFormat = 'webm' | 'gif';

export const THEME_COLORS: Record<ThemeName, string[]> = {
  neon: ['#FF00FF', '#00FFFF', '#FF1493', '#7B68EE', '#00FF7F'],
  aurora: ['#00CED1', '#7B68EE', '#48D1CC', '#6A5ACD', '#40E0D0'],
  lava: ['#FF4500', '#FF6347', '#FF8C00', '#DC143C', '#FFD700'],
  deepSea: ['#000080', '#191970', '#4169E1', '#00BFFF', '#1E90FF'],
  stardust: ['#C0C0C0', '#9370DB', '#FFD700', '#BA55D3', '#E6E6FA'],
};

export const THEME_LABELS: Record<ThemeName, string> = {
  neon: '霓虹',
  aurora: '极光',
  lava: '熔岩',
  deepSea: '深海',
  stardust: '星尘',
};

export const COLOR_SPEED_MAP: Record<ColorSpeed, number> = {
  slow: 0.3,
  medium: 0.7,
  fast: 1.5,
};

export const BRIGHTNESS_MAP: Record<Brightness, number> = {
  dark: 0.05,
  medium: 0.15,
  bright: 0.3,
};

interface AppState {
  audioSource: AudioSource;
  isPlaying: boolean;
  isRecording: boolean;
  currentTheme: ThemeName;
  visualizationMode: VisualizationMode;
  particleDensity: number;
  particleSize: number;
  colorSpeed: ColorSpeed;
  backgroundBrightness: Brightness;
  isExporting: boolean;
  exportFormat: ExportFormat;
  exportDuration: number;
  exportFps: number;
  exportLoopCount: number;

  setAudioSource: (source: AudioSource) => void;
  setIsPlaying: (playing: boolean) => void;
  setIsRecording: (recording: boolean) => void;
  setCurrentTheme: (theme: ThemeName) => void;
  setVisualizationMode: (mode: VisualizationMode) => void;
  setParticleDensity: (density: number) => void;
  setParticleSize: (size: number) => void;
  setColorSpeed: (speed: ColorSpeed) => void;
  setBackgroundBrightness: (brightness: Brightness) => void;
  setIsExporting: (exporting: boolean) => void;
  setExportFormat: (format: ExportFormat) => void;
  setExportDuration: (duration: number) => void;
  setExportFps: (fps: number) => void;
  setExportLoopCount: (count: number) => void;
}

export const useStore = create<AppState>((set) => ({
  audioSource: 'none',
  isPlaying: false,
  isRecording: false,
  currentTheme: 'neon',
  visualizationMode: 'ripple',
  particleDensity: 120,
  particleSize: 5,
  colorSpeed: 'medium',
  backgroundBrightness: 'dark',
  isExporting: false,
  exportFormat: 'webm',
  exportDuration: 5,
  exportFps: 30,
  exportLoopCount: 0,

  setAudioSource: (source) => set({ audioSource: source }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setIsRecording: (recording) => set({ isRecording: recording }),
  setCurrentTheme: (theme) => set({ currentTheme: theme }),
  setVisualizationMode: (mode) => set({ visualizationMode: mode }),
  setParticleDensity: (density) => set({ particleDensity: density }),
  setParticleSize: (size) => set({ particleSize: size }),
  setColorSpeed: (speed) => set({ colorSpeed: speed }),
  setBackgroundBrightness: (brightness) => set({ backgroundBrightness: brightness }),
  setIsExporting: (exporting) => set({ isExporting: exporting }),
  setExportFormat: (format) => set({ exportFormat: format }),
  setExportDuration: (duration) => set({ exportDuration: duration }),
  setExportFps: (fps) => set({ exportFps: fps }),
  setExportLoopCount: (count) => set({ exportLoopCount: count }),
}));
