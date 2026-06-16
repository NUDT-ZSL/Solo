export type AlertType = 'thunderstorm' | 'typhoon' | 'rainstorm' | 'high_temperature' | 'cold_wave';

export type AlertLevel = 'blue' | 'yellow' | 'orange' | 'red';

export type ReportType =
  | 'rainstorm_flooding'
  | 'wind_tree_fall'
  | 'hail'
  | 'landslide'
  | 'other';

export interface Alert {
  id: string;
  type: AlertType;
  level: AlertLevel;
  region: string;
  description: string;
  startTime: string;
  endTime: string;
}

export interface Report {
  id: string;
  type: ReportType;
  lat: number;
  lng: number;
  description: string;
  photoUrl?: string;
  timestamp: string;
}

export interface Bounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface ToastItem {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}
