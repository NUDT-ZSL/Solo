export interface SoundClip {
  id: string;
  name: string;
  duration: number;
  frequency: number;
  waveType: OscillatorType;
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  vibrato: {
    rate: number;
    depth: number;
  };
  waveformData: number[];
}

export interface TrackClip {
  id: string;
  clipId: string;
  trackPosition: number;
  durationScale: number;
}

export interface Mix {
  id: string;
  author: string;
  createdAt: number;
  clips: TrackClip[];
  totalDuration: number;
}

export interface MixWithClips {
  id: string;
  author: string;
  createdAt: number;
  clips: (TrackClip & { clip: SoundClip | null })[];
  totalDuration: number;
}

export interface MixSummary {
  id: string;
  author: string;
  createdAt: number;
  clipCount: number;
  totalDuration: number;
  previewWaveform: number[];
}
