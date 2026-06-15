export type Rarity = 'common' | 'rare' | 'epic' | 'legendary' | 'mythic';
export type CreatureType =
  | 'ghost_fish'
  | 'shipwreck_chest'
  | 'driftwood_spirit'
  | 'abyss_lord'
  | 'starlight_jellyfish';

export interface Creature {
  id: CreatureType;
  name: string;
  description: string;
  color: string;
  secondaryColor?: string;
  size: { w: number; h: number };
  rarity: Rarity;
  score: number;
  emoji: string;
  weight: number;
}

export interface CollectedCreature {
  type: CreatureType;
  firstCaughtAt: number;
  count: number;
}

export const RARITY_META: Record<Rarity, { label: string; color: string; cls: string; glow: string }> = {
  common:    { label: '普通', color: '#4ade80', cls: 'rarity-common',    glow: 'rgba(74, 222, 128, 0.5)' },
  rare:      { label: '稀有', color: '#c084fc', cls: 'rarity-rare',      glow: 'rgba(192, 132, 252, 0.5)' },
  epic:      { label: '史诗', color: '#fb923c', cls: 'rarity-epic',      glow: 'rgba(251, 146, 60, 0.5)' },
  legendary: { label: '传说', color: '#fbbf24', cls: 'rarity-legendary', glow: 'rgba(251, 191, 36, 0.55)' },
  mythic:    { label: '神话', color: '#ff6b6b', cls: 'rarity-mythic',    glow: 'rgba(255, 71, 87, 0.6)'  },
};

export const CREATURES: Creature[] = [
  {
    id: 'ghost_fish',
    name: '幽灵鱼',
    description: '游荡于墨渊上层的半透明幽蓝生物，鳞片折射着清冷的月光，游动时留下淡淡荧光轨迹。',
    color: '#88d4ff',
    secondaryColor: '#b8e8ff',
    size: { w: 48, h: 22 },
    rarity: 'common',
    score: 10,
    emoji: '👻',
    weight: 60,
  },
  {
    id: 'driftwood_spirit',
    name: '漂浮木灵',
    description: '由千年沉船碎片凝聚的木之精灵，身上寄生着发光的海苔，双眼闪烁着温和的琥珀色光芒。',
    color: '#b08968',
    secondaryColor: '#7f5539',
    size: { w: 56, h: 40 },
    rarity: 'common',
    score: 10,
    emoji: '🪵',
    weight: 60,
  },
  {
    id: 'starlight_jellyfish',
    name: '星辉水母',
    description: '体内封印着陨落星辰的神秘水母，伞盖下的星芒随水波流转，触须如银河般优雅延伸。',
    color: '#c4b5fd',
    secondaryColor: '#a78bfa',
    size: { w: 42, h: 58 },
    rarity: 'rare',
    score: 25,
    emoji: '🪼',
    weight: 22,
  },
  {
    id: 'shipwreck_chest',
    name: '沉船宝箱',
    description: '失落商船的遗物，青铜锁扣上缠满了珊瑚，传闻开启时会释放出航海者最后的愿望。',
    color: '#fbbf24',
    secondaryColor: '#92400e',
    size: { w: 54, h: 42 },
    rarity: 'epic',
    score: 50,
    emoji: '💎',
    weight: 11,
  },
  {
    id: 'abyss_lord',
    name: '深渊之主',
    description: '潜伏于墨渊最深处的远古存在，只在风暴之夜才会浮出水面，通体血色纹路，眼中藏着千万年的孤独。',
    color: '#ff6b6b',
    secondaryColor: '#ff4757',
    size: { w: 82, h: 60 },
    rarity: 'legendary',
    score: 100,
    emoji: '🐉',
    weight: 5.5,
  },
];

export function getCreatureById(id: CreatureType): Creature {
  return CREATURES.find(c => c.id === id) ?? CREATURES[0];
}

function weightedRandom(): Creature {
  const total = CREATURES.reduce((s, c) => s + c.weight, 0);
  let r = Math.random() * total;
  for (const c of CREATURES) {
    r -= c.weight;
    if (r <= 0) return c;
  }
  return CREATURES[0];
}

export class CodexManager {
  private _collected = new Map<CreatureType, CollectedCreature>();

  constructor() {
    this.load();
  }

  get collected(): ReadonlyMap<CreatureType, CollectedCreature> {
    return this._collected;
  }

  isUnlocked(id: CreatureType): boolean {
    return this._collected.has(id);
  }

  unlockCount(): number {
    return this._collected.size;
  }

  rollCatch(): { creature: Creature; isNew: boolean } {
    const creature = weightedRandom();
    const existing = this._collected.get(creature.id);
    const isNew = !existing;
    if (existing) {
      existing.count += 1;
    } else {
      this._collected.set(creature.id, {
        type: creature.id,
        firstCaughtAt: Date.now(),
        count: 1,
      });
    }
    this.save();
    return { creature, isNew };
  }

  getRecord(id: CreatureType): CollectedCreature | undefined {
    return this._collected.get(id);
  }

  private save(): void {
    try {
      const data = Array.from(this._collected.values());
      localStorage.setItem('moyuan_codex', JSON.stringify(data));
    } catch {
      /* ignore */
    }
  }

  private load(): void {
    try {
      const raw = localStorage.getItem('moyuan_codex');
      if (!raw) return;
      const data = JSON.parse(raw) as CollectedCreature[];
      this._collected = new Map(data.map(c => [c.type, c]));
    } catch {
      this._collected.clear();
    }
  }
}
