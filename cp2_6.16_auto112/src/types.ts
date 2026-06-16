export interface IntersectionData {
  x: number;
  y: number;
  traffic: number;
  timeLabel: string;
}

export type DayType = 'weekday' | 'weekend';

export interface TrafficData {
  dayType: DayType;
  hour: number;
  intersections: IntersectionData[];
}
