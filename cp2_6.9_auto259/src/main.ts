import { InkDrop, createInkDrop } from './inkDrop';
import { PaperTexture } from './paperTexture';

const MAX_INK_DROPS = 3000;
const MERGE_DISTANCE = 15;
const FADE_DURATION = 2000;

const canvas = document.getElementById('inkCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const inkCountEl = document.getElementById('inkCount') as HTMLElement;
const timerEl = document.getElementById('timer') as HTMLElement;
const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement;
const saveBtn = document.getElementById('saveBtn') as HTMLButtonElement;

let paperTexture: PaperTexture;
let inkDrops: InkDrop[] = [];
let mouseX = 0;
let mouseY = 0;
let isMouseInCanvas = false;
let startTime = Date.now();
let isFading = false;
let fadeStartTime = 0;
let originalAlphas: Map<InkDrop, number> = new Map();
let cssWidth = 0;
let cssHeight = 0;

function resizeCanvas(): void {
  const wrapper = canvas.parentElement!;
  const dpr = window.devicePixelRatio || 1;
  const rect = wrapper.getBoundingClientRect();
  cssWidth = rect.width;
  cssHeight = rect.height;
  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);
  paperTexture = new PaperTexture(
    Math.floor(cssWidth * dpr),
    Math.floor(cssHeight * dpr)
  );
}

function getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

function addInkDrop(drop: InkDrop): void {
  if (inkDrops.length >= MAX_INK_DROPS) {
    inkDrops.sort((a, b) => a.alpha - b.alpha);
    inkDrops.splice(0, inkDrops.length - MAX_INK_DROPS + 1);
  }
  inkDrops.push(drop);
}

function spawnMouseDrops(): void {
  if (!isMouseInCanvas || isFading) return;
  const count = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < count; i++) {
    const offsetX = (Math.random() - 0.5) * 8;
    const offsetY = (Math.random() - 0.5) * 8;
    const drop = createInkDrop(
      mouseX + offsetX,
      mouseY + offsetY,
      false
    );
    addInkDrop(drop);
  }
}

function spawnBurst(x: number, y: number): void {
  if (isFading) return;
  const count = 20 + Math.floor(Math.random() * 31);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * 30;
    const factor = 1 - (dist / 30) * 0.6;
    const drop = createInkDrop(
      x + Math.cos(angle) * dist,
      y + Math.sin(angle) * dist,
      true
    );
    drop.alpha *= factor;
    drop.radius *= (0.5 + factor * 0.5);
    addInkDrop(drop);
  }
}

function mergeDrops(): void {
  if (inkDrops.length < 2) return;
  const toRemove = new Set<number>();
  for (let i = 0; i < inkDrops.length; i++) {
    if (toRemove.has(i)) continue;
    const a = inkDrops[i];
    for (let j = i + 1; j < inkDrops.length; j++) {
      if (toRemove.has(j)) continue;
      const b = inkDrops[j];
      if (a.distanceTo(b) < MERGE_DISTANCE) {
        a.mergeWith(b);
        toRemove.add(j);
      }
    }
  }
  if (toRemove.size > 0) {
    inkDrops = inkDrops.filter((_, idx) => !toRemove.has(idx));
  }
}

function getTextureFactor(x: number, y: number): number {
  const dpr = window.devicePixelRatio || 1;
  return paperTexture.getAbsorptionFactor(x * dpr, y * dpr);
}

function render(): void {
  const dpr = window.devicePixelRatio || 1;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  paperTexture.draw(ctx);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.scale(dpr, dpr);

  if (isFading) {
    const elapsed = Date.now() - fadeStartTime;
    const progress = Math.min(elapsed / FADE_DURATION, 1);
    for (const drop of inkDrops) {
      const originalAlpha = originalAlphas.get(drop) ?? drop.alpha;
      drop.alpha = originalAlpha * (1 - progress);
      if (drop.alpha > 0) {
        drop.draw(ctx);
      }
    }
    if (progress >= 1) {
      inkDrops = [];
      originalAlphas.clear();
      isFading = false;
    }
  } else {
    for (const drop of inkDrops) {
      const factor = getTextureFactor(drop.x, drop.y);
      drop.update(factor);
      if (!drop.dead) {
        drop.draw(ctx);
      }
    }
    inkDrops = inkDrops.filter(d => !d.dead);
    if (Math.random() < 0.3) {
      mergeDrops();
    }
  }
}

function updateUI(): void {
  inkCountEl.textContent = String(inkDrops.length);
  const elapsed = Math.floor((Date.now() - startTime) / 1000);
  timerEl.textContent = `${elapsed}s`;
}

function loop(): void {
  spawnMouseDrops();
  render();
  updateUI();
  requestAnimationFrame(loop);
}

function clearCanvas(): void {
  if (isFading) return;
  isFading = true;
  fadeStartTime = Date.now();
  originalAlphas.clear();
  for (const drop of inkDrops) {
    originalAlphas.set(drop, drop.alpha);
  }
}

function saveCanvas(): void {
  const exportWidth = 1920;
  const exportHeight = 1080;
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = exportWidth;
  exportCanvas.height = exportHeight;
  const exportCtx = exportCanvas.getContext('2d')!;
  const paperTex = new PaperTexture(exportWidth, exportHeight);
  paperTex.draw(exportCtx);

  const scaleX = exportWidth / cssWidth;
  const scaleY = exportHeight / cssHeight;
  const scale = Math.min(scaleX, scaleY);
  const offsetX = (exportWidth - cssWidth * scale) / 2;
  const offsetY = (exportHeight - cssHeight * scale) / 2;

  exportCtx.save();
  exportCtx.translate(offsetX, offsetY);
  exportCtx.scale(scale, scale);
  for (const drop of inkDrops) {
    exportCtx.globalAlpha = drop.alpha;
    const gradient = exportCtx.createRadialGradient(
      drop.x, drop.y, 0,
      drop.x, drop.y, drop.radius
    );
    gradient.addColorStop(0, drop.color);
    gradient.addColorStop(0.5, drop.color);
    gradient.addColorStop(1, 'rgba(0,0,0,0)');
    exportCtx.fillStyle = gradient;
    exportCtx.beginPath();
    exportCtx.arc(drop.x, drop.y, drop.radius, 0, Math.PI * 2);
    exportCtx.fill();
  }
  exportCtx.restore();
  exportCtx.globalAlpha = 1;

  const link = document.createElement('a');
  link.download = `墨染流光_${Date.now()}.png`;
  link.href = exportCanvas.toDataURL('image/png');
  link.click();
}

function setupEventListeners(): void {
  canvas.addEventListener('mouseenter', () => {
    isMouseInCanvas = true;
  });
  canvas.addEventListener('mouseleave', () => {
    isMouseInCanvas = false;
  });
  canvas.addEventListener('mousemove', (e: MouseEvent) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    mouseX = coords.x;
    mouseY = coords.y;
  });
  canvas.addEventListener('click', (e: MouseEvent) => {
    const coords = getCanvasCoords(e.clientX, e.clientY);
    spawnBurst(coords.x, coords.y);
  });
  canvas.addEventListener('touchstart', (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const coords = getCanvasCoords(touch.clientX, touch.clientY);
    mouseX = coords.x;
    mouseY = coords.y;
    isMouseInCanvas = true;
    spawnBurst(coords.x, coords.y);
  }, { passive: false });
  canvas.addEventListener('touchmove', (e: TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    const coords = getCanvasCoords(touch.clientX, touch.clientY);
    mouseX = coords.x;
    mouseY = coords.y;
  }, { passive: false });
  canvas.addEventListener('touchend', () => {
    isMouseInCanvas = false;
  });
  clearBtn.addEventListener('click', clearCanvas);
  saveBtn.addEventListener('click', saveCanvas);
  let resizeTimeout: number;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = window.setTimeout(() => {
      resizeCanvas();
    }, 200);
  });
}

function init(): void {
  resizeCanvas();
  setupEventListeners();
  startTime = Date.now();
  loop();
}

init();
