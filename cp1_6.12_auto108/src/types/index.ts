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

const ILLUMINANCE_COLOR_STOPS: Array<{ lux: number; color: string }> = [
  { lux: 0, color: '#000080' },
  { lux: 100, color: '#0000CC' },
  { lux: 200, color: '#0044FF' },
  { lux: 300, color: '#0088FF' },
  { lux: 400, color: '#00BBFF' },
  { lux: 500, color: '#00EEFF' },
  { lux: 600, color: '#00FFDD' },
  { lux: 700, color: '#00FF99' },
  { lux: 800, color: '#00FF55' },
  { lux: 900, color: '#22FF00' },
  { lux: 1000, color: '#77FF00' },
  { lux: 1100, color: '#BBFF00' },
  { lux: 1200, color: '#EEFF00' },
  { lux: 1300, color: '#FFDD00' },
  { lux: 1400, color: '#FFAA00' },
  { lux: 1500, color: '#FF7700' },
  { lux: 1600, color: '#FF4400' },
  { lux: 1700, color: '#FF2200' },
  { lux: 1800, color: '#FF0000' },
  { lux: 1900, color: '#DD0000' },
  { lux: 2000, color: '#AA0000' }
];

export function getColorFromIlluminance(illuminance: number): string {
  const clamped = Math.max(0, Math.min(2000, illuminance));

  for (let i = 1; i < ILLUMINANCE_COLOR_STOPS.length; i++) {
    if (clamped <= ILLUMINANCE_COLOR_STOPS[i].lux) {
      const prev = ILLUMINANCE_COLOR_STOPS[i - 1];
      const curr = ILLUMINANCE_COLOR_STOPS[i];
      const t = (clamped - prev.lux) / (curr.lux - prev.lux);
      return interpolateColor(prev.color, curr.color, t);
    }
  }

  return ILLUMINANCE_COLOR_STOPS[ILLUMINANCE_COLOR_STOPS.length - 1].color;
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
