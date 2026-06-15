import { PathManager, PathPoint } from './path-manager.js';
import { AudioManager } from './audio-manager.js';
import { ParticleSystem } from './particle-system.js';

const MAX_FLYING_NOTES = 8;
const NOTE_RADIUS = 8;
const TRAIL_LENGTH_PX = 30;
const BASE_FREQ_C4 = 261.63;
const SEMITONES_PER_100PX = 1;
const MAX_SEMITONES = 24;
const CURVATURE_THRESHOLD = 0.01;

interface FlyingNote {
  id: number;
  pathManager: PathManager;
  progress: number;
  speedPerSec: number;
  totalLength: number;
  color: string;
  frequency: number;
  noteType: 'sine' | 'sawtooth';
  volume: number;
  curvature: number;
  createdAt: number;
  lastTrailEmit: number;
  exploded: boolean;
}

interface BackgroundTint {
  r: number; g: number; b: number;
  targetR: number; targetG: number; targetB: number;
  intensity: number;
  timer: number;
}

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element not found');
}
const ctx: CanvasRenderingContext2D = canvas.getContext('2d')!;
if (!ctx) {
  throw new Error('Canvas 2D context not available');
}

let audioCtx: AudioContext | null = null;
let audioManager: AudioManager | null = null;

const currentPath = new PathManager();
let particleSystem: ParticleSystem;
let noiseCanvas: HTMLCanvasElement;
let noiseCtx: CanvasRenderingContext2D;

const flyingNotes: FlyingNote[] = [];
let nextNoteId = 1;

let mouseX = 0;
let mouseY = 0;
let mouseInCanvas = false;
let isDrawing = false;
let lastMouseMoveTime = performance.now();
let lastMouseX = 0;
let lastMouseY = 0;
let lastTrailEmitDist = 0;

let fadingAll = false;
let fadeProgress = 0;

const bgTint: BackgroundTint = {
  r: 0, g: 0, b: 0,
  targetR: 0, targetG: 0, targetB: 0,
  intensity: 0,
  timer: 0,
};

let lastFrameTime = performance.now();

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  buildNoiseTexture(w, h);
}

function buildNoiseTexture(w: number, h: number): void {
  noiseCanvas = document.createElement('canvas');
  const dpr = window.devicePixelRatio || 1;
  noiseCanvas.width = Math.floor(w * dpr);
  noiseCanvas.height = Math.floor(h * dpr);
  noiseCtx = noiseCanvas.getContext('2d')!;
  const img = noiseCtx.createImageData(noiseCanvas.width, noiseCanvas.height);
  const data = img.data;
  for (let i = 0; i < data.length; i += 4) {
    const v = Math.random() * 255;
    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
    data[i + 3] = Math.floor(255 * 0.03);
  }
  noiseCtx.putImageData(img, 0, 0);
}

function ensureAudio(): void {
  if (!audioCtx) {
    const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
    if (AC) {
      audioCtx = new AC() as AudioContext;
      audioManager = new AudioManager(audioCtx as AudioContext);
    }
  }
  if (audioManager) audioManager.resume();
}

function getCanvasCoords(e: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function onMouseDown(e: MouseEvent): void {
  if (e.button !== 0 || fadingAll) return;
  ensureAudio();
  const p = getCanvasCoords(e);
  isDrawing = true;
  currentPath.clear();
  currentPath.addPoint(p.x, p.y, 0);
  lastMouseX = p.x;
  lastMouseY = p.y;
  lastMouseMoveTime = performance.now();
  lastTrailEmitDist = 0;
}

function onMouseMove(e: MouseEvent): void {
  const p = getCanvasCoords(e);
  mouseX = p.x;
  mouseY = p.y;
  if (!isDrawing) return;

  const now = performance.now();
  const dt = Math.max(0.001, (now - lastMouseMoveTime) / 1000);
  const dx = p.x - lastMouseX;
  const dy = p.y - lastMouseY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const speed = dist / dt;

  if (dist > 1.5) {
    currentPath.addPoint(p.x, p.y, speed);
    lastTrailEmitDist += dist;
    while (lastTrailEmitDist >= 5) {
      lastTrailEmitDist -= 5;
      const t = (currentPath.points.length - 1) / Math.max(1, currentPath.points.length);
      const color = currentPath.getColorAt(t);
      particleSystem.spawnTrailParticle({ x: p.x, y: p.y, color });
    }
    lastMouseX = p.x;
    lastMouseY = p.y;
    lastMouseMoveTime = now;
  }
}

function onMouseUp(): void {
  if (!isDrawing) return;
  isDrawing = false;
  if (currentPath.isEmpty()) {
    currentPath.clear();
    return;
  }

  const length = currentPath.getLength();
  if (length < 15) {
    currentPath.clear();
    return;
  }

  spawnNoteFromPath(currentPath);
  currentPath.clear();
}

function onMouseEnter(): void {
  mouseInCanvas = true;
}

function onMouseLeave(): void {
  mouseInCanvas = false;
  if (isDrawing) {
    onMouseUp();
  }
}

function parseHslColor(hslStr: string): { h: number; s: number; l: number } {
  const m = /hsl\(\s*([\d.]+)\s*,\s*([\d.]+)%\s*,\s*([\d.]+)%\s*\)/i.exec(hslStr);
  if (m) return { h: parseFloat(m[1]), s: parseFloat(m[2]), l: parseFloat(m[3]) };
  return { h: 260, s: 70, l: 60 };
}

function hslToRgbObj(h: number, s: number, l: number): { r: number; g: number; b: number } {
  h /= 360; s /= 100; l /= 100;
  let r: number, g: number, b: number;
  if (s === 0) { r = g = b = l; } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1; if (t > 1) t -= 1;
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

function spawnNoteFromPath(path: PathManager): void {
  const length = path.getLength();
  const curvature = path.getCurvature();
  const verticalOffset = path.getVerticalOffset();

  const semitones = Math.min(MAX_SEMITONES, (length / 100) * SEMITONES_PER_100PX);
  const frequency = BASE_FREQ_C4 * Math.pow(2, semitones / 12);

  const noteType: 'sine' | 'sawtooth' = curvature > CURVATURE_THRESHOLD ? 'sawtooth' : 'sine';
  const distortion = noteType === 'sawtooth' ? Math.min(1, curvature * 40) : 0;

  const maxExpectedOffset = Math.min(window.innerHeight, 600);
  const offsetRatio = Math.min(1, verticalOffset / maxExpectedOffset);
  const volume = 0.15 + (1 - offsetRatio) * 0.55;

  const baseSpeed = 400;
  const lengthFactor = 1 / (1 + length / 500);
  const speedPerSec = baseSpeed * (0.5 + lengthFactor * 1.5);

  const notePath = clonePathManager(path);
  const color = path.getEndColor();

  while (flyingNotes.length >= MAX_FLYING_NOTES) {
    const oldest = flyingNotes.shift();
    if (oldest) triggerExplosion(oldest, true);
  }

  const note: FlyingNote = {
    id: nextNoteId++,
    pathManager: notePath,
    progress: 0,
    speedPerSec,
    totalLength: length,
    color,
    frequency,
    noteType,
    volume,
    curvature,
    createdAt: performance.now(),
    lastTrailEmit: 0,
    exploded: false,
  };
  flyingNotes.push(note);
  void distortion;
}

function clonePathManager(src: PathManager): PathManager {
  const pm = new PathManager();
  for (const pt of src.points) {
    pm.points.push({ x: pt.x, y: pt.y, speed: pt.speed, timestamp: pt.timestamp });
  }
  return pm;
}

function triggerExplosion(note: FlyingNote, force: boolean): void {
  if (note.exploded && !force) return;
  note.exploded = true;

  const end = note.pathManager.getPointAt(1);
  particleSystem.spawnExplosion({ x: end.x, y: end.y, baseColor: note.color });
  particleSystem.spawnRipple({ x: end.x, y: end.y, color: note.color });

  applyBackgroundTint(note.color);

  if (audioManager) {
    const distortion = note.noteType === 'sawtooth' ? Math.min(1, note.curvature * 40) : 0;
    audioManager.playNote({
      frequency: note.frequency,
      duration: 0.45,
      type: note.noteType,
      volume: note.volume,
      distortion,
    });
  }
}

function applyBackgroundTint(colorHsl: string): void {
  const { h, s, l } = parseHslColor(colorHsl);
  const rgb = hslToRgbObj(h, s, l);
  bgTint.targetR = rgb.r;
  bgTint.targetG = rgb.g;
  bgTint.targetB = rgb.b;
  bgTint.intensity = 0.1;
  bgTint.timer = 0.3;
}

function updateBackgroundTint(dt: number): void {
  if (bgTint.timer > 0) {
    bgTint.timer -= dt;
    const t = Math.max(0, bgTint.timer / 0.3);
    const k = bgTint.intensity * t;
    bgTint.r = bgTint.targetR * k;
    bgTint.g = bgTint.targetG * k;
    bgTint.b = bgTint.targetB * k;
    if (bgTint.timer <= 0) {
      bgTint.r = 0; bgTint.g = 0; bgTint.b = 0;
    }
  }
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.code === 'Space' && !fadingAll) {
    e.preventDefault();
    triggerFullReset();
  }
}

function triggerFullReset(): void {
  fadingAll = true;
  fadeProgress = 0;
  isDrawing = false;
  if (audioManager) audioManager.playResetSweep();
  particleSystem.reset();
  window.setTimeout(() => {
    currentPath.clear();
    flyingNotes.length = 0;
    fadingAll = false;
    fadeProgress = 0;
    bgTint.r = 0; bgTint.g = 0; bgTint.b = 0; bgTint.timer = 0;
  }, 410);
}

function updateFlyingNotes(dt: number): void {
  for (let i = flyingNotes.length - 1; i >= 0; i--) {
    const note = flyingNotes[i];
    if (fadingAll) continue;

    const distPerFrame = note.speedPerSec * dt;
    const progressDelta = note.totalLength > 0 ? distPerFrame / note.totalLength : 0.02;
    note.progress += progressDelta;

    note.lastTrailEmit += distPerFrame;
    while (note.lastTrailEmit >= 6) {
      note.lastTrailEmit -= 6;
      const tp = Math.max(0, note.progress - 0.02);
      const trailPoint = note.pathManager.getPointAt(tp);
      const color = note.pathManager.getColorAt(tp);
      particleSystem.spawnTrailParticle({ x: trailPoint.x, y: trailPoint.y, color });
    }

    if (note.progress >= 1) {
      note.progress = 1;
      triggerExplosion(note, false);
      flyingNotes.splice(i, 1);
    }
  }
}

function lerpColor(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t),
  };
}

function drawBackground(): void {
  const w = window.innerWidth;
  const h = window.innerHeight;

  const top = { r: 10, g: 22, b: 40 };
  const bottom = { r: 5, g: 10, b: 20 };
  const topTint = lerpColor(top, { r: bgTint.r, g: bgTint.g, b: bgTint.b }, 1);
  const botTint = lerpColor(bottom, { r: bgTint.r, g: bgTint.g, b: bgTint.b }, 1);

  const grd = ctx.createLinearGradient(0, 0, 0, h);
  grd.addColorStop(0, `rgb(${topTint.r},${topTint.g},${topTint.b})`);
  grd.addColorStop(1, `rgb(${botTint.r},${botTint.g},${botTint.b})`);
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, w, h);

  const dpr = window.devicePixelRatio || 1;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.drawImage(noiseCanvas, 0, 0);
  ctx.restore();
  void dpr;
}

function drawCurrentPath(): void {
  const pts = currentPath.points;
  if (pts.length < 2) {
    if (pts.length === 1) {
      const p = pts[0];
      ctx.beginPath();
      const { h, s, l } = parseHslColor(currentPath.getColorAt(0));
      const rgb = hslToRgbObj(h, s, l);
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 12);
      grd.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},0.9)`);
      grd.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
      ctx.fillStyle = grd;
      ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
      ctx.fill();
    }
    return;
  }

  const segments = pts.length - 1;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 0; i < segments; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const t0 = i / segments;
    const t1 = (i + 1) / segments;
    const speed = (p0.speed + p1.speed) * 0.5;
    const widthT = Math.min(1, speed / 800);
    const width = 1 + widthT * 7;

    const { h: h0, s: s0, l: l0 } = parseHslColor(currentPath.getColorAt(t0));
    const { h: h1, s: s1, l: l1 } = parseHslColor(currentPath.getColorAt(t1));
    const rgb0 = hslToRgbObj(h0, s0, l0);
    const rgb1 = hslToRgbObj(h1, s1, l1);

    const grd = ctx.createLinearGradient(p0.x, p0.y, p1.x, p1.y);
    grd.addColorStop(0, `rgba(${rgb0.r},${rgb0.g},${rgb0.b},0.95)`);
    grd.addColorStop(1, `rgba(${rgb1.r},${rgb1.g},${rgb1.b},0.95)`);

    ctx.strokeStyle = grd;
    ctx.lineWidth = width + 4;
    ctx.globalAlpha = 0.25;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();

    ctx.lineWidth = width;
    ctx.globalAlpha = 1;
    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.lineTo(p1.x, p1.y);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawFlyingNotes(): void {
  const fadeMul = fadingAll ? Math.max(0, 1 - fadeProgress) : 1;

  for (const note of flyingNotes) {
    const pos = note.pathManager.getPointAt(note.progress);
    const { h, s, l } = parseHslColor(note.color);
    const rgb = hslToRgbObj(h, s, l);

    const trailStartT = Math.max(0, note.progress - (TRAIL_LENGTH_PX / Math.max(1, note.totalLength)));
    const steps = 12;
    for (let i = steps; i >= 1; i--) {
      const t = trailStartT + (note.progress - trailStartT) * (i / steps);
      const tp = note.pathManager.getPointAt(t);
      const alpha = (1 - i / steps) * 0.5 * fadeMul;
      ctx.beginPath();
      const r = 2 + (i / steps) * 4;
      const grd = ctx.createRadialGradient(tp.x, tp.y, 0, tp.x, tp.y, r * 2);
      grd.addColorStop(0, `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha})`);
      grd.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
      ctx.fillStyle = grd;
      ctx.arc(tp.x, tp.y, r * 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    const glowGrd = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, NOTE_RADIUS * 3.5);
    glowGrd.addColorStop(0, `rgba(255,255,255,${0.85 * fadeMul})`);
    glowGrd.addColorStop(0.3, `rgba(${rgb.r},${rgb.g},${rgb.b},${0.9 * fadeMul})`);
    glowGrd.addColorStop(1, `rgba(${rgb.r},${rgb.g},${rgb.b},0)`);
    ctx.fillStyle = glowGrd;
    ctx.arc(pos.x, pos.y, NOTE_RADIUS * 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    ctx.beginPath();
    ctx.fillStyle = `rgba(255,255,255,${fadeMul})`;
    ctx.arc(pos.x, pos.y, NOTE_RADIUS * 0.55, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawNotePathsGhost(): void {
  const fadeMul = fadingAll ? Math.max(0, 1 - fadeProgress) : 1;
  if (fadeMul <= 0) return;

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const note of flyingNotes) {
    const pts = note.pathManager.points;
    if (pts.length < 2) continue;
    const { h, s, l } = parseHslColor(note.color);
    const rgb = hslToRgbObj(h, s, Math.min(80, l + 8));
    ctx.strokeStyle = `rgba(${rgb.r},${rgb.g},${rgb.b},${0.12 * fadeMul})`;
    ctx.lineWidth = 1.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

function drawCrosshair(): void {
  if (!mouseInCanvas || fadingAll) return;
  const size = 24;
  const half = size / 2;
  const c = '#88CCFF';

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const glow = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, size * 1.1);
  glow.addColorStop(0, 'rgba(136,204,255,0.25)');
  glow.addColorStop(1, 'rgba(136,204,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(mouseX, mouseY, size * 1.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.strokeStyle = c;
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(mouseX - half, mouseY);
  ctx.lineTo(mouseX - 5, mouseY);
  ctx.moveTo(mouseX + 5, mouseY);
  ctx.lineTo(mouseX + half, mouseY);
  ctx.moveTo(mouseX, mouseY - half);
  ctx.lineTo(mouseX, mouseY - 5);
  ctx.moveTo(mouseX, mouseY + 5);
  ctx.lineTo(mouseX, mouseY + half);
  ctx.stroke();

  ctx.beginPath();
  ctx.fillStyle = c;
  ctx.arc(mouseX, mouseY, 3, 0, Math.PI * 2);
  ctx.fill();
}

function renderLoop(): void {
  const now = performance.now();
  let dt = (now - lastFrameTime) / 1000;
  if (dt > 0.1) dt = 0.1;
  lastFrameTime = now;

  if (fadingAll) {
    fadeProgress += dt / 0.4;
    if (fadeProgress > 1) fadeProgress = 1;
  }

  updateBackgroundTint(dt);
  updateFlyingNotes(dt);
  particleSystem.update(dt);

  drawBackground();
  drawNotePathsGhost();

  const fadeMul = fadingAll ? Math.max(0, 1 - fadeProgress) : 1;
  ctx.save();
  ctx.globalAlpha = fadeMul;
  drawCurrentPath();
  ctx.restore();

  drawFlyingNotes();
  particleSystem.render();
  drawCrosshair();

  requestAnimationFrame(renderLoop);
}

function init(): void {
  resizeCanvas();
  particleSystem = new ParticleSystem(canvas, ctx);

  window.addEventListener('resize', resizeCanvas);
  canvas.addEventListener('mousedown', onMouseDown);
  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('mouseenter', onMouseEnter);
  canvas.addEventListener('mouseleave', onMouseLeave);
  window.addEventListener('keydown', onKeyDown);

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  lastFrameTime = performance.now();
  requestAnimationFrame(renderLoop);
}

init();
