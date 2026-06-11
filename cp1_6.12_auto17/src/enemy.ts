import type { Rect } from './player';

export interface Enemy {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  active: boolean;
  formation: 'v' | 'line';
}

export interface PowerUp {
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  active: boolean;
  rotation: number;
}

type FormationType = 'v' | 'line';

export class EnemyManager {
  enemies: Enemy[] = [];
  powerUps: PowerUp[] = [];
  spawnTimer: number = 0;
  readonly spawnInterval: number = 2000;
  readonly minEnemiesPerWave: number = 3;
  readonly maxEnemiesPerWave: number = 5;
  readonly powerUpDropChance: number = 0.15;
  readonly minSpeed: number = 0.15;
  readonly maxSpeed: number = 0.35;
  readonly enemyWidth: number = 40;
  readonly enemyHeight: number = 40;
  readonly powerUpSize: number = 30;

  spawnWave(canvasWidth: number): void {
    const count = Math.floor(Math.random() * (this.maxEnemiesPerWave - this.minEnemiesPerWave + 1)) + this.minEnemiesPerWave;
    const formation: FormationType = Math.random() > 0.5 ? 'v' : 'line';
    const speed = this.minSpeed + Math.random() * (this.maxSpeed - this.minSpeed);

    if (formation === 'v') {
      this.spawnVFormation(count, canvasWidth, speed);
    } else {
      this.spawnLineFormation(count, canvasWidth, speed);
    }
  }

  private spawnVFormation(count: number, canvasWidth: number, speed: number): void {
    const centerX = Math.random() * (canvasWidth - count * this.enemyWidth * 1.5) + count * this.enemyWidth * 0.75;
    const startY = -this.enemyHeight * 2;

    for (let i = 0; i < count; i++) {
      const row = Math.ceil(i / 2);
      const side = i % 2 === 0 ? 1 : -1;
      const offsetX = side * row * (this.enemyWidth * 0.8);
      const offsetY = row * (this.enemyHeight * 0.6);

      this.enemies.push({
        x: centerX + offsetX - this.enemyWidth / 2,
        y: startY - offsetY,
        width: this.enemyWidth,
        height: this.enemyHeight,
        speed: speed,
        active: true,
        formation: 'v'
      });
    }
  }

  private spawnLineFormation(count: number, canvasWidth: number, speed: number): void {
    const spacing = this.enemyWidth * 1.2;
    const totalWidth = count * spacing;
    const startX = (canvasWidth - totalWidth) / 2 + spacing / 2;
    const startY = -this.enemyHeight;

    for (let i = 0; i < count; i++) {
      this.enemies.push({
        x: startX + i * spacing - this.enemyWidth / 2,
        y: startY,
        width: this.enemyWidth,
        height: this.enemyHeight,
        speed: speed,
        active: true,
        formation: 'line'
      });
    }
  }

  update(deltaTime: number, canvasWidth: number, canvasHeight: number): boolean {
    this.spawnTimer -= deltaTime;
    if (this.spawnTimer <= 0) {
      this.spawnWave(canvasWidth);
      this.spawnTimer = this.spawnInterval + Math.random() * 1000;
    }

    let playerHit = false;

    this.enemies.forEach(enemy => {
      if (enemy.active) {
        enemy.y += enemy.speed * deltaTime;
        if (enemy.y > canvasHeight + 50) {
          enemy.active = false;
          playerHit = true;
        }
      }
    });

    this.powerUps.forEach(powerUp => {
      if (powerUp.active) {
        powerUp.y += powerUp.speed * deltaTime;
        powerUp.rotation += 0.05;
        if (powerUp.y > canvasHeight + 50) {
          powerUp.active = false;
        }
      }
    });

    this.enemies = this.enemies.filter(e => e.active);
    this.powerUps = this.powerUps.filter(p => p.active);

    return playerHit;
  }

  checkBulletCollisions(bullets: Rect[], onHit: (enemy: Enemy, bulletIndex: number) => void): void {
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;

      for (let i = 0; i < bullets.length; i++) {
        const bullet = bullets[i];
        if (this.checkCollision(enemy, bullet)) {
          onHit(enemy, i);
          break;
        }
      }
    }
  }

  checkPlayerCollision(playerRect: Rect): boolean {
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;
      if (this.checkCollision(enemy, playerRect)) {
        enemy.active = false;
        return true;
      }
    }
    return false;
  }

  checkPowerUpCollision(playerRect: Rect): boolean {
    for (const powerUp of this.powerUps) {
      if (!powerUp.active) continue;
      if (this.checkCollision(powerUp, playerRect)) {
        powerUp.active = false;
        return true;
      }
    }
    return false;
  }

  dropPowerUp(x: number, y: number): void {
    if (Math.random() < this.powerUpDropChance) {
      this.powerUps.push({
        x: x - this.powerUpSize / 2,
        y: y,
        width: this.powerUpSize,
        height: this.powerUpSize,
        speed: 0.1,
        active: true,
        rotation: 0
      });
    }
  }

  private checkCollision(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
  }

  reset(): void {
    this.enemies = [];
    this.powerUps = [];
    this.spawnTimer = 3000;
  }
}
