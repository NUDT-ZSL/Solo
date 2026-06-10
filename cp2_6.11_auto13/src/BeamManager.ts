import type { Beam } from './types';
import { SCALE_FREQUENCIES, BEAM_COLORS } from './types';

export class BeamManager {
  public beams: Beam[] = [];
  public canvasWidth: number = 0;
  public canvasHeight: number = 0;
  public controlBarHeight: number = 80;
  public baseBeamWidth: number = 40;
  public baseBeamGap: number = 10;
  public baseBeamHeight: number = 300;
  public beamStartY: number = 0;
  public beamStartX: number = 0;
  public arrayBaseWidth: number = 0;
  public arrayHeight: number = 0;

  private readonly TRIGGER_COOLDOWN_MS: number = 80;
  private readonly HOLD_DURATION_MS: number = 400;
  private readonly FADE_DURATION_MS: number = 200;

  private rippleStartTime: number = 0;
  private readonly RIPPLE_DURATION_MS: number = 800;
  private rippleX: number = 0;
  private rippleY: number = 0;

  constructor() {}

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;

    const isMobile = width < 768;
    this.controlBarHeight = isMobile ? 64 : 80;
    this.baseBeamWidth = isMobile ? 24 : 40;
    this.baseBeamGap = isMobile ? 6 : 10;
    this.baseBeamHeight = 300;

    this.arrayBaseWidth = 12 * this.baseBeamWidth + 11 * this.baseBeamGap;
    this.arrayHeight = this.baseBeamHeight;
    this.beamStartX = (width - this.arrayBaseWidth) / 2;
    const arrayAreaHeight = height * 0.8;
    this.beamStartY = arrayAreaHeight - this.arrayHeight - 30;

    if (this.beams.length === 0) {
      this.initBeams();
    } else {
      this.updateBeamPositions();
    }
  }

  private initBeams(): void {
    this.beams = [];
    for (let i = 0; i < 12; i++) {
      const beam: Beam = {
        x: this.beamStartX + i * (this.baseBeamWidth + this.baseBeamGap),
        baseWidth: this.baseBeamWidth,
        baseHeight: this.baseBeamHeight,
        width: this.baseBeamWidth,
        height: this.baseBeamHeight,
        brightness: 0.0,
        triggerTime: 0,
        holdDuration: this.HOLD_DURATION_MS,
        fadeDuration: this.FADE_DURATION_MS,
        soundFrequency: SCALE_FREQUENCIES[i],
        hoverSegments: 0,
        color: BEAM_COLORS[i],
        index: i
      };
      this.beams.push(beam);
    }
  }

  private updateBeamPositions(): void {
    for (let i = 0; i < 12; i++) {
      const beam = this.beams[i];
      beam.x = this.beamStartX + i * (this.baseBeamWidth + this.baseBeamGap);
      beam.baseWidth = this.baseBeamWidth;
      beam.baseHeight = this.baseBeamHeight;
      beam.width = this.baseBeamWidth;
      beam.height = this.baseBeamHeight;
    }
  }

  public triggerBeam(index: number): boolean {
    if (index < 0 || index >= 12) return false;
    const now = performance.now();
    const beam = this.beams[index];
    if (now - beam.triggerTime < this.TRIGGER_COOLDOWN_MS) return false;

    beam.triggerTime = now;
    beam.brightness = 1.0;
    return true;
  }

  public triggerRipple(): void {
    this.rippleStartTime = performance.now();
    this.rippleX = this.beamStartX + this.arrayBaseWidth / 2;
    this.rippleY = this.beamStartY + this.arrayHeight / 2;
  }

  public update(): void {
    const now = performance.now();
    for (const beam of this.beams) {
      if (beam.triggerTime === 0) {
        beam.brightness = 0;
        continue;
      }
      const elapsed = now - beam.triggerTime;
      if (elapsed <= beam.holdDuration) {
        beam.brightness = 1.0;
      } else if (elapsed <= beam.holdDuration + beam.fadeDuration) {
        const fadeProgress = (elapsed - beam.holdDuration) / beam.fadeDuration;
        beam.brightness = 1.0 - fadeProgress;
      } else {
        beam.brightness = 0.0;
        beam.triggerTime = 0;
      }
    }
  }

  public setHover(cursorX: number, cursorY: number): void {
    const beamBottom = this.beamStartY + this.baseBeamHeight;
    const segmentHeight = 10;

    for (let i = 0; i < 12; i++) {
      const beam = this.beams[i];
      const beamRight = beam.x + beam.width;

      if (cursorX >= beam.x && cursorX <= beamRight &&
          cursorY >= this.beamStartY && cursorY <= beamBottom) {
        const distanceFromBottom = beamBottom - cursorY;
        const maxSegments = Math.floor(this.baseBeamHeight / segmentHeight);
        const segmentCount = Math.max(0, Math.min(maxSegments, Math.ceil(distanceFromBottom / segmentHeight)));
        beam.hoverSegments = segmentCount;
      } else {
        beam.hoverSegments = 0;
      }
    }
  }

  public clearHover(): void {
    for (const beam of this.beams) {
      beam.hoverSegments = 0;
    }
  }

  public findBeamIndexAt(x: number, y: number): number {
    const beamBottom = this.beamStartY + this.baseBeamHeight;
    for (let i = 0; i < 12; i++) {
      const beam = this.beams[i];
      const beamRight = beam.x + beam.width;
      if (x >= beam.x && x <= beamRight &&
          y >= this.beamStartY && y <= beamBottom) {
        return i;
      }
    }
    return -1;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.renderBackdrop(ctx);
    this.renderRipple(ctx);
    this.renderBase(ctx);
    for (let i = 0; i < 12; i++) {
      this.renderBeam(ctx, i);
    }
  }

  private renderBackdrop(ctx: CanvasRenderingContext2D): void {
    const padX = 20;
    const padTop = 30;
    const padBottom = 30;
    const x = this.beamStartX - padX;
    const y = this.beamStartY - padTop;
    const w = this.arrayBaseWidth + padX * 2;
    const h = this.arrayHeight + padTop + padBottom;

    const bgGrad = ctx.createLinearGradient(0, y, 0, y + h);
    bgGrad.addColorStop(0, 'rgba(10, 24, 74, 0.4)');
    bgGrad.addColorStop(1, 'rgba(42, 27, 74, 0.4)');
    ctx.fillStyle = bgGrad;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.fill();

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.clip();

    ctx.strokeStyle = 'rgba(74, 158, 255, 0.08)';
    ctx.lineWidth = 1;

    const gridSize = 20;
    for (let gx = x; gx < x + w; gx += gridSize) {
      ctx.beginPath();
      ctx.moveTo(gx, y);
      ctx.lineTo(gx, y + h);
      ctx.stroke();
    }
    for (let gy = y; gy < y + h; gy += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, gy);
      ctx.lineTo(x + w, gy);
      ctx.stroke();
    }
    ctx.restore();
  }

  private renderRipple(ctx: CanvasRenderingContext2D): void {
    if (this.rippleStartTime === 0) return;

    const elapsed = performance.now() - this.rippleStartTime;
    if (elapsed > this.RIPPLE_DURATION_MS) {
      this.rippleStartTime = 0;
      return;
    }

    const progress = elapsed / this.RIPPLE_DURATION_MS;
    const maxRadius = Math.max(this.arrayBaseWidth, this.arrayHeight) * 0.8;
    const radius = maxRadius * progress;
    const alpha = 1 - progress;

    ctx.save();
    ctx.strokeStyle = `rgba(74, 158, 255, ${alpha * 0.6})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = '#4A9EFF';
    ctx.shadowBlur = 15 * alpha;

    ctx.beginPath();
    ctx.arc(this.rippleX, this.rippleY, radius, 0, Math.PI * 2);
    ctx.stroke();

    if (progress > 0.3) {
      const innerProgress = (progress - 0.3) / 0.7;
      const innerAlpha = (1 - innerProgress) * 0.4;
      ctx.strokeStyle = `rgba(122, 122, 255, ${innerAlpha})`;
      ctx.beginPath();
      ctx.arc(this.rippleX, this.rippleY, radius * 0.6, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderBase(ctx: CanvasRenderingContext2D): void {
    const totalWidth = this.arrayBaseWidth;
    const baseHeight = 12;
    const baseY = this.beamStartY + this.baseBeamHeight + 4;
    const baseX = this.beamStartX - 10;
    const baseW = totalWidth + 20;

    const grad = ctx.createLinearGradient(0, baseY, 0, baseY + baseHeight);
    grad.addColorStop(0, 'rgba(74, 158, 255, 0.25)');
    grad.addColorStop(1, 'rgba(10, 24, 74, 0.4)');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(baseX, baseY, baseW, baseHeight, 4);
    ctx.fill();
  }

  private renderBeam(ctx: CanvasRenderingContext2D, index: number): void {
    const beam = this.beams[index];
    const x = beam.x;
    const y = this.beamStartY;
    const w = beam.width;
    const h = this.baseBeamHeight;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, [w / 2, w / 2, 4, 4]);
    ctx.clip();

    const brightness = beam.brightness;

    const grad = ctx.createLinearGradient(0, y, 0, y + h);
    grad.addColorStop(0, '#0A184A');
    grad.addColorStop(1, '#3A7AFF');

    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    if (beam.hoverSegments > 0) {
      const segHeight = 10;
      const totalSegHeight = beam.hoverSegments * segHeight;
      const segY = y + h - totalSegHeight;
      const boost = 1.3;

      const hoverGrad = ctx.createLinearGradient(0, segY, 0, y + h);
      hoverGrad.addColorStop(0, `rgba(170, 221, 255, ${0.4 * boost})`);
      hoverGrad.addColorStop(1, `rgba(74, 158, 255, ${0.7 * boost})`);
      ctx.fillStyle = hoverGrad;
      ctx.fillRect(x, segY, w, totalSegHeight);

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
      ctx.lineWidth = 1;
      for (let s = 0; s < beam.hoverSegments; s++) {
        const sy = y + h - (s + 1) * segHeight;
        ctx.beginPath();
        ctx.moveTo(x, sy);
        ctx.lineTo(x + w, sy);
        ctx.stroke();
      }
    }

    if (brightness > 0.01) {
      const glowGrad = ctx.createLinearGradient(0, y, 0, y + h);
      glowGrad.addColorStop(0, `rgba(120, 180, 255, ${brightness * 0.4})`);
      glowGrad.addColorStop(1, `rgba(74, 158, 255, ${brightness * 0.6})`);
      ctx.fillStyle = glowGrad;
      ctx.globalCompositeOperation = 'screen';
      ctx.fillRect(x, y, w, h);
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();

    if (brightness > 0.5) {
      const px = x + w / 2;
      const py = y;
      ctx.save();
      ctx.shadowColor = beam.color;
      ctx.shadowBlur = 20 * brightness;
      ctx.fillStyle = beam.color;
      ctx.beginPath();
      ctx.arc(px, py, 4 + brightness * 6, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
