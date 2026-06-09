import {
  renderScene,
  updateBuildings,
  updateCurrentTrailBrightness,
  getComplementaryColor,
} from './drawEngine';
import { initUI } from './uiPanel';
import type { AppState, TrailPoint, BrushParams } from './types';

const WALLPAPER_W = 1920;
const WALLPAPER_H = 1080;
const STATIONARY_THRESHOLD_PX = 3;

function setupCanvas(canvas: HTMLCanvasElement): {
  ctx: CanvasRenderingContext2D;
  resize: () => void;
} {
  const ctx = canvas.getContext('2d', { alpha: false })!;

  const resize = () => {
    const wrap = canvas.parentElement!;
    const rect = wrap.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  resize();
  window.addEventListener('resize', resize);
  return { ctx, resize };
}

function getCanvasPoint(canvas: HTMLCanvasElement, clientX: number, clientY: number) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
}

function downloadPNG(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function generateWallpaper(
  state: AppState,
  brush: BrushParams
): void {
  const offscreen = document.createElement('canvas');
  offscreen.width = WALLPAPER_W;
  offscreen.height = WALLPAPER_H;
  const octx = offscreen.getContext('2d', { alpha: false })!;

  const sourceCanvas = document.getElementById('canvas') as HTMLCanvasElement;
  const srcRect = sourceCanvas.getBoundingClientRect();

  const scaleX = WALLPAPER_W / srcRect.width;
  const scaleY = WALLPAPER_H / srcRect.height;

  const scaledBuildings = state.buildings.map((b) => ({
    ...b,
    x: b.x * scaleX,
    baseY: b.baseY * scaleY,
    width: b.width * scaleX,
    height: b.height * scaleY,
    topWidth: b.topWidth * scaleX,
  }));

  const scaledTrails = state.trails.map((trail) =>
    trail.map((pt) => ({
      ...pt,
      x: pt.x * scaleX,
      y: pt.y * scaleY,
      thickness: pt.thickness * Math.max(scaleX, scaleY),
    }))
  );

  const scaledCurrent = state.currentTrail
    ? state.currentTrail.map((pt) => ({
        ...pt,
        x: pt.x * scaleX,
        y: pt.y * scaleY,
        thickness: pt.thickness * Math.max(scaleX, scaleY),
      }))
    : null;

  renderScene(
    octx,
    WALLPAPER_W,
    WALLPAPER_H,
    scaledTrails,
    scaledCurrent,
    scaledBuildings as any,
    { ...brush, size: brush.size * Math.max(scaleX, scaleY) },
    performance.now(),
    state.zoomLevel
  );

  const dataUrl = offscreen.toDataURL('image/png');
  downloadPNG(dataUrl, `neon-city-${Date.now()}.png`);
}

function main() {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const { ctx, resize } = setupCanvas(canvas);

  const initialBrush: BrushParams = {
    size: 14,
    color: '#FF007F',
    opacity: 0.7,
    glowColor: '#FF007F',
  };

  const state: AppState = {
    brush: initialBrush,
    buildings: [],
    trails: [],
    currentTrail: null,
    isDrawing: false,
    lastMousePos: null,
    mouseStationaryStart: 0,
    zoomLevel: 0.3,
  };

  const ui = initUI({
    onBrushChange: (brush) => {
      state.brush = brush;
      const complement = getComplementaryColor(brush.color);
      state.buildings.forEach((b) => (b.glowColor = complement));
    },
    onClear: () => {
      state.trails = [];
      state.currentTrail = null;
    },
    onGenerate: () => {
      generateWallpaper(state, state.brush);
    },
  });

  state.brush = ui.getBrush();

  const onPointerDown = (e: PointerEvent) => {
    state.isDrawing = true;
    const pt = getCanvasPoint(canvas, e.clientX, e.clientY);
    const now = performance.now();
    state.currentTrail = [
      {
        x: pt.x,
        y: pt.y,
        timestamp: now,
        alpha: 1,
        thickness: state.brush.size,
      },
    ];
    state.lastMousePos = pt;
    state.mouseStationaryStart = now;
    canvas.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    const pt = getCanvasPoint(canvas, e.clientX, e.clientY);
    const now = performance.now();

    if (state.lastMousePos) {
      const dx = pt.x - state.lastMousePos.x;
      const dy = pt.y - state.lastMousePos.y;
      if (dx * dx + dy * dy <= STATIONARY_THRESHOLD_PX * STATIONARY_THRESHOLD_PX) {
        if (state.isDrawing && state.currentTrail) {
          updateCurrentTrailBrightness(
            state.currentTrail,
            now,
            state.mouseStationaryStart
          );
        }
        return;
      }
    }

    state.lastMousePos = pt;
    state.mouseStationaryStart = now;

    if (state.isDrawing && state.currentTrail) {
      state.currentTrail.push({
        x: pt.x,
        y: pt.y,
        timestamp: now,
        alpha: 1,
        thickness: state.brush.size,
      });

      const MAX_POINTS = 120;
      if (state.currentTrail.length > MAX_POINTS) {
        state.currentTrail.splice(0, state.currentTrail.length - MAX_POINTS);
      }
    }
  };

  const onPointerUp = () => {
    if (state.isDrawing && state.currentTrail && state.currentTrail.length >= 2) {
      state.trails.push(state.currentTrail);
      if (state.trails.length > 10) {
        state.trails.splice(0, state.trails.length - 10);
      }
    }
    state.isDrawing = false;
    state.currentTrail = null;
    state.mouseStationaryStart = 0;
  };

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = -e.deltaY * 0.001;
    state.zoomLevel = Math.max(0, Math.min(1, state.zoomLevel + delta));

    const rect = canvas.getBoundingClientRect();
    state.buildings = updateBuildings(
      state.buildings,
      state.zoomLevel,
      rect.width,
      rect.height,
      getComplementaryColor(state.brush.color)
    );
  };

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  canvas.addEventListener('pointerleave', onPointerUp);
  canvas.addEventListener('wheel', onWheel, { passive: false });

  window.addEventListener('resize', () => {
    setTimeout(() => {
      const rect = canvas.getBoundingClientRect();
      state.buildings = state.buildings.map((b) => ({
        ...b,
        x: Math.min(b.x, rect.width - b.width),
        baseY: Math.min(b.baseY, rect.height),
      }));
    }, 50);
  });

  const rect = canvas.getBoundingClientRect();
  state.buildings = updateBuildings(
    state.buildings,
    state.zoomLevel,
    rect.width,
    rect.height,
    getComplementaryColor(state.brush.color)
  );

  let lastFrame = performance.now();
  const loop = (now: number) => {
    const rect = canvas.getBoundingClientRect();
    if (state.buildings.length > 0 || state.isDrawing) {
      state.buildings = updateBuildings(
        state.buildings,
        state.zoomLevel,
        rect.width,
        rect.height,
        getComplementaryColor(state.brush.color)
      );
    }

    state.trails = state.trails.filter((trail) => {
      if (trail.length === 0) return false;
      const age = (now - trail[trail.length - 1].timestamp) / 1000;
      return age < 15;
    });

    renderScene(
      ctx,
      rect.width,
      rect.height,
      state.trails,
      state.currentTrail,
      state.buildings,
      state.brush,
      now,
      state.zoomLevel
    );

    lastFrame = now;
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
