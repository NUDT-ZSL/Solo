export interface TimelineEvent {
  id: string;
  title: string;
  date: string;
  description: string;
  icon: string;
  color: string;
  order: number;
  createdAt: number;
}

const STORAGE_KEY = 'time_carving_events';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

function loadFromStorage(): TimelineEvent[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw) as TimelineEvent[];
    }
  } catch {}
  return [];
}

function saveToStorage(events: TimelineEvent[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {}
}

export class EventManager {
  private events: TimelineEvent[] = [];
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.events = loadFromStorage();
    if (this.events.length === 0) {
      this.events = this.getDefaultEvents();
      this.persist();
    }
  }

  private getDefaultEvents(): TimelineEvent[] {
    return [
      {
        id: generateId(),
        title: '出生',
        date: '1995-06-15',
        description: '来到这个世界的第一天，一切从此开始。',
        icon: '🎂',
        color: '#60a5fa',
        order: 0,
        createdAt: Date.now(),
      },
      {
        id: generateId(),
        title: '小学入学',
        date: '2001-09-01',
        description: '背上小书包，走进了学校的大门，认识了许多新朋友。',
        icon: '📚',
        color: '#34d399',
        order: 1,
        createdAt: Date.now(),
      },
      {
        id: generateId(),
        title: '高中毕业',
        date: '2013-06-20',
        description: '三年青春岁月画上句号，带着憧憬走向更广阔的天地。',
        icon: '🎓',
        color: '#a78bfa',
        order: 2,
        createdAt: Date.now(),
      },
      {
        id: generateId(),
        title: '大学毕业',
        date: '2017-06-30',
        description: '四年的大学时光转瞬即逝，学到的不仅是知识，更是独立与成长。',
        icon: '🏛️',
        color: '#f472b6',
        order: 3,
        createdAt: Date.now(),
      },
      {
        id: generateId(),
        title: '第一次旅行',
        date: '2018-08-10',
        description: '独自踏上了远方的旅途，在陌生的城市遇见了最真实的自己。',
        icon: '✈️',
        color: '#fbbf24',
        order: 4,
        createdAt: Date.now(),
      },
      {
        id: generateId(),
        title: '入职第一份工作',
        date: '2019-03-15',
        description: '从校园到职场，开始了人生的新篇章。紧张又兴奋。',
        icon: '💼',
        color: '#fb923c',
        order: 5,
        createdAt: Date.now(),
      },
    ];
  }

  private persist(): void {
    saveToStorage(this.events);
  }

  private notify(): void {
    this.listeners.forEach((fn) => fn());
  }

  subscribe(fn: () => void): () => void {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }

  getAll(): TimelineEvent[] {
    return [...this.events].sort((a, b) => a.order - b.order);
  }

  getById(id: string): TimelineEvent | undefined {
    return this.events.find((e) => e.id === id);
  }

  add(event: Omit<TimelineEvent, 'id' | 'order' | 'createdAt'>): TimelineEvent {
    const maxOrder = this.events.reduce((max, e) => Math.max(max, e.order), -1);
    const newEvent: TimelineEvent = {
      ...event,
      id: generateId(),
      order: maxOrder + 1,
      createdAt: Date.now(),
    };
    this.events.push(newEvent);
    this.persist();
    this.notify();
    return newEvent;
  }

  update(id: string, patch: Partial<Omit<TimelineEvent, 'id' | 'createdAt'>>): TimelineEvent | null {
    const idx = this.events.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    this.events[idx] = { ...this.events[idx], ...patch };
    this.persist();
    this.notify();
    return this.events[idx];
  }

  remove(id: string): boolean {
    const idx = this.events.findIndex((e) => e.id === id);
    if (idx === -1) return false;
    this.events.splice(idx, 1);
    this.reindex();
    this.persist();
    this.notify();
    return true;
  }

  reorder(orderedIds: string[]): void {
    const map = new Map(this.events.map((e) => [e.id, e]));
    this.events = orderedIds
      .map((id, i) => {
        const e = map.get(id);
        if (e) e.order = i;
        return e;
      })
      .filter(Boolean) as TimelineEvent[];
    this.persist();
    this.notify();
  }

  sortByDate(): void {
    this.events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    this.reindex();
    this.persist();
    this.notify();
  }

  private reindex(): void {
    this.events.forEach((e, i) => {
      e.order = i;
    });
  }

  getSortedByDate(): TimelineEvent[] {
    return [...this.events].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
  }

  clear(): void {
    this.events = [];
    this.persist();
    this.notify();
  }

  reset(): void {
    this.events = this.getDefaultEvents();
    this.persist();
    this.notify();
  }
}
