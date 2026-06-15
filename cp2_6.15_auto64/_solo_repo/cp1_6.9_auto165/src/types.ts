export interface Vec2 {
  x: number;
  y: number;
}

export interface GridPos {
  gx: number;
  gy: number;
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  action: boolean;
  actionPressed: boolean;
}

export type FireflyState = 'patrol' | 'alert' | 'stunned';

export interface LandingEffect {
  startTime: number;
  duration: number;
  pos: Vec2;
}

export interface SilkPlacementRipple {
  startTime: number;
  duration: number;
  pos: Vec2;
}

export interface StepRipple {
  startTime: number;
  duration: number;
  pos: Vec2;
}

export interface IEntity {
  id: number;
  pos: Vec2;
  alive: boolean;
}

export interface GameStateSnapshot {
  silkCount: number;
  levelIndex: number;
  totalLevels: number;
  spiderPos: Vec2;
  isInvincible: boolean;
}
