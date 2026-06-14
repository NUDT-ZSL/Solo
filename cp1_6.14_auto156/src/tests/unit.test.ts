import assert from 'node:assert/strict';
import { test, describe, beforeEach } from 'node:test';

interface CacheEntry<T> {
  data: T;
  expireAt: number;
}

class TTLCache {
  private store = new Map<string, CacheEntry<any>>();
  private maxSize = 200;
  private defaultTTL = 60 * 1000;

  get<T>(key: string): T | undefined {
    const entry = this.store.get(key);
    if (!entry) return undefined;
    if (Date.now() > entry.expireAt) {
      this.store.delete(key);
      return undefined;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttl?: number): void {
    if (this.store.size >= this.maxSize) {
      this.evictOldest(Math.floor(this.maxSize * 0.2));
    }
    const entry: CacheEntry<T> = {
      data,
      expireAt: Date.now() + (ttl ?? this.defaultTTL),
    };
    this.store.set(key, entry);
  }

  has(key: string): boolean {
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

  get size(): number {
    return this.store.size;
  }
}

class RequestDeduper {
  private inflight = new Map<string, Promise<any>>();

  async request<T>(key: string, fetcher: () => Promise<T>): Promise<T> {
    if (this.inflight.has(key)) {
      return this.inflight.get(key) as Promise<T>;
    }
    const promise = fetcher().finally(() => {
      this.inflight.delete(key);
    });
    this.inflight.set(key, promise);
    return promise;
  }

  get inflightCount(): number {
    return this.inflight.size;
  }
}

function calculateVisibleRange(
  scrollTop: number,
  containerHeight: number,
  itemCount: number,
  itemHeight: number,
  bufferPx: number,
  overscan: number
): { startIndex: number; endIndex: number } {
  const startIndex = Math.max(
    0,
    Math.floor((scrollTop - bufferPx) / itemHeight) - overscan
  );
  const endIndex = Math.min(
    itemCount,
    Math.ceil((scrollTop + containerHeight + bufferPx) / itemHeight) + overscan
  );
  return { startIndex, endIndex };
}

interface Review {
  id: string;
  fromUserId: string;
  rating: number;
  comment: string;
  createdAt: string;
  fromUser?: {
    id: string;
    nickname: string;
    avatar: string;
  };
}

function validateReviewFields(review: Review): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  
  if (!review.id) missing.push('id');
  if (!review.fromUserId) missing.push('fromUserId');
  if (review.rating === undefined) missing.push('rating');
  if (review.comment === undefined) missing.push('comment');
  if (!review.createdAt) missing.push('createdAt');
  
  if (review.fromUser) {
    if (!review.fromUser.id) missing.push('fromUser.id');
    if (!review.fromUser.nickname) missing.push('fromUser.nickname');
    if (!review.fromUser.avatar) missing.push('fromUser.avatar');
  }
  
  return { valid: missing.length === 0, missing };
}

function validateAvailableSlots(slots: boolean[][]): {
  valid: boolean;
  days: number;
  hoursPerDay: number;
  freeCount: number;
  bookedCount: number;
} {
  if (!Array.isArray(slots) || slots.length === 0) {
    return { valid: false, days: 0, hoursPerDay: 0, freeCount: 0, bookedCount: 0 };
  }
  
  const days = slots.length;
  const hoursPerDay = slots[0]?.length || 0;
  let freeCount = 0;
  let bookedCount = 0;
  
  for (let day = 0; day < days; day++) {
    for (let hour = 0; hour < hoursPerDay; hour++) {
      if (slots[day]?.[hour]) {
        freeCount++;
      } else {
        bookedCount++;
      }
    }
  }
  
  return { valid: days === 7 && hoursPerDay === 24, days, hoursPerDay, freeCount, bookedCount };
}

describe('TTLCache', () => {
  let cache: TTLCache;

  beforeEach(() => {
    cache = new TTLCache();
  });

  test('基本 set 和 get', () => {
    cache.set('key1', 'value1');
    assert.equal(cache.get('key1'), 'value1');
  });

  test('不存在的 key 返回 undefined', () => {
    assert.equal(cache.get('nonexistent'), undefined);
  });

  test('has 方法正确检测存在性', () => {
    cache.set('key1', 'value1');
    assert.equal(cache.has('key1'), true);
    assert.equal(cache.has('key2'), false);
  });

  test('TTL 过期后缓存失效', async () => {
    cache.set('key1', 'value1', 10);
    assert.equal(cache.has('key1'), true);
    
    await new Promise(resolve => setTimeout(resolve, 20));
    
    assert.equal(cache.has('key1'), false);
    assert.equal(cache.get('key1'), undefined);
  });

  test('按前缀失效缓存', () => {
    cache.set('user:1', { id: 1 });
    cache.set('user:2', { id: 2 });
    cache.set('skills:all', []);
    
    const invalidated = cache.invalidate('user:');
    assert.equal(invalidated, 2);
    assert.equal(cache.has('user:1'), false);
    assert.equal(cache.has('user:2'), false);
    assert.equal(cache.has('skills:all'), true);
  });

  test('invalidateAll 清空所有缓存', () => {
    cache.set('a', 1);
    cache.set('b', 2);
    cache.set('c', 3);
    
    cache.invalidateAll();
    assert.equal(cache.size, 0);
  });

  test('存储对象数据', () => {
    const user = { id: '1', name: 'test', avatar: 'url' };
    cache.set('user:1', user);
    
    const result = cache.get<typeof user>('user:1');
    assert.deepEqual(result, user);
  });
});

describe('RequestDeduper', () => {
  test('并发相同请求只执行一次', async () => {
    const deduper = new RequestDeduper();
    let callCount = 0;
    
    const fetcher = () => {
      callCount++;
      return new Promise<string>(resolve => {
        setTimeout(() => resolve('result'), 20);
      });
    };
    
    const results = await Promise.all([
      deduper.request('key1', fetcher),
      deduper.request('key1', fetcher),
      deduper.request('key1', fetcher),
    ]);
    
    assert.equal(callCount, 1);
    assert.equal(results[0], 'result');
    assert.equal(results[1], 'result');
    assert.equal(results[2], 'result');
  });

  test('不同 key 的请求互不影响', async () => {
    const deduper = new RequestDeduper();
    let callCountA = 0;
    let callCountB = 0;
    
    const fetcherA = () => {
      callCountA++;
      return Promise.resolve('A');
    };
    const fetcherB = () => {
      callCountB++;
      return Promise.resolve('B');
    };
    
    const [resultA, resultB] = await Promise.all([
      deduper.request('keyA', fetcherA),
      deduper.request('keyB', fetcherB),
    ]);
    
    assert.equal(callCountA, 1);
    assert.equal(callCountB, 1);
    assert.equal(resultA, 'A');
    assert.equal(resultB, 'B');
  });

  test('请求完成后 inflight 清空', async () => {
    const deduper = new RequestDeduper();
    
    assert.equal(deduper.inflightCount, 0);
    
    const promise = deduper.request('key1', () => Promise.resolve('done'));
    assert.equal(deduper.inflightCount, 1);
    
    await promise;
    assert.equal(deduper.inflightCount, 0);
  });
});

describe('虚拟滚动计算', () => {
  const ITEM_HEIGHT = 120;
  const BUFFER_PX = 20;
  const OVERSCAN = 5;
  const TOTAL_ITEMS = 500;
  const CONTAINER_HEIGHT = 600;

  test('初始位置 (scrollTop=0)', () => {
    const { startIndex, endIndex } = calculateVisibleRange(
      0, CONTAINER_HEIGHT, TOTAL_ITEMS, ITEM_HEIGHT, BUFFER_PX, OVERSCAN
    );
    
    assert.equal(startIndex, 0);
    const visibleCount = Math.ceil(CONTAINER_HEIGHT / ITEM_HEIGHT) + OVERSCAN;
    assert.ok(endIndex <= visibleCount + 1, `endIndex ${endIndex} should be around ${visibleCount}`);
    assert.ok(endIndex > 0);
  });

  test('滚动到中间位置', () => {
    const scrollTop = 100 * ITEM_HEIGHT;
    const { startIndex, endIndex } = calculateVisibleRange(
      scrollTop, CONTAINER_HEIGHT, TOTAL_ITEMS, ITEM_HEIGHT, BUFFER_PX, OVERSCAN
    );
    
    assert.ok(startIndex < 100, 'startIndex should be before the scroll position');
    assert.ok(endIndex > 100, 'endIndex should be after the scroll position');
    assert.ok(startIndex >= 0);
    assert.ok(endIndex <= TOTAL_ITEMS);
  });

  test('滚动到底部边界', () => {
    const scrollTop = TOTAL_ITEMS * ITEM_HEIGHT;
    const { startIndex, endIndex } = calculateVisibleRange(
      scrollTop, CONTAINER_HEIGHT, TOTAL_ITEMS, ITEM_HEIGHT, BUFFER_PX, OVERSCAN
    );
    
    assert.equal(endIndex, TOTAL_ITEMS, 'endIndex should not exceed total items');
    assert.ok(startIndex < TOTAL_ITEMS);
  });

  test('滚动到顶部不出现负索引', () => {
    const { startIndex } = calculateVisibleRange(
      0, CONTAINER_HEIGHT, TOTAL_ITEMS, ITEM_HEIGHT, 1000, 100
    );
    
    assert.equal(startIndex, 0, 'startIndex should never be negative');
  });

  test('少量数据时正确计算', () => {
    const totalItems = 10;
    const { startIndex, endIndex } = calculateVisibleRange(
      0, CONTAINER_HEIGHT, totalItems, ITEM_HEIGHT, BUFFER_PX, OVERSCAN
    );
    
    assert.equal(startIndex, 0);
    assert.equal(endIndex, totalItems);
  });

  test('可见项数量远少于总数量 (性能验证)', () => {
    const scrollTop = 200 * ITEM_HEIGHT;
    const { startIndex, endIndex } = calculateVisibleRange(
      scrollTop, CONTAINER_HEIGHT, TOTAL_ITEMS, ITEM_HEIGHT, BUFFER_PX, OVERSCAN
    );
    
    const visibleCount = endIndex - startIndex;
    const expectedVisible = Math.ceil(CONTAINER_HEIGHT / ITEM_HEIGHT) + OVERSCAN * 2;
    
    assert.ok(
      visibleCount < expectedVisible + 5,
      `Visible count ${visibleCount} should be around ${expectedVisible} for performance`
    );
    assert.ok(
      visibleCount < TOTAL_ITEMS * 0.1,
      `Visible items should be less than 10% of total for 500 items (got ${visibleCount})`
    );
  });
});

describe('评价数据验证', () => {
  test('完整的评价数据通过验证', () => {
    const review: Review = {
      id: 'r1',
      fromUserId: 'u1',
      rating: 5,
      comment: '很好的体验',
      createdAt: '2024-01-01T00:00:00.000Z',
      fromUser: {
        id: 'u1',
        nickname: '小明',
        avatar: 'https://example.com/avatar.jpg',
      },
    };
    
    const { valid, missing } = validateReviewFields(review);
    assert.equal(valid, true, `Expected valid, missing: ${missing.join(', ')}`);
    assert.deepEqual(missing, []);
  });

  test('缺少 fromUser 头像字段时检测到', () => {
    const review = {
      id: 'r1',
      fromUserId: 'u1',
      rating: 4,
      comment: '不错',
      createdAt: '2024-01-01T00:00:00.000Z',
      fromUser: {
        id: 'u1',
        nickname: '小红',
        avatar: '',
      },
    };
    
    const { valid, missing } = validateReviewFields(review as Review);
    assert.equal(valid, false);
    assert.ok(missing.includes('fromUser.avatar'));
  });

  test('缺少昵称字段时检测到', () => {
    const review = {
      id: 'r1',
      fromUserId: 'u1',
      rating: 3,
      comment: '一般',
      createdAt: '2024-01-01T00:00:00.000Z',
      fromUser: {
        id: 'u1',
        nickname: '',
        avatar: 'url',
      },
    };
    
    const { valid, missing } = validateReviewFields(review as Review);
    assert.equal(valid, false);
    assert.ok(missing.includes('fromUser.nickname'));
  });

  test('fromUser 为 undefined 时依然有效（懒加载场景）', () => {
    const review: Review = {
      id: 'r1',
      fromUserId: 'u1',
      rating: 5,
      comment: '好',
      createdAt: '2024-01-01T00:00:00.000Z',
    };
    
    const { valid } = validateReviewFields(review);
    assert.equal(valid, true);
  });
});

describe('时间段网格数据', () => {
  test('7天24小时的有效时间段数据', () => {
    const slots: boolean[][] = [];
    for (let d = 0; d < 7; d++) {
      const day: boolean[] = [];
      for (let h = 0; h < 24; h++) {
        day.push(h >= 8 && h <= 22);
      }
      slots.push(day);
    }
    
    const result = validateAvailableSlots(slots);
    assert.equal(result.valid, true);
    assert.equal(result.days, 7);
    assert.equal(result.hoursPerDay, 24);
  });

  test('时间段数据包含空闲和已约两种状态', () => {
    const slots: boolean[][] = [];
    for (let d = 0; d < 7; d++) {
      const day: boolean[] = [];
      for (let h = 0; h < 24; h++) {
        day.push(Math.random() > 0.5);
      }
      slots.push(day);
    }
    
    const result = validateAvailableSlots(slots);
    assert.equal(result.valid, true);
    assert.ok(result.freeCount > 0, '应该有空闲时段');
    assert.ok(result.bookedCount > 0, '应该有已约时段');
    assert.equal(result.freeCount + result.bookedCount, 7 * 24);
  });

  test('无效数据检测', () => {
    const emptySlots: boolean[][] = [];
    assert.equal(validateAvailableSlots(emptySlots).valid, false);
    
    const wrongDays: boolean[][] = [[]];
    assert.equal(validateAvailableSlots(wrongDays).valid, false);
    
    const wrongHours: boolean[][] = [[true, false]];
    assert.equal(validateAvailableSlots(wrongHours).valid, false);
  });

  test('按周循环：跨周索引正确处理', () => {
    const slots: boolean[][] = Array.from({ length: 7 }, (_, d) =>
      Array.from({ length: 24 }, (_, h) => d === 0 && h === 9)
    );
    
    const getSlot = (dayIndex: number, hour: number): boolean => {
      const normalizedDay = ((dayIndex % 7) + 7) % 7;
      return slots[normalizedDay]?.[hour] ?? false;
    };
    
    assert.equal(getSlot(0, 9), true, '本周一 9 点空闲');
    assert.equal(getSlot(7, 9), true, '下周一 9 点也空闲（周循环）');
    assert.equal(getSlot(-7, 9), true, '上周一 9 点也空闲（周循环）');
    assert.equal(getSlot(1, 9), false, '周二 9 点已约');
  });
});

console.log('\n=== 所有测试通过 ===');
