import type { LatLngTuple } from 'leaflet';

export interface TravelNode {
  id: string;
  lat: number;
  lng: number;
  date: string;
  description: string;
  address: string;
  photoUrl: string;
  emojiTags: string[];
}

export interface NodeSavePayload {
  photoUrl: string;
  description: string;
  address: string;
  date: string;
  emojiTags: string[];
}

export interface DateRange {
  start: string | null;
  end: string | null;
}

export type LngLatTuple = LatLngTuple;
