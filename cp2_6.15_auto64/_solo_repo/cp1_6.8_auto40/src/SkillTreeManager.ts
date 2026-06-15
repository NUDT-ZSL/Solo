export type SkillBranch = 'shadow' | 'fire' | 'frost';

export interface SkillNode {
  id: string;
  name: string;
  branch: SkillBranch;
  tier: number;
  description: string;
  cost: number;
  unlocked: boolean;
  active: boolean;
  requires: string[];
  effects: SkillEffect[];
  iconColor: string;
  iconSymbol: string;
  x: number;
  y: number;
}

export interface SkillEffect {
  type: 'damage_bonus' | 'speed_bonus' | 'defense_bonus' | 'heal' | 'projectile' | 'aoe' | 'dash_boost' | 'combo_extend' | 'lifesteal' | 'freeze' | 'burn' | 'shadow_walk';
  value: number;
  duration: number;
}

export interface ActiveSkillBoost {
  damageMultiplier: number;
  speedMultiplier: number;
  defenseMultiplier: number;
  lifestealPercent: number;
  comboLength: number;
  dashDistance: number;
  dashCooldown: number;
  projectileCount: number;
  projectileDamage: number;
  hasBurn: boolean;
  burnDamage: number;
  hasFreeze: boolean;
  freezeDuration: number;
  hasShadowWalk: boolean;
  shadowWalkDuration: number;
  hasAoeOnHit: boolean;
  aoeDamage: number;
  aoeRadius: number;
  healOnKill: number;
}

interface PersistentUnlocks {
  [skillId: string]: boolean;
}

const SKILL_TREE_DATA: Omit<SkillNode, 'unlocked' | 'active'>[] = [
  {
    id: 'shadow_1', name: '暗影步', branch: 'shadow', tier: 1,
    description: '闪避距离增加30%，冷却减少20%',
    cost: 3, requires: [],
    effects: [
      { type: 'dash_boost', value: 1.3, duration: 0 },
      { type: 'dash_boost', value: 0.8, duration: 0 },
    ],
    iconColor: '#8b5cf6', iconSymbol: '⚄', x: 150, y: 200,
  },
  {
    id: 'shadow_2', name: '暗影之刃', branch: 'shadow', tier: 2,
    description: '近战攻击附加暗影伤害，暴击率+15%',
    cost: 5, requires: ['shadow_1'],
    effects: [
      { type: 'damage_bonus', value: 1.25, duration: 0 },
    ],
    iconColor: '#7c3aed', iconSymbol: '⚔', x: 100, y: 320,
  },
  {
    id: 'shadow_3', name: '虚无形态', branch: 'shadow', tier: 3,
    description: '闪避后2秒内无敌，可穿越敌人',
    cost: 8, requires: ['shadow_2'],
    effects: [
      { type: 'shadow_walk', value: 1, duration: 2 },
    ],
    iconColor: '#6d28d9', iconSymbol: '👻', x: 80, y: 440,
  },
  {
    id: 'shadow_4', name: '暗影连斩', branch: 'shadow', tier: 2,
    description: '连击段数+2，最后一段造成范围伤害',
    cost: 5, requires: ['shadow_1'],
    effects: [
      { type: 'combo_extend', value: 2, duration: 0 },
      { type: 'aoe', value: 0.8, duration: 0 },
    ],
    iconColor: '#7c3aed', iconSymbol: '🗡', x: 200, y: 320,
  },
  {
    id: 'shadow_5', name: '生命汲取', branch: 'shadow', tier: 3,
    description: '击杀敌人回复10%最大生命值',
    cost: 7, requires: ['shadow_4'],
    effects: [
      { type: 'lifesteal', value: 0.1, duration: 0 },
    ],
    iconColor: '#6d28d9', iconSymbol: '❤', x: 200, y: 440,
  },
  {
    id: 'fire_1', name: '烈焰附魔', branch: 'fire', tier: 1,
    description: '攻击附带燃烧效果，3秒内造成额外伤害',
    cost: 3, requires: [],
    effects: [
      { type: 'burn', value: 8, duration: 3 },
    ],
    iconColor: '#ef4444', iconSymbol: '🔥', x: 450, y: 200,
  },
  {
    id: 'fire_2', name: '火焰风暴', branch: 'fire', tier: 2,
    description: '远程攻击射出3枚火球，爆炸造成范围伤害',
    cost: 5, requires: ['fire_1'],
    effects: [
      { type: 'projectile', value: 3, duration: 0 },
      { type: 'aoe', value: 1.2, duration: 0 },
    ],
    iconColor: '#dc2626', iconSymbol: '💥', x: 400, y: 320,
  },
  {
    id: 'fire_3', name: '炼狱之怒', branch: 'fire', tier: 3,
    description: '燃烧伤害翻倍，攻击力+40%',
    cost: 8, requires: ['fire_2'],
    effects: [
      { type: 'burn', value: 16, duration: 3 },
      { type: 'damage_bonus', value: 1.4, duration: 0 },
    ],
    iconColor: '#b91c1c', iconSymbol: '☄', x: 380, y: 440,
  },
  {
    id: 'fire_4', name: '灼热护盾', branch: 'fire', tier: 2,
    description: '受伤时对周围敌人造成火焰反伤',
    cost: 5, requires: ['fire_1'],
    effects: [
      { type: 'defense_bonus', value: 1.2, duration: 0 },
      { type: 'aoe', value: 0.5, duration: 0 },
    ],
    iconColor: '#dc2626', iconSymbol: '🛡', x: 500, y: 320,
  },
  {
    id: 'fire_5', name: '凤凰涅槃', branch: 'fire', tier: 3,
    description: '死亡时复活一次，回复50%生命值（每局一次）',
    cost: 10, requires: ['fire_4'],
    effects: [
      { type: 'heal', value: 0.5, duration: 0 },
    ],
    iconColor: '#b91c1c', iconSymbol: '🌀', x: 500, y: 440,
  },
  {
    id: 'frost_1', name: '霜冻新星', branch: 'frost', tier: 1,
    description: '攻击有几率冻结敌人1.5秒',
    cost: 3, requires: [],
    effects: [
      { type: 'freeze', value: 0.25, duration: 1.5 },
    ],
    iconColor: '#38bdf8', iconSymbol: '❄', x: 750, y: 200,
  },
  {
    id: 'frost_2', name: '冰霜护甲', branch: 'frost', tier: 2,
    description: '防御力+25%，受击时减速攻击者',
    cost: 5, requires: ['frost_1'],
    effects: [
      { type: 'defense_bonus', value: 1.25, duration: 0 },
      { type: 'freeze', value: 0.15, duration: 0.8 },
    ],
    iconColor: '#0ea5e9', iconSymbol: '🧊', x: 700, y: 320,
  },
  {
    id: 'frost_3', name: '绝对零度', branch: 'frost', tier: 3,
    description: '冻结时间翻倍，对冻结敌人伤害+60%',
    cost: 8, requires: ['frost_2'],
    effects: [
      { type: 'freeze', value: 0.5, duration: 3 },
      { type: 'damage_bonus', value: 1.6, duration: 0 },
    ],
    iconColor: '#0284c7', iconSymbol: '💠', x: 680, y: 440,
  },
  {
    id: 'frost_4', name: '寒冰箭雨', branch: 'frost', tier: 2,
    description: '远程攻击射出冰箭，命中后减速敌人',
    cost: 5, requires: ['frost_1'],
    effects: [
      { type: 'projectile', value: 2, duration: 0 },
      { type: 'speed_bonus', value: 0.7, duration: 2 },
    ],
    iconColor: '#0ea5e9', iconSymbol: '🏹', x: 800, y: 320,
  },
  {
    id: 'frost_5', name: '永冻领域', branch: 'frost', tier: 3,
    description: '释放冰霜领域，持续减速并伤害范围内敌人',
    cost: 10, requires: ['frost_4'],
    effects: [
      { type: 'aoe', value: 1.5, duration: 0 },
      { type: 'freeze', value: 0.3, duration: 4 },
    ],
    iconColor: '#0284c7', iconSymbol: '🌫', x: 800, y: 440,
  },
];

export class SkillTreeManager {
  private skills: Map<string, SkillNode> = new Map();
  private persistentUnlocks: PersistentUnlocks = {};
  private chaosFragments: number = 0;
  private totalFragmentsCollected: number = 0;
  private phoenixUsed: boolean = false;

  constructor() {
    this.loadPersistent();
    this.initSkills();
  }

  private initSkills(): void {
    for (const data of SKILL_TREE_DATA) {
      const skill: SkillNode = {
        ...data,
        unlocked: this.persistentUnlocks[data.id] ?? false,
        active: this.persistentUnlocks[data.id] ?? false,
      };
      this.skills.set(data.id, skill);
    }
  }

  private loadPersistent(): void {
    try {
      const saved = localStorage.getItem('abyss_contract_unlocks');
      if (saved) {
        this.persistentUnlocks = JSON.parse(saved);
      }
    } catch {}
  }

  private savePersistent(): void {
    try {
      localStorage.setItem('abyss_contract_unlocks', JSON.stringify(this.persistentUnlocks));
    } catch {}
  }

  addFragments(amount: number): void {
    this.chaosFragments += amount;
    this.totalFragmentsCollected += amount;
  }

  getFragments(): number {
    return this.chaosFragments;
  }

  getTotalFragments(): number {
    return this.totalFragmentsCollected;
  }

  canUnlock(skillId: string): boolean {
    const skill = this.skills.get(skillId);
    if (!skill || skill.unlocked) return false;
    if (this.chaosFragments < skill.cost) return false;
    for (const reqId of skill.requires) {
      if (!this.skills.get(reqId)?.unlocked) return false;
    }
    return true;
  }

  unlockSkill(skillId: string): boolean {
    if (!this.canUnlock(skillId)) return false;
    const skill = this.skills.get(skillId)!;
    this.chaosFragments -= skill.cost;
    skill.unlocked = true;
    skill.active = true;
    this.persistentUnlocks[skillId] = true;
    this.savePersistent();
    return true;
  }

  isSkillUnlocked(skillId: string): boolean {
    return this.skills.get(skillId)?.unlocked ?? false;
  }

  getActiveBoosts(): ActiveSkillBoost {
    const boosts: ActiveSkillBoost = {
      damageMultiplier: 1,
      speedMultiplier: 1,
      defenseMultiplier: 1,
      lifestealPercent: 0,
      comboLength: 3,
      dashDistance: 200,
      dashCooldown: 1.0,
      projectileCount: 1,
      projectileDamage: 1,
      hasBurn: false,
      burnDamage: 0,
      hasFreeze: false,
      freezeDuration: 0,
      hasShadowWalk: false,
      shadowWalkDuration: 0,
      hasAoeOnHit: false,
      aoeDamage: 0,
      aoeRadius: 0,
      healOnKill: 0,
    };

    for (const [, skill] of this.skills) {
      if (!skill.active) continue;
      for (const effect of skill.effects) {
        switch (effect.type) {
          case 'damage_bonus':
            boosts.damageMultiplier *= effect.value;
            break;
          case 'speed_bonus':
            boosts.speedMultiplier *= effect.value;
            break;
          case 'defense_bonus':
            boosts.defenseMultiplier *= effect.value;
            break;
          case 'lifesteal':
            boosts.lifestealPercent += effect.value;
            break;
          case 'combo_extend':
            boosts.comboLength += effect.value;
            break;
          case 'dash_boost':
            if (effect.duration === 0 && effect.value > 1) {
              boosts.dashDistance *= effect.value;
            } else if (effect.duration === 0 && effect.value < 1) {
              boosts.dashCooldown *= effect.value;
            }
            break;
          case 'projectile':
            boosts.projectileCount = Math.max(boosts.projectileCount, effect.value);
            boosts.projectileDamage = effect.value > 1 ? 0.7 : 1;
            break;
          case 'aoe':
            boosts.hasAoeOnHit = true;
            boosts.aoeDamage += effect.value;
            boosts.aoeRadius = Math.max(boosts.aoeRadius, 80);
            break;
          case 'burn':
            boosts.hasBurn = true;
            boosts.burnDamage = Math.max(boosts.burnDamage, effect.value);
            break;
          case 'freeze':
            boosts.hasFreeze = true;
            boosts.freezeDuration = Math.max(boosts.freezeDuration, effect.duration);
            break;
          case 'shadow_walk':
            boosts.hasShadowWalk = true;
            boosts.shadowWalkDuration = Math.max(boosts.shadowWalkDuration, effect.duration);
            break;
          case 'heal':
            boosts.healOnKill = Math.max(boosts.healOnKill, effect.value);
            break;
        }
      }
    }

    return boosts;
  }

  hasPhoenixRevive(): boolean {
    return this.isSkillUnlocked('fire_5') && !this.phoenixUsed;
  }

  usePhoenixRevive(): void {
    this.phoenixUsed = true;
  }

  resetRun(): void {
    this.chaosFragments = 0;
    this.totalFragmentsCollected = 0;
    this.phoenixUsed = false;
  }

  getSkills(): SkillNode[] {
    return Array.from(this.skills.values());
  }

  getSkillById(id: string): SkillNode | undefined {
    return this.skills.get(id);
  }
}
