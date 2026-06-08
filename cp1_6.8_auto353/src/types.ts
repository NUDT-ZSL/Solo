export type PuppetType = 'monkey' | 'crane' | 'scholar' | 'warrior' | 'dragon';

export interface PuppetInstance {
  id: string;
  type: PuppetType;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  vx: number;
  vy: number;
  joints: number[];
  selected: boolean;
  zIndex: number;
}

export interface LightSource {
  x: number;
  y: number;
}

export interface PuppetState {
  x: number;
  y: number;
  rotation: number;
  scale: number;
}

export interface KeyframeData {
  time: number;
  puppetStates: Record<string, PuppetState>;
  lightX: number;
  lightY: number;
}

export interface ShadowData {
  offsetX: number;
  offsetY: number;
  scaleX: number;
  scaleY: number;
  opacity: number;
  blur: number;
}

export interface PuppetDefinition {
  type: PuppetType;
  name: string;
  icon: string;
  width: number;
  height: number;
}

export const PUPPET_DEFINITIONS: PuppetDefinition[] = [
  { type: 'monkey', name: '灵猴', icon: '🐒', width: 100, height: 140 },
  { type: 'crane', name: '仙鹤', icon: '🦢', width: 120, height: 150 },
  { type: 'scholar', name: '书生', icon: '📚', width: 90, height: 160 },
  { type: 'warrior', name: '武将', icon: '⚔️', width: 110, height: 160 },
  { type: 'dragon', name: '蛟龙', icon: '🐉', width: 180, height: 100 },
];
