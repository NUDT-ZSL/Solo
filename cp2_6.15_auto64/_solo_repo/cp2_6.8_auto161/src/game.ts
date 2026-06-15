import {
  CANVAS_WIDTH, CANVAS_HEIGHT,
  Turret, Enemy, Laser, Fragment, Particle, LightningBolt, Star,
  ObjectPool, EnemyType
} from './entities';
import { Renderer } from './renderer';

export interface GameCallbacks {
  onGameOver: (score: number) => void;
  onEnergyFull: () => void;
  onEnergyDrained: () => void;
}

export class Game {
  private turret: Turret;
  private enemyPool: ObjectPool<Enemy>;
  private laserPool: ObjectPool<Laser>;
  private fragmentPool: ObjectPool<Fragment>;
  private particlePool: ObjectPool<Particle>;
  private lightningPool: ObjectPool<LightningBolt>;
  private stars: Star[];
  private renderer: Renderer;

  public score: number;
  public energy: number;
  public maxEnergy: number;
  public currentWave: number;
  public totalWaves: number;
  public isGameOver: boolean;
  public energyFullNotified: boolean;

  private waveTimer: number;
  private waveInterval: number;
  private spawnTimer: number;
  private spawnQueue: { type: EnemyType; delay: number }[];
  private callbacks: GameCallbacks;

  constructor(renderer: Renderer, callbacks: GameCallbacks) {
    this.renderer = renderer;
    this.callbacks = callbacks;

    this.turret = new Turret();
    this.enemyPool = new ObjectPool(() => new Enemy(), 60);
    this.laserPool = new ObjectPool(() => new Laser(), 60);
    this.fragmentPool = new ObjectPool(() => new Fragment(), 60);
    this.particlePool = new ObjectPool(() => new Particle(), 60);
    this.lightningPool = new ObjectPool(() => new LightningBolt(), 60);

    this.stars = [];
    for (let i = 0; i < 50; i++) {
      this.stars.push(new Star());
    }

    this.score = 0;
    this.energy = 0;
    this.maxEnergy = 100;
    this.currentWave = 0;
    this.totalWaves = 6;
    this.isGameOver = false;
    this.energyFullNotified = false;

    this.waveTimer = 0;
    this.waveInterval = 10000;
    this.spawnTimer = 0;
    this.spawnQueue = [];
  }

  reset(): void {
    this.turret.reset();
    this.enemyPool.clear();
    this.laserPool.clear();
    this.fragmentPool.clear();
    this.particlePool.clear();
    this.lightningPool.clear();

    this.score = 0;
    this.energy = 0;
    this.currentWave = 0;
    this.isGameOver = false;
    this.energyFullNotified = false;

    this.waveTimer = 0;
    this.spawnTimer = 0;
    this.spawnQueue = [];

    this.callbacks.onEnergyDrained();
  }

  update(dt: number): void {
    if (this.isGameOver) return;

    this.renderer.update(dt);

    if (this.spawnQueue.length > 0) {
      this.spawnTimer -= dt;
      while (this.spawnQueue.length > 0 && this.spawnTimer <= 0) {
        const next = this.spawnQueue.shift()!;
        this.spawnEnemy(next.type);
        if (this.spawnQueue.length > 0) {
          this.spawnTimer += this.spawnQueue[0].delay;
        }
      }
    } else if (this.currentWave < this.totalWaves) {
      this.waveTimer += dt;
      if (this.waveTimer >= this.waveInterval) {
        this.waveTimer = 0;
        this.startNextWave();
      }
    }

    const enemies = this.enemyPool.getAll();

    const newLaser = this.turret.update(dt, enemies);
    if (newLaser) {
      const laser = this.laserPool.acquire();
      laser.reset(newLaser.x, newLaser.y, newLaser.angle);
    }

    for (const laser of this.laserPool.getAll()) {
      if (!laser.active) continue;
      laser.update(dt);
    }

    for (const enemy of enemies) {
      if (!enemy.active) continue;
      enemy.update(dt, this.turret.x, this.turret.y);

      if (enemy.y > CANVAS_HEIGHT) {
        this.isGameOver = true;
        this.callbacks.onGameOver(this.score);
        return;
      }
    }

    this.checkCollisions();

    for (const frag of this.fragmentPool.getAll()) {
      if (!frag.active) continue;
      const collected = frag.update(dt, this.turret);
      if (collected) {
        this.energy = Math.min(this.maxEnergy, this.energy + 10);
        this.score += 10;
        if (this.energy >= this.maxEnergy && !this.energyFullNotified) {
          this.energyFullNotified = true;
          this.callbacks.onEnergyFull();
        }
      }
    }

    for (const p of this.particlePool.getAll()) {
      if (!p.active) continue;
      p.update(dt);
    }

    for (const bolt of this.lightningPool.getAll()) {
      if (!bolt.active) continue;
      bolt.update(dt);
    }
  }

  private checkCollisions(): void {
    const lasers = this.laserPool.getAll();
    const enemies = this.enemyPool.getAll();

    for (const laser of lasers) {
      if (!laser.active) continue;
      for (const enemy of enemies) {
        if (!enemy.active) continue;
        const dx = laser.x - enemy.x;
        const dy = laser.y - enemy.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < enemy.getBoundingRadius() + 4) {
          laser.active = false;
          this.destroyEnemy(enemy);
          break;
        }
      }
    }
  }

  private destroyEnemy(enemy: Enemy): void {
    enemy.active = false;
    this.score += 100;

    const fragCount = 4 + Math.floor(Math.random() * 3);
    for (let i = 0; i < fragCount; i++) {
      const frag = this.fragmentPool.acquire();
      frag.reset(enemy.x, enemy.y, enemy.color);
    }

    for (let i = 0; i < 3; i++) {
      const p = this.particlePool.acquire();
      p.reset(enemy.x + (Math.random() - 0.5) * 10, enemy.y + (Math.random() - 0.5) * 10);
    }
  }

  private spawnEnemy(type: EnemyType): void {
    const enemy = this.enemyPool.acquire();
    enemy.reset(type, this.currentWave, this.turret.x, this.turret.y);
  }

  private startNextWave(): void {
    this.currentWave++;
    this.spawnQueue = [];

    let triangleCount: number;
    let diamondCount: number;

    if (this.currentWave === 1) {
      triangleCount = 8;
      diamondCount = 0;
    } else if (this.currentWave === 2) {
      triangleCount = 0;
      diamondCount = 12;
    } else {
      const extra = this.currentWave - 2;
      triangleCount = 8 + extra * 2;
      diamondCount = 12 + extra * 2;
    }

    const totalCount = triangleCount + diamondCount;
    const types: EnemyType[] = [];
    for (let i = 0; i < triangleCount; i++) types.push('triangle');
    for (let i = 0; i < diamondCount; i++) types.push('diamond');

    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }

    const baseDelay = 400;
    for (let i = 0; i < types.length; i++) {
      this.spawnQueue.push({
        type: types[i],
        delay: baseDelay + Math.random() * 200
      });
    }

    if (this.spawnQueue.length > 0) {
      this.spawnTimer = this.spawnQueue[0].delay;
    }
  }

  triggerLightningStorm(): boolean {
    if (this.energy < this.maxEnergy) return false;

    this.energy = 0;
    this.energyFullNotified = false;
    this.callbacks.onEnergyDrained();

    this.renderer.triggerFlash(100);
    this.renderer.triggerShake(3, 200);

    for (let i = 0; i < 8; i++) {
      const bolt = this.lightningPool.acquire();
      bolt.reset(50 + Math.random() * (CANVAS_WIDTH - 100));
    }

    const enemies = this.enemyPool.getAll();
    for (const enemy of enemies) {
      if (!enemy.active) continue;
      enemy.hitFlash = 500;
      setTimeout(() => {
        if (enemy.active) this.destroyEnemy(enemy);
      }, 100);
    }

    return true;
  }

  render(): void {
    this.renderer.clear(this.stars);

    for (const frag of this.fragmentPool.getActive()) {
      this.renderer.drawFragment(frag);
    }

    for (const p of this.particlePool.getActive()) {
      this.renderer.drawParticle(p);
    }

    for (const enemy of this.enemyPool.getActive()) {
      this.renderer.drawEnemy(enemy);
    }

    for (const laser of this.laserPool.getActive()) {
      this.renderer.drawLaser(laser);
    }

    for (const bolt of this.lightningPool.getActive()) {
      this.renderer.drawLightning(bolt);
    }

    this.renderer.drawTurret(this.turret);

    if (!this.isGameOver) {
      this.renderer.drawHUD(this.score, this.energy, this.maxEnergy);
    }
  }
}
