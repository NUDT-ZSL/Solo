export type InstrumentType = 'piano' | 'drums' | 'guitar';

export interface Instrument {
  id: InstrumentType;
  name: string;
  icon: string;
}

export interface NoteEvent {
  id: string;
  userId: string;
  instrument: InstrumentType;
  note: string;
  velocity: number;
  timestamp: number;
  type: 'noteOn' | 'noteOff';
}

export interface User {
  id: string;
  name: string;
  instrument: InstrumentType;
}

export interface DrumPadConfig {
  id: string;
  label: string;
  color: string;
  soundType: DrumSoundType;
}

export type DrumSoundType = 'kick' | 'snare' | 'hihat' | 'tom' | 'clap' | 'ride';
