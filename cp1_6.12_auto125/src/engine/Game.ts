import { GameLoop } from './GameLoop';
import { Player } from '../entities/Player';
import { Platform } from '../entities/Platform';
import { Enemy } from '../entities/Enemy';
import { InputHandler } from '../systems/InputHandler';
import { Recorder } from '../systems/Recorder';
import { GameParams, PlatformData, Hitbox, DirtyRect, AttackType } from '../types';

const WORLD_WIDTH = 2000;
const WORLD_HEIGHT = 600;
const GROUND_HEIGHT = 100;

const DEFAULT_PARAMS: GameParams = {
  jumpHeight: 400,
  gravity: 1000,
  lightDamage: 10,
  heavyDamage: 25,
  dashCooldown: 0.8,
};

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gameLoop: GameLoop;
  private player: Player;
  private platforms: Platform[] = [];
  private enemies: Enemy[] = [];
  private inputHandler: InputHandler;
  private recorder: Recorder;
  private params: GameParams;
  private cameraX: number = 0;
  private dirtyRects: DirtyRect[] = [];
  private bgCache: HTMLCanvasElement | null = null;
  private onParamsChange?: (params: GameParams) => void;
  private onGameOver?: () => void;
  private gameOver: boolean = false;
  private viewportWidth: number = 800;
  private viewportHeight: number = 600;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.params = { ...DEFAULT_PARAMS };

    this.inputHandler = new InputHandler();
    this.recorder = new Recorder();

    this.player = new Player(100, 300, this.params);
    this.createPlatforms();
    this.createEnemies();

    this.gameLoop = new GameLoop(this.update.bind(this), this.render.bind(this));

    this.createBackgroundCache();
    this.resize();
  }

  private createPlatforms(): void {
    this.platforms.push(new Platform(0, WORLD_HEIGHT - GROUND_HEIGHT, WORLD_WIDTH, GROUND_HEIGHT, true));

    const platformCount = 5;
    const startX = 200;
    for (let i = 0; i < platformCount; i++) {
      const width = 120 + Math.random() * 80;
      const x = startX + i * (WORLD_WIDTH - 400) / platformCount + Math.random() * 50;
      const y = 250 + Math.random() * 200;
      this.platforms.push(new Platform(x, y, width, 20, false));
    }
  }

  private createEnemies(): void {
    const enemyCount = 3;
    const positions = [
      { x: 500, patrolLeft: 400, patrolRight: 700, y: WORLD_HEIGHT - GROUND_HEIGHT - 20 },
      { x: 900, patrolLeft: 800, patrolRight: 1100, y: WORLD_HEIGHT - GROUND_HEIGHT - 20 },
      { x: 1400, patrolLeft: 1300, patrolRight: 1600, y: WORLD_HEIGHT - GROUND_HEIGHT - 20 },
    ];

    for (let i = 0; i < enemyCount; i++) {
      const pos = positions[i];
      this.enemies.push(new Enemy(i, pos.x, pos.y, pos.patrolLeft, pos.patrolRight));
    }
  }

  private createBackgroundCache(): void {
    this.bgCache = document.createElement('canvas');
    this.bgCache.width = WORLD_WIDTH;
    this.bgCache.height = WORLD_HEIGHT;
    const bgCtx = this.bgCache.getContext('2d')!;

    const gradient = bgCtx.createLinearGradient(0, 0, 0, WORLD_HEIGHT);
    gradient.addColorStop(0, '#87CEEB');
    gradient.addColorStop(1, '#E0F6FF');
    bgCtx.fillStyle = gradient;
    bgCtx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

    bgCtx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    const clouds = [
      { x: 100, y: 80, r: 30 },
      { x: 150, y: 70, r: 40 },
      { x: 200, y: 85, r: 25 },
      { x: 600, y: 100, r: 35 },
      { x: 660, y: 90, r: 45 },
      { x: 720, y: 105, r: 30 },
      { x: 1200, y: 60, r: 28 },
      { x: 1250, y: 50, r: 38 },
      { x: 1300, y: 65, r: 22 },
      { x: 1700, y: 90, r: 32 },
      { x: 1760, y: 80, r: 42 },
    ];
    for (const cloud of clouds) {
      bgCtx.beginPath();
      bgCtx.arc(cloud.x, cloud.y, cloud.r, 0, Math.PI * 2);
      bgCtx.fill();
    }
  }

  public start(): void {
    this.gameLoop.start();
  }

  public stop(): void {
    this.gameLoop.stop();
  }

  public resize(): void {
    this.viewportWidth = this.canvas.width;
    this.viewportHeight = this.canvas.height;
  }

  private update(dt: number): void {
    if (this.gameOver) return;

    const input = this.inputHandler.getState();
    const platformData: PlatformData[] = this.platforms.map(p => p.data);

    if (this.recorder.getIsPlaying()) {
      const frame = this.recorder.updatePlayback(dt);
      if (frame) {
        // Playback uses recorded positions for trail rendering
      }
      return;
    }

    const hitboxes = this.player.update(dt, input, platformData);

    this.checkAttackHits(hitboxes);

    for (const enemy of this.enemies) {
      enemy.update(dt, platformData);
    }

    if (this.player.state.y > WORLD_HEIGHT + 100) {
      this.player.takeDamage(this.player.state.health);
    }

    if (this.player.isDead()) {
      this.gameOver = true;
      if (this.onGameOver) {
        this.onGameOver();
      }
    }

    this.updateCamera();

    if (this.recorder.getIsRecording()) {
      this.recorder.recordFrame(
        this.player.state.x + this.player.state.width / 2,
        this.player.state.y + this.player.state.height / 2,
        input
      );
    }

    this.inputHandler.clearFrame();
  }

  private checkAttackHits(hitboxes: Hitbox[]): void {
    const player = this.player;

    for (const hitbox of hitboxes) {
      if (!hitbox.active) continue;

      for (const enemy of this.enemies) {
        if (!enemy.state.alive) continue;
        if (player.hitEnemies.has(enemy.state.id)) continue;

        if (enemy.checkHit(hitbox)) {
          enemy.takeDamage(hitbox.damage, hitbox.knockback, player.state.facing);
          player.hitEnemies.add(enemy.state.id);

          if (this.recorder.getIsRecording()) {
            this.recorder.addHit(enemy.state.x, enemy.state.y);
          }

          if (player.state.attackType) {
            this.recorder.addAttackEvent(
              player.state.attackType,
              hitbox.x + hitbox.width / 2,
              hitbox.y + hitbox.height / 2
            );
          }
        }
      }
    }
  }

  private updateCamera(): void {
    const targetX = this.player.state.x + this.player.state.width / 2 - this.viewportWidth / 2;
    this.cameraX += (targetX - this.cameraX) * 0.1;
    this.cameraX = Math.max(0, Math.min(WORLD_WIDTH - this.viewportWidth, this.cameraX));
  }

  private render(): void {
    const ctx = this.ctx;
    const w = this.viewportWidth;
    const h = this.viewportHeight;

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    ctx.translate(-Math.floor(this.cameraX), 0);

    if (this.bgCache) {
      ctx.drawImage(
        this.bgCache,
        Math.floor(this.cameraX), 0, w, h,
        0, 0, w, h
      );
    }

    for (const platform of this.platforms) {
      if (this.isVisible(platform.data.x, platform.data.y, platform.data.width, platform.data.height)) {
        platform.render(ctx);
      }
    }

    for (const enemy of this.enemies) {
      if (enemy.isDead()) continue;
      if (this.isVisible(enemy.state.x - enemy.state.radius, enemy.state.y - enemy.state.radius,
                         enemy.state.radius * 2, enemy.state.radius * 2)) {
        enemy.render(ctx);
      }
    }

    this.player.render(ctx);
    this.renderAttackHitboxes(ctx);

    if (this.recorder.getIsRecording() || this.recorder.getIsPlaying()) {
      this.renderTrail(ctx);
      this.renderHitMarkers(ctx);
    }

    ctx.restore();

    this.renderHUD(ctx);

    if (this.recorder.getIsRecording()) {
      this.renderRecordingIndicator(ctx);
    }
  }

  private renderAttackHitboxes(ctx: CanvasRenderingContext2D): void {
    const hitboxes = this.player.getCurrentHitboxes();
    for (const hb of hitboxes) {
      if (!hb.active) continue;
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.strokeRect(hb.x, hb.y, hb.width, hb.height);
      ctx.fillStyle = 'rgba(255, 200, 100, 0.2)';
      ctx.fillRect(hb.x, hb.y, hb.width, hb.height);
      ctx.restore();
    }
  }

  private renderTrail(ctx: CanvasRenderingContext2D): void {
    const trail = this.recorder.getTrailPoints();
    if (trail.length < 2) return;

    ctx.save();
    ctx.strokeStyle = 'rgba(74, 144, 217, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(trail[0].x, trail[0].y);
    for (let i = 1; i < trail.length; i++) {
      ctx.lineTo(trail[i].x, trail[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  private renderHitMarkers(ctx: CanvasRenderingContext2D): void {
    const hits = this.recorder.getHitMarkers();
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 80, 80, 0.8)';
    ctx.lineWidth = 2;
    for (const hit of hits) {
      ctx.beginPath();
      ctx.arc(hit.x, hit.y, 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderHUD(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const s = this.player.state;

    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(20, 20, 204, 24);
    ctx.fillStyle = '#2ECC71';
    ctx.fillRect(22, 22, 200 * (s.health / s.maxHealth), 20);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`HP: ${Math.ceil(s.health)} / ${s.maxHealth}`, 122, 38);

    if (s.dashCooldownTimer > 0) {
      const cdPercent = 1 - s.dashCooldownTimer / this.params.dashCooldown;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(20, 52, 104, 18);
      ctx.fillStyle = '#4A90D9';
      ctx.fillRect(22, 54, 100 * cdPercent, 14);
      ctx.fillStyle = '#fff';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('冲刺CD', 28, 66);
    }

    ctx.restore();
  }

  private renderRecordingIndicator(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    const pulse = Math.sin(performance.now() / 200) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(255, 50, 50, ${pulse})`;
    ctx.beginPath();
    ctx.arc(this.viewportWidth - 40, 35, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 12px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('REC', this.viewportWidth - 55, 39);
    ctx.restore();
  }

  private isVisible(x: number, y: number, w: number, h: number): boolean {
    return x + w > this.cameraX && x < this.cameraX + this.viewportWidth &&
           y + h > 0 && y < this.viewportHeight;
  }

  public setParams(params: Partial<GameParams>): void {
    this.params = { ...this.params, ...params };
    this.player.params = this.params;
  }

  public getParams(): GameParams {
    return { ...this.params };
  }

  public setOnParamsChange(callback: (params: GameParams) => void): void {
    this.onParamsChange = callback;
  }

  public setOnGameOver(callback: () => void): void {
    this.onGameOver = callback;
  }

  public reset(): void {
    this.gameOver = false;
    this.player.reset(100, 300);
    this.enemies = [];
    this.platforms = [this.platforms[0]];
    this.createPlatforms();
    this.createEnemies();
    this.cameraX = 0;
    this.recorder = new Recorder();
  }

  public toggleRecording(): boolean {
    return this.recorder.toggleRecording();
  }

  public startPlayback(): boolean {
    return this.recorder.startPlayback();
  }

  public isRecording(): boolean {
    return this.recorder.getIsRecording();
  }

  public hasRecording(): boolean {
    return this.recorder.hasRecording();
  }

  public exportConfig(): string {
    const config = {
      params: this.params,
      attacks: {
        light: { damage: this.params.lightDamage, hitbox: { width: 40, height: 30 }, startup: 0.12, recovery: 0.08 },
        heavy: { damage: this.params.heavyDamage, hitbox: { width: 60, height: 40 }, knockback: 50, startup: 0.25, recovery: 0.20 },
        dash: { damage: 20, hitbox: { width: 80, height: 20 }, distance: 120, cooldown: this.params.dashCooldown, startup: 0.20, recovery: 0.15 },
      },
      movement: {
        moveSpeed: 250,
        jumpHeight: this.params.jumpHeight,
        gravity: this.params.gravity,
        maxJumps: 2,
      },
      enemy: {
        health: 30,
        speed: 60,
        radius: 20,
      },
    };
    return JSON.stringify(config, null, 2);
  }

  public destroy(): void {
    this.gameLoop.stop();
    this.inputHandler.destroy();
  }

  public getPlayer(): Player {
    return this.player;
  }
}
