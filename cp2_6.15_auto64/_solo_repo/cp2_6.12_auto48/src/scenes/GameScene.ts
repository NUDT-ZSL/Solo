import { GameClient, RemotePlayerRender, GemCollectEffect } from '../GameClient';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GROUND_Y,
  PLAYER_SIZE,
  GEM_RADIUS,
} from '../types';

interface Trail {
  x: number;
  y: number;
  time: number;
  color: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

interface SpawnRing {
  x: number;
  y: number;
  startTime: number;
}

export class GameScene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private client: GameClient;
  private animFrameId: number = 0;
  private lastTime: number = 0;
  private trails: Trail[] = [];
  private particles: Particle[] = [];
  private spawnRings: SpawnRing[] = [];
  private prevGemIds: Set<string> = new Set();
  private scoreScale: number = 1.0;
  private scoreScaleTime: number = 0;
  private prevScore: number = 0;
  private onlineCountDisplay: number = 0;
  private onlineCountAlpha: number = 1;
  private latencyColor: string = '#00ff88';
  private latencyTargetColor: string = '#00ff88';

  constructor(canvas: HTMLCanvasElement, client: GameClient) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.client = client;
    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;
  }

  start() {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  stop() {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
    }
  }

  private loop = (time: number) => {
    const dt = Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    this.update(dt);
    this.render();

    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    this.client.updateLocalPlayer(dt);
    this.client.interpolateRemotePlayers();
    this.client.clearOldEffects();

    this.updateTrails(dt);
    this.updateParticles(dt);
    this.updateSpawnRings();
    this.updateScoreAnimation(dt);
    this.updateOnlineCount(dt);
    this.updateLatencyColor();

    this.checkNewGems();
  }

  private updateTrails(dt: number) {
    const now = Date.now();
    this.trails = this.trails.filter(t => now - t.time < 300);

    const lp = this.client.localPlayer;
    if (lp && lp.isSprinting && (lp.vx !== 0) && this.client.connected) {
      if (Math.random() < 0.5) {
        this.trails.push({
          x: lp.x,
          y: lp.y,
          time: now,
          color: lp.color,
        });
      }
    }
  }

  private updateParticles(dt: number) {
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      p.life -= dt;
    }
    this.particles = this.particles.filter(p => p.life > 0);
  }

  private updateSpawnRings() {
    const now = Date.now();
    this.spawnRings = this.spawnRings.filter(r => now - r.startTime < 300);
  }

  private updateScoreAnimation(dt: number) {
    const lp = this.client.localPlayer;
    if (lp && lp.score !== this.prevScore) {
      this.prevScore = lp.score;
      this.scoreScale = 1.3;
      this.scoreScaleTime = 0.3;
    }
    if (this.scoreScaleTime > 0) {
      this.scoreScaleTime -= dt;
      if (this.scoreScaleTime <= 0) {
        this.scoreScale = 1.0;
      } else {
        const t = 1 - this.scoreScaleTime / 0.3;
        if (t < 0.5) {
          this.scoreScale = 1.0 + 0.3 * (t / 0.5);
        } else {
          this.scoreScale = 1.3 - 0.3 * ((t - 0.5) / 0.5);
        }
      }
    }
  }

  private updateOnlineCount(dt: number) {
    const target = this.client.onlineCount;
    if (this.onlineCountDisplay !== target) {
      this.onlineCountDisplay = target;
      this.onlineCountAlpha = 0.3;
    }
    if (this.onlineCountAlpha < 1) {
      this.onlineCountAlpha = Math.min(1, this.onlineCountAlpha + dt * 3);
    }
  }

  private updateLatencyColor() {
    const lat = this.client.latency;
    if (lat < 100) {
      this.latencyTargetColor = '#00ff88';
    } else if (lat < 300) {
      this.latencyTargetColor = '#ffaa00';
    } else {
      this.latencyTargetColor = '#ff4444';
    }
    this.latencyColor = this.latencyTargetColor;
  }

  private checkNewGems() {
    const currentGemIds = new Set(this.client.gems.map(g => g.id));
    for (const id of currentGemIds) {
      if (!this.prevGemIds.has(id)) {
        const gem = this.client.gems.find(g => g.id === id);
        if (gem) {
          this.spawnRings.push({ x: gem.x, y: gem.y, startTime: Date.now() });
        }
      }
    }
    this.prevGemIds = currentGemIds;

    for (const effect of this.client.gemCollectEffects) {
      this.spawnCollectParticles(effect);
    }
  }

  private spawnCollectParticles(effect: GemCollectEffect) {
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      const speed = 120 + Math.random() * 80;
      this.particles.push({
        x: effect.x,
        y: effect.y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5,
        maxLife: 0.5,
        color: '#FFD700',
        size: 3 + Math.random() * 2,
      });
    }
  }

  private render() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.drawBackground(ctx);
    this.drawGrid(ctx);
    this.drawGems(ctx);
    this.drawTrails(ctx);
    this.drawPlayers(ctx);
    this.drawParticles(ctx);
    this.drawSpawnRings(ctx);
    this.drawUI(ctx);
    this.drawConnectionOverlay(ctx);
  }

  private drawBackground(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#1a1e2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private drawGrid(ctx: CanvasRenderingContext2D) {
    const playerCount = this.client.onlineCount;
    let gridColor: string;
    if (playerCount > 3) {
      const t = (Math.sin(Date.now() / 1000 * Math.PI) + 1) / 2;
      const r = Math.round(100 + t * 80);
      const g = Math.round(160 + t * (-40));
      const b = Math.round(220 + t * (-80));
      gridColor = `rgba(${r},${g},${b},0.15)`;
    } else {
      gridColor = 'rgba(100,160,220,0.15)';
    }

    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 1;
    for (let x = 0; x <= CANVAS_WIDTH; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y <= CANVAS_HEIGHT; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    ctx.strokeStyle = 'rgba(100,160,220,0.3)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y + PLAYER_SIZE / 2);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y + PLAYER_SIZE / 2);
    ctx.stroke();
  }

  private drawGems(ctx: CanvasRenderingContext2D) {
    const now = Date.now();
    for (const gem of this.client.gems) {
      const age = (now - gem.spawnTime) / 1000;
      const glowRadius = GEM_RADIUS + 2 + 4 * (Math.sin(age * Math.PI * 2 / 0.8) + 1) / 2;

      ctx.save();
      ctx.shadowColor = '#FFD700';
      ctx.shadowBlur = 15;

      const gradient = ctx.createRadialGradient(gem.x, gem.y, 0, gem.x, gem.y, glowRadius);
      gradient.addColorStop(0, 'rgba(255,215,0,0.6)');
      gradient.addColorStop(0.5, 'rgba(255,215,0,0.2)');
      gradient.addColorStop(1, 'rgba(255,215,0,0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(gem.x, gem.y, glowRadius, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(gem.x, gem.y, GEM_RADIUS, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.beginPath();
      ctx.arc(gem.x - 3, gem.y - 3, GEM_RADIUS * 0.35, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  private drawTrails(ctx: CanvasRenderingContext2D) {
    const now = Date.now();
    for (const trail of this.trails) {
      const age = (now - trail.time) / 300;
      const alpha = 1 - age;
      if (alpha <= 0) continue;

      ctx.save();
      ctx.globalAlpha = alpha * 0.4;
      ctx.fillStyle = trail.color;
      ctx.fillRect(
        trail.x - PLAYER_SIZE / 2,
        trail.y - PLAYER_SIZE / 2,
        PLAYER_SIZE,
        PLAYER_SIZE
      );
      ctx.restore();
    }
  }

  private drawPlayers(ctx: CanvasRenderingContext2D) {
    for (const [, remote] of this.client.remotePlayers) {
      this.drawPlayerBlock(ctx, remote.x, remote.y, remote.color, remote.name, remote.isJumping, remote.spawnTime, true);
    }

    const lp = this.client.localPlayer;
    if (lp) {
      const isDisconnected = !this.client.connected;
      this.drawPlayerBlock(ctx, lp.x, lp.y, lp.color, lp.name, lp.isJumping, lp.spawnTime, false, isDisconnected);
    }
  }

  private drawPlayerBlock(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    color: string,
    name: string,
    isJumping: boolean,
    spawnTime: number,
    isRemote: boolean,
    isDisconnected: boolean = false
  ) {
    const now = Date.now();
    const spawnAge = (now - spawnTime) / 1000;

    let renderX = x;
    let renderY = y;
    let scaleX = 1;
    let scaleY = 1;

    if (spawnAge < 0.5) {
      const t = spawnAge / 0.5;
      const bounce = this.spawnBounce(t);
      renderY = 0 + bounce * (GROUND_Y - PLAYER_SIZE / 2);
      scaleX = 1 + 0.1 * Math.sin(t * Math.PI * 4);
      scaleY = 1 - 0.1 * Math.sin(t * Math.PI * 4);
    } else if (isJumping) {
      scaleX = 0.85;
      scaleY = 1.15;
    }

    const halfW = (PLAYER_SIZE / 2) * scaleX;
    const halfH = (PLAYER_SIZE / 2) * scaleY;

    ctx.save();

    if (isRemote) {
      ctx.globalAlpha = 0.7;
    }
    if (isDisconnected) {
      ctx.globalAlpha = 0.4;
    }

    ctx.shadowColor = color;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 4;
    ctx.shadowBlur = 6;
    ctx.shadowColor = 'rgba(0,0,0,0.3)';

    ctx.fillStyle = color;
    ctx.fillRect(renderX - halfW, renderY - halfH, halfW * 2, halfH * 2);

    ctx.shadowColor = 'transparent';
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.shadowBlur = 0;

    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillRect(renderX - halfW, renderY - halfH, halfW * 2, halfH * 0.4);

    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.strokeRect(renderX - halfW, renderY - halfH, halfW * 2, halfH * 2);

    ctx.font = '11px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    ctx.strokeText(name, renderX, renderY - halfH - 8);
    ctx.fillText(name, renderX, renderY - halfH - 8);

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(renderX, renderY - halfH - 18, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  private spawnBounce(t: number): number {
    if (t < 0.3) {
      const p = t / 0.3;
      return p;
    } else if (t < 0.45) {
      const p = (t - 0.3) / 0.15;
      return 1 - 0.2 * p;
    } else if (t < 0.6) {
      const p = (t - 0.45) / 0.15;
      return 0.8 + 0.2 * p;
    } else if (t < 0.72) {
      const p = (t - 0.6) / 0.12;
      return 1 - 0.08 * p;
    } else if (t < 0.84) {
      const p = (t - 0.72) / 0.12;
      return 0.92 + 0.08 * p;
    } else {
      return 1;
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 4;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * alpha, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawSpawnRings(ctx: CanvasRenderingContext2D) {
    const now = Date.now();
    for (const ring of this.spawnRings) {
      const age = (now - ring.startTime) / 300;
      if (age > 1) continue;
      const radius = 5 + age * 30;
      const alpha = 1 - age;

      ctx.save();
      ctx.globalAlpha = alpha * 0.6;
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ring.x, ring.y, radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private drawUI(ctx: CanvasRenderingContext2D) {
    ctx.save();

    this.drawOnlineCount(ctx);
    this.drawScore(ctx);
    this.drawControlsHint(ctx);
    this.drawLatencyIndicator(ctx);

    ctx.restore();
  }

  private drawOnlineCount(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.globalAlpha = this.onlineCountAlpha;
    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;
    const text = `Online: ${this.onlineCountDisplay}`;
    ctx.strokeText(text, 12, 28);
    ctx.fillText(text, 12, 28);
    ctx.restore();
  }

  private drawScore(ctx: CanvasRenderingContext2D) {
    const lp = this.client.localPlayer;
    if (!lp) return;

    ctx.save();
    ctx.font = 'bold 18px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = '#FFD700';
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 3;

    const text = `Gems: ${lp.score}`;
    const textX = CANVAS_WIDTH - 12;
    const textY = 28;

    ctx.translate(textX, textY);
    ctx.scale(this.scoreScale, this.scoreScale);
    ctx.strokeText(text, 0, 0);
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  private drawControlsHint(ctx: CanvasRenderingContext2D) {
    ctx.save();
    ctx.font = '13px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    ctx.lineWidth = 2;
    const text = 'WASD移动 | Shift加速 | 空格跳跃';
    ctx.strokeText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 12);
    ctx.fillText(text, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 12);
    ctx.restore();
  }

  private drawLatencyIndicator(ctx: CanvasRenderingContext2D) {
    const lat = this.client.latency;
    let label = '良好';
    if (lat >= 100 && lat < 300) label = '一般';
    else if (lat >= 300) label = '差';

    ctx.save();
    ctx.fillStyle = this.latencyColor;
    ctx.beginPath();
    ctx.arc(CANVAS_WIDTH - 20, CANVAS_HEIGHT - 20, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.font = '10px "Courier New", monospace';
    ctx.textAlign = 'right';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(`${lat}ms ${label}`, CANVAS_WIDTH - 32, CANVAS_HEIGHT - 16);
    ctx.restore();
  }

  private drawConnectionOverlay(ctx: CanvasRenderingContext2D) {
    if (this.client.connectionState === 'connected') return;

    const now = Date.now();
    const disconnectedFor = now - this.client.disconnectTime;

    if (disconnectedFor < 3000) return;

    ctx.save();

    const barHeight = 40;
    const slideProgress = Math.min(1, (disconnectedFor - 3000) / 300);
    const offsetY = -barHeight + slideProgress * barHeight;

    ctx.fillStyle = 'rgba(255,140,0,0.85)';
    ctx.fillRect(0, offsetY, CANVAS_WIDTH, barHeight);

    ctx.font = 'bold 16px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'white';
    ctx.fillText('连接断开，尝试重连…', CANVAS_WIDTH / 2, offsetY + barHeight / 2 + 5);

    ctx.restore();
  }
}
