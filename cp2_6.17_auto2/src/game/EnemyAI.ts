export interface EnemyState {
  id: string;
  type: 'patrol' | 'searchlight' | 'dog';
  x: number;
  y: number;
  width: number;
  height: number;
  pathPoints: { x: number; y: number }[];
  currentPathIndex: number;
  direction: number;
  facingAngle: number;
  state: 'patrol' | 'alert' | 'chase' | 'investigate';
  alertTimer: number;
  detectTimer: number;
  investigatePoint: { x: number; y: number } | null;
  visionAngle: number;
  visionRange: number;
  visionConeAngle: number;
  speed: number;
  animFrame: number;
  animTimer: number;
  searchlightAngle: number;
  searchlightRotationSpeed: number;
  searchlightSweepMin: number;
  searchlightSweepMax: number;
  searchlightSweepDir: number;
  barkCooldown: number;
  hasBarked: boolean;
}

export class EnemyAI {
  public enemies: EnemyState[] = [];
  public globalAlertLevel: 'safe' | 'warning' | 'alarm' = 'safe';
  public globalAlertTimer: number = 0;

  constructor(enemyConfigs: Array<{
    id: string;
    type: 'patrol' | 'searchlight' | 'dog';
    x: number;
    y: number;
    pathPoints: { x: number; y: number }[];
    visionAngle?: number;
    rotationSpeed?: number;
  }>) {
    for (const config of enemyConfigs) {
      this.enemies.push(this.createEnemy(config));
    }
  }

  private createEnemy(config: any): EnemyState {
    const base: EnemyState = {
      id: config.id,
      type: config.type,
      x: config.x,
      y: config.y,
      width: config.type === 'dog' ? 28 : 22,
      height: config.type === 'dog' ? 20 : 28,
      pathPoints: config.pathPoints || [],
      currentPathIndex: 0,
      direction: 0,
      facingAngle: config.visionAngle ?? 0,
      state: 'patrol',
      alertTimer: 0,
      detectTimer: 0,
      investigatePoint: null,
      visionAngle: config.visionAngle ?? 0,
      visionRange: 0,
      visionConeAngle: 0,
      speed: 0,
      animFrame: 0,
      animTimer: 0,
      searchlightAngle: config.visionAngle ?? 0,
      searchlightRotationSpeed: config.rotationSpeed ?? 0.015,
      searchlightSweepMin: (config.visionAngle ?? 0) - Math.PI / 3,
      searchlightSweepMax: (config.visionAngle ?? 0) + Math.PI / 3,
      searchlightSweepDir: 1,
      barkCooldown: 0,
      hasBarked: false
    };

    switch (config.type) {
      case 'patrol':
        base.visionRange = 120;
        base.visionConeAngle = Math.PI / 3;
        base.speed = 3;
        break;
      case 'searchlight':
        base.visionRange = 200;
        base.visionConeAngle = Math.PI / 6;
        base.speed = 0;
        break;
      case 'dog':
        base.visionRange = 40;
        base.visionConeAngle = Math.PI * 2;
        base.speed = 5;
        break;
    }

    return base;
  }

  public triggerEchoAlert(x: number, y: number): void {
    for (const enemy of this.enemies) {
      const dx = enemy.x - x;
      const dy = enemy.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= 100) {
        enemy.state = 'investigate';
        enemy.alertTimer = 2000;
        enemy.investigatePoint = { x, y };

        if (enemy.type === 'dog' && enemy.barkCooldown <= 0) {
          enemy.hasBarked = true;
          enemy.barkCooldown = 3000;
          this.attractNearbyGuards(enemy.x, enemy.y, 180);
        }
      }
    }

    this.updateGlobalAlert('warning', 3000);
  }

  private attractNearbyGuards(x: number, y: number, radius: number): void {
    for (const enemy of this.enemies) {
      if (enemy.type === 'patrol' && enemy.state === 'patrol') {
        const dx = enemy.x - x;
        const dy = enemy.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist <= radius) {
          enemy.state = 'investigate';
          enemy.alertTimer = 2500;
          enemy.investigatePoint = { x, y };
        }
      }
    }
  }

  public updateGlobalAlert(level: 'safe' | 'warning' | 'alarm', duration: number): void {
    const priority = { safe: 0, warning: 1, alarm: 2 };
    if (priority[level] >= priority[this.globalAlertLevel]) {
      this.globalAlertLevel = level;
      this.globalAlertTimer = Math.max(this.globalAlertTimer, duration);
    }
  }

  public update(
    deltaTime: number,
    playerPos: { x: number; y: number; width: number; height: number; inShadow: boolean },
    collisionCheck: (x: number, y: number, w: number, h: number) => boolean,
    lineOfSightCheck: (x1: number, y1: number, x2: number, y2: number) => boolean
  ): boolean {
    let playerDetected = false;
    let maxDetectTime = 0;

    if (this.globalAlertTimer > 0) {
      this.globalAlertTimer -= deltaTime;
      if (this.globalAlertTimer <= 0) {
        this.globalAlertLevel = 'safe';
      }
    }

    for (const enemy of this.enemies) {
      if (enemy.barkCooldown > 0) {
        enemy.barkCooldown -= deltaTime;
        if (enemy.barkCooldown <= 0) {
          enemy.hasBarked = false;
        }
      }

      if (enemy.alertTimer > 0) {
        enemy.alertTimer -= deltaTime;
        if (enemy.alertTimer <= 0 && enemy.state === 'alert') {
          enemy.state = 'patrol';
          enemy.investigatePoint = null;
        }
        if (enemy.alertTimer <= 0 && enemy.state === 'investigate') {
          enemy.state = 'patrol';
          enemy.investigatePoint = null;
        }
      }

      const detected = this.checkVision(enemy, playerPos, lineOfSightCheck);

      if (detected) {
        playerDetected = true;
        enemy.detectTimer += deltaTime;
        maxDetectTime = Math.max(maxDetectTime, enemy.detectTimer);

        if (enemy.type !== 'searchlight') {
          enemy.state = 'chase';
          const pcx = playerPos.x + playerPos.width / 2;
          const pcy = playerPos.y + playerPos.height / 2;
          const ecx = enemy.x + enemy.width / 2;
          const ecy = enemy.y + enemy.height / 2;
          enemy.facingAngle = Math.atan2(pcy - ecy, pcx - ecx);
        }

        if (enemy.detectTimer >= 3000) {
          this.updateGlobalAlert('alarm', 5000);
        }
      } else {
        if (enemy.detectTimer > 0) {
          enemy.detectTimer = Math.max(0, enemy.detectTimer - deltaTime * 0.5);
        }
      }

      switch (enemy.type) {
        case 'patrol':
          this.updatePatrol(enemy, deltaTime, playerPos, detected, collisionCheck);
          break;
        case 'searchlight':
          this.updateSearchlight(enemy, deltaTime);
          break;
        case 'dog':
          this.updateDog(enemy, deltaTime, playerPos, detected, collisionCheck);
          break;
      }

      enemy.animTimer += deltaTime;
      if (enemy.animTimer >= 150) {
        enemy.animTimer = 0;
        enemy.animFrame = (enemy.animFrame + 1) % 4;
      }
    }

    if (maxDetectTime > 0) {
      this.updateGlobalAlert(
        maxDetectTime < 1500 ? 'warning' : 'alarm',
        2000
      );
    }

    return playerDetected;
  }

  private checkVision(
    enemy: EnemyState,
    player: { x: number; y: number; width: number; height: number; inShadow: boolean },
    lineOfSightCheck: (x1: number, y1: number, x2: number, y2: number) => boolean
  ): boolean {
    const ecx = enemy.x + enemy.width / 2;
    const ecy = enemy.y + enemy.height / 2;
    const pcx = player.x + player.width / 2;
    const pcy = player.y + player.height / 2;

    const dx = pcx - ecx;
    const dy = pcy - ecy;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > enemy.visionRange) return false;

    if (player.inShadow && enemy.type !== 'dog' && dist > enemy.visionRange * 0.5) {
      return false;
    }

    if (enemy.visionConeAngle < Math.PI * 2) {
      const angleToPlayer = Math.atan2(dy, dx);
      let visionAngle = enemy.facingAngle;
      if (enemy.type === 'searchlight') {
        visionAngle = enemy.searchlightAngle;
      }

      let angleDiff = angleToPlayer - visionAngle;
      while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
      while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

      if (Math.abs(angleDiff) > enemy.visionConeAngle / 2) return false;
    }

    if (!lineOfSightCheck(ecx, ecy, pcx, pcy)) return false;

    return true;
  }

  private updatePatrol(
    enemy: EnemyState,
    deltaTime: number,
    player: any,
    detected: boolean,
    collisionCheck: (x: number, y: number, w: number, h: number) => boolean
  ): void {
    let targetX: number, targetY: number;
    let speed = enemy.speed;

    if (enemy.state === 'chase') {
      targetX = player.x + player.width / 2 - enemy.width / 2;
      targetY = player.y + player.height / 2 - enemy.height / 2;
      speed = enemy.speed * 1.1;
    } else if (enemy.state === 'investigate' && enemy.investigatePoint) {
      targetX = enemy.investigatePoint.x - enemy.width / 2;
      targetY = enemy.investigatePoint.y - enemy.height / 2;
      speed = enemy.speed * 0.8;
    } else {
      if (enemy.pathPoints.length === 0) return;
      const point = enemy.pathPoints[enemy.currentPathIndex];
      targetX = point.x - enemy.width / 2;
      targetY = point.y - enemy.height / 2;
    }

    const dx = targetX - enemy.x;
    const dy = targetY - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      const ndx = dx / dist;
      const ndy = dy / dist;

      if (enemy.state !== 'investigate' || detected) {
        enemy.facingAngle = Math.atan2(ndy, ndx);
      }

      const newX = enemy.x + ndx * speed * (deltaTime / 16.67);
      const newY = enemy.y + ndy * speed * (deltaTime / 16.67);

      if (!collisionCheck(newX, enemy.y, enemy.width, enemy.height)) {
        enemy.x = newX;
      }
      if (!collisionCheck(enemy.x, newY, enemy.width, enemy.height)) {
        enemy.y = newY;
      }
    } else if (enemy.state === 'patrol' && enemy.pathPoints.length > 0) {
      enemy.currentPathIndex = (enemy.currentPathIndex + 1) % enemy.pathPoints.length;
    } else if (enemy.state === 'investigate') {
      if (enemy.alertTimer <= 0) {
        enemy.state = 'patrol';
        enemy.investigatePoint = null;
      }
    }
  }

  private updateSearchlight(enemy: EnemyState, deltaTime: number): void {
    enemy.searchlightAngle += enemy.searchlightRotationSpeed * enemy.searchlightSweepDir * (deltaTime / 16.67);

    if (enemy.searchlightAngle >= enemy.searchlightSweepMax) {
      enemy.searchlightAngle = enemy.searchlightSweepMax;
      enemy.searchlightSweepDir = -1;
    } else if (enemy.searchlightAngle <= enemy.searchlightSweepMin) {
      enemy.searchlightAngle = enemy.searchlightSweepMin;
      enemy.searchlightSweepDir = 1;
    }

    enemy.facingAngle = enemy.searchlightAngle;
  }

  private updateDog(
    enemy: EnemyState,
    deltaTime: number,
    player: any,
    detected: boolean,
    collisionCheck: (x: number, y: number, w: number, h: number) => boolean
  ): void {
    let targetX: number, targetY: number;

    if (enemy.state === 'chase' || detected) {
      targetX = player.x + player.width / 2 - enemy.width / 2;
      targetY = player.y + player.height / 2 - enemy.height / 2;
    } else if (enemy.state === 'investigate' && enemy.investigatePoint) {
      targetX = enemy.investigatePoint.x - enemy.width / 2;
      targetY = enemy.investigatePoint.y - enemy.height / 2;
    } else {
      if (enemy.pathPoints.length === 0) return;
      const point = enemy.pathPoints[enemy.currentPathIndex];
      targetX = point.x - enemy.width / 2;
      targetY = point.y - enemy.height / 2;
    }

    const dx = targetX - enemy.x;
    const dy = targetY - enemy.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 8) {
      const ndx = dx / dist;
      const ndy = dy / dist;
      enemy.facingAngle = Math.atan2(ndy, ndx);

      const newX = enemy.x + ndx * enemy.speed * (deltaTime / 16.67);
      const newY = enemy.y + ndy * enemy.speed * (deltaTime / 16.67);

      if (!collisionCheck(newX, enemy.y, enemy.width, enemy.height)) {
        enemy.x = newX;
      }
      if (!collisionCheck(enemy.x, newY, enemy.width, enemy.height)) {
        enemy.y = newY;
      }
    } else if (enemy.pathPoints.length > 0) {
      if (enemy.state === 'investigate') {
        if (enemy.alertTimer <= 0) {
          enemy.state = 'patrol';
          enemy.investigatePoint = null;
        }
      } else {
        enemy.currentPathIndex = (enemy.currentPathIndex + 1) % enemy.pathPoints.length;
      }
    }
  }

  public getMaxDetectionTime(): number {
    let max = 0;
    for (const e of this.enemies) {
      max = Math.max(max, e.detectTimer);
    }
    return max;
  }
}
