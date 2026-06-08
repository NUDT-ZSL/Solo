import {
  GameState,
  PlayerId,
  GAME_CONFIG,
  COLORS,
  ScreenEffect,
} from './types';
import { createPlayer, updatePlayer, damagePlayer } from './PlayerUnit';
import { createBeatTrack, updateBeatTrack, getTrackY, shouldSpawnBubble, createBeatBubble, updateBeatBubbles } from './BeatTrack';
import { ParticleSystem, createExplosionParticles, createTrailParticle } from './ParticleSystem';
import { InputManager } from './InputManager';
import { Renderer } from './Renderer';

export class GameEngine {
  private state: GameState;
  private input: InputManager;
  private particleSystem: ParticleSystem;
  private renderer: Renderer;
  private running: boolean = false;
  private lastTime: number = 0;
  private animFrameId: number = 0;
  private onStateChange: ((state: GameState) => void) | null = null;
  private lastBubbleBeat: number = -1;

  constructor() {
    this.input = new InputManager();
    this.particleSystem = new ParticleSystem();
    this.renderer = new Renderer(null!);
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    return {
      phase: 'menu',
      players: [
        createPlayer(0, 0, 0),
        createPlayer(1, 0, 0),
      ],
      beatTrack: createBeatTrack(),
      particles: [],
      projectiles: [],
      beatBubbles: [],
      screenEffect: { redFlash: 0, shakeX: 0, shakeY: 0, shakeIntensity: 0, shakeDecay: 5 },
      time: 0,
      timeRemaining: GAME_CONFIG.MATCH_DURATION,
      matchDuration: GAME_CONFIG.MATCH_DURATION,
      winner: null,
      nextProjectileId: 0,
      nextBubbleId: 0,
    };
  }

  init(ctx: CanvasRenderingContext2D, width: number, height: number) {
    this.renderer = new Renderer(ctx);
    this.renderer.resize(width, height);
    this.resetPositions(width, height);
  }

  private resetPositions(width: number, height: number) {
    this.state.players[0] = createPlayer(0, width * 0.25, height * 0.4);
    this.state.players[1] = createPlayer(1, width * 0.75, height * 0.4);
  }

  setOnStateChange(callback: (state: GameState) => void) {
    this.onStateChange = callback;
  }

  handleKeyDown(code: string) {
    this.input.handleKeyDown(code);

    if (this.state.phase === 'menu') {
      if (code === 'Space' || code === 'Enter') {
        this.startGame();
      }
    } else if (this.state.phase === 'ended') {
      if (code === 'Space' || code === 'Enter') {
        this.resetGame();
      }
    }
  }

  handleKeyUp(code: string) {
    this.input.handleKeyUp(code);
  }

  private startGame() {
    this.state.phase = 'playing';
    this.state.time = 0;
    this.state.timeRemaining = GAME_CONFIG.MATCH_DURATION;
    this.state.winner = null;
    this.state.projectiles = [];
    this.state.beatBubbles = [];
    this.particleSystem.clear();
    this.lastBubbleBeat = -1;
  }

  private resetGame() {
    const w = this.renderer['width'];
    const h = this.renderer['height'];
    this.state = this.createInitialState();
    this.resetPositions(w, h);
    this.particleSystem.clear();
    this.lastBubbleBeat = -1;
    this.state.phase = 'menu';
  }

  resize(width: number, height: number) {
    this.renderer.resize(width, height);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    this.running = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  private loop = (now: number) => {
    if (!this.running) return;

    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    if (this.state.phase === 'playing') {
      this.update(dt);
    }

    this.renderer.render(this.state);

    if (this.onStateChange) {
      this.onStateChange({ ...this.state, particles: this.particleSystem.getParticles() });
    }

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    this.input.update();
    this.state.time += dt;
    this.state.timeRemaining -= dt;

    if (this.state.timeRemaining <= 0) {
      this.state.timeRemaining = 0;
      this.endGame();
      return;
    }

    const isBeat = updateBeatTrack(this.state.beatTrack, this.state.time, dt);
    if (isBeat && shouldSpawnBubble(this.state.beatTrack)) {
      if (this.state.beatTrack.beatCount !== this.lastBubbleBeat) {
        this.lastBubbleBeat = this.state.beatTrack.beatCount;
        const w = this.renderer['width'];
        const h = this.renderer['height'];
        const bubble = createBeatBubble(this.state.nextBubbleId++, this.state.beatTrack, w, h);
        this.state.beatBubbles.push(bubble);
      }
    }

    const w = this.renderer['width'];
    const h = this.renderer['height'];

    for (let i = 0; i < 2; i++) {
      const player = this.state.players[i];
      if (player.hp <= 0) continue;

      const opponent = this.state.players[1 - i];
      const trackY = getTrackY(this.state.beatTrack, player.x, h);

      updatePlayer(
        player,
        opponent,
        this.input,
        dt,
        trackY,
        w,
        h,
        (proj) => {
          proj.id = this.state.nextProjectileId++;
          this.state.projectiles.push(proj);
        },
        (particles) => this.particleSystem.spawn(particles)
      );

      if (Math.abs(player.vx) > 10 || Math.abs(player.vy) > 10) {
        if (Math.random() < 0.3) {
          this.particleSystem.spawn([createTrailParticle(player.x, player.y, player.color)]);
        }
      }
    }

    this.updateProjectiles(dt);

    updateBeatBubbles(
      this.state.beatBubbles,
      dt,
      this.state.players,
      this.state.beatTrack,
      h,
      (particles) => this.particleSystem.spawn(particles)
    );

    this.state.beatBubbles = this.state.beatBubbles.filter(b => !b.collected && !b.expired);

    this.particleSystem.update(dt);
    this.state.particles = this.particleSystem.getParticles();

    this.updateScreenEffect(dt);
  }

  private updateProjectiles(dt: number) {
    const w = this.renderer['width'];
    const h = this.renderer['height'];

    for (let i = this.state.projectiles.length - 1; i >= 0; i--) {
      const proj = this.state.projectiles[i];
      proj.x += proj.vx * dt;
      proj.y += proj.vy * dt;
      proj.life -= dt;

      if (proj.life <= 0 || proj.x < -50 || proj.x > w + 50 || proj.y < -50 || proj.y > h + 50) {
        this.state.projectiles.splice(i, 1);
        continue;
      }

      const targetIdx: PlayerId = proj.ownerId === 0 ? 1 : 0;
      const target = this.state.players[targetIdx];

      if (target.hp <= 0 || target.invincibleTimer > 0) continue;

      const dx = proj.x - target.x;
      const dy = proj.y - target.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitRadius = proj.radius + GAME_CONFIG.PLAYER_SIZE;

      if (dist < hitRadius) {
        const damage = proj.isCharged ? GAME_CONFIG.HP_DAMAGE_CHARGED : GAME_CONFIG.HP_DAMAGE_NORMAL;

        const died = damagePlayer(
          target,
          damage,
          (particles) => this.particleSystem.spawn(particles),
          (intensity) => {
            this.state.screenEffect.redFlash = intensity;
            this.state.screenEffect.shakeIntensity = intensity;
          }
        );

        this.particleSystem.spawn(
          createExplosionParticles(proj.x, proj.y, proj.color, proj.isCharged ? 16 : 8, proj.isCharged ? 1.5 : 1)
        );

        this.state.projectiles.splice(i, 1);

        if (died) {
          this.endGame();
          return;
        }
      }
    }
  }

  private updateScreenEffect(dt: number) {
    const effect = this.state.screenEffect;
    if (effect.redFlash > 0) {
      effect.redFlash = Math.max(0, effect.redFlash - dt * 2);
    }
    if (effect.shakeIntensity > 0) {
      effect.shakeIntensity = Math.max(0, effect.shakeIntensity - dt * effect.shakeDecay);
    }
  }

  private endGame() {
    this.state.phase = 'ended';
    if (this.state.players[0].hp <= 0) {
      this.state.winner = 1;
    } else if (this.state.players[1].hp <= 0) {
      this.state.winner = 0;
    } else {
      this.state.winner = this.state.players[0].hp >= this.state.players[1].hp ? 0 : 1;
    }
  }

  getState(): GameState {
    return this.state;
  }
}
