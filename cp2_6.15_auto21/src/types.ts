export type WeatherType = 'sunny' | 'cloudy' | 'rainy';

export interface DailyWeather {
  date: string;
  temp: number;
  tempHigh: number;
  tempLow: number;
  humidity: number;
  windSpeed: number;
  rainProb: number;
  type: WeatherType;
  icon: string;
}

export interface WeatherData {
  city: string;
  current: DailyWeather;
  forecast: DailyWeather[];
}

export type ClothingCategory = 'top' | 'bottom' | 'outerwear' | 'shoes' | 'accessory';

export interface ClothingItem {
  id: string;
  name: string;
  category: ClothingCategory;
  icon: string;
  warmthWeight: number;
  waterproof: boolean;
  windproof: boolean;
  suitableTemp: [number, number];
}

export interface OutfitItem extends ClothingItem {
  reason: string;
}

export interface OutfitPlan {
  id: string;
  timestamp: number;
  weatherSnapshot: DailyWeather;
  items: OutfitItem[];
  rating?: number;
  modified: boolean;
}

export interface WeatherWeight {
  tempWeight: number;
  humidityWeight: number;
  windWeight: number;
  rainWeight: number;
}
