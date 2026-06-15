import { v4 as uuidv4 } from 'uuid';

export interface BikeStation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  bikeCount: number;
  capacity: number;
  hourlyHistory: number[];
}

export interface DispatchTask {
  id: string;
  fromStationId: string;
  toStationId: string;
  bikeCount: number;
  status: 'pending' | 'moving' | 'completed';
  startTime: number;
  duration: number;
}

export interface GlobalStats {
  totalBikes: number;
  avgOccupancy: number;
  activeDispatches: number;
}

const STATION_COUNT = 20;
const CENTER_LAT = 39.9042;
const CENTER_LNG = 116.4074;
const SPREAD = 0.04;
const MIN_BIKES = 0;
const MAX_BIKES = 15;
const HISTORY_HOURS = 12;

const stationNames = [
  '国贸站', '西单站', '王府井站', '东单站', '天安门东站',
  '西直门站', '东直门站', '朝阳门站', '建国门站', '复兴门站',
  '中关村站', '五道口站', '上地站', '西二旗站', '回龙观站',
  '三里屯站', '工体站', '望京站', '通州站', '亦庄站'
];

function randomRange(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(randomRange(min, max + 1));
}

export function generateStations(): BikeStation[] {
  const stations: BikeStation[] = [];

  for (let i = 0; i < STATION_COUNT; i++) {
    const lat = CENTER_LAT + randomRange(-SPREAD, SPREAD);
    const lng = CENTER_LNG + randomRange(-SPREAD, SPREAD);
    const bikeCount = randomInt(MIN_BIKES, MAX_BIKES);
    const capacity = MAX_BIKES;

    const hourlyHistory: number[] = [];
    for (let h = 0; h < HISTORY_HOURS; h++) {
      const baseOccupancy = 0.4 + 0.3 * Math.sin((h - 6) * Math.PI / 6);
      const noise = (Math.random() - 0.5) * 0.3;
      const occupancy = Math.max(0, Math.min(1, baseOccupancy + noise));
      hourlyHistory.push(Math.round(occupancy * 100));
    }

    stations.push({
      id: uuidv4(),
      name: stationNames[i] || `站点${i + 1}`,
      lat,
      lng,
      bikeCount,
      capacity,
      hourlyHistory
    });
  }

  return stations;
}

export function simulateBikeActivity(stations: BikeStation[]): { stations: BikeStation[]; changedIds: string[] } {
  const changedIds: string[] = [];

  const updatedStations = stations.map(station => {
    const changeChance = Math.random();
    if (changeChance < 0.6) {
      const change = randomInt(-3, 3);
      const newCount = Math.max(MIN_BIKES, Math.min(station.capacity, station.bikeCount + change));
      if (newCount !== station.bikeCount) {
        changedIds.push(station.id);
        return { ...station, bikeCount: newCount };
      }
    }
    return station;
  });

  return { stations: updatedStations, changedIds };
}

export function createDispatchTask(
  fromStationId: string,
  toStationId: string,
  bikeCount: number
): DispatchTask {
  return {
    id: uuidv4(),
    fromStationId,
    toStationId,
    bikeCount,
    status: 'pending',
    startTime: Date.now(),
    duration: 2000
  };
}

export function calculateGlobalStats(
  stations: BikeStation[],
  activeDispatches: DispatchTask[]
): GlobalStats {
  const totalBikes = stations.reduce((sum, s) => sum + s.bikeCount, 0);
  const totalCapacity = stations.reduce((sum, s) => sum + s.capacity, 0);
  const avgOccupancy = totalCapacity > 0 ? Math.round((totalBikes / totalCapacity) * 100) : 0;

  return {
    totalBikes,
    avgOccupancy,
    activeDispatches: activeDispatches.filter(d => d.status === 'moving').length
  };
}

export function getBikeColor(bikeCount: number, capacity: number): string {
  const ratio = bikeCount / capacity;

  if (ratio <= 0.33) {
    const t = ratio / 0.33;
    return interpolateColor('#ea4335', '#fbbc04', t);
  } else if (ratio <= 0.66) {
    const t = (ratio - 0.33) / 0.33;
    return interpolateColor('#fbbc04', '#34a853', t);
  } else {
    const t = (ratio - 0.66) / 0.34;
    return interpolateColor('#34a853', '#1e8e3e', Math.min(1, t));
  }
}

function interpolateColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);

  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);

  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
}
