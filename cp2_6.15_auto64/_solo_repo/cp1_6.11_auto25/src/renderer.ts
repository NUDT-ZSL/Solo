import type { Particle } from './parser';
import type { AudioData } from './audioController';

interface ControlState {
  isPlaying: boolean;
  speed: number;
  particleSize: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  phase: number;
  twinkleSpeed: number;
}

interface RenderState {
  stars: Star[];
  hueShift: number;
  lastHueUpdate: number;
  startTime: number;
  fontCache: string;
  cachedFontSize: number;
  offscreenCanvas: HTMLCanvasElement | null;
  offscreenCtx: CanvasRenderingContext2D | null;
  lastBgHue: number;
}

const COLOR_STOPS_COLD = [
  { r: 44, g: 62, b: 80 },
  { r: 52, g: 152, b: 219 }
];
const COLOR_STOPS_WARM = [
  { r: 231, g: 76, b: 60 },
  { r: 243, g: 156, b: 18 }
];

function createStars(width: number, height: number, count: number): Star[] {
  const stars: Star[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height * 0.9,
      size: Math.random() * 1.4 + 0.3,
      baseAlpha: Math.random() * 0.5 + 0.15,
      phase: Math.random() * Math.PI * 2,
      twinkleSpeed: Math.random() * 1.5 + 0.5
    });
  }
  return stars;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(c1: { r: number; g: number; b: number }, c2: { r: number; g: number; b: number }, t: number) {
  return {
    r: Math.round(lerp(c1.r, c2.r, t)),
    g: Math.round(lerp(c1.g, c2.g, t)),
    b: Math.round(lerp(c1.b, c2.b, t))
  };
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
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
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;
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
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
}

function shiftHue(r: number, g: number, b: number, degrees: number): { r: number; g: number; b: number } {
  const hsl = rgbToHsl(r, g, b);
  hsl.h = (hsl.h + degrees) % 360;
  if (hsl.h < 0) hsl.h += 360;
  return hslToRgb(hsl.h, hsl.s, hsl.l);
}

function getTidalColor(colorIndex: number, hueShift: number): string {
  const t1 = colorIndex;
  const cold = lerpColor(COLOR_STOPS_COLD[0], COLOR_STOPS_COLD[1], Math.min(1, t1 * 2));
  const warm = lerpColor(COLOR_STOPS_WARM[0], COLOR_STOPS_WARM[1], Math.max(0, (t1 - 0.5) * 2));
  const blendT = Math.max(0, Math.min(1, (t1 - 0.3) / 0.5));
  const base = lerpColor(cold, warm, blendT);
  const shifted = shiftHue(base.r, base.g, base.b, hueShift);
  return `rgb(${shifted.r}, ${shifted.g}, ${shifted.b})`;
}

const state: RenderState = {
  stars: [],
  hueShift: 0,
  lastHueUpdate: 0,
  startTime: performance.now(),
  fontCache: '',
  cachedFontSize: -1,
  offscreenCanvas: null,
  offscreenCtx: null,
  lastBgHue: -999
};

export function initRenderer(canvasWidth: number, canvasHeight: number): void {
  state.stars = createStars(canvasWidth, canvasHeight, 120);
  state.startTime = performance.now();
  state.hueShift = 0;
  state.lastHueUpdate = performance.now();
  state.fontCache = '';
  state.cachedFontSize = -1;

  try {
    state.offscreenCanvas = document.createElement('canvas');
    state.offscreenCanvas.width = canvasWidth;
    state.offscreenCanvas.height = canvasHeight;
    state.offscreenCtx = state.offscreenCanvas.getContext('2d');
  } catch {
    state.offscreenCanvas = null;
    state.offscreenCtx = null;
  }
}

export function resizeRenderer(width: number, height: number): void {
  state.stars = createStars(width, height, 120);
  if (state.offscreenCanvas) {
    state.offscreenCanvas.width = width;
    state.offscreenCanvas.height = height;
  }
  state.lastBgHue = -999;
}

function getFontString(fontSize: number): string {
  if (state.cachedFontSize === fontSize) return state.fontCache;
  state.cachedFontSize = fontSize;
  state.fontCache = `500 ${fontSize}px 'Cormorant Garamond', 'Noto Serif SC', serif`;
  return state.fontCache;
}

function updateParticles(
  particles: Particle[],
  audio: AudioData,
  controls: ControlState,
  timestamp: number
): void {
  const elapsed = (timestamp - state.startTime) / 1000;
  const bpmFactor = audio.isPlaying ? audio.bpm / 90 : 1;
  const speedMult = controls.speed * bpmFactor;
  const baseAmp = Math.max(14, controls.particleSize * 1.2);
  const bassDrive = audio.bassLevel * 2.5;
  const midDrive = audio.midHighLevel * 1.5;

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const wavePhase = elapsed * 1.8 * speedMult + p.phaseOffset;
    const sinWave = Math.sin(wavePhase) * 0.6 + Math.sin(wavePhase * 2.3 + 1.2) * 0.3 + Math.sin(wavePhase * 0.5) * 0.1;
    const bassMod = (1 + bassDrive * 2) * Math.sin(elapsed * 4 * speedMult + i * 0.2) * 0.5;
    const midJitter = (Math.random() - 0.5) * midDrive * 8;

    const totalAmp = baseAmp * (1 + bassDrive * 1.2);
    p.currentY = p.baseY + (sinWave * totalAmp + bassMod * totalAmp * 0.6 + midJitter) * (audio.isPlaying ? 1 : 0.5);
    p.currentX = p.baseX + Math.sin(elapsed * 0.6 + p.phaseOffset * 0.3) * 2;

    const breathing = 0.9 + Math.sin(elapsed * 2.2 * speedMult + p.phaseOffset) * 0.08 + bassDrive * 0.15;
    p.scale = breathing;
    p.opacity = (0.5 + p.weight * 0.45) * (0.85 + Math.sin(elapsed * 1.4 + p.phaseOffset) * 0.1 + bassDrive * 0.2);
    p.opacity = Math.min(1, Math.max(0.25, p.opacity));
  }
}

function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timestamp: number
): void {
  if (timestamp - state.lastHueUpdate > 10000) {
    state.hueShift = (state.hueShift + 5) % 360;
    state.lastHueUpdate = timestamp;
  }

  const gradient = ctx.createRadialGradient(width * 0.5, height * 0.4, 0, width * 0.5, height * 0.5, Math.max(width, height) * 0.8);
  gradient.addColorStop(0, '#0B101E');
  gradient.addColorStop(1, '#000000');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  const elapsed = (timestamp - state.startTime) / 1000;

  ctx.save();
  for (let i = 0; i < state.stars.length; i++) {
    const s = state.stars[i];
    const twinkle = s.baseAlpha * (0.6 + Math.sin(elapsed * s.twinkleSpeed + s.phase) * 0.4);
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = '#a8c8ff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  timestamp: number
): void {
  if (timestamp - state.lastHueUpdate > 10000) {
    state.hueShift = (state.hueShift + 5) % 360;
    state.lastHueUpdate = timestamp;
  }

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (p.char.trim() === '') continue;

    const color = getTidalColor(p.colorIndex, state.hueShift);
    const fontSize = p.fontSize * p.scale;

    ctx.save();
    ctx.globalAlpha = 0.15;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(p.currentX, p.currentY + fontSize * 0.3);
    ctx.lineTo(p.currentX, p.currentY + fontSize * 1.6);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.font = getFontString(fontSize);
    ctx.shadowColor = color;
    ctx.shadowBlur = 12 * p.weight;
    ctx.fillStyle = color;
    ctx.fillText(p.char, p.currentX, p.currentY);
    ctx.restore();
  }
}

export function render(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  audioData: AudioData,
  controls: ControlState,
  timestamp: number
): void {
  const width = ctx.canvas.width;
  const height = ctx.canvas.height;

  drawBackground(ctx, width, height, timestamp);
  updateParticles(particles, audioData, controls, timestamp);
  drawParticles(ctx, particles, timestamp);
}
