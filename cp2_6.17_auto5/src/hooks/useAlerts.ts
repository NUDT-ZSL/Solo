import { useState, useEffect, useCallback, useRef } from 'react';
import { Alert } from '../types';
import { fetchWithRetry, API_BASE_PATH } from '../utils/api';
import { cache } from '../utils/cache';
import { isExpired } from '../utils/helpers';

interface UseAlertsResult {
  alerts: Alert[];
  loading: boolean;
  error: Error | null;
  showSkeleton: boolean;
  refetch: () => void;
}

const CACHE_KEY = 'alerts_data';
const CACHE_TTL = 10 * 60 * 1000;
const POLL_INTERVAL = 30 * 1000;
const SKELETON_TIMEOUT = 5 * 1000;

export function useAlerts(): UseAlertsResult {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [showSkeleton, setShowSkeleton] = useState<boolean>(true);

  const abortControllerRef = useRef<AbortController | null>(null);
  const pollTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const skeletonTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMountedRef = useRef<boolean>(false);

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

  const refetch = useCallback(() => {
    cache.delete(CACHE_KEY);
    fetchAlerts(true);
  }, [fetchAlerts]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchAlerts();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchAlerts]);

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
    loading,
    error,
    showSkeleton,
    refetch,
  };
}
