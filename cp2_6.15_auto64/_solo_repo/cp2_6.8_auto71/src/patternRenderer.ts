import { AudioAnalysisData, mapFrequencyToHue } from './audioAnalyzer';

export type PatternMode = 'circle' | 'polygon' | 'spiral' | 'particles' | 'waveform';

export interface RenderParams {
  patternMode: PatternMode;
  beatThreshold: number;
  saturation: number;
  particleCount: number;
  sizeScale: number;
  glow: { enabled: boolean; intensity: number };
  trail: { enabled: boolean; intensity: number };
  mosaic: { enabled: boolean; blockSize: number };
}

interface PatternState {
  x: number;
  y: number;
  scale: number;
  targetScale: number;
  rotation: number;
  alpha: number;
  hue: number;
  life: number;
  velocityX: number;
  velocityY: number;
  sides?: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  hue: number;
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export class PatternRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width = 0;
  private height = 0;
  private dpr = 1;

  private patterns: PatternState[] = [];
  private ripples: Ripple[] = [];
  private beatBurstProgress = 0;
  private beatBurstActive = false;
  private frameCount = 0;
  private spiralLength = 0;
  private spiralTwist = 0;
  private waveformHistory: number[] = [];

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.resize();
  }

  resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private centerX(): number { return this.width / 2; }
  private centerY(): number { return this.height / 2; }

  private initParticles(count: number): void {
    this.patterns = [];
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.5 + Math.random() * 2;
      this.patterns.push({
        x: this.centerX(),
        y: this.centerY(),
        scale: 2 + Math.random() * 4,
        targetScale: 2 + Math.random() * 4,
        rotation: 0,
        alpha: 0.7 + Math.random() * 0.3,
        hue: Math.random() * 360,
        life: 60 + Math.random() * 120,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed
      });
    }
  }

  private initPolygons(): void {
    this.patterns = [];
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const dist = Math.min(this.width, this.height) * 0.15;
      this.patterns.push({
        x: this.centerX() + Math.cos(angle) * dist,
        y: this.centerY() + Math.sin(angle) * dist,
        scale: 1,
        targetScale: 1,
        rotation: angle,
        alpha: 0.8,
        hue: (i / 6) * 360,
        life: Infinity,
        velocityX: 0,
        velocityY: 0,
        sides: 3 + (i % 6)
      });
    }
  }

  triggerBeatBurst(analysis: AudioAnalysisData): void {
    this.beatBurstActive = true;
    this.beatBurstProgress = 0;

    const dominantBand = this.getDominantBand(analysis);
    const hue = mapFrequencyToHue(dominantBand, 128);

    for (const p of this.patterns) {
      p.x = this.centerX();
      p.y = this.centerY();
      p.targetScale = p.scale * 1.5;
      p.hue = hue;
      if ('velocityX' in p && p.velocityX !== undefined) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 4 + Math.random() * 6;
        p.velocityX = Math.cos(angle) * speed;
        p.velocityY = Math.sin(angle) * speed;
      }
    }
  }

  private getDominantBand(analysis: AudioAnalysisData): number {
    let maxIdx = 0;
    let maxVal = 0;
    for (let i = 0; i < analysis.frequencyData.length; i++) {
      if (analysis.frequencyData[i] > maxVal) {
        maxVal = analysis.frequencyData[i];
        maxIdx = i;
      }
    }
    return maxIdx;
  }

  private addRipple(x: number, y: number, hue: number): void {
    const maxR = Math.min(this.width, this.height) * 0.5;
    this.ripples.push({ x, y, radius: 0, maxRadius: maxR, alpha: 0.6, hue });
  }

  private getActiveHue(analysis: AudioAnalysisData, _saturation: number): number {
    let dominantHue = 180;
    let maxEnergy = 0.3;

    if (analysis.lowBandEnergy > maxEnergy) {
      maxEnergy = analysis.lowBandEnergy;
      dominantHue = mapFrequencyToHue(10, 128);
    }
    if (analysis.midBandEnergy > maxEnergy) {
      maxEnergy = analysis.midBandEnergy;
      dominantHue = mapFrequencyToHue(50, 128);
    }
    if (analysis.highBandEnergy > maxEnergy) {
      maxEnergy = analysis.highBandEnergy;
      dominantHue = mapFrequencyToHue(100, 128);
    }

    const freqBin = this.getDominantBand(analysis);
    if (analysis.frequencyData[freqBin] / 255 > maxEnergy) {
      dominantHue = mapFrequencyToHue(freqBin, 128);
    }

    return dominantHue;
  }

  render(analysis: AudioAnalysisData, params: RenderParams): void {
    this.frameCount++;

    if (params.trail.enabled) {
      const trailAlpha = 0.02 * params.trail.intensity;
      this.ctx.fillStyle = `rgba(10, 10, 10, ${trailAlpha})`;
      this.ctx.fillRect(0, 0, this.width, this.height);
    } else {
      this.ctx.fillStyle = '#0A0A0A';
      this.ctx.fillRect(0, 0, this.width, this.height);
    }

    if (this.beatBurstActive) {
      this.beatBurstProgress += 1 / 15;
      if (this.beatBurstProgress >= 1) {
        this.beatBurstProgress = 1;
        this.beatBurstActive = false;
      }
    }
    const burstEase = easeOutCubic(this.beatBurstProgress);

    if (params.glow.enabled) {
      this.ctx.shadowBlur = params.glow.intensity;
    } else {
      this.ctx.shadowBlur = 0;
    }

    switch (params.patternMode) {
      case 'circle': this.renderCircles(analysis, params, burstEase); break;
      case 'polygon': this.renderPolygons(analysis, params, burstEase); break;
      case 'spiral': this.renderSpiral(analysis, params, burstEase); break;
      case 'particles': this.renderParticles(analysis, params, burstEase); break;
      case 'waveform': this.renderWaveform(analysis, params); break;
    }

    this.renderRipples(params.saturation);

    if (params.mosaic.enabled) {
      this.applyMosaic(params.mosaic.blockSize);
    }

    this.ctx.shadowBlur = 0;
  }

  private renderCircles(analysis: AudioAnalysisData, params: RenderParams, burstEase: number): void {
    const cx = this.centerX();
    const cy = this.centerY();
    const baseRadius = Math.min(this.width, this.height) * 0.12 * params.sizeScale;
    const hue = this.getActiveHue(analysis, params.saturation);
    const volumeRadius = baseRadius * (1 + analysis.rmsVolume * 1.5);
    const burstScale = 1 + burstEase * 0.5;
    const finalRadius = volumeRadius * burstScale;

    if (analysis.rmsVolume > 0.6) {
      this.addRipple(cx, cy, hue);
    }

    this.ctx.save();
    this.ctx.shadowColor = `hsl(${hue}, ${params.saturation}%, 60%)`;

    for (let i = 0; i < 128; i++) {
      const freq = analysis.frequencyData[i] / 255;
      if (freq < 0.1) continue;
      const bandHue = mapFrequencyToHue(i, 128);
      const ringRadius = finalRadius * (0.3 + (i / 128) * 0.7);
      const lineWidth = 1 + freq * 4;

      this.ctx.beginPath();
      this.ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `hsla(${bandHue}, ${params.saturation}%, 55%, ${0.15 + freq * 0.5})`;
      this.ctx.lineWidth = lineWidth;
      this.ctx.stroke();
    }

    this.ctx.beginPath();
    this.ctx.arc(cx, cy, finalRadius * 0.25, 0, Math.PI * 2);
    this.ctx.fillStyle = `hsla(${hue}, ${params.saturation}%, 50%, 0.7)`;
    this.ctx.fill();

    this.ctx.beginPath();
    this.ctx.arc(cx, cy, finalRadius * 0.12, 0, Math.PI * 2);
    this.ctx.fillStyle = `hsla(${hue}, ${params.saturation}%, 80%, 0.9)`;
    this.ctx.fill();

    this.ctx.restore();
  }

  private renderPolygons(analysis: AudioAnalysisData, params: RenderParams, burstEase: number): void {
    if (this.patterns.length === 0 || this.patterns[0].sides === undefined) {
      this.initPolygons();
    }

    const cx = this.centerX();
    const cy = this.centerY();
    const baseSize = Math.min(this.width, this.height) * 0.06 * params.sizeScale;
    const midBandSides = Math.max(3, Math.min(8, Math.round(3 + analysis.midBandEnergy * 5)));

    this.ctx.save();

    for (let i = 0; i < this.patterns.length; i++) {
      const p = this.patterns[i];
      const hue = this.getActiveHue(analysis, params.saturation) + (i * 20) % 60;
      const sides = i === 0 ? midBandSides : (p.sides || 5);
      const size = baseSize * (1 + analysis.beatIntensity * 0.8);
      const burstScale = 1 + burstEase * 0.5;
      const rotationSpeed = 0.01 + analysis.midBandEnergy * 0.03;

      p.rotation += rotationSpeed;

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.scale(burstScale, burstScale);

      this.ctx.shadowColor = `hsl(${hue}, ${params.saturation}%, 60%)`;
      this.ctx.beginPath();
      for (let j = 0; j < sides; j++) {
        const angle = (j / sides) * Math.PI * 2 - Math.PI / 2;
        const px = Math.cos(angle) * size;
        const py = Math.sin(angle) * size;
        if (j === 0) this.ctx.moveTo(px, py);
        else this.ctx.lineTo(px, py);
      }
      this.ctx.closePath();

      this.ctx.strokeStyle = `hsla(${hue}, ${params.saturation}%, 60%, 0.9)`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      this.ctx.fillStyle = `hsla(${hue}, ${params.saturation}%, 45%, 0.25)`;
      this.ctx.fill();

      this.ctx.restore();
    }

    const centerHue = this.getActiveHue(analysis, params.saturation);
    this.ctx.shadowColor = `hsl(${centerHue}, ${params.saturation}%, 60%)`;
    this.ctx.beginPath();
    this.ctx.arc(cx, cy, baseSize * 0.4 * (1 + burstEase * 0.5), 0, Math.PI * 2);
    this.ctx.fillStyle = `hsla(${centerHue}, ${params.saturation}%, 60%, 0.8)`;
    this.ctx.fill();

    this.ctx.restore();
  }

  private renderSpiral(analysis: AudioAnalysisData, params: RenderParams, burstEase: number): void {
    const cx = this.centerX();
    const cy = this.centerY();
    const maxRadius = Math.min(this.width, this.height) * 0.45 * params.sizeScale;

    this.spiralLength += 2 + analysis.beatIntensity * 8;
    this.spiralTwist += 0.02 + analysis.rmsVolume * 0.05;
    if (this.spiralLength > maxRadius * 6) this.spiralLength = maxRadius * 6;

    const hue = this.getActiveHue(analysis, params.saturation);
    const burstScale = 1 + burstEase * 0.3;

    this.ctx.save();
    this.ctx.translate(cx, cy);
    this.ctx.rotate(this.spiralTwist * 0.5);
    this.ctx.scale(burstScale, burstScale);
    this.ctx.shadowColor = `hsl(${hue}, ${params.saturation}%, 60%)`;

    const segments = Math.min(400, this.spiralLength);
    for (let arm = 0; arm < 3; arm++) {
      const armOffset = (arm / 3) * Math.PI * 2;
      this.ctx.beginPath();

      for (let i = 0; i < segments; i++) {
        const t = i / segments;
        const angle = t * this.spiralTwist * 30 + armOffset;
        const radius = t * maxRadius * (0.4 + analysis.beatIntensity * 0.3);
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;

        if (i === 0) this.ctx.moveTo(px, py);
        else this.ctx.lineTo(px, py);
      }

      const armHue = (hue + arm * 40) % 360;
      this.ctx.strokeStyle = `hsla(${armHue}, ${params.saturation}%, 60%, 0.8)`;
      this.ctx.lineWidth = 2 + analysis.rmsVolume * 3;
      this.ctx.lineCap = 'round';
      this.ctx.stroke();
    }

    this.ctx.beginPath();
    this.ctx.arc(0, 0, 6 + analysis.rmsVolume * 10, 0, Math.PI * 2);
    this.ctx.fillStyle = `hsla(${hue}, ${params.saturation}%, 70%, 0.95)`;
    this.ctx.fill();

    this.ctx.restore();
  }

  private renderParticles(analysis: AudioAnalysisData, params: RenderParams, burstEase: number): void {
    if (this.patterns.length !== params.particleCount) {
      this.initParticles(params.particleCount);
    }

    const cx = this.centerX();
    const cy = this.centerY();
    const speedMultiplier = 1 + analysis.highBandEnergy * 4;
    const hue = this.getActiveHue(analysis, params.saturation);

    this.ctx.save();
    this.ctx.shadowColor = `hsl(${hue}, ${params.saturation}%, 60%)`;

    for (let i = 0; i < this.patterns.length; i++) {
      const p = this.patterns[i];
      p.x += (p.velocityX || 0) * speedMultiplier;
      p.y += (p.velocityY || 0) * speedMultiplier;

      if (p.x < -50 || p.x > this.width + 50 || p.y < -50 || p.y > this.height + 50) {
        p.x = cx;
        p.y = cy;
        const angle = Math.random() * Math.PI * 2;
        const speed = 1 + Math.random() * 3;
        p.velocityX = Math.cos(angle) * speed;
        p.velocityY = Math.sin(angle) * speed;
        p.life = 60 + Math.random() * 120;
      }

      const freqIdx = Math.floor((i / this.patterns.length) * 128);
      const freqEnergy = analysis.frequencyData[freqIdx] / 255;
      const particleHue = mapFrequencyToHue(freqIdx, 128);
      const size = p.scale * params.sizeScale * (1 + freqEnergy * 2) * (1 + burstEase * 0.5);
      const alpha = p.alpha * (0.4 + freqEnergy * 0.6);

      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      this.ctx.fillStyle = `hsla(${particleHue}, ${params.saturation}%, 60%, ${alpha})`;
      this.ctx.fill();

      if (freqEnergy > 0.5) {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, size * 2, 0, Math.PI * 2);
        this.ctx.fillStyle = `hsla(${particleHue}, ${params.saturation}%, 70%, ${alpha * 0.2})`;
        this.ctx.fill();
      }
    }

    this.ctx.restore();
  }

  private renderWaveform(analysis: AudioAnalysisData, params: RenderParams): void {
    const data = analysis.timeDomainData;
    const hue = this.getActiveHue(analysis, params.saturation);
    const lowHue = mapFrequencyToHue(10, 128);
    const lineWidth = 2 + analysis.lowBandEnergy * 6;
    const baseY = this.centerY();

    this.ctx.save();
    this.ctx.shadowColor = `hsl(${lowHue}, ${params.saturation}%, 60%)`;
    this.ctx.lineWidth = lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    this.ctx.beginPath();
    const sliceWidth = this.width / data.length;
    for (let i = 0; i < data.length; i++) {
      const v = data[i] / 128.0 - 1;
      const y = baseY + v * (this.height * 0.35) * params.sizeScale;
      const x = i * sliceWidth;
      if (i === 0) this.ctx.moveTo(x, y);
      else this.ctx.lineTo(x, y);
    }

    const gradient = this.ctx.createLinearGradient(0, 0, this.width, 0);
    gradient.addColorStop(0, `hsla(${mapFrequencyToHue(0, 128)}, ${params.saturation}%, 60%, 0.95)`);
    gradient.addColorStop(0.5, `hsla(${mapFrequencyToHue(64, 128)}, ${params.saturation}%, 60%, 0.95)`);
    gradient.addColorStop(1, `hsla(${mapFrequencyToHue(127, 128)}, ${params.saturation}%, 60%, 0.95)`);
    this.ctx.strokeStyle = gradient;
    this.ctx.stroke();

    this.ctx.lineWidth = lineWidth * 3;
    this.ctx.globalAlpha = 0.15;
    this.ctx.stroke();
    this.ctx.globalAlpha = 1;

    this.waveformHistory.push(analysis.rmsVolume);
    if (this.waveformHistory.length > 180) this.waveformHistory.shift();

    if (this.waveformHistory.length > 2) {
      this.ctx.beginPath();
      const barWidth = this.width / this.waveformHistory.length;
      for (let i = 0; i < this.waveformHistory.length; i++) {
        const barH = this.waveformHistory[i] * this.height * 0.3;
        const x = i * barWidth;
        const barHue = mapFrequencyToHue(Math.floor((i / this.waveformHistory.length) * 128), 128);
        this.ctx.fillStyle = `hsla(${barHue}, ${params.saturation}%, 50%, 0.08)`;
        this.ctx.fillRect(x, this.height - barH, barWidth + 1, barH);
      }
    }

    this.ctx.restore();
    void hue;
  }

  private renderRipples(saturation: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.radius += 4;
      r.alpha -= 0.012;

      if (r.alpha <= 0 || r.radius >= r.maxRadius) {
        this.ripples.splice(i, 1);
        continue;
      }

      this.ctx.beginPath();
      this.ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
      this.ctx.strokeStyle = `hsla(${r.hue}, ${saturation}%, 60%, ${r.alpha})`;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
    }
  }

  private applyMosaic(blockSize: number): void {
    const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
    const data = imageData.data;

    for (let y = 0; y < this.height; y += blockSize) {
      for (let x = 0; x < this.width; x += blockSize) {
        let r = 0, g = 0, b = 0, count = 0;

        for (let dy = 0; dy < blockSize && y + dy < this.height; dy++) {
          for (let dx = 0; dx < blockSize && x + dx < this.width; dx++) {
            const idx = ((y + dy) * this.width + (x + dx)) * 4;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            count++;
          }
        }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);

        for (let dy = 0; dy < blockSize && y + dy < this.height; dy++) {
          for (let dx = 0; dx < blockSize && x + dx < this.width; dx++) {
            const idx = ((y + dy) * this.width + (x + dx)) * 4;
            data[idx] = r;
            data[idx + 1] = g;
            data[idx + 2] = b;
          }
        }
      }
    }

    this.ctx.putImageData(imageData, 0, 0);
  }
}
