export interface Video {
  id: string;
  filename: string;
  originalName: string;
  filePath: string;
  size: number;
  duration: number;
  uploadTime: string;
}

export interface Marker {
  id: string;
  videoId: string;
  timestamp: number;
  label: string;
  color: string;
  thumbnail?: string;
  order: number;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function interpolateColor(startHex: string, endHex: string, steps: number): string[] {
  const start = hexToRgb(startHex);
  const end = hexToRgb(endHex);
  const colors: string[] = [];
  for (let i = 0; i < steps; i++) {
    const t = steps === 1 ? 0 : i / (steps - 1);
    const r = start.r + (end.r - start.r) * t;
    const g = start.g + (end.g - start.g) * t;
    const b = start.b + (end.b - start.b) * t;
    colors.push(rgbToHex(r, g, b));
  }
  return colors;
}

const TAG_NAMES = [
  'A-Roll',
  'B-Roll',
  '采访',
  '空镜',
  '特效',
  '转场',
  '片头',
  '片尾',
  '字幕',
  '音乐',
];

const TAG_COLORS = interpolateColor('#e53935', '#1e88e5', 10);

export const PRESET_TAGS: Array<{ name: string; color: string }> = TAG_NAMES.map((name, index) => ({
  name,
  color: TAG_COLORS[index],
}));

export interface TimelineExport {
  video: Video;
  markers: Marker[];
  exportedAt: string;
}
