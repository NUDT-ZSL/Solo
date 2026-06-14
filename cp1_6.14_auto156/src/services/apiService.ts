import { User, Skill, ExchangeRequest, Review, ExchangeRecord } from '../types';

const BASE_URL = '/api';

export interface SkillWithUser extends Skill {
  user: User;
}

export interface RequestWithDetails extends ExchangeRequest {
  fromUser?: User;
  toUser?: User;
  fromSkill?: Skill;
  toSkill?: Skill;
}

export interface ReviewWithUser extends Review {
  fromUser?: User;
}

type CacheKey = string;

interface CacheEntry<T> {
  data: T;
  expireAt: number;
  size: number;
}

interface SearchIndex {
  allSkills: SkillWithUser[];
  trie: Map<string, SkillWithUser[]>;
  timestamp: number;
}

class TTLCache {
  private store = new Map<CacheKey, CacheEntry<any>>();
  private maxSize = 200;
  private defaultTTL = 60 * 1000;

  get<T>(key: CacheKey): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expireAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  set<T>(key: CacheKey, data: T, ttl?: number): void {
    if (this.store.size >= this.maxSize) {
      this.evictOldest(Math.floor(this.maxSize * 0.2));
    }
    const entry: CacheEntry<T> = {
      data,
      expireAt: Date.now() + (ttl ?? this.defaultTTL),
      size: this.estimateSize(data),
    };
    this.store.set(key, entry);
  }

  has(key: CacheKey): boolean {
    const entry = this.store.get(key);
    if (!entry) return false;
    if (Date.now() > entry.expireAt) {
      this.store.delete(key);
      return false;
    }
    return true;
  }

  invalidate(prefix: string): number {
    let count = 0;
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  invalidateAll(): void {
    this.store.clear();
  }

  private evictOldest(count: number): void {
    const keys = Array.from(this.store.entries())
      .sort((a, b) => a[1].expireAt - b[1].expireAt)
      .slice(0, count)
      .map(([k]) => k);
    for (const key of keys) {
      this.store.delete(key);
    }
  }

  private estimateSize(data: any): number {
    try {
      return JSON.stringify(data).length;
    } catch {
      return 1000;
    }
  }
}

class RequestDeduper {
  private inflight = new Map<CacheKey, Promise<any>>();

  async request<T>(key: CacheKey, fetcher: () => Promise<T>): Promise<T> {
    if (this.inflight.has(key)) {
      return this.inflight.get(key) as Promise<T>;
    }
    const promise = fetcher().finally(() => {
      this.inflight.delete(key);
    });
    this.inflight.set(key, promise);
    return promise;
  }
}

const cache = new TTLCache();
const deduper = new RequestDeduper();

let searchIndex: SearchIndex | null = null;
const INDEX_TTL = 3 * 60 * 1000;
const SEARCH_DEBOUNCE_MS = 100;

const buildSearchIndex = async (): Promise<SearchIndex> => {
  if (searchIndex && Date.now() - searchIndex.timestamp < INDEX_TTL) {
    return searchIndex;
  }

  const cacheKey = 'skills:all';
  let skills = cache.get<SkillWithUser[]>(cacheKey);
  
  if (!skills) {
    const fetched = await deduper.request<SkillWithUser[]>(cacheKey, () =>
      fetch(`${BASE_URL}/skills`).then(r => r.json())
    );
    skills = fetched;
    cache.set(cacheKey, skills, INDEX_TTL);
  }

  const trie = new Map<string, SkillWithUser[]>();

  for (const skill of skills) {
    const tokens = new Set<string>();
    const skillName = skill.name.toLowerCase();
    const userName = skill.user.nickname.toLowerCase();
    
    for (let len = 1; len <= skillName.length; len++) {
      tokens.add(skillName.slice(0, len));
    }
    for (let i = 0; i < skillName.length; i++) {
      for (let j = i + 1; j <= skillName.length; j++) {
        tokens.add(skillName.slice(i, j));
      }
    }
    
    for (let len = 1; len <= userName.length; len++) {
      tokens.add(userName.slice(0, len));
    }
    for (let i = 0; i < userName.length; i++) {
      for (let j = i + 1; j <= userName.length; j++) {
        tokens.add(userName.slice(i, j));
      }
    }
    
    for (const token of tokens) {
      if (!trie.has(token)) {
        trie.set(token, []);
      }
      trie.get(token)!.push(skill);
    }
  }

  const newIndex: SearchIndex = {
    allSkills: skills,
    trie,
    timestamp: Date.now(),
  };

  searchIndex = newIndex;

  return newIndex;
};

const searchFromIndex = (keyword: string): Promise<SkillWithUser[]> => {
  return buildSearchIndex().then(index => {
    const kw = keyword.toLowerCase().trim();
    if (!kw) return index.allSkills;

    const results = index.trie.get(kw);
    if (!results) return [];

    const unique = Array.from(new Map(results.map(s => [s.id, s])).values());
    
    unique.sort((a, b) => {
      const aMatch = a.name.toLowerCase().startsWith(kw) ? 2 : 1;
      const bMatch = b.name.toLowerCase().startsWith(kw) ? 2 : 1;
      return bMatch - aMatch;
    });
    
    return unique;
  });
};

class Debouncer<T> {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private delay: number;

  constructor(delay: number) {
    this.delay = delay;
  }

  run(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        fn().then(resolve).catch(reject);
      }, this.delay);
    });
  }
}

const searchDebouncer = new Debouncer<SkillWithUser[]>(SEARCH_DEBOUNCE_MS);

const cachedFetch = <T>(
  key: CacheKey,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> => {
  const cached = cache.get<T>(key);
  if (cached !== undefined) {
    return Promise.resolve(cached);
  }
  return deduper.request(key, () =>
    fetcher().then(data => {
      cache.set(key, data, ttl);
      return data;
    })
  );
};

const invalidateByPrefix = (prefixes: string[]): void => {
  for (const prefix of prefixes) {
    cache.invalidate(prefix);
  }
};

const invalidateSearchIndex = (): void => {
  searchIndex = null;
};

export const apiService = {
  getCurrentUser: (): Promise<User> =>
    cachedFetch<User>('user:current', () =>
      fetch(`${BASE_URL}/user/current`).then(res => res.json()),
      5 * 60 * 1000
    ),

  getUsers: (search?: string): Promise<User[]> => {
    const key = `users:list:${search || 'all'}`;
    return cachedFetch<User[]>(key, () =>
      fetch(`${BASE_URL}/users${search ? `?search=${encodeURIComponent(search)}` : ''}`)
        .then(res => res.json()),
      60 * 1000
    );
  },

  getUserById: (id: string): Promise<User> =>
    cachedFetch<User>(`user:id:${id}`, () =>
      fetch(`${BASE_URL}/users/${id}`).then(res => res.json()),
      2 * 60 * 1000
    ),

  getSkills: (search?: string): Promise<SkillWithUser[]> => {
    if (search && search.trim()) {
      return searchDebouncer.run(() => searchFromIndex(search));
    }
    return cachedFetch<SkillWithUser[]>(
      'skills:all',
      () => fetch(`${BASE_URL}/skills`).then(res => res.json()),
      60 * 1000
    );
  },

  getSkillById: (id: string): Promise<SkillWithUser> =>
    cachedFetch<SkillWithUser>(`skill:id:${id}`, () =>
      fetch(`${BASE_URL}/skills/${id}`).then(res => res.json()),
      2 * 60 * 1000
    ),

  getRequests: (userId?: string): Promise<RequestWithDetails[]> => {
    const key = `requests:user:${userId || 'all'}`;
    return cachedFetch<RequestWithDetails[]>(
      key,
      () => fetch(`${BASE_URL}/requests${userId ? `?userId=${userId}` : ''}`).then(res => res.json()),
      10 * 1000
    );
  },

  createRequest: (data: {
    fromUserId: string;
    toUserId: string;
    fromSkillId: string;
    toSkillId: string;
    proposedHours: number;
    message?: string;
  }): Promise<ExchangeRequest> => {
    invalidateByPrefix(['requests:', 'records:']);
    return deduper.request(`createReq:${Date.now()}`, () =>
      fetch(`${BASE_URL}/requests`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => res.json())
    );
  },

  updateRequest: (id: string, data: {
    status?: string;
    proposedHours?: number;
    message?: string;
  }): Promise<ExchangeRequest> => {
    invalidateByPrefix(['requests:', 'records:']);
    return deduper.request(`updateReq:${id}:${Date.now()}`, () =>
      fetch(`${BASE_URL}/requests/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => res.json())
    );
  },

  getReviews: (skillId?: string, userId?: string): Promise<ReviewWithUser[]> => {
    const key = `reviews:s:${skillId || 'all'}:u:${userId || 'all'}`;
    return cachedFetch<ReviewWithUser[]>(
      key,
      () => fetch(`${BASE_URL}/reviews?${skillId ? `skillId=${skillId}` : ''}${userId ? `&userId=${userId}` : ''}`)
        .then(res => res.json()),
      30 * 1000
    );
  },

  createReview: (data: {
    fromUserId: string;
    toUserId: string;
    skillId: string;
    rating: number;
    comment: string;
  }): Promise<Review> => {
    invalidateByPrefix(['reviews:', 'skills:', 'user:id:']);
    invalidateSearchIndex();
    return deduper.request(`createReview:${Date.now()}`, () =>
      fetch(`${BASE_URL}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then(res => res.json())
    );
  },

  getRecords: (userId?: string): Promise<ExchangeRecord[]> => {
    const key = `records:user:${userId || 'all'}`;
    return cachedFetch<ExchangeRecord[]>(
      key,
      () => fetch(`${BASE_URL}/records${userId ? `?userId=${userId}` : ''}`).then(res => res.json()),
      60 * 1000
    );
  },

  clearAllCache: (): void => {
    cache.invalidateAll();
    invalidateSearchIndex();
  },

  _getCacheStats: () => ({
    size: (cache as any).store?.size || 0,
  }),
};
