import { useState, useEffect, useCallback, useRef } from 'react';
import { Report, Bounds } from '../types';
import { fetchWithRetry, API_BASE_PATH } from '../utils/api';
import { cache } from '../utils/cache';
import { isWithin24Hours } from '../utils/helpers';

/**
 * useReports返回类型定义
 */
interface UseReportsResult {
  reports: Report[];
  loading: boolean;
  error: Error | null;
  addReport: (report: Omit<Report, 'id' | 'createdAt'>) => Promise<Report>;
  refetch: () => void;
}

/**
 * 缓存键前缀
 */
const CACHE_KEY_PREFIX = 'reports_data';

/**
 * 缓存时间：10分钟（毫秒）
 */
const CACHE_TTL = 10 * 60 * 1000;

/**
 * 生成缓存键
 * @param bounds 地图边界
 * @returns 缓存键
 */
function getCacheKey(bounds: Bounds | null): string {
  if (!bounds) {
    return `${CACHE_KEY_PREFIX}_all`;
  }
  return `${CACHE_KEY_PREFIX}_${bounds.west}_${bounds.south}_${bounds.east}_${bounds.north}`;
}

/**
 * 上报数据Hook
 * 功能：
 * - 获取reports数组、loading、error、addReport、refetch
 * - 视口请求：根据bounds参数请求当前视口内数据
 * - 缓存：10分钟
 * - 请求取消：AbortController
 * - 自动重试：最多3次，指数退避
 * - 只展示最近24小时的记录
 * - addReport：POST提交新上报，成功后刷新数据
 * @param bounds 地图视口边界
 */
export function useReports(bounds?: Bounds | null): UseReportsResult {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(false);
  const boundsRef = useRef<Bounds | null>(bounds ?? null);

  boundsRef.current = bounds ?? null;

  /**
   * 获取上报数据
   * @param forceRefetch 是否强制刷新（忽略缓存）
   */
  const fetchReports = useCallback(async (forceRefetch: boolean = false) => {
    const currentBounds = boundsRef.current;
    const cacheKey = getCacheKey(currentBounds);

    if (!forceRefetch) {
      const cachedData = cache.get<Report[]>(cacheKey);
      if (cachedData) {
        const recentReports = cachedData.filter((report) =>
          isWithin24Hours(report.createdAt)
        );
        setReports(recentReports);
        setLoading(false);
        return;
      }
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);

    try {
      const url = currentBounds
        ? `${API_BASE_PATH}/reports?west=${currentBounds.west}&south=${currentBounds.south}&east=${currentBounds.east}&north=${currentBounds.north}`
        : `${API_BASE_PATH}/reports`;

      const data = await fetchWithRetry<Report[]>(url, {
        signal: abortControllerRef.current.signal,
        maxRetries: 3,
        initialDelayMs: 1000,
      });

      if (isMountedRef.current) {
        cache.set(cacheKey, data, CACHE_TTL);
        const recentReports = data.filter((report) =>
          isWithin24Hours(report.createdAt)
        );
        setReports(recentReports);
        setError(null);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return;
      }
      if (isMountedRef.current) {
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, []);

  /**
   * 添加新上报
   * @param report 上报数据（不含id和createdAt）
   * @returns 创建成功的上报数据
   */
  const addReport = useCallback(
    async (report: Omit<Report, 'id' | 'createdAt'>): Promise<Report> => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        const newReport = await fetchWithRetry<Report>(`${API_BASE_PATH}/reports`, {
          method: 'POST',
          body: JSON.stringify(report),
          signal: abortControllerRef.current.signal,
          maxRetries: 0,
        });

        cache.delete(getCacheKey(boundsRef.current));
        cache.delete(getCacheKey(null));

        await fetchReports(true);

        return newReport;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          throw err;
        }
        throw err instanceof Error ? err : new Error(String(err));
      }
    },
    [fetchReports]
  );

  /**
   * 强制刷新数据
   * 清除缓存并重新获取
   */
  const refetch = useCallback(() => {
    cache.delete(getCacheKey(boundsRef.current));
    cache.delete(getCacheKey(null));
    fetchReports(true);
  }, [fetchReports]);

  /**
   * 组件挂载时初始化
   */
  useEffect(() => {
    isMountedRef.current = true;
    fetchReports();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchReports]);

  /**
   * 当bounds变化时重新获取数据
   */
  useEffect(() => {
    if (isMountedRef.current) {
      fetchReports();
    }
  }, [bounds, fetchReports]);

  /**
   * 组件卸载时清理
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
    };
  }, []);

  return {
    reports,
    loading,
    error,
    addReport,
    refetch,
  };
}
