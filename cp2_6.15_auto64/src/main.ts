import {
  FurnitureItem,
  FurnitureType,
  createFurniture,
  drawFurniture,
  drawFurnitureThumbnail,
  hitTestFurniture,
} from './furnitureModule';
import {
  setLight,
  getLight,
  renderShadows,
  renderLightHalo,
  markShadowDirty,
  isShadowDirty,
} from './shadowModule';
import { snapToGrid, exportCanvasToPNG } from './utils';

const CANVAS_W = 800;
const CANVAS_H = 500;
const GRID_SIZE = 40;
const GRID_COLS = 10;
const GRID_ROWS = 10;
const SNAP_SIZE = 20;

const furnitureList: FurnitureItem[] = [];
let dragging: FurnitureItem | null = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let hoveredFurniture: FurnitureItem | null = null;
let contextTarget: FurnitureItem | null = null;
let animFrameId = 0;
let furnitureDirty = true;
let gridCached = false;

let gridCanvas: OffscreenCanvas | null = null;
let furnitureCanvas: OffscreenCanvas | null = null;

const canvas = document.getElementById('sceneCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const furniturePanel = document.getElementById('furniturePanel')!;
const contextMenu = document.getElementById('contextMenu') as HTMLDivElement;
const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;

const lightAngleSlider = document.getElementById('lightAngle') as HTMLInputElement;
const lightIntensitySlider = document.getElementById('lightIntensity') as HTMLInputElement;
const shadowSoftnessSlider = document.getElementById('shadowSoftness') as HTMLInputElement;
const angleValueEl = document.getElementById('angleValue')!;
const intensityValueEl = document.getElementById('intensityValue')!;
const softnessValueEl = document.getElementById('softnessValue')!;

function drawGridToCanvas(targetCtx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
  targetCtx.strokeStyle = '#d0d0d0';
  targetCtx.lineWidth = 1;
  for (let i = 0; i <= GRID_COLS; i++) {
    const x = i * GRID_SIZE;
    targetCtx.beginPath();
    targetCtx.moveTo(x, 0);
    targetCtx.lineTo(x, GRID_ROWS * GRID_SIZE);
    targetCtx.stroke();
  }
  for (let j = 0; j <= GRID_ROWS; j++) {
    const y = j * GRID_SIZE;
    targetCtx.beginPath();
    targetCtx.moveTo(0, y);
    targetCtx.lineTo(GRID_COLS * GRID_SIZE, y);
    targetCtx.stroke();
  }
}

function ensureGridCanvas(): OffscreenCanvas {
  if (!gridCanvas) {
    gridCanvas = new OffscreenCanvas(CANVAS_W, CANVAS_H);
    const gctx = gridCanvas.getContext('2d')!;
    gctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawGridToCanvas(gctx);
  }
  return gridCanvas;
}

function ensureFurnitureCanvas(): OffscreenCanvas {
  if (!furnitureCanvas) {
    furnitureCanvas = new OffscreenCanvas(CANVAS_W, CANVAS_H);
  }
  if (furnitureDirty) {
    const fctx = furnitureCanvas.getContext('2d')!;
    fctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    for (const furniture of furnitureList) {
      drawFurniture(fctx, furniture);
    }
    furnitureDirty = false;
  }
  return furnitureCanvas;
}

export function markFurnitureDirty(): void {
  furnitureDirty = true;
}

function drawBoundingBox(furniture: FurnitureItem): void {
  const cx = furniture.x + furniture.width / 2;
  const cy = furniture.y + furniture.height / 2;
  const hw = furniture.width / 2;
  const hh = furniture.height / 2;
  const rad = (furniture.rotation * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const corners = [
    { x: cx + (-hw) * cos - (-hh) * sin, y: cy + (-hw) * sin + (-hh) * cos },
    { x: cx + (hw) * cos - (-hh) * sin, y: cy + (hw) * sin + (-hh) * cos },
    { x: cx + (hw) * cos - (hh) * sin, y: cy + (hw) * sin + (hh) * cos },
    { x: cx + (-hw) * cos - (hh) * sin, y: cy + (-hw) * sin + (hh) * cos },
  ];

  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = '#ff7043';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(corners[0].x, corners[0].y);
  for (let i = 1; i < corners.length; i++) {
    ctx.lineTo(corners[i].x, corners[i].y);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.setLineDash([]);
  ctx.fillStyle = '#ff7043';
  ctx.font = '11px sans-serif';
  ctx.fillText(`${furniture.width}×${furniture.height}`, furniture.x, furniture.y - 6);
  ctx.restore();
}

function render(): void {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = '#f0f0f0';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  ctx.drawImage(ensureGridCanvas(), 0, 0);

  renderShadows(ctx, furnitureList, CANVAS_W, CANVAS_H);

  renderLightHalo(ctx, CANVAS_W, CANVAS_H);

  ctx.drawImage(ensureFurnitureCanvas(), 0, 0);

  if (hoveredFurniture && !dragging) {
    drawBoundingBox(hoveredFurniture);
  }

  animFrameId = requestAnimationFrame(render);
}

function initFurniturePanel(): void {
  const types: FurnitureType[] = ['armchair', 'roundtable', 'floorlamp'];
  const labels: Record<FurnitureType, string> = {
    armchair: '扶手椅',
    roundtable: '圆桌',
    floorlamp: '落地灯',
  };

  for (const type of types) {
    const item = document.createElement('div');
    item.className = 'furniture-item';

    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = 160;
    thumbCanvas.height = 120;
    const thumbCtx = thumbCanvas.getContext('2d')!;
    thumbCtx.fillStyle = '#3a3a3a';
    thumbCtx.fillRect(0, 0, 160, 120);
    drawFurnitureThumbnail(thumbCtx, type, 160, 120);

    const label = document.createElement('span');
    label.textContent = labels[type];

    item.appendChild(thumbCanvas);
    item.appendChild(label);

    item.addEventListener('click', () => {
      const cx = CANVAS_W / 2;
      const cy = CANVAS_H / 2;
      const snappedX = snapToGrid(cx - 40, SNAP_SIZE);
      const snappedY = snapToGrid(cy - 35, SNAP_SIZE);
      const furniture = createFurniture(type, snappedX, snappedY);
      furnitureList.push(furniture);
      markFurnitureDirty();
      markShadowDirty();
    });

    furniturePanel.appendChild(item);
  }
}

function initSliderEvents(): void {
  lightAngleSlider.addEventListener('input', () => {
    const val = parseInt(lightAngleSlider.value, 10);
    angleValueEl.textContent = `${val}°`;
    setLight({ angle: val });
  });

  lightIntensitySlider.addEventListener('input', () => {
    const val = parseInt(lightIntensitySlider.value, 10);
    intensityValueEl.textContent = `${val}%`;
    setLight({ intensity: val });
  });

  shadowSoftnessSlider.addEventListener('input', () => {
    const val = parseInt(shadowSoftnessSlider.value, 10);
    softnessValueEl.textContent = `${val}`;
    setLight({ softness: val });
  });
}

function initCanvasEvents(): void {
  canvas.addEventListener('mousedown', (e) => {
    if (e.button !== 0) return;
    hideContextMenu();

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (CANVAS_W / rect.width);
    const my = (e.clientY - rect.top) * (CANVAS_H / rect.height);

    for (let i = furnitureList.length - 1; i >= 0; i--) {
      if (hitTestFurniture(furnitureList[i], mx, my)) {
        dragging = furnitureList[i];
        dragOffsetX = mx - furnitureList[i].x;
        dragOffsetY = my - furnitureList[i].y;

        const [item] = furnitureList.splice(i, 1);
        furnitureList.push(item);
        break;
      }
    }
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (CANVAS_W / rect.width);
    const my = (e.clientY - rect.top) * (CANVAS_H / rect.height);

    if (dragging) {
      const rawX = mx - dragOffsetX;
      const rawY = my - dragOffsetY;
      dragging.x = snapToGrid(rawX, SNAP_SIZE);
      dragging.y = snapToGrid(rawY, SNAP_SIZE);
      markShadowDirty();
    } else {
      hoveredFurniture = null;
      for (let i = furnitureList.length - 1; i >= 0; i--) {
        if (hitTestFurniture(furnitureList[i], mx, my)) {
          hoveredFurniture = furnitureList[i];
          break;
        }
      }
    }
  });

  canvas.addEventListener('mouseup', () => {
    dragging = null;
  });

  canvas.addEventListener('mouseleave', () => {
    dragging = null;
    hoveredFurniture = null;
  });

  canvas.addEventListener('contextmenu', (e) => {
    e.preventDefault();

    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * (CANVAS_W / rect.width);
    const my = (e.clientY - rect.top) * (CANVAS_H / rect.height);

    contextTarget = null;
    for (let i = furnitureList.length - 1; i >= 0; i--) {
      if (hitTestFurniture(furnitureList[i], mx, my)) {
        contextTarget = furnitureList[i];
        break;
      }
    }

    if (contextTarget) {
      contextMenu.style.display = 'block';
      contextMenu.style.left = `${e.clientX}px`;
      contextMenu.style.top = `${e.clientY}px`;
    }
  });
}

function initContextMenu(): void {
  const items = contextMenu.querySelectorAll('.menu-item');
  items.forEach(item => {
    item.addEventListener('click', () => {
      if (!contextTarget) return;

      const action = (item as HTMLElement).dataset.action;
      switch (action) {
        case 'delete': {
          const idx = furnitureList.indexOf(contextTarget!);
          if (idx >= 0) furnitureList.splice(idx, 1);
          markShadowDirty();
          break;
        }
        case 'rotate': {
          contextTarget!.targetRotation += 45;
          contextTarget!.rotationAnimStart = performance.now();
          markShadowDirty();
          break;
        }
        case 'copy': {
          const copy = createFurniture(contextTarget!.type, contextTarget!.x + 20, contextTarget!.y + 20);
          copy.rotation = contextTarget!.rotation;
          copy.targetRotation = contextTarget!.targetRotation;
          furnitureList.push(copy);
          markShadowDirty();
          break;
        }
      }

      hideContextMenu();
    });
  });

  document.addEventListener('click', (e) => {
    if (!(e.target as HTMLElement).closest('.context-menu')) {
      hideContextMenu();
    }
  });
}

function hideContextMenu(): void {
  contextMenu.style.display = 'none';
  contextTarget = null;
}

function initExport(): void {
  exportBtn.addEventListener('click', () => {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = CANVAS_W;
    exportCanvas.height = CANVAS_H;
    const exportCtx = exportCanvas.getContext('2d')!;

    exportCtx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    drawGrid();
    renderShadows(exportCtx, furnitureList, CANVAS_W, CANVAS_H);
    for (const furniture of furnitureList) {
      drawFurniture(exportCtx, furniture);
    }

    exportCanvasToPNG(exportCanvas);
  });
}

function init(): void {
  initFurniturePanel();
  initSliderEvents();
  initCanvasEvents();
  initContextMenu();
  initExport();

  angleValueEl.textContent = `${lightAngleSlider.value}°`;
  intensityValueEl.textContent = `${lightIntensitySlider.value}%`;
  softnessValueEl.textContent = shadowSoftnessSlider.value;

  render();
}

init();
