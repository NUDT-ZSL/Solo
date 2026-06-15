export type TerrainType = 'normal' | 'obstacle';

export type ProfessionType = 'warrior' | 'mage' | 'archer';

export type TurnOwner = 'player' | 'ai';

export type GamePhase = 'idle' | 'selectUnit' | 'selectMoveTarget' | 'selectAttackTarget' | 'aiThinking' | 'animating' | 'gameOver';

export interface Skill {
  id: string;
  name: string;
  description: string;
  damage: number;
  range: number;
  cooldown: number;
  currentCooldown: number;
  icon: string;
  ignoreObstacle?: boolean;
  selfDamagePercent?: number;
}

export interface Unit {
  id: string;
  name: string;
  profession: ProfessionType;
  gridX: number;
  gridY: number;
  hp: number;
  maxHp: number;
  attack: number;
  moveRange: number;
  attackRange: number;
  isPlayer: boolean;
  skills: Skill[];
  hasMoved: boolean;
  hasActed: boolean;
  color: string;
  isAttacking: boolean;
  attackProgress: number;
  attackDirection: { x: number; y: number };
  isHurt: boolean;
  hurtProgress: number;
  displayHp: number;
  hpAnimProgress: number;
}

export interface Cell {
  x: number;
  y: number;
  terrain: TerrainType;
  occupant: Unit | null;
}

export interface BattleMapData {
  width: number;
  height: number;
  cellSize: number;
  cells: Cell[][];
}

export interface AIDecision {
  unitId: string;
  action: 'move' | 'attack' | 'skill' | 'end';
  targetX?: number;
  targetY?: number;
  targetUnitId?: string;
  skillId?: string;
}

export interface GameState {
  phase: GamePhase;
  currentTurn: TurnOwner;
  selectedUnit: Unit | null;
  selectedSkill: Skill | null;
  units: Unit[];
  battleMap: BattleMapData;
  turnNumber: number;
  gameStatus: 'playing' | 'victory' | 'defeat';
  moveableCells: { x: number; y: number }[];
  attackableUnits: string[];
  turnBannerProgress: number;
  turnBannerDirection: number;
}
