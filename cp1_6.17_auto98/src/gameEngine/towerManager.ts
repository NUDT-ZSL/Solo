import { Tower, Enemy, Point, TowerType, TOWER_STATS } from '../store/gameStore';

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
  let closestEnemy: Enemy | null = null;
  let closestProgress = -1;

  for (const enemy of enemies) {
    if (!enemy.active) continue;
    const dist = getDistance(tower.position, enemy.position);
    if (dist <= tower.range) {
      const progress = enemy.currentSegment + enemy.pathProgress;
      if (progress > closestProgress) {
        closestProgress = progress;
        closestEnemy = enemy;
      }
    }
  }

  return closestEnemy;
}

export function getEnemiesInRange(tower: Tower, enemies: Enemy[]): Enemy[] {
  return enemies.filter((e) => e.active && getDistance(tower.position, e.position) <= tower.range);
}

export function isEnemyInRange(tower: Tower, enemy: Enemy): boolean {
  if (!enemy.active) return false;
  return getDistance(tower.position, enemy.position) <= tower.range;
}

export function calculateProjectileTrajectory(
  from: Point,
  to: Point,
  speed: number
): { position: Point; direction: Point; speed: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  return {
    position: { x: from.x, y: from.y },
    direction: dist > 0 ? { x: dx / dist, y: dy / dist } : { x: 1, y: 0 },
    speed,
  };
}

export function getTowerStats(type: TowerType) {
  return TOWER_STATS[type];
}

export function lerpRotation(current: number, target: number, t: number): number {
  let diff = target - current;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  return current + diff * t;
}
