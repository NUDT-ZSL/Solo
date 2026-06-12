export enum ElementType {
  FIRE = 'fire',
  ICE = 'ice',
  THUNDER = 'thunder',
  SHADOW = 'shadow',
  HOLY = 'holy',
  POISON = 'poison',
  WATER = 'water',
  EARTH = 'earth',
  WIND = 'wind',
  ARCANE = 'arcane',
}

export interface Rune {
  id: string;
  name: string;
  element: ElementType;
  baseDamage: number;
  cooldown: number;
  range: number;
  color: string;
  glowColor: string;
  description: string;
}

export interface CombinationRule {
  id: string;
  name: string;
  elements: ElementType[];
  description: string;
  damageMultiplier: number;
  cooldownReduction: number;
  statusEffect?: StatusEffect;
  triggerTime?: number;
}

export interface StatusEffect {
  name: string;
  duration: number;
  damagePerSecond?: number;
  description: string;
}

export interface RuneCombination {
  runeIds: string[];
}

export interface DamagePoint {
  time: number;
  damage: number;
  cumulativeDamage: number;
  isBurst: boolean;
  burstRuleName?: string;
}

export interface DamageResult {
  totalDamage: number;
  baseDamage: number;
  effectiveDamage: number;
  cooldown: number;
  range: number;
  statusEffects: StatusEffect[];
  damageCurve: DamagePoint[];
  triggeredRules: CombinationRule[];
  elementAdvantageColor: string;
}

export interface SavedConfig {
  _id?: string;
  name: string;
  runeIds: string[];
  createdAt: number;
}

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  success: boolean;
}

export interface CalculateRequest {
  runeIds: string[];
}

export interface SaveConfigRequest {
  name: string;
  runeIds: string[];
}

export interface HealthCheckResponse {
  status: string;
  service: string;
}
