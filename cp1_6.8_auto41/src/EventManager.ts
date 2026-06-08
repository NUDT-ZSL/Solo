export interface TimelineEvent {
  id: string;
  title: string;
  year: number;
  isBCE: boolean;
  description: string;
  icon: string;
  color: string;
  imageUrl?: string;
}

export interface SearchResult {
  events: TimelineEvent[];
  suggestions: string[];
}

type ChangeListener = () => void;

export class EventManager {
  private events: Map<string, TimelineEvent> = new Map();
  private listeners: Set<ChangeListener> = new Set();
  private orderCache: TimelineEvent[] | null = null;

  addListener(fn: ChangeListener): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private notify(): void {
    this.orderCache = null;
    this.listeners.forEach((fn) => fn());
  }

  private invalidate(): void {
    this.orderCache = null;
  }

  addEvent(event: Omit<TimelineEvent, 'id'>): TimelineEvent {
    const id = `evt_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const newEvent: TimelineEvent = { ...event, id };
    this.events.set(id, newEvent);
    this.invalidate();
    this.notify();
    return newEvent;
  }

  removeEvent(id: string): boolean {
    const result = this.events.delete(id);
    if (result) {
      this.invalidate();
      this.notify();
    }
    return result;
  }

  updateEvent(id: string, patch: Partial<Omit<TimelineEvent, 'id'>>): TimelineEvent | null {
    const existing = this.events.get(id);
    if (!existing) return null;
    const updated: TimelineEvent = { ...existing, ...patch, id };
    this.events.set(id, updated);
    this.invalidate();
    this.notify();
    return updated;
  }

  getEvent(id: string): TimelineEvent | undefined {
    return this.events.get(id);
  }

  getEventsOrdered(): TimelineEvent[] {
    if (this.orderCache) return this.orderCache;
    const sorted = Array.from(this.events.values()).sort((a, b) => {
      const yearA = a.isBCE ? -a.year : a.year;
      const yearB = b.isBCE ? -b.year : b.year;
      return yearA - yearB;
    });
    this.orderCache = sorted;
    return sorted;
  }

  getAllEvents(): TimelineEvent[] {
    return Array.from(this.events.values());
  }

  search(query: string): SearchResult {
    if (!query.trim()) {
      return { events: this.getEventsOrdered(), suggestions: [] };
    }
    const q = query.toLowerCase().trim();
    const matched: TimelineEvent[] = [];
    const suggestionSet = new Set<string>();

    for (const evt of this.events.values()) {
      const titleMatch = evt.title.toLowerCase().includes(q);
      const descMatch = evt.description.toLowerCase().includes(q);
      const yearStr = evt.isBCE ? `公元前${evt.year}年` : `${evt.year}年`;
      const yearMatch = yearStr.includes(q) || String(evt.year).includes(q);
      if (titleMatch || descMatch || yearMatch) {
        matched.push(evt);
      }
      if (titleMatch) {
        suggestionSet.add(evt.title);
      }
    }

    matched.sort((a, b) => {
      const yearA = a.isBCE ? -a.year : a.year;
      const yearB = b.isBCE ? -b.year : b.year;
      return yearA - yearB;
    });

    return {
      events: matched,
      suggestions: Array.from(suggestionSet).slice(0, 8),
    };
  }

  importEvents(events: TimelineEvent[]): void {
    for (const evt of events) {
      this.events.set(evt.id, evt);
    }
    this.invalidate();
    this.notify();
  }

  clearAll(): void {
    this.events.clear();
    this.invalidate();
    this.notify();
  }
}
