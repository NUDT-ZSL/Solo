import {
  PixelChar,
  Particle,
  PIXEL_SIZE_CONST,
  PIXEL_GAP_CONST,
  GRID_COLS_CONST,
  GRID_ROWS_CONST,
} from './pixelEngine';

export interface InteractionState {
  pixelChars: PixelChar[];
  particles: Particle[];
  draggingIndex: number;
  dragOffsetX: number;
  dragOffsetY: number;
  currentColor: string;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  bgCanvas: HTMLCanvasElement;
  bgCtx: CanvasRenderingContext2D;
  lastFrameTime: number;
  dirtyRegion: { x: number; y: number; w: number; h: number } | null;
  charAppearProgress: Map<number, number>;
  appearStartTime: number;
  lastMoveX: number;
  lastMoveY: number;
}

const GLOW_DURATION = 1200;
const PULSE_DURATION = 300;
const PARTICLE_COUNT = 30;
const PARTICLE_LIFE = 800;
const PARTICLE_BASE_SPEED = 60;
const GRAVITY = 80;
const APPEAR_STAGGER = 80;
const APPEAR_DURATION = 400;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function parseColor(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  return [
    parseInt(h.substring(0, 2), 16),
    parseInt(h.substring(2, 4), 16),
    parseInt(h.substring(4, 6), 16),
  ];
}

function rgbToStr(rgb: [number, number, number], alpha: number = 1): string {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
}

function shiftColor(hex: string, hueShift: number, satBoost: number = 0, lightBoost: number = 0): string {
  const [r, g, b] = parseColor(hex);
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2 / 255;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (510 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  h = (h + hueShift / 360 + 1) % 1;
  s = Math.min(1, Math.max(0, s + satBoost));
  l = Math.min(1, Math.max(0, l + lightBoost));
  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };
  let r2, g2, b2;
  if (s === 0) {
    r2 = g2 = b2 = l;
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r2 = hue2rgb(p, q, h + 1 / 3);
    g2 = hue2rgb(p, q, h);
    b2 = hue2rgb(p, q, h - 1 / 3);
  }
  return `#${Math.round(r2 * 255).toString(16).padStart(2, '0')}${Math.round(g2 * 255).toString(16).padStart(2, '0')}${Math.round(b2 * 255).toString(16).padStart(2, '0')}`;
}

export function initInteraction(
  canvas: HTMLCanvasElement,
  pixelChars: PixelChar[],
  currentColor: string
): InteractionState {
  const ctx = canvas.getContext('2d')!;
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = canvas.width;
  bgCanvas.height = canvas.height;
  const bgCtx = bgCanvas.getContext('2d')!;
  renderBackground(bgCtx, bgCanvas.width, bgCanvas.height);

  const state: InteractionState = {
    pixelChars,
    particles: [],
    draggingIndex: -1,
    dragOffsetX: 0,
    dragOffsetY: 0,
    currentColor,
    canvas,
    ctx,
    bgCanvas,
    bgCtx,
    lastFrameTime: performance.now(),
    dirtyRegion: { x: 0, y: 0, w: canvas.width, h: canvas.height },
    charAppearProgress: new Map(),
    appearStartTime: 0,
    lastMoveX: -1,
    lastMoveY: -1,
  };

  bindEvents(state);
  return state;
}

export function renderBackground(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  gridColor: string = '#D0D5DD',
  gridSize: number = 5
): void {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#E8EDF2');
  grad.addColorStop(1, '#F5F7FA');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = gridColor;
  ctx.lineWidth = 0.5;
  ctx.beginPath();
  for (let x = 0; x <= w; x += gridSize) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, h);
  }
  for (let y = 0; y <= h; y += gridSize) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(w, y + 0.5);
  }
  ctx.stroke();
}

export function setCharsAppear(state: InteractionState): void {
  state.charAppearProgress.clear();
  state.appearStartTime = performance.now();
  state.pixelChars.forEach((_, i) => {
    state.charAppearProgress.set(i, -1);
  });
  markDirty(state, 0, 0, state.canvas.width, state.canvas.height);
}

function getCanvasCoords(state: InteractionState, e: MouseEvent): { x: number; y: number } {
  const rect = state.canvas.getBoundingClientRect();
  const scaleX = state.canvas.width / rect.width;
  const scaleY = state.canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

function hitTestChar(state: InteractionState, x: number, y: number): number {
  for (let i = state.pixelChars.length - 1; i >= 0; i--) {
    const pc = state.pixelChars[i];
    if (x >= pc.x && x <= pc.x + pc.charWidth &&
        y >= pc.y && y <= pc.y + pc.charHeight) {
      return i;
    }
  }
  return -1;
}

function bindEvents(state: InteractionState): void {
  const { canvas } = state;

  canvas.addEventListener('mousedown', (e: MouseEvent) => {
    const { x, y } = getCanvasCoords(state, e);
    const idx = hitTestChar(state, x, y);
    if (idx >= 0) {
      state.draggingIndex = idx;
      const pc = state.pixelChars[idx];
      state.dragOffsetX = x - pc.x;
      state.dragOffsetY = y - pc.y;
      pc.glowStartTime = performance.now();
      markDirty(state, pc.x - 30, pc.y - 30, pc.charWidth + 60, pc.charHeight + 60);
    }
  });

  window.addEventListener('mousemove', (e: MouseEvent) => {
    if (state.draggingIndex < 0) return;
    const { x, y } = getCanvasCoords(state, e);
    const pc = state.pixelChars[state.draggingIndex];
    const oldX = pc.x;
    const oldY = pc.y;
    pc.x = x - state.dragOffsetX;
    pc.y = y - state.dragOffsetY;
    const pad = 50;
    const minX = Math.min(oldX, pc.x) - pad;
    const minY = Math.min(oldY, pc.y) - pad;
    const maxX = Math.max(oldX + pc.charWidth, pc.x + pc.charWidth) + pad;
    const maxY = Math.max(oldY + pc.charHeight, pc.y + pc.charHeight) + pad;
    markDirty(state, minX, minY, maxX - minX, maxY - minY);
    pc.glowStartTime = performance.now();
  });

  window.addEventListener('mouseup', () => {
    if (state.draggingIndex >= 0) {
      const pc = state.pixelChars[state.draggingIndex];
      pc.glowStartTime = performance.now();
      markDirty(state, pc.x - 40, pc.y - 40, pc.charWidth + 80, pc.charHeight + 80);
    }
    state.draggingIndex = -1;
  });

  canvas.addEventListener('dblclick', (e: MouseEvent) => {
    const { x, y } = getCanvasCoords(state, e);
    const idx = hitTestChar(state, x, y);
    if (idx >= 0) {
      const pc = state.pixelChars[idx];
      pc.pulseStartTime = performance.now();
      explodeIntoParticles(state, pc);
      markDirty(state, pc.x - 150, pc.y - 150, pc.charWidth + 300, pc.charHeight + 300);
    }
  });
}

function markDirty(
  state: InteractionState,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const cw = state.canvas.width;
  const ch = state.canvas.height;
  const rx = Math.max(0, Math.floor(x));
  const ry = Math.max(0, Math.floor(y));
  const rw = Math.min(cw - rx, Math.ceil(w));
  const rh = Math.min(ch - ry, Math.ceil(h));
  if (rw <= 0 || rh <= 0) return;

  if (!state.dirtyRegion) {
    state.dirtyRegion = { x: rx, y: ry, w: rw, h: rh };
  } else {
    const d = state.dirtyRegion;
    const rx2 = d.x + d.w;
    const ry2 = d.y + d.h;
    const nrx2 = rx + rw;
    const nry2 = ry + rh;
    d.x = Math.min(d.x, rx);
    d.y = Math.min(d.y, ry);
    d.w = Math.max(rx2, nrx2) - d.x;
    d.h = Math.max(ry2, nry2) - d.y;
  }
}

function explodeIntoParticles(state: InteractionState, pc: PixelChar): void {
  const now = performance.now();
  const cx = pc.x + pc.charWidth / 2;
  const cy = pc.y + pc.charHeight / 2;
  const baseColor = pc.color;

  const pixelPositions: Array<{ x: number; y: number }> = [];
  const scale = pc.pixelScale || PIXEL_SIZE_CONST;
  for (let r = 0; r < GRID_ROWS_CONST; r++) {
    for (let c = 0; c < GRID_COLS_CONST; c++) {
      if (pc.pixelMap[r * GRID_COLS_CONST + c]) {
        pixelPositions.push({
          x: pc.x + c * (scale + PIXEL_GAP_CONST) + scale / 2,
          y: pc.y + r * (scale + PIXEL_GAP_CONST) + scale / 2,
        });
      }
    }
  }
  if (pixelPositions.length === 0) {
    pixelPositions.push({ x: cx, y: cy });
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const pos = pixelPositions[i % pixelPositions.length];
    const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.8;
    const speedVar = 0.5 + Math.random() * 1.3;
    const speed = PARTICLE_BASE_SPEED * speedVar;
    const shapes: Array<'circle' | 'square' | 'triangle'> = ['circle', 'square', 'triangle'];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const hueShift = (Math.random() - 0.5) * 140;
    const satBoost = Math.random() * 0.35;
    const lightBoost = (Math.random() - 0.3) * 0.2;

    state.particles.push({
      x: pos.x + (Math.random() - 0.5) * 8,
      y: pos.y + (Math.random() - 0.5) * 8,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 25,
      size: 3 + Math.random() * 5,
      color: shiftColor(baseColor, hueShift, satBoost, lightBoost),
      life: now,
      maxLife: PARTICLE_LIFE * (0.55 + Math.random() * 0.65),
      shape,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 12,
    });
  }
  markDirty(state, cx - 200, cy - 200, 400, 400);
}

export function renderFrame(state: InteractionState, forceFull: boolean = false): void {
  const now = performance.now();
  const dt = Math.min(0.05, (now - state.lastFrameTime) / 1000);
  state.lastFrameTime = now;

  const { ctx, canvas, bgCanvas } = state;

  const hasParticles = state.particles.length > 0;
  const hasAppearing = state.charAppearProgress.size > 0;
  const hasGlowing = state.pixelChars.some(pc => now - pc.glowStartTime < GLOW_DURATION);
  const hasPulsing = state.pixelChars.some(pc => now - pc.pulseStartTime < PULSE_DURATION);
  const isDragging = state.draggingIndex >= 0;

  let dirty = forceFull || hasParticles || hasAppearing || hasGlowing || hasPulsing || isDragging
    ? { x: 0, y: 0, w: canvas.width, h: canvas.height }
    : state.dirtyRegion;

  if (!dirty) return;

  const dr = dirty;
  state.dirtyRegion = null;

  ctx.save();
  ctx.beginPath();
  ctx.rect(dr.x, dr.y, dr.w, dr.h);
  ctx.clip();

  ctx.drawImage(bgCanvas, 0, 0);

  if (hasAppearing) {
    updateAppearProgress(state, now);
  }

  for (let i = 0; i < state.pixelChars.length; i++) {
    const pc = state.pixelChars[i];
    renderPixelChar(state, pc, now, i);
  }

  if (hasParticles) {
    updateAndRenderParticles(state, now, dt);
  }

  ctx.restore();
}

function updateAppearProgress(state: InteractionState, now: number): void {
  const elapsed = now - state.appearStartTime;
  let stillAnimating = false;

  state.charAppearProgress.forEach((_, idx) => {
    const startOffset = idx * APPEAR_STAGGER;
    const localElapsed = elapsed - startOffset;
    if (localElapsed < 0) {
      state.charAppearProgress.set(idx, -1);
      stillAnimating = true;
    } else if (localElapsed < APPEAR_DURATION) {
      const t = Math.min(1, localElapsed / APPEAR_DURATION);
      state.charAppearProgress.set(idx, easeOutCubic(t));
      stillAnimating = true;
    } else {
      state.charAppearProgress.set(idx, 1);
    }
  });

  if (!stillAnimating) {
    setTimeout(() => {
      state.charAppearProgress.clear();
    }, 50);
  }
}

function renderPixelChar(
  state: InteractionState,
  pc: PixelChar,
  now: number,
  index: number
): void {
  const { ctx } = state;

  let appearT = state.charAppearProgress.get(index);
  if (appearT === undefined) appearT = 1;
  if (appearT === -1 || appearT < 0) return;

  const pulseElapsed = now - pc.pulseStartTime;
  let scale = 1;
  if (pulseElapsed >= 0 && pulseElapsed < PULSE_DURATION) {
    const t = pulseElapsed / PULSE_DURATION;
    const s = Math.sin(t * Math.PI);
    scale = 1 + s * 0.1;
  }

  const glowElapsed = now - pc.glowStartTime;
  let glowAlpha = 0;
  if (glowElapsed >= 0 && glowElapsed < GLOW_DURATION) {
    glowAlpha = 1 - glowElapsed / GLOW_DURATION;
  }
  if (state.draggingIndex === index) {
    glowAlpha = Math.max(glowAlpha, 1);
  }

  const cx = pc.x + pc.charWidth / 2;
  const cy = pc.y + pc.charHeight / 2;
  const renderW = pc.charWidth * scale;
  const renderH = pc.charHeight * scale;
  const offsetX = cx - renderW / 2;
  const appearOffset = (1 - appearT) * 140;
  const offsetY = cy - renderH / 2 + appearOffset;

  ctx.save();
  ctx.globalAlpha = appearT;

  if (glowAlpha > 0) {
    const glowRadius = Math.max(renderW, renderH) * 0.85;
    const gradient = ctx.createRadialGradient(
      cx, cy + appearOffset, 0,
      cx, cy + appearOffset, glowRadius
    );
    gradient.addColorStop(0, `rgba(74,111,165,${0.35 * glowAlpha})`);
    gradient.addColorStop(0.6, `rgba(74,111,165,${0.15 * glowAlpha})`);
    gradient.addColorStop(1, 'rgba(74,111,165,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy + appearOffset, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(74,111,165,${0.55 * glowAlpha})`;
    ctx.lineWidth = 2 + glowAlpha * 2;
    ctx.beginPath();
    drawRoundRect(ctx, offsetX - 8, offsetY - 8, renderW + 16, renderH + 16, 10);
    ctx.stroke();
  }

  if (pc.offscreenCanvas) {
    if (scale !== 1 || appearOffset !== 0) {
      ctx.drawImage(pc.offscreenCanvas, offsetX, offsetY, renderW, renderH);
    } else {
      ctx.drawImage(pc.offscreenCanvas, pc.x, pc.y);
    }
  } else {
    ctx.fillStyle = pc.color;
    const pxs = (pc.pixelScale || PIXEL_SIZE_CONST) * scale;
    const pg = PIXEL_GAP_CONST * scale;
    for (let r = 0; r < GRID_ROWS_CONST; r++) {
      for (let c = 0; c < GRID_COLS_CONST; c++) {
        if (pc.pixelMap[r * GRID_COLS_CONST + c]) {
          const x = offsetX + c * (pxs + pg);
          const y = offsetY + r * (pxs + pg);
          ctx.fillRect(x, y, pxs, pxs);
        }
      }
    }
  }

  ctx.restore();
}

function drawRoundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
}

function updateAndRenderParticles(
  state: InteractionState,
  now: number,
  dt: number
): void {
  const { ctx } = state;
  const survivors: Particle[] = [];

  for (const p of state.particles) {
    const elapsed = now - p.life;
    if (elapsed >= p.maxLife) continue;

    p.vy += GRAVITY * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.rotation += p.rotationSpeed * dt;

    const lifeT = 1 - elapsed / p.maxLife;
    const alpha = easeInOutQuad(Math.max(0, lifeT));

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x, p.y);
    ctx.rotate(p.rotation);
    ctx.fillStyle = p.color;

    const s = p.size * (0.5 + lifeT * 0.5);
    if (p.shape === 'circle') {
      ctx.beginPath();
      ctx.arc(0, 0, s / 2, 0, Math.PI * 2);
      ctx.fill();
    } else if (p.shape === 'square') {
      ctx.fillRect(-s / 2, -s / 2, s, s);
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -s / 2);
      ctx.lineTo(s / 2, s / 2);
      ctx.lineTo(-s / 2, s / 2);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();

    survivors.push(p);
  }

  state.particles = survivors;
}

export function exportCanvas(
  state: InteractionState,
  callback: (blob: Blob | null) => void
): void {
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = state.canvas.width;
  exportCanvas.height = state.canvas.height;
  const eCtx = exportCanvas.getContext('2d')!;
  renderBackground(eCtx, exportCanvas.width, exportCanvas.height, '#D0D5DD', 5);

  for (const pc of state.pixelChars) {
    if (pc.offscreenCanvas) {
      eCtx.drawImage(pc.offscreenCanvas, pc.x, pc.y);
    }
  }

  exportCanvas.toBlob(callback, 'image/png', 1.0);
}

export function updateGlobalColor(
  state: InteractionState,
  newColor: string,
  reRenderChar: (pc: PixelChar, color: string) => void
): void {
  state.currentColor = newColor;
  for (const pc of state.pixelChars) {
    reRenderChar(pc, newColor);
    markDirty(state, pc.x - 10, pc.y - 10, pc.charWidth + 20, pc.charHeight + 20);
  }
}
