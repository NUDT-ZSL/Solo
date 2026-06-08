export interface Weapon {
  id: string;
  name: string;
  baseDamage: number;
  attackSpeed: number;
  attackRange: number;
  color: string;
  description: string;
}

export type SkillType = 'fire' | 'ice' | 'heal';

export interface Skill {
  id: string;
  name: string;
  instantDamage: number;
  dotDamage: number;
  dotDuration: number;
  cooldown: number;
  effectRadius: number;
  type: SkillType;
  color: string;
  description: string;
}

export interface SkillSlot {
  skillId: string | null;
  cooldownRemaining: number;
}

export interface Target {
  id: string;
  x: number;
  y: number;
  radius: number;
  hp: number;
  maxHp: number;
  speed: number;
  frozen: boolean;
  frozenTime: number;
  burning: boolean;
  burnTime: number;
  burnDamage: number;
  hitFlash: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  radius: number;
}

export interface SkillEffect {
  id: string;
  type: SkillType;
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  life: number;
  maxLife: number;
  color: string;
}

export interface CombatStats {
  totalDamage: number;
  killCount: number;
  peakDps: number;
  battleStartTime: number;
  skillUsageCounts: Record<string, number>;
}

export interface DamageEvent {
  targetId: string;
  amount: number;
  isDot: boolean;
  skillId?: string;
}
