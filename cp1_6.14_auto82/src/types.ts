export enum ToolType {
  SELECT = 'select',
  ENEMY_SPAWN = 'enemy_spawn',
  COVER = 'cover',
  AMMO_BOX = 'ammo_box',
  EXIT = 'exit',
}

export interface PathNode {
  id: string;
  x: number;
  y: number;
}

export interface SceneElement {
  id: string;
  type: ToolType;
  x: number;
  y: number;
}

export interface EnemySpawn extends SceneElement {
  type: ToolType.ENEMY_SPAWN;
  pathNodes: PathNode[];
  patrolSpeed: number;
}

export interface Cover extends SceneElement {
  type: ToolType.COVER;
  width: number;
  height: number;
}

export interface AmmoBox extends SceneElement {
  type: ToolType.AMMO_BOX;
}

export interface Exit extends SceneElement {
  type: ToolType.EXIT;
}

export type LevelElement = EnemySpawn | Cover | AmmoBox | Exit;

export interface LevelData {
  elements: LevelElement[];
}

export interface PlayerState {
  x: number;
  y: number;
  radius: number;
  speed: number;
}

export interface BulletState {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
}

export interface EnemySimState {
  id: string;
  x: number;
  y: number;
  radius: number;
  pathNodes: PathNode[];
  currentNodeIndex: number;
  speed: number;
  flashTimer: number;
  alive: boolean;
}

export interface ParticleState {
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

export interface GameState {
  player: PlayerState;
  bullets: BulletState[];
  enemies: EnemySimState[];
  particles: ParticleState[];
  covers: Cover[];
  keys: Record<string, boolean>;
  mouseX: number;
  mouseY: number;
  running: boolean;
  animFrameId: number;
  lastTime: number;
}

export interface EditorState {
  currentTool: ToolType;
  elements: LevelElement[];
  camera: {
    offsetX: number;
    offsetY: number;
    zoom: number;
  };
  selectedElementId: string | null;
  draggingNodeId: string | null;
  isPanning: boolean;
  panStartX: number;
  panStartY: number;
  panOffsetStartX: number;
  panOffsetStartY: number;
  isSimulating: boolean;
}
