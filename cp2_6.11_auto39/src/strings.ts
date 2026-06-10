import { AudioEngine } from './audio';

interface Vibration {
  position: number;
  amplitude: number;
  startTime: number;
  duration: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  startTime: number;
  duration: number;
}

export class HarpString {
  public index: number;
  public originalX: number;
  public currentX: number;
  public baseLength: number;
  public baseColor: string;
  public currentColor: string;
  public topY: number = 0;
  public bottomY: number = 0;
  public isDragging: boolean = false;
  public isRemoving: boolean = false;
  public removeProgress: number = 0;
  public pitchShift: number = 0;
  public targetPitchShift: number = 0;
  public pitchShiftDuration: number = 3;
  public pitchShiftElapsed: number = 0;
  public flashTime: number = 0;
  public brightnessBoost: number = 0;
  public brightnessTime: number = 0;
  public onPitchRecovered: (() => void) | null = null;

  private vibrations: Vibration[] = [];
  private ripples: Ripple[] = [];
  private baseFrequency: number;
  private audioEngine: AudioEngine;
  private time: number = 0;
  private basePitchShift: number = 0;
  private baseColorRgb: { r: number; g: number; b: number };
  private shiftedColorRgb: { r: number; g: number; b: number };

  constructor(index: number, x: number, length: number, audioEngine: AudioEngine) {
    this.index = index;
    this.originalX = x;
    this.currentX = x;
    this.baseLength = length;
    this.audioEngine = audioEngine;
    this.baseFrequency = audioEngine.getNoteFrequency(index);
    this.baseColor = this.calculateColorByPitchAndPosition();
    this.currentColor = this.baseColor;
    this.baseColorRgb = this.parseRgb(this.baseColor);
    this.shiftedColorRgb = { ...this.baseColorRgb };
  }

  public setYPosition(bottomY: number): void {
    this.bottomY = bottomY;
    this.topY = bottomY - this.baseLength;
    this.baseColor = this.calculateColorByPitchAndPosition();
    this.currentColor = this.baseColor;
    this.baseColorRgb = this.parseRgb(this.baseColor);
    this.shiftedColorRgb = { ...this.baseColorRgb };
  }

  private calculateColorByPitchAndPosition(): string {
    const totalStrings = this.audioEngine.getTotalStrings();
    const minFreq = this.audioEngine.getNoteFrequency(0);
    const maxFreq = this.audioEngine.getNoteFrequency(totalStrings - 1);

    const pitchLogT = (Math.log2(this.baseFrequency) - Math.log2(minFreq)) / (Math.log2(maxFreq) - Math.log2(minFreq));

    const canvasHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
    const harpBottomY = canvasHeight - 80;
    const minTopY = harpBottomY - 280;
    const maxTopY = harpBottomY - 120;
    const yT = maxTopY > minTopY ? (this.topY - minTopY) / (maxTopY - minTopY) : 0.5;
    const yPositionT = Math.max(0, Math.min(1, yT));

    const pitchWeight = 0.6;
    const yWeight = 0.4;
    const combinedT = pitchLogT * pitchWeight + yPositionT * yWeight;

    const warm = { h: 0, s: 0.8, l: 0.6 };
    const cool = { h: 0.5, s: 0.7, l: 0.55 };

    const smoothT = combinedT < 0.5
      ? 2 * combinedT * combinedT
      : 1 - Math.pow(-2 * combinedT + 2, 2) / 2;

    const h = warm.h + (cool.h - warm.h) * smoothT;
    const s = warm.s + (cool.s - warm.s) * smoothT;
    const l = warm.l + (cool.l - warm.l) * smoothT;

    const rgb = this.hslToRgb(h, s, l);
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  }

  private parseRgb(color: string): { r: number; g: number; b: number } {
    const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      };
    }
    return { r: 255, g: 255, b: 255 };
  }

  private lerpColor(from: { r: number; g: number; b: number }, to: { r: number; g: number; b: number }, t: number): string {
    const r = Math.round(from.r + (to.r - from.r) * t);
    const g = Math.round(from.g + (to.g - from.g) * t);
    const b = Math.round(from.b + (to.b - from.b) * t);
    return `rgb(${r}, ${g}, ${b})`;
  }

  private shiftColorBySemitones(baseColor: { r: number; g: number; b: number }, semitones: number): { r: number; g: number; b: number } {
    const hsl = this.rgbToHsl(baseColor.r, baseColor.g, baseColor.b);
    const shiftDegrees = semitones * 8;
    hsl.h = (hsl.h + shiftDegrees / 360 + 1) % 1;
    hsl.s = Math.min(1, hsl.s + semitones * 0.02);
    hsl.l = Math.min(0.9, hsl.l + semitones * 0.01);
    const rgb = this.hslToRgb(hsl.h, hsl.s, hsl.l);
    return rgb;
  }

  private rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
        case g: h = ((b - r) / d + 2) / 6; break;
        case b: h = ((r - g) / d + 4) / 6; break;
      }
    }
    return { h, s, l };
  }

  private hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
    let r, g, b;
    if (s === 0) {
      r = g = b = l;
    } else {
      const hue2rgb = (p: number, q: number, t: number) => {
        if (t < 0) t += 1;
        if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
      };
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1/3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1/3);
    }
    return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
  }

  public getCurrentFrequency(): number {
    return this.baseFrequency * Math.pow(2, this.pitchShift / 12);
  }

  public triggerVibration(contactY: number, amplitude: number = 10): void {
    const position = (contactY - this.topY) / this.baseLength;
    this.vibrations.push({
      position: Math.max(0, Math.min(1, position)),
      amplitude,
      startTime: this.time,
      duration: 0.6
    });

    this.flashTime = 0.1;

    this.ripples.push({
      x: this.currentX,
      y: contactY,
      radius: 5,
      maxRadius: 20 + amplitude,
      startTime: this.time,
      duration: 0.5
    });

    this.audioEngine.playNote(this.getCurrentFrequency(), 0.3, 0.25);
  }

  public triggerStrongWind(): void {
    this.brightnessBoost = 2;
    this.brightnessTime = 0.8;
    this.vibrations.push({
      position: 0.5,
      amplitude: 15,
      startTime: this.time,
      duration: 1.2
    });
  }

  public pluck(): void {
    this.vibrations.push({
      position: 0.5,
      amplitude: 12,
      startTime: this.time,
      duration: 0.8
    });
    this.flashTime = 0.1;
    this.audioEngine.playNote(this.getCurrentFrequency(), 0.4, 0.3);
  }

  public shiftPitch(semitones: number, duration: number = 3): void {
    this.basePitchShift = this.pitchShift;
    this.targetPitchShift = this.pitchShift + semitones;
    this.pitchShiftDuration = duration;
    this.pitchShiftElapsed = 0;

    this.shiftedColorRgb = this.shiftColorBySemitones(this.baseColorRgb, this.targetPitchShift);
  }

  public startRemove(): void {
    this.isRemoving = true;
    this.removeProgress = 0;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    this.vibrations = this.vibrations.filter(v => {
      return (this.time - v.startTime) < v.duration;
    });

    this.ripples = this.ripples.filter(r => {
      return (this.time - r.startTime) < r.duration;
    });

    if (this.flashTime > 0) {
      this.flashTime -= deltaTime;
    }

    if (this.brightnessTime > 0) {
      this.brightnessTime -= deltaTime;
      if (this.brightnessTime <= 0) {
        this.brightnessBoost = 0;
      }
    }

    if (this.pitchShiftDuration > 0 && this.pitchShiftElapsed < this.pitchShiftDuration) {
      this.pitchShiftElapsed += deltaTime;
      const t = Math.min(1, this.pitchShiftElapsed / this.pitchShiftDuration);

      this.pitchShift = this.targetPitchShift * (1 - t);
      this.currentColor = this.lerpColor(this.shiftedColorRgb, this.baseColorRgb, t);

      if (t >= 1) {
        this.pitchShift = 0;
        this.currentColor = this.baseColor;
        this.pitchShiftDuration = 0;
        this.targetPitchShift = 0;
        this.pitchShiftElapsed = 0;
        if (this.onPitchRecovered) {
          const callback = this.onPitchRecovered;
          this.onPitchRecovered = null;
          callback();
        }
      }
    }

    if (this.isRemoving) {
      this.removeProgress += deltaTime / 0.4;
    }
  }

  private getVibrationOffset(y: number): number {
    let totalOffset = 0;
    for (const vib of this.vibrations) {
      const elapsed = this.time - vib.startTime;
      const progress = elapsed / vib.duration;
      if (progress >= 1) continue;

      const vibY = this.topY + vib.position * this.baseLength;
      const distance = Math.abs(y - vibY);
      const waveDecay = Math.max(0, 1 - distance / (this.baseLength * 0.4));

      const decay = Math.pow(1 - progress, 1.5);
      const frequency = 8 + vib.position * 4;
      const phase = elapsed * frequency * Math.PI * 2;

      totalOffset += Math.sin(phase) * vib.amplitude * waveDecay * decay;
    }

    const idleFreq = 2 + (this.index % 5) * 0.5;
    const idlePhase = this.time * idleFreq * Math.PI * 2 + this.index * 0.3;
    totalOffset += Math.sin(idlePhase) * 2;

    return totalOffset;
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (this.isRemoving && this.removeProgress >= 1) return;

    const segments = 40;
    const segmentHeight = this.baseLength / segments;

    let displayColor = this.currentColor;
    let alpha = 0.7;

    if (this.flashTime > 0 || this.brightnessBoost > 0) {
      displayColor = 'rgb(255, 255, 255)';
      alpha = 0.95;
    }

    if (this.isRemoving) {
      alpha *= (1 - this.removeProgress);
    }

    ctx.save();
    ctx.strokeStyle = displayColor;
    ctx.lineWidth = 2;
    ctx.globalAlpha = alpha;
    ctx.lineCap = 'round';

    ctx.shadowColor = displayColor;
    ctx.shadowBlur = 8;

    ctx.beginPath();

    if (this.isRemoving) {
      const shrinkAmount = this.removeProgress * this.baseLength * 0.5;
      const visibleTop = this.topY + shrinkAmount;
      const visibleBottom = this.bottomY - shrinkAmount;
      const visibleLength = visibleBottom - visibleTop;

      if (visibleLength <= 0) {
        ctx.restore();
        return;
      }

      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const y = visibleTop + t * visibleLength;
        const offset = this.getVibrationOffset(y);
        const x = this.currentX + offset;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    } else {
      for (let i = 0; i <= segments; i++) {
        const y = this.topY + i * segmentHeight;
        const offset = this.getVibrationOffset(y);
        const x = this.currentX + offset;
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    }

    ctx.stroke();

    if (!this.isRemoving) {
      ctx.fillStyle = '#E8C547';
      ctx.shadowColor = '#E8C547';
      ctx.shadowBlur = 10;

      const topOffset = this.getVibrationOffset(this.topY);
      const bottomOffset = this.getVibrationOffset(this.bottomY);

      const topGrad = ctx.createRadialGradient(
        this.currentX + topOffset, this.topY, 0,
        this.currentX + topOffset, this.topY, 8
      );
      topGrad.addColorStop(0, 'rgba(232, 197, 71, 0.8)');
      topGrad.addColorStop(1, 'rgba(232, 197, 71, 0)');
      ctx.fillStyle = topGrad;
      ctx.beginPath();
      ctx.arc(this.currentX + topOffset, this.topY, 8, 0, Math.PI * 2);
      ctx.fill();

      const bottomGrad = ctx.createRadialGradient(
        this.currentX + bottomOffset, this.bottomY, 0,
        this.currentX + bottomOffset, this.bottomY, 8
      );
      bottomGrad.addColorStop(0, 'rgba(232, 197, 71, 0.8)');
      bottomGrad.addColorStop(1, 'rgba(232, 197, 71, 0)');
      ctx.fillStyle = bottomGrad;
      ctx.beginPath();
      ctx.arc(this.currentX + bottomOffset, this.bottomY, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    this.renderRipples(ctx);
  }

  private renderRipples(ctx: CanvasRenderingContext2D): void {
    for (const ripple of this.ripples) {
      const elapsed = this.time - ripple.startTime;
      const progress = elapsed / ripple.duration;
      if (progress >= 1) continue;

      const currentRadius = ripple.radius + (ripple.maxRadius - ripple.radius) * progress;
      const alpha = 0.6 * (1 - progress);

      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#fff';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, currentRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
  }

  public containsPoint(x: number, y: number, hitRadius: number = 12): boolean {
    if (this.isRemoving) return false;
    if (y < this.topY || y > this.bottomY) return false;
    const offset = this.getVibrationOffset(y);
    const stringX = this.currentX + offset;
    return Math.abs(x - stringX) <= hitRadius;
  }

  public isFullyRemoved(): boolean {
    return this.isRemoving && this.removeProgress >= 1;
  }
}

export class StringManager {
  public strings: HarpString[] = [];
  private audioEngine: AudioEngine;
  private centerX: number = 0;
  private bottomY: number = 0;
  private stringSpacing: number = 18;
  private stringCount: number = 30;

  constructor(audioEngine: AudioEngine) {
    this.audioEngine = audioEngine;
  }

  public resize(centerX: number, bottomY: number): void {
    this.centerX = centerX;
    this.bottomY = bottomY;
    this.rearrangeStrings();
  }

  public createStrings(): void {
    this.strings = [];
    const totalWidth = (this.stringCount - 1) * this.stringSpacing;
    const startX = this.centerX - totalWidth / 2;

    for (let i = 0; i < this.stringCount; i++) {
      const x = startX + i * this.stringSpacing;
      const length = this.calculateWaveLength(i);
      const str = new HarpString(i, x, length, this.audioEngine);
      str.setYPosition(this.bottomY);
      this.strings.push(str);
    }
  }

  private calculateWaveLength(index: number): number {
    const minLength = 120;
    const maxLength = 280;
    const t = index / (this.stringCount - 1);
    const wave = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
    return minLength + wave * (maxLength - minLength);
  }

  private rearrangeStrings(): void {
    if (this.strings.length === 0) return;

    const count = this.strings.length;
    const totalWidth = (count - 1) * this.stringSpacing;
    const startX = this.centerX - totalWidth / 2;

    this.strings.forEach((str, i) => {
      if (!str.isDragging && !str.isRemoving) {
        str.originalX = startX + i * this.stringSpacing;
        str.currentX = str.originalX;
      }
      str.setYPosition(this.bottomY);
    });
  }

  public removeString(string: HarpString): void {
    string.startRemove();
    setTimeout(() => {
      const idx = this.strings.indexOf(string);
      if (idx > -1) {
        this.strings.splice(idx, 1);
        this.rearrangeStrings();
      }
    }, 400);
  }

  public onStringPitchRecovered(string: HarpString): void {
    const allRecovered = this.strings.every(s => s.pitchShiftDuration === 0 || s.isRemoving);
    if (allRecovered) {
      this.rearrangeStrings();
    }
  }

  public getStringAt(x: number, y: number): HarpString | null {
    for (const str of this.strings) {
      if (str.containsPoint(x, y)) {
        return str;
      }
    }
    return null;
  }

  public getAllFrequencies(): number[] {
    return this.strings
      .filter(s => !s.isRemoving)
      .map(s => s.getCurrentFrequency());
  }

  public playArpeggio(): void {
    const sorted = [...this.strings].filter(s => !s.isRemoving)
      .sort((a, b) => a.baseLength - b.baseLength);
    sorted.forEach((str, i) => {
      setTimeout(() => str.pluck(), i * 50);
    });
  }

  public triggerStrongWind(): void {
    this.strings.forEach(str => {
      if (!str.isRemoving) {
        str.triggerStrongWind();
      }
    });
  }

  public isPointInHarpArea(x: number, y: number): boolean {
    if (this.strings.length === 0) return false;
    const first = this.strings[0];
    const last = this.strings[this.strings.length - 1];
    const margin = 40;
    return x >= first.originalX - margin && x <= last.originalX + margin
      && y >= first.topY - margin && y <= first.bottomY + margin;
  }

  public update(deltaTime: number): void {
    for (const str of this.strings) {
      str.update(deltaTime);
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (const str of this.strings) {
      str.render(ctx);
    }
  }
}
