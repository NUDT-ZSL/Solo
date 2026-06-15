import { PlayerShip } from './PlayerShip';
import { Arena } from './Arena';

export type AIDifficulty = 'easy' | 'medium' | 'hard';

const AIM_OFFSETS: Record<AIDifficulty, number> = {
  easy: (20 * Math.PI) / 180,
  medium: (10 * Math.PI) / 180,
  hard: (5 * Math.PI) / 180,
};

const SHOOT_THRESHOLDS: Record<AIDifficulty, number> = {
  easy: 0.15,
  medium: 0.12,
  hard: 0.1,
};

export class SinglePlayerAI {
  difficulty: AIDifficulty;
  private aimOffset: number = 0;
  private aimOffsetTimer: number = 0;
  private randomShootTimer: number = 0;
  private randomTurnDir: number = 0;
  private decisionTimer: number = 0;

  constructor(difficulty: AIDifficulty) {
    this.difficulty = difficulty;
    this.rollNewAimOffset();
  }

  private rollNewAimOffset() {
    const maxOffset = AIM_OFFSETS[this.difficulty];
    this.aimOffset = (Math.random() * 2 - 1) * maxOffset;
  }

  private predictTargetPos(
    aiShip: PlayerShip,
    playerShip: PlayerShip,
  ): { x: number; y: number } {
    const dx = playerShip.x - aiShip.x;
    const dy = playerShip.y - aiShip.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const bulletTravelTime = dist / aiShip.bulletSpeed;
    return {
      x: playerShip.x + playerShip.vx * bulletTravelTime,
      y: playerShip.y + playerShip.vy * bulletTravelTime,
    };
  }

  decide(aiShip: PlayerShip, playerShip: PlayerShip, arena: Arena, dt: number): {
    up: boolean;
    down: boolean;
    left: boolean;
    right: boolean;
    shoot: boolean;
  } {
    if (!aiShip.alive || !playerShip.alive) {
      return { up: false, down: false, left: false, right: false, shoot: false };
    }

    this.decisionTimer += dt;
    this.aimOffsetTimer -= dt;
    if (this.aimOffsetTimer <= 0) {
      this.rollNewAimOffset();
      this.aimOffsetTimer = 0.8 + Math.random() * 1.2;
    }

    switch (this.difficulty) {
      case 'easy':
        return this.easyDecision(aiShip, playerShip, arena, dt);
      case 'medium':
        return this.mediumDecision(aiShip, playerShip, arena, dt);
      case 'hard':
        return this.hardDecision(aiShip, playerShip, arena, dt);
    }
  }

  private easyDecision(aiShip: PlayerShip, playerShip: PlayerShip, arena: Arena, dt: number): {
    up: boolean; down: boolean; left: boolean; right: boolean; shoot: boolean;
  } {
    this.randomShootTimer -= dt;
    if (this.randomShootTimer <= 0) {
      this.randomShootTimer = 0.5 + Math.random() * 1.5;
      this.randomTurnDir = Math.random() > 0.5 ? 1 : -1;
    }

    const target = this.predictTargetPos(aiShip, playerShip);
    const targetAngle = Math.atan2(target.y - aiShip.y, target.x - aiShip.x) + this.aimOffset;
    const angleDiff = this.normalizeAngle(targetAngle - aiShip.angle);

    const turnLeft = angleDiff < -0.1;
    const turnRight = angleDiff > 0.1;

    const threshold = SHOOT_THRESHOLDS.easy;
    const shouldShoot = Math.abs(angleDiff) < threshold && aiShip.shootCooldown <= 0;

    const nearBoundary = arena.isOutOfBounds(aiShip.x, aiShip.y, 30);
    const moveForward = !nearBoundary || Math.random() > 0.5;

    return {
      up: moveForward,
      down: false,
      left: turnLeft || (Math.random() < 0.02 ? this.randomTurnDir < 0 : false),
      right: turnRight || (Math.random() < 0.02 ? this.randomTurnDir > 0 : false),
      shoot: shouldShoot,
    };
  }

  private mediumDecision(aiShip: PlayerShip, playerShip: PlayerShip, arena: Arena, dt: number): {
    up: boolean; down: boolean; left: boolean; right: boolean; shoot: boolean;
  } {
    const dx = playerShip.x - aiShip.x;
    const dy = playerShip.y - aiShip.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const target = this.predictTargetPos(aiShip, playerShip);
    const targetAngle = Math.atan2(target.y - aiShip.y, target.x - aiShip.x) + this.aimOffset;
    const angleDiff = this.normalizeAngle(targetAngle - aiShip.angle);

    const idealDist = 220;
    const moveForward = dist > idealDist * 0.8;
    const moveBackward = dist < idealDist * 0.4;

    const threshold = SHOOT_THRESHOLDS.medium;
    const shouldShoot = Math.abs(angleDiff) < threshold && aiShip.shootCooldown <= 0;

    const avoidBoundary = this.avoidBoundary(aiShip, arena);

    return {
      up: avoidBoundary.up || moveForward,
      down: avoidBoundary.down || moveBackward,
      left: avoidBoundary.left || angleDiff < -0.08,
      right: avoidBoundary.right || angleDiff > 0.08,
      shoot: shouldShoot,
    };
  }

  private hardDecision(aiShip: PlayerShip, playerShip: PlayerShip, arena: Arena, dt: number): {
    up: boolean; down: boolean; left: boolean; right: boolean; shoot: boolean;
  } {
    const dx = playerShip.x - aiShip.x;
    const dy = playerShip.y - aiShip.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const target = this.predictTargetPos(aiShip, playerShip);
    const targetAngle = Math.atan2(target.y - aiShip.y, target.x - aiShip.x) + this.aimOffset;
    const angleDiff = this.normalizeAngle(targetAngle - aiShip.angle);

    const aggressiveDist = 160;
    const moveForward = dist > aggressiveDist;
    const moveBackward = dist < aggressiveDist * 0.5;

    const threshold = SHOOT_THRESHOLDS.hard;
    const shouldShoot = Math.abs(angleDiff) < threshold && aiShip.shootCooldown <= 0;

    const avoidBoundary = this.avoidBoundary(aiShip, arena);
    const dodgeBullets = this.dodgeIncomingBullets(aiShip, playerShip);

    return {
      up: dodgeBullets.up || avoidBoundary.up || moveForward,
      down: dodgeBullets.down || avoidBoundary.down || moveBackward,
      left: dodgeBullets.left || avoidBoundary.left || angleDiff < -0.05,
      right: dodgeBullets.right || avoidBoundary.right || angleDiff > 0.05,
      shoot: shouldShoot,
    };
  }

  private avoidBoundary(ship: PlayerShip, arena: Arena): {
    up: boolean; down: boolean; left: boolean; right: boolean;
  } {
    const margin = 40;
    const cx = (arena.left + arena.right) / 2;
    const cy = (arena.top + arena.bottom) / 2;

    let up = false, down = false, left = false, right = false;

    if (ship.x - margin < arena.left) {
      const toCenter = Math.atan2(cy - ship.y, cx - ship.x);
      const diff = this.normalizeAngle(toCenter - ship.angle);
      left = diff < -0.1;
      right = diff > 0.1;
      up = Math.abs(diff) < Math.PI / 2;
    }
    if (ship.x + margin > arena.right) {
      const toCenter = Math.atan2(cy - ship.y, cx - ship.x);
      const diff = this.normalizeAngle(toCenter - ship.angle);
      left = diff < -0.1;
      right = diff > 0.1;
      up = Math.abs(diff) < Math.PI / 2;
    }
    if (ship.y - margin < arena.top) {
      const toCenter = Math.atan2(cy - ship.y, cx - ship.x);
      const diff = this.normalizeAngle(toCenter - ship.angle);
      left = diff < -0.1;
      right = diff > 0.1;
      up = Math.abs(diff) < Math.PI / 2;
    }
    if (ship.y + margin > arena.bottom) {
      const toCenter = Math.atan2(cy - ship.y, cx - ship.x);
      const diff = this.normalizeAngle(toCenter - ship.angle);
      left = diff < -0.1;
      right = diff > 0.1;
      up = Math.abs(diff) < Math.PI / 2;
    }

    return { up, down, left, right };
  }

  private dodgeIncomingBullets(aiShip: PlayerShip, playerShip: PlayerShip): {
    up: boolean; down: boolean; left: boolean; right: boolean;
  } {
    let up = false, down = false, left = false, right = false;

    for (const b of playerShip.bullets) {
      if (!b.alive) continue;
      const dx = b.x - aiShip.x;
      const dy = b.y - aiShip.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < 80) {
        const bulletAngle = Math.atan2(b.vy, b.vx);
        const toShip = Math.atan2(aiShip.y - b.y, aiShip.x - b.x);
        const angleDiff = Math.abs(this.normalizeAngle(bulletAngle - toShip));

        if (angleDiff < 0.5) {
          const dodgeAngle = bulletAngle + Math.PI / 2;
          const diff = this.normalizeAngle(dodgeAngle - aiShip.angle);
          left = diff < -0.1;
          right = diff > 0.1;
          up = Math.abs(diff) < Math.PI / 2;
          break;
        }
      }
    }

    return { up, down, left, right };
  }

  private normalizeAngle(a: number): number {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }
}
