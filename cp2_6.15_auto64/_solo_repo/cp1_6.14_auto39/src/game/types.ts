export interface IPosition {
  x: number;
  y: number;
}

export interface IRoomData {
  width: number;
  height: number;
  tiles: number[][];
  walls: IPosition[];
  obstacles: IPosition[];
  enemies: IEnemyConfig[];
  chests: IChestConfig[];
  exit: IPosition;
  entrance: IPosition;
  isBossRoom: boolean;
  seed: number;
}

export interface IEnemyConfig {
  position: IPosition;
  isBoss: boolean;
}

export interface IChestConfig {
  position: IPosition;
  opened: boolean;
}

export type ItemType =
  | 'health_potion'
  | 'attack_ring'
  | 'speed_boots'
  | 'shield'
  | 'gold_bag';

export type PermanentUpgradeType =
  | 'max_hp'
  | 'attack'
  | 'initial_gold';

export interface IItem {
  id: string;
  type: ItemType;
  name: string;
  description: string;
  icon: string;
  duration?: number;
}

export interface IPermanentUpgrade {
  id: string;
  type: PermanentUpgradeType;
  name: string;
  icon: string;
  value: number;
}

export interface IPlayerState {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attackPower: number;
  baseAttack: number;
  speed: number;
  baseSpeed: number;
  gold: number;
  direction: number;
  isAttacking: boolean;
  hasShield: boolean;
  activeItems: IItem[];
  permanentUpgrades: IPermanentUpgrade[];
  hitFlashTimer: number;
  invincibleTimer: number;
}

export interface IEnemyState {
  id: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  attack: number;
  speed: number;
  state: 'idle' | 'patrol' | 'chase';
  isBoss: boolean;
  hitFlashTimer: number;
  attackCooldown: number;
  radius: number;
}

export interface IProjectileState {
  id: string;
  x: number;
  y: number;
  angle: number;
  speed: number;
  damage: number;
  radius: number;
  life: number;
}

export interface IDebris {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface IParticle {
  x: number;
  y: number;
  angle: number;
  radius: number;
  life: number;
  maxLife: number;
  angularSpeed: number;
  expandSpeed: number;
  color: string;
  size: number;
}

export interface IAttackArea {
  x: number;
  y: number;
  direction: number;
  angle: number;
  radius: number;
}

export interface IPlayerInput {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  attack: boolean;
}

export type GameState =
  | 'playing'
  | 'item_select'
  | 'death_animation'
  | 'game_over'
  | 'victory'
  | 'upgrade_select';

export interface IGameStats {
  floor: number;
  roomIndex: number;
  enemiesKilled: number;
  goldCollected: number;
  endlessPoints: number;
}

export interface IGameData {
  state: GameState;
  room: IRoomData;
  player: IPlayerState;
  enemies: IEnemyState[];
  projectiles: IProjectileState[];
  debris: IDebris[];
  chestItems: IItem[];
  selectedChestIndex: number | null;
  upgradeOptions: IPermanentUpgrade[];
  stats: IGameStats;
  deathAnimationProgress: number;
}
