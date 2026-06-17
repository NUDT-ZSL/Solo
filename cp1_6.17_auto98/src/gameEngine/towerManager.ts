export interface Point {
  x: number;
  y: number;
}

export type TowerType = 'arrow' | 'cannon' | 'magic';

export interface TowerStats {
  range: number;
  damage: number;
  cooldown: number;
  color: string;
  slowEffect: number;
  name: string;
}

export const TOWER_STATS: Record<TowerType, TowerStats> = {
  arrow: {
    range: 120,
    damage: 10,
    cooldown: 1000,
    color: '#8B4513',
    slowEffect: 0,
    name: '箭塔',
  },
  cannon: {
    range: 80,
    damage: 25,
    cooldown: 2500,
    color: '#555555',
    slowEffect: 0,
    name: '炮塔',
  },
  magic: {
    range: 150,
    damage: 15,
    cooldown: 1800,
    color: '#4B0082',
    slowEffect: 0.5,
    name: '魔法塔',
  },
};

export interface Tower {
  id: number;
  type: TowerType;
  position: Point;
  gridIndex: number;
  range: number;
  damage: number;
  cooldown: number;
  currentCooldown: number;
  rotation: number;
  targetRotation: number;
  rotationTimer: number;
  isPlacing: boolean;
  placeTimer: number;
  slowEffect: number;
}

export interface Enemy {
  id: number;
  position: Point;
  pathProgress: number;
  currentSegment: number;
  health: number;
  maxHealth: number;
  baseSpeed: number;
  speed: number;
  temporarySpeedMultiplier: number;
  speedBoostRemainingTime: number;
  permanentSpeedMultiplier: number;
  slowTimer: number;
  passedCheckpoints: number;
  isFlashing: boolean;
  flashTimer: number;
  active: boolean;
}

export interface Projectile {
  id: number;
  towerType: TowerType;
  position: Point;
  targetId: number;
  damage: number;
  speed: number;
  active: boolean;
  traveledDistance: number;
  maxRange: number;
}

export interface AttackEvent {
  towerId: number;
  targetId: number;
  damage: number;
  towerType: TowerType;
  towerPosition: Point;
}

export interface ProjectileUpdateResult {
  projectiles: Projectile[];
  hits: {
    projectileId: number;
    targetId: number;
    damage: number;
    towerType: TowerType;
    hitPosition: Point;
  }[];
}

export interface TowerUpdateResult {
  towers: Tower[];
  attackEvents: AttackEvent[];
}

export function canPlaceTower(
  gridIndex: number,
  towers: Tower[],
  maxTowers: number = 20
): boolean {
  if (towers.length >= maxTowers) return false;
  return !towers.some((t) => t.gridIndex === gridIndex);
}

export function getDistance(p1: Point, p2: Point): number {
  return Math.sqrt((p1.x - p2.x) ** 2 + (p1.y - p2.y) ** 2);
}

export function getAngle(from: Point, to: Point): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

export function findTargetInRange(tower: Tower, enemies: Enemy[]): Enemy | null {
  let bestEnemy: Enemy | null = null;
  let bestProgress = -1;

  for (const enemy of enemies) {
    if (!enemy.active) continue;
    const dist = getDistance(tower.position, enemy.position);
    if (dist <= tower.range) {
      const progress = enemy.currentSegment + enemy.pathProgress;
      if (progress > bestProgress) {
        bestProgress = progress;
        bestEnemy = enemy;
      }
    }
  }

  return bestEnemy;
}

export function getEnemiesInRange(tower: Tower, enemies: Enemy[]): Enemy[] {
  return enemies.filter((e) => e.active && getDistance(tower.position, e.position) <= tower.range);
}

export function isEnemyInRange(tower: Tower, enemy: Enemy): boolean {
  if (!enemy.active) return false;
  return getDistance(tower.position, enemy.position) <= tower.range;
}

export function getEnemiesInRadius(position: Point, enemies: Enemy[], radius: number): Enemy[] {
  return enemies.filter((e) => e.active && getDistance(position, e.position) <= radius);
}

export function updateTowers(towers: Tower[], enemies: Enemy[], deltaTime: number): TowerUpdateResult {
  const attackEvents: AttackEvent[] = [];

  const updatedTowers = towers.map((tower) => {
    let t = { ...tower };

    if (t.isPlacing) {
      t.placeTimer -= deltaTime;
      if (t.placeTimer <= 0) {
        t.isPlacing = false;
      }
    }

    if (t.rotationTimer > 0) {
      t.rotationTimer -= deltaTime;
      const progress = 1 - t.rotationTimer / 200;
      t.rotation = lerpRotation(t.rotation, t.targetRotation, Math.min(progress, 1));
    }

    if (t.currentCooldown > 0) {
      t.currentCooldown -= deltaTime;
    }

    const target = findTargetInRange(t, enemies);

    if (target) {
      const angle = getAngle(t.position, target.position);
      t.targetRotation = angle;
      t.rotationTimer = 200;

      if (t.currentCooldown <= 0) {
        t.currentCooldown = t.cooldown;
        attackEvents.push({
          towerId: t.id,
          targetId: target.id,
          damage: t.damage,
          towerType: t.type,
          towerPosition: { ...t.position },
        });
      }
    }

    return t;
  });

  return { towers: updatedTowers, attackEvents };
}

export function updateProjectiles(
  projectiles: Projectile[],
  enemies: Enemy[],
  deltaTime: number
): ProjectileUpdateResult {
  const hits: ProjectileUpdateResult['hits'] = [];
  const updatedProjectiles: Projectile[] = [];

  for (const proj of projectiles) {
    if (!proj.active) continue;

    let p = { ...proj };
    const target = enemies.find((e) => e.id === p.targetId && e.active);

    if (!target) {
      continue;
    }

    const dx = target.position.x - p.position.x;
    const dy = target.position.y - p.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const moveDistance = (p.speed * deltaTime) / 1000;

    if (dist <= moveDistance + 10) {
      hits.push({
        projectileId: p.id,
        targetId: target.id,
        damage: p.damage,
        towerType: p.towerType,
        hitPosition: { ...target.position },
      });
    } else {
      const dirX = dx / dist;
      const dirY = dy / dist;
      p.position = {
        x: p.position.x + dirX * moveDistance,
        y: p.position.y + dirY * moveDistance,
      };
      p.traveledDistance += moveDistance;

      if (p.traveledDistance < p.maxRange) {
        updatedProjectiles.push(p);
      }
    }
  }

  return { projectiles: updatedProjectiles, hits };
}

export function createProjectile(
  id: number,
  towerType: TowerType,
  fromPosition: Point,
  targetId: number,
  damage: number,
  maxRange: number
): Projectile {
  return {
    id,
    towerType,
    position: { ...fromPosition },
    targetId,
    damage,
    speed: 200,
    active: true,
    traveledDistance: 0,
    maxRange,
  };
}

export function lerpRotation(current: number, target: number, t: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * t;
}

export function getTowerStats(type: TowerType) {
  return TOWER_STATS[type];
}
