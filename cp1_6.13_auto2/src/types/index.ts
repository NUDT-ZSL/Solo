export interface Attraction {
  id: string;
  name: string;
  description: string;
  source: string;
}

export interface City {
  id: string;
  name: string;
  nameEn: string;
  description: string;
  image: string;
  lat: number;
  lng: number;
  attractions: Attraction[];
  addedBy?: string;
}

export interface Member {
  id: string;
  name: string;
  colorIndex: number;
}

export interface VoteResult {
  yes: string[];
  no: string[];
}

export interface Room {
  id: string;
  code: string;
  phase: 'search' | 'voting' | 'final';
  selectedCities: City[];
  votes: Record<string, VoteResult>;
  finalCities: City[];
  members: Member[];
  votingStartTime: number | null;
  createdAt: number;
}

export type RoomPhase = 'search' | 'voting' | 'final';

export const MEMBER_COLORS = [
  '#ff6b6b',
  '#4ecdc4',
  '#ffe66d',
  '#95e1d3',
  '#f38181',
  '#aa96da',
];
