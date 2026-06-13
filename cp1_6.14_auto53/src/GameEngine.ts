import { PlayerShip } from './PlayerShip';
import { EnergyOrb } from './EnergyOrb';
import { Arena, ShrinkSpeed } from './Arena';
import { SinglePlayerAI, AIDifficulty } from './SinglePlayerAI';

export interface GameInput {
  p1: { up: boolean; down: boolean; left: boolean; right: boolean; shoot: boolean };
  p2: { up: boolean; down: boolean; left: boolean; right: boolean; shoot: boolean };
}

export type GameMode = 'menu' | 'playing' | 'gameover';
export type PlayMode = 'dual' | 'single';

export interface GameState {
  mode: GameMode;
  playMode: PlayMode;
  winner: number | null;
  p1Hp: number;
  p1MaxHp: number;
  p1Shield: number;
  p2Hp: number;
  p2MaxHp: number;
  p2Shield: number;
  elapsed: number;
  isRedFlash: boolean;
  redFlashTimer: number;
}

export class GameEngine {
  canvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;
  ship1: PlayerShip;
  ship2: PlayerShip;
  arena: Arena;
  orbs: EnergyOrb[] = [];
  ai: SinglePlayerAI | null = null;
  playMode: PlayMode = 'dual';
  aiDifficulty: AIDifficulty = 'medium';
  shrinkSpeed: ShrinkSpeed = 'medium';

  mode: GameMode = 'menu';
  winner: number | null = null;
  elapsed: number = 0;
  orbSpawnTimer: number = 5;
  outsideDamageTimer: number = 0;

  isRedFlash: boolean = false;
  redFlashTimer: number = 0;

  private animFrameId: number = 0;
  private lastTime: number = 0;
  private running: boolean = false;

  keys: Set<string> = new Set();

  onStateChange: ((state: GameState) => void) | null = null;

  constructor() {
    this.ship1 = new PlayerShip(200, 300, 0, 1);
    this.ship2 = new PlayerShip(600, 300, Math.PI, 2);
    this.arena = new Arena(this.shrinkSpeed);
  }

  init(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    canvas.width = 800;
    canvas.height = 600;
  }

  startDual() {
    this.playMode = 'dual';
    this.ai = null;
    this.startGame();
  }

  startSingle(difficulty: AIDifficulty) {
    this.playMode = 'single';
    this.aiDifficulty = difficulty;
    this.ai = new SinglePlayerAI(difficulty);
    this.startGame();
  }

  private startGame() {
    this.ship1.reset(200, 300, 0);
    this.ship2.reset(600, 300, Math.PI);
    this.arena = new Arena(this.shrinkSpeed);
    this.orbs = [];
    this.elapsed = 0;
    this.orbSpawnTimer = 5;
    this.outsideDamageTimer = 0;
    this.winner = null;
    this.isRedFlash = false;
    this.redFlashTimer = 0;
    this.mode = 'playing';
    this.emitState();

    if (!this.running) {
      this.running = true;
      this.lastTime = performance.now();
      this.loop(this.lastTime);
    }
  }

  stop() {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = 0;
    }
    this.mode = 'menu';
    this.emitState();
  }

  private loop = (now: number) => {
    if (!this.running) return;

    const rawDt = (now - this.lastTime) / 1000;
    const dt = Math.min(rawDt, 1 / 30);
    this.lastTime = now;

    if (this.mode === 'playing') {
      this.update(dt);
    }

    this.render();
    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    this.elapsed += dt;

    const input = this.getInput();

    this.ship1.update(dt, input.p1);

    if (this.playMode === 'single' && this.ai) {
      const aiInput = this.ai.decide(this.ship2, this.ship1, this.arena, dt);
      this.ship2.update(dt, aiInput);
    } else {
      this.ship2.update(dt, input.p2);
    }

    this.ship1.checkBulletCollision(this.ship2);
    this.ship2.checkBulletCollision(this.ship1);

    this.arena.update(dt);

    this.outsideDamageTimer += dt;
    if (this.outsideDamageTimer >= 1 / 15) {
      this.outsideDamageTimer = 0;
      if (this.arena.isOutOfBounds(this.ship1.x, this.ship1.y, this.ship1.getCollisionRadius())) {
        this.ship1.takeDamage(1);
      }
      if (this.arena.isOutOfBounds(this.ship2.x, this.ship2.y, this.ship2.getCollisionRadius())) {
        this.ship2.takeDamage(1);
      }
    }

    this.orbSpawnTimer -= dt;
    if (this.orbSpawnTimer <= 0) {
      this.orbSpawnTimer = 5;
      const orb = EnergyOrb.spawnInBounds(
        this.arena.left,
        this.arena.top,
        this.arena.right,
        this.arena.bottom,
      );
      this.orbs.push(orb);
    }

    for (const orb of this.orbs) {
      if (!orb.alive) continue;
      orb.update(dt);

      if (this.ship1.alive && orb.checkCollision(this.ship1.x, this.ship1.y, this.ship1.getCollisionRadius())) {
        this.applyOrb(orb, this.ship1);
        orb.alive = false;
      }
      if (this.ship2.alive && orb.checkCollision(this.ship2.x, this.ship2.y, this.ship2.getCollisionRadius())) {
        this.applyOrb(orb, this.ship2);
        orb.alive = false;
      }
    }

    this.orbs = this.orbs.filter(o => o.alive);

    if (this.redFlashTimer > 0) {
      this.redFlashTimer -= dt;
      if (this.redFlashTimer <= 0) {
        this.isRedFlash = false;
      }
    }

    if (!this.ship1.alive && this.ship1.explosionTimer <= 0) {
      this.endGame(2);
    } else if (!this.ship2.alive && this.ship2.explosionTimer <= 0) {
      this.endGame(1);
    }

    this.emitState();
  }

  private applyOrb(orb: EnergyOrb, ship: PlayerShip) {
    switch (orb.type) {
      case 'heal':
        ship.heal(30);
        break;
      case 'shield':
        ship.addShield(20);
        break;
      case 'speed':
        ship.activateSpeedBoost();
        break;
      case 'missile':
        ship.giveMissile();
        break;
    }
  }

  private endGame(winner: number) {
    this.winner = winner;
    this.mode = 'gameover';
    this.isRedFlash = true;
    this.redFlashTimer = 0.5;
    this.emitState();
  }

  private getInput(): GameInput {
    const p1 = {
      up: this.keys.has('KeyW'),
      down: this.keys.has('KeyS'),
      left: this.keys.has('KeyA'),
      right: this.keys.has('KeyD'),
      shoot: this.keys.has('Space'),
    };
    const p2 = {
      up: this.keys.has('ArrowUp'),
      down: this.keys.has('ArrowDown'),
      left: this.keys.has('ArrowLeft'),
      right: this.keys.has('ArrowRight'),
      shoot: this.keys.has('Enter'),
    };
    return { p1, p2 };
  }

  handleKeyDown(e: KeyboardEvent) {
    this.keys.add(e.code);
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Enter'].includes(e.code)) {
      e.preventDefault();
    }
  }

  handleKeyUp(e: KeyboardEvent) {
    this.keys.delete(e.code);
  }

  private render() {
    if (!this.ctx) return;
    const ctx = this.ctx;

    ctx.clearRect(0, 0, 800, 600);

    this.arena.draw(ctx);

    for (const orb of this.orbs) {
      orb.draw(ctx);
    }

    this.ship1.draw(ctx);
    this.ship2.draw(ctx);

    if (this.ship1.alive) {
      this.arena.drawOutOfBoundsWarning(
        ctx, this.ship1.x, this.ship1.y, this.ship1.getCollisionRadius(), this.ship1.hp, this.ship1.maxHp,
      );
    }
    if (this.ship2.alive) {
      this.arena.drawOutOfBoundsWarning(
        ctx, this.ship2.x, this.ship2.y, this.ship2.getCollisionRadius(), this.ship2.hp, this.ship2.maxHp,
      );
    }

    if (this.isRedFlash && this.redFlashTimer > 0) {
      const alpha = (this.redFlashTimer / 0.5) * 0.3;
      ctx.fillStyle = `rgba(239,68,68,${alpha})`;
      ctx.fillRect(0, 0, 800, 600);
    }
  }

  private emitState() {
    if (this.onStateChange) {
      this.onStateChange({
        mode: this.mode,
        playMode: this.playMode,
        winner: this.winner,
        p1Hp: this.ship1.hp,
        p1MaxHp: this.ship1.maxHp,
        p1Shield: this.ship1.shield,
        p2Hp: this.ship2.hp,
        p2MaxHp: this.ship2.maxHp,
        p2Shield: this.ship2.shield,
        elapsed: this.elapsed,
        isRedFlash: this.isRedFlash,
        redFlashTimer: this.redFlashTimer,
      });
    }
  }

  setShrinkSpeed(speed: ShrinkSpeed) {
    this.shrinkSpeed = speed;
  }

  getState(): GameState {
    return {
      mode: this.mode,
      playMode: this.playMode,
      winner: this.winner,
      p1Hp: this.ship1.hp,
      p1MaxHp: this.ship1.maxHp,
      p1Shield: this.ship1.shield,
      p2Hp: this.ship2.hp,
      p2MaxHp: this.ship2.maxHp,
      p2Shield: this.ship2.shield,
      elapsed: this.elapsed,
      isRedFlash: this.isRedFlash,
      redFlashTimer: this.redFlashTimer,
    };
  }
}
