import type { DayType, IntersectionData } from './types';

const GRID_COLS = 30;
const GRID_ROWS = 20;
const MAX_TRAFFIC = 500;
const FLUCTUATION = 0.15;
const BASE_WIDTH = 800;
const BASE_HEIGHT = 500;

interface IntersectionBase {
  normX: number;
  normY: number;
  baseTraffic: number;
}

const intersections: IntersectionBase[] = [];

function initIntersections() {
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const normX = (col + 0.5) / GRID_COLS;
      const normY = (row + 0.5) / GRID_ROWS;
      const cx = 0.5 + (Math.random() - 0.5) * 0.2;
      const cy = 0.5 + (Math.random() - 0.5) * 0.2;
      const dist = Math.sqrt((normX - cx) ** 2 + (normY - cy) ** 2);
      const centerFactor = Math.max(0, 1 - dist * 1.8);
      const baseTraffic = 80 + centerFactor * 280 + Math.random() * 100;
      intersections.push({
        normX,
        normY,
        baseTraffic: Math.min(MAX_TRAFFIC, baseTraffic)
      });
    }
  }
}

initIntersections();

function getTimeLabel(hour: number): string {
  if (hour >= 0 && hour < 6) return `凌晨${hour}点`;
  if (hour >= 6 && hour < 12) return `上午${hour}点`;
  if (hour === 12) return '中午12点';
  if (hour > 12 && hour < 18) return `下午${hour - 12}点`;
  return `晚上${hour - 12}点`;
}

function smoothStep(edge0: number, edge1: number, x: number): number {
  const t = Math.max(0, Math.min(1, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function getPeakFactor(dayType: DayType, hour: number): number {
  if (dayType === 'weekday') {
    const morningPeak = smoothStep(7, 8, hour) * smoothStep(10, 9, hour);
    const eveningPeak = smoothStep(17, 18, hour) * smoothStep(20, 19, hour);
    const morningIntensity = 1.8 * morningPeak;
    const eveningIntensity = 2.0 * eveningPeak;
    const midday = (hour >= 11 && hour <= 14) ? 0.9 + 0.2 * smoothStep(11, 12.5, hour) * smoothStep(14, 12.5, hour) : 0;
    const earlyMorning = smoothStep(5, 7, hour) * 0.6;
    const lateNight = (hour >= 21 || hour < 5) ? 0.2 + Math.random() * 0.15 : 0;
    const eveningDecay = (hour > 19 && hour <= 21) ? (1.5 - (hour - 19) * 0.35) : 0;
    const morningRise = (hour >= 6 && hour < 7) ? (0.4 + (hour - 6) * 0.5) : 0;

    const base = Math.max(0.4, 0.7 - Math.min(Math.abs(hour - 12), Math.abs(hour - 24)) * 0.02);

    return Math.max(
      0.2,
      base + morningIntensity + eveningIntensity + midday + earlyMorning + lateNight + eveningDecay + morningRise
    );
  } else {
    const afternoonPeak = smoothStep(13, 14, hour) * smoothStep(17, 16, hour);
    const afternoonIntensity = 1.7 * afternoonPeak;
    const lateMorning = (hour >= 10 && hour < 13) ? (0.7 + (hour - 10) * 0.15) : 0;
    const evening = (hour >= 17 && hour <= 20) ? (1.1 - (hour - 17) * 0.1) : 0;
    const lateNight = (hour >= 22 || hour < 9) ? 0.2 + Math.random() * 0.15 : 0;
    const morning = (hour >= 9 && hour < 10) ? (0.4 + (hour - 9) * 0.3) : 0;

    const base = 0.6;

    return Math.max(
      0.15,
      base + afternoonIntensity + lateMorning + evening + lateNight + morning
    );
  }
}

export function generateTrafficData(
  dayType: DayType,
  hour: number,
  canvasWidth: number = BASE_WIDTH,
  canvasHeight: number = BASE_HEIGHT
): IntersectionData[] {
  const peakFactor = getPeakFactor(dayType, hour);
  const timeLabel = getTimeLabel(hour);
  const scaleX = canvasWidth / BASE_WIDTH;
  const scaleY = canvasHeight / BASE_HEIGHT;

  return intersections.map((inter) => {
    const fluctuation = 1 + (Math.random() * 2 - 1) * FLUCTUATION;
    const traffic = Math.min(
      MAX_TRAFFIC,
      Math.max(0, inter.baseTraffic * peakFactor * fluctuation)
    );
    return {
      x: inter.normX * canvasWidth,
      y: inter.normY * canvasHeight,
      traffic: Math.round(traffic),
      timeLabel
    };
  });
}
