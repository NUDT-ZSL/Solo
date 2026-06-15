export interface Route {
  id: number;
  name: string;
  date: string;
  createdAt: string;
}

export interface RoutePoint {
  id: number;
  routeId: number;
  lat: number;
  lng: number;
  name: string;
  note: string;
  orderIndex: number;
  confirmed: boolean;
}

export interface RouteWithPoints extends Route {
  points: RoutePoint[];
}

export interface LogData {
  id: number;
  routeId: number | null;
  pointId: number | null;
  content: string | null;
  weather: string | null;
  imagePath: string | null;
  createdAt: string;
}

export interface LogFormData {
  content: string;
  weather: string;
  imageFile?: File | null;
  imagePath?: string | null;
}

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy';

export const weatherMap: Record<WeatherType, { label: string; icon: string }> = {
  sunny: { label: '晴天', icon: '☀️' },
  cloudy: { label: '阴天', icon: '☁️' },
  rainy: { label: '小雨', icon: '🌧️' },
  snowy: { label: '大雪', icon: '❄️' },
  windy: { label: '大风', icon: '💨' },
};
