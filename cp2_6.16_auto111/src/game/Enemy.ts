import type { Enemy, PlayerState, Vector2, GameMap } from './types';

export class EnemyAI {
  enemy: Enemy;
  private map: GameMap;

  constructor(id: number, spawnX: number, spawnY: number, patrolPoints: Vector2[], map: GameMap) {
    this.map = map;
    const baseSpeed = 30 + Math.random() * 20;
    this.enemy = {
      id,
      x: spawnX,
      y: spawnY,
      width: 16,
      height: 24,
      speed: baseSpeed,
      baseSpeed,
      state: 'patrol',
      patrolPoints,
      currentPatrolIndex: 0,
      patrolDirection: 1,
      viewAngle: 90,
      viewDistance: 80,
      facing: 0,
      alertTimer: 0,
      chaseTimer: 0,
      alertAnimation: 0,
      playerLastSeen: null,
    };
  }

  update(player: PlayerState, playerAverageOpacity: number, dt: number): { triggered: boolean; lostTarget: boolean } {
    const result = { triggered: false, lostTarget: false };

    this.enemy.alertAnimation += dt * Math.PI * 4;

    if (this.enemy.state === 'patrol') {
      this.patrol(dt);
      if (this.canSeePlayer(player, playerAverageOpacity)) {
        this.enemy.state = 'alert';
        this.enemy.alertTimer = 0.5;
        this.enemy.playerLastSeen = { x: player.x, y: player.y };
        result.triggered = true;
      }
    } else if (this.enemy.state === 'alert') {
      this.enemy.alertTimer -= dt;
      if (this.enemy.alertTimer <= 0) {
        this.enemy.state = 'chase';
        this.enemy.chaseTimer = 5;
        this.enemy.speed = this.enemy.baseSpeed * 1.5;
      }
    } else if (this.enemy.state === 'chase') {
      this.enemy.chaseTimer -= dt;
      
      if (this.canSeePlayer(player, playerAverageOpacity)) {
        this.enemy.chaseTimer = 5;
        this.enemy.playerLastSeen = { x: player.x, y: player.y };
      }

      if (this.enemy.playerLastSeen) {
        this.chase(this.enemy.playerLastSeen, dt);
      }

      if (this.enemy.chaseTimer <= 0) {
        this.enemy.state = 'patrol';
        this.enemy.speed = this.enemy.baseSpeed;
        this.enemy.playerLastSeen = null;
        result.lostTarget = true;
      }
    }

    return result;
  }

  private patrol(dt: number): void {
    const target = this.enemy.patrolPoints[this.enemy.currentPatrolIndex];
    const dx = target.x - this.enemy.x;
    const dy = target.y - this.enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 5) {
      const nextIndex = this.enemy.currentPatrolIndex + this.enemy.patrolDirection;
      if (nextIndex >= this.enemy.patrolPoints.length || nextIndex < 0) {
        this.enemy.patrolDirection = (this.enemy.patrolDirection * -1) as 1 | -1;
      } else {
        this.enemy.currentPatrolIndex = nextIndex;
      }
    } else {
      this.move(dx / dist, dy / dist, dt);
    }
  }

  private chase(target: Vector2, dt: number): void {
    const dx = target.x - this.enemy.x;
    const dy = target.y - this.enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist > 5) {
      this.move(dx / dist, dy / dist, dt);
    }
  }

  private move(dx: number, dy: number, dt: number): void {
    this.enemy.facing = Math.atan2(dy, dx);

    const newX = this.enemy.x + dx * this.enemy.speed * dt;
    const newY = this.enemy.y + dy * this.enemy.speed * dt;

    if (!this.checkCollision(newX, this.enemy.y)) {
      this.enemy.x = newX;
    }
    if (!this.checkCollision(this.enemy.x, newY)) {
      this.enemy.y = newY;
    }

    this.enemy.x = Math.max(this.enemy.width / 2, Math.min(this.map.width - this.enemy.width / 2, this.enemy.x));
    this.enemy.y = Math.max(this.enemy.height / 2, Math.min(this.map.height - this.enemy.height / 2, this.enemy.y));
  }

  private checkCollision(x: number, y: number): boolean {
    const halfWidth = this.enemy.width / 2 - 2;
    const halfHeight = this.enemy.height / 2 - 2;

    const corners: Vector2[] = [
      { x: x - halfWidth, y: y - halfHeight },
      { x: x + halfWidth, y: y - halfHeight },
      { x: x - halfWidth, y: y + halfHeight },
      { x: x + halfWidth, y: y + halfHeight },
    ];

    for (const corner of corners) {
      if (this.map.isWall(corner.x, corner.y)) {
        return true;
      }
      if (!this.map.isFloor(corner.x, corner.y)) {
        return true;
      }
    }

    return false;
  }

  private canSeePlayer(player: PlayerState, playerAverageOpacity: number): boolean {
    if (playerAverageOpacity >= 0.3) return false;

    const dx = player.x - this.enemy.x;
    const dy = player.y - this.enemy.y;
    const dist = Math.hypot(dx, dy);

    if (dist > this.enemy.viewDistance) return false;

    const angleToPlayer = Math.atan2(dy, dx);
    let angleDiff = Math.abs(angleToPlayer - this.enemy.facing);
    if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

    const halfAngle = (this.enemy.viewAngle * Math.PI / 180) / 2;
    if (angleDiff > halfAngle) return false;

    if (!this.hasLineOfSight(this.enemy.x, this.enemy.y, player.x, player.y)) {
      return false;
    }

    return true;
  }

  private hasLineOfSight(x1: number, y1: number, x2: number, y2: number): boolean {
    const steps = 20;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      if (this.map.isWall(x, y)) {
        return false;
      }
    }
    return true;
  }
}
