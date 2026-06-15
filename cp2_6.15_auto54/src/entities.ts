import { Vec2, GameMap } from './map';

export type ZombieType = 'normal' | 'fast' | 'giant';

export const ZOMBIE_CONFIG: Record<ZombieType, {
  radius: number;
  color: string;
  speed: number;
  health: number;
}> = {
  normal: { radius: 10, color: '#9e9e9e', speed: 60, health: 100 },
  fast: { radius: 8, color: '#ff9800', speed: 110, health: 60 },
  giant: { radius: 18, color: '#b71c1c', speed: 45, health: 1000 },
};

export interface Zombie {
  id: number;
  type: ZombieType;
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  speed: number;
  radius: number;
  color: string;
  path: Vec2[];
  pathIndex: number;
  slowUntil: number;
  slowFactor: number;
  lastPathTime: number;
  lastAttackTime: number;
}

let zombieIdCounter = 0;

export function createZombie(type: ZombieType, x: number, y: number): Zombie {
  const config = ZOMBIE_CONFIG[type];
  return {
    id: ++zombieIdCounter,
    type,
    x,
    y,
    vx: 0,
    vy: 0,
    health: config.health,
    maxHealth: config.health,
    speed: config.speed,
    radius: config.radius,
    color: config.color,
    path: [],
    pathIndex: 0,
    slowUntil: 0,
    slowFactor: 1,
    lastPathTime: 0,
    lastAttackTime: 0,
  };
}

export function updateZombie(
  zombie: Zombie,
  playerX: number,
  playerY: number,
  dt: number,
  map: GameMap,
  now: number
): void {
  const dx = playerX - zombie.x;
  const dy = playerY - zombie.y;
  const distToPlayer = Math.hypot(dx, dy);

  let currentSpeed = zombie.speed;
  if (now < zombie.slowUntil) {
    currentSpeed *= zombie.slowFactor;
  }

  if (now - zombie.lastPathTime > 1000 || zombie.path.length === 0) {
    zombie.lastPathTime = now;
    zombie.path = map.findPath(zombie.x, zombie.y, playerX, playerY);
    zombie.pathIndex = 0;
  }

  let targetX = playerX;
  let targetY = playerY;

  if (zombie.path.length > 1 && zombie.pathIndex < zombie.path.length) {
    const pathPoint = zombie.path[zombie.pathIndex];
    const distToPath = Math.hypot(pathPoint.x - zombie.x, pathPoint.y - zombie.y);

    if (distToPath < zombie.radius + 5) {
      zombie.pathIndex++;
    }
    if (zombie.pathIndex < zombie.path.length) {
      targetX = zombie.path[zombie.pathIndex].x;
      targetY = zombie.path[zombie.pathIndex].y;
    }
  }

  if (distToPlayer > 1) {
    const moveDx = targetX - zombie.x;
    const moveDy = targetY - zombie.y;
    const moveDist = Math.hypot(moveDx, moveDy);
    if (moveDist > 0) {
      const moveX = (moveDx / moveDist) * currentSpeed * dt;
      const moveY = (moveDy / moveDist) * currentSpeed * dt;

      const nextX = zombie.x + moveX;
      const nextY = zombie.y + moveY;

      const gridPadding = zombie.radius;
      if (!map.pointInObstacle(nextX, zombie.y, gridPadding)) {
        zombie.x = nextX;
      }
      if (!map.pointInObstacle(zombie.x, nextY, gridPadding)) {
        zombie.y = nextY;
      }
    }
  }

  zombie.x = Math.max(zombie.radius, Math.min(map.width - zombie.radius, zombie.x));
  zombie.y = Math.max(zombie.radius, Math.min(map.height - zombie.radius, zombie.y));
}

export interface Player {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  health: number;
  maxHealth: number;
  radius: number;
  speed: number;
  color: string;
  facingAngle: number;
  viewRadius: number;
  viewAngle: number;
  damageAnimTime: number;
  resourceAnimTime: number;
  lastDamageValue: number;
  lastResourceValue: number;
}

export function createPlayer(x: number, y: number): Player {
  return {
    x,
    y,
    targetX: x,
    targetY: y,
    health: 100,
    maxHealth: 100,
    radius: 12,
    speed: 160,
    color: '#4caf50',
    facingAngle: -Math.PI / 2,
    viewRadius: 200,
    viewAngle: (120 * Math.PI) / 180,
    damageAnimTime: 0,
    resourceAnimTime: 0,
    lastDamageValue: 0,
    lastResourceValue: 0,
  };
}

export function updatePlayer(
  player: Player,
  zombies: Zombie[],
  dt: number,
  map: GameMap
): void {
  const dx = player.targetX - player.x;
  const dy = player.targetY - player.y;
  const dist = Math.hypot(dx, dy);

  if (dist > 1) {
    const moveDist = player.speed * dt;
    if (moveDist >= dist) {
      player.x = player.targetX;
      player.y = player.targetY;

      let nearestZombie: Zombie | null = null;
      let nearestDist = Infinity;

      for (const zombie of zombies) {
        const zxDiff = zombie.x - player.x;
        const zyDiff = zombie.y - player.y;
        const zDist = Math.hypot(zxDiff, zyDiff);

        if (zDist > player.viewRadius) continue;

        const angleToZombie = Math.atan2(zyDiff, zxDiff);
        let angleDiff = angleToZombie - player.facingAngle;

        while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
        while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

        if (Math.abs(angleDiff) <= player.viewAngle / 2) {
          if (zDist < nearestDist) {
            nearestDist = zDist;
            nearestZombie = zombie;
          }
        }
      }

      if (nearestZombie) {
        player.facingAngle = Math.atan2(nearestZombie.y - player.y, nearestZombie.x - player.x);
      }
    } else {
      const nextX = player.x + (dx / dist) * moveDist;
      const nextY = player.y + (dy / dist) * moveDist;
      const gridPadding = player.radius;

      if (!map.pointInObstacle(nextX, player.y, gridPadding)) {
        player.x = nextX;
      }
      if (!map.pointInObstacle(player.x, nextY, gridPadding)) {
        player.y = nextY;
      }
    }
  } else {
    let nearestZombie: Zombie | null = null;
    let nearestDist = Infinity;

    for (const zombie of zombies) {
      const zxDiff = zombie.x - player.x;
      const zyDiff = zombie.y - player.y;
      const zDist = Math.hypot(zxDiff, zyDiff);

      if (zDist > player.viewRadius) continue;

      const angleToZombie = Math.atan2(zyDiff, zxDiff);
      let angleDiff = angleToZombie - player.facingAngle;

      while (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
      while (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

      if (Math.abs(angleDiff) <= player.viewAngle / 2) {
        if (zDist < nearestDist) {
          nearestDist = zDist;
          nearestZombie = zombie;
        }
      }
    }

    if (nearestZombie) {
      player.facingAngle = Math.atan2(nearestZombie.y - player.y, nearestZombie.x - player.x);
    }
  }

  player.x = Math.max(player.radius, Math.min(map.width - player.radius, player.x));
  player.y = Math.max(player.radius, Math.min(map.height - player.radius, player.y));
}

export function checkPlayerZombieAttack(
  player: Player,
  zombie: Zombie,
  now: number
): boolean {
  const dist = Math.hypot(zombie.x - player.x, zombie.y - player.y);
  if (dist < 15) return false;
  if (now - zombie.lastAttackTime < 1000) return false;
  zombie.lastAttackTime = now;
  return true;
}
