export type EventCategory = 'war' | 'culture' | 'tech' | 'politics' | 'disaster';

export interface HistoryEvent {
  id: string;
  year: number;
  title: string;
  description: string;
  category: EventCategory;
  importance: 1 | 2 | 3 | 4 | 5;
}

export interface RenderedEvent extends HistoryEvent {
  screenX: number;
  screenY: number;
  radius: number;
  baseY: number;
  isHovered: boolean;
  hoverProgress: number;
  isVisible: boolean;
  visibilityProgress: number;
  isExpanded: boolean;
  expandProgress: number;
}

export interface TimelineRange {
  startYear: number;
  endYear: number;
}

export interface ViewState {
  range: TimelineRange;
  offsetX: number;
  zoom: number;
}

export interface HoverInfo {
  eventId: string | null;
  mouseX: number;
  mouseY: number;
  opacity: number;
  fadeProgress: number;
}

export interface CategoryFilter {
  war: boolean;
  culture: boolean;
  tech: boolean;
  politics: boolean;
  disaster: boolean;
}

export const CATEGORY_COLORS: Record<EventCategory, string> = {
  war: '#E57373',
  culture: '#64B5F6',
  tech: '#81C784',
  politics: '#FFB74D',
  disaster: '#A1887F'
};

export const CATEGORY_LABELS: Record<EventCategory, string> = {
  war: '战争',
  culture: '文化',
  tech: '科技',
  politics: '政治',
  disaster: '灾难'
};

export const IMPORTANCE_RADIUS: Record<number, number> = {
  1: 5,
  2: 5,
  3: 7,
  4: 7,
  5: 9
};

export interface CollisionResult {
  eventId: string;
  yOffset: number;
  side: 'top' | 'bottom';
}

export interface CollisionParams {
  startYear: number;
  endYear: number;
  paddingLeft: number;
  timelineWidth: number;
  offsetX: number;
  collisionRadius: number;
}

export type WorkerMessage =
  | { type: 'loadEvents' }
  | { type: 'detectCollisions'; events: HistoryEvent[]; params: CollisionParams };

export type WorkerResponse =
  | { type: 'eventsLoaded'; events: HistoryEvent[] }
  | { type: 'collisionsDetected'; results: CollisionResult[] };
