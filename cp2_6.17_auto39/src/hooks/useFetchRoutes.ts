import { useEffect, useState } from 'react';
import axios from 'axios';
import type { ShippingRoute, EmissionAggregate } from '../types';
import { useGlobalStore } from '../store/useGlobalStore';

export function useFetchRoutes() {
  const setRoutes = useGlobalStore(s => s.setRoutes);
  const setRoutesLoading = useGlobalStore(s => s.setRoutesLoading);
  const setRoutesError = useGlobalStore(s => s.setRoutesError);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setRoutesLoading(true);
      try {
        const res = await axios.get<{ success: boolean; data: ShippingRoute[]; timestamp: string }>(
          '/api/routes'
        );
        if (!cancelled && res.data.success) {
          setRoutes(res.data.data, res.data.timestamp);
        }
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : '加载航线数据失败';
          setRoutesError(msg);
        }
      } finally {
        if (!cancelled) setRoutesLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [setRoutes, setRoutesLoading, setRoutesError]);
}

export function useFetchEmissions(year: number) {
  const [data, setData] = useState<EmissionAggregate | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const res = await axios.get<{ success: boolean; data: EmissionAggregate }>(
          `/api/emissions?year=${year}`
        );
        if (!cancelled && res.data.success) {
          setData(res.data.data);
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [year]);

  return { data, loading };
}
