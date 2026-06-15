export type CardType = 'attack' | 'defense' | 'heal';

export type CardRarity = 'common' | 'rare' | 'epic';

export type StatusEffectType =
  | 'burn'
  | 'freeze'
  | 'poison'
  | 'lifesteal'
  | 'regen'
  | 'reflect'
  | 'double'
  | 'cleanse';

export interface StatusEffect {
  type: StatusEffectType;
  value: number;
  duration: number;
}

export interface Card {
  id: string;
  uid?: string;
  name: string;
  type: CardType;
  rarity: CardRarity;
  cost: number;
  value: number;
  effect: StatusEffect | null;
  desc: string;
  weight?: number;
}

export interface Enemy {
  _id?: string;
  id: string;
  instanceId?: string;
  name: string;
  maxHp: number;
  hp: number;
  atk: number;
  def: number;
  level: number;
  desc?: string;
  effect?: StatusEffect;
  shield?: number;
  statusEffects?: StatusEffect[];
}

export interface PlayerState {
  _id?: string;
  playerId: string;
  hp: number;
  maxHp: number;
  gold: number;
  level: number;
  stage: number;
  deck: Card[];
  shield?: number;
  statusEffects?: StatusEffect[];
  createdAt?: string;
  updatedAt?: string;
}

export type CombatantSide = 'player' | 'enemy';

export interface CombatEvent {
  id: string;
  timestamp: number;
  source: CombatantSide;
  action: string;
  card?: Card;
  damage?: number;
  heal?: number;
  shieldChange?: number;
  statusEffect?: StatusEffect;
  targetSide?: CombatantSide;
  message: string;
}

export interface CombatFrame {
  frameId: number;
  playerHp: number;
  playerShield: number;
  playerStatusEffects: StatusEffect[];
  enemyHp: number;
  enemyShield: number;
  enemyStatusEffects: StatusEffect[];
  activeCard?: Card;
  activeCardSource?: CombatantSide;
  floatingNumber?: {
    value: string;
    position: 'player' | 'enemy';
    color: string;
  };
  log: string;
  events: CombatEvent[];
}

export interface CombatResult {
  victory: boolean;
  playerFinalHp: number;
  enemyFinalHp: number;
  frames: CombatFrame[];
  totalTurns: number;
  summary: string;
}

export type GamePhase =
  | 'menu'
  | 'enemy_select'
  | 'battle'
  | 'battle_end'
  | 'reward'
  | 'game_over';

export interface ChestReward {
  type: 'card' | 'gold' | 'heal';
  card?: Card;
  amount?: number;
}
