export interface SelectionBox {
  active: boolean;
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  zoomProgress: number;
}

export interface WaveOutput {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  opacity: Float32Array;
  spectrumData: number[];
  energyLevel: number;
  energyFlash: number;
}

const PARTICLE_COUNT = 1000;
const X_MIN = -8;
const X_MAX = 8;
const BASE_AMPLITUDE = 2;
const BASE_FREQ = 0.3;
const JITTER = 0.02;
const ROTATION_SPEED = 0.2;
const ZOOM_FACTOR = 3;
const ZOOM_DURATION = 0.4;
const SPECTRUM_BINS = 64;
const SPECTRUM_MAX_FREQ = 20;
const ENERGY_WINDOW = 0.5;
const ENERGY_SAMPLE_RATE = 10;
const PULSE_DURATION = 3;
const PULSE_DECAY_TIME = 1;
const PULSE_AMPLITUDE = 3;
const PULSE_FREQ = 2;
const NOISE_INTERVAL_MIN = 2;
const NOISE_INTERVAL_MAX = 5;
const NOISE_AMPLITUDE = 0.5;
const NOISE_DURATION = 0.5;

function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function clamp(v: number, min: number, max: number): number {
  return v < min ? min : v > max ? max : v;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [r, g, b];
}

export class WaveGenerator {
  private baseX: Float32Array;
  private jitterSeedX: Float32Array;
  private jitterSeedZ: Float32Array;
  private jitterSeedSize: Float32Array;
  private jitterPhase: Float32Array;

  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private opacity: Float32Array;

  private spectrumData: number[];
  private spectrumDecay: number[];

  private energyHistory: { time: number; dy: number }[] = [];
  private energySampleTimer = 0;
  private currentEnergy = 0;
  private energyFlashTimer = 0;

  private pulseActive = false;
  private pulseStartTime = -1;

  private noiseTimer = 0;
  private noiseNextInterval = 0;
  private noiseActive = false;
  private noiseStartTime = -1;

  private rotationY = 0;

  private globalTime = 0;
  private startYCache: number[] = [];

  constructor() {
    this.baseX = new Float32Array(PARTICLE_COUNT);
    this.jitterSeedX = new Float32Array(PARTICLE_COUNT);
    this.jitterSeedZ = new Float32Array(PARTICLE_COUNT);
    this.jitterSeedSize = new Float32Array(PARTICLE_COUNT);
    this.jitterPhase = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.baseX[i] = X_MIN + (X_MAX - X_MIN) * (i / (PARTICLE_COUNT - 1));
      this.jitterSeedX[i] = Math.random() * Math.PI * 2;
      this.jitterSeedZ[i] = Math.random() * Math.PI * 2;
      this.jitterSeedSize[i] = Math.random();
      this.jitterPhase[i] = Math.random() * Math.PI * 2;
    }

    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.colors = new Float32Array(PARTICLE_COUNT * 3);
    this.sizes = new Float32Array(PARTICLE_COUNT);
    this.opacity = new Float32Array(PARTICLE_COUNT);

    this.spectrumData = new Array(SPECTRUM_BINS).fill(0);
    this.spectrumDecay = new Array(SPECTRUM_BINS).fill(1.5);

    this.scheduleNextNoise();
  }

  private scheduleNextNoise(): void {
    this.noiseNextInterval = NOISE_INTERVAL_MIN + Math.random() * (NOISE_INTERVAL_MAX - NOISE_INTERVAL_MIN);
  }

  public triggerPulse(): void {
    this.pulseActive = true;
    this.pulseStartTime = this.globalTime;
    this.energyFlashTimer = 0.3;
  }

  private computeBaseY(x: number, t: number): number {
    return BASE_AMPLITUDE * Math.sin(2 * Math.PI * BASE_FREQ * t + x * 0.3);
  }

  private computePulseY(x: number, t: number): number {
    if (!this.pulseActive) return 0;
    const elapsed = t - this.pulseStartTime;
    if (elapsed > PULSE_DURATION) {
      this.pulseActive = false;
      return 0;
    }
    const decayFactor = elapsed < PULSE_DECAY_TIME
      ? 1 - (elapsed / PULSE_DECAY_TIME)
      : 0;
    const envelope = decayFactor * Math.exp(-elapsed * 1.5);
    const carrier = Math.sin(2 * Math.PI * PULSE_FREQ * elapsed + x * 0.8);
    return PULSE_AMPLITUDE * envelope * carrier;
  }

  private computeNoiseY(x: number, t: number): number {
    if (!this.noiseActive) return 0;
    const elapsed = t - this.noiseStartTime;
    if (elapsed > NOISE_DURATION) {
      this.noiseActive = false;
      return 0;
    }
    const progress = elapsed / NOISE_DURATION;
    const envelope = Math.sin(Math.PI * progress);
    return NOISE_AMPLITUDE * envelope * Math.sin(2 * Math.PI * (4 + x * 0.2) * elapsed + x * 3);
  }

  private pulseIntensity(): number {
    if (!this.pulseActive) return 0;
    const elapsed = this.globalTime - this.pulseStartTime;
    if (elapsed > PULSE_DURATION) return 0;
    const decayFactor = elapsed < PULSE_DECAY_TIME ? 1 - elapsed / PULSE_DECAY_TIME : 0;
    return decayFactor * Math.exp(-elapsed * 1.5);
  }

  private noiseIntensity(): number {
    if (!this.noiseActive) return 0;
    const elapsed = this.globalTime - this.noiseStartTime;
    if (elapsed > NOISE_DURATION) return 0;
    const progress = elapsed / NOISE_DURATION;
    return Math.sin(Math.PI * progress);
  }

  private updateSpectrum(deltaTime: number, dyValues: Float32Array): void {
    for (let i = 0; i < SPECTRUM_BINS; i++) {
      this.spectrumData[i] *= Math.exp(-deltaTime * this.spectrumDecay[i]);
    }
    const pulseInt = this.pulseIntensity();
    if (pulseInt > 0.01) {
      const pulseFreqBin = Math.floor((PULSE_FREQ / SPECTRUM_MAX_FREQ) * SPECTRUM_BINS);
      const idx = clamp(pulseFreqBin, 0, SPECTRUM_BINS - 1);
      const boost = pulseInt * 1.2;
      for (let d = -2; d <= 2; d++) {
        const di = idx + d;
        if (di >= 0 && di < SPECTRUM_BINS) {
          const w = 1 - Math.abs(d) / 3;
          this.spectrumData[di] = Math.min(1, this.spectrumData[di] + boost * w);
        }
      }
    }
    const noiseInt = this.noiseIntensity();
    if (noiseInt > 0.01) {
      for (let k = 0; k < 8; k++) {
        const bi = Math.floor(Math.random() * SPECTRUM_BINS);
        this.spectrumData[bi] = Math.min(1, this.spectrumData[bi] + noiseInt * 0.25 * Math.random());
      }
    }
    let avgDy = 0;
    for (let i = 0; i < dyValues.length; i += 10) {
      avgDy += Math.abs(dyValues[i]);
    }
    avgDy /= (dyValues.length / 10);
    const lowBinBoost = clamp(avgDy * 4, 0, 0.8);
    for (let i = 0; i < 8; i++) {
      this.spectrumData[i] = Math.min(1, this.spectrumData[i] + lowBinBoost * (1 - i / 8));
    }
  }

  private updateEnergy(deltaTime: number, dyValues: Float32Array): void {
    this.energySampleTimer += deltaTime;
    if (this.energyFlashTimer > 0) {
      this.energyFlashTimer = Math.max(0, this.energyFlashTimer - deltaTime);
    }
    const sampleInterval = 1 / ENERGY_SAMPLE_RATE;
    while (this.energySampleTimer >= sampleInterval) {
      this.energySampleTimer -= sampleInterval;
      let sum = 0;
      for (let i = 0; i < dyValues.length; i += 20) {
        sum += Math.abs(dyValues[i]);
      }
      const avg = sum / (dyValues.length / 20);
      this.energyHistory.push({ time: this.globalTime, dy: avg });
    }
    const cutoff = this.globalTime - ENERGY_WINDOW;
    while (this.energyHistory.length > 0 && this.energyHistory[0].time < cutoff) {
      this.energyHistory.shift();
    }
    if (this.energyHistory.length > 0) {
      let s = 0;
      for (const e of this.energyHistory) s += e.dy;
      const raw = s / this.energyHistory.length;
      const target = clamp(raw * 2.5, 0, 1);
      this.currentEnergy = lerp(this.currentEnergy, target, 0.25);
    }
  }

  public update(deltaTime: number, selection: SelectionBox): WaveOutput {
    this.globalTime += deltaTime;
    this.rotationY += ROTATION_SPEED * deltaTime * Math.PI * 2;
    const cosR = Math.cos(this.rotationY);
    const sinR = Math.sin(this.rotationY);

    this.noiseTimer += deltaTime;
    if (this.noiseTimer >= this.noiseNextInterval && !this.noiseActive) {
      this.noiseTimer = 0;
      this.noiseActive = true;
      this.noiseStartTime = this.globalTime;
      this.scheduleNextNoise();
    }

    const dyValues = new Float32Array(PARTICLE_COUNT);
    let selectionCenterX = 0;
    let selectionCenterY = 0;
    if (selection.active) {
      selectionCenterX = (selection.xMin + selection.xMax) / 2;
      selectionCenterY = (selection.yMin + selection.yMax) / 2;
    }
    const zoomT = selection.active ? easeOut(clamp(selection.zoomProgress / ZOOM_DURATION, 0, 1)) : 0;
    const effectiveZoom = 1 + (ZOOM_FACTOR - 1) * zoomT;

    const pulseInt = this.pulseIntensity();
    const noiseInt = this.noiseIntensity();
    const hueShift = pulseInt * 0.3;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const bx = this.baseX[i];
      const baseY = this.computeBaseY(bx, this.globalTime);
      const pulseY = this.computePulseY(bx, this.globalTime);
      const noiseY = this.computeNoiseY(bx, this.globalTime);
      let y = baseY + pulseY + noiseY;

      const jx = JITTER * Math.sin(this.jitterSeedX[i] + this.globalTime * 4 + this.jitterPhase[i]);
      const jz = JITTER * Math.sin(this.jitterSeedZ[i] + this.globalTime * 3.5);

      let px = bx + jx;
      let py = y;
      let pz = 0 + jz;

      const inSelection = selection.active
        && bx >= selection.xMin && bx <= selection.xMax
        && y >= selection.yMin && y <= selection.yMax;

      if (selection.active) {
        if (inSelection) {
          px = selectionCenterX + (bx - selectionCenterX) * effectiveZoom;
          py = selectionCenterY + (y - selectionCenterY) * effectiveZoom;
          pz = -0.5 * zoomT;
        } else {
          px = bx + jx * 0.3;
        }
      }

      const rx = px * cosR + pz * sinR;
      const rz = -px * sinR + pz * cosR;

      const i3 = i * 3;
      this.positions[i3] = rx;
      this.positions[i3 + 1] = py;
      this.positions[i3 + 2] = rz;

      const t = i / (PARTICLE_COUNT - 1);
      const baseHue = lerp(0.78, 0.52, t);
      let hue = baseHue + hueShift;
      if (hue > 1) hue -= 1;
      let sat = inSelection ? 0.85 : 0.75;
      let lig = inSelection ? 0.72 : 0.58;
      lig += pulseInt * 0.18 + noiseInt * 0.05;
      sat = Math.max(0, sat - pulseInt * 0.7);
      const [r, g, b] = hslToRgb(hue, clamp(sat, 0, 1), clamp(lig, 0, 1));
      this.colors[i3] = r;
      this.colors[i3 + 1] = g;
      this.colors[i3 + 2] = b;

      const baseSize = 0.04 + this.jitterSeedSize[i] * 0.04;
      let sz = baseSize * (inSelection ? (1 + zoomT * 0.5) : 1);
      sz *= 1 + pulseInt * 0.6 + noiseInt * 0.2;
      this.sizes[i] = sz;

      let op = inSelection ? 1.0 : (selection.active ? 0.3 : 0.95);
      op *= 1 + pulseInt * 0.05;
      this.opacity[i] = clamp(op, 0, 1);

      dyValues[i] = (this.startYCache[i] !== undefined) ? (y - this.startYCache[i]) : 0;
      this.startYCache[i] = y;
    }

    this.updateSpectrum(deltaTime, dyValues);
    this.updateEnergy(deltaTime, dyValues);

    return {
      positions: this.positions,
      colors: this.colors,
      sizes: this.sizes,
      opacity: this.opacity,
      spectrumData: this.spectrumData.slice(),
      energyLevel: this.currentEnergy,
      energyFlash: this.energyFlashTimer > 0 ? (this.energyFlashTimer / 0.3) : 0
    };
  }

  public getRotationY(): number {
    return this.rotationY;
  }
}
