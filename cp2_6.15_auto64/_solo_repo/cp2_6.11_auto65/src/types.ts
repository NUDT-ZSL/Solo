export interface TimelineEvent {
  id: string;
  name: string;
  date: Date;
  color: string;
  position: number;
  targetPosition: number;
  isDragging: boolean;
  dragOffsetX: number;
  bounceProgress: number;
  bounceCount: number;
  flashProgress: number;
  lastFlashDate: number;
  visibility: number;
  cardScale: number;
}

export interface Particle {
  id: number;
  eventId: string;
  x: number;
  y: number;
  startX: number;
  targetStartX: number;
  currentStartX: number;
  transitionProgress: number;
  age: number;
  maxAge: number;
  fallDuration: number;
  waveAmplitude: number;
  waveFrequency: number;
  wavePhase: number;
  driftSpeed: number;
  size: number;
  opacity: number;
  color: string;
  fadeProgress: number;
}

export interface FilterRange {
  minDate: Date;
  maxDate: Date;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentDate: Date;
  startDate: Date;
  daysPerStep: number;
  stepIntervalMs: number;
  lastStepTime: number;
  boostEventId: string | null;
  boostRemaining: number;
}

export interface EncodedState {
  events: Array<{ n: string; d: string; c: string }>;
  v: number;
}
