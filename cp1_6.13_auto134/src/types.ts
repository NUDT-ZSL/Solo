export interface Waypoint {
  id: string;
  lat: number;
  lng: number;
  elevation?: number;
  terrain?: string;
  estimatedTime?: number;
  notes?: string;
}

export interface Trail {
  _id?: string;
  title: string;
  description?: string;
  difficulty: number;
  distance: number;
  waypoints: Waypoint[];
  thumbnail?: string;
  authorId: string;
  authorName: string;
  likes: number;
  isPublic: boolean;
  createdAt?: string;
  centerLat: number;
  centerLng: number;
}

export interface User {
  _id?: string;
  name: string;
  avatar?: string;
  following: string[];
  followers: string[];
  totalDistance: number;
  badges: Badge[];
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
}

export interface WeatherDay {
  date: string;
  tempMin: number;
  tempMax: number;
  precipitation: number;
  windSpeed: number;
  windDirection: number;
  condition: string;
  warningLevel: 'safe' | 'caution' | 'danger';
}

export interface WeatherResponse {
  location: string;
  days: WeatherDay[];
}

export interface LocationUpdate {
  userId: string;
  userName: string;
  lat: number;
  lng: number;
  timestamp: string;
  trailId: string;
}

export interface Activity {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  type: 'trail_published' | 'badge_earned' | 'location_update';
  content: string;
  timestamp: string;
  trail?: Trail;
  badge?: Badge;
  location?: LocationUpdate;
}
