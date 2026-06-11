export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythical';
export type CreatureType = 'ghostFish' | 'treasureChest' | 'woodSpirit' | 'abyssLord' | 'starJellyfish';

export interface Creature {
  id: string;
  type: CreatureType;
  name: string;
  rarity: Rarity;
  color: string;
  size: number;
  weight: number;
  description: string;
  score: number;
  particleColor: string;
  glowColor: string;
}

export interface CollectedCreature extends Creature {
  count: number;
  firstCaughtAt: number;
}

export interface RarityConfig {
  name: string;
  color: string;
  score: number;
  probability: number;
}

export interface CreatureTemplate {
  type: CreatureType;
  name: string;
  description: string;
  baseSize: number;
  baseWeight: number;
  color: string;
  particleColor: string;
  glowColor: string;
  rarityWeights: Record<Rarity, number>;
}

export const RARITY_CONFIG: Record<Rarity, RarityConfig> = {
  common: { name: '普通', color: '#4ade80', score: 10, probability: 0.5 },
  rare: { name: '稀有', color: '#c084fc', score: 25, probability: 0.3 },
  epic: { name: '史诗', color: '#fb923c', score: 50, probability: 0.15 },
  legendary: { name: '传说', color: '#fbbf24', score: 100, probability: 0.04 },
  mythical: { name: '神话', color: '#ff6b6b', score: 200, probability: 0.01 }
};

export const CREATURE_TEMPLATES: CreatureTemplate[] = [
  {
    type: 'ghostFish',
    name: '幽灵鱼',
    description: '漂浮于深渊的半透明鱼类，周身散发幽蓝光芒，据说能指引迷路的灵魂。',
    baseSize: 40,
    baseWeight: 1.5,
    color: '#93c5fd',
    particleColor: '#bfdbfe',
    glowColor: 'rgba(147, 197, 253, 0.6)',
    rarityWeights: { common: 50, rare: 30, epic: 15, legendary: 4, mythical: 1 }
  },
  {
    type: 'treasureChest',
    name: '沉船宝箱',
    description: '从古老沉船中漂出的神秘宝箱，锁着被遗忘的财富与秘密。',
    baseSize: 50,
    baseWeight: 8,
    color: '#fbbf24',
    particleColor: '#fde68a',
    glowColor: 'rgba(251, 191, 36, 0.6)',
    rarityWeights: { common: 30, rare: 40, epic: 20, legendary: 8, mythical: 2 }
  },
  {
    type: 'woodSpirit',
    name: '漂浮木灵',
    description: '沉眠千年的古树残骸，被湖水赋予了微弱的灵智，喜欢在月夜浮出水面。',
    baseSize: 45,
    baseWeight: 3,
    color: '#86efac',
    particleColor: '#bbf7d0',
    glowColor: 'rgba(134, 239, 172, 0.6)',
    rarityWeights: { common: 40, rare: 35, epic: 18, legendary: 5, mythical: 2 }
  },
  {
    type: 'abyssLord',
    name: '深渊之主',
    description: '居住在湖底最深处的远古存在，极少现身，据说见过它的人都没能回来。',
    baseSize: 80,
    baseWeight: 20,
    color: '#ff4757',
    particleColor: '#ff6b6b',
    glowColor: 'rgba(255, 71, 87, 0.6)',
    rarityWeights: { common: 5, rare: 20, epic: 40, legendary: 25, mythical: 10 }
  },
  {
    type: 'starJellyfish',
    name: '星辉水母',
    description: '体内孕育着星光碎片的神奇水母，夜晚会升向水面，宛如流动的银河。',
    baseSize: 55,
    baseWeight: 0.8,
    color: '#fbbf24',
    particleColor: '#fde68a',
    glowColor: 'rgba(251, 191, 36, 0.6)',
    rarityWeights: { common: 10, rare: 25, epic: 35, legendary: 22, mythical: 8 }
  }
];

export class CreatureSystem {
  private collection: Map<string, CollectedCreature> = new Map();

  generateCreature(): Creature {
    const template = CREATURE_TEMPLATES[Math.floor(Math.random() * CREATURE_TEMPLATES.length)];
    const rarity = this.selectRarity(template.rarityWeights);
    const rarityConfig = RARITY_CONFIG[rarity];
    const sizeMultiplier = 0.8 + Math.random() * 0.4;
    const weightMultiplier = 0.7 + Math.random() * 0.6;

    let color = template.color;
    if (rarity === 'mythical') {
      color = 'mythical';
    }

    return {
      id: `${template.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: template.type,
      name: template.name,
      rarity,
      color,
      size: template.baseSize * sizeMultiplier,
      weight: parseFloat((template.baseWeight * weightMultiplier).toFixed(2)),
      description: template.description,
      score: rarityConfig.score,
      particleColor: template.particleColor,
      glowColor: template.glowColor
    };
  }

  private selectRarity(weights: Record<Rarity, number>): Rarity {
    const total = Object.values(weights).reduce((sum, w) => sum + w, 0);
    let random = Math.random() * total;

    for (const [rarity, weight] of Object.entries(weights) as [Rarity, number][]) {
      random -= weight;
      if (random <= 0) return rarity;
    }

    return 'common';
  }

  collectCreature(creature: Creature): CollectedCreature {
    const existing = this.collection.get(creature.type);
    if (existing) {
      existing.count++;
      return existing;
    }

    const collected: CollectedCreature = {
      ...creature,
      count: 1,
      firstCaughtAt: Date.now()
    };

    this.collection.set(creature.type, collected);
    return collected;
  }

  getCollection(): CollectedCreature[] {
    return Array.from(this.collection.values());
  }

  getCollectedCount(): number {
    return this.collection.size;
  }

  getTotalCreaturesCount(): number {
    return Array.from(this.collection.values()).reduce((sum, c) => sum + c.count, 0);
  }

  isCollected(type: CreatureType): boolean {
    return this.collection.has(type);
  }

  getCreatureByType(type: CreatureType): CollectedCreature | undefined {
    return this.collection.get(type);
  }

  getAllTemplates(): CreatureTemplate[] {
    return [...CREATURE_TEMPLATES];
  }

  getRarityConfig(rarity: Rarity): RarityConfig {
    return RARITY_CONFIG[rarity];
  }
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  threshold: number;
  unlocked: boolean;
  unlockedAt?: number;
  type: 'score' | 'collection' | 'catch';
}

export class AchievementSystem {
  private achievements: Achievement[] = [
    { id: 'first_catch', name: '首次垂钓', description: '钓起你的第一个生物', threshold: 1, unlocked: false, type: 'catch' },
    { id: 'collector_5', name: '收藏家', description: '收集5种不同的生物', threshold: 5, unlocked: false, type: 'collection' },
    { id: 'score_100', name: '初露锋芒', description: '累积获得100分', threshold: 100, unlocked: false, type: 'score' },
    { id: 'score_500', name: '钓鱼高手', description: '累积获得500分', threshold: 500, unlocked: false, type: 'score' },
    { id: 'score_1000', name: '深渊猎手', description: '累积获得1000分', threshold: 1000, unlocked: false, type: 'score' },
    { id: 'catch_10', name: '勤勉钓客', description: '成功钓起10个生物', threshold: 10, unlocked: false, type: 'catch' },
    { id: 'catch_25', name: '专业钓手', description: '成功钓起25个生物', threshold: 25, unlocked: false, type: 'catch' },
    { id: 'mythical_hunter', name: '神话猎人', description: '钓起一只神话级生物', threshold: 1, unlocked: false, type: 'catch' }
  ];

  checkAchievements(stats: { score: number; uniqueCaught: number; totalCaught: number; caughtRarities: Record<Rarity, number> }): Achievement[] {
    const newlyUnlocked: Achievement[] = [];

    for (const achievement of this.achievements) {
      if (achievement.unlocked) continue;

      let shouldUnlock = false;

      switch (achievement.type) {
        case 'score':
          shouldUnlock = stats.score >= achievement.threshold;
          break;
        case 'collection':
          shouldUnlock = stats.uniqueCaught >= achievement.threshold;
          break;
        case 'catch':
          if (achievement.id === 'mythical_hunter') {
            shouldUnlock = stats.caughtRarities.mythical >= achievement.threshold;
          } else {
            shouldUnlock = stats.totalCaught >= achievement.threshold;
          }
          break;
      }

      if (shouldUnlock) {
        achievement.unlocked = true;
        achievement.unlockedAt = Date.now();
        newlyUnlocked.push(achievement);
      }
    }

    return newlyUnlocked;
  }

  getAchievements(): Achievement[] {
    return [...this.achievements];
  }

  getUnlockedCount(): number {
    return this.achievements.filter(a => a.unlocked).length;
  }
}
