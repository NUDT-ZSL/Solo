export enum PollutantType {
  PM25 = 'PM25',
  PM10 = 'PM10',
  O3 = 'O3',
  NO2 = 'NO2',
}

export const POLLUTANT_LABELS: Record<PollutantType, string> = {
  [PollutantType.PM25]: 'PM2.5',
  [PollutantType.PM10]: 'PM10',
  [PollutantType.O3]: 'O₃',
  [PollutantType.NO2]: 'NO₂',
};

export const POLLUTANT_COLORS: Record<PollutantType, string> = {
  [PollutantType.PM25]: '#ef4444',
  [PollutantType.PM10]: '#f97316',
  [PollutantType.O3]: '#eab308',
  [PollutantType.NO2]: '#8b5cf6',
};

export const CONCENTRATION_COLOR_LOW = '#22c55e';
export const CONCENTRATION_COLOR_HIGH = '#dc2626';

export const MAP_CONFIG = {
  size: 300,
  gridColor: '#cbd5e1',
  groundColor: '#e2e8f0',
  groundOpacity: 0.15,
  maxHeight: 50,
  maxConcentration: 300,
  stationBaseRadius: 2,
  stationBaseColor: '#64748b',
  particleCount: 500,
  particleSize: 0.05,
  particleColor: '#94a3b8',
  particleOpacity: 0.3,
  windSpeed: 2,
};

export const THEME = {
  bgPrimary: '#0f172a',
  bgSecondary: '#1e293b',
  textPrimary: '#f1f5f9',
  textSecondary: '#94a3b8',
  accentBlue: '#3b82f6',
  accentPurple: '#8b5cf6',
  sliderTrack: '#475569',
  sliderThumb: '#3b82f6',
};

export const UI_CONFIG = {
  panelWidth: 320,
  panelPadding: 20,
  panelRadius: 16,
  cardRadius: 12,
  cardWidth: 400,
  cardHeight: 320,
  sliderWidth: 300,
  animationDuration: 500,
  autoPlayInterval: 1500,
};

export interface Station {
  id: string;
  name: string;
  x: number;
  y: number;
  concentrations: Concentrations;
}

export interface Concentrations {
  PM25: number;
  PM10: number;
  O3: number;
  NO2: number;
}

export interface TimeSeriesPoint {
  id?: string;
  stationId: string;
  hour: number;
  PM25: number;
  PM10: number;
  O3: number;
  NO2: number;
}

export interface WeatherData {
  id?: string;
  stationId: string;
  hour: number;
  windDirection: number;
  windSpeed: number;
}

export const INITIAL_STATIONS: Station[] = [
  {
    id: 'st-001',
    name: '中关村监测站',
    x: 50,
    y: 80,
    concentrations: { PM25: 75, PM10: 110, O3: 85, NO2: 60 },
  },
  {
    id: 'st-002',
    name: '朝阳区监测站',
    x: 130,
    y: 70,
    concentrations: { PM25: 90, PM10: 130, O3: 95, NO2: 75 },
  },
  {
    id: 'st-003',
    name: '海淀区监测站',
    x: 210,
    y: 90,
    concentrations: { PM25: 65, PM10: 95, O3: 80, NO2: 55 },
  },
  {
    id: 'st-004',
    name: '丰台区监测站',
    x: 270,
    y: 75,
    concentrations: { PM25: 85, PM10: 125, O3: 90, NO2: 70 },
  },
  {
    id: 'st-005',
    name: '东城区监测站',
    x: 60,
    y: 220,
    concentrations: { PM25: 95, PM10: 140, O3: 100, NO2: 80 },
  },
  {
    id: 'st-006',
    name: '西城区监测站',
    x: 140,
    y: 230,
    concentrations: { PM25: 80, PM10: 115, O3: 88, NO2: 65 },
  },
  {
    id: 'st-007',
    name: '通州区监测站',
    x: 220,
    y: 215,
    concentrations: { PM25: 70, PM10: 100, O3: 75, NO2: 58 },
  },
  {
    id: 'st-008',
    name: '昌平区监测站',
    x: 260,
    y: 240,
    concentrations: { PM25: 60, PM10: 85, O3: 70, NO2: 50 },
  },
];
