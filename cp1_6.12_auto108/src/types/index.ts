export type LightType = 'pendant' | 'spotlight' | 'floor' | 'striplight';
export type TimePreset = 'morning_9' | 'afternoon_3' | 'night_8';

export interface LightFixture {
  id: string;
  type: LightType;
  name: string;
  x: number;
  y: number;
  z: number;
  direction: number;
  brightness: number;
  color_temp: number;
  is_on: boolean;
}

export interface FurnitureItem {
  id: string;
  type: string;
  name: string;
  x: number;
  y: number;
  width: number;
  depth: number;
  height: number;
  color: string;
  polygon: number[][];
  area_polygon?: number[][];
}

export interface RoomArea {
  name: string;
  polygon: number[][];
  recommended: number;
}

export interface LayoutData {
  id: string;
  name: string;
  width: number;
  depth: number;
  height: number;
  room_polygon: number[][];
  windows: Array<{
    x: number;
    y: number;
    width: number;
    height: number;
    z: number;
  }>;
  furniture: FurnitureItem[];
  areas: RoomArea[];
  default_lights: LightFixture[];
}

export interface GridPoint {
  x: number;
  y: number;
  illuminance: number;
}

export interface AreaStat {
  name: string;
  avg_illuminance: number;
  recommended: number;
  is_below_recommended: boolean;
}

export interface LightingResult {
  grid_data: GridPoint[];
  area_stats: AreaStat[];
  uniformity: number;
  evaluation: string;
  statistics: {
    min: number;
    max: number;
    avg: number;
  };
  dark_areas: GridPoint[];
  glare_areas: GridPoint[];
  natural_light: {
    time_name: string;
    ambient_color: string;
    background_color: string;
    sun_intensity: number;
    sun_direction: number[];
    ambient_intensity: number;
  };
}

export interface LayoutResponse {
  success: boolean;
  data: LayoutData;
  available_layouts: Array<{ id: string; name: string }>;
}

export interface LightingResponse {
  success: boolean;
  data: LightingResult;
  error?: string;
}

export interface LightPreset {
  type: LightType;
  name: string;
  defaultBrightness: number;
  defaultColorTemp: number;
  defaultZ: number;
  icon: string;
}

export const LIGHT_PRESETS: LightPreset[] = [
  {
    type: 'pendant',
    name: '吊灯',
    defaultBrightness: 1000,
    defaultColorTemp: 4000,
    defaultZ: 2.5,
    icon: '💡'
  },
  {
    type: 'spotlight',
    name: '射灯',
    defaultBrightness: 600,
    defaultColorTemp: 4000,
    defaultZ: 2.8,
    icon: '🔦'
  },
  {
    type: 'floor',
    name: '落地灯',
    defaultBrightness: 500,
    defaultColorTemp: 3000,
    defaultZ: 1.5,
    icon: '🪔'
  },
  {
    type: 'striplight',
    name: '灯带',
    defaultBrightness: 400,
    defaultColorTemp: 3500,
    defaultZ: 2.7,
    icon: '✨'
  }
];

export const TIME_PRESETS: Array<{ id: TimePreset; name: string; icon: string }> = [
  { id: 'morning_9', name: '上午9点', icon: '🌅' },
  { id: 'afternoon_3', name: '下午3点', icon: '☀️' },
  { id: 'night_8', name: '晚上8点', icon: '🌙' }
];

export function getColorFromTemperature(temp: number): string {
  if (temp <= 2700) return '#FFA040';
  if (temp <= 3500) return '#FFD080';
  if (temp <= 4500) return '#FFF0D0';
  if (temp <= 5500) return '#FFFFFF';
  return '#D0E8FF';
}

export function getColorFromIlluminance(illuminance: number): string {
  const clamped = Math.max(0, Math.min(2000, illuminance));
  const ratio = clamped / 2000;
  
  if (ratio < 0.2) {
    const t = ratio / 0.2;
    return interpolateColor('#000080', '#0080FF', t);
  } else if (ratio < 0.4) {
    const t = (ratio - 0.2) / 0.2;
    return interpolateColor('#0080FF', '#00FFFF', t);
  } else if (ratio < 0.6) {
    const t = (ratio - 0.4) / 0.2;
    return interpolateColor('#00FFFF', '#00FF00', t);
  } else if (ratio < 0.8) {
    const t = (ratio - 0.6) / 0.2;
    return interpolateColor('#00FF00', '#FFFF00', t);
  } else {
    const t = (ratio - 0.8) / 0.2;
    return interpolateColor('#FFFF00', '#FF0000', t);
  }
}

function interpolateColor(color1: string, color2: string, t: number): string {
  const r1 = parseInt(color1.slice(1, 3), 16);
  const g1 = parseInt(color1.slice(3, 5), 16);
  const b1 = parseInt(color1.slice(5, 7), 16);
  const r2 = parseInt(color2.slice(1, 3), 16);
  const g2 = parseInt(color2.slice(3, 5), 16);
  const b2 = parseInt(color2.slice(5, 7), 16);
  
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const b = Math.round(b1 + (b2 - b1) * t);
  
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}
