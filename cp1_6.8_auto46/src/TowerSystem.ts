import type { Tower, Enemy, Projectile, Particle, RuneEffect, Point, TowerType } from './types';
import { TOWER_STATS, getTowerCenter, dist, genId, CELL_SIZE } from './types';
import { damageEnemy, applySlowToEnemy } from './EnemyManager';

export function findTarget(tower: Tower, enemies: Enemy[]): Enemy | null {
  const center = getTowerCenter(tower.gridX, tower.gridY);
  const stats = TOWER_STATS[tower.type][tower.level - 1];
  let closest: Enemy | null = null;
  let closestProgress = -1;
  for (const e of enemies) {
    if (e.isDead) continue;
    const d = dist(center, e.position);
    if (d <= stats.range && e.pathProgress > closestProgress) {
      closest = e;
      closestProgress = e.pathProgress;
    }
  }
  return closest;
}

export function towerAttack(
  tower: Tower,
  enemies: Enemy[],
  now: number
): { projectile: Projectile | null; runeEffect: RuneEffect | null } {
  if (now - tower.lastAttackTime < tower.attackCooldown) {
    return { projectile: null, runeEffect: null };
  }
  const target = findTarget(tower, enemies);
  if (!target) return { projectile: null, runeEffect: null };

  tower.lastAttackTime = now;
  tower.targetId = target.id;
  tower.attackAnimProgress = 1;

  const stats = TOWER_STATS[tower.type][tower.level - 1];
  const from = getTowerCenter(tower.gridX, tower.gridY);
  const to = { x: target.position.x, y: target.position.y };

  const proj: Projectile = {
    id: genId(),
    type: tower.type,
    fromX: from.x,
    fromY: from.y,
    toX: to.x,
    toY: to.y,
    progress: 0,
    speed: tower.type === 'cannon' ? 4 : tower.type === 'magic' ? 3 : 6,
    damage: stats.damage,
    splashRadius: stats.splashRadius,
    slowFactor: stats.slowFactor,
    slowDuration: stats.slowDuration,
    targetEnemyId: target.id,
  };

  let runeEffect: RuneEffect | null = null;
  if (tower.type === 'magic') {
    runeEffect = {
      x: from.x,
      y: from.y,
      rotation: 0,
      life: 600,
      maxLife: 600,
      radius: stats.range,
    };
  }

  return { projectile: proj, runeEffect };
}

export function processProjectileHit(
  proj: Projectile,
  enemies: Enemy[]
): { killedEnemies: string[]; goldEarned: number; hitPosition: Point; particles: Particle[] } {
  const result = { killedEnemies: [] as string[], goldEarned: 0, hitPosition: { x: proj.toX, y: proj.toY }, particles: [] as Particle[] };

  if (proj.splashRadius > 0) {
    for (const e of enemies) {
      if (e.isDead) continue;
      const d = dist(result.hitPosition, e.position);
      if (d <= proj.splashRadius) {
        const dmgMult = 1 - (d / proj.splashRadius) * 0.5;
        const { killed } = damageEnemy(e, proj.damage * dmgMult);
        if (killed) {
          result.killedEnemies.push(e.id);
        }
      }
    }
    const splashCount = 8;
    for (let i = 0; i < splashCount; i++) {
      const angle = (Math.PI * 2 * i) / splashCount;
      result.particles.push({
        x: result.hitPosition.x,
        y: result.hitPosition.y,
        vx: Math.cos(angle) * 2,
        vy: Math.sin(angle) * 2,
        life: 400,
        maxLife: 400,
        color: '#FF6B35',
        size: 4,
        type: 'splash',
      });
    }
  } else {
    const target = enemies.find((e) => e.id === proj.targetEnemyId);
    if (target && !target.isDead) {
      const { killed } = damageEnemy(target, proj.damage);
      if (proj.slowFactor > 0) {
        applySlowToEnemy(target, proj.slowFactor, proj.slowDuration);
      }
      if (killed) {
        result.killedEnemies.push(target.id);
      }
    }
  }

  return result;
}

export function getUpgradeCost(tower: Tower): number {
  if (tower.level >= 3) return 0;
  return TOWER_STATS[tower.type][tower.level].cost;
}

export function getTowerRange(tower: Tower): number {
  return TOWER_STATS[tower.type][tower.level - 1].range;
}

export function getTowerDamage(tower: Tower): number {
  return TOWER_STATS[tower.type][tower.level - 1].damage;
}

export function drawTowerShape(ctx: CanvasRenderingContext2D, tower: Tower, offsetY: number) {
  const cx = tower.gridX * CELL_SIZE + CELL_SIZE / 2;
  const cy = tower.gridY * CELL_SIZE + CELL_SIZE / 2 + offsetY;
  const s = CELL_SIZE * 0.35;

  ctx.save();
  if (tower.upgradeAnimProgress > 0) {
    ctx.shadowColor = '#F4D03F';
    ctx.shadowBlur = 20 * tower.upgradeAnimProgress;
  }

  switch (tower.type) {
    case 'arrow': {
      ctx.fillStyle = '#8B6914';
      ctx.beginPath();
      ctx.moveTo(cx, cy - s);
      ctx.lineTo(cx + s * 0.6, cy + s * 0.3);
      ctx.lineTo(cx + s * 0.3, cy + s * 0.3);
      ctx.lineTo(cx + s * 0.3, cy + s);
      ctx.lineTo(cx - s * 0.3, cy + s);
      ctx.lineTo(cx - s * 0.3, cy + s * 0.3);
      ctx.lineTo(cx - s * 0.6, cy + s * 0.3);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#A0522D';
      ctx.fillRect(cx - s * 0.4, cy - s * 0.1, s * 0.8, s * 0.3);
      for (let i = 0; i < tower.level; i++) {
        ctx.fillStyle = '#F4D03F';
        ctx.beginPath();
        ctx.arc(cx - s * 0.2 + i * s * 0.2, cy + s * 0.6, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'cannon': {
      ctx.fillStyle = '#696969';
      ctx.beginPath();
      ctx.arc(cx, cy + s * 0.2, s * 0.7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4A4A4A';
      ctx.fillRect(cx - s * 0.8, cy - s * 0.2, s * 1.2, s * 0.4);
      ctx.fillStyle = '#2F2F2F';
      ctx.beginPath();
      ctx.arc(cx + s * 0.6, cy, s * 0.15, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < tower.level; i++) {
        ctx.fillStyle = '#F4D03F';
        ctx.beginPath();
        ctx.arc(cx - s * 0.2 + i * s * 0.2, cy + s * 0.5, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'magic': {
      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 0.8);
      grad.addColorStop(0, '#9B59B6');
      grad.addColorStop(0.5, '#6C3483');
      grad.addColorStop(1, '#4A235A');
      ctx.fillStyle = grad;
      ctx.beginPath();
      const pts = 6;
      for (let i = 0; i < pts; i++) {
        const angle = (Math.PI * 2 * i) / pts - Math.PI / 2;
        const r = i % 2 === 0 ? s * 0.8 : s * 0.4;
        const px = cx + Math.cos(angle) * r;
        const py = cy + Math.sin(angle) * r;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#E8DAEF';
      ctx.beginPath();
      ctx.arc(cx, cy, s * 0.2, 0, Math.PI * 2);
      ctx.fill();
      for (let i = 0; i < tower.level; i++) {
        ctx.fillStyle = '#F4D03F';
        ctx.beginPath();
        ctx.arc(cx - s * 0.15 + i * s * 0.15, cy + s * 0.5, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
  }
  ctx.restore();
}
