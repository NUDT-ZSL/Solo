export interface Plant {
  _id: string;
  name: string;
  type: string;
  wateringFrequency: number;
  lastWatered: string;
  createdAt: string;
  records?: CareRecord[];
}

export interface CareRecord {
  _id: string;
  plantId: string;
  type: 'plant' | 'water' | 'fertilize' | 'prune';
  date: string;
  note: string;
  createdAt: string;
}

export interface Reminder {
  _id: string;
  plantId: string;
  plantName: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export type CareRecordType = CareRecord['type'];

export const PLANT_GRADIENTS: Record<string, [string, string]> = {
  '番茄': ['#e74c3c', '#f39c12'],
  '薄荷': ['#8fbc8f', '#adebad'],
  '辣椒': ['#ff6347', '#ff8c00'],
  '黄瓜': ['#228b22', '#90ee90'],
  '草莓': ['#dc143c', '#ff69b4'],
  '生菜': ['#32cd32', '#98fb98'],
  '萝卜': ['#cd5c5c', '#f0e68c'],
  '向日葵': ['#ffd700', '#ff8c00'],
};

export const DEFAULT_GRADIENT: [string, string] = ['#22c55e', '#86efac'];

export const EVENT_COLORS: Record<CareRecordType, string> = {
  plant: '#22c55e',
  water: '#3b82f6',
  fertilize: '#f97316',
  prune: '#8b5cf6',
};

export const EVENT_LABELS: Record<CareRecordType, string> = {
  plant: '种植',
  water: '浇水',
  fertilize: '施肥',
  prune: '修剪',
};

export function getPlantGradient(type: string): [string, string] {
  return PLANT_GRADIENTS[type] || DEFAULT_GRADIENT;
}

export function getDaysUntilWatering(plant: Plant): number {
  const lastWatered = new Date(plant.lastWatered);
  const now = new Date();
  const diffMs = lastWatered.getTime() - now.getTime();
  const elapsedDays = diffMs / (1000 * 60 * 60 * 24);
  return plant.wateringFrequency + elapsedDays;
}

export function getWateringStatusColor(days: number): string {
  if (days < 1) return '#22c55e';
  if (days <= 3) return '#eab308';
  return '#ef4444';
}
