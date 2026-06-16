export interface EEGData {
  timestamp: number;
  timestamps: number[];
  data: {
    frontal: number[];
    parietal: number[];
    temporal: number[];
    occipital: number[];
  };
  historyCount?: number;
  historyIndex?: number;
}

export type BrainRegion = 'frontal' | 'parietal' | 'temporal' | 'occipital';

export interface RegionInfo {
  name: string;
  nameCN: string;
  position: [number, number, number];
  color: string;
}

export interface PowerSpectrumBin {
  frequency: string;
  power: number;
}

export interface EEGContextType {
  eegData: EEGData | null;
  isLoading: boolean;
  error: string | null;
  timeOffset: number;
  setTimeOffset: (offset: number) => void;
  flowSpeed: number;
  setFlowSpeed: (speed: number) => void;
  hoveredRegion: BrainRegion | null;
  setHoveredRegion: (region: BrainRegion | null) => void;
  alertRegions: BrainRegion[];
  historyData: EEGData[];
}

export const REGION_INFO: Record<BrainRegion, RegionInfo> = {
  frontal: {
    name: 'Frontal Lobe',
    nameCN: '额叶',
    position: [0, 1.2, 0.8],
    color: '#00d2ff'
  },
  parietal: {
    name: 'Parietal Lobe',
    nameCN: '顶叶',
    position: [0, 1.5, -0.2],
    color: '#00ff88'
  },
  temporal: {
    name: 'Temporal Lobe',
    nameCN: '颞叶',
    position: [1.0, 0.5, 0.2],
    color: '#ffd700'
  },
  occipital: {
    name: 'Occipital Lobe',
    nameCN: '枕叶',
    position: [0, 0.8, -1.2],
    color: '#ff4757'
  }
};

export const SIGNAL_THRESHOLD = 40;
