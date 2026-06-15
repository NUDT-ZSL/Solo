import {
  PlatformBlock,
  Spike,
  Star,
  Particle,
  ScreenFlash,
  Player,
  HUDData,
  Camera,
  GAME_WIDTH,
  GAME_HEIGHT,
  APPEAR_DURATION,
  DISAPPEAR_DURATION,
  SPIKE_SLIDE_DURATION,
  LAND_FLASH_DURATION,
} from './types';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private canvas: HTMLCanvasElement;
  private bgStars: { x: number; y: number; size: number; speed: number; layer: number }[];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;
    this.bgStars = this.generateBackgroundStars();
    this.setupResizeHandler();
  }

  private generateBackgroundStars(): { x: number; y: number; size: number; speed: number; layer: number }[] {
    const stars = [];
    for (let i = 0; i < 120; i++) {
      const layer = Math.floor(Math.random() * 3);
      stars.push({
        x: Math.random() * GAME_WIDTH * 3,
        y: Math.random() * GAME_HEIGHT,
        size: layer === 0 ? 1 : layer === 1 ? 2 : 3,
        speed: layer === 0 ? 0.05 : layer === 1 ? 0.15 : 0.3,
        layer,
      });
    }
    return stars;
  }

  private setupResizeHandler(): void {
    const resize = () => {
      const container = document.getElementById('game-container');
      if (!container) return;
      const vw = container.clientWidth;
      const vh = container.clientHeight;
      const ratio = GAME_WIDTH / GAME_HEIGHT;
      let w = vw;
      let h = vw / ratio;
      if (h > vh) {
        h = vh;
        w = vh * ratio;
      }
      this.canvas.style.width = `${w}px`;
      this.canvas.style.height = `${h}px`;
    };
    window.addEventListener('resize', resize);
    resize();
  }

  public render(
    platforms: PlatformBlock[],
    spikes: Spike[],
    stars: Star[],
    particles: Particle[],
    player: Player,
    camera: Camera,
    hud: HUDData,
    flash: ScreenFlash | null
  ): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.drawParallaxBackground(camera.x);

    ctx.save();
    ctx.translate(-camera.x, -camera.y);

    this.drawPlatforms(platforms);
    this.drawSpikes(spikes);
    this.drawStars(stars);
    this.drawPlayer(player);
    this.drawParticles(particles);

    ctx.restore();

    this.drawHUD(hud);
    this.drawScreenFlash(flash);
  }

  private drawParallaxBackground(cameraX: number): void {
    const ctx = this.ctx;
    const layers = [
      { speed: 0.05, color: '#1a1a3a', size: 1 },
      { speed: 0.15, color: '#3a3a6a', size: 2 },
      { speed: 0.3, color: '#6a6aaa', size: 3 },
    ];
    for (const layer of layers) {
      ctx.fillStyle = layer.color;
      for (const s of this.bgStars) {
        if (Math.abs(s.speed - layer.speed) > 0.01) continue;
        const offsetX = (s.x - cameraX * s.speed) % (GAME_WIDTH * 2);
        const drawX = offsetX < 0 ? offsetX + GAME_WIDTH * 2 : offsetX;
        if (drawX >= -10 && drawX <= GAME_WIDTH + 10) {
          ctx.fillRect(Math.floor(drawX), Math.floor(s.y), s.size, s.size);
        }
      }
    }
  }

  private drawPlatforms(platforms: PlatformBlock[]): void {
    const ctx = this.ctx;
    for (const p of platforms) {
      let scale = 1;
      let alpha = 1;

      if (p.state === 'appearing') {
        const t = Math.min(1, p.stateTime / APPEAR_DURATION);
        scale = 0.5 + 0.5 * t;
        alpha = t;
      } else if (p.state === 'disappearing') {
        const t = Math.min(1, p.stateTime / DISAPPEAR_DURATION);
        scale = 1 - 0.5 * t;
        alpha = 1 - t;
      }

      if (alpha <= 0) continue;

      const cx = p.x + p.width / 2;
      const cy = p.y + p.height / 2;
      const w = p.width * scale;
      const h = p.height * scale;
      const drawX = cx - w / 2;
      const drawY = cy - h / 2;

      ctx.globalAlpha = alpha;

      if (p.flashTime > 0) {
        const ft = p.flashTime / LAND_FLASH_DURATION;
        ctx.fillStyle = `rgba(255,255,255,${ft})`;
        ctx.fillRect(Math.floor(drawX), Math.floor(drawY), Math.floor(w), Math.floor(h));
        ctx.fillStyle = p.color;
        ctx.globalAlpha = alpha * (1 - ft);
      } else {
        ctx.fillStyle = p.color;
      }

      ctx.fillRect(Math.floor(drawX), Math.floor(drawY), Math.floor(w), Math.floor(h));

      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(Math.floor(drawX), Math.floor(drawY), Math.floor(w), 4);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(Math.floor(drawX), Math.floor(drawY + h - 4), Math.floor(w), 4);

      ctx.globalAlpha = 1;
    }
  }

  private drawSpikes(spikes: Spike[]): void {
    const ctx = this.ctx;
    for (const s of spikes) {
      let drawX = s.x;
      let alpha = 1;
      if (s.slideInTime > 0) {
        const t = 1 - s.slideInTime / SPIKE_SLIDE_DURATION;
        alpha = t;
        if (s.slideFromLeft) {
          drawX = s.platformLeft - s.size + s.size * t;
        } else {
          drawX = s.platformRight - s.size * t;
        }
      }
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#e74c3c';
      ctx.beginPath();
      ctx.moveTo(Math.floor(drawX + s.size / 2), Math.floor(s.y));
      ctx.lineTo(Math.floor(drawX), Math.floor(s.y + s.size));
      ctx.lineTo(Math.floor(drawX + s.size), Math.floor(s.y + s.size));
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#ff6b6b';
      ctx.beginPath();
      ctx.moveTo(Math.floor(drawX + s.size / 2), Math.floor(s.y + 4));
      ctx.lineTo(Math.floor(drawX + 4), Math.floor(s.y + s.size - 2));
      ctx.lineTo(Math.floor(drawX + s.size / 2 - 2), Math.floor(s.y + s.size - 2));
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private drawStars(stars: Star[]): void {
    for (const star of stars) {
      if (star.collected) continue;
      this.drawStarShape(star.x + star.size / 2, star.y + star.size / 2, star.size / 2, '#ffcc00', '#ff9900');
    }
  }

  private drawStarShape(cx: number, cy: number, r: number, fill: string, stroke: string): void {
    const ctx = this.ctx;
    ctx.fillStyle = fill;
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const angle = (Math.PI * 2 * i) / 10 - Math.PI / 2;
      const radius = i % 2 === 0 ? r : r * 0.45;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;
      if (i === 0) ctx.moveTo(Math.floor(x), Math.floor(y));
      else ctx.lineTo(Math.floor(x), Math.floor(y));
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawPlayer(player: Player): void {
    const ctx = this.ctx;
    if (player.invincibleTime > 0 && Math.floor(player.invincibleTime * 10) % 2 === 0) {
      return;
    }

    const x = Math.floor(player.x);
    const y = Math.floor(player.y);
    const w = player.width;
    const h = player.height;

    ctx.fillStyle = '#3498db';
    ctx.fillRect(x, y + 16, w, h - 16);

    ctx.fillStyle = '#f39c12';
    ctx.fillRect(x, y, w, 16);

    ctx.fillStyle = '#ffffff';
    const eyeOffset = player.facing === 1 ? 18 : 6;
    ctx.fillRect(x + eyeOffset, y + 4, 6, 6);
    ctx.fillStyle = '#000000';
    const pupilOffset = player.facing === 1 ? 2 : 0;
    ctx.fillRect(x + eyeOffset + pupilOffset, y + 6, 2, 3);

    ctx.fillStyle = '#2c3e50';
    if (!player.onGround) {
      ctx.fillRect(x + 2, y + h - 8, 10, 8);
      ctx.fillRect(x + w - 12, y + h - 8, 10, 8);
    } else {
      const walkFrame = Math.floor(Date.now() / 100) % 2;
      if (Math.abs(player.vx) > 10) {
        if (walkFrame === 0) {
          ctx.fillRect(x, y + h - 8, 12, 8);
          ctx.fillRect(x + w - 10, y + h - 8, 10, 8);
        } else {
          ctx.fillRect(x + 2, y + h - 8, 10, 8);
          ctx.fillRect(x + w - 14, y + h - 8, 12, 8);
        }
      } else {
        ctx.fillRect(x + 2, y + h - 8, 10, 8);
        ctx.fillRect(x + w - 12, y + h - 8, 10, 8);
      }
    }
  }

  private drawParticles(particles: Particle[]): void {
    const ctx = this.ctx;
    for (const p of particles) {
      const lifeRatio = p.life / p.maxLife;
      const size = Math.max(1, p.size * lifeRatio);

      for (let i = p.trail.length - 1; i >= 0; i--) {
        const t = p.trail[i];
        const trailAlpha = (1 - i / p.trail.length) * lifeRatio * 0.5;
        const trailSize = Math.max(1, size * (1 - i / p.trail.length) * 0.6);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = trailAlpha;
        ctx.fillRect(Math.floor(t.x - trailSize / 2), Math.floor(t.y - trailSize / 2), Math.ceil(trailSize), Math.ceil(trailSize));
      }

      ctx.fillStyle = p.color;
      ctx.globalAlpha = lifeRatio;
      ctx.fillRect(Math.floor(p.x - size / 2), Math.floor(p.y - size / 2), Math.ceil(size), Math.ceil(size));
      ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = 1;
  }

  private drawHUD(hud: HUDData): void {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, GAME_WIDTH, 48);

    ctx.fillStyle = '#ffffff';
    ctx.font = '24px "Courier New", monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.fillText(`SCORE: ${hud.score}`, 20, 24);

    const heartSize = 24;
    const heartGap = 8;
    const totalHeartWidth = hud.lives * heartSize + (hud.lives - 1) * heartGap;
    let heartX = (GAME_WIDTH - totalHeartWidth) / 2;
    for (let i = 0; i < hud.lives; i++) {
      this.drawHeart(heartX, 12, heartSize);
      heartX += heartSize + heartGap;
    }

    ctx.textAlign = 'right';
    ctx.fillText(`LV.${hud.level}`, GAME_WIDTH - 20, 24);
  }

  private drawHeart(x: number, y: number, size: number): void {
    const ctx = this.ctx;
    const s = size / 8;
    ctx.fillStyle = '#e74c3c';
    const pattern = [
      [1, 0], [2, 0], [5, 0], [6, 0],
      [0, 1], [1, 1], [2, 1], [3, 1], [4, 1], [5, 1], [6, 1], [7, 1],
      [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2], [7, 2],
      [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3],
      [2, 4], [3, 4], [4, 4], [5, 4],
      [3, 5], [4, 5],
    ];
    for (const [px, py] of pattern) {
      ctx.fillRect(Math.floor(x + px * s), Math.floor(y + py * s), Math.ceil(s), Math.ceil(s));
    }
    ctx.fillStyle = '#ff6b6b';
    ctx.fillRect(Math.floor(x + s), Math.floor(y + s), Math.ceil(s), Math.ceil(s));
    ctx.fillRect(Math.floor(x + 5 * s), Math.floor(y + s), Math.ceil(s), Math.ceil(s));
  }

  private drawScreenFlash(flash: ScreenFlash | null): void {
    if (!flash) return;
    const ctx = this.ctx;
    const alpha = (flash.time / flash.duration) * flash.alpha;
    ctx.fillStyle = flash.color;
    ctx.globalAlpha = Math.max(0, alpha);
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.globalAlpha = 1;
  }
}
