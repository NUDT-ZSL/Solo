import {
  PixelChar,
  Particle,
  CHAR_CELL_W,
  CHAR_CELL_H,
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
  animFrameId: number;
  lastFrameTime: number;
  dirtyRegion: { x: number; y: number; w: number; h: number } | null;
  charAppearProgress: Map<number, number>;
  appearStartTime: number;
  onExport?: () => void;
}

const GLOW_DURATION = 1200;
const PULSE_DURATION = 300;
const PARTICLE_COUNT = 30;
const PARTICLE_LIFE = 800;
const PARTICLE_BASE_SPEED = 60;
const GRAVITY = 80;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

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

function shiftColor(hex: string, hueShift: number, satBoost: number = 0): string {
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
  h = (h + hueShift / 360) % 1;
  s = Math.min(1, s + satBoost);
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
    animFrameId: 0,
    lastFrameTime: performance.now(),
    dirtyRegion: null,
    charAppearProgress: new Map(),
    appearStartTime: 0,
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
}

function bindEvents(state: InteractionState): void {
  const { canvas } = state;

  canvas.addEventListener('mousedown', (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    for (let i = state.pixelChars.length - 1; i >= 0; i--) {
      const pc = state.pixelChars[i];
      if (x >= pc.x && x <= pc.x + pc.charWidth &&
          y >= pc.y && y <= pc.y + pc.charHeight) {
        state.draggingIndex = i;
        state.dragOffsetX = x - pc.x;
        state.dragOffsetY = y - pc.y;
        pc.glowStartTime = performance.now();
        pc.baseX = pc.x;
        pc.baseY = pc.y;
        markDirty(state, pc.x - 20, pc.y - 20, pc.charWidth + 40, pc.charHeight + 40);
        break;
      }
    }
  });

  window.addEventListener('mousemove', (e: MouseEvent) => {
    if (state.draggingIndex < 0) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const pc = state.pixelChars[state.draggingIndex];
    const oldX = pc.x;
    const oldY = pc.y;
    pc.x = x - state.dragOffsetX;
    pc.y = y - state.dragOffsetY;
    const pad = 30;
    markDirty(state,
      Math.min(oldX, pc.x) - pad,
      Math.min(oldY, pc.y) - pad,
      Math.max(oldX + pc.charWidth, pc.x + pc.charWidth) - Math.min(oldX, pc.x) + pad * 2,
      Math.max(oldY + pc.charHeight, pc.y + pc.charHeight) - Math.min(oldY, pc.y) + pad * 2
    );
    pc.glowStartTime = performance.now();
  });

  window.addEventListener('mouseup', () => {
    if (state.draggingIndex >= 0) {
      const pc = state.pixelChars[state.draggingIndex];
      markDirty(state, pc.x - 30, pc.y - 30, pc.charWidth + 60, pc.charHeight + 60);
    }
    state.draggingIndex = -1;
  });

  canvas.addEventListener('dblclick', (e: MouseEvent) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    for (let i = state.pixelChars.length - 1; i >= 0; i--) {
      const pc = state.pixelChars[i];
      if (x >= pc.x && x <= pc.x + pc.charWidth &&
          y >= pc.y && y <= pc.y + pc.charHeight) {
        pc.pulseStartTime = performance.now();
        explodeIntoParticles(state, pc);
        markDirty(state, pc.x - 100, pc.y - 100, pc.charWidth + 200, pc.charHeight + 200);
        break;
      }
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
  const region = {
    x: Math.max(0, Math.floor(x)),
    y: Math.max(0, Math.floor(y)),
    w: Math.ceil(w),
    h: Math.ceil(h),
  };
  if (!state.dirtyRegion) {
    state.dirtyRegion = region;
  } else {
    const d = state.dirtyRegion;
    const rx2 = d.x + d.w;
    const ry2 = d.y + d.h;
    const rx2n = region.x + region.w;
    const ry2n = region.y + region.h;
    d.x = Math.min(d.x, region.x);
    d.y = Math.min(d.y, region.y);
    d.w = Math.max(rx2, rx2n) - d.x;
    d.h = Math.max(ry2, ry2n) - d.y;
  }
}

function explodeIntoParticles(state: InteractionState, pc: PixelChar): void {
  const now = performance.now();
  const cx = pc.x + pc.charWidth / 2;
  const cy = pc.y + pc.charHeight / 2;
  const baseColor = pc.color;

  const pixelPositions: Array<{ x: number; y: number }> = [];
  for (let r = 0; r < GRID_ROWS_CONST; r++) {
    for (let c = 0; c < GRID_COLS_CONST; c++) {
      if (pc.pixelMap[r * GRID_COLS_CONST + c]) {
        pixelPositions.push({
          x: pc.x + c * (PIXEL_SIZE_CONST + PIXEL_GAP_CONST) + PIXEL_SIZE_CONST / 2,
          y: pc.y + r * (PIXEL_SIZE_CONST + PIXEL_GAP_CONST) + PIXEL_SIZE_CONST / 2,
        });
      }
    }
  }

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const pos = pixelPositions.length > 0
      ? pixelPositions[Math.floor(Math.random() * pixelPositions.length)]
      : { x: cx, y: cy };

    const angle = (i / PARTICLE_COUNT) * Math.PI * 2 + Math.random() * 0.6;
    const speedVar = 0.5 + Math.random() * 1.2;
    const speed = PARTICLE_BASE_SPEED * speedVar;
    const shapes: Array<'circle' | 'square' | 'triangle'> = ['circle', 'square', 'triangle'];
    const shape = shapes[Math.floor(Math.random() * shapes.length)];

    state.particles.push({
      x: pos.x + (Math.random() - 0.5) * 6,
      y: pos.y + (Math.random() - 0.5) * 6,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 20,
      size: 3 + Math.random() * 5,
      color: shiftColor(baseColor, (Math.random() - 0.5) * 120, Math.random() * 0.3),
      life: now,
      maxLife: PARTICLE_LIFE * (0.6 + Math.random() * 0.6),
      shape,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: (Math.random() - 0.5) * 10,
    });
  }

  markDirty(state, cx - 200, cy - 200, 400, 400);
}

export function renderFrame(state: InteractionState, forceFull: boolean = false): void {
  const now = performance.now();
  const dt = (now - state.lastFrameTime) / 1000;
  state.lastFrameTime = now;

  const { ctx, canvas, bgCanvas, bgCtx } = state;
  let dirty = state.dirtyRegion;
  const hasParticles = state.particles.length > 0;
  const hasAppearing = state.charAppearProgress.size > 0;
  const hasGlowing = state.pixelChars.some(pc => now - pc.glowStartTime < GLOW_DURATION);
  const hasPulsing = state.pixelChars.some(pc => now - pc.pulseStartTime < PULSE_DURATION);

  if (forceFull || hasParticles || hasAppearing || hasGlowing || hasPulsing || state.draggingIndex >= 0) {
    dirty = { x: 0, y: 0, w: canvas.width, h: canvas.height };
  }

  if (!dirty) return;

  const dr = dirty;
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
  state.dirtyRegion = null;
}

function updateAppearProgress(state: InteractionState, now: number): void {
  const elapsed = now - state.appearStartTime;
  const stagger = 80;
  let stillAnimating = false;

  state.charAppearProgress.forEach((_, idx) => {
    const startOffset = idx * stagger;
    const localElapsed = elapsed - startOffset;
    if (localElapsed < 0) {
      state.charAppearProgress.set(idx, -1);
      stillAnimating = true;
    } else if (localElapsed < 400) {
      const t = Math.min(1, localElapsed / 400);
      state.charAppearProgress.set(idx, easeOutCubic(t));
      stillAnimating = true;
    } else {
      state.charAppearProgress.set(idx, 1);
    }
  });

  if (!stillAnimating) {
    setTimeout(() => state.charAppearProgress.clear(), 50);
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
  if (appearT === undefined || appearT === -1) {
    if (appearT === -1) return;
    appearT = 1;
  }
  if (appearT < 0) return;

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
  const offsetY = cy - renderH / 2 + (1 - appearT) * 120;

  ctx.save();
  ctx.globalAlpha = appearT;

  if (glowAlpha > 0) {
    const glowColor = `rgba(74,111,165,${0.3 * glowAlpha})`;
    const gradient = ctx.createRadialGradient(
      cx, cy + (1 - appearT) * 120, 0,
      cx, cy + (1 - appearT) * 120, Math.max(renderW, renderH) * 0.8
    );
    gradient.addColorStop(0, glowColor);
    gradient.addColorStop(1, 'rgba(74,111,165,0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy + (1 - appearT) * 120, Math.max(renderW, renderH) * 0.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = `rgba(74,111,165,${0.5 * glowAlpha})`;
    ctx.lineWidth = 2 + glowAlpha * 2;
    ctx.beginPath();
    roundRect(ctx, offsetX - 6, offsetY - 6, renderW + 12, renderH + 12, 8);
    ctx.stroke();
  }

  if (pc.offscreenCanvas) {
    if (scale !== 1 || (1 - appearT) * 120 !== 0) {
      ctx.drawImage(pc.offscreenCanvas, offsetX, offsetY, renderW, renderH);
    } else {
      ctx.drawImage(pc.offscreenCanvas, pc.x, pc.y);
    }
  } else {
    ctx.fillStyle = pc.color;
    const px = PIXEL_SIZE_CONST * scale;
    const pg = PIXEL_GAP_CONST * scale;
    for (let r = 0; r < GRID_ROWS_CONST; r++) {
      for (let c = 0; c < GRID_COLS_CONST; c++) {
        if (pc.pixelMap[r * GRID_COLS_CONST + c]) {
          const x = offsetX + c * (px + pg);
          const y = offsetY + r * (px + pg);
          ctx.fillRect(x, y, px, px);
        }
      }
    }
  }

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): void {
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

  const now = performance.now();
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
    pc.color = newColor;
    reRenderChar(pc, newColor);
    markDirty(state, pc.x - 10, pc.y - 10, pc.charWidth + 20, pc.charHeight + 20);
  }
}
