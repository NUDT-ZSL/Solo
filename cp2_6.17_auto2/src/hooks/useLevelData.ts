import { useState, useEffect, useCallback, useRef } from 'react';
import type { LevelData } from '../types';

interface UseLevelDataReturn {
  level: LevelData | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<LevelData | null>;
}

export function useLevelData(levelId: string | null): UseLevelDataReturn {
  const [level, setLevel] = useState<LevelData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const fetchLevel = useCallback(async (): Promise<LevelData | null> => {
    if (!levelId) {
      setLevel(null);
      return null;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/levels/${levelId}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: abortControllerRef.current.signal,
        credentials: 'omit',
        cache: 'no-store'
      });

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error(`关卡 ${levelId} 不存在`);
        }
        throw new Error(`服务器错误: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('application/json')) {
        console.warn('[useLevelData] 响应不是JSON格式，使用fallback数据');
        return getFallbackLevel(levelId);
      }

      const data = await response.json();

      if (!data || !data.id || !data.tiles) {
        throw new Error('返回的关卡数据格式无效');
      }

      setLevel(data);
      console.log(`[useLevelData] 关卡 ${levelId} 加载成功`);
      return data;

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log('[useLevelData] 请求被取消');
        return null;
      }

      const errorMessage = err instanceof Error ? err.message : '加载关卡数据失败';
      console.error('[useLevelData] 加载失败:', errorMessage);
      setError(errorMessage);

      const fallback = getFallbackLevel(levelId);
      if (fallback) {
        console.log('[useLevelData] 使用fallback数据');
        setLevel(fallback);
        setError(null);
        return fallback;
      }

      return null;

    } finally {
      setLoading(false);
    }
  }, [levelId]);

  useEffect(() => {
    fetchLevel();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
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
  refetch: () => Promise<void>;
}

export function useLevelList(): UseLevelListReturn {
  const [levels, setLevels] = useState<LevelListItem[]>([]);
  const [totalLevels, setTotalLevels] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLevels = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch('/api/levels', {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        signal: controller.signal,
        cache: 'no-store'
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`服务器错误: ${response.status}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && !contentType.includes('application/json')) {
        throw new Error('响应不是JSON格式');
      }

      const data = await response.json();
      setLevels(data.levels || []);
      setTotalLevels(data.totalLevels || 0);

    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('请求超时，请检查网络连接');
      } else {
        const message = err instanceof Error ? err.message : '获取关卡列表失败';
        setError(message);
        console.warn('[useLevelList] API调用失败，使用默认列表:', message);
      }

      const fallback: LevelListItem[] = [
        { id: '1', name: '暗夜街巷', enemiesCount: 4, itemsCount: 3 },
        { id: '2', name: '仓库禁区', enemiesCount: 6, itemsCount: 3 },
        { id: '3', name: '豪宅之夜', enemiesCount: 8, itemsCount: 3 }
      ];
      setLevels(fallback);
      setTotalLevels(fallback.length);

    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLevels();
  }, [fetchLevels]);

  return { levels, totalLevels, loading, error, refetch: fetchLevels };
}

function getFallbackLevel(levelId: string): LevelData | null {
  const cols = 24;
  const rows = 16;
  const tileSize = 40;

  const generateTiles = (seed: number): number[][] => {
    const tiles: number[][] = [];
    for (let y = 0; y < rows; y++) {
      tiles[y] = [];
      for (let x = 0; x < cols; x++) {
        const s = (x * 7 + y * 13 + seed * 17) % 23;
        if (x === 0 || y === 0 || x === cols - 1 || y === rows - 1) {
          tiles[y][x] = 1;
        } else if (s < 4) {
          tiles[y][x] = 1;
        } else if (s >= 20) {
          tiles[y][x] = 3;
        } else if (s >= 18) {
          tiles[y][x] = 2;
        } else {
          tiles[y][x] = 0;
        }
      }
    }
    return tiles;
  };

  const levelConfigs: Record<string, Omit<LevelData, 'tiles' | 'width' | 'height' | 'tileSize'>> = {
    '1': {
      id: '1',
      name: '暗夜街巷',
      enemies: [
        {
          id: 'guard1',
          type: 'patrol',
          x: 360,
          y: 300,
          pathPoints: [
            { x: 360, y: 300 },
            { x: 360, y: 480 },
            { x: 560, y: 480 },
            { x: 560, y: 300 }
          ],
          visionAngle: 0
        },
        {
          id: 'light1',
          type: 'searchlight',
          x: 120,
          y: 80,
          pathPoints: [],
          visionAngle: Math.PI / 4,
          rotationSpeed: 0.02
        },
        {
          id: 'dog1',
          type: 'dog',
          x: 700,
          y: 200,
          pathPoints: [
            { x: 700, y: 200 },
            { x: 860, y: 200 },
            { x: 860, y: 360 },
            { x: 700, y: 360 }
          ]
        }
      ],
      targetItems: [
        { id: 'item1', x: 200, y: 160, name: '机密文件', stealTime: 1500, stolen: false },
        { id: 'item2', x: 800, y: 280, name: '钻石项链', stealTime: 1500, stolen: false },
        { id: 'item3', x: 440, y: 540, name: '加密硬盘', stealTime: 1500, stolen: false }
      ],
      playerSpawn: { x: 80, y: 560 },
      exitPoint: { x: 900, y: 560 }
    },
    '2': {
      id: '2',
      name: '仓库禁区',
      enemies: [
        {
          id: 'guard1',
          type: 'patrol',
          x: 280,
          y: 280,
          pathPoints: [
            { x: 280, y: 280 },
            { x: 280, y: 520 },
            { x: 640, y: 520 },
            { x: 640, y: 280 }
          ]
        },
        {
          id: 'guard2',
          type: 'patrol',
          x: 720,
          y: 160,
          pathPoints: [
            { x: 720, y: 160 },
            { x: 880, y: 160 },
            { x: 880, y: 400 },
            { x: 720, y: 400 }
          ]
        },
        {
          id: 'light1',
          type: 'searchlight',
          x: 80,
          y: 40,
          pathPoints: [],
          visionAngle: Math.PI / 3,
          rotationSpeed: 0.025
        },
        {
          id: 'dog1',
          type: 'dog',
          x: 320,
          y: 440,
          pathPoints: [
            { x: 320, y: 440 },
            { x: 480, y: 440 }
          ]
        }
      ],
      targetItems: [
        { id: 'item1', x: 160, y: 320, name: '保险箱钥匙', stealTime: 1500, stolen: false },
        { id: 'item2', x: 800, y: 520, name: '货物清单', stealTime: 1500, stolen: false },
        { id: 'item3', x: 440, y: 240, name: '商业机密U盘', stealTime: 1500, stolen: false }
      ],
      playerSpawn: { x: 60, y: 600 },
      exitPoint: { x: 900, y: 80 }
    },
    '3': {
      id: '3',
      name: '豪宅之夜',
      enemies: [
        {
          id: 'guard1',
          type: 'patrol',
          x: 400,
          y: 360,
          pathPoints: [
            { x: 400, y: 360 },
            { x: 760, y: 360 }
          ]
        },
        {
          id: 'guard2',
          type: 'patrol',
          x: 240,
          y: 480,
          pathPoints: [
            { x: 240, y: 480 },
            { x: 680, y: 560 }
          ]
        },
        {
          id: 'light1',
          type: 'searchlight',
          x: 80,
          y: 40,
          pathPoints: [],
          visionAngle: Math.PI / 4,
          rotationSpeed: 0.022
        },
        {
          id: 'light2',
          type: 'searchlight',
          x: 880,
          y: 40,
          pathPoints: [],
          visionAngle: Math.PI - Math.PI / 4,
          rotationSpeed: -0.025
        },
        {
          id: 'dog1',
          type: 'dog',
          x: 200,
          y: 280,
          pathPoints: [
            { x: 200, y: 280 },
            { x: 320, y: 280 }
          ]
        },
        {
          id: 'dog2',
          type: 'dog',
          x: 840,
          y: 480,
          pathPoints: [
            { x: 840, y: 480 },
            { x: 720, y: 560 }
          ]
        }
      ],
      targetItems: [
        { id: 'item1', x: 200, y: 120, name: '主人的怀表', stealTime: 1500, stolen: false },
        { id: 'item2', x: 840, y: 120, name: '名画仿品', stealTime: 1500, stolen: false },
        { id: 'item3', x: 480, y: 520, name: '保险柜密码', stealTime: 1500, stolen: false }
      ],
      playerSpawn: { x: 60, y: 580 },
      exitPoint: { x: 900, y: 580 }
    }
  };

  const config = levelConfigs[levelId];
  if (!config) return null;

  return {
    ...config,
    width: cols * tileSize,
    height: rows * tileSize,
    tileSize,
    tiles: generateTiles(parseInt(levelId))
  };
}
