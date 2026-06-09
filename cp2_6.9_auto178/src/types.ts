export interface Track {
  id: number;
  name: string;
  instrument: InstrumentType;
  color: string;
  volume: number;
  pan: number;
  reverb: number;
  delay: number;
  distortion: number;
  steps: boolean[];
}

export type InstrumentType = 'kick' | 'snare' | 'hihat' | 'bass' | 'keyboard' | 'guitar' | 'pad' | 'perc';

export interface User {
  id: string;
  name: string;
  color: string;
  x?: number;
  y?: number;
}

export interface CellClickEvent {
  trackId: number;
  stepIndex: number;
  active: boolean;
  userId: string;
}

export interface MixerEvent {
  trackId: number;
  param: 'volume' | 'pan' | 'reverb' | 'delay' | 'distortion';
  value: number;
  userId: string;
}

export interface TrackColorEvent {
  trackId: number;
  color: string;
  userId: string;
}

export interface SavedArrangement {
  id: string;
  name: string;
  tracks: Track[];
  timestamp: number;
}

export type ServerMessage =
  | { type: 'init'; tracks: Track[]; users: User[] }
  | { type: 'cell_click'; data: CellClickEvent }
  | { type: 'mixer_change'; data: MixerEvent }
  | { type: 'track_color'; data: TrackColorEvent }
  | { type: 'user_joined'; user: User }
  | { type: 'user_left'; userId: string }
  | { type: 'cursor_move'; user: User };

export type ClientMessage =
  | { type: 'join_room'; roomCode: string; userId: string; userName: string }
  | { type: 'create_room'; userId: string; userName: string }
  | { type: 'cell_click'; data: CellClickEvent }
  | { type: 'mixer_change'; data: MixerEvent }
  | { type: 'track_color'; data: TrackColorEvent }
  | { type: 'cursor_move'; x: number; y: number };

export const INSTRUMENTS: { type: InstrumentType; name: string }[] = [
  { type: 'kick', name: 'Kick' },
  { type: 'snare', name: 'Snare' },
  { type: 'hihat', name: 'Hi-Hat' },
  { type: 'bass', name: 'Bass' },
  { type: 'keyboard', name: 'Keyboard' },
  { type: 'guitar', name: 'Guitar' },
  { type: 'pad', name: 'Pad' },
  { type: 'perc', name: 'Percussion' },
];

export const USER_COLORS = [
  '#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3',
  '#F38181', '#AA96DA', '#FCBAD3', '#A8D8EA',
];
