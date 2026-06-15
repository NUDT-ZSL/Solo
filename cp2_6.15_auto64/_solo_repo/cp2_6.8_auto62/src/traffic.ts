export type Direction = 'north' | 'south' | 'east' | 'west';
export type Trajectory = 'left' | 'straight' | 'right';
export type LightColor = 'red' | 'yellow' | 'green';
export type Phase = 'northSouth' | 'eastWest';

export interface Vehicle {
  id: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
  targetSpeed: number;
  direction: Direction;
  trajectory: Trajectory;
  waitTime: number;
  color: string;
  stopped: boolean;
  passed: boolean;
  currentIntersection: Intersection | null;
  laneIndex: number;
  frontVehicle: Vehicle | null;
  turning: boolean;
  turnProgress: number;
  turnCenterX: number;
  turnCenterY: number;
  turnRadius: number;
  turnStartAngle: number;
  turnEndAngle: number;
}

export interface Lane {
  id: string;
  direction: Direction;
  intersection: Intersection;
  stopLineX: number;
  stopLineY: number;
  queueLength: number;
}

export interface TrafficSignal {
  currentPhase: Phase;
  currentLight: LightColor;
  remainingTime: number;
  greenDuration: number;
  yellowDuration: number;
  nextGreenDuration: number;
  pendingStrategyUpdate: boolean;
}

export interface Intersection {
  id: string;
  gridX: number;
  gridY: number;
  centerX: number;
  centerY: number;
  isMainRoad: boolean;
  lanes: { [key in Direction]: Lane[] };
  signal: TrafficSignal;
  trafficHistory: number[];
  currentSecondCount: number;
}

export interface TrafficConfig {
  gridSize: number;
  roadWidth: number;
  laneWidth: number;
  intersectionSize: number;
  cellSize: number;
  canvasWidth: number;
  canvasHeight: number;
}

export const COLORS = {
  bg: '#1A1A2E',
  road: '#2D2D44',
  laneLine: '#FFFFFF',
  vehicleStart: '#4A90D9',
  vehicleEnd: '#D94A4A',
  red: '#E24A4A',
  yellow: '#E2C74A',
  green: '#4AE27A',
  highlight: 'rgba(255,220,80,0.3)'
};

export function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r},${g},${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 0, g: 0, b: 0 };
}

export function createConfig(canvasWidth: number, canvasHeight: number, gridSize = 3): TrafficConfig {
  const cellSize = Math.min(canvasWidth, canvasHeight) / (gridSize + 1);
  const roadWidth = Math.floor(cellSize * 0.35);
  const laneWidth = Math.floor(roadWidth / 2);
  const intersectionSize = roadWidth * 2;
  return { gridSize, roadWidth, laneWidth, intersectionSize, cellSize, canvasWidth, canvasHeight };
}

export function createIntersections(config: TrafficConfig): Intersection[] {
  const intersections: Intersection[] = [];
  const offsetX = (config.canvasWidth - (config.gridSize - 1) * config.cellSize) / 2;
  const offsetY = (config.canvasHeight - (config.gridSize - 1) * config.cellSize) / 2;

  for (let gy = 0; gy < config.gridSize; gy++) {
    for (let gx = 0; gx < config.gridSize; gx++) {
      const centerX = offsetX + gx * config.cellSize;
      const centerY = offsetY + gy * config.cellSize;
      const isMainRoad = gx === 1 || gy === 1;

      const intersection: Intersection = {
        id: `int_${gx}_${gy}`,
        gridX: gx,
        gridY: gy,
        centerX,
        centerY,
        isMainRoad,
        lanes: { north: [], south: [], east: [], west: [] },
        signal: {
          currentPhase: 'northSouth',
          currentLight: 'green',
          remainingTime: 30,
          greenDuration: 30,
          yellowDuration: 3,
          nextGreenDuration: 30,
          pendingStrategyUpdate: false
        },
        trafficHistory: [],
        currentSecondCount: 0
      };

      const rw = config.roadWidth;
      const lw = config.laneWidth;
      const halfRoad = rw;

      intersection.lanes.north = [0, 1, 2].map(i => ({
        id: `${intersection.id}_n_${i}`,
        direction: 'north',
        intersection,
        stopLineX: centerX + (i - 1) * lw,
        stopLineY: centerY + halfRoad,
        queueLength: 0
      }));
      intersection.lanes.south = [0, 1, 2].map(i => ({
        id: `${intersection.id}_s_${i}`,
        direction: 'south',
        intersection,
        stopLineX: centerX - (i - 1) * lw,
        stopLineY: centerY - halfRoad,
        queueLength: 0
      }));
      intersection.lanes.east = [0, 1, 2].map(i => ({
        id: `${intersection.id}_e_${i}`,
        direction: 'east',
        intersection,
        stopLineX: centerX - halfRoad,
        stopLineY: centerY - (i - 1) * lw,
        queueLength: 0
      }));
      intersection.lanes.west = [0, 1, 2].map(i => ({
        id: `${intersection.id}_w_${i}`,
        direction: 'west',
        intersection,
        stopLineX: centerX + halfRoad,
        stopLineY: centerY + (i - 1) * lw,
        queueLength: 0
      }));

      intersections.push(intersection);
    }
  }
  return intersections;
}

let vehicleIdCounter = 0;

export function spawnVehicle(
  config: TrafficConfig,
  intersections: Intersection[],
  vehicles: Vehicle[]
): Vehicle | null {
  const edges: Direction[] = ['north', 'south', 'east', 'west'];
  const direction = edges[Math.floor(Math.random() * edges.length)];

  const randomIntersection = intersections[Math.floor(Math.random() * intersections.length)];
  const gridX = randomIntersection.gridX;
  const gridY = randomIntersection.gridY;

  const offsetX = (config.canvasWidth - (config.gridSize - 1) * config.cellSize) / 2;
  const offsetY = (config.canvasHeight - (config.gridSize - 1) * config.cellSize) / 2;
  const lw = config.laneWidth;
  const halfRoad = config.roadWidth;

  let x = 0, y = 0, angle = 0;
  const laneIndex = Math.floor(Math.random() * 3);

  switch (direction) {
    case 'south':
      x = offsetX + gridX * config.cellSize + (laneIndex - 1) * lw;
      y = -10;
      angle = Math.PI / 2;
      break;
    case 'north':
      x = offsetX + gridX * config.cellSize - (laneIndex - 1) * lw;
      y = config.canvasHeight + 10;
      angle = -Math.PI / 2;
      break;
    case 'east':
      x = -10;
      y = offsetY + gridY * config.cellSize - (laneIndex - 1) * lw;
      angle = 0;
      break;
    case 'west':
      x = config.canvasWidth + 10;
      y = offsetY + gridY * config.cellSize + (laneIndex - 1) * lw;
      angle = Math.PI;
      break;
  }

  const trajectories: Trajectory[] = ['left', 'straight', 'right'];
  const weights = [0.2, 0.6, 0.2];
  let r = Math.random();
  let trajectory: Trajectory = 'straight';
  let cum = 0;
  for (let i = 0; i < trajectories.length; i++) {
    cum += weights[i];
    if (r < cum) { trajectory = trajectories[i]; break; }
  }

  return {
    id: ++vehicleIdCounter,
    x, y, angle,
    speed: 2,
    targetSpeed: 2,
    direction,
    trajectory,
    waitTime: 0,
    color: COLORS.vehicleStart,
    stopped: false,
    passed: false,
    currentIntersection: null,
    laneIndex,
    frontVehicle: null,
    turning: false,
    turnProgress: 0,
    turnCenterX: 0,
    turnCenterY: 0,
    turnRadius: 0,
    turnStartAngle: 0,
    turnEndAngle: 0
  };
}

const DIRECTION_VECTOR: { [key in Direction]: { dx: number; dy: number } } = {
  north: { dx: 0, dy: -1 },
  south: { dx: 0, dy: 1 },
  east: { dx: 1, dy: 0 },
  west: { dx: -1, dy: 0 }
};

const TURN_ANGLES: { [key in Direction]: { [key in Trajectory]: number } } = {
  north: { left: Math.PI, straight: -Math.PI / 2, right: 0 },
  south: { left: 0, straight: Math.PI / 2, right: Math.PI },
  east: { left: -Math.PI / 2, straight: 0, right: Math.PI / 2 },
  west: { left: Math.PI / 2, straight: Math.PI, right: -Math.PI / 2 }
};

const AFTER_TURN_DIRECTION: { [key in Direction]: { [key in Trajectory]: Direction } } = {
  north: { left: 'west', straight: 'north', right: 'east' },
  south: { left: 'east', straight: 'south', right: 'west' },
  east: { left: 'north', straight: 'east', right: 'south' },
  west: { left: 'south', straight: 'west', right: 'north' }
};

export function canGo(direction: Direction, signal: TrafficSignal): boolean {
  if (signal.currentLight === 'red') return false;
  if (signal.currentLight === 'yellow') return true;
  if (signal.currentPhase === 'northSouth') {
    return direction === 'north' || direction === 'south';
  }
  return direction === 'east' || direction === 'west';
}

function pointToLineDist(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
  const A = px - x1, B = py - y1, C = x2 - x1, D = y2 - y1;
  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = lenSq !== 0 ? dot / lenSq : -1;
  let xx, yy;
  if (param < 0) { xx = x1; yy = y1; }
  else if (param > 1) { xx = x2; yy = y2; }
  else { xx = x1 + param * C; yy = y1 + param * D; }
  const dx = px - xx, dy = py - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

export function findNearestIntersection(
  v: Vehicle,
  intersections: Intersection[],
  config: TrafficConfig
): Intersection | null {
  const dir = DIRECTION_VECTOR[v.direction];
  let nearest: Intersection | null = null;
  let nearestDist = Infinity;

  for (const it of intersections) {
    const lanes = it.lanes[v.direction];
    if (!lanes || lanes.length === 0) continue;
    const lane = lanes[v.laneIndex] || lanes[1];
    const dx = lane.stopLineX - v.x;
    const dy = lane.stopLineY - v.y;
    const along = dx * dir.dx + dy * dir.dy;
    const perpDist = Math.abs(dx * (-dir.dy) + dy * dir.dx);

    if (along > -5 && along < nearestDist && perpDist < config.laneWidth * 1.5) {
      nearestDist = along;
      nearest = it;
    }
  }
  return nearest;
}

function startTurn(v: Vehicle, intersection: Intersection, config: TrafficConfig) {
  if (v.trajectory === 'straight') return;
  const lw = config.laneWidth;
  const ic = intersection.centerX, jc = intersection.centerY;
  v.turning = true;
  v.turnProgress = 0;
  v.turnStartAngle = v.angle;
  v.turnEndAngle = TURN_ANGLES[v.direction][v.trajectory];
  v.turnRadius = lw * 1.2;

  const dir = v.direction;
  const traj = v.trajectory;
  const sign = traj === 'left' ? 1 : -1;
  const r = v.turnRadius;

  if (dir === 'south') {
    v.turnCenterX = ic + sign * r;
    v.turnCenterY = jc;
  } else if (dir === 'north') {
    v.turnCenterX = ic - sign * r;
    v.turnCenterY = jc;
  } else if (dir === 'east') {
    v.turnCenterX = ic;
    v.turnCenterY = jc + sign * r;
  } else {
    v.turnCenterX = ic;
    v.turnCenterY = jc - sign * r;
  }
}

export function updateVehicle(
  v: Vehicle,
  intersections: Intersection[],
  allVehicles: Vehicle[],
  config: TrafficConfig,
  dt: number
): { removed: boolean; passedIntersection: Intersection | null } {
  let passedIntersection: Intersection | null = null;

  if (v.turning) {
    const turnSpeed = 0.04 * dt;
    v.turnProgress += turnSpeed;
    if (v.turnProgress >= 1) {
      v.turnProgress = 1;
      v.turning = false;
      v.angle = v.turnEndAngle;
      v.direction = AFTER_TURN_DIRECTION[v.direction][v.trajectory];
      v.currentIntersection = null;
      v.trajectory = 'straight';
    } else {
      const t = v.turnProgress;
      const isLeft = v.trajectory === 'left';
      const dir = v.direction;
      const sign = isLeft ? 1 : -1;
      let startAng = 0;
      if (dir === 'south') startAng = isLeft ? -Math.PI / 2 : Math.PI / 2;
      else if (dir === 'north') startAng = isLeft ? Math.PI / 2 : -Math.PI / 2;
      else if (dir === 'east') startAng = isLeft ? Math.PI : 0;
      else startAng = isLeft ? 0 : Math.PI;

      const sweep = isLeft ? -Math.PI / 2 : Math.PI / 2;
      const curAng = startAng + sweep * t;
      v.x = v.turnCenterX + Math.cos(curAng) * v.turnRadius;
      v.y = v.turnCenterY + Math.sin(curAng) * v.turnRadius;
      v.angle = curAng + (isLeft ? -Math.PI / 2 : Math.PI / 2);
    }
  } else {
    const dir = DIRECTION_VECTOR[v.direction];
    let shouldStop = false;
    let stopDist = 15;

    if (!v.currentIntersection) {
      v.currentIntersection = findNearestIntersection(v, intersections, config);
    }

    if (v.currentIntersection) {
      const it = v.currentIntersection;
      const lanes = it.lanes[v.direction];
      const lane = lanes?.[v.laneIndex] || lanes?.[1];
      if (lane) {
        const distToStop = (lane.stopLineX - v.x) * dir.dx + (lane.stopLineY - v.y) * dir.dy;
        if (distToStop > -2 && distToStop < stopDist + 10) {
          if (!canGo(v.direction, it.signal)) {
            if (distToStop > 0 && distToStop < stopDist + 10) {
              shouldStop = true;
            }
          }
        }
        if (distToStop < -8 && !v.passed) {
          if (!v.passed) {
            v.passed = true;
            it.currentSecondCount++;
            passedIntersection = it;
          }
          if (v.trajectory !== 'straight' && !v.turning) {
            startTurn(v, it, config);
          } else {
            v.currentIntersection = null;
          }
        }
      }
    }

    let minDist = 10;
    for (const other of allVehicles) {
      if (other.id === v.id) continue;
      if (other.direction !== v.direction) continue;
      if (other.turning) continue;
      const dx = other.x - v.x;
      const dy = other.y - v.y;
      const along = dx * dir.dx + dy * dir.dy;
      const perp = Math.abs(dx * (-dir.dy) + dy * dir.dx);
      if (along > 0 && along < 14 && perp < 4) {
        minDist = Math.min(minDist, along);
        shouldStop = true;
      }
    }

    const accel = 0.25 * dt;
    if (shouldStop) {
      v.targetSpeed = 0;
      v.waitTime += dt;
      v.stopped = true;
    } else {
      v.targetSpeed = 2;
      v.stopped = false;
    }

    if (v.speed < v.targetSpeed) {
      v.speed = Math.min(v.speed + accel, v.targetSpeed);
    } else if (v.speed > v.targetSpeed) {
      v.speed = Math.max(v.speed - accel * 1.5, v.targetSpeed);
    }

    v.x += dir.dx * v.speed;
    v.y += dir.dy * v.speed;
  }

  const waitSec = v.waitTime / 60;
  const colorT = Math.min(waitSec / 15, 1);
  v.color = lerpColor(COLORS.vehicleStart, COLORS.vehicleEnd, colorT);

  const margin = 40;
  if (v.x < -margin || v.x > config.canvasWidth + margin ||
      v.y < -margin || v.y > config.canvasHeight + margin) {
    return { removed: true, passedIntersection };
  }
  return { removed: false, passedIntersection };
}

export function updateSignals(
  intersections: Intersection[],
  getGreenDuration: (it: Intersection, phase: Phase) => number,
  dt: number
) {
  for (const it of intersections) {
    it.signal.remainingTime -= dt / 60;
    if (it.signal.remainingTime <= 0) {
      advanceSignal(it, getGreenDuration);
    }
  }
}

function advanceSignal(
  it: Intersection,
  getGreenDuration: (it: Intersection, phase: Phase) => number
) {
  const s = it.signal;
  if (s.currentLight === 'green') {
    s.currentLight = 'yellow';
    s.remainingTime = s.yellowDuration;
  } else if (s.currentLight === 'yellow') {
    s.currentLight = 'red';
    const nextPhase: Phase = s.currentPhase === 'northSouth' ? 'eastWest' : 'northSouth';
    s.currentPhase = nextPhase;
    const greenDur = s.pendingStrategyUpdate ? s.nextGreenDuration : getGreenDuration(it, nextPhase);
    s.greenDuration = greenDur;
    s.remainingTime = greenDur;
    s.pendingStrategyUpdate = false;
    s.currentLight = 'green';
  }
}

export function updateIntersectionHistory(intersections: Intersection[]) {
  for (const it of intersections) {
    it.trafficHistory.push(it.currentSecondCount);
    if (it.trafficHistory.length > 30) it.trafficHistory.shift();
    it.currentSecondCount = 0;
  }
}

export function calculateQueueLengths(intersections: Intersection[], vehicles: Vehicle[]) {
  for (const it of intersections) {
    for (const dir of ['north', 'south', 'east', 'west'] as Direction[]) {
      for (const lane of it.lanes[dir]) {
        lane.queueLength = 0;
      }
    }
  }
  for (const v of vehicles) {
    if (!v.stopped || !v.currentIntersection) continue;
    const it = v.currentIntersection;
    const lanes = it.lanes[v.direction];
    const lane = lanes[v.laneIndex] || lanes[1];
    if (lane) lane.queueLength++;
  }
}
