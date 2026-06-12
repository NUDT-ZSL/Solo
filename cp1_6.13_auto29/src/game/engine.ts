export interface Point {
  x: number;
  y: number;
}

export interface Car {
  id: number;
  x: number;
  y: number;
  angle: number;
  speed: number;
  maxSpeed: number;
  acceleration: number;
  friction: number;
  turnSpeed: number;
  lap: number;
  lapTimes: number[];
  lastCheckpointTime: number;
  checkpointIndex: number;
  isPlayer: boolean;
  color: string;
  flashTimer: number;
  totalTime: number;
  finished: boolean;
  lastStartSide: number;
  lastTrackIndex: number;
}

export interface InputState {
  accelerate: boolean;
  brake: boolean;
  left: boolean;
  right: boolean;
}

export interface TrackSegment {
  type: 'line' | 'curve';
  start: Point;
  end: Point;
  controlPoint?: Point;
  radius?: number;
  center?: Point;
  startAngle?: number;
  endAngle?: number;
}

export interface GuardRail {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  angle: number;
}

export interface Track {
  width: number;
  height: number;
  trackWidth: number;
  segments: TrackSegment[];
  centerline: Point[];
  guardRails: GuardRail[];
  startLine: Point;
  startAngle: number;
  checkpoints: Point[];
  startLineNormal: Point;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const TRACK_WIDTH = 80;
const GUARD_RAIL_HEIGHT = 8;
const GUARD_RAIL_LENGTH = 20;
const GRID_CELL_SIZE = 40;
const CAR_RADIUS = 10;

function segmentsIntersect(
  a1: Point, a2: Point,
  b1: Point, b2: Point,
  ignoreEndpoints: boolean = true
): boolean {
  const d1x = a2.x - a1.x;
  const d1y = a2.y - a1.y;
  const d2x = b2.x - b1.x;
  const d2y = b2.y - b1.y;
  
  const denom = d1x * d2y - d1y * d2x;
  
  if (Math.abs(denom) < 0.0001) {
    return false;
  }
  
  const t = ((b1.x - a1.x) * d2y - (b1.y - a1.y) * d2x) / denom;
  const s = ((b1.x - a1.x) * d1y - (b1.y - a1.y) * d1x) / denom;
  
  if (ignoreEndpoints) {
    return t > 0.01 && t < 0.99 && s > 0.01 && s < 0.99;
  } else {
    return t >= 0 && t <= 1 && s >= 0 && s <= 1;
  }
}

function checkSelfIntersection(points: Point[], newPointIdx: number): boolean {
  if (newPointIdx < 2) return false;
  
  const newStart = points[newPointIdx - 1];
  const newEnd = points[newPointIdx];
  
  for (let i = 0; i < newPointIdx - 2; i++) {
    if (segmentsIntersect(newStart, newEnd, points[i], points[i + 1])) {
      return true;
    }
  }
  
  return false;
}

export function generateTrack(): Track {
  const centerX = CANVAS_WIDTH / 2;
  const centerY = CANVAS_HEIGHT / 2;
  
  const numPoints = 12;
  const baseRadiusX = 280;
  const baseRadiusY = 200;
  
  let points: Point[] = [];
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    points = [];
    let valid = true;
    const angleStep = (Math.PI * 2) / numPoints;
    
    for (let i = 0; i < numPoints; i++) {
      const angle = i * angleStep;
      const radiusVariation = 0.7 + Math.random() * 0.6;
      const rx = baseRadiusX * radiusVariation;
      const ry = baseRadiusY * radiusVariation;
      
      const x = centerX + Math.cos(angle) * rx + (Math.random() - 0.5) * 40;
      const y = centerY + Math.sin(angle) * ry + (Math.random() - 0.5) * 30;
      
      points.push({ x, y });
      
      if (i >= 2 && checkSelfIntersection(points, i)) {
        valid = false;
        break;
      }
    }
    
    if (valid) {
      const lastIdx = points.length - 1;
      if (!segmentsIntersect(points[lastIdx], points[0], points[1], points[lastIdx - 1])) {
        break;
      }
    }
    
    attempts++;
  }
  
  const centerline = smoothPoints(points, 3);
  
  const segments: TrackSegment[] = [];
  for (let i = 0; i < centerline.length; i++) {
    const p1 = centerline[i];
    const p2 = centerline[(i + 1) % centerline.length];
    segments.push({
      type: 'line',
      start: p1,
      end: p2
    });
  }
  
  const guardRails = generateGuardRails(centerline);
  
  const startLine = centerline[0];
  const startAngle = Math.atan2(
    centerline[1].y - centerline[0].y,
    centerline[1].x - centerline[0].x
  );
  
  const startLineNormal = {
    x: -Math.sin(startAngle),
    y: Math.cos(startAngle)
  };
  
  const checkpoints = centerline.filter((_, i) => i % 3 === 0);
  
  return {
    width: CANVAS_WIDTH,
    height: CANVAS_HEIGHT,
    trackWidth: TRACK_WIDTH,
    segments,
    centerline,
    guardRails,
    startLine,
    startAngle,
    checkpoints,
    startLineNormal
  };
}

function smoothPoints(points: Point[], iterations: number): Point[] {
  let result = [...points];
  
  for (let iter = 0; iter < iterations; iter++) {
    const smoothed: Point[] = [];
    
    for (let i = 0; i < result.length; i++) {
      const prev = result[(i - 1 + result.length) % result.length];
      const curr = result[i];
      const next = result[(i + 1) % result.length];
      
      smoothed.push({
        x: (prev.x + curr.x * 2 + next.x) / 4,
        y: (prev.y + curr.y * 2 + next.y) / 4
      });
    }
    
    result = smoothed;
  }
  
  const densePoints: Point[] = [];
  for (let i = 0; i < result.length; i++) {
    const p1 = result[i];
    const p2 = result[(i + 1) % result.length];
    const dist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    const steps = Math.max(2, Math.floor(dist / 15));
    
    for (let j = 0; j < steps; j++) {
      const t = j / steps;
      densePoints.push({
        x: p1.x + (p2.x - p1.x) * t,
        y: p1.y + (p2.y - p1.y) * t
      });
    }
  }
  
  return densePoints;
}

function generateGuardRails(centerline: Point[]): GuardRail[] {
  const guardRails: GuardRail[] = [];
  
  for (let i = 0; i < centerline.length; i++) {
    const p1 = centerline[i];
    const p2 = centerline[(i + 1) % centerline.length];
    
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const len = Math.hypot(dx, dy);
    const nx = -dy / len;
    const ny = dx / len;
    
    const angle = Math.atan2(dy, dx);
    
    const guardRailCount = Math.floor(len / GUARD_RAIL_LENGTH);
    
    for (let j = 0; j < guardRailCount; j++) {
      const t = (j + 0.5) / guardRailCount;
      const cx = p1.x + dx * t;
      const cy = p1.y + dy * t;
      
      const isRed = (i + j) % 2 === 0;
      const color = isRed ? '#ef4444' : '#ffffff';
      
      guardRails.push({
        x: cx + nx * (TRACK_WIDTH / 2 + GUARD_RAIL_HEIGHT / 2),
        y: cy + ny * (TRACK_WIDTH / 2 + GUARD_RAIL_HEIGHT / 2),
        width: GUARD_RAIL_LENGTH,
        height: GUARD_RAIL_HEIGHT,
        color,
        angle
      });
      
      guardRails.push({
        x: cx - nx * (TRACK_WIDTH / 2 + GUARD_RAIL_HEIGHT / 2),
        y: cy - ny * (TRACK_WIDTH / 2 + GUARD_RAIL_HEIGHT / 2),
        width: GUARD_RAIL_LENGTH,
        height: GUARD_RAIL_HEIGHT,
        color,
        angle
      });
    }
  }
  
  return guardRails;
}

export function distanceToSegment(p: Point, a: Point, b: Point): { distance: number; closestPoint: Point; t: number } {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  
  if (lenSq === 0) {
    return { distance: Math.hypot(p.x - a.x, p.y - a.y), closestPoint: a, t: 0 };
  }
  
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  
  const closestPoint = {
    x: a.x + t * dx,
    y: a.y + t * dy
  };
  
  return {
    distance: Math.hypot(p.x - closestPoint.x, p.y - closestPoint.y),
    closestPoint,
    t
  };
}

export function isPointOnTrack(p: Point, track: Track): boolean {
  let minDist = Infinity;
  
  for (let i = 0; i < track.centerline.length; i++) {
    const a = track.centerline[i];
    const b = track.centerline[(i + 1) % track.centerline.length];
    const { distance } = distanceToSegment(p, a, b);
    minDist = Math.min(minDist, distance);
  }
  
  return minDist <= track.trackWidth / 2;
}

export function createCar(id: number, x: number, y: number, angle: number, isPlayer: boolean, color: string): Car {
  return {
    id,
    x,
    y,
    angle,
    speed: 0,
    maxSpeed: 8,
    acceleration: 0.3,
    friction: 0.98,
    turnSpeed: 3,
    lap: 0,
    lapTimes: [],
    lastCheckpointTime: 0,
    checkpointIndex: 0,
    isPlayer,
    color,
    flashTimer: 0,
    totalTime: 0,
    finished: false,
    lastStartSide: 0,
    lastTrackIndex: 0
  };
}

export class SpatialHashGrid {
  cellSize: number;
  grid: Map<string, GuardRail[]>;
  
  constructor(cellSize: number = GRID_CELL_SIZE) {
    this.cellSize = cellSize;
    this.grid = new Map();
  }
  
  clear() {
    this.grid.clear();
  }
  
  private getKey(gx: number, gy: number): string {
    return `${gx},${gy}`;
  }
  
  insert(guardRail: GuardRail) {
    const minX = Math.floor((guardRail.x - guardRail.width / 2) / this.cellSize);
    const maxX = Math.floor((guardRail.x + guardRail.width / 2) / this.cellSize);
    const minY = Math.floor((guardRail.y - guardRail.height / 2) / this.cellSize);
    const maxY = Math.floor((guardRail.y + guardRail.height / 2) / this.cellSize);
    
    for (let gx = minX; gx <= maxX; gx++) {
      for (let gy = minY; gy <= maxY; gy++) {
        const key = this.getKey(gx, gy);
        if (!this.grid.has(key)) {
          this.grid.set(key, []);
        }
        this.grid.get(key)!.push(guardRail);
      }
    }
  }
  
  queryNeighbors(x: number, y: number): GuardRail[] {
    const gx = Math.floor(x / this.cellSize);
    const gy = Math.floor(y / this.cellSize);
    
    const result: GuardRail[] = [];
    const seen = new Set<number>();
    
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const key = this.getKey(gx + dx, gy + dy);
        const cell = this.grid.get(key);
        if (cell) {
          for (const rail of cell) {
            const hash = Math.floor(rail.x * 100 + rail.y);
            if (!seen.has(hash)) {
              seen.add(hash);
              result.push(rail);
            }
          }
        }
      }
    }
    
    return result;
  }
}

export function buildSpatialGrid(guardRails: GuardRail[], cellSize: number = GRID_CELL_SIZE): SpatialHashGrid {
  const grid = new SpatialHashGrid(cellSize);
  for (const rail of guardRails) {
    grid.insert(rail);
  }
  return grid;
}

function getCollisionInfo(car: Car, grid: SpatialHashGrid): { normal: Point; penetration: number; closestPoint: Point } | null {
  let minDist = Infinity;
  let closestPoint: Point | null = null;
  
  const nearbyRails = grid.queryNeighbors(car.x, car.y);
  
  for (const rail of nearbyRails) {
    const dx = car.x - rail.x;
    const dy = car.y - rail.y;
    
    const cos = Math.cos(-rail.angle);
    const sin = Math.sin(-rail.angle);
    
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    
    const halfW = rail.width / 2;
    const halfH = rail.height / 2;
    
    const closestLocalX = Math.max(-halfW, Math.min(halfW, localX));
    const closestLocalY = Math.max(-halfH, Math.min(halfH, localY));
    
    const cosBack = Math.cos(rail.angle);
    const sinBack = Math.sin(rail.angle);
    
    const worldClosestX = rail.x + closestLocalX * cosBack - closestLocalY * sinBack;
    const worldClosestY = rail.y + closestLocalX * sinBack + closestLocalY * cosBack;
    
    const dist = Math.hypot(car.x - worldClosestX, car.y - worldClosestY);
    
    if (dist < minDist) {
      minDist = dist;
      closestPoint = { x: worldClosestX, y: worldClosestY };
    }
  }
  
  if (closestPoint && minDist < CAR_RADIUS) {
    let nx = car.x - closestPoint.x;
    let ny = car.y - closestPoint.y;
    const len = Math.hypot(nx, ny);
    
    if (len > 0) {
      nx /= len;
      ny /= len;
    } else {
      nx = 0;
      ny = -1;
    }
    
    return {
      normal: { x: nx, y: ny },
      penetration: CAR_RADIUS - minDist,
      closestPoint
    };
  }
  
  return null;
}

function reflectVelocity(vx: number, vy: number, nx: number, ny: number, bounce: number = 0.5): { vx: number; vy: number } {
  const dot = vx * nx + vy * ny;
  return {
    vx: vx - 2 * bounce * dot * nx,
    vy: vy - 2 * bounce * dot * ny
  };
}

export class GameEngine {
  track: Track;
  cars: Car[];
  grid: SpatialHashGrid;
  startTime: number;
  gameState: 'waiting' | 'racing' | 'finished';
  winner: number | null;
  maxLaps: number;
  
  constructor() {
    this.track = generateTrack();
    this.cars = [];
    this.grid = buildSpatialGrid(this.track.guardRails);
    this.startTime = 0;
    this.gameState = 'waiting';
    this.winner = null;
    this.maxLaps = 3;
    this.initCars();
  }
  
  initCars() {
    const startX = this.track.startLine.x;
    const startY = this.track.startLine.y;
    const angle = this.track.startAngle;
    
    const perpX = -Math.sin(angle);
    const perpY = Math.cos(angle);
    
    const car1 = createCar(0, startX - perpX * 20, startY - perpY * 20, angle, true, '#fbbf24');
    const car2 = createCar(1, startX + perpX * 20, startY + perpY * 20, angle, true, '#38bdf8');
    
    for (const car of [car1, car2]) {
      car.lastStartSide = this.getStartLineSide(car);
      car.lastTrackIndex = 0;
    }
    
    this.cars = [car1, car2];
  }
  
  resetGame() {
    this.track = generateTrack();
    this.grid = buildSpatialGrid(this.track.guardRails);
    this.initCars();
    this.startTime = 0;
    this.gameState = 'waiting';
    this.winner = null;
  }
  
  startGame() {
    this.gameState = 'racing';
    this.startTime = Date.now();
    
    const now = Date.now();
    for (const car of this.cars) {
      car.lastCheckpointTime = now;
      car.lastStartSide = this.getStartLineSide(car);
      car.lastTrackIndex = 0;
    }
  }
  
  private getStartLineSide(car: Car): number {
    const dx = car.x - this.track.startLine.x;
    const dy = car.y - this.track.startLine.y;
    const dot = dx * this.track.startLineNormal.x + dy * this.track.startLineNormal.y;
    return dot >= 0 ? 1 : -1;
  }
  
  update(inputs: InputState[], deltaTime: number = 1) {
    if (this.gameState !== 'racing') return;
    
    const now = Date.now();
    
    for (let i = 0; i < this.cars.length; i++) {
      const car = this.cars[i];
      const input = inputs[i];
      
      if (car.finished) continue;
      
      if (input.accelerate) {
        car.speed += car.acceleration * deltaTime;
      }
      if (input.brake) {
        car.speed -= car.acceleration * deltaTime * 0.8;
      }
      
      car.speed *= car.friction;
      
      if (car.speed > car.maxSpeed) car.speed = car.maxSpeed;
      if (car.speed < -car.maxSpeed * 0.5) car.speed = -car.maxSpeed * 0.5;
      
      const absSpeed = Math.abs(car.speed);
      const turnSpeed = absSpeed < 2 ? 3 : 1.5;
      const turnRate = (turnSpeed * Math.PI / 180) * deltaTime;
      
      if (input.left) {
        car.angle -= turnRate * (absSpeed > 0.5 ? 1 : 0.3);
      }
      if (input.right) {
        car.angle += turnRate * (absSpeed > 0.5 ? 1 : 0.3);
      }
      
      const vx = Math.cos(car.angle) * car.speed;
      const vy = Math.sin(car.angle) * car.speed;
      
      car.x += vx * deltaTime;
      car.y += vy * deltaTime;
      
      const collision = getCollisionInfo(car, this.grid);
      if (collision) {
        const { normal, penetration } = collision;
        
        car.x += normal.x * (penetration + 0.5);
        car.y += normal.y * (penetration + 0.5);
        
        const reflected = reflectVelocity(vx, vy, normal.x, normal.y, 0.5);
        car.speed = Math.hypot(reflected.vx, reflected.vy);
        if (car.speed > 0.1) {
          car.angle = Math.atan2(reflected.vy, reflected.vx);
        } else {
          car.speed = 0;
        }
        
        car.flashTimer = 200;
      }
      
      if (car.flashTimer > 0) {
        car.flashTimer -= deltaTime * 16.67;
      }
      
      this.checkCheckpoint(car, now);
    }
    
    const allFinished = this.cars.every(c => c.finished);
    if (allFinished && this.gameState === 'racing') {
      this.gameState = 'finished';
      const sorted = [...this.cars].sort((a, b) => a.totalTime - b.totalTime);
      this.winner = sorted[0].id;
    }
  }
  
  checkCheckpoint(car: Car, now: number) {
    const currentSide = this.getStartLineSide(car);
    
    if (car.lastStartSide < 0 && currentSide >= 0 && car.checkpointIndex >= this.track.checkpoints.length) {
      const forwardDot = Math.cos(car.angle) * Math.cos(this.track.startAngle) + 
                       Math.sin(car.angle) * Math.sin(this.track.startAngle);
      
      if (forwardDot > 0.5) {
        car.checkpointIndex = 0;
        car.lap++;
        
        const lapTime = now - car.lastCheckpointTime;
        car.lapTimes.push(lapTime);
        car.lastCheckpointTime = now;
        
        if (car.lap >= this.maxLaps) {
          car.finished = true;
          car.totalTime = car.lapTimes.reduce((a, b) => a + b, 0);
        }
      }
    }
    
    car.lastStartSide = currentSide;
    
    if (car.checkpointIndex < this.track.checkpoints.length) {
      const checkpoint = this.track.checkpoints[car.checkpointIndex];
      const dist = Math.hypot(car.x - checkpoint.x, car.y - checkpoint.y);
      if (dist < 40) {
        car.checkpointIndex++;
      }
    }
  }
  
  getBestLapTime(carIndex: number): number | null {
    const car = this.cars[carIndex];
    if (car.lapTimes.length === 0) return null;
    return Math.min(...car.lapTimes);
  }
  
  getCurrentLapTime(carIndex: number): number {
    const car = this.cars[carIndex];
    if (this.gameState === 'waiting') return 0;
    if (car.finished) return car.totalTime;
    return Date.now() - car.lastCheckpointTime;
  }
}
