export interface AudioClip {
  id: string;
  name: string;
  url: string;
  duration: number;
  waveformData: number[];
  startTime: number;
  trackId: string;
  volume: number;
  fadeIn: number;
  fadeOut: number;
}

export interface TrackEffects {
  eq: {
    low: number;
    mid: number;
    high: number;
  };
  compressor: {
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
  };
  reverb: {
    wet: number;
    decay: number;
  };
  delay: {
    wet: number;
    time: number;
    feedback: number;
  };
}

export interface Track {
  id: string;
  name: string;
  color: string;
  volume: number;
  muted: boolean;
  solo: boolean;
  effects: TrackEffects;
}

export interface UserCursor {
  x: number;
  y: number;
  selectedClipId: string | null;
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  color: string;
  cursor: UserCursor;
}

export interface Project {
  id: string;
  name: string;
  bpm: number;
  tracks: Track[];
  clips: AudioClip[];
  users: User[];
}
