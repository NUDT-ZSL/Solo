export interface StationData {
  id: string;
  position: { x: number; y: number; z: number };
  size: number;
  color: string;
  name: string;
}

export interface LineData {
  id: string;
  name: string;
  color: string;
  stationIds: string[];
  opacity: number;
}

export interface TrainData {
  id: string;
  lineId: string;
  progress: number;
  speed: number;
  isPaused: boolean;
  stopTimer: number;
  pulseTimer: number;
}

export interface MetroProjectData {
  version: '1.0';
  exportedAt: number;
  stations: StationData[];
  lines: LineData[];
  trains: { lineId: string; progress: number }[];
  settings: {
    globalSpeedMultiplier: number;
  };
}

export const PRESET_COLORS: string[] = [
  '#3498db',
  '#e74c3c',
  '#2ecc71',
  '#f39c12',
  '#9b59b6',
  '#1abc9c',
  '#e91e63',
  '#ff9800',
];

export const PRESET_LINE_NAMES: Record<string, string> = {
  '#3498db': '蓝线',
  '#e74c3c': '红线',
  '#2ecc71': '绿线',
  '#f39c12': '橙线',
  '#9b59b6': '紫线',
  '#1abc9c': '青线',
  '#e91e63': '粉线',
  '#ff9800': '金线',
};
