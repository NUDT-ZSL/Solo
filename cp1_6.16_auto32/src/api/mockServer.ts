import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import type { Coral, Fish, Plant, Species, Position } from '../ecosystem/types';

const app = express();
const PORT = 3001;

app.use(express.json());

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

const coralSpeciesData = [
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

const fishSpeciesData = [
  { name: '小丑鱼', predator: false, diet: ['浮游生物'], color: '#FF6B35' },
  { name: '蓝唐王鱼', predator: false, diet: ['藻类'], color: '#4A90D9' },
  { name: '蝴蝶鱼', predator: false, diet: ['珊瑚虫'], color: '#FFD93D' },
  { name: '神仙鱼', predator: false, diet: ['浮游生物', '藻类'], color: '#9B59B6' },
  { name: '石斑鱼', predator: true, diet: ['小鱼'], color: '#34495E' },
];

const plantSpeciesData = [
  { name: '巨藻', plantType: 'kelp' as const },
  { name: '马尾藻', plantType: 'seaweed' as const },
  { name: '海草', plantType: 'seagrass' as const },
];

const operationLogs: Array<{
  id: string;
  action: string;
  timestamp: number;
  params: Record<string, unknown>;
}> = [];

function randomPosition(radius: number, minY: number = 0, maxY: number = 1): Position {
  const angle = Math.random() * Math.PI * 2;
  const r = Math.sqrt(Math.random()) * radius;
  return {
    x: Math.cos(angle) * r,
    y: minY + Math.random() * (maxY - minY),
    z: Math.sin(angle) * r,
  };
}

function generateCorals(): Coral[] {
  const corals: Coral[] = [];
  for (let i = 0; i < 30; i++) {
    const species = coralSpeciesData[i % coralSpeciesData.length];
    const pos = randomPosition(12, 0, 0.5);
    corals.push({
      id: uuidv4(),
      name: species.name,
      speciesType: 'coral',
      coralType: species.coralType,
      position: pos,
      color: species.color,
      size: 0.8 + Math.random() * 1.2,
      coverage: 0.3 + Math.random() * 0.3,
      health: 80 + Math.random() * 20,
      age: Math.random() * 100,
      growthRate: 0.01,
      symbionts: [],
    });
  }
  return corals;
}

function generateFish(): Fish[] {
  const fishes: Fish[] = [];
  fishSpeciesData.forEach((species, speciesIndex) => {
    const count = 10 + Math.floor(Math.random() * 6);
    const schoolId = `school-${speciesIndex}`;
    const centerX = (Math.random() - 0.5) * 10;
    const centerY = 3 + Math.random() * 3;
    const centerZ = (Math.random() - 0.5) * 10;

    for (let i = 0; i < count; i++) {
      fishes.push({
        id: uuidv4(),
        name: species.name,
        speciesType: 'fish',
        schoolId,
        position: {
          x: centerX + (Math.random() - 0.5) * 4,
          y: centerY + (Math.random() - 0.5) * 2,
          z: centerZ + (Math.random() - 0.5) * 4,
        },
        size: 0.3 + Math.random() * 0.5,
        speed: 1 + Math.random(),
        direction: { x: 0, y: 0, z: 1 },
        health: 90 + Math.random() * 10,
        age: Math.random() * 50,
        growthRate: 0.02,
        predator: species.predator,
        diet: species.diet,
      });
    }
  });
  return fishes;
}

function generatePlants(): Plant[] {
  const plants: Plant[] = [];
  for (let i = 0; i < 15; i++) {
    const species = plantSpeciesData[i % plantSpeciesData.length];
    const pos = randomPosition(14, 0, 0.2);
    plants.push({
      id: uuidv4(),
      name: species.name,
      speciesType: 'plant',
      plantType: species.plantType,
      position: pos,
      height: 1 + Math.random() * 2,
      health: 85 + Math.random() * 15,
      age: Math.random() * 80,
      growthRate: 0.008,
    });
  }
  return plants;
}

function generateSpeciesLibrary(): Species[] {
  return [...generateCorals(), ...generateFish(), ...generatePlants()];
}

app.get('/api/species', (_, res) => {
  res.json({
    success: true,
    data: generateSpeciesLibrary(),
    timestamp: Date.now(),
  });
});

app.get('/api/species/library', (_, res) => {
  res.json({
    success: true,
    data: {
      corals: coralSpeciesData,
      fish: fishSpeciesData,
      plants: plantSpeciesData,
    },
  });
});

app.get('/api/environment/baseline', (_, res) => {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  const temperatureCurve = hours.map((h) => {
    return 24 + 2 * Math.sin((h - 6) * Math.PI / 12) + Math.random() * 0.5;
  });

  const nutrientCurve = hours.map((h) => {
    const base = 50;
    const dailyVariation = 10 * Math.sin((h - 12) * Math.PI / 12);
    return Math.max(0, Math.min(100, base + dailyVariation + Math.random() * 5));
  });

  const currentPattern = {
    dailyTide: hours.map((h) => 0.5 + 0.3 * Math.sin(h * Math.PI / 6)),
    seasonalTrend: 0.8,
    stormEvents: [
      { time: 8, intensity: 1.5, duration: 2 },
      { time: 20, intensity: 1.3, duration: 1.5 },
    ],
  };

  res.json({
    success: true,
    data: {
      temperature: {
        current: 26,
        range: [22, 30],
        curve: temperatureCurve,
        unit: '°C',
      },
      nutrients: {
        current: 50,
        range: [0, 100],
        curve: nutrientCurve,
        unit: 'mg/L',
      },
      current: {
        pattern: currentPattern,
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
    },
  });
});

app.post('/api/operations/log', (req, res) => {
  const { action, params } = req.body;
  
  const logEntry = {
    id: uuidv4(),
    action: action || 'unknown',
    timestamp: Date.now(),
    params: params || {},
  };
  
  operationLogs.unshift(logEntry);
  if (operationLogs.length > 100) {
    operationLogs.pop();
  }
  
  res.json({
    success: true,
    data: logEntry,
    message: '操作已记录',
  });
});

app.get('/api/operations/logs', (req, res) => {
  const limit = parseInt(req.query.limit as string) || 50;
  const offset = parseInt(req.query.offset as string) || 0;
  
  res.json({
    success: true,
    data: operationLogs.slice(offset, offset + limit),
    total: operationLogs.length,
    hasMore: offset + limit < operationLogs.length,
  });
});

app.get('/api/health', (_, res) => {
  res.json({
    success: true,
    status: 'running',
    timestamp: Date.now(),
    uptime: process.uptime(),
  });
});

app.listen(PORT, () => {
  console.log(`Mock server running on http://localhost:${PORT}`);
  console.log('Available endpoints:');
  console.log('  GET  /api/species - 获取初始物种数据');
  console.log('  GET  /api/species/library - 获取物种库');
  console.log('  GET  /api/environment/baseline - 获取环境基线数据');
  console.log('  POST /api/operations/log - 记录操作日志');
  console.log('  GET  /api/operations/logs - 获取操作日志');
  console.log('  GET  /api/health - 健康检查');
});

export default app;
