export interface Vec2 {
  x: number;
  y: number;
}

export interface Mirror {
  id: string;
  gridX: number;
  gridY: number;
  angle: number;
  targetAngle: number;
  rotatable: boolean;
  highlighted: boolean;
  shakeOffset: Vec2;
  glowIntensity: number;
}

export interface LaserSource {
  gridX: number;
  gridY: number;
  direction: Vec2;
}

export interface TargetCrystal {
  gridX: number;
  gridY: number;
  pulsePhase: number;
  exploding: boolean;
  explodeParticles: CrystalParticle[];
  hit: boolean;
}

export interface CrystalParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
}

export interface LaserSegment {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  hitMirror: boolean;
}

export interface LaserPath {
  segments: LaserSegment[];
  hitTarget: boolean;
}

export interface LevelDef {
  name: string;
  gridCols: number;
  gridRows: number;
  source: LaserSource;
  target: TargetCrystal;
  mirrors: Array<{
    gridX: number;
    gridY: number;
    angle: number;
    rotatable: boolean;
  }>;
  parMoves: number;
}

export const CELL_SIZE = 64;
export const MIRROR_HALF_LEN = 26;
export const LASER_SOURCE_RADIUS = 12;
export const CRYSTAL_RADIUS = 14;
export const MAX_BOUNCES = 20;

export const LEVELS: LevelDef[] = [
  {
    name: '初识光影',
    gridCols: 8,
    gridRows: 6,
    source: { gridX: 0, gridY: 2, direction: { x: 1, y: 0 } },
    target: { gridX: 5, gridY: 5, pulsePhase: 0, exploding: false, explodeParticles: [], hit: false },
    mirrors: [
      { gridX: 4, gridY: 2, angle: 45, rotatable: true },
    ],
    parMoves: 1,
  },
  {
    name: '双重折射',
    gridCols: 9,
    gridRows: 7,
    source: { gridX: 0, gridY: 1, direction: { x: 1, y: 0 } },
    target: { gridX: 7, gridY: 6, pulsePhase: 0, exploding: false, explodeParticles: [], hit: false },
    mirrors: [
      { gridX: 4, gridY: 1, angle: 45, rotatable: true },
      { gridX: 4, gridY: 4, angle: 135, rotatable: true },
    ],
    parMoves: 3,
  },
  {
    name: '迷宫幻象',
    gridCols: 10,
    gridRows: 8,
    source: { gridX: 0, gridY: 0, direction: { x: 1, y: 0 } },
    target: { gridX: 9, gridY: 7, pulsePhase: 0, exploding: false, explodeParticles: [], hit: false },
    mirrors: [
      { gridX: 3, gridY: 0, angle: 135, rotatable: true },
      { gridX: 3, gridY: 3, angle: 45, rotatable: true },
      { gridX: 7, gridY: 3, angle: 135, rotatable: true },
    ],
    parMoves: 5,
  },
  {
    name: '暗影回廊',
    gridCols: 11,
    gridRows: 8,
    source: { gridX: 0, gridY: 4, direction: { x: 1, y: 0 } },
    target: { gridX: 10, gridY: 1, pulsePhase: 0, exploding: false, explodeParticles: [], hit: false },
    mirrors: [
      { gridX: 3, gridY: 4, angle: 135, rotatable: true },
      { gridX: 3, gridY: 1, angle: 45, rotatable: true },
      { gridX: 7, gridY: 1, angle: 135, rotatable: true },
      { gridX: 7, gridY: 5, angle: 45, rotatable: true },
    ],
    parMoves: 7,
  },
  {
    name: '镜界终章',
    gridCols: 12,
    gridRows: 9,
    source: { gridX: 0, gridY: 4, direction: { x: 1, y: 0 } },
    target: { gridX: 11, gridY: 8, pulsePhase: 0, exploding: false, explodeParticles: [], hit: false },
    mirrors: [
      { gridX: 2, gridY: 4, angle: 45, rotatable: true },
      { gridX: 2, gridY: 7, angle: 135, rotatable: true },
      { gridX: 6, gridY: 7, angle: 45, rotatable: true },
      { gridX: 6, gridY: 2, angle: 135, rotatable: true },
      { gridX: 9, gridY: 2, angle: 45, rotatable: true },
    ],
    parMoves: 9,
  },
];

function vec2Dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

function vec2Len(v: Vec2): number {
  return Math.sqrt(v.x * v.x + v.y * v.y);
}

function vec2Normalize(v: Vec2): Vec2 {
  const len = vec2Len(v);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

function getMirrorNormal(angle: number): Vec2 {
  const rad = (angle * Math.PI) / 180;
  return { x: Math.cos(rad), y: -Math.sin(rad) };
}

function reflectDirection(incident: Vec2, normal: Vec2): Vec2 {
  const d = vec2Dot(incident, normal);
  return {
    x: incident.x - 2 * d * normal.x,
    y: incident.y - 2 * d * normal.y,
  };
}

function gridToPixel(gridX: number, gridY: number, offsetX: number, offsetY: number): Vec2 {
  return {
    x: offsetX + gridX * CELL_SIZE + CELL_SIZE / 2,
    y: offsetY + gridY * CELL_SIZE + CELL_SIZE / 2,
  };
}

function getMirrorEndpoints(mirror: Mirror, offsetX: number, offsetY: number): { a: Vec2; b: Vec2 } {
  const center = gridToPixel(mirror.gridX, mirror.gridY, offsetX, offsetY);
  const rad = (mirror.angle * Math.PI) / 180;
  const dx = Math.cos(rad) * MIRROR_HALF_LEN;
  const dy = -Math.sin(rad) * MIRROR_HALF_LEN;
  return {
    a: { x: center.x - dx, y: center.y - dy },
    b: { x: center.x + dx, y: center.y + dy },
  };
}

function lineSegmentIntersection(
  px: number, py: number, dx: number, dy: number,
  ax: number, ay: number, bx: number, by: number
): { t: number; u: number } | null {
  const ex = bx - ax;
  const ey = by - ay;
  const denom = dx * ey - dy * ex;
  if (Math.abs(denom) < 1e-8) return null;
  const t = ((ax - px) * ey - (ay - py) * ex) / denom;
  const u = ((ax - px) * dy - (ay - py) * dx) / denom;
  if (t > 0.5 && u >= 0 && u <= 1) {
    return { t, u };
  }
  return null;
}

export function computeLaserPath(
  source: LaserSource,
  mirrors: Mirror[],
  target: TargetCrystal,
  offsetX: number,
  offsetY: number,
  gridCols: number,
  gridRows: number
): LaserPath {
  const segments: LaserSegment[] = [];
  let hitTarget = false;

  const srcPos = gridToPixel(source.gridX, source.gridY, offsetX, offsetY);
  let curX = srcPos.x + source.direction.x * LASER_SOURCE_RADIUS;
  let curY = srcPos.y + source.direction.y * LASER_SOURCE_RADIUS;
  let dir = vec2Normalize(source.direction);

  const targetPos = gridToPixel(target.gridX, target.gridY, offsetX, offsetY);

  for (let bounce = 0; bounce < MAX_BOUNCES; bounce++) {
    let closestT = Infinity;
    let closestMirror: Mirror | null = null;

    for (const mirror of mirrors) {
      const ep = getMirrorEndpoints(mirror, offsetX, offsetY);
      const result = lineSegmentIntersection(
        curX, curY, dir.x, dir.y,
        ep.a.x, ep.a.y, ep.b.x, ep.b.y
      );
      if (result && result.t < closestT) {
        closestT = result.t;
        closestMirror = mirror;
      }
    }

    const targetT = rayCircleIntersection(curX, curY, dir.x, dir.y, targetPos.x, targetPos.y, CRYSTAL_RADIUS);
    if (targetT !== null && targetT < closestT) {
      segments.push({
        startX: curX,
        startY: curY,
        endX: curX + dir.x * targetT,
        endY: curY + dir.y * targetT,
        hitMirror: false,
      });
      hitTarget = true;
      break;
    }

    const boundaryT = rayBoundaryIntersection(
      curX, curY, dir.x, dir.y,
      offsetX, offsetY,
      gridCols * CELL_SIZE, gridRows * CELL_SIZE
    );

    if (closestMirror && closestT < boundaryT) {
      const hitX = curX + dir.x * closestT;
      const hitY = curY + dir.y * closestT;
      segments.push({
        startX: curX,
        startY: curY,
        endX: hitX,
        endY: hitY,
        hitMirror: true,
      });

      const normal = getMirrorNormal(closestMirror.angle);
      const dot = vec2Dot(dir, normal);
      const reflectNormal = dot < 0 ? normal : { x: -normal.x, y: -normal.y };
      dir = reflectDirection(dir, reflectNormal);
      dir = vec2Normalize(dir);

      curX = hitX + dir.x * 0.5;
      curY = hitY + dir.y * 0.5;
    } else {
      const endT = boundaryT > 0 ? boundaryT : 1000;
      segments.push({
        startX: curX,
        startY: curY,
        endX: curX + dir.x * endT,
        endY: curY + dir.y * endT,
        hitMirror: false,
      });
      break;
    }
  }

  return { segments, hitTarget };
}

function rayCircleIntersection(
  px: number, py: number, dx: number, dy: number,
  cx: number, cy: number, r: number
): number | null {
  const fx = px - cx;
  const fy = py - cy;
  const a = dx * dx + dy * dy;
  const b = 2 * (fx * dx + fy * dy);
  const c = fx * fx + fy * fy - r * r;
  const disc = b * b - 4 * a * c;
  if (disc < 0) return null;
  const sqrtDisc = Math.sqrt(disc);
  const t1 = (-b - sqrtDisc) / (2 * a);
  const t2 = (-b + sqrtDisc) / (2 * a);
  if (t1 > 1) return t1;
  if (t2 > 1) return t2;
  return null;
}

function rayBoundaryIntersection(
  px: number, py: number, dx: number, dy: number,
  ox: number, oy: number, w: number, h: number
): number {
  let tMin = Infinity;
  const x0 = ox;
  const x1 = ox + w;
  const y0 = oy;
  const y1 = oy + h;

  if (Math.abs(dx) > 1e-8) {
    const t1 = (x0 - px) / dx;
    const t2 = (x1 - px) / dx;
    for (const t of [t1, t2]) {
      if (t > 0.5) {
        const yy = py + dy * t;
        if (yy >= y0 && yy <= y1 && t < tMin) tMin = t;
      }
    }
  }
  if (Math.abs(dy) > 1e-8) {
    const t1 = (y0 - py) / dy;
    const t2 = (y1 - py) / dy;
    for (const t of [t1, t2]) {
      if (t > 0.5) {
        const xx = px + dx * t;
        if (xx >= x0 && xx <= x1 && t < tMin) tMin = t;
      }
    }
  }
  return tMin === Infinity ? 2000 : tMin;
}

export interface GameState {
  currentLevel: number;
  mirrors: Mirror[];
  source: LaserSource;
  target: TargetCrystal;
  laserPath: LaserPath;
  selectedMirrorId: string | null;
  moveCount: number;
  elapsedTime: number;
  attempts: number;
  levelComplete: boolean;
  offsetX: number;
  offsetY: number;
  gridCols: number;
  gridRows: number;
  shakeTimer: number;
}

export function createGameState(levelIndex: number, canvasWidth: number, canvasHeight: number): GameState {
  const def = LEVELS[levelIndex];
  const gridPixelW = def.gridCols * CELL_SIZE;
  const gridPixelH = def.gridRows * CELL_SIZE;
  const offsetX = (canvasWidth - gridPixelW) / 2;
  const offsetY = (canvasHeight - gridPixelH) / 2;

  const mirrors: Mirror[] = def.mirrors.map((m, i) => ({
    id: `mirror_${i}`,
    gridX: m.gridX,
    gridY: m.gridY,
    angle: m.angle,
    targetAngle: m.angle,
    rotatable: m.rotatable,
    highlighted: false,
    shakeOffset: { x: 0, y: 0 },
    glowIntensity: 0,
  }));

  const source = { ...def.source, direction: vec2Normalize(def.source.direction) };
  const target: TargetCrystal = {
    gridX: def.target.gridX,
    gridY: def.target.gridY,
    pulsePhase: 0,
    exploding: false,
    explodeParticles: [],
    hit: false,
  };

  const state: GameState = {
    currentLevel: levelIndex,
    mirrors,
    source,
    target,
    laserPath: { segments: [], hitTarget: false },
    selectedMirrorId: null,
    moveCount: 0,
    elapsedTime: 0,
    attempts: 1,
    levelComplete: false,
    offsetX,
    offsetY,
    gridCols: def.gridCols,
    gridRows: def.gridRows,
    shakeTimer: 0,
  };

  state.laserPath = computeLaserPath(source, mirrors, target, offsetX, offsetY, def.gridCols, def.gridRows);
  return state;
}

export function rotateMirror(state: GameState, direction: 1 | -1): GameState {
  if (!state.selectedMirrorId || state.levelComplete) return state;
  const mirror = state.mirrors.find(m => m.id === state.selectedMirrorId);
  if (!mirror || !mirror.rotatable) return state;

  mirror.targetAngle = (mirror.targetAngle + direction * 45 + 360) % 360;
  mirror.shakeOffset = { x: (Math.random() - 0.5) * 4, y: (Math.random() - 0.5) * 4 };
  state.shakeTimer = 200;
  state.moveCount++;

  return state;
}

export function updateGameState(state: GameState, dt: number): GameState {
  if (state.levelComplete) {
    state.target.pulsePhase += dt * 0.003;
    updateCrystalParticles(state, dt);
    return state;
  }

  state.elapsedTime += dt;

  for (const mirror of state.mirrors) {
    if (Math.abs(mirror.angle - mirror.targetAngle) > 0.5) {
      const diff = mirror.targetAngle - mirror.angle;
      const step = diff * 0.15;
      if (Math.abs(diff) < 1) {
        mirror.angle = mirror.targetAngle;
      } else {
        mirror.angle += step;
      }
    } else {
      mirror.angle = mirror.targetAngle;
    }

    if (mirror.id === state.selectedMirrorId) {
      mirror.glowIntensity = Math.min(1, mirror.glowIntensity + dt * 0.005);
    } else {
      mirror.glowIntensity = Math.max(0, mirror.glowIntensity - dt * 0.005);
    }
  }

  if (state.shakeTimer > 0) {
    state.shakeTimer -= dt;
    for (const mirror of state.mirrors) {
      if (mirror.id === state.selectedMirrorId) {
        mirror.shakeOffset.x *= 0.9;
        mirror.shakeOffset.y *= 0.9;
      }
    }
  } else {
    for (const mirror of state.mirrors) {
      mirror.shakeOffset.x = 0;
      mirror.shakeOffset.y = 0;
    }
  }

  state.laserPath = computeLaserPath(
    state.source, state.mirrors, state.target,
    state.offsetX, state.offsetY, state.gridCols, state.gridRows
  );

  state.target.pulsePhase += dt * 0.003;

  if (state.laserPath.hitTarget && !state.target.exploding) {
    state.target.hit = true;
    state.target.exploding = true;
    spawnCrystalExplosion(state);
    state.levelComplete = true;
  }

  return state;
}

function spawnCrystalExplosion(state: GameState) {
  const pos = gridToPixel(state.target.gridX, state.target.gridY, state.offsetX, state.offsetY);
  for (let i = 0; i < 40; i++) {
    const angle = (Math.PI * 2 * i) / 40 + Math.random() * 0.3;
    const speed = 60 + Math.random() * 120;
    state.target.explodeParticles.push({
      x: pos.x,
      y: pos.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: 1,
      maxLife: 0.8 + Math.random() * 0.6,
      size: 2 + Math.random() * 4,
    });
  }
}

function updateCrystalParticles(state: GameState, dt: number) {
  const sec = dt / 1000;
  for (const p of state.target.explodeParticles) {
    p.x += p.vx * sec;
    p.y += p.vy * sec;
    p.vy += 80 * sec;
    p.life -= sec / p.maxLife;
  }
  state.target.explodeParticles = state.target.explodeParticles.filter(p => p.life > 0);
}

export function selectMirrorAtPos(state: GameState, px: number, py: number): GameState {
  if (state.levelComplete) return state;

  for (const mirror of state.mirrors) {
    const pos = gridToPixel(mirror.gridX, mirror.gridY, state.offsetX, state.offsetY);
    const dx = px - pos.x;
    const dy = py - pos.y;
    if (Math.sqrt(dx * dx + dy * dy) < CELL_SIZE * 0.45) {
      state.selectedMirrorId = mirror.id;
      mirror.highlighted = true;
      for (const other of state.mirrors) {
        if (other.id !== mirror.id) {
          other.highlighted = false;
        }
      }
      return state;
    }
  }

  state.selectedMirrorId = null;
  for (const mirror of state.mirrors) {
    mirror.highlighted = false;
  }
  return state;
}

export { gridToPixel };
