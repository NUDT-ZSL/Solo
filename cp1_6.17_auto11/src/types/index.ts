export interface Coordinate {
  lat: number;
  lng: number;
}

export interface Attraction {
  id: string;
  name: string;
  city: string;
  coordinates: Coordinate;
  description: string;
  thumbnail: string;
  category: string;
}

export interface DayPlan {
  day: number;
  date: string;
  attractions: Attraction[];
  totalDistance: number;
}

export interface CheckInRecord {
  id: string;
  attractionId: string;
  attractionName: string;
  timestamp: string;
  photos: string[];
  notes: string;
  coordinates: Coordinate;
}

export interface Trip {
  id: string;
  title: string;
  startDate: string;
  endDate: string;
  days: DayPlan[];
  checkIns: CheckInRecord[];
  coverImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeatherInfo {
  date: string;
  condition: 'sunny' | 'cloudy' | 'rainy' | 'snowy' | 'windy';
  tempHigh: number;
  tempLow: number;
  icon: string;
}

export interface LuggageSuggestion {
  category: string;
  items: string[];
  reason: string;
}

export interface User {
  id: string;
  username: string;
  avatar?: string;
}

export interface PhotoLayout {
  column: number;
  row: number;
  width: number;
  height: number;
  top: number;
  left: number;
}
