import { LevelGenerator } from './levelGenerator';
import { EffectManager, EffectEventType } from './effectManager';
import { Renderer } from './renderer';
import {
  Player,
  InputState,
  Camera,
  HUDData,
  PlatformBlock,
  GAME_WIDTH,
  GAME_HEIGHT,
  PLAYER_WIDTH,
  PLAYER_HEIGHT,
  PLAYER_SPEED,
  JUMP_VELOCITY,
  GRAVITY,
  INITIAL_LIVES,
  INVINCIBLE_TIME,
} from './types';

class Game {
  private canvas: HTMLCanvasElement;
  private levelGenerator: LevelGenerator;
  private effectManager: EffectManager;
  private renderer: Renderer;
  private player: Player;
  private input: InputState;
  private camera: Camera;
  private hud: HUDData;
  private lastTime = 0;
  private running = false;

  constructor() {
    const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas element not found');

    this.canvas = canvas;
    this.levelGenerator = new LevelGenerator();
    this.effectManager = new EffectManager();
    this.renderer = new Renderer(canvas);

    this.player = this.createPlayer();
    this.input = { left: false, right: false, jump: false, jumpPressed: false };
    this.camera = { x: 0, y: 0 };
    this.hud = { score: 0, lives: INITIAL_LIVES, level: 1 };

    this.setupInput();
  }

  private createPlayer(): Player {
    return {
      x: 100,
      y: GAME_HEIGHT - 64 * 3 - PLAYER_HEIGHT,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      vx: 0,
      vy: 0,
      onGround: false,
      lives: INITIAL_LIVES,
      facing: 1,
      invincibleTime: 0,
    };
  }

  private setupInput(): void {
    window.addEventListener('keydown', (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyA':
        case 'ArrowLeft':
          this.input.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.input.right = true;
          break;
        case 'Space':
        case 'ArrowUp':
        case 'KeyW':
          if (!this.input.jump) {
            this.input.jumpPressed = true;
          }
          this.input.jump = true;
          e.preventDefault();
          break;
      }
    });

    window.addEventListener('keyup', (e: KeyboardEvent) => {
      switch (e.code) {
        case 'KeyA':
        case 'ArrowLeft':
          this.input.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.input.right = false;
          break;
        case 'Space':
        case 'ArrowUp':
        case 'KeyW':
          this.input.jump = false;
          break;
      }
    });
  }

  public start(): void {
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  }

  private loop(currentTime: number): void {
    if (!this.running) return;

    const dt = Math.min(0.05, (currentTime - this.lastTime) / 1000);
    this.lastTime = currentTime;

    this.update(dt);
    this.render();

    this.input.jumpPressed = false;
    requestAnimationFrame(this.loop.bind(this));
  }

  private update(dt: number): void {
    this.updatePlayer(dt);
    this.updateCamera();
    this.levelGenerator.update(this.player, this.camera.x, dt);
    this.effectManager.update(dt);
    this.checkCollisions();
    this.hud.level = this.levelGenerator.getLevel();

    if (this.player.y > GAME_HEIGHT + 200) {
      this.playerHit();
      this.respawnPlayer();
    }
  }

  private updatePlayer(dt: number): void {
    const p = this.player;

    p.vx = 0;
    if (this.input.left) {
      p.vx = -PLAYER_SPEED;
      p.facing = -1;
    }
    if (this.input.right) {
      p.vx = PLAYER_SPEED;
      p.facing = 1;
    }

    if (this.input.jumpPressed && p.onGround) {
      p.vy = -JUMP_VELOCITY;
      p.onGround = false;
      this.triggerEffect('jump', p.x + p.width / 2, p.y + p.height);
    }

    p.vy += GRAVITY * dt;
    if (p.vy > 1200) p.vy = 1200;

    p.x += p.vx * dt;

    if (p.invincibleTime > 0) {
      p.invincibleTime = Math.max(0, p.invincibleTime - dt);
    }

    const platforms = this.levelGenerator.getPlatforms();

    for (const plat of platforms) {
      if (plat.state === 'disappearing') continue;
      if (this.rectsOverlap(p, plat)) {
        if (p.vx > 0) {
          p.x = plat.x - p.width;
        } else if (p.vx < 0) {
          p.x = plat.x + plat.width;
        }
      }
    }

    p.y += p.vy * dt;
    p.onGround = false;

    for (const plat of platforms) {
      if (plat.state === 'disappearing') continue;
      if (this.rectsOverlap(p, plat)) {
        if (p.vy > 0) {
          p.y = plat.y - p.height;
          p.vy = 0;
          p.onGround = true;
          this.levelGenerator.flashPlatform(plat.id);
        } else if (p.vy < 0) {
          p.y = plat.y + plat.height;
          p.vy = 0;
        }
      }
    }

    if (p.x < this.camera.x) {
      p.x = this.camera.x;
    }
  }

  private rectsOverlap(a: { x: number; y: number; width: number; height: number }, b: { x: number; y: number; width: number; height: number }): boolean {
    return (
      a.x < b.x + b.width &&
      a.x + a.width > b.x &&
      a.y < b.y + b.height &&
      a.y + a.height > b.y
    );
  }

  private checkCollisions(): void {
    const p = this.player;
    const centerX = p.x + p.width / 2;
    const centerY = p.y + p.height / 2;

    const spikes = this.levelGenerator.getSpikes();
    for (const s of spikes) {
      if (s.slideInTime > 0) continue;
      if (p.invincibleTime > 0) continue;
      const spikeBox = { x: s.x + 4, y: s.y + 8, width: s.size - 8, height: s.size - 8 };
      if (this.rectsOverlap(p, spikeBox)) {
        this.playerHit();
        break;
      }
    }

    const stars = this.levelGenerator.getStars();
    for (const star of stars) {
      if (star.collected) continue;
      const dx = (star.x + star.size / 2) - centerX;
      const dy = (star.y + star.size / 2) - centerY;
      const dist2 = dx * dx + dy * dy;
      const r = (star.size + Math.max(p.width, p.height)) / 2;
      if (dist2 < r * r) {
        this.levelGenerator.collectStar(star.id);
        this.triggerEffect('collect', star.x + star.size / 2, star.y + star.size / 2);
        this.hud.score += 100;
      }
    }
  }

  private playerHit(): void {
    if (this.player.invincibleTime > 0) return;
    this.player.lives--;
    this.hud.lives = this.player.lives;
    this.player.invincibleTime = INVINCIBLE_TIME;
    this.player.vy = -250;
    this.player.vx = -this.player.facing * 200;
    this.triggerEffect('hit', this.player.x + this.player.width / 2, this.player.y + this.player.height / 2);

    if (this.player.lives <= 0) {
      this.resetGame();
    }
  }

  private respawnPlayer(): void {
    const platforms = this.levelGenerator.getPlatforms().filter(p => p.state !== 'disappearing');
    if (platforms.length === 0) return;
    let nearestPlat: PlatformBlock | null = null;
    let minDist = Infinity;
    for (const plat of platforms) {
      const d = Math.abs(plat.x - this.camera.x);
      if (d < minDist && plat.x > this.camera.x - 100) {
        minDist = d;
        nearestPlat = plat;
      }
    }
    if (nearestPlat) {
      this.player.x = nearestPlat.x + nearestPlat.width / 2 - this.player.width / 2;
      this.player.y = nearestPlat.y - this.player.height - 10;
    }
    this.player.vx = 0;
    this.player.vy = 0;
  }

  private resetGame(): void {
    this.levelGenerator.reset();
    this.effectManager.reset();
    this.player = this.createPlayer();
    this.camera = { x: 0, y: 0 };
    this.hud = { score: 0, lives: INITIAL_LIVES, level: 1 };
  }

  private updateCamera(): void {
    const targetX = this.player.x + this.player.width / 2 - GAME_WIDTH / 3;
    this.camera.x += (targetX - this.camera.x) * 0.1;
    if (this.camera.x < 0) this.camera.x = 0;
    this.camera.y = 0;
  }

  private triggerEffect(type: EffectEventType, x: number, y: number): void {
    this.effectManager.trigger(type, x, y);
  }

  private render(): void {
    this.renderer.render(
      this.levelGenerator.getPlatforms(),
      this.levelGenerator.getSpikes(),
      this.levelGenerator.getStars(),
      this.effectManager.getParticles(),
      this.player,
      this.camera,
      this.hud,
      this.effectManager.getScreenFlash()
    );
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
