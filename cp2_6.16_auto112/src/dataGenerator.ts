import type { DayType, IntersectionData } from './types';

const GRID_COLS = 30;
const GRID_ROWS = 20;
const MAX_TRAFFIC = 500;
const FLUCTUATION = 0.15;

interface IntersectionBase {
  x: number;
  y: number;
  baseTraffic: number;
}

const intersections: IntersectionBase[] = [];

function initIntersections() {
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const x = (col + 0.5) / GRID_COLS;
      const y = (row + 0.5) / GRID_ROWS;
      const cx = 0.5 + (Math.random() - 0.5) * 0.3;
      const cy = 0.5 + (Math.random() - 0.5) * 0.3;
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      const centerFactor = Math.max(0, 1 - dist * 1.5);
      const baseTraffic = 50 + centerFactor * 300 + Math.random() * 150;
      intersections.push({
        x: x * 800,
        y: y * 500,
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

function getPeakFactor(dayType: DayType, hour: number): number {
  if (dayType === 'weekday') {
    if (hour >= 8 && hour <= 9) {
      const t = hour === 8 ? 1.0 : 0.9;
      return 1.5 + 0.5 * t;
    }
    if (hour >= 18 && hour <= 19) {
      const t = hour === 18 ? 1.0 : 0.9;
      return 1.6 + 0.4 * t;
    }
    if (hour >= 7 && hour < 8) return 1.2 + (hour - 7) * 0.3;
    if (hour > 9 && hour <= 11) return 1.4 - (hour - 9) * 0.15;
    if (hour >= 12 && hour <= 13) return 1.1;
    if (hour >= 17 && hour < 18) return 1.0 + (hour - 17) * 0.6;
    if (hour > 19 && hour <= 21) return 1.5 - (hour - 19) * 0.25;
    if (hour >= 6 && hour < 7) return 0.6 + (hour - 6) * 0.6;
    if (hour >= 22 || hour < 6) return 0.3 + Math.random() * 0.2;
    return 0.8;
  } else {
    if (hour >= 14 && hour <= 16) {
      const mid = 15;
      const dist = Math.abs(hour - mid);
      return 1.4 + 0.3 * (1 - dist);
    }
    if (hour >= 11 && hour <= 13) return 1.1 + (hour - 11) * 0.1;
    if (hour >= 17 && hour <= 19) return 1.2 - (hour - 17) * 0.1;
    if (hour >= 10 && hour < 11) return 0.8 + (hour - 10) * 0.3;
    if (hour > 19 && hour <= 21) return 1.0 - (hour - 19) * 0.2;
    if (hour >= 8 && hour < 10) return 0.5 + (hour - 8) * 0.15;
    if (hour >= 22 || hour < 8) return 0.25 + Math.random() * 0.2;
    return 0.7;
  }
}

export function generateTrafficData(dayType: DayType, hour: number): IntersectionData[] {
  const peakFactor = getPeakFactor(dayType, hour);
  const timeLabel = getTimeLabel(hour);

  return intersections.map((inter) => {
    const fluctuation = 1 + (Math.random() * 2 - 1) * FLUCTUATION;
    const traffic = Math.min(MAX_TRAFFIC, Math.max(0, inter.baseTraffic * peakFactor * fluctuation));
    return {
      x: inter.x,
      y: inter.y,
      traffic: Math.round(traffic),
      timeLabel
    };
  });
}
