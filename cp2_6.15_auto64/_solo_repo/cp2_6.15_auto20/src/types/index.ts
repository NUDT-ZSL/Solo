export interface Plant {
  id: number;
  gardenId: number;
  plantType: string;
  gridIndex: number;
  growthProgress: number;
  health: number;
  stage: number;
  plantedAt?: string;
  lastWateredAt?: string;
  lastFertilizedAt?: string;
}

export interface Garden {
  id: number;
  name: string;
  userId: string;
  isPublic: number;
  likes: number;
  createdAt?: string;
  plants?: Plant[];
}

export interface Message {
  id: number;
  gardenId: number;
  userName: string;
  content: string;
  createdAt?: string;
}

export interface PlantType {
  id: string;
  name: string;
  rarity: number;
  description: string;
  emoji: string;
  color: string;
}

export const PLANT_TYPES: PlantType[] = [
  { id: 'sunflower', name: '太阳花', rarity: 1, description: '向阳而生的快乐之花', emoji: '🌻', color: '#ffd93d' },
  { id: 'moonflower', name: '月光草', rarity: 2, description: '在夜晚绽放的神秘草本', emoji: '🌙', color: '#b19cd9' },
  { id: 'startree', name: '星辰树', rarity: 5, description: '传说中结出星星果实的神树', emoji: '⭐', color: '#ffd700' },
  { id: 'rose', name: '玫瑰', rarity: 2, description: '浪漫的花中皇后', emoji: '🌹', color: '#ff6b6b' },
  { id: 'cactus', name: '仙人掌', rarity: 1, description: '沙漠中的坚强生命', emoji: '🌵', color: '#6bcb77' },
  { id: 'tulip', name: '郁金香', rarity: 3, description: '优雅高贵的春季之花', emoji: '🌷', color: '#ff9ff3' },
  { id: 'orchid', name: '兰花', rarity: 4, description: '高洁典雅的君子之花', emoji: '💮', color: '#a29bfe' },
  { id: 'bamboo', name: '翠竹', rarity: 2, description: '坚韧不拔的岁寒之友', emoji: '🎋', color: '#00b894' },
  { id: 'lavender', name: '薰衣草', rarity: 3, description: '散发芬芳的紫色精灵', emoji: '💜', color: '#a29bfe' },
  { id: 'cherry', name: '樱花', rarity: 4, description: '绚烂短暂的春之精灵', emoji: '🌸', color: '#ffb6c1' },
];

export function getPlantType(id: string): PlantType {
  return PLANT_TYPES.find(p => p.id === id) || PLANT_TYPES[0];
}

export function getStageName(stage: number): string {
  if (stage <= 0) return '种子期';
  if (stage === 1) return '发芽期';
  return '开花期';
}

export function getRarityStars(rarity: number): string {
  return '★'.repeat(rarity) + '☆'.repeat(5 - rarity);
}
