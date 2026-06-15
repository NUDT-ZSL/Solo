export interface TreasureChest {
  x: number;
  y: number;
  width: number;
  height: number;
  isOpen: boolean;
  glowAlpha: number;
  openProgress: number;
  content: string;
  contentValue: number;
  coins: Array<{ x: number; y: number; vx: number; vy: number; life: number; radius: number }>;
}

export interface Shark {
  x: number;
  y: number;
  angle: number;
  patrolPath: Array<{ x: number; y: number }>;
  currentPathIndex: number;
  speed: number;
  isChasing: boolean;
  chaseTimer: number;
}

export interface ShipEntrance {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GameConfig {
  CHEST_COUNT: number;
  CHEST_WIDTH: number;
  CHEST_HEIGHT: number;
  CHEST_INTERACT_RADIUS: number;
  PLAYER_RADIUS: number;
  PLAYER_SPEED: number;
  SHARK_SIZE: number;
  SHARK_PATROL_SPEED: number;
  SHARK_CHASE_SPEED: number;
  SHARK_CHASE_RADIUS: number;
  OXYGEN_MAX: number;
  OXYGEN_DRAIN_RATE: number;
  OXYGEN_DRAIN_RATE_IN_SHIP: number;
  OXYGEN_LOW_THRESHOLD: number;
  OXYGEN_CRITICAL_THRESHOLD: number;
  SURFACE_WIDTH: number;
  SURFACE_HEIGHT: number;
  LIGHTBEAM_ANGLE: number;
  LIGHTBEAM_LENGTH: number;
  SHIP_ENTRANCE_COUNT: number;
  SHIP_ENTRANCE_WIDTH: number;
  SHIP_ENTRANCE_HEIGHT: number;
}

export const CONFIG: GameConfig = {
  CHEST_COUNT: 25,
  CHEST_WIDTH: 30,
  CHEST_HEIGHT: 20,
  CHEST_INTERACT_RADIUS: 30,
  PLAYER_RADIUS: 12,
  PLAYER_SPEED: 120,
  SHARK_SIZE: 40,
  SHARK_PATROL_SPEED: 60,
  SHARK_CHASE_SPEED: 120,
  SHARK_CHASE_RADIUS: 80,
  OXYGEN_MAX: 100,
  OXYGEN_DRAIN_RATE: 0.5,
  OXYGEN_DRAIN_RATE_IN_SHIP: 1.0,
  OXYGEN_LOW_THRESHOLD: 20,
  OXYGEN_CRITICAL_THRESHOLD: 10,
  SURFACE_WIDTH: 100,
  SURFACE_HEIGHT: 20,
  LIGHTBEAM_ANGLE: 45,
  LIGHTBEAM_LENGTH: 150,
  SHIP_ENTRANCE_COUNT: 3,
  SHIP_ENTRANCE_WIDTH: 30,
  SHIP_ENTRANCE_HEIGHT: 40,
};

export const COLORS = {
  SEA_TOP: '#001f3f',
  SEA_BOTTOM: '#003366',
  SAND_BASE: '#c2b280',
  HULL_DARK: '#4e342e',
  CHEST_GOLD: '#ffd700',
  PLAYER_HEAD: '#ffcc80',
  PLAYER_SUIT: '#1565c0',
  OXYGEN_BG: '#1a237e',
  OXYGEN_GREEN: '#4caf50',
  OXYGEN_YELLOW: '#ffeb3b',
  OXYGEN_RED: '#f44336',
  SHARK_BODY: '#455a64',
  SURFACE_COLOR: '#4fc3f7',
  UI_TEXT: '#b3e5fc',
  WARNING_RED: '#f44336',
};

const TREASURE_TYPES = [
  { content: '金币', valueMin: 3, valueMax: 8 },
  { content: '宝石', valueMin: 1, valueMax: 3 },
  { content: '地图碎片', valueMin: 1, valueMax: 1 },
];

export function generateChests(canvasW: number, canvasH: number, shipX: number, shipY: number): TreasureChest[] {
  const chests: TreasureChest[] = [];
  for (let i = 0; i < CONFIG.CHEST_COUNT; i++) {
    const type = TREASURE_TYPES[Math.floor(Math.random() * TREASURE_TYPES.length)];
    const value = type.valueMin + Math.floor(Math.random() * (type.valueMax - type.valueMin + 1));
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * 160;
    chests.push({
      x: shipX + Math.cos(angle) * dist,
      y: shipY + Math.sin(angle) * dist,
      width: CONFIG.CHEST_WIDTH,
      height: CONFIG.CHEST_HEIGHT,
      isOpen: false,
      glowAlpha: 0,
      openProgress: 0,
      content: type.content,
      contentValue: value,
      coins: [],
    });
  }
  return chests;
}

export function generateSharkPaths(shipX: number, shipY: number, count: number, canvasW: number, canvasH: number): Shark[] {
  const sharks: Shark[] = [];
  for (let i = 0; i < count; i++) {
    const pathPoints: Array<{ x: number; y: number }> = [];
    const numPoints = 6 + Math.floor(Math.random() * 3);
    const baseAngle = (Math.PI * 2 / count) * i;
    for (let j = 0; j < numPoints; j++) {
      const a = baseAngle + (Math.PI * 2 / numPoints) * j + (Math.random() - 0.5) * 0.5;
      const r = 80 + Math.random() * 120;
      pathPoints.push({
        x: Math.max(50, Math.min(canvasW - 50, shipX + Math.cos(a) * r)),
        y: Math.max(80, Math.min(canvasH - 80, shipY + Math.sin(a) * r)),
      });
    }
    sharks.push({
      x: pathPoints[0].x,
      y: pathPoints[0].y,
      angle: 0,
      patrolPath: pathPoints,
      currentPathIndex: 0,
      speed: CONFIG.SHARK_PATROL_SPEED,
      isChasing: false,
      chaseTimer: 0,
    });
  }
  return sharks;
}

export function generateShipEntrances(shipX: number, shipY: number, shipW: number, shipH: number): ShipEntrance[] {
  const entrances: ShipEntrance[] = [];
  const spacing = shipW / (CONFIG.SHIP_ENTRANCE_COUNT + 1);
  for (let i = 1; i <= CONFIG.SHIP_ENTRANCE_COUNT; i++) {
    entrances.push({
      x: shipX - shipW / 2 + spacing * i - CONFIG.SHIP_ENTRANCE_WIDTH / 2,
      y: shipY - CONFIG.SHIP_ENTRANCE_HEIGHT / 2,
      width: CONFIG.SHIP_ENTRANCE_WIDTH,
      height: CONFIG.SHIP_ENTRANCE_HEIGHT,
    });
  }
  return entrances;
}
