import { drawHexagon } from './Grid';

export type Team = 'player' | 'enemy';

export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export interface Unit {
  id: number;
  team: Team;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  hp: number;
  maxHp: number;
  damage: number;
  attackCooldown: number;
  attackRate: number;
  size: number;
  centerColor: string;
  edgeColor: string;
  trail: TrailPoint[];
  selected: boolean;
  fighting: boolean;
  flashTimer: number;
  flashPhase: number;
  targetUnit: Unit | null;
  hasTarget: boolean;
}

let unitIdCounter = 0;

export function createFirefly(x: number, y: number): Unit {
  return {
    id: unitIdCounter++,
    team: 'player',
    x,
    y,
    targetX: x,
    targetY: y,
    speed: 60,
    hp: 3,
    maxHp: 3,
    damage: 1,
    attackCooldown: 0,
    attackRate: 1,
    size: 5,
    centerColor: '#9B59B6',
    edgeColor: '#C39BD3',
    trail: [],
    selected: false,
    fighting: false,
    flashTimer: 0,
    flashPhase: 0,
    targetUnit: null,
    hasTarget: false
  };
}

export function createEnemyBug(x: number, y: number): Unit {
  return {
    id: unitIdCounter++,
    team: 'enemy',
    x,
    y,
    targetX: x,
    targetY: y,
    speed: 42,
    hp: 3,
    maxHp: 3,
    damage: 1,
    attackCooldown: 0,
    attackRate: 1,
    size: 6,
    centerColor: '#E74C3C',
    edgeColor: '#C0392B',
    trail: [],
    selected: false,
    fighting: false,
    flashTimer: 0,
    flashPhase: 0,
    targetUnit: null,
    hasTarget: false
  };
}

export function updateUnit(
  unit: Unit,
  dt: number,
  _allUnits: Unit[],
  coreX: number,
  coreY: number,
  flowerPositions: { x: number; y: number }[]
) {
  if (unit.attackCooldown > 0) {
    unit.attackCooldown -= dt;
  }

  if (unit.fighting) {
    unit.flashTimer += dt;
    unit.flashPhase += dt * Math.PI * 2 * 10;
    if (unit.flashTimer >= 1 / unit.attackRate) {
      unit.flashTimer = 0;
    }
  } else {
    unit.flashTimer = 0;
    unit.flashPhase = 0;
  }

  if (!unit.fighting) {
    if (unit.team === 'enemy' && !unit.hasTarget) {
      let closestDist = Infinity;
      let closestX = coreX;
      let closestY = coreY;

      for (const pos of flowerPositions) {
        const dist = Math.hypot(pos.x - unit.x, pos.y - unit.y);
        if (dist < closestDist) {
          closestDist = dist;
          closestX = pos.x;
          closestY = pos.y;
        }
      }

      const coreDist = Math.hypot(coreX - unit.x, coreY - unit.y);
      if (coreDist < closestDist) {
        closestX = coreX;
        closestY = coreY;
      }

      unit.targetX = closestX;
      unit.targetY = closestY;
      unit.hasTarget = true;
    }

    const dx = unit.targetX - unit.x;
    const dy = unit.targetY - unit.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 2) {
      const moveX = (dx / dist) * unit.speed * dt;
      const moveY = (dy / dist) * unit.speed * dt;
      unit.x += moveX;
      unit.y += moveY;

      if (unit.team === 'player') {
        unit.trail.unshift({ x: unit.x, y: unit.y, alpha: 0.3 });
        if (unit.trail.length > 20) {
          unit.trail.pop();
        }
        for (let i = 0; i < unit.trail.length; i++) {
          unit.trail[i].alpha = 0.3 * (1 - i / unit.trail.length);
        }
      }
    } else {
      unit.hasTarget = false;
    }
  }
}

export function checkUnitCombat(
  units: Unit[],
  _dt: number
): { deadUnits: number[] } {
  const deadUnits: number[] = [];

  for (let i = 0; i < units.length; i++) {
    const a = units[i];
    if (deadUnits.includes(a.id)) continue;

    for (let j = i + 1; j < units.length; j++) {
      const b = units[j];
      if (deadUnits.includes(b.id)) continue;
      if (a.team === b.team) continue;

      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const combatRange = a.size + b.size + 4;

      if (dist < combatRange) {
        a.fighting = true;
        b.fighting = true;
        a.targetUnit = b;
        b.targetUnit = a;

        if (a.attackCooldown <= 0) {
          b.hp -= a.damage;
          a.attackCooldown = 1 / a.attackRate;
          if (b.hp <= 0) {
            deadUnits.push(b.id);
          }
        }
        if (b.attackCooldown <= 0 && !deadUnits.includes(b.id)) {
          a.hp -= b.damage;
          b.attackCooldown = 1 / b.attackRate;
          if (a.hp <= 0) {
            deadUnits.push(a.id);
            break;
          }
        }
      } else {
        if (a.targetUnit === b) {
          a.fighting = false;
          a.targetUnit = null;
        }
        if (b.targetUnit === a) {
          b.fighting = false;
          b.targetUnit = null;
        }
      }
    }
  }

  for (const u of units) {
    if (!deadUnits.includes(u.id) && u.fighting && !u.targetUnit) {
      u.fighting = false;
    }
  }

  return { deadUnits };
}

export function renderUnit(ctx: CanvasRenderingContext2D, unit: Unit) {
  if (unit.team === 'player' && unit.trail.length > 1) {
    ctx.strokeStyle = '#9B59B6';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(unit.trail[0].x, unit.trail[0].y);
    for (let i = 1; i < unit.trail.length; i++) {
      const p = unit.trail[i];
      ctx.globalAlpha = p.alpha;
      ctx.lineTo(p.x, p.y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }

  const glowGradient = ctx.createRadialGradient(unit.x, unit.y, 0, unit.x, unit.y, unit.size * 2.5);
  glowGradient.addColorStop(0, unit.edgeColor + '80');
  glowGradient.addColorStop(1, unit.edgeColor + '00');
  ctx.fillStyle = glowGradient;
  ctx.beginPath();
  ctx.arc(unit.x, unit.y, unit.size * 2.5, 0, Math.PI * 2);
  ctx.fill();

  let centerColor = unit.centerColor;
  let edgeColor = unit.edgeColor;
  if (unit.fighting) {
    const flash = 0.5 + 0.5 * Math.sin(unit.flashPhase);
    if (flash > 0.5) {
      centerColor = '#FFFFFF';
      edgeColor = '#FFFFFF';
    }
  }

  drawHexagon(ctx, unit.x, unit.y, unit.size, centerColor, edgeColor, 2);

  if (unit.selected) {
    ctx.strokeStyle = '#3498DB';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 2]);
    ctx.beginPath();
    ctx.arc(unit.x, unit.y, unit.size + 4, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (unit.hp < unit.maxHp) {
    const barWidth = unit.size * 2;
    const barHeight = 3;
    const barX = unit.x - barWidth / 2;
    const barY = unit.y - unit.size - 8;
    ctx.fillStyle = '#333';
    ctx.fillRect(barX, barY, barWidth, barHeight);
    ctx.fillStyle = unit.team === 'player' ? '#9B59B6' : '#E74C3C';
    ctx.fillRect(barX, barY, barWidth * (unit.hp / unit.maxHp), barHeight);
  }
}
