import { useState, useEffect, useCallback, useRef } from 'react';
import { ServerData, MAX_HISTORY_LENGTH } from '../types';
import { generateInitialData, generateUpdatedData } from '../mockData';

export function useServerData(intervalMs: number = 1000) {
  const [servers, setServers] = useState<ServerData[]>(() => generateInitialData());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const rafRef = useRef<number>(0);
  const pendingDataRef = useRef<ServerData[] | null>(null);

  const updateData = useCallback(() => {
    setServers((prev) => {
      const updated = generateUpdatedData(prev);
      return updated;
    });
  }, []);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        updateData();
      });
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      cancelAnimationFrame(rafRef.current);
    };
  }, [intervalMs, updateData]);

  return servers;
}
