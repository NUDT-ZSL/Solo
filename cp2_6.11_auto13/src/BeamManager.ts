import type { Beam } from './types';
import { SCALE_FREQUENCIES } from './types';

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
  public arrayWidth: number = 0;
  public arrayHeight: number = 0;

  constructor() {}

  public resize(width: number, height: number, scaleFactor: number = 1.0): void {
    this.canvasWidth = width;
    this.canvasHeight = height;

    const isMobile = width < 768;
    this.controlBarHeight = isMobile ? 64 : 80;
    this.baseBeamWidth = isMobile ? 24 : 40;
    this.baseBeamGap = isMobile ? 6 : 10;
    this.baseBeamHeight = 300;

    this.arrayWidth = 12 * this.baseBeamWidth + 11 * this.baseBeamGap;
    this.arrayHeight = this.baseBeamHeight * scaleFactor;
    this.beamStartX = (width - this.arrayWidth * scaleFactor) / 2;
    const arrayAreaHeight = height * 0.8;
    this.beamStartY = arrayAreaHeight - this.arrayHeight - 30;

    if (this.beams.length === 0) {
      this.initBeams();
    } else {
      this.updateBeamPositions(scaleFactor);
    }
  }

  private initBeams(): void {
    this.beams = [];
    for (let i = 0; i < 12; i++) {
      const beam: Beam = {
        x: this.beamStartX + i * (this.baseBeamWidth + this.baseBeamGap) * 1.0,
        baseWidth: this.baseBeamWidth,
        baseHeight: this.baseBeamHeight,
        width: this.baseBeamWidth,
        height: this.baseBeamHeight,
        currentBrightness: 0.0,
        targetBrightness: 0.0,
        isTriggered: false,
        soundFrequency: SCALE_FREQUENCIES[i],
        triggerTime: 0,
        hoverSegments: 0
      };
      this.beams.push(beam);
    }
  }

  private updateBeamPositions(scaleFactor: number): void {
    const scaledWidth = this.baseBeamWidth * scaleFactor;
    const scaledGap = this.baseBeamGap * scaleFactor;
    const scaledHeight = this.baseBeamHeight * scaleFactor;
    this.arrayHeight = scaledHeight;

    for (let i = 0; i < 12; i++) {
      const beam = this.beams[i];
      beam.x = this.beamStartX + i * (scaledWidth + scaledGap);
      beam.width = scaledWidth;
      beam.height = scaledHeight;
      beam.baseWidth = this.baseBeamWidth;
      beam.baseHeight = this.baseBeamHeight;
    }
  }

  public applyScale(scaleFactor: number): void {
    this.arrayWidth = 12 * this.baseBeamWidth + 11 * this.baseBeamGap;
    this.arrayHeight = this.baseBeamHeight * scaleFactor;
    this.beamStartX = (this.canvasWidth - this.arrayWidth * scaleFactor) / 2;
    const arrayAreaHeight = this.canvasHeight * 0.8;
    this.beamStartY = arrayAreaHeight - this.arrayHeight - 30;
    this.updateBeamPositions(scaleFactor);
  }

  public triggerBeam(index: number): void {
    if (index < 0 || index >= 12) return;
    const now = performance.now();
    const beam = this.beams[index];
    if (now - beam.triggerTime < 80) return;

    beam.targetBrightness = 1.0;
    beam.triggerTime = now;
    beam.isTriggered = true;

    setTimeout(() => {
      beam.targetBrightness = 0.0;
      beam.isTriggered = false;
    }, 400);
  }

  public update(dt: number): void {
    const speed = 0.15;
    for (const beam of this.beams) {
      const diff = beam.targetBrightness - beam.currentBrightness;
      beam.currentBrightness += diff * speed;
      if (Math.abs(beam.currentBrightness - beam.targetBrightness) < 0.001) {
        beam.currentBrightness = beam.targetBrightness;
      }
    }
  }

  public setHover(cursorX: number, cursorY: number): void {
    for (let i = 0; i < 12; i++) {
      const beam = this.beams[i];
      const beamBottom = this.beamStartY + beam.height;
      const beamRight = beam.x + beam.width;

      if (cursorX >= beam.x && cursorX <= beamRight &&
          cursorY >= this.beamStartY && cursorY <= beamBottom) {
        const distanceFromBottom = beamBottom - cursorY;
        const segmentCount = Math.max(0, Math.min(beam.height / 10, Math.ceil(distanceFromBottom / 10)));
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
    for (let i = 0; i < 12; i++) {
      const beam = this.beams[i];
      const beamBottom = this.beamStartY + beam.height;
      const beamRight = beam.x + beam.width;
      if (x >= beam.x && x <= beamRight &&
          y >= this.beamStartY && y <= beamBottom) {
        return i;
      }
    }
    return -1;
  }

  public isInBeamArea(x: number, y: number): boolean {
    const areaTop = this.beamStartY - 20;
    const areaBottom = this.beamStartY + this.arrayHeight + 20;
    const areaLeft = this.beamStartX - 20;
    const areaRight = this.beamStartX + this.arrayWidth * (this.beams[0]?.width ? 1 : 1) + 20;
    const totalWidth = 12 * (this.beams[0]?.width || this.baseBeamWidth) +
                       11 * this.baseBeamGap * ((this.beams[0]?.width || this.baseBeamWidth) / this.baseBeamWidth);
    return x >= areaLeft && x <= (this.beamStartX + totalWidth + 20) &&
           y >= areaTop && y <= areaBottom;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.renderBase(ctx);
    for (let i = 0; i < 12; i++) {
      this.renderBeam(ctx, i);
    }
  }

  private renderBase(ctx: CanvasRenderingContext2D): void {
    const totalWidth = 12 * (this.beams[0]?.width || 40) + 11 * (this.beams[0] ? (this.beams[0].width / this.baseBeamWidth) * this.baseBeamGap : 10);
    const baseHeight = 12;
    const baseY = this.beamStartY + (this.beams[0]?.height || 300) + 4;
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
    const h = beam.height;

    ctx.save();
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, [w / 2, w / 2, 4, 4]);
    ctx.clip();

    const brightness = beam.currentBrightness;
    const boost = 1 + brightness * 0.3;

    const grad = ctx.createLinearGradient(0, y, 0, y + h);
    const bottomR = Math.floor(10 * boost);
    const bottomG = Math.floor(24 * boost);
    const bottomB = Math.floor(74 * boost);
    const topR = Math.min(255, Math.floor(58 * boost + brightness * 80));
    const topG = Math.min(255, Math.floor(122 * boost + brightness * 80));
    const topB = Math.min(255, Math.floor(255 * boost + brightness * 0));

    grad.addColorStop(0, `rgb(${bottomR}, ${bottomG}, ${bottomB})`);
    grad.addColorStop(1, `rgb(${topR}, ${topG}, ${topB})`);

    ctx.fillStyle = grad;
    ctx.fillRect(x, y, w, h);

    if (beam.hoverSegments > 0) {
      const segHeight = 10 * (h / this.baseBeamHeight);
      const totalSegHeight = beam.hoverSegments * segHeight;
      const segY = y + h - totalSegHeight;

      const hoverGrad = ctx.createLinearGradient(0, segY, 0, y + h);
      hoverGrad.addColorStop(0, 'rgba(170, 221, 255, 0.4)');
      hoverGrad.addColorStop(1, 'rgba(74, 158, 255, 0.7)');
      ctx.fillStyle = hoverGrad;
      ctx.fillRect(x, segY, w, totalSegHeight);

      for (let s = 0; s < beam.hoverSegments; s++) {
        const sy = y + h - (s + 1) * segHeight;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, sy);
        ctx.lineTo(x + w, sy);
        ctx.stroke();
      }
    }

    if (brightness > 0.1) {
      ctx.shadowColor = `rgba(74, 158, 255, ${brightness * 0.8})`;
      ctx.shadowBlur = 20 * brightness;
      const glowGrad = ctx.createLinearGradient(0, y, 0, y + h);
      glowGrad.addColorStop(0, `rgba(120, 180, 255, ${brightness * 0.3})`);
      glowGrad.addColorStop(1, `rgba(74, 158, 255, ${brightness * 0.5})`);
      ctx.fillStyle = glowGrad;
      ctx.fillRect(x, y, w, h);
    }

    ctx.restore();

    if (brightness > 0.5) {
      const particleColors = ['#4A9EFF', '#7A7AFF', '#AADDFF'];
      const color = particleColors[index % 3];
      const px = x + w / 2;
      const py = y;
      ctx.save();
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(px, py, 3 + brightness * 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }
}
