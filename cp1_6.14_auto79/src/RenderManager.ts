import { GameState, LightSource, Platform, Reflector, Prism, Receiver, RaySegment, Particle, Portal } from './types';

const GRID_SIZE = 50;

export class RenderManager {
  private ctx: CanvasRenderingContext2D | null = null;
  private width: number = 1000;
  private height: number = 600;
  private frameTime: number = 0;

  public attach(canvas: HTMLCanvasElement): void {
    this.ctx = canvas.getContext('2d');
    this.width = canvas.width;
    this.height = canvas.height;
  }

  public detach(): void {
    this.ctx = null;
  }

  public render(state: GameState): void {
    const start = performance.now();
    if (!this.ctx) return;
    const ctx = this.ctx;

    ctx.save();
    this.drawBackground(ctx);
    this.drawGrid(ctx);
    this.drawPlatforms(ctx, state.platforms);
    this.drawPrisms(ctx, state.prisms);
    this.drawMirrors(ctx, state.reflectors);
    this.drawReceivers(ctx, state.receivers);
    this.drawPortal(ctx, state.portal);
    this.drawAllRays(ctx, state.raySegments);
    this.drawBlockedFlash(ctx, state);
    this.drawLightSources(ctx, state.lightSources);
    this.drawParticles(ctx, state.particles);

    if (state.levelComplete) {
      this.drawLevelComplete(ctx, state.completeAnimationTime);
    }

    ctx.restore();
    this.frameTime = performance.now() - start;
  }

  public getLastFrameTime(): number {
    return this.frameTime;
  }

  private drawBackground(ctx: CanvasRenderingContext2D): void {
    const gradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 50,
      this.width / 2, this.height / 2, this.width * 0.7
    );
    gradient.addColorStop(0, '#15152a');
    gradient.addColorStop(1, '#0a0a14');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = 'rgba(74, 20, 140, 0.15)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= this.width; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.height);
      ctx.stroke();
    }
    for (let y = 0; y <= this.height; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.width, y);
      ctx.stroke();
    }
  }

  private drawPlatforms(ctx: CanvasRenderingContext2D, platforms: Platform[]): void {
    for (const platform of platforms) {
      ctx.save();
      ctx.translate(platform.position.x, platform.position.y);
      ctx.rotate(platform.angle);

      const w = platform.length;
      const h = platform.width;
      const r = 4;

      ctx.fillStyle = platform.color;
      ctx.strokeStyle = platform.movable && platform.isMoving
        ? '#ffeb3b'
        : this.adjustColor(platform.color, -40);
      ctx.lineWidth = 2;

      this.drawRoundedRect(ctx, -w / 2, -h / 2, w, h, r);
      ctx.fill();
      ctx.stroke();

      if (platform.movable) {
        const progress = (platform.currentOffset || 0) / (platform.moveDistance || 150);
        ctx.fillStyle = platform.isMoving ? '#ffeb3b' : 'rgba(255, 235, 59, 0.5)';
        const barW = Math.min(w - 8, (w - 8) * progress);
        this.drawRoundedRect(ctx, -w / 2 + 4, -h / 2 - 6, barW, 2, 1);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
  ): void {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private drawMirrors(ctx: CanvasRenderingContext2D, reflectors: Reflector[]): void {
    for (const reflector of reflectors) {
      if (reflector.type !== 'mirror') continue;

      ctx.save();
      ctx.translate(reflector.position.x, reflector.position.y);
      ctx.rotate(reflector.rotation);

      const len = 100;

      ctx.shadowColor = '#e0e0ff';
      ctx.shadowBlur = 8;

      const gradient = ctx.createLinearGradient(0, -4, 0, 4);
      gradient.addColorStop(0, '#f5f5f5');
      gradient.addColorStop(0.5, '#bdbdbd');
      gradient.addColorStop(1, '#9e9e9e');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';

      ctx.beginPath();
      ctx.moveTo(-len / 2, 0);
      ctx.lineTo(len / 2, 0);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#7c4dff';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(-len / 2, 0);
      ctx.lineTo(len / 2, 0);
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawPrisms(ctx: CanvasRenderingContext2D, prisms: Prism[]): void {
    for (const prism of prisms) {
      ctx.save();
      ctx.translate(prism.position.x, prism.position.y);
      ctx.rotate(prism.rotation);

      const s = prism.sideLength;
      const h = (s * Math.sqrt(3)) / 2;

      ctx.shadowColor = '#e1bee7';
      ctx.shadowBlur = 12;

      const gradient = ctx.createLinearGradient(0, -h, 0, h);
      gradient.addColorStop(0, 'rgba(224, 64, 251, 0.4)');
      gradient.addColorStop(0.33, 'rgba(33, 150, 243, 0.4)');
      gradient.addColorStop(0.66, 'rgba(76, 175, 80, 0.4)');
      gradient.addColorStop(1, 'rgba(255, 193, 7, 0.4)');

      ctx.fillStyle = gradient;
      ctx.strokeStyle = 'rgba(225, 190, 231, 0.8)';
      ctx.lineWidth = 2;

      ctx.beginPath();
      ctx.moveTo(0, -2 * h / 3);
      ctx.lineTo(-s / 2, h / 3);
      ctx.lineTo(s / 2, h / 3);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.restore();
    }
  }

  private drawReceivers(ctx: CanvasRenderingContext2D, receivers: Receiver[]): void {
    const time = performance.now() / 1000;

    for (const receiver of receivers) {
      ctx.save();
      ctx.translate(receiver.position.x, receiver.position.y);

      const pulsePhase = (time % 1) / 1;
      const pulseScale = 1 + 0.15 * Math.sin(pulsePhase * Math.PI * 2);

      const glowColor = receiver.activated
        ? receiver.color
        : this.adjustColor(receiver.color, -30);
      const glowAlpha = receiver.activated
        ? 0.8 + 0.2 * Math.sin(pulsePhase * Math.PI * 2)
        : 0.3 + 0.1 * Math.sin(pulsePhase * Math.PI * 2);

      ctx.shadowColor = glowColor;
      ctx.shadowBlur = receiver.activated ? 25 : 12;

      const outerR = receiver.radius * pulseScale;
      ctx.beginPath();
      ctx.arc(0, 0, outerR + 4, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255,255,255,${glowAlpha * 0.5})`;
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(0, 0, receiver.radius, 0, Math.PI * 2);
      ctx.fillStyle = receiver.color;
      ctx.globalAlpha = receiver.activated ? 1 : 0.7;
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.globalAlpha = 1;

      if (!receiver.activated && receiver.requiredDuration > 0) {
        const progress = receiver.activationProgress / receiver.requiredDuration;
        ctx.beginPath();
        ctx.arc(0, 0, receiver.radius + 6, -Math.PI / 2, -Math.PI / 2 + progress * Math.PI * 2);
        ctx.strokeStyle = receiver.color;
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (receiver.activated) {
        ctx.beginPath();
        ctx.arc(0, 0, receiver.radius * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private drawPortal(ctx: CanvasRenderingContext2D, portal: Portal): void {
    const time = performance.now() / 1000;

    ctx.save();
    ctx.translate(portal.position.x, portal.position.y);

    if (portal.active) {
      for (let i = 0; i < 3; i++) {
        const phase = (time + i * 0.33) % 1;
        const r = portal.radius * (1 + phase * 0.5);
        const alpha = (1 - phase) * 0.5;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(224, 64, 251, ${alpha})`;
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      ctx.shadowColor = '#e040fb';
      ctx.shadowBlur = 30;

      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, portal.radius);
      gradient.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      gradient.addColorStop(0.4, 'rgba(224, 64, 251, 0.8)');
      gradient.addColorStop(1, 'rgba(103, 58, 183, 0.5)');

      ctx.beginPath();
      ctx.arc(0, 0, portal.radius, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.rotate(time * 2);
      for (let i = 0; i < 6; i++) {
        ctx.rotate(Math.PI / 3);
        ctx.beginPath();
        ctx.moveTo(portal.radius * 0.3, 0);
        ctx.lineTo(portal.radius * 0.8, 0);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, portal.radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(100, 100, 140, 0.5)';
      ctx.setLineDash([8, 6]);
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.beginPath();
      ctx.arc(0, 0, portal.radius * 0.6, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(60, 60, 90, 0.3)';
      ctx.fill();
    }

    ctx.restore();
  }

  private drawAllRays(ctx: CanvasRenderingContext2D, allSegments: RaySegment[][]): void {
    for (const segments of allSegments) {
      for (const segment of segments) {
        this.drawRaySegment(ctx, segment);
      }
    }
  }

  private drawRaySegment(ctx: CanvasRenderingContext2D, segment: RaySegment): void {
    const dx = segment.end.x - segment.start.x;
    const dy = segment.end.y - segment.start.y;
    const len = Math.hypot(dx, dy);
    if (len < 1) return;

    const intensity = segment.intensity;
    const baseAlpha = Math.min(1, 0.2 + intensity * 0.6);

    ctx.save();

    const gradient = ctx.createLinearGradient(
      segment.start.x, segment.start.y,
      segment.end.x, segment.end.y
    );

    const startColor = this.lerpColor('#ffeb3b', '#fff9c4', intensity * 0.3);
    const endColor = this.lerpColor('#ff9800', '#f44336', 1 - intensity);

    gradient.addColorStop(0, this.hexToRgba(startColor, baseAlpha * 0.9));
    gradient.addColorStop(1, this.hexToRgba(endColor, baseAlpha * 0.2));

    ctx.shadowColor = '#ff9800';
    ctx.shadowBlur = 8 * intensity;

    ctx.strokeStyle = gradient;
    ctx.lineWidth = Math.max(1.5, 3 * intensity);
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(segment.start.x, segment.start.y);
    ctx.lineTo(segment.end.x, segment.end.y);
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = this.hexToRgba('#ffffff', baseAlpha * 0.3);
    ctx.lineWidth = Math.max(0.5, 1 * intensity);
    ctx.stroke();

    ctx.restore();
  }

  private drawBlockedFlash(ctx: CanvasRenderingContext2D, state: GameState): void {
    if (state.blockedFlashTime <= 0 || !state.blockedPosition) return;
    const alpha = state.blockedFlashTime / 0.5;
    const pulse = 1 + 0.3 * Math.sin(performance.now() / 50);

    ctx.save();
    ctx.translate(state.blockedPosition.x, state.blockedPosition.y);

    ctx.shadowColor = '#ff1744';
    ctx.shadowBlur = 20;
    ctx.fillStyle = `rgba(255, 23, 68, ${alpha})`;
    ctx.beginPath();
    ctx.arc(0, 0, 10 * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawLightSources(ctx: CanvasRenderingContext2D, sources: LightSource[]): void {
    const time = performance.now() / 1000;

    for (const source of sources) {
      ctx.save();
      ctx.translate(source.position.x, source.position.y);

      for (let i = 3; i >= 1; i--) {
        const r = 12 + i * 6 + Math.sin(time * 3 + i) * 2;
        const alpha = 0.15 / i;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 235, 59, ${alpha})`;
        ctx.fill();
      }

      ctx.shadowColor = '#ffeb3b';
      ctx.shadowBlur = 20;

      const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 14);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.5, '#ffeb3b');
      gradient.addColorStop(1, '#ff9800');

      ctx.beginPath();
      ctx.arc(0, 0, 14, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.shadowBlur = 0;

      ctx.rotate(source.angle);
      const indicatorLen = 28;
      ctx.strokeStyle = source.dragging ? '#ffffff' : 'rgba(255,255,255,0.6)';
      ctx.lineWidth = source.dragging ? 3 : 2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(14, 0);
      ctx.lineTo(indicatorLen, 0);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(indicatorLen, 0);
      ctx.lineTo(indicatorLen - 5, -3);
      ctx.moveTo(indicatorLen, 0);
      ctx.lineTo(indicatorLen - 5, 3);
      ctx.stroke();

      ctx.restore();
    }
  }

  private drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
    for (const particle of particles) {
      const alpha = particle.life / particle.maxLife;
      const size = particle.size * (0.5 + alpha * 0.5);

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = particle.color;
      ctx.shadowBlur = size * 2;
      ctx.fillStyle = particle.color;
      ctx.beginPath();
      ctx.arc(particle.position.x, particle.position.y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private drawLevelComplete(ctx: CanvasRenderingContext2D, time: number): void {
    const duration = 3;
    const t = Math.min(time / duration, 1);

    ctx.save();

    let alpha = 0;
    if (t < 0.3) {
      alpha = t / 0.3;
    } else if (t < 0.7) {
      alpha = 1;
    } else {
      alpha = 1 - (t - 0.7) / 0.3;
    }

    const overlayGradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, this.width
    );
    overlayGradient.addColorStop(0, `rgba(103, 58, 183, ${0.3 * alpha})`);
    overlayGradient.addColorStop(1, `rgba(10, 10, 20, ${0.7 * alpha})`);
    ctx.fillStyle = overlayGradient;
    ctx.fillRect(0, 0, this.width, this.height);

    const textScale = t < 0.4
      ? 0.5 + (t / 0.4) * 0.5
      : t > 0.8
        ? 1 + ((t - 0.8) / 0.2) * 0.2
        : 1 + 0.05 * Math.sin(time * Math.PI * 4);

    ctx.translate(this.width / 2, this.height / 2);
    ctx.scale(textScale, textScale);
    ctx.translate(-this.width / 2, -this.height / 2);

    ctx.shadowColor = '#ffeb3b';
    ctx.shadowBlur = 30 * alpha;

    ctx.font = 'bold 64px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const text = 'Level Complete';
    const colors = ['#ffeb3b', '#ffc107', '#ff9800', '#ffeb3b'];
    const chars = text.split('');
    const charWidth = 42;
    const totalWidth = chars.length * charWidth;
    const startX = this.width / 2 - totalWidth / 2 + charWidth / 2;

    for (let i = 0; i < chars.length; i++) {
      const charT = t * 3 - i * 0.05;
      const bounce = Math.max(0, Math.sin(Math.max(0, charT) * Math.PI)) * 20;
      const color = colors[i % colors.length];
      ctx.fillStyle = color;
      ctx.globalAlpha = alpha;
      ctx.fillText(chars[i], startX + i * charWidth, this.height / 2 - bounce);
    }

    ctx.globalAlpha = 1;
    ctx.restore();
  }

  private lerpColor(hex1: string, hex2: string, t: number): string {
    const c1 = this.hexToRgb(hex1);
    const c2 = this.hexToRgb(hex2);
    const r = Math.round(c1.r + (c2.r - c1.r) * t);
    const g = Math.round(c1.g + (c2.g - c1.g) * t);
    const b = Math.round(c1.b + (c2.b - c1.b) * t);
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
      : { r: 255, g: 255, b: 255 };
  }

  private hexToRgba(hex: string, alpha: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private adjustColor(hex: string, amount: number): string {
    const { r, g, b } = this.hexToRgb(hex);
    const nr = Math.max(0, Math.min(255, r + amount));
    const ng = Math.max(0, Math.min(255, g + amount));
    const nb = Math.max(0, Math.min(255, b + amount));
    return `#${nr.toString(16).padStart(2, '0')}${ng.toString(16).padStart(2, '0')}${nb.toString(16).padStart(2, '0')}`;
  }
}

export const renderManager = new RenderManager();
