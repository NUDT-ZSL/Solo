export type ViewMode = 'year' | 'month' | 'week';

export interface FilterRange {
  min: number;
  max: number;
}

export type EventsMap = Record<string, number>;

export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  targetX: number;
  targetY: number;
  radius: number;
  baseRadius: number;
  color: string;
  glowRadius: number;
  glowAlpha: number;
  date: string;
  eventCount: number;
  state: 'filling' | 'waiting' | 'falling' | 'settled' | 'hovered';
  settleY: number;
  scale: number;
  highlighted: boolean;
  opacity: number;
  fillStartDelay: number;
  fillProgress: number;
}

export interface HourglassConfig {
  topContainer: { x: number; y: number; width: number; height: number };
  neck: { x: number; y: number; width: number; height: number };
  bottomContainer: { x: number; y: number; width: number; height: number };
}

export interface AppState {
  viewMode: ViewMode;
  events: EventsMap;
  filterRange: FilterRange | null;
  currentDate: Date;
}

export interface TooltipData {
  visible: boolean;
  x: number;
  y: number;
  date: string;
  eventCount: number;
  opacity: number;
}

export interface SettledParticle {
  x: number;
  y: number;
  radius: number;
}
