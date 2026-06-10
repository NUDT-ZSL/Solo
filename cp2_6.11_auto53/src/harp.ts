import { ParticleSystem } from './particle';
import { AudioSynthesizer, ToneLevel } from './audio';

export interface StringState {
  index: number;
  x: number;
  topX: number;
  bottomX: number;
  topY: number;
  bottomY: number;
  length: number;
  baseColor: string;
  noteName: string;
  isTriggered: boolean;
  triggerTime: number;
  vibrationAmplitude: number;
  vibrationPhase: number;
  glowIntensity: number;
}

const STRING_COLORS = [
  '#FF6B6B',
  '#FF8C6B',
  '#FFA96B',
  '#FFC96B',
  '#FFD93D',
  '#D4E06B',
  '#A6D86B',
  '#6BCB77',
  '#6BC0A0',
  '#6BB0C0',
  '#4D96FF',
  '#6B8CFF',
  '#8B7BFF',
  '#B06BFF',
  '#D06BD0',
  '#FF6BB5',
];

const STRING_SPACING = 18;
const MIN_STRING_LENGTH = 300;
const MAX_STRING_LENGTH = 600;
const VIBRATION_DURATION = 0.3;
const MAX_VIBRATION_AMPLITUDE = 8;
const GLOW_DURATION = 1.0;

export class Harp {
  private strings: StringState[] = [];
  private stringCount: number = 12;
  private particleSystem: ParticleSystem;
  private audioSynth: AudioSynthesizer;
  private centerX: number = 0;
  private centerY: number = 0;
  private scale: number = 1;
  private toneLevel: ToneLevel = 'mid';
  private hueShift: number = 0;
  private glideDelayMs: number = 80;
  private glideTimeouts: number[] = [];

  constructor(particleSystem: ParticleSystem, audioSynth: AudioSynthesizer) {
    this.particleSystem = particleSystem;
    this.audioSynth = audioSynth;
  }

  public setStringCount(count: number): void {
    this.stringCount = Math.max(6, Math.min(16, count));
    this.rebuildStrings();
  }

  public getStringCount(): number {
    return this.stringCount;
  }

  public setToneLevel(level: ToneLevel): void {
    this.toneLevel = level;
    this.audioSynth.setToneLevel(level);
    
    switch (level) {
      case 'low':
        this.hueShift = -30;
        break;
      case 'mid':
        this.hueShift = 0;
        break;
      case 'high':
        this.hueShift = 30;
        break;
    }
    this.updateStringColors();
  }

  public getToneLevel(): ToneLevel {
    return this.toneLevel;
  }

  public setCenter(x: number, y: number, scale: number = 1): void {
    this.centerX = x;
    this.centerY = y;
    this.scale = scale;
    this.rebuildStrings();
  }

  private rebuildStrings(): void {
    this.strings = [];
    
    const topSpacing = (STRING_SPACING * 0.5) * this.scale;
    const bottomSpacing = STRING_SPACING * this.scale;
    const topTotalWidth = (this.stringCount - 1) * topSpacing;
    const bottomTotalWidth = (this.stringCount - 1) * bottomSpacing;
    const topStartX = this.centerX - topTotalWidth / 2;
    const bottomStartX = this.centerX - bottomTotalWidth / 2;
    
    const avgLength = ((MIN_STRING_LENGTH + MAX_STRING_LENGTH) / 2) * this.scale;
    const topY = this.centerY - avgLength / 2;
    const bottomY = this.centerY + avgLength / 2;

    for (let i = 0; i < this.stringCount; i++) {
      const topX = topStartX + i * topSpacing;
      const bottomX = bottomStartX + i * bottomSpacing;
      
      const length = Math.sqrt(Math.pow(bottomX - topX, 2) + Math.pow(bottomY - topY, 2));
      const midX = (topX + bottomX) / 2;
      
      const colorIndex = Math.floor(i * (STRING_COLORS.length - 1) / (this.stringCount - 1 || 1));
      const baseColor = this.shiftHue(STRING_COLORS[colorIndex], this.hueShift);
      
      const noteName = this.audioSynth.getNoteName(i, this.stringCount);

      this.strings.push({
        index: i,
        x: midX,
        topX,
        bottomX,
        topY,
        bottomY,
        length,
        baseColor,
        noteName,
        isTriggered: false,
        triggerTime: 0,
        vibrationAmplitude: 0,
        vibrationPhase: 0,
        glowIntensity: 0,
      });
    }
  }

  private updateStringColors(): void {
    for (let i = 0; i < this.strings.length; i++) {
      const colorIndex = Math.floor(i * (STRING_COLORS.length - 1) / (this.stringCount - 1 || 1));
      this.strings[i].baseColor = this.shiftHue(STRING_COLORS[colorIndex], this.hueShift);
    }
  }

  private shiftHue(hex: string, degrees: number): string {
    if (degrees === 0) return hex;
    
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }

    h = (h + degrees / 360) % 1;
    if (h < 0) h += 1;

    const rgb = this.hslToRgb(h, s, l);
    return `#${this.componentToHex(Math.round(rgb[0] * 255))}${this.componentToHex(Math.round(rgb[1] * 255))}${this.componentToHex(Math.round(rgb[2] * 255))}`;
  }

  private hslToRgb(h: number, s: number, l: number): [number, number, number] {
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

    return [r, g, b];
  }

  private componentToHex(c: number): string {
    const hex = c.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }

  public triggerString(index: number): void {
    if (index < 0 || index >= this.strings.length) return;

    const str = this.strings[index];
    str.isTriggered = true;
    str.triggerTime = 0;
    str.vibrationAmplitude = MAX_VIBRATION_AMPLITUDE * this.scale;
    str.vibrationPhase = 0;
    str.glowIntensity = 1;

    const midX = (str.topX + str.bottomX) / 2;
    const midY = (str.topY + str.bottomY) / 2;
    const particleCount = 30 + Math.floor(Math.random() * 21);
    this.particleSystem.emit(midX, midY, str.baseColor, particleCount);

    this.audioSynth.playNote(index, this.stringCount);
  }

  public handleDrag(fromIndex: number, toIndex: number): void {
    if (fromIndex === toIndex) return;
    
    this.clearGlideTimeouts();
    
    const direction = toIndex > fromIndex ? 1 : -1;
    const indices: number[] = [];
    
    for (let i = fromIndex + direction; direction > 0 ? i <= toIndex : i >= toIndex; i += direction) {
      indices.push(i);
    }

    if (indices.length > 0) {
      indices.forEach((index, i) => {
        const timeoutId = window.setTimeout(() => {
          this.triggerString(index);
        }, i * this.glideDelayMs);
        this.glideTimeouts.push(timeoutId);
      });
    }
  }

  private clearGlideTimeouts(): void {
    for (const id of this.glideTimeouts) {
      clearTimeout(id);
    }
    this.glideTimeouts = [];
  }

  public getStringAtPoint(x: number, y: number): number {
    const hitRadius = 25 * this.scale;
    let closestIndex = -1;
    let closestDist = hitRadius;
    
    for (let i = 0; i < this.strings.length; i++) {
      const str = this.strings[i];
      const dist = this.pointToLineDistance(x, y, str.topX, str.topY, str.bottomX, str.bottomY);
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = i;
      }
    }
    return closestIndex;
  }

  private pointToLineDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const A = px - x1;
    const B = py - y1;
    const C = x2 - x1;
    const D = y2 - y1;
    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) param = dot / lenSq;
    let xx, yy;
    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }
    const dx = px - xx;
    const dy = py - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public update(deltaTime: number): void {
    for (const str of this.strings) {
      if (str.isTriggered) {
        str.triggerTime += deltaTime;
        
        if (str.triggerTime >= VIBRATION_DURATION) {
          str.vibrationAmplitude = 0;
          str.isTriggered = false;
        } else {
          const decayRate = Math.log(1 / 0.001) / VIBRATION_DURATION;
          str.vibrationAmplitude = MAX_VIBRATION_AMPLITUDE * this.scale * Math.exp(-decayRate * str.triggerTime);
          if (str.vibrationAmplitude < 0.01) {
            str.vibrationAmplitude = 0;
          }
          str.vibrationPhase += deltaTime * 25;
        }

        const glowProgress = str.triggerTime / GLOW_DURATION;
        str.glowIntensity = Math.max(0, 1 - glowProgress);
      }
    }
  }

  public draw(ctx: CanvasRenderingContext2D): void {
    this.drawBase(ctx);
    this.drawStrings(ctx);
    this.drawLabels(ctx);
  }

  private drawBase(ctx: CanvasRenderingContext2D): void {
    if (this.strings.length < 2) return;

    const first = this.strings[0];
    const last = this.strings[this.strings.length - 1];
    
    const baseWidth = last.bottomX - first.bottomX + 40 * this.scale;
    const baseHeight = 36 * this.scale;
    const baseY = first.bottomY - 6 * this.scale;
    const baseX = first.bottomX - 20 * this.scale;

    ctx.save();
    
    ctx.beginPath();
    const radius = 18 * this.scale;
    this.roundRect(ctx, baseX, baseY, baseWidth, baseHeight, radius);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.fill();
    
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
  }

  private drawStrings(ctx: CanvasRenderingContext2D): void {
    for (const str of this.strings) {
      this.drawSingleString(ctx, str);
    }
  }

  private drawSingleString(ctx: CanvasRenderingContext2D, str: StringState): void {
    ctx.save();

    const lineWidth = str.glowIntensity > 0 ? 2 : 1;
    
    if (str.glowIntensity > 0) {
      ctx.shadowColor = 'white';
      ctx.shadowBlur = 4 * str.glowIntensity;
    }

    const gradient = ctx.createLinearGradient(str.topX, str.topY, str.bottomX, str.bottomY);
    const alpha = str.glowIntensity > 0 ? 1 : 0.5;
    const color = this.hexToRgba(str.baseColor, alpha);
    const colorLight = this.hexToRgba(this.lightenColor(str.baseColor, 30), alpha);
    
    gradient.addColorStop(0, colorLight);
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, colorLight);

    ctx.strokeStyle = gradient;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';

    const dx = str.bottomX - str.topX;
    const dy = str.bottomY - str.topY;
    const nx = -dy / str.length;
    const ny = dx / str.length;

    ctx.beginPath();
    
    if (str.vibrationAmplitude > 0 && str.triggerTime < VIBRATION_DURATION) {
      const segments = 24;
      for (let i = 0; i <= segments; i++) {
        const t = i / segments;
        const baseX = str.topX + dx * t;
        const baseY = str.topY + dy * t;
        const sineOffset = Math.sin(str.vibrationPhase + t * Math.PI * 4) * str.vibrationAmplitude * Math.sin(t * Math.PI);
        const x = baseX + nx * sineOffset;
        const y = baseY + ny * sineOffset;
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
    } else {
      ctx.moveTo(str.topX, str.topY);
      ctx.lineTo(str.bottomX, str.bottomY);
    }
    
    ctx.stroke();

    ctx.restore();
  }

  private drawLabels(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.font = `${11 * this.scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(100, 80, 80, 0.6)';

    for (const str of this.strings) {
      const labelY = str.bottomY + 40 * this.scale;
      const noteDisplay = str.noteName;
      ctx.fillText(noteDisplay, str.bottomX, labelY);
      
      ctx.font = `${14 * this.scale}px sans-serif`;
      ctx.fillText('🎵', str.bottomX, labelY + 18 * this.scale);
      ctx.font = `${11 * this.scale}px -apple-system, BlinkMacSystemFont, sans-serif`;
    }

    ctx.restore();
  }

  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private lightenColor(hex: string, percent: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    const amount = Math.floor(255 * percent / 100);
    const newR = Math.min(255, r + amount);
    const newG = Math.min(255, g + amount);
    const newB = Math.min(255, b + amount);
    
    return `#${this.componentToHex(newR)}${this.componentToHex(newG)}${this.componentToHex(newB)}`;
  }

  public getStrings(): StringState[] {
    return this.strings;
  }

  public getGlideTimeouts(): number[] {
    return this.glideTimeouts;
  }
}
