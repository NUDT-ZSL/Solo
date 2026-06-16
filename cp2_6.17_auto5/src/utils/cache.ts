/**
 * 缓存条目类型
 */
interface CacheEntry<T> {
  value: T;
  expiry: number;
}

/**
 * 简单内存缓存，支持TTL（生存时间）
 */
class MemoryCache {
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  /**
   * 设置缓存
   * @param key 缓存键
   * @param value 缓存值
   * @param ttlMs 生存时间（毫秒）
   */
  set<T>(key: string, value: T, ttlMs: number): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlMs,
    });
  }

  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存值或undefined（如果已过期或不存在）
   */
  get<T>(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    if (Date.now() > entry.expiry) {
      this.cache.delete(key);
      return undefined;
    }

    return entry.value as T;
  }

  /**
   * 删除指定缓存
   * @param key 缓存键
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清空所有缓存
   */
  clear(): void {
    this.cache.clear();
  }
}

export const cache = new MemoryCache();
