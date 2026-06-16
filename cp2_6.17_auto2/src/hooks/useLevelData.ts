import { useState, useEffect, useCallback } from 'react';
import type { LevelData } from '../types';

interface UseLevelDataReturn {
  level: LevelData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useLevelData(levelId: string | null): UseLevelDataReturn {
  const [level, setLevel] = useState<LevelData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchLevel = useCallback(async () => {
    if (!levelId) {
      setLevel(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(`/api/levels/${levelId}`, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`关卡 ${levelId} 不存在`);
        }
        throw new Error(`服务器错误: ${response.status}`);
      }

      const data = await response.json();
      setLevel(data);
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('请求超时，请检查后端服务器是否运行');
      } else {
        setError(err instanceof Error ? err.message : '加载关卡数据失败');
        console.warn('API加载失败，将使用内置fallback数据');
      }
    } finally {
      setLoading(false);
    }
  }, [levelId]);

  useEffect(() => {
    fetchLevel();
  }, [fetchLevel]);

  return { level, loading, error, refetch: fetchLevel };
}

interface LevelListItem {
  id: string;
  name: string;
  enemiesCount: number;
  itemsCount: number;
}

interface UseLevelListReturn {
  levels: LevelListItem[];
  totalLevels: number;
  loading: boolean;
  error: string | null;
}

export function useLevelList(): UseLevelListReturn {
  const [levels, setLevels] = useState<LevelListItem[]>([]);
  const [totalLevels, setTotalLevels] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const fetchLevels = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);

        const response = await fetch('/api/levels', {
          signal: controller.signal,
          headers: { 'Accept': 'application/json' }
        });

        clearTimeout(timeoutId);

        if (!response.ok) throw new Error('获取关卡列表失败');
        const data = await response.json();

        if (isMounted) {
          setLevels(data.levels || []);
          setTotalLevels(data.totalLevels || 0);
        }
      } catch (err) {
        if (isMounted) {
          const fallback = [
            { id: '1', name: '暗夜街巷', enemiesCount: 4, itemsCount: 3 },
            { id: '2', name: '仓库禁区', enemiesCount: 6, itemsCount: 3 },
            { id: '3', name: '豪宅之夜', enemiesCount: 8, itemsCount: 3 }
          ];
          setLevels(fallback);
          setTotalLevels(fallback.length);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchLevels();

    return () => {
      isMounted = false;
    };
  }, []);

  return { levels, totalLevels, loading, error };
}
