import {
  BrushStroke,
  createStroke,
  addPointToStroke,
  drawBrushStroke,
  getStrokeAverageOpacity,
  getStrokeDirection
} from './brush';

import {
  Petal,
  Mountain,
  BrushFeatures,
  generatePetal,
  generateMountain,
  updatePetal,
  updateMountain,
  drawPetal,
  drawMountain
} from './decorations';

import {
  Seal,
  placeSeal,
  updateSeal,
  drawSeal
} from './seal';

const SCROLL_SPEED = 20;
const DECORATION_INTERVAL = 3000;
const SPEED_WINDOW_MS = 10000;
const MAX_ELEMENTS = 150;
const MERGE_OPACITY_THRESHOLD = 0.05;
const PAUSE_DURATION = 1000;

interface SpeedSample {
  speed: number;
  time: number;
}

interface GlobalState {
  scrollOffset: number;
  isPaused: boolean;
  pauseUntil: number;
  recentSpeeds: SpeedSample[];
  brushStrokes: BrushStroke[];
  petals: Petal[];
  mountains: Mountain[];
  seals: Seal[];
  currentStroke: BrushStroke | null;
  lastMousePos: { worldX: number; y: number } | null;
  lastMouseTime: number;
  lastDecorationTime: number;
  lastSpeedSampleTime: number;
  currentRealmName: string;
}

const state: GlobalState = {
  scrollOffset: 0,
  isPaused: false,
  pauseUntil: 0,
  recentSpeeds: [],
  brushStrokes: [],
  petals: [],
  mountains: [],
  seals: [],
  currentStroke: null,
  lastMousePos: null,
  lastMouseTime: 0,
  lastDecorationTime: 0,
  lastSpeedSampleTime: 0,
  currentRealmName: '远岫之境'
};

const app = {
  canvas: null as HTMLCanvasElement | null,
  ctx: null as CanvasRenderingContext2D | null,
  width: 0,
  height: 0,
  dpr: 1,
  titleText: null as HTMLSpanElement | null,
  lastFrameTime: 0,
  paperPattern: null as CanvasPattern | null
};

function createPaperTexture(ctx: CanvasRenderingContext2D): CanvasPattern | null {
  const size = 256;
  const off = document.createElement('canvas');
  off.width = size;
  off.height = size;
  const octx = off.getContext('2d');
  if (!octx) return null;

  octx.fillStyle = '#f7f1e3';
  octx.fillRect(0, 0, size, size);

  const img = octx.createImageData(size, size);
  for (let i = 0; i < img.data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 14;
    const fiber = Math.random() < 0.012 ? (Math.random() - 0.5) * 35 : 0;
    const v = 247 + noise + fiber;
    img.data[i] = Math.min(255, Math.max(0, v - 4));
    img.data[i + 1] = Math.min(255, Math.max(0, v - 1));
    img.data[i + 2] = Math.min(255, Math.max(0, v + 4));
    img.data[i + 3] = 80 + Math.floor(Math.random() * 40);
  }
  octx.putImageData(img, 0, 0);

  octx.globalAlpha = 0.06;
  for (let i = 0; i < 40; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const len = 20 + Math.random() * 60;
    const angle = Math.random() * Math.PI;
    octx.strokeStyle = `hsl(40, ${20 + Math.random() * 20}%, ${55 + Math.random() * 15}%)`;
    octx.lineWidth = 0.4 + Math.random() * 0.8;
    octx.beginPath();
    octx.moveTo(x, y);
    octx.lineTo(x + Math.cos(angle) * len, y + Math.sin(angle) * len);
    octx.stroke();
  }

  return ctx.createPattern(off, 'repeat');
}

function initCanvas(): void {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  if (!canvas) throw new Error('Canvas element not found');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2D context not available');

  app.canvas = canvas;
  app.ctx = ctx;
  app.titleText = document.getElementById('titletext') as HTMLSpanElement;

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  app.paperPattern = createPaperTexture(ctx);
}

function resizeCanvas(): void {
  if (!app.canvas || !app.ctx) return;
  const canvas = app.canvas;
  const container = canvas.parentElement;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  app.dpr = dpr;
  app.width = rect.width;
  app.height = rect.height;

  canvas.width = Math.floor(rect.width * dpr);
  canvas.height = Math.floor(rect.height * dpr);
  canvas.style.width = rect.width + 'px';
  canvas.style.height = rect.height + 'px';

  app.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  app.paperPattern = createPaperTexture(app.ctx);
}

function screenToWorld(screenX: number): number {
  return screenX + state.scrollOffset;
}

function getPointerPos(e: MouseEvent | TouchEvent): { screenX: number; y: number } {
  if ('touches' in e) {
    const t = e.touches[0] || e.changedTouches[0];
    return { screenX: t.clientX, y: t.clientY };
  }
  return { screenX: (e as MouseEvent).clientX, y: (e as MouseEvent).clientY };
}

function toCanvasCoords(screenX: number, screenY: number): { x: number; y: number } {
  if (!app.canvas) return { x: 0, y: 0 };
  const rect = app.canvas.getBoundingClientRect();
  return {
    x: screenX - rect.left,
    y: screenY - rect.top
  };
}

function handlePointerDown(e: MouseEvent | TouchEvent): void {
  const pos = getPointerPos(e);
  const coords = toCanvasCoords(pos.screenX, pos.y);
  const worldX = screenToWorld(coords.x);

  state.currentStroke = createStroke();
  addPointToStroke(state.currentStroke, worldX, coords.y, 0);
  state.brushStrokes.push(state.currentStroke);

  state.lastMousePos = { worldX, y: coords.y };
  state.lastMouseTime = performance.now();
  e.preventDefault();
}

function handlePointerMove(e: MouseEvent | TouchEvent): void {
  if (!state.currentStroke) return;

  const pos = getPointerPos(e);
  const coords = toCanvasCoords(pos.screenX, pos.y);
  const worldX = screenToWorld(coords.x);
  const now = performance.now();

  let speed = 0;
  if (state.lastMousePos) {
    const dt = (now - state.lastMouseTime) / 1000;
    if (dt > 0) {
      const dx = worldX - state.lastMousePos.worldX;
      const dy = coords.y - state.lastMousePos.y;
      speed = Math.hypot(dx, dy) / dt;
    }
  }

  addPointToStroke(state.currentStroke, worldX, coords.y, speed, now);

  if (now - state.lastSpeedSampleTime > 100 && state.lastMousePos) {
    const dt = (now - state.lastMouseTime) / 1000;
    if (dt > 0) {
      const dx = worldX - state.lastMousePos.worldX;
      const dy = coords.y - state.lastMousePos.y;
      const sampleSpeed = Math.hypot(dx, dy) / dt;
      state.recentSpeeds.push({ speed: sampleSpeed, time: now });
      state.lastSpeedSampleTime = now;
    }
  }

  state.lastMousePos = { worldX, y: coords.y };
  state.lastMouseTime = now;
  e.preventDefault();
}

function handlePointerUp(): void {
  state.currentStroke = null;
  state.lastMousePos = null;
}

function handleSealClick(ev: MouseEvent): void {
  if (!app.canvas) return;
  const btn = ev.currentTarget as HTMLElement;
  const btnRect = btn.getBoundingClientRect();
  const canvasRect = app.canvas.getBoundingClientRect();
  const sx = btnRect.left + btnRect.width / 2 - canvasRect.left;
  const sy = btnRect.top + btnRect.height / 2 - canvasRect.top;
  const worldX = screenToWorld(sx);

  const now = performance.now();
  state.isPaused = true;
  state.pauseUntil = now + PAUSE_DURATION;
  state.seals.push(placeSeal(worldX, sy));
}

function computeBrushFeatures(): BrushFeatures {
  const recent = state.brushStrokes.slice(-5);
  if (recent.length === 0) {
    return { avgDirection: 0, avgOpacity: 0.5 };
  }
  let totalDir = 0;
  let totalOp = 0;
  for (const s of recent) {
    totalDir += getStrokeDirection(s);
    totalOp += getStrokeAverageOpacity(s);
  }
  return {
    avgDirection: totalDir / recent.length,
    avgOpacity: totalOp / recent.length
  };
}

function computeRealmName(): string {
  const now = performance.now();
  const cutoff = now - SPEED_WINDOW_MS;
  state.recentSpeeds = state.recentSpeeds.filter((s) => s.time > cutoff);
  if (state.recentSpeeds.length === 0) return state.currentRealmName;

  let total = 0;
  for (const s of state.recentSpeeds) total += s.speed;
  const avg = total / state.recentSpeeds.length;

  if (avg < 70) return '沉幽之境';
  if (avg > 130) return '空灵之境';
  return '远岫之境';
}

function updateTitle(): void {
  const realm = computeRealmName();
  if (realm !== state.currentRealmName && app.titleText) {
    state.currentRealmName = realm;
    app.titleText.textContent = realm;
    app.titleText.style.animation = 'none';
    void app.titleText.offsetWidth;
    app.titleText.style.animation = '';
  }
}

function updateDecorations(now: number): void {
  if (now - state.lastDecorationTime >= DECORATION_INTERVAL) {
    const features = computeBrushFeatures();
    state.petals.push(
      generatePetal(state.scrollOffset, app.width, app.height, features)
    );
    state.mountains.push(
      generateMountain(state.scrollOffset, app.width, app.height, features)
    );
    state.lastDecorationTime = now;
  }
}

function cleanupOffscreen(): void {
  const leftBound = state.scrollOffset - 200;

  state.brushStrokes = state.brushStrokes.filter((stroke) => {
    if (stroke.points.length === 0) return false;
    const maxX = stroke.points.reduce((m, p) => Math.max(m, p.x), 0);
    return maxX >= leftBound;
  });

  state.petals = state.petals.filter((p) => {
    const inView = p.x >= leftBound;
    const notFallen = p.y < app.height + 50;
    return inView && notFallen;
  });

  state.mountains = state.mountains.filter((m) => m.x + m.width >= leftBound);
}

function mergeOldStrokes(): void {
  const totalCount =
    state.brushStrokes.length + state.petals.length + state.mountains.length + state.seals.length;
  if (totalCount <= MAX_ELEMENTS) return;

  state.brushStrokes.sort((a, b) => a.createdAt - b.createdAt);
  const toRemove: number[] = [];
  for (let i = 0; i < state.brushStrokes.length; i++) {
    const op = getStrokeAverageOpacity(state.brushStrokes[i]);
    if (op < MERGE_OPACITY_THRESHOLD) {
      toRemove.push(i);
      if (
        state.brushStrokes.length +
          state.petals.length +
          state.mountains.length +
          state.seals.length -
          toRemove.length <=
        MAX_ELEMENTS
      ) {
        break;
      }
    }
  }
  for (let i = toRemove.length - 1; i >= 0; i--) {
    state.brushStrokes.splice(toRemove[i], 1);
  }
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
  if (app.paperPattern) {
    ctx.save();
    ctx.fillStyle = app.paperPattern;
    ctx.fillRect(0, 0, app.width, app.height);
    ctx.restore();
  } else {
    ctx.fillStyle = '#f7f1e3';
    ctx.fillRect(0, 0, app.width, app.height);
  }

  const margin = 8;
  ctx.save();
  ctx.strokeStyle = 'hsla(40, 25%, 65%, 0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(margin, margin, app.width - margin * 2, app.height - margin * 2);
  ctx.restore();
}

function render(_now: number): void {
  if (!app.ctx) return;
  const ctx = app.ctx;
  ctx.clearRect(0, 0, app.width, app.height);
  drawBackground(ctx);

  for (const mountain of state.mountains) {
    drawMountain(ctx, mountain, state.scrollOffset, app.height);
  }

  for (const stroke of state.brushStrokes) {
    drawBrushStroke(ctx, stroke, state.scrollOffset, app.height);
  }

  for (const petal of state.petals) {
    drawPetal(ctx, petal, state.scrollOffset);
  }

  for (const seal of state.seals) {
    drawSeal(ctx, seal, state.scrollOffset);
  }
}

function step(timestamp: number): void {
  if (app.lastFrameTime === 0) app.lastFrameTime = timestamp;
  const dt = Math.min(0.05, (timestamp - app.lastFrameTime) / 1000);
  app.lastFrameTime = timestamp;

  const now = timestamp;

  if (state.isPaused && now >= state.pauseUntil) {
    state.isPaused = false;
  }

  if (!state.isPaused) {
    state.scrollOffset += SCROLL_SPEED * dt;
    for (const petal of state.petals) updatePetal(petal, dt);
    for (const mountain of state.mountains) updateMountain(mountain, dt);
  }

  for (const seal of state.seals) updateSeal(seal, now);

  updateDecorations(now);
  cleanupOffscreen();
  mergeOldStrokes();
  updateTitle();
  render(now);

  requestAnimationFrame(step);
}

function bindEvents(): void {
  if (!app.canvas) return;
  const canvas = app.canvas;

  canvas.addEventListener('mousedown', handlePointerDown);
  canvas.addEventListener('mousemove', handlePointerMove);
  window.addEventListener('mouseup', handlePointerUp);
  canvas.addEventListener('mouseleave', handlePointerUp);

  canvas.addEventListener('touchstart', handlePointerDown, { passive: false });
  canvas.addEventListener('touchmove', handlePointerMove, { passive: false });
  canvas.addEventListener('touchend', handlePointerUp);
  canvas.addEventListener('touchcancel', handlePointerUp);

  const sealBtn = document.getElementById('seal-btn');
  if (sealBtn) {
    sealBtn.addEventListener('click', handleSealClick);
  }
}

function boot(): void {
  initCanvas();
  bindEvents();
  requestAnimationFrame(step);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
