export interface AudioFeatures {
  averageRms: number;
  averageFreq: number;
  tempo: number;
  loudness: number;
  warmth: number;
}

export interface AudioMarkerData {
  id: string;
  routeId: string;
  lat: number;
  lng: number;
  audioUrl: string;
  duration: number;
  features: AudioFeatures;
  locationName: string;
  createdAt: string;
}

export interface RouteData {
  id: string;
  name: string;
  description: string;
  markers: AudioMarkerData[];
  createdAt: string;
}

export interface HeatmapPoint {
  lat: number;
  lng: number;
  intensity: number;
  audioType: 'warm' | 'cool';
}

export interface HeatmapData {
  points: HeatmapPoint[];
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
}

export interface CommentData {
  id: string;
  audioMarkerId: string;
  userId: string;
  content: string;
  createdAt: string;
}

export interface RatingData {
  audioMarkerId: string;
  averageScore: number;
  totalCount: number;
}

export type PlaybackState = 'idle' | 'playing' | 'paused' | 'recording';

export interface MapViewState {
  center: [number, number];
  zoom: number;
}
