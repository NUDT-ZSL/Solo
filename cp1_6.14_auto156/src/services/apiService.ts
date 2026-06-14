import { User, Skill, ExchangeRequest, Review, ExchangeRecord } from '../types';

const BASE_URL = '/api';

interface SkillWithUser extends Skill {
  user: User;
}

interface RequestWithDetails extends ExchangeRequest {
  fromUser?: User;
  toUser?: User;
  fromSkill?: Skill;
  toSkill?: Skill;
}

interface ReviewWithUser extends Review {
  fromUser?: User;
}

type CacheKey = string;

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expireAt: number;
}

class ApiCache {
  private store = new Map<CacheKey, CacheEntry<any>>();
  private defaultTTL = 60 * 1000;

  get<T>(key: CacheKey): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expireAt) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: CacheKey, data: T, ttl: number = this.defaultTTL): void {
    this.store.set(key, {
      data,
      timestamp: Date.now(),
      expireAt: Date.now() + ttl,
    });
  }

  invalidate(prefix: string): void {
    for (const key of this.store.keys()) {
      if (key.startsWith(prefix)) {
        this.store.delete(key);
      }
    }
  }

  clear(): void {
    this.store.clear();
  }
}

const cache = new ApiCache();

interface SearchIndex {
  allSkills: SkillWithUser[];
  skillNameIndex: Map<string, SkillWithUser[]>;
  userNameIndex: Map<string, SkillWithUser[]>;
  timestamp: number;
}

let searchIndex: SearchIndex | null = null;
const INDEX_TTL = 2 * 60 * 1000;

const buildSearchIndex = async (): Promise<SearchIndex> => {
  if (searchIndex && Date.now() - searchIndex.timestamp < INDEX_TTL) {
    return searchIndex;
  }

  const skills = await fetch(`${BASE_URL}/skills`).then(r => r.json());

  const skillNameIndex = new Map<string, SkillWithUser[]>();
  const userNameIndex = new Map<string, SkillWithUser[]>();

  for (const skill of skills) {
    const skillName = skill.name.toLowerCase();
    if (!skillNameIndex.has(skillName)) {
      skillNameIndex.set(skillName, []);
    }
    skillNameIndex.get(skillName)!.push(skill);

    const nickName = skill.user.nickname.toLowerCase();
    if (!userNameIndex.has(nickName)) {
      userNameIndex.set(nickName, []);
    }
    userNameIndex.get(nickName)!.push(skill);
  }

  searchIndex = {
    allSkills: skills,
    skillNameIndex,
    userNameIndex,
    timestamp: Date.now(),
  };

  return searchIndex;
};

const searchFromIndex = (keyword: string): Promise<SkillWithUser[]> => {
  return buildSearchIndex().then(index => {
    if (!keyword.trim()) return index.allSkills;

    const kw = keyword.toLowerCase().trim();
    const results = new Set<SkillWithUser>();

    for (const [name, skills] of index.skillNameIndex) {
      if (name.includes(kw)) {
        skills.forEach(s => results.add(s));
      }
    }

    for (const [nickname, skills] of index.userNameIndex) {
      if (nickname.includes(kw)) {
        skills.forEach(s => results.add(s));
      }
    }

    return Array.from(results);
  });
};

const debounce = <F extends (...args: any[]) => any>(
  fn: F,
  delay: number
): ((...args: Parameters<F>) => Promise<ReturnType<F>>) => {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<F>) => {
    return new Promise((resolve) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        resolve(fn(...args));
      }, delay);
    });
  };
};

const cachedFetch = <T>(
  key: CacheKey,
  fetcher: () => Promise<T>,
  ttl?: number
): Promise<T> => {
  const cached = cache.get<T>(key);
  if (cached !== null) {
    return Promise.resolve(cached);
  }
  return fetcher().then(data => {
    cache.set(key, data, ttl);
    return data;
  });
};

const debouncedSearch = debounce(searchFromIndex, 80);

export const apiService = {
  getCurrentUser: (): Promise<User> =>
    cachedFetch<User>('currentUser', () =>
      fetch(`${BASE_URL}/user/current`).then(res => res.json())
    ),

  getUsers: (search?: string): Promise<User[]> => {
    const key = `users:${search || ''}`;
    return cachedFetch<User[]>(key, () =>
      fetch(`${BASE_URL}/users${search ? `?search=${encodeURIComponent(search)}` : ''}`)
        .then(res => res.json())
    );
  },

  getUserById: (id: string): Promise<User> =>
    cachedFetch<User>(`user:${id}`, () =>
      fetch(`${BASE_URL}/users/${id}`).then(res => res.json())
    ),

  getSkills: (search?: string): Promise<SkillWithUser[]> => {
    if (search) {
      return debouncedSearch(search);
    }
    return cachedFetch<SkillWithUser[]>(
      `skills:all`,
      () => fetch(`${BASE_URL}/skills`).then(res => res.json())
    );
  },

  getSkillById: (id: string): Promise<SkillWithUser> =>
    cachedFetch<SkillWithUser>(`skill:${id}`, () =>
      fetch(`${BASE_URL}/skills/${id}`).then(res => res.json())
    ),

  getRequests: (userId?: string): Promise<RequestWithDetails[]> => {
    const key = `requests:${userId || 'all'}`;
    return cachedFetch<RequestWithDetails[]>(
      key,
      () => fetch(`${BASE_URL}/requests${userId ? `?userId=${userId}` : ''}`).then(res => res.json()),
      5 * 1000
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
    cache.invalidate('requests');
    return fetch(`${BASE_URL}/requests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(res => res.json());
  },

  updateRequest: (id: string, data: {
    status?: string;
    proposedHours?: number;
    message?: string;
  }): Promise<ExchangeRequest> => {
    cache.invalidate('requests');
    return fetch(`${BASE_URL}/requests/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(res => res.json());
  },

  getReviews: (skillId?: string, userId?: string): Promise<ReviewWithUser[]> => {
    const key = `reviews:${skillId || 'all'}:${userId || 'all'}`;
    return cachedFetch<ReviewWithUser[]>(
      key,
      () => fetch(`${BASE_URL}/reviews?${skillId ? `skillId=${skillId}` : ''}${userId ? `&userId=${userId}` : ''}`)
        .then(res => res.json()),
      10 * 1000
    );
  },

  createReview: (data: {
    fromUserId: string;
    toUserId: string;
    skillId: string;
    rating: number;
    comment: string;
  }): Promise<Review> => {
    cache.invalidate('reviews');
    cache.invalidate('skills');
    searchIndex = null;
    return fetch(`${BASE_URL}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    }).then(res => res.json());
  },

  getRecords: (userId?: string): Promise<ExchangeRecord[]> => {
    const key = `records:${userId || 'all'}`;
    return cachedFetch<ExchangeRecord[]>(key, () =>
      fetch(`${BASE_URL}/records${userId ? `?userId=${userId}` : ''}`).then(res => res.json())
    );
  },

  clearCache: (): void => {
    cache.clear();
    searchIndex = null;
  },
};
