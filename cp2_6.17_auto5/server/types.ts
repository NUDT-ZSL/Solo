export type AlertType = '雷暴' | '台风' | '暴雨' | '高温' | '寒潮';

export type AlertLevel = '蓝色' | '黄色' | '橙色' | '红色';

export interface Alert {
  id: string;
  type: AlertType;
  level: AlertLevel;
  region: string;
  description: string;
  startTime: string;
  endTime: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Report {
  id: string;
  title: string;
  description: string;
  type: string;
  coordinates: Coordinates;
  region: string;
  createdAt: string;
}

export interface Bounds {
  west: number;
  south: number;
  east: number;
  north: number;
}
