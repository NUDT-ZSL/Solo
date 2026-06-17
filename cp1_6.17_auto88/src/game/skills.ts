export type SkillType = 'light' | 'heavy' | 'special';

export interface SkillConfig {
  type: SkillType;
  key: string;
  name: string;
  cooldown: number;
  damage: number;
  range: number;
  projectileSize: number;
  color: string;
  chargeTime: number;
  projectileSpeed: number;
}

export interface ComboRule {
  name: string;
  sequence: SkillType[];
  window: number;
  damageMultiplier: number;
  color: string;
  knockback: number;
}

export const SKILLS: SkillConfig[] = [
  {
    type: 'light',
    key: 'j',
    name: '轻击',
    cooldown: 1000,
    damage: 10,
    range: 60,
    projectileSize: 20,
    color: '#FFD700',
    chargeTime: 300,
    projectileSpeed: 10.4,
  },
  {
    type: 'heavy',
    key: 'k',
    name: '重击',
    cooldown: 3000,
    damage: 25,
    range: 80,
    projectileSize: 30,
    color: '#FF4500',
    chargeTime: 300,
    projectileSpeed: 7.8,
  },
  {
    type: 'special',
    key: 'l',
    name: '特殊技能',
    cooldown: 8000,
    damage: 40,
    range: 120,
    projectileSize: 40,
    color: '#8A2BE2',
    chargeTime: 300,
    projectileSpeed: 6.5,
  },
];

export const COMBO_RULES: ComboRule[] = [
  {
    name: '三重打击',
    sequence: ['light', 'heavy', 'special'],
    window: 500,
    damageMultiplier: 1.5,
    color: '#FF00FF',
    knockback: 60,
  },
];

export const getSkillByType = (type: SkillType): SkillConfig | undefined => {
  return SKILLS.find((s) => s.type === type);
};

export const getSkillByKey = (key: string): SkillConfig | undefined => {
  return SKILLS.find((s) => s.key === key.toLowerCase());
};
