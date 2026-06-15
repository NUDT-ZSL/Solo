import type {
  HistoryEvent,
  RenderedEvent,
  CategoryFilter,
  HoverInfo,
  CollisionResult,
  ViewState,
  EventCategory
} from './types';
import { CATEGORY_COLORS, IMPORTANCE_RADIUS } from './types';

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

type EventCallback = (events: RenderedEvent[]) => void;
type HoverCallback = (info: HoverInfo) => void;
type ExpandCallback = (eventId: string | null) => void;

export class EventManager {
  private allEvents: HistoryEvent[] = [];
  private renderedEvents: RenderedEvent[] = [];
  private collisionMap: Map<string, CollisionResult> = new Map();
  private categoryFilter: CategoryFilter = {
    war: true,
    culture: true,
    tech: true,
    politics: true,
    disaster: true
  };
  private hoverInfo: HoverInfo = {
    eventId: null,
    mouseX: 0,
    mouseY: 0,
    opacity: 0,
    fadeProgress: 0
  };
  private expandedEventId: string | null = null;

  private eventsChangeCallbacks: EventCallback[] = [];
  private hoverChangeCallbacks: HoverCallback[] = [];
  private expandChangeCallbacks: ExpandCallback[] = [];

  private lastFrameTime = 0;

  setEvents(events: HistoryEvent[]): void {
    this.allEvents = events;
    this.rebuildRenderedEvents();
  }

  setCollisionResults(results: CollisionResult[]): void {
    this.collisionMap.clear();
    for (const r of results) {
      this.collisionMap.set(r.eventId, r);
    }
    this.applyPositions();
    this.notifyEventsChange();
  }

  setCategoryFilter(category: EventCategory, visible: boolean): void {
    this.categoryFilter[category] = visible;
    for (const ev of this.renderedEvents) {
      ev.isVisible = this.categoryFilter[ev.category];
    }
    this.notifyEventsChange();
  }

  getCategoryFilter(): CategoryFilter {
    return { ...this.categoryFilter };
  }

  getVisibleCount(): number {
    return this.renderedEvents.filter(e => e.isVisible).length;
  }

  getExpandedEventId(): string | null {
    return this.expandedEventId;
  }

  getExpandedEvent(): RenderedEvent | undefined {
    if (!this.expandedEventId) return undefined;
    return this.renderedEvents.find(e => e.id === this.expandedEventId);
  }

  onEventsChange(cb: EventCallback): void {
    this.eventsChangeCallbacks.push(cb);
  }

  onHoverChange(cb: HoverCallback): void {
    this.hoverChangeCallbacks.push(cb);
  }

  onExpandChange(cb: ExpandCallback): void {
    this.expandChangeCallbacks.push(cb);
  }

  handleMouseMove(mouseX: number, mouseY: number): void {
    this.hoverInfo.mouseX = mouseX;
    this.hoverInfo.mouseY = mouseY;

    let foundId: string | null = null;
    for (const ev of this.renderedEvents) {
      if (ev.visibilityProgress < 0.1) continue;
      const dx = mouseX - ev.screenX;
      const dy = mouseY - ev.screenY;
      const hitR = ev.radius + 6;
      if (dx * dx + dy * dy <= hitR * hitR) {
        foundId = ev.id;
        break;
      }
    }

    if (foundId !== this.hoverInfo.eventId) {
      if (this.hoverInfo.eventId) {
        const prev = this.renderedEvents.find(e => e.id === this.hoverInfo.eventId);
        if (prev) prev.isHovered = false;
      }
      this.hoverInfo.eventId = foundId;
      if (foundId) {
        const curr = this.renderedEvents.find(e => e.id === foundId);
        if (curr) curr.isHovered = true;
      }
    }

    this.notifyHoverChange();
    this.notifyEventsChange();
  }

  handleClick(mouseX: number, mouseY: number): boolean {
    for (const ev of this.renderedEvents) {
      if (ev.visibilityProgress < 0.5) continue;
      const dx = mouseX - ev.screenX;
      const dy = mouseY - ev.screenY;
      const hitR = ev.radius + 6;
      if (dx * dx + dy * dy <= hitR * hitR) {
        this.toggleExpand(ev.id);
        return true;
      }
    }
    if (this.expandedEventId !== null) {
      this.toggleExpand(null);
      return true;
    }
    return false;
  }

  toggleExpand(eventId: string | null): void {
    if (this.expandedEventId === eventId) {
      if (eventId !== null) {
        const prev = this.renderedEvents.find(e => e.id === this.expandedEventId);
        if (prev) prev.isExpanded = false;
        this.expandedEventId = null;
      }
    } else {
      if (this.expandedEventId) {
        const prev = this.renderedEvents.find(e => e.id === this.expandedEventId);
        if (prev) prev.isExpanded = false;
      }
      this.expandedEventId = eventId;
      if (eventId) {
        const curr = this.renderedEvents.find(e => e.id === eventId);
        if (curr) curr.isExpanded = true;
      }
    }
    this.notifyExpandChange(this.expandedEventId);
    this.notifyEventsChange();
  }

  updatePositions(viewState: ViewState, width: number, height: number): void {
    const { startYear, endYear } = viewState.range;
    const yearSpan = endYear - startYear;
    const paddingLeft = 100;
    const paddingRight = 100;
    const timelineWidth = width - paddingLeft - paddingRight;
    const centerY = height * 0.5;

    for (const ev of this.renderedEvents) {
      const rel = (ev.year - startYear) / yearSpan;
      ev.screenX = paddingLeft + rel * timelineWidth + viewState.offsetX;
      ev.baseY = centerY;

      const collision = this.collisionMap.get(ev.id);
      if (collision) {
        const sideMul = collision.side === 'top' ? -1 : 1;
        ev.screenY = centerY + sideMul * (60 + collision.yOffset);
      } else {
        ev.screenY = centerY + 60;
      }
    }
    this.notifyEventsChange();
  }

  animate(now: number): void {
    const dt = this.lastFrameTime ? Math.min(50, now - this.lastFrameTime) : 16;
    this.lastFrameTime = now;

    let changed = false;

    for (const ev of this.renderedEvents) {
      const hoverTarget = ev.isHovered ? 1 : 0;
      if (Math.abs(ev.hoverProgress - hoverTarget) > 0.001) {
        const speed = dt / 200;
        ev.hoverProgress = clamp(lerp(ev.hoverProgress, hoverTarget, easeOutCubic(clamp(speed, 0, 1))), 0, 1);
        changed = true;
      }

      const visTarget = ev.isVisible ? 1 : 0;
      if (Math.abs(ev.visibilityProgress - visTarget) > 0.001) {
        const speed = dt / 200;
        ev.visibilityProgress = clamp(lerp(ev.visibilityProgress, visTarget, easeOutCubic(clamp(speed, 0, 1))), 0, 1);
        changed = true;
      }

      const expTarget = ev.isExpanded ? 1 : 0;
      if (Math.abs(ev.expandProgress - expTarget) > 0.001) {
        const speed = dt / 350;
        ev.expandProgress = clamp(lerp(ev.expandProgress, expTarget, easeOutCubic(clamp(speed, 0, 1))), 0, 1);
        changed = true;
      }
    }

    const hoverFadeTarget = this.hoverInfo.eventId ? 1 : 0;
    if (Math.abs(this.hoverInfo.fadeProgress - hoverFadeTarget) > 0.001) {
      const speed = dt / (this.hoverInfo.eventId ? 200 : 150);
      this.hoverInfo.fadeProgress = clamp(
        lerp(this.hoverInfo.fadeProgress, hoverFadeTarget, easeOutCubic(clamp(speed, 0, 1))),
        0, 1
      );
      this.hoverInfo.opacity = this.hoverInfo.fadeProgress;
      changed = true;
    }

    if (changed) {
      this.notifyEventsChange();
      this.notifyHoverChange();
    }
  }

  getRenderedEvents(): RenderedEvent[] {
    return this.renderedEvents;
  }

  getHoverInfo(): HoverInfo {
    return { ...this.hoverInfo };
  }

  getHoveredEvent(): RenderedEvent | undefined {
    if (!this.hoverInfo.eventId) return undefined;
    return this.renderedEvents.find(e => e.id === this.hoverInfo.eventId);
  }

  getCategoryColor(category: EventCategory): string {
    return CATEGORY_COLORS[category];
  }

  private rebuildRenderedEvents(): void {
    this.renderedEvents = this.allEvents.map(ev => ({
      ...ev,
      screenX: 0,
      screenY: 0,
      baseY: 0,
      radius: IMPORTANCE_RADIUS[ev.importance] ?? 7,
      isHovered: false,
      hoverProgress: 0,
      isVisible: this.categoryFilter[ev.category],
      visibilityProgress: 1,
      isExpanded: false,
      expandProgress: 0
    }));
    this.notifyEventsChange();
  }

  private applyPositions(): void {
    for (const ev of this.renderedEvents) {
      ev.radius = IMPORTANCE_RADIUS[ev.importance] ?? 7;
    }
  }

  private notifyEventsChange(): void {
    for (const cb of this.eventsChangeCallbacks) cb(this.renderedEvents);
  }

  private notifyHoverChange(): void {
    for (const cb of this.hoverChangeCallbacks) cb(this.hoverInfo);
  }

  private notifyExpandChange(id: string | null): void {
    for (const cb of this.expandChangeCallbacks) cb(id);
  }
}
