export type BlendMode = 'add' | 'difference' | 'maximum';

export interface WaveformState {
  freqA: number;
  freqB: number;
  blendMode: BlendMode;
}

export class WaveformRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;
  private phaseA: number = 0;
  private phaseB: number = 0;
  private animationId: number | null = null;
  private currentState: WaveformState;
  private time: number = 0;

  private readonly BASELINE_COLOR = 'rgba(58, 74, 92, 0.5)';
  private readonly WAVE_A_COLOR = '#4FC3F7';
  private readonly WAVE_B_COLOR = '#F06292';
  private readonly WAVE_MIXED_COLOR = '#E8EAF6';
  private readonly LINE_WIDTH = 1.5;
  private readonly LINE_OPACITY = 0.9;
  private readonly FILL_OPACITY = 0.15;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取 Canvas 2D 上下文');
    this.ctx = ctx;

    this.width = canvas.width;
    this.height = canvas.height;

    this.currentState = {
      freqA: 500,
      freqB: 1000,
      blendMode: 'add'
    };

    this.setupBackground();
    this.drawBaseline();
  }

  private setupBackground(): void {
    const gradient = this.ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) / 1.5
    );
    gradient.addColorStop(0, '#0A1628');
    gradient.addColorStop(1, '#1A103A');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawBaseline(): void {
    this.ctx.strokeStyle = this.BASELINE_COLOR;
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.moveTo(0, this.height / 2);
    this.ctx.lineTo(this.width, this.height / 2);
    this.ctx.stroke();
  }

  private generateWaveA(t: number): number {
    return Math.sin(2 * Math.PI * this.currentState.freqA * t + this.phaseA);
  }

  private generateWaveB(t: number): number {
    return Math.sin(2 * Math.PI * this.currentState.freqB * t + this.phaseB);
  }

  private mixWaves(a: number, b: number): number {
    switch (this.currentState.blendMode) {
      case 'add':
        return (a + b) / 2;
      case 'difference':
        return Math.abs(a - b);
      case 'maximum':
        return Math.max(Math.abs(a), Math.abs(b)) * (a >= 0 || b >= 0 ? 1 : -1);
      default:
        return (a + b) / 2;
    }
  }

  private getBlendColor(): string {
    switch (this.currentState.blendMode) {
      case 'add':
        return 'rgba(186, 104, 200, ' + this.FILL_OPACITY + ')';
      case 'difference':
        return 'rgba(255, 193, 7, ' + this.FILL_OPACITY + ')';
      case 'maximum':
        return 'rgba(79, 195, 247, ' + this.FILL_OPACITY + ')';
      default:
        return 'rgba(232, 234, 246, ' + this.FILL_OPACITY + ')';
    }
  }

  private drawWaveLine(
    waveFn: (t: number) => number,
    color: string,
    lineWidth: number,
    opacity: number
  ): { path: Path2D; points: number[] } {
    const path = new Path2D();
    const points: number[] = [];
    const centerY = this.height / 2;
    const amplitude = this.height * 0.35;
    const samplesPerPixel = 10;
    const totalSamples = this.width * samplesPerPixel;
    const sampleDuration = 0.02;

    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = lineWidth;
    this.ctx.globalAlpha = opacity;

    path.moveTo(0, centerY);

    for (let i = 0; i <= totalSamples; i++) {
      const x = (i / totalSamples) * this.width;
      const t = (i / totalSamples) * sampleDuration + this.time;
      const value = waveFn(t);
      const y = centerY - value * amplitude;
      points.push(y);
      if (i === 0) {
        path.moveTo(x, y);
      } else {
        path.lineTo(x, y);
      }
    }

    this.ctx.stroke(path);
    this.ctx.globalAlpha = 1;

    return { path, points };
  }

  private drawFilledArea(points: number[]): void {
    if (points.length < 2) return;

    const fillPath = new Path2D();
    const centerY = this.height / 2;
    const stepX = this.width / (points.length - 1);

    fillPath.moveTo(0, centerY);
    for (let i = 0; i < points.length; i++) {
      fillPath.lineTo(i * stepX, points[i]);
    }
    fillPath.lineTo(this.width, centerY);
    fillPath.closePath();

    this.ctx.fillStyle = this.getBlendColor();
    this.ctx.fill(fillPath);
  }

  public updateWave(state: Partial<WaveformState>): void {
    this.currentState = { ...this.currentState, ...state };
  }

  public render(): void {
    this.setupBackground();
    this.drawBaseline();

    const sampleDuration = 0.02;
    const visibleCyclesA = (this.currentState.freqA * sampleDuration);
    const visibleCyclesB = (this.currentState.freqB * sampleDuration);
    const displayFreqA = Math.min(this.currentState.freqA, 15);
    const displayFreqB = Math.min(this.currentState.freqB, 25);

    const centerY = this.height / 2;
    const amplitude = this.height * 0.35;
    const totalPoints = 400;

    const waveAPoints: number[] = [];
    const waveBPoints: number[] = [];
    const mixedPoints: number[] = [];

    for (let i = 0; i <= totalPoints; i++) {
      const progress = i / totalPoints;
      const t = progress * 2 + this.time;
      
      const a = Math.sin(2 * Math.PI * displayFreqA * t);
      const b = Math.sin(2 * Math.PI * displayFreqB * t);
      const mixed = this.mixWaves(a, b);

      waveAPoints.push(centerY - a * amplitude * 0.6);
      waveBPoints.push(centerY - b * amplitude * 0.6);
      mixedPoints.push(centerY - mixed * amplitude);
    }

    this.drawFilledArea(mixedPoints);

    const drawPath = (points: number[], color: string, opacity: number, lineWidth: number) => {
      this.ctx.strokeStyle = color;
      this.ctx.lineWidth = lineWidth;
      this.ctx.globalAlpha = opacity;
      this.ctx.beginPath();
      const stepX = this.width / (points.length - 1);
      for (let i = 0; i < points.length; i++) {
        if (i === 0) {
          this.ctx.moveTo(i * stepX, points[i]);
        } else {
          this.ctx.lineTo(i * stepX, points[i]);
        }
      }
      this.ctx.stroke();
      this.ctx.globalAlpha = 1;
    };

    drawPath(waveAPoints, this.WAVE_A_COLOR, 0.5, 1);
    drawPath(waveBPoints, this.WAVE_B_COLOR, 0.5, 1);
    drawPath(mixedPoints, this.WAVE_MIXED_COLOR, this.LINE_OPACITY, this.LINE_WIDTH);

    this.time += 0.016;
  }

  public startAnimation(): void {
    if (this.animationId !== null) return;

    const animate = () => {
      this.render();
      this.animationId = requestAnimationFrame(animate);
    };

    animate();
  }

  public stopAnimation(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public getState(): WaveformState {
    return { ...this.currentState };
  }

  public setTime(time: number): void {
    this.time = time;
  }

  public getTime(): number {
    return this.time;
  }
}
