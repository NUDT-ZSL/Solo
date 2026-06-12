export type ElementType = 'ground' | 'wall' | 'enemy' | 'coin';

export interface BaseElement {
  id: string;
  type: ElementType;
  x: number;
  y: number;
}

export interface GroundElement extends BaseElement {
  type: 'ground';
  width: number;
  height: number;
}

export interface WallElement extends BaseElement {
  type: 'wall';
  width: number;
  height: number;
}

export interface EnemyElement extends BaseElement {
  type: 'enemy';
  patrolRange: number;
}

export interface CoinElement extends BaseElement {
  type: 'coin';
  value: 10 | 30 | 50;
}

export type LevelElement = GroundElement | WallElement | EnemyElement | CoinElement;

export interface Level {
  _id?: string;
  name: string;
  elements: LevelElement[];
  createdAt?: number;
  updatedAt?: number;
}

export interface LevelSummary {
  _id: string;
  name: string;
  updatedAt: number;
  createdAt: number;
}
