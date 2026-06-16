/*
 * 类型定义文件
 * 被调用：gameEngine.ts, useGameState.ts, 所有组件文件
 * 接收：无，仅导出类型定义
 * 返回：TypeScript 类型定义和常量配置
 */

export type MinerLevel = 'novice' | 'normal' | 'senior' | 'elite' | 'legendary';
export type ResourceType = 'gold' | 'copper' | 'silver' | 'gem';
export type EquipmentType = 'pickaxe' | 'furnace' | 'warehouse';
export type EventType = 'vein_found' | 'equipment_failure' | 'merchant_visit';
export type PriceDirection = 'up' | 'down' | 'none';

export interface Miner {
  id: string;
  level: MinerLevel;
  name: string;
  efficiency: number;
  status: 'idle' | 'mining';
  hiredAt: number;
}

export interface MinerTemplate {
  level: MinerLevel;
  name: string;
  efficiency: number;
  cost: number;
  borderColor: string;
}

export interface Resource {
  type: ResourceType;
  name: string;
  amount: number;
  color: string;
  basePrice: number;
  currentPrice: number;
  priceDirection: PriceDirection;
  lastPriceChange: number;
}

export interface Equipment {
  type: EquipmentType;
  name: string;
  level: number;
  maxLevel: number;
  effect: number;
  description: string;
}

export interface GameEvent {
  id: string;
  type: EventType;
  title: string;
  description: string;
  duration: number;
  startTime: number;
  effectMultiplier: number;
  discount?: number;
}

export interface AnimationConfig {
  particleCount: number;
  animationSpeed: number;
}

export interface GameState {
  coins: number;
  miners: Miner[];
  resources: Record<ResourceType, Resource>;
  equipment: Record<EquipmentType, Equipment>;
  outputPerSecond: number;
  totalEfficiency: number;
  activeEvent: GameEvent | null;
  nextMarketUpdate: number;
  nextEventUpdate: number;
  marketUpdateInterval: number;
  eventUpdateInterval: number;
  animationConfig: AnimationConfig;
  lastUpdateTime: number;
}

export const MINER_TEMPLATES: MinerTemplate[] = [
  { level: 'novice', name: '新手矿工', efficiency: 0.5, cost: 10, borderColor: '#FFFFFF' },
  { level: 'normal', name: '普通矿工', efficiency: 1.0, cost: 50, borderColor: '#00FF00' },
  { level: 'senior', name: '资深矿工', efficiency: 1.8, cost: 200, borderColor: '#00BFFF' },
  { level: 'elite', name: '精英矿工', efficiency: 3.0, cost: 1000, borderColor: '#9932CC' },
  { level: 'legendary', name: '传奇矿工', efficiency: 5.0, cost: 5000, borderColor: '#FF8C00' },
];

export const INITIAL_RESOURCES: Record<ResourceType, Omit<Resource, 'currentPrice' | 'priceDirection' | 'lastPriceChange'>> = {
  gold: { type: 'gold', name: '金矿石', amount: 0, color: '#FFD700', basePrice: 100 },
  copper: { type: 'copper', name: '铜矿石', amount: 50, color: '#B87333', basePrice: 10 },
  silver: { type: 'silver', name: '银矿石', amount: 20, color: '#C0C0C0', basePrice: 30 },
  gem: { type: 'gem', name: '宝石', amount: 0, color: '#00FF00', basePrice: 500 },
};

export const INITIAL_EQUIPMENT: Record<EquipmentType, Omit<Equipment, 'level'>> = {
  pickaxe: { type: 'pickaxe', name: '基础镐', maxLevel: 10, effect: 0.2, description: '每级增加0.2/s采集速度' },
  furnace: { type: 'furnace', name: '熔炉', maxLevel: 10, effect: 0.15, description: '每级增加铜矿转金币效率0.15' },
  warehouse: { type: 'warehouse', name: '仓库', maxLevel: 10, effect: 200, description: '每级增加最大资源存储量200' },
};

export const PRICE_FLUCTUATION: Record<ResourceType, number> = {
  gold: 0.05,
  copper: 0.08,
  silver: 0.10,
  gem: 0.15,
};

export const BASE_OUTPUT = 1.0;
export const MAX_STORAGE_BASE = 500;
