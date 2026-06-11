import type { TimelineEvent, FilterRange } from './types';
import { uuid, lerp, easeInOutCubic, elasticBounce, clamp } from './animation';
import { startOfDay, diffInDays, minDate, maxDate } from './dateUtils';

export class TimelineManager {
  private events: TimelineEvent[] = [];
  private canvasWidth: number;
  private cardWidth: number;
  private paddingL = 80;
  private paddingR = 40;
  private subscribers: Array<() => void> = [];
  private filterRange: FilterRange | null = null;
  private dragStartPositions: Map<string, number> = new Map();

  constructor(canvasWidth: number = 800, cardWidth: number = 80) {
    this.canvasWidth = canvasWidth;
    this.cardWidth = cardWidth;
  }

  subscribe(callback: () => void): () => void {
    this.subscribers.push(callback);
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index !== -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  private notify(): void {
    for (const callback of this.subscribers) {
      callback();
    }
  }

  setCanvasWidth(width: number): void {
    this.canvasWidth = width;
    this.recalculatePositions();
  }

  getEvents(): TimelineEvent[] {
    return [...this.events];
  }

  getSortedEvents(): TimelineEvent[] {
    return [...this.events].sort((a, b) => a.date.getTime() - b.date.getTime());
  }

  addEvent(name: string, date: Date, color: string): TimelineEvent {
    const newEvent: TimelineEvent = {
      id: uuid(),
      name,
      date: startOfDay(date),
      color,
      position: 0,
      targetPosition: 0,
      bounceProgress: 0,
      bounceCount: 0,
      flashProgress: 0,
      visibility: 0,
      cardScale: 0,
      isDragging: false,
      dragOffsetX: 0,
    };
    this.events.push(newEvent);
    this.recalculatePositions();
    newEvent.position = newEvent.targetPosition;
    this.dragStartPositions.set(newEvent.id, newEvent.targetPosition);
    newEvent.bounceProgress = 1;
    this.notify();
    return newEvent;
  }

  removeEvent(id: string): void {
    this.events = this.events.filter((e) => e.id !== id);
    this.dragStartPositions.delete(id);
    this.recalculatePositions();
    this.notify();
  }

  recalculatePositions(): void {
    const sortedEvents = this.getSortedEvents();
    if (this.events.length === 0) return;

    const totalWidth = this.canvasWidth - this.paddingL - this.paddingR;

    if (this.events.length <= 1) {
      const singlePos = this.paddingL + totalWidth / 2 - this.cardWidth / 2;
      for (const event of sortedEvents) {
        event.targetPosition = singlePos;
      }
    } else {
      const dates = sortedEvents.map((e) => e.date.getTime());
      const dateMin = Math.min(...dates);
      const dateMax = Math.max(...dates);

      sortedEvents.forEach((event, i) => {
        if (dateMin === dateMax) {
          event.targetPosition =
            this.paddingL + i * ((totalWidth - this.cardWidth) / (this.events.length - 1 || 1));
        } else {
          const ratio = (event.date.getTime() - dateMin) / (dateMax - dateMin);
          event.targetPosition = this.paddingL + ratio * (totalWidth - this.cardWidth);
        }
      });
    }

    for (const event of this.events) {
      if (!event.isDragging && Math.abs(event.position - event.targetPosition) > 0.01) {
        if (event.bounceProgress >= 1) {
          event.bounceProgress = 0;
        }
      }
    }
  }

  updatePositions(dt: number): void {
    for (const event of this.events) {
      if (event.bounceProgress < 1) {
        const prevProgress = event.bounceProgress;
        event.bounceProgress = Math.min(1, event.bounceProgress + dt / 0.4);

        if (prevProgress === 0 && event.bounceProgress > 0) {
          if (!this.dragStartPositions.has(event.id)) {
            this.dragStartPositions.set(event.id, event.position);
          }
        }

        const t = event.bounceProgress;
        const startPos = this.dragStartPositions.get(event.id) ?? event.position;
        const baseX = lerp(startPos, event.targetPosition, easeInOutCubic(t));
        const offset = elasticBounce(t);
        event.position = baseX + offset;

        if (event.bounceProgress >= 1) {
          this.dragStartPositions.delete(event.id);
        }
      }

      if (event.flashProgress > 0) {
        event.flashProgress = Math.max(0, event.flashProgress - dt / 0.5);
      }

      const lerpFactor = clamp(dt / 0.3, 0, 1);
      if (this.filterRange) {
        const inRange =
          event.date.getTime() >= this.filterRange.minDate.getTime() &&
          event.date.getTime() <= this.filterRange.maxDate.getTime();
        const targetVis = inRange ? 1 : 0;
        event.visibility = lerp(event.visibility, targetVis, lerpFactor);
        event.cardScale = lerp(event.cardScale, targetVis, lerpFactor);
      } else {
        event.visibility = lerp(event.visibility, 1, lerpFactor);
        event.cardScale = lerp(event.cardScale, 1, lerpFactor);
      }
    }
  }

  startDrag(eventId: string, pointerX: number): void {
    const event = this.events.find((e) => e.id === eventId);
    if (!event) return;

    event.isDragging = true;
    event.dragOffsetX = pointerX - event.position;
    this.dragStartPositions.set(eventId, event.position);
  }

  onDragMove(eventId: string, pointerX: number): void {
    const event = this.events.find((e) => e.id === eventId);
    if (!event || !event.isDragging) return;

    event.position = pointerX - event.dragOffsetX;

    const cardCenterX = event.position + this.cardWidth / 2;

    for (const sibling of this.events) {
      if (sibling.id === eventId) continue;

      const siblingCenterX = sibling.targetPosition + this.cardWidth / 2;

      if (
        event.date.getTime() > sibling.date.getTime() &&
        cardCenterX < siblingCenterX
      ) {
        const tempDate = event.date;
        event.date = sibling.date;
        sibling.date = tempDate;
        this.recalculatePositions();
      } else if (
        event.date.getTime() < sibling.date.getTime() &&
        cardCenterX > siblingCenterX
      ) {
        const tempDate = event.date;
        event.date = sibling.date;
        sibling.date = tempDate;
        this.recalculatePositions();
      }
    }
  }

  endDrag(eventId: string): void {
    const event = this.events.find((e) => e.id === eventId);
    if (!event) return;

    event.isDragging = false;
    this.recalculatePositions();
    event.bounceProgress = 0;
    if (!this.dragStartPositions.has(eventId)) {
      this.dragStartPositions.set(eventId, event.position);
    }
  }

  setFilterRange(range: FilterRange | null): void {
    this.filterRange = range;
    this.notify();
  }

  getCardRectById(id: string): { x: number; y: number; w: number; h: number } | null {
    const event = this.events.find((e) => e.id === id);
    if (!event) return null;
    return {
      x: event.position,
      y: 40,
      w: this.cardWidth,
      h: 40,
    };
  }

  dateToX(date: Date): number {
    if (this.events.length <= 1) {
      const totalWidth = this.canvasWidth - this.paddingL - this.paddingR;
      return this.paddingL + totalWidth / 2;
    }

    const sorted = this.getSortedEvents();
    const dateMin = sorted[0].date.getTime();
    const dateMax = sorted[sorted.length - 1].date.getTime();
    const totalWidth = this.canvasWidth - this.paddingL - this.paddingR;
    const ratio = clamp((date.getTime() - dateMin) / (dateMax - dateMin), 0, 1);
    return this.paddingL + ratio * (totalWidth - this.cardWidth) + this.cardWidth / 2;
  }

  xToDate(x: number): Date {
    if (this.events.length === 0) {
      return new Date();
    }

    if (this.events.length === 1) {
      return new Date(this.events[0].date);
    }

    const sorted = this.getSortedEvents();
    const dateMin = sorted[0].date.getTime();
    const dateMax = sorted[sorted.length - 1].date.getTime();
    const totalWidth = this.canvasWidth - this.paddingL - this.paddingR;
    const ratio = clamp(
      (x - this.paddingL - this.cardWidth / 2) / (totalWidth - this.cardWidth),
      0,
      1
    );
    return new Date(dateMin + ratio * (dateMax - dateMin));
  }

  getMinMaxDates(): { min: Date; max: Date } | null {
    if (this.events.length === 0) return null;
    const dates = this.events.map((e) => e.date);
    return {
      min: minDate(dates),
      max: maxDate(dates),
    };
  }

  initializeWithSampleData(): void {
    const colors = ['#58A6FF', '#F78166', '#7BC4C4', '#D14C8B', '#3FB950'];
    const samples: Array<{ name: string; date: string }> = [
      { name: '项目启动', date: '2026-01-15' },
      { name: '设计完成', date: '2026-03-05' },
      { name: '开发里程碑', date: '2026-05-20' },
      { name: '产品发布', date: '2026-06-11' },
      { name: '用户增长', date: '2026-08-22' },
    ];

    samples.forEach((sample, index) => {
      this.addEvent(sample.name, new Date(sample.date), colors[index]);
    });
  }
}
