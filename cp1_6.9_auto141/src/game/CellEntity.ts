import { CellEntityData, CellType, MovePattern, Vec2 } from './types';

const ENERGY_THRESHOLD = 5;
const MIN_PLAYER_RADIUS = 10;
const MAX_PLAYER_RADIUS = 25;
const MIN_ENEMY_RADIUS = 8;
const MAX_ENEMY_RADIUS = 18;

let idCounter = 0;
function generateId(): string {
  return `cell_${Date.now()}_${++idCounter}`;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function createPlayerCell(
  x: number,
  y: number,
  birthTime: number,
  parent?: CellEntityData
): CellEntityData {
  const hueBase = parent ? parent.hue : 200;
  const hueVariation = parent ? (Math.random() * 60 - 30) : 0;
  const hue = (hueBase + hueVariation + 360) % 360;

  const patterns: MovePattern[] = [MovePattern.LINEAR, MovePattern.SINUSOIDAL, MovePattern.JITTER];

  return {
    id: generateId(),
    parentId: parent?.id ?? null,
    cellType: CellType.PLAYER,
    position: { x, y },
    velocity: { x: 0, y: 0 },
    targetPosition: { x, y },
    hue,
    saturation: 0.85,
    lightness: 0.6,
    radius: parent ? Math.max(MIN_PLAYER_RADIUS, parent.radius * 0.5) : MIN_PLAYER_RADIUS,
    divisionCount: parent ? parent.divisionCount + 1 : 0,
    energy: 0,
    movePattern: parent ? patterns[Math.floor(Math.random() * patterns.length)] : MovePattern.LINEAR,
    isSelected: !parent,
    birthTime,
    sinePhase: Math.random() * Math.PI * 2,
    jitterTimer: 0
  };
}

export function createEnemyCell(
  x: number,
  y: number,
  birthTime: number
): CellEntityData {
  return {
    id: generateId(),
    parentId: null,
    cellType: CellType.ENEMY,
    position: { x, y },
    velocity: {
      x: (Math.random() - 0.5) * 2,
      y: (Math.random() - 0.5) * 2
    },
    hue: Math.random() * 360,
    saturation: 0.3,
    lightness: 0.5,
    radius: MIN_ENEMY_RADIUS + Math.random() * (MAX_ENEMY_RADIUS - MIN_ENEMY_RADIUS),
    divisionCount: 0,
    energy: 0,
    movePattern: MovePattern.LINEAR,
    isSelected: false,
    birthTime,
    aiMode: 'wander',
    wanderAngle: Math.random() * Math.PI * 2
  };
}

export function createNutrient(
  x: number,
  y: number,
  birthTime: number
): CellEntityData {
  return {
    id: generateId(),
    parentId: null,
    cellType: CellType.NUTRIENT,
    position: { x, y },
    velocity: { x: 0, y: 0 },
    hue: 45 + Math.random() * 20,
    saturation: 0.9,
    lightness: 0.7,
    radius: 5 + Math.random() * 3,
    divisionCount: 0,
    energy: 0,
    movePattern: MovePattern.LINEAR,
    isSelected: false,
    birthTime
  };
}

export function canSplit(cell: CellEntityData): boolean {
  return cell.energy >= ENERGY_THRESHOLD;
}

export function growFromEat(cell: CellEntityData, eaten: CellEntityData): CellEntityData {
  const growthAmount = eaten.radius * 0.15;
  const newRadius = clamp(cell.radius + growthAmount, MIN_PLAYER_RADIUS, MAX_PLAYER_RADIUS);
  const newEnergy = cell.cellType === CellType.PLAYER ? cell.energy + 1 : cell.energy;
  return { ...cell, radius: newRadius, energy: newEnergy };
}

export function applyPlayerMovement(
  cell: CellEntityData,
  target: Vec2,
  dt: number
): CellEntityData {
  const smoothingFactor = 10;
  const factor = 1 - Math.exp(-dt * smoothingFactor);
  const newX = cell.position.x + (target.x - cell.position.x) * factor;
  const newY = cell.position.y + (target.y - cell.position.y) * factor;
  const vx = (target.x - cell.position.x) * smoothingFactor;
  const vy = (target.y - cell.position.y) * smoothingFactor;
  return {
    ...cell,
    position: { x: newX, y: newY },
    velocity: { x: vx, y: vy },
    targetPosition: target
  };
}

export function applyFollowerBoids(
  cell: CellEntityData,
  allPlayers: CellEntityData[],
  selectedCell: CellEntityData,
  dt: number,
  width: number,
  height: number
): CellEntityData {
  const cohesionWeight = 0.8;
  const separationWeight = 2.5;
  const alignmentWeight = 0.3;
  const maxSpeed = 120;
  const separationDist = 30;
  const targetDistFromSelected = 50;

  let cohX = 0, cohY = 0, cohCount = 0;
  let sepX = 0, sepY = 0;
  let aliX = 0, aliY = 0, aliCount = 0;

  for (const other of allPlayers) {
    if (other.id === cell.id) continue;
    const dx = other.position.x - cell.position.x;
    const dy = other.position.y - cell.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 100) {
      cohX += other.position.x;
      cohY += other.position.y;
      cohCount++;
      aliX += other.velocity.x;
      aliY += other.velocity.y;
      aliCount++;
    }
    if (dist < separationDist && dist > 0.01) {
      sepX -= dx / dist;
      sepY -= dy / dist;
    }
  }

  const toSelX = selectedCell.position.x - cell.position.x;
  const toSelY = selectedCell.position.y - cell.position.y;
  const distToSel = Math.sqrt(toSelX * toSelX + toSelY * toSelY);
  let cohTargetX: number, cohTargetY: number;
  if (distToSel > targetDistFromSelected) {
    const norm = 1 / (distToSel || 1);
    cohTargetX = cell.position.x + toSelX * norm * (distToSel - targetDistFromSelected);
    cohTargetY = cell.position.y + toSelY * norm * (distToSel - targetDistFromSelected);
  } else {
    cohTargetX = cell.position.x;
    cohTargetY = cell.position.y;
  }
  cohX += cohTargetX;
  cohY += cohTargetY;
  cohCount++;

  let moveX = 0, moveY = 0;
  if (cohCount > 0) {
    moveX += (cohX / cohCount - cell.position.x) * cohesionWeight;
    moveY += (cohY / cohCount - cell.position.y) * cohesionWeight;
  }
  moveX += sepX * separationWeight;
  moveY += sepY * separationWeight;
  if (aliCount > 0) {
    moveX += (aliX / aliCount - cell.velocity.x) * alignmentWeight * dt;
    moveY += (aliY / aliCount - cell.velocity.y) * alignmentWeight * dt;
  }

  const moveMag = Math.sqrt(moveX * moveX + moveY * moveY);
  let vx = cell.velocity.x;
  let vy = cell.velocity.y;
  if (moveMag > 0.01) {
    vx = (moveX / moveMag) * maxSpeed;
    vy = (moveY / moveMag) * maxSpeed;
  } else {
    vx *= 0.9;
    vy *= 0.9;
  }

  let newX = cell.position.x + vx * dt;
  let newY = cell.position.y + vy * dt;
  const r = cell.radius;
  if (newX < r) { newX = r; vx = -vx; }
  if (newX > width - r) { newX = width - r; vx = -vx; }
  if (newY < r) { newY = r; vy = -vy; }
  if (newY > height - r) { newY = height - r; vy = -vy; }

  return {
    ...cell,
    position: { x: newX, y: newY },
    velocity: { x: vx, y: vy }
  };
}

export function applyEnemyAI(
  enemy: CellEntityData,
  playerCells: CellEntityData[],
  dt: number,
  width: number,
  height: number
): CellEntityData {
  const wanderSpeed = 40;
  const chaseSpeed = 70;

  let nearestPlayer: CellEntityData | null = null;
  let nearestDist = Infinity;
  for (const p of playerCells) {
    const dx = p.position.x - enemy.position.x;
    const dy = p.position.y - enemy.position.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < nearestDist) { nearestDist = d; nearestPlayer = p; }
  }

  let vx = enemy.velocity.x;
  let vy = enemy.velocity.y;
  let aiMode = enemy.aiMode ?? 'wander';
  let wanderAngle = enemy.wanderAngle ?? 0;

  if (nearestPlayer && nearestDist < 100 && enemy.radius > nearestPlayer.radius * 0.9) {
    aiMode = 'chase';
    const dx = nearestPlayer.position.x - enemy.position.x;
    const dy = nearestPlayer.position.y - enemy.position.y;
    const norm = 1 / (Math.sqrt(dx * dx + dy * dy) || 1);
    vx = dx * norm * chaseSpeed;
    vy = dy * norm * chaseSpeed;
  } else {
    aiMode = 'wander';
    wanderAngle += (Math.random() - 0.5) * 2 * dt;
    vx = Math.cos(wanderAngle) * wanderSpeed;
    vy = Math.sin(wanderAngle) * wanderSpeed;
  }

  let newX = enemy.position.x + vx * dt;
  let newY = enemy.position.y + vy * dt;
  const r = enemy.radius;
  if (newX < r) { newX = r; vx = Math.abs(vx); wanderAngle = 0; }
  if (newX > width - r) { newX = width - r; vx = -Math.abs(vx); wanderAngle = Math.PI; }
  if (newY < r) { newY = r; vy = Math.abs(vy); wanderAngle = Math.PI / 2; }
  if (newY > height - r) { newY = height - r; vy = -Math.abs(vy); wanderAngle = -Math.PI / 2; }

  return {
    ...enemy,
    position: { x: newX, y: newY },
    velocity: { x: vx, y: vy },
    aiMode,
    wanderAngle
  };
}
