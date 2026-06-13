import axios from 'axios';

export const api = axios.create({
  baseURL: '/api',
  timeout: 5000,
});

export interface Book {
  _id: string;
  title: string;
  author: string;
  coverColor: string;
  progress: number;
  totalPages: number;
}

export interface Note {
  _id: string;
  bookId: string;
  userId: string;
  userName: string;
  userAvatarColor: string;
  content: string;
  quote: string;
  createdAt: number;
}

export interface NotesPage {
  notes: Note[];
  total: number;
  hasMore: boolean;
}

export interface Member {
  _id: string;
  nickname: string;
  avatarColor: string;
  bookStatuses?: Record<string, MemberStatus>;
  status?: MemberStatus;
}

export type MemberStatus = 'unread' | 'reading' | 'read';

export interface Reminder {
  _id: string;
  userId: string;
  userName: string;
  bookId: string;
  bookTitle: string;
  createdAt: number;
}

class DataCache<T> {
  private cache = new Map<string, { data: T; timestamp: number }>();
  private ttl: number;

  constructor(ttlMs = 60_000) {
    this.ttl = ttlMs;
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set(key: string, data: T) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  invalidate(key: string) {
    this.cache.delete(key);
  }

  invalidatePattern(pattern: string) {
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
  }
}

const booksCache = new DataCache<Book[]>(30_000);
const notesCache = new DataCache<NotesPage>(20_000);
const membersCache = new DataCache<Member[]>(30_000);
const remindersCache = new DataCache<Reminder[]>(10_000);

export const booksApi = {
  list: async (force = false) => {
    const cacheKey = 'all';
    if (!force) {
      const cached = booksCache.get(cacheKey);
      if (cached) return cached;
    }
    const data = await api.get<Book[]>('/books').then((r) => r.data);
    booksCache.set(cacheKey, data);
    return data;
  },
  get: (id: string) => api.get<Book>(`/books/${id}`).then((r) => r.data),
  getNotes: async (id: string, options?: { limit?: number; skip?: number; force?: boolean }) => {
    const limit = options?.limit ?? 10;
    const skip = options?.skip ?? 0;
    const force = options?.force ?? false;
    const cacheKey = `${id}-${skip}-${limit}`;

    if (!force) {
      const cached = notesCache.get(cacheKey);
      if (cached) return cached;
    }

    const params = new URLSearchParams();
    if (limit > 0) params.set('limit', String(limit));
    if (skip > 0) params.set('skip', String(skip));

    const data = await api
      .get<NotesPage>(`/books/${id}/notes?${params.toString()}`)
      .then((r) => r.data);

    notesCache.set(cacheKey, data);
    return data;
  },
  addNote: async (id: string, data: { userId: string; content: string; quote?: string }) => {
    const result = await api.post<Note>(`/books/${id}/notes`, data).then((r) => r.data);
    notesCache.invalidatePattern(id);
    return result;
  },
  getMembers: async (id: string, force = false) => {
    const cacheKey = id;
    if (!force) {
      const cached = membersCache.get(cacheKey);
      if (cached) return cached;
    }
    const data = await api.get<Member[]>(`/books/${id}/members`).then((r) => r.data);
    membersCache.set(cacheKey, data);
    return data;
  },
};

export const membersApi = {
  list: () => api.get<Member[]>('/members').then((r) => r.data),
  updateStatus: (userId: string, bookId: string, status: MemberStatus) =>
    api.patch(`/members/${userId}/status`, { bookId, status }).then((r) => r.data),
};

export const remindersApi = {
  list: async (force = false) => {
    const cacheKey = 'all';
    if (!force) {
      const cached = remindersCache.get(cacheKey);
      if (cached) return cached;
    }
    const data = await api.get<Reminder[]>('/reminders').then((r) => r.data);
    remindersCache.set(cacheKey, data);
    return data;
  },
  create: async (userId: string, bookId: string) => {
    const result = await api.post<Reminder>('/reminders', { userId, bookId }).then((r) => r.data);
    remindersCache.invalidate('all');
    return result;
  },
};
