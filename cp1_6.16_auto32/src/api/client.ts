import type { Species } from '../ecosystem/types';

const API_BASE = 'http://localhost:3001/api';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export async function fetchInitialSpecies(): Promise<Species[]> {
  try {
    const response = await fetch(`${API_BASE}/species`);
    const result: ApiResponse<Species[]> = await response.json();
    if (result.success) {
      return result.data;
    }
    throw new Error(result.message || '获取物种数据失败');
  } catch (error) {
    console.warn('无法连接到服务器，使用本地模拟数据:', error);
    return generateLocalSpecies();
  }
}

export async function fetchEnvironmentBaseline() {
  try {
    const response = await fetch(`${API_BASE}/environment/baseline`);
    const result = await response.json();
    if (result.success) {
      return result.data;
    }
    throw new Error(result.message || '获取环境数据失败');
  } catch (error) {
    console.warn('无法连接到服务器，使用本地环境数据:', error);
    return getLocalEnvironmentData();
  }
}

export async function logOperation(
  action: string,
  params: Record<string, unknown>
) {
  try {
    const response = await fetch(`${API_BASE}/operations/log`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action, params }),
    });
    const result = await response.json();
    return result;
  } catch (error) {
    console.warn('无法记录操作日志到服务器，本地记录:', error);
    const localLog = {
      id: `local-${Date.now()}`,
      action,
      timestamp: Date.now(),
      params,
    };
    const logs = getLocalLogs();
    logs.unshift(localLog);
    localStorage.setItem('operationLogs', JSON.stringify(logs.slice(0, 100)));
    return { success: true, data: localLog };
  }
}

export async function fetchOperationLogs(limit = 50, offset = 0) {
  try {
    const response = await fetch(
      `${API_BASE}/operations/logs?limit=${limit}&offset=${offset}`
    );
    const result = await response.json();
    if (result.success) {
      return result;
    }
    throw new Error(result.message || '获取日志失败');
  } catch (error) {
    console.warn('无法从服务器获取日志，使用本地日志:', error);
    const logs = getLocalLogs();
    return {
      success: true,
      data: logs.slice(offset, offset + limit),
      total: logs.length,
      hasMore: offset + limit < logs.length,
    };
  }
}

function getLocalLogs() {
  try {
    const stored = localStorage.getItem('operationLogs');
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

function generateLocalSpecies(): Species[] {
  const coralTypes = [
    { name: '鹿角珊瑚', coralType: 'branching' as const, color: '#FF6B6B' },
    { name: '轴孔珊瑚', coralType: 'branching' as const, color: '#FF8787' },
    { name: '手指珊瑚', coralType: 'branching' as const, color: '#FFA8A8' },
    { name: '脑纹珊瑚', coralType: 'brain' as const, color: '#58D68D' },
    { name: '迷宫珊瑚', coralType: 'brain' as const, color: '#69DB9C' },
    { name: '玫瑰珊瑚', coralType: 'brain' as const, color: '#7AE0AB' },
    { name: '莴苣珊瑚', coralType: 'leaf' as const, color: '#F4D03F' },
    { name: '卷心菜珊瑚', coralType: 'leaf' as const, color: '#F7DC6F' },
    { name: '叶片珊瑚', coralType: 'leaf' as const, color: '#F9E79F' },
    { name: '海葵', coralType: 'brain' as const, color: '#AF7AC5' },
  ];

  const fishTypes = [
    { name: '小丑鱼', predator: false, diet: ['浮游生物'] },
    { name: '蓝唐王鱼', predator: false, diet: ['藻类'] },
    { name: '蝴蝶鱼', predator: false, diet: ['珊瑚虫'] },
    { name: '神仙鱼', predator: false, diet: ['浮游生物', '藻类'] },
    { name: '石斑鱼', predator: true, diet: ['小鱼'] },
  ];

  const plantTypes = [
    { name: '巨藻', plantType: 'kelp' as const },
    { name: '马尾藻', plantType: 'seaweed' as const },
    { name: '海草', plantType: 'seagrass' as const },
  ];

  const species: Species[] = [];

  for (let i = 0; i < 30; i++) {
    const s = coralTypes[i % coralTypes.length];
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 12;
    species.push({
      id: `coral-${i}`,
      name: s.name,
      speciesType: 'coral',
      coralType: s.coralType,
      position: {
        x: Math.cos(angle) * r,
        y: Math.random() * 0.5,
        z: Math.sin(angle) * r,
      },
      color: s.color,
      size: 0.8 + Math.random() * 1.2,
      coverage: 0.3 + Math.random() * 0.3,
      health: 80 + Math.random() * 20,
      age: Math.random() * 100,
      growthRate: 0.01,
      symbionts: [],
    });
  }

  fishTypes.forEach((fishType, si) => {
    const count = 10 + Math.floor(Math.random() * 6);
    const schoolId = `school-${si}`;
    const cx = (Math.random() - 0.5) * 10;
    const cy = 3 + Math.random() * 3;
    const cz = (Math.random() - 0.5) * 10;

    for (let i = 0; i < count; i++) {
      species.push({
        id: `fish-${si}-${i}`,
        name: fishType.name,
        speciesType: 'fish',
        schoolId,
        position: {
          x: cx + (Math.random() - 0.5) * 4,
          y: cy + (Math.random() - 0.5) * 2,
          z: cz + (Math.random() - 0.5) * 4,
        },
        size: 0.3 + Math.random() * 0.5,
        speed: 1 + Math.random(),
        direction: { x: 0, y: 0, z: 1 },
        health: 90 + Math.random() * 10,
        age: Math.random() * 50,
        growthRate: 0.02,
        predator: fishType.predator,
        diet: fishType.diet,
      });
    }
  });

  for (let i = 0; i < 15; i++) {
    const p = plantTypes[i % plantTypes.length];
    const angle = Math.random() * Math.PI * 2;
    const r = Math.sqrt(Math.random()) * 14;
    species.push({
      id: `plant-${i}`,
      name: p.name,
      speciesType: 'plant',
      plantType: p.plantType,
      position: {
        x: Math.cos(angle) * r,
        y: Math.random() * 0.2,
        z: Math.sin(angle) * r,
      },
      height: 1 + Math.random() * 2,
      health: 85 + Math.random() * 15,
      age: Math.random() * 80,
      growthRate: 0.008,
    });
  }

  return species;
}

function getLocalEnvironmentData() {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  return {
    temperature: {
      current: 26,
      range: [22, 30],
      curve: hours.map((h) => 24 + 2 * Math.sin((h - 6) * Math.PI / 12)),
      unit: '°C',
    },
    nutrients: {
      current: 50,
      range: [0, 100],
      curve: hours.map((h) => 50 + 10 * Math.sin((h - 12) * Math.PI / 12)),
      unit: 'mg/L',
    },
    current: {
      pattern: {
        dailyTide: hours.map((h) => 0.5 + 0.3 * Math.sin(h * Math.PI / 6)),
        seasonalTrend: 0.8,
        stormEvents: [],
      },
      direction: '顺时针环流',
      baseSpeed: 0.5,
      unit: 'm/s',
    },
    light: {
      sunrise: 6,
      sunset: 18,
      maxIntensity: 1.0,
      dailyCycle: hours.map((h) => {
        if (h < 6 || h > 18) return 0.1;
        return Math.sin(((h - 6) / 12) * Math.PI);
      }),
    },
  };
}
