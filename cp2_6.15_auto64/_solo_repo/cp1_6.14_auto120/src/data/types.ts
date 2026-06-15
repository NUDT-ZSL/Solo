export interface PollutantData {
  pm25: number;
  pm10: number;
  o3: number;
  no2: number;
}

export interface StationData {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

export interface TimePointData {
  timestamp: number;
  stations: {
    [stationId: string]: PollutantData;
  };
}

export interface AirQualityDataset {
  stations: StationData[];
  timePoints: TimePointData[];
}

export const POLLUTANT_COLORS: Record<keyof PollutantData, string> = {
  pm25: '#e74c3c',
  pm10: '#e67e22',
  o3: '#3498db',
  no2: '#9b59b6',
};

export const POLLUTANT_LABELS: Record<keyof PollutantData, string> = {
  pm25: 'PM2.5',
  pm10: 'PM10',
  o3: 'O3',
  no2: 'NO2',
};

export const POLLUTANT_MAX = 200;
export const BAR_MAX_HEIGHT = 5;
export const BAR_SPACING = 0.55;
export const BASE_COLOR = 0x2d2d44;
