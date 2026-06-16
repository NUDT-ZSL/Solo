import { useEffect, useState } from 'react';
import { Stall } from '../types';

export const useMarketData = () => {
  const [stalls, setStalls] = useState<Stall[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const res = await fetch('/api/market');
        if (!res.ok) {
          throw new Error('获取集市数据失败');
        }
        const data = await res.json();
        setStalls(data.stalls || []);
      } catch (err) {
        setError(err instanceof Error ? err.message : '未知错误');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return { stalls, loading, error };
};
