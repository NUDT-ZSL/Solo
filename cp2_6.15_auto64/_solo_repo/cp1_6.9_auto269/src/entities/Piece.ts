export type PieceType = 'guardian' | 'sniper' | 'sentinel' | 'commander';

export interface PieceConfig {
  type: PieceType;
  name: string;
  attack: number;
  movePower: number;
  attackRange: number;
  specialAbility?: string;
  symbol: string;
}

export const PIECE_CONFIGS: Record<PieceType, PieceConfig> = {
  guardian: {
    type: 'guardian',
    name: '近卫',
    attack: 2,
    movePower: 3,
    attackRange: 1,
    symbol: '⚔'
  },
  sniper: {
    type: 'sniper',
    name: '狙击',
    attack: 3,
    movePower: 2,
    attackRange: 2,
    symbol: '🎯'
  },
  sentinel: {
    type: 'sentinel',
    name: '哨卫',
    attack: 1,
    movePower: 4,
    attackRange: 1,
    specialAbility: '减速结界',
    symbol: '🛡'
  },
  commander: {
    type: 'commander',
    name: '主帅',
    attack: 1,
    movePower: 2,
    attackRange: 1,
    symbol: '♔'
  }
};

export interface Position {
  x: number;
  y: number;
}

export interface RecordedAction {
  type: 'move' | 'attack' | 'none';
  from: Position;
  to: Position;
  targetId?: string;
}

export class Piece {
  public id: string;
  public playerId: number;
  public type: PieceType;
  public config: PieceConfig;
  public position: Position;
  public hp: number;
  public maxHp: number;
  public hasActed: boolean;
  public shadowCount: number;
  public sprite: Phaser.GameObjects.Container | null;

  private static nextId = 0;

  constructor(playerId: number, type: PieceType, position: Position) {
    this.id = `piece_${playerId}_${type}_${Piece.nextId++}`;
    this.playerId = playerId;
    this.type = type;
    this.config = PIECE_CONFIGS[type];
    this.position = { ...position };
    this.hp = this.config.attack > 2 ? 4 : 3;
    this.maxHp = this.hp;
    this.hasActed = false;
    this.shadowCount = 0;
    this.sprite = null;
  }

  public getPlayerColor(): number {
    return this.playerId === 1 ? 0x4fc3f7 : 0xef5350;
  }

  public getPlayerColorHex(): string {
    return this.playerId === 1 ? '#4fc3f7' : '#ef5350';
  }

  public manhattanDistanceTo(target: Position): number {
    return Math.abs(this.position.x - target.x) + Math.abs(this.position.y - target.y);
  }

  public chebyshevDistanceTo(target: Position): number {
    return Math.max(
      Math.abs(this.position.x - target.x),
      Math.abs(this.position.y - target.y)
    );
  }

  public canMoveTo(target: Position): boolean {
    return this.manhattanDistanceTo(target) <= this.config.movePower &&
           !(this.position.x === target.x && this.position.y === target.y);
  }

  public canAttack(target: Position): boolean {
    return this.chebyshevDistanceTo(target) <= this.config.attackRange &&
           !(this.position.x === target.x && this.position.y === target.y);
  }

  public move(target: Position): Position {
    const oldPosition = { ...this.position };
    this.position = { ...target };
    return oldPosition;
  }

  public takeDamage(damage: number): boolean {
    this.hp -= damage;
    return this.hp <= 0;
  }

  public isAlive(): boolean {
    return this.hp > 0;
  }

  public getShadowAttackPower(): number {
    return Math.ceil(this.config.attack / 2);
  }
}
