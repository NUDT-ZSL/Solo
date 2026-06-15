import { ShadowPlayer } from './ShadowPlayer';
import { LightPatrol } from './LightPatrol';

export type GameState = 'menu' | 'playing' | 'exposed' | 'victory';

export interface BeatInfo {
  progress: number;
  isOnBeat: boolean;
  beatIndex: number;
}

export interface GameStats {
  energy: number;
  maxEnergy: number;
  score: number;
  clearedZones: number;
  totalZones: number;
  beat: BeatInfo;
  state: GameState;
  missionText: string;
  exposedTimer: number;
}

export class GameEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  player: ShadowPlayer;
  patrol: LightPatrol;

  state: GameState = 'menu';
  score: number = 0;
  animFrameId: number = 0;
  lastTime: number = 0;

  beatBpm: number = 100;
  beatIntervalMs: number = 0;
  lastBeatTime: number = 0;
  beatIndex: number = 0;
  beatWindowMs: number = 180;

  exposedTimer: number = 0;
  exposedDuration: number = 2000;

  beatFlashAlpha: number = 0;
  failFlashAlpha: number = 0;

  currentZone: number = -1;
  zoneClearTimer: number = 0;
  zoneClearDuration: number = 1500;

  buildings: { x: number; y: number; w: number; h: number; color: string; windows: { rx: number; ry: number; lit: boolean }[] }[] = [];
  stars: { x: number; y: number; size: number; twinklePhase: number }[] = [];

  onStatsUpdate: ((stats: GameStats) => void) | null = null;

  audioCtx: AudioContext | null = null;
  beatSoundBuffer: AudioBuffer | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d')!;
    this.ctx = ctx;
    this.player = new ShadowPlayer(canvas.width * 0.08, canvas.height * 0.5);
    this.patrol = new LightPatrol(canvas.width, canvas.height);
    this.beatIntervalMs = 60000 / this.beatBpm;

    this.generateCityscape();
    this.generateStars();

    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleKeyUp = this.handleKeyUp.bind(this);
    this.gameLoop = this.gameLoop.bind(this);
  }

  generateCityscape() {
    const w = this.canvas.width;
    const h = this.canvas.height;
    this.buildings = [];

    const count = 14;
    for (let i = 0; i < count; i++) {
      const bw = 40 + Math.random() * 80;
      const bh = 80 + Math.random() * (h * 0.5);
      const bx = (w / count) * i + (Math.random() - 0.5) * 20;
      const by = h - bh;
      const shade = Math.floor(10 + Math.random() * 20);
      const color = `rgb(${shade}, ${shade}, ${shade + 8})`;

      const windows: { rx: number; ry: number; lit: boolean }[] = [];
      for (let wy = 10; wy < bh - 15; wy += 18) {
        for (let wx = 8; wx < bw - 8; wx += 14) {
          windows.push({
            rx: wx,
            ry: wy,
            lit: Math.random() > 0.55,
          });
        }
      }

      this.buildings.push({ x: bx, y: by, w: bw, h: bh, color, windows });
    }
  }

  generateStars() {
    this.stars = [];
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height * 0.35,
        size: 0.5 + Math.random() * 1.5,
        twinklePhase: Math.random() * Math.PI * 2,
      });
    }
  }

  start() {
    this.state = 'playing';
    this.score = 0;
    this.exposedTimer = 0;
    this.beatIndex = 0;
    this.lastBeatTime = performance.now();
    this.beatFlashAlpha = 0;
    this.failFlashAlpha = 0;
    this.currentZone = -1;
    this.zoneClearTimer = 0;

    this.player = new ShadowPlayer(this.canvas.width * 0.08, this.canvas.height * 0.5);
    this.patrol = new LightPatrol(this.canvas.width, this.canvas.height);
    this.generateCityscape();
    this.generateStars();

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);

    this.lastTime = performance.now();
    this.gameLoop(this.lastTime);

    this.initAudio();
  }

  stop() {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    cancelAnimationFrame(this.animFrameId);
  }

  handleKeyDown(e: KeyboardEvent) {
    if (this.state === 'menu' && (e.key === 'Enter' || e.key === ' ')) {
      this.start();
      return;
    }
    if (this.state === 'exposed' && this.exposedTimer <= 0) {
      if (e.key === 'Enter' || e.key === ' ') {
        this.start();
      }
      return;
    }
    if (this.state === 'victory' && (e.key === 'Enter' || e.key === ' ')) {
      this.start();
      return;
    }
    this.player.handleKeyDown(e.key);
  }

  handleKeyUp(e: KeyboardEvent) {
    this.player.handleKeyUp(e.key);
  }

  gameLoop(timestamp: number) {
    const dt = Math.min(timestamp - this.lastTime, 50);
    this.lastTime = timestamp;

    if (this.state === 'playing') {
      this.update(dt);
    } else if (this.state === 'exposed') {
      this.exposedTimer -= dt;
      if (this.exposedTimer <= 0) {
        this.emitStats();
      }
    }

    this.render();
    this.emitStats();

    this.animFrameId = requestAnimationFrame(this.gameLoop);
  }

  update(dt: number) {
    const now = performance.now();
    const timeSinceLastBeat = now - this.lastBeatTime;

    if (timeSinceLastBeat >= this.beatIntervalMs) {
      this.lastBeatTime += this.beatIntervalMs;
      this.beatIndex++;
      this.playBeatSound();
    }

    const beatProgress = (now - this.lastBeatTime) / this.beatIntervalMs;
    const isOnBeat = this.isInBeatWindow(now);

    if (isOnBeat && this.beatFlashAlpha <= 0) {
      this.beatFlashAlpha = 0.4;
    }

    this.beatFlashAlpha = Math.max(0, this.beatFlashAlpha - dt * 0.002);
    this.failFlashAlpha = Math.max(0, this.failFlashAlpha - dt * 0.003);

    const isInLight = this.patrol.update(dt, this.player.x, this.player.y);

    this.player.update(dt, isOnBeat, isInLight, this.canvas.width, this.canvas.height);

    if (this.player.energy <= 0) {
      this.state = 'exposed';
      this.exposedTimer = this.exposedDuration;
      this.failFlashAlpha = 1;
      return;
    }

    if (isInLight && this.player.exposed) {
      this.score = Math.max(0, this.score - 1);
    }

    const zoneIdx = this.patrol.checkZoneEntry(this.player.x, this.player.y);
    if (zoneIdx >= 0 && zoneIdx !== this.currentZone) {
      this.currentZone = zoneIdx;
      this.zoneClearTimer = this.zoneClearDuration;
    }

    if (this.currentZone >= 0 && this.zoneClearTimer > 0) {
      this.zoneClearTimer -= dt;
      if (this.zoneClearTimer <= 0) {
        this.patrol.clearZone(this.currentZone);
        this.player.spawnZoneClearEffect();
        this.score += 100;
        this.currentZone = -1;

        if (this.patrol.clearedZoneCount() >= this.patrol.totalZoneCount()) {
          this.state = 'victory';
          return;
        }
      }
    }

    if (isOnBeat && (this.player.keys.size > 0)) {
      this.score += 1;
    }
  }

  isInBeatWindow(now: number): boolean {
    const timeSinceLastBeat = now - this.lastBeatTime;
    const halfWindow = this.beatWindowMs / 2;

    if (timeSinceLastBeat < halfWindow) return true;

    const timeToNextBeat = this.beatIntervalMs - timeSinceLastBeat;
    if (timeToNextBeat < halfWindow) return true;

    return false;
  }

  getBeatInfo(): BeatInfo {
    const now = performance.now();
    const timeSinceLastBeat = now - this.lastBeatTime;
    const progress = timeSinceLastBeat / this.beatIntervalMs;
    return {
      progress: Math.min(1, progress),
      isOnBeat: this.isInBeatWindow(now),
      beatIndex: this.beatIndex,
    };
  }

  render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    this.drawBackground(ctx, w, h);
    this.drawBuildings(ctx, h);
    this.patrol.draw(ctx);
    this.player.draw(ctx);
    this.drawScreenEffects(ctx, w, h);
    this.drawStateOverlays(ctx, w, h);
  }

  drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#050510');
    grad.addColorStop(0.3, '#0a0a2e');
    grad.addColorStop(0.7, '#0d0825');
    grad.addColorStop(1, '#12061f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const t = performance.now() * 0.001;
    for (const star of this.stars) {
      const twinkle = Math.sin(t * 2 + star.twinklePhase) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(200, 200, 255, ${twinkle * 0.8})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }

    const moonX = w * 0.82;
    const moonY = h * 0.12;
    const moonGrad = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, 50);
    moonGrad.addColorStop(0, 'rgba(220, 220, 255, 0.9)');
    moonGrad.addColorStop(0.4, 'rgba(180, 180, 220, 0.3)');
    moonGrad.addColorStop(1, 'rgba(100, 100, 180, 0)');
    ctx.fillStyle = moonGrad;
    ctx.beginPath();
    ctx.arc(moonX, moonY, 50, 0, Math.PI * 2);
    ctx.fill();
  }

  drawBuildings(ctx: CanvasRenderingContext2D, canvasH: number) {
    for (const b of this.buildings) {
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);

      for (const win of b.windows) {
        if (win.lit) {
          const flicker = Math.random() > 0.98 ? 0.3 : 1;
          ctx.fillStyle = `rgba(255, 220, 120, ${0.6 * flicker})`;
        } else {
          ctx.fillStyle = 'rgba(20, 15, 40, 0.8)';
        }
        ctx.fillRect(b.x + win.rx, b.y + win.ry, 6, 8);
      }
    }
  }

  drawScreenEffects(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (this.beatFlashAlpha > 0) {
      const grad = ctx.createRadialGradient(w / 2, h / 2, w * 0.3, w / 2, h / 2, w * 0.7);
      grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
      grad.addColorStop(1, `rgba(50, 100, 255, ${this.beatFlashAlpha * 0.3})`);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
    }

    if (this.failFlashAlpha > 0) {
      ctx.fillStyle = `rgba(255, 30, 30, ${this.failFlashAlpha * 0.3})`;
      ctx.fillRect(0, 0, w, h);
    }
  }

  drawStateOverlays(ctx: CanvasRenderingContext2D, w: number, h: number) {
    if (this.state === 'menu') {
      this.drawMenuOverlay(ctx, w, h);
    } else if (this.state === 'exposed') {
      this.drawExposedOverlay(ctx, w, h);
    } else if (this.state === 'victory') {
      this.drawVictoryOverlay(ctx, w, h);
    }
  }

  drawMenuOverlay(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = 'rgba(5, 5, 20, 0.85)';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = '#8844ff';
    ctx.shadowBlur = 30;
    ctx.fillStyle = '#c8a0ff';
    ctx.font = 'bold 48px "Segoe UI", sans-serif';
    ctx.fillText('影舞夜曲', w / 2, h / 2 - 60);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#8899cc';
    ctx.font = '18px "Segoe UI", sans-serif';
    ctx.fillText('Shadow Dance Nocturne', w / 2, h / 2 - 15);

    const pulse = Math.sin(performance.now() * 0.003) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(150, 180, 255, ${pulse})`;
    ctx.font = '16px monospace';
    ctx.fillText('按 ENTER 或 SPACE 开始', w / 2, h / 2 + 40);

    ctx.fillStyle = '#667799';
    ctx.font = '13px monospace';
    ctx.fillText('WASD 移动 | 踩准节拍快速潜行 | 躲避光线', w / 2, h / 2 + 80);

    ctx.restore();
  }

  drawExposedOverlay(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const alpha = Math.min(1, this.failFlashAlpha);
    ctx.fillStyle = `rgba(80, 0, 0, ${alpha * 0.6})`;
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = '#ff2244';
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#ff4466';
    ctx.font = 'bold 42px "Segoe UI", sans-serif';
    ctx.fillText('影踪暴露', w / 2, h / 2 - 20);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#cc8899';
    ctx.font = '16px monospace';
    ctx.fillText(`得分: ${this.score}`, w / 2, h / 2 + 25);

    if (this.exposedTimer <= 0) {
      const pulse = Math.sin(performance.now() * 0.004) * 0.3 + 0.7;
      ctx.fillStyle = `rgba(200, 150, 180, ${pulse})`;
      ctx.fillText('按 ENTER 重试', w / 2, h / 2 + 60);
    }

    ctx.restore();
  }

  drawVictoryOverlay(ctx: CanvasRenderingContext2D, w: number, h: number) {
    ctx.fillStyle = 'rgba(5, 5, 30, 0.75)';
    ctx.fillRect(0, 0, w, h);

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    ctx.shadowColor = '#44ff88';
    ctx.shadowBlur = 25;
    ctx.fillStyle = '#88ffbb';
    ctx.font = 'bold 42px "Segoe UI", sans-serif';
    ctx.fillText('潜入成功', w / 2, h / 2 - 30);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#aaccee';
    ctx.font = '20px monospace';
    ctx.fillText(`最终得分: ${this.score}`, w / 2, h / 2 + 20);

    const pulse = Math.sin(performance.now() * 0.004) * 0.3 + 0.7;
    ctx.fillStyle = `rgba(150, 220, 255, ${pulse})`;
    ctx.font = '16px monospace';
    ctx.fillText('按 ENTER 再来一局', w / 2, h / 2 + 60);

    ctx.restore();
  }

  emitStats() {
    if (!this.onStatsUpdate) return;
    this.onStatsUpdate({
      energy: this.player.energy,
      maxEnergy: this.player.maxEnergy,
      score: this.score,
      clearedZones: this.patrol.clearedZoneCount(),
      totalZones: this.patrol.totalZoneCount(),
      beat: this.getBeatInfo(),
      state: this.state,
      missionText: `潜入 ${this.patrol.clearedZoneCount()}/${this.patrol.totalZoneCount()} 个区域`,
      exposedTimer: this.exposedTimer,
    });
  }

  initAudio() {
    try {
      this.audioCtx = new AudioContext();
      const sampleRate = this.audioCtx.sampleRate;
      const duration = 0.08;
      const length = Math.floor(sampleRate * duration);
      const buffer = this.audioCtx.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i++) {
        const t = i / sampleRate;
        const env = Math.exp(-t * 40);
        data[i] = Math.sin(2 * Math.PI * 880 * t) * env * 0.15;
      }
      this.beatSoundBuffer = buffer;
    } catch {
      this.audioCtx = null;
    }
  }

  playBeatSound() {
    if (!this.audioCtx || !this.beatSoundBuffer) return;
    try {
      const source = this.audioCtx.createBufferSource();
      source.buffer = this.beatSoundBuffer;
      const gain = this.audioCtx.createGain();
      gain.gain.value = 0.3;
      source.connect(gain);
      gain.connect(this.audioCtx.destination);
      source.start();
    } catch {
      // ignore
    }
  }

  resize(w: number, h: number) {
    this.canvas.width = w;
    this.canvas.height = h;
    if (this.state === 'playing') {
      this.patrol = new LightPatrol(w, h);
    }
    this.generateCityscape();
    this.generateStars();
  }
}
