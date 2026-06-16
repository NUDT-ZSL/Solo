import { useState, useEffect, useCallback, useRef } from 'react';
import { Report, Bounds } from '../types';
import { fetchWithRetry, uploadWithProgress, API_BASE_PATH } from '../utils/api';
import { cache } from '../utils/cache';
import { isWithin24Hours } from '../utils/helpers';

interface UseReportsResult {
  reports: Report[];
  loading: boolean;
  error: Error | null;
  addReport: (report: Omit<Report, 'id' | 'timestamp'>) => Promise<Report>;
  addReportWithProgress: (
    report: Omit<Report, 'id' | 'timestamp'>,
    onProgress: (percent: number) => void
  ) => Promise<Report>;
  refetch: () => void;
}

const CACHE_KEY_PREFIX = 'reports_data';
const CACHE_TTL = 10 * 60 * 1000;

function getCacheKey(bounds: Bounds | null | undefined): string {
  if (!bounds) {
    return `${CACHE_KEY_PREFIX}_all`;
  }
  return `${CACHE_KEY_PREFIX}_${bounds.west}_${bounds.south}_${bounds.east}_${bounds.north}`;
}

export function useReports(bounds?: Bounds | null): UseReportsResult {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isMountedRef = useRef<boolean>(false);
  const boundsRef = useRef<Bounds | null | undefined>(bounds);

  boundsRef.current = bounds;

  const fetchReports = useCallback(async (forceRefetch: boolean = false) => {
    const currentBounds = boundsRef.current;
    const cacheKey = getCacheKey(currentBounds);

    if (!forceRefetch) {
      const cachedData = cache.get<Report[]>(cacheKey);
      if (cachedData) {
        const recentReports = cachedData.filter((report) =>
          isWithin24Hours(report.timestamp)
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
          isWithin24Hours(report.timestamp)
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

  const addReport = useCallback(
    async (report: Omit<Report, 'id' | 'timestamp'>): Promise<Report> => {
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

  const addReportWithProgress = useCallback(
    async (
      report: Omit<Report, 'id' | 'timestamp'>,
      onProgress: (percent: number) => void
    ): Promise<Report> => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        const newReport = await uploadWithProgress<Report>(
          `${API_BASE_PATH}/reports`,
          report,
          {
            signal: abortControllerRef.current.signal,
            onProgress,
            maxRetries: 0,
          }
        );

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

  const refetch = useCallback(() => {
    cache.delete(getCacheKey(boundsRef.current));
    cache.delete(getCacheKey(null));
    fetchReports(true);
  }, [fetchReports]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchReports();

    return () => {
      isMountedRef.current = false;
    };
  }, [fetchReports]);

  useEffect(() => {
    if (isMountedRef.current) {
      fetchReports();
    }
  }, [bounds, fetchReports]);

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
    addReportWithProgress,
    refetch,
  };
}

export function useAddReport() {
  const { addReport, addReportWithProgress, loading, error } = useReports();

  return {
    addReport,
    addReportWithProgress,
    loading,
    error,
  };
}
