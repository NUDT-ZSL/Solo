export interface Station {
  id: string;
  name: string;
  lineId: string;
  x: number;
  y: number;
  capacity: number;
  history: number[];
  prediction: number[];
}

export interface Line {
  id: string;
  name: string;
  color: string;
  stationIds: string[];
  avgFlow: number;
}

export type CrowdLevel = 'loose' | 'normal' | 'crowded' | 'veryCrowded';
export type Trend = 'up' | 'down' | 'stable';

export const lines: Line[] = [
  { id: 'line1', name: '1号线', color: '#ef4444', stationIds: ['s1-1', 's1-2', 's1-3', 's1-4', 's1-5', 's1-6', 's1-7', 's1-8'], avgFlow: 20500 },
  { id: 'line2', name: '2号线', color: '#3b82f6', stationIds: ['s2-1', 's2-2', 's2-3', 's2-4', 's2-5', 's2-6', 's2-7'], avgFlow: 26000 },
  { id: 'line3', name: '3号线', color: '#22c55e', stationIds: ['s3-1', 's3-2', 's3-3', 's3-4', 's3-5', 's3-6'], avgFlow: 25000 },
  { id: 'line4', name: '4号线', color: '#8b5cf6', stationIds: ['s4-1', 's4-2', 's4-3', 's4-4', 's4-5'], avgFlow: 21800 },
  { id: 'line5', name: '5号线', color: '#f97316', stationIds: ['s5-1', 's5-2', 's5-3', 's5-4', 's5-5', 's5-6'], avgFlow: 23600 },
];

const generateHourlyFlow = (base: number, peakFactor: number = 1.0): number[] => {
  const hours: number[] = [];
  for (let i = 0; i < 24; i++) {
    let multiplier = 0.15;
    if (i >= 7 && i <= 9) {
      multiplier = 0.85 + Math.random() * 0.15;
    } else if (i >= 17 && i <= 19) {
      multiplier = 0.9 + Math.random() * 0.1;
    } else if (i >= 12 && i <= 14) {
      multiplier = 0.5 + Math.random() * 0.2;
    } else if (i >= 6 && i <= 22) {
      multiplier = 0.35 + Math.random() * 0.25;
    }
    hours.push(Math.floor(base * multiplier * peakFactor));
  }
  return hours;
};

const generatePrediction = (lastFlow: number, base: number): number[] => {
  const prediction: number[] = [];
  let current = lastFlow;
  for (let i = 0; i < 60; i++) {
    const trend = Math.sin(i / 30) * 0.05;
    const noise = (Math.random() - 0.5) * 0.08;
    current = current * (1 + trend + noise);
    current = Math.max(base * 0.2, Math.min(base * 1.2, current));
    prediction.push(Math.floor(current));
  }
  return prediction;
};

const stationConfigs = [
  { id: 's1-1', name: '苹果园', lineId: 'line1', x: 80, y: 200, base: 15000, capacity: 30000 },
  { id: 's1-2', name: '古城', lineId: 'line1', x: 170, y: 200, base: 12000, capacity: 25000 },
  { id: 's1-3', name: '八角游乐园', lineId: 'line1', x: 260, y: 200, base: 10000, capacity: 20000 },
  { id: 's1-4', name: '八宝山', lineId: 'line1', x: 350, y: 200, base: 18000, capacity: 35000 },
  { id: 's1-5', name: '玉泉路', lineId: 'line1', x: 440, y: 200, base: 20000, capacity: 40000 },
  { id: 's1-6', name: '五棵松', lineId: 'line1', x: 530, y: 200, base: 25000, capacity: 45000 },
  { id: 's1-7', name: '万寿路', lineId: 'line1', x: 620, y: 200, base: 22000, capacity: 40000 },
  { id: 's1-8', name: '公主坟', lineId: 'line1', x: 710, y: 200, base: 30000, capacity: 50000 },

  { id: 's2-1', name: '西直门', lineId: 'line2', x: 360, y: 60, base: 35000, capacity: 60000 },
  { id: 's2-2', name: '车公庄', lineId: 'line2', x: 360, y: 140, base: 28000, capacity: 50000 },
  { id: 's2-3', name: '阜成门', lineId: 'line2', x: 360, y: 220, base: 25000, capacity: 45000 },
  { id: 's2-4', name: '复兴门', lineId: 'line2', x: 360, y: 300, base: 32000, capacity: 55000 },
  { id: 's2-5', name: '长椿街', lineId: 'line2', x: 360, y: 380, base: 20000, capacity: 35000 },
  { id: 's2-6', name: '宣武门', lineId: 'line2', x: 360, y: 460, base: 28000, capacity: 50000 },
  { id: 's2-7', name: '和平门', lineId: 'line2', x: 360, y: 540, base: 18000, capacity: 30000 },

  { id: 's3-1', name: '天通苑北', lineId: 'line3', x: 520, y: 50, base: 20000, capacity: 35000 },
  { id: 's3-2', name: '天通苑', lineId: 'line3', x: 520, y: 130, base: 22000, capacity: 38000 },
  { id: 's3-3', name: '立水桥', lineId: 'line3', x: 520, y: 210, base: 28000, capacity: 48000 },
  { id: 's3-4', name: '北苑路北', lineId: 'line3', x: 520, y: 290, base: 24000, capacity: 42000 },
  { id: 's3-5', name: '大屯路东', lineId: 'line3', x: 520, y: 370, base: 26000, capacity: 45000 },
  { id: 's3-6', name: '惠新西街北口', lineId: 'line3', x: 520, y: 450, base: 30000, capacity: 52000 },

  { id: 's4-1', name: '宋家庄', lineId: 'line4', x: 150, y: 400, base: 25000, capacity: 45000 },
  { id: 's4-2', name: '刘家窑', lineId: 'line4', x: 240, y: 430, base: 20000, capacity: 35000 },
  { id: 's4-3', name: '蒲黄榆', lineId: 'line4', x: 330, y: 460, base: 22000, capacity: 40000 },
  { id: 's4-4', name: '天坛东门', lineId: 'line4', x: 420, y: 490, base: 18000, capacity: 32000 },
  { id: 's4-5', name: '磁器口', lineId: 'line4', x: 510, y: 520, base: 24000, capacity: 42000 },

  { id: 's5-1', name: '海淀黄庄', lineId: 'line5', x: 100, y: 280, base: 28000, capacity: 50000 },
  { id: 's5-2', name: '知春里', lineId: 'line5', x: 200, y: 310, base: 22000, capacity: 40000 },
  { id: 's5-3', name: '知春路', lineId: 'line5', x: 300, y: 340, base: 26000, capacity: 46000 },
  { id: 's5-4', name: '西土城', lineId: 'line5', x: 400, y: 370, base: 20000, capacity: 35000 },
  { id: 's5-5', name: '牡丹园', lineId: 'line5', x: 500, y: 400, base: 24000, capacity: 42000 },
  { id: 's5-6', name: '健德门', lineId: 'line5', x: 600, y: 430, base: 22000, capacity: 38000 },
];

export const stations: Station[] = stationConfigs.map((config) => {
  const history = generateHourlyFlow(config.base, 1.0);
  const lastFlow = history[history.length - 1];
  const prediction = generatePrediction(lastFlow, config.base);
  return {
    id: config.id,
    name: config.name,
    lineId: config.lineId,
    x: config.x,
    y: config.y,
    capacity: config.capacity,
    history,
    prediction,
  };
});

export const getStationById = (id: string): Station | undefined => {
  return stations.find((s) => s.id === id);
};

export const getLineById = (id: string): Line | undefined => {
  return lines.find((l) => l.id === id);
};

export const getStationsByLineId = (lineId: string): Station[] => {
  return stations.filter((s) => s.lineId === lineId);
};

export const getStationsByLineIds = (lineIds: string[]): Station[] => {
  if (lineIds.length === 0) return [];
  return stations.filter((s) => lineIds.includes(s.lineId));
};

export const getCurrentFlow = (station: Station, hour: number): number => {
  const idx = Math.max(0, Math.min(23, Math.floor(hour)));
  return station.history[idx];
};

export const getDensity = (station: Station, hour: number): number => {
  const flow = getCurrentFlow(station, hour);
  return Math.max(0, Math.min(1, flow / station.capacity));
};

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const getHeatColor = (density: number): string => {
  const d = Math.max(0, Math.min(1, density));
  let r: number, g: number, b: number;

  if (d < 0.5) {
    const t = d / 0.5;
    r = Math.floor(lerp(34, 234, t));
    g = Math.floor(lerp(197, 179, t));
    b = Math.floor(lerp(94, 8, t));
  } else {
    const t = (d - 0.5) / 0.5;
    r = Math.floor(lerp(234, 239, t));
    g = Math.floor(lerp(179, 68, t));
    b = Math.floor(lerp(8, 68, t));
  }

  return `rgb(${r}, ${g}, ${b})`;
};

export const getHeatColorRgb = (density: number): { r: number; g: number; b: number } => {
  const d = Math.max(0, Math.min(1, density));
  let r: number, g: number, b: number;

  if (d < 0.5) {
    const t = d / 0.5;
    r = Math.floor(lerp(34, 234, t));
    g = Math.floor(lerp(197, 179, t));
    b = Math.floor(lerp(94, 8, t));
  } else {
    const t = (d - 0.5) / 0.5;
    r = Math.floor(lerp(234, 239, t));
    g = Math.floor(lerp(179, 68, t));
    b = Math.floor(lerp(8, 68, t));
  }

  return { r, g, b };
};

export const getCrowdLevel = (density: number): CrowdLevel => {
  if (density < 0.3) return 'loose';
  if (density < 0.6) return 'normal';
  if (density < 0.8) return 'crowded';
  return 'veryCrowded';
};

export const getCrowdLevelText = (level: CrowdLevel): string => {
  switch (level) {
    case 'loose': return '宽松';
    case 'normal': return '一般';
    case 'crowded': return '拥挤';
    case 'veryCrowded': return '非常拥挤';
  }
};

export const getCrowdLevelColor = (level: CrowdLevel): string => {
  switch (level) {
    case 'loose': return '#22c55e';
    case 'normal': return '#eab308';
    case 'crowded': return '#f97316';
    case 'veryCrowded': return '#ef4444';
  }
};

export const calculateTrend = (station: Station, hour: number): Trend => {
  const idx = Math.max(0, Math.min(23, Math.floor(hour)));
  const recent = station.history[idx];
  const prev = station.history[Math.max(0, idx - 1)];
  const diff = recent - prev;
  const threshold = prev * 0.05;

  if (diff > threshold) return 'up';
  if (diff < -threshold) return 'down';
  return 'stable';
};

export const getTrendArrow = (trend: Trend): string => {
  switch (trend) {
    case 'up': return '↑';
    case 'down': return '↓';
    case 'stable': return '→';
  }
};

export const getTrendColor = (trend: Trend): string => {
  switch (trend) {
    case 'up': return '#ef4444';
    case 'down': return '#22c55e';
    case 'stable': return '#6b7280';
  }
};

export const getLineAvgFlow = (line: Line, hour: number): number => {
  const lineStations = getStationsByLineId(line.id);
  if (lineStations.length === 0) return 0;
  const total = lineStations.reduce((sum, s) => sum + getCurrentFlow(s, hour), 0);
  return Math.floor(total / lineStations.length);
};

export const timeLabels: string[] = [
  '00:00', '01:00', '02:00', '03:00', '04:00', '05:00',
  '06:00', '07:00', '08:00', '09:00', '10:00', '11:00',
  '12:00', '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00', '21:00', '22:00', '23:00',
];
