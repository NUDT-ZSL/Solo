import type { Rect, Enemy, FormationType } from './types';

export { Enemy };

export class EnemyManager {
  enemies: Enemy[] = [];
  spawnTimer: number = 0;
  readonly spawnInterval: number = 2000;
  readonly minEnemiesPerWave: number = 3;
  readonly maxEnemiesPerWave: number = 5;
  readonly minSpeed: number = 0.15;
  readonly maxSpeed: number = 0.35;
  readonly enemyWidth: number = 40;
  readonly enemyHeight: number = 40;
  readonly collisionShrink: number = 0.85;

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

    this.enemies = this.enemies.filter(e => e.active);

    return playerHit;
  }

  checkBulletCollisions(bullets: Rect[], onHit: (enemy: Enemy, bulletIndex: number) => void): void {
    for (const enemy of this.enemies) {
      if (!enemy.active) continue;

      const enemyRect = this.getShrunkenRect(enemy);

      for (let i = 0; i < bullets.length; i++) {
        const bullet = bullets[i];
        if (!bullet || !(bullet as any).active) continue;

        if (this.checkCollision(enemyRect, bullet)) {
          onHit(enemy, i);
          break;
        }
      }
    }
  }

  checkPlayerCollision(playerRect: Rect): boolean {
    const playerShrink = this.getShrunkenRect(playerRect);

    for (const enemy of this.enemies) {
      if (!enemy.active) continue;

      const enemyRect = this.getShrunkenRect(enemy);
      if (this.checkCollision(enemyRect, playerShrink)) {
        enemy.active = false;
        return true;
      }
    }
    return false;
  }

  private getShrunkenRect(rect: Rect): Rect {
    const w = rect.width * this.collisionShrink;
    const h = rect.height * this.collisionShrink;
    return {
      x: rect.x + (rect.width - w) / 2,
      y: rect.y + (rect.height - h) / 2,
      width: w,
      height: h
    };
  }

  private checkCollision(a: Rect, b: Rect): boolean {
    return a.x < b.x + b.width &&
           a.x + a.width > b.x &&
           a.y < b.y + b.height &&
           a.y + a.height > b.y;
  }

  reset(): void {
    this.enemies = [];
    this.spawnTimer = 3000;
  }
}
