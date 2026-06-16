/**
 * 坐标类型
 */
export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * 地图边界类型
 */
export interface Bounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

/**
 * 灾害类型枚举
 */
export type DisasterType =
  | 'typhoon'
  | 'rainstorm'
  | 'flood'
  | 'earthquake'
  | 'landslide'
  | 'thunder'
  | 'hail'
  | 'frost'
  | 'heatwave'
  | 'coldwave'
  | 'drought'
  | 'sandstorm'
  | 'other';

/**
 * 预警级别枚举
 */
export type AlertLevel = 'blue' | 'yellow' | 'orange' | 'red';

/**
 * 上报类型枚举
 */
export type ReportType =
  | 'flooding'
  | 'debris'
  | 'roadblock'
  | 'collapse'
  | 'damage'
  | 'injury'
  | 'other';

/**
 * 预警信息
 */
export interface Alert {
  id: string;
  type: DisasterType;
  level: AlertLevel;
  region: string;
  description: string;
  startTime: string;
  endTime: string;
}

/**
 * 上报信息
 */
export interface Report {
  id: string;
  type: ReportType;
  location: Coordinates;
  description: string;
  photo: string;
  createdAt: string;
}
