import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from '../types';
import { fetchWithRetry, API_BASE_PATH } from '../utils/api';
import { cache } from '../utils/cache';
import { isExpired } from '../utils/helpers';

/**
 * useAlerts返回类型定义
 */
interface UseAlertsResult {
  alerts: Alert[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * 缓存键名
 */
const CACHE_KEY = 'alerts_data';

/**
 * 缓存时间：10分钟（毫秒）
 */
const CACHE_TTL = 10 * 60 * 1000;

/**
 * 轮询间隔：30秒（毫秒）
 */
const POLL_INTERVAL = 30 * 1000;

/**
 * 骨架屏显示超时：5秒（毫秒）
 */
const SKELETON_TIMEOUT = 5 * 1000;

/**
 * 预警数据Hook
 * 功能：
 * - 获取alerts数组、loading状态、error对象、refetch函数
 * - 轮询：每30秒自动刷新
 * - 缓存：同一会话缓存10分钟，refetch清除缓存
 * - 请求取消：使用AbortController
 * - 自动重试：失败后最多重试3次，间隔指数递增（1s, 2s, 4s）
 * - 5秒超时显示骨架屏
 * - 过滤已过期的预警（endTime < now）
 */
export function useAlerts(): UseAlertsResult {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(true);

  const abortControllerRef = useRef<AbortController | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skeletonTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef<boolean>(false);

  /**
   * 获取预警数据
   * @param forceRefetch 是否强制刷新（忽略缓存）
   */
  const fetchAlerts = useCallback(async (forceRefetch: boolean = false) => {
    if (!forceRefetch) {
      const cachedData = cache.get<Alert[]>(CACHE_KEY);
      if (cachedData) {
        const validAlerts = cachedData.filter((alert) => !isExpired(alert.endTime));
        setAlerts(validAlerts);
        setLoading(false);
        setShowSkeleton(false);
        return;
      }
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    setLoading(true);

    if (skeletonTimeoutRef.current) {
      clearTimeout(skeletonTimeoutRef.current);
    }
    skeletonTimeoutRef.current = setTimeout(() => {
      if (isMountedRef.current) {
        setShowSkeleton(true);
      }
    }, SKELETON_TIMEOUT);

    try {
      const data = await fetchWithRetry<Alert[]>(`${API_BASE_PATH}/alerts`, {
        signal: abortControllerRef.current.signal,
        maxRetries: 3,
        initialDelayMs: 1000,
      });

      if (isMountedRef.current) {
        cache.set(CACHE_KEY, data, CACHE_TTL);
        const validAlerts = data.filter((alert) => !isExpired(alert.endTime));
        setAlerts(validAlerts);
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
        setShowSkeleton(false);
      }
      if (skeletonTimeoutRef.current) {
        clearTimeout(skeletonTimeoutRef.current);
        skeletonTimeoutRef.current = null;
      }
    }
  }, []);

  /**
   * 强制刷新数据
   * 清除缓存并重新获取
   */
  const refetch = useCallback(() => {
    cache.delete(CACHE_KEY);
    fetchAlerts(true);
  }, [fetchAlerts]);

  /**
   * 组件挂载时初始化
   */
  useEffect(() => {
    isMountedRef.current = true;
    fetchAlerts();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchAlerts]);

  /**
   * 轮询机制：每30秒刷新一次
   */
  useEffect(() => {
    const startPolling = () => {
      pollTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) {
          fetchAlerts();
          startPolling();
        }
      }, POLL_INTERVAL);
    };

    startPolling();

    return () => {
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
    };
  }, [fetchAlerts]);

  /**
   * 组件卸载时清理
   */
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      if (pollTimeoutRef.current) {
        clearTimeout(pollTimeoutRef.current);
        pollTimeoutRef.current = null;
      }
      if (skeletonTimeoutRef.current) {
        clearTimeout(skeletonTimeoutRef.current);
        skeletonTimeoutRef.current = null;
      }
    };
  }, []);

  return {
    alerts,
    loading: loading || showSkeleton,
    error,
    refetch,
  };
}
