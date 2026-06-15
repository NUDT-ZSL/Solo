import { FurnitureItem, getFurnitureOutlinePoints, getFurnitureOutline } from './furnitureModule';
import { applyGaussianBlur } from './utils';

export interface LightParams {
  angle: number;
  intensity: number;
  softness: number;
}

interface ShadowState {
  currentSoftness: number;
  targetSoftness: number;
  animStart: number;
}

const shadowStates = new Map<string, ShadowState>();

let currentLight: LightParams = {
  angle: 0,
  intensity: 50,
  softness: 1,
};

let shadowDirty = true;
let shadowCanvas: OffscreenCanvas | null = null;
let shadowCtx: OffscreenCanvasRenderingContext2D | null = null;
let lastRenderedSoftness = -1;

export function setLight(params: Partial<LightParams>): void {
  if (params.angle !== undefined && params.angle !== currentLight.angle) {
    currentLight.angle = params.angle;
    shadowDirty = true;
  }
  if (params.intensity !== undefined && params.intensity !== currentLight.intensity) {
    currentLight.intensity = params.intensity;
    shadowDirty = true;
  }
  if (params.softness !== undefined && params.softness !== currentLight.softness) {
    currentLight.softness = params.softness;
    shadowDirty = true;
  }
}

export function getLight(): LightParams {
  return { ...currentLight };
}

export function markShadowDirty(): void {
  shadowDirty = true;
}

export function isShadowDirty(): boolean {
  return shadowDirty;
}

function getLightVector(): { dx: number; dy: number } {
  const rad = (currentLight.angle * Math.PI) / 180;
  const strength = currentLight.intensity / 100;
  const len = 20 + strength * 60;
  return {
    dx: Math.cos(rad) * len,
    dy: Math.sin(rad) * len,
  };
}

function projectShadowOutline(
  furniture: FurnitureItem
): { x: number; y: number }[] {
  const outlineType = getFurnitureOutline(furniture.type);
  const points = getFurnitureOutlinePoints(furniture);
  const { dx, dy } = getLightVector();

  if (outlineType === 'circle') {
    const cx = furniture.x + furniture.width / 2;
    const cy = furniture.y + furniture.height / 2;
    const r = furniture.width / 2;
    const segments = 48;
    const projected: { x: number; y: number }[] = [];

    for (let i = 0; i < segments; i++) {
      const angle = (i / segments) * Math.PI * 2;
      const px = cx + r * Math.cos(angle);
      const py = cy + r * Math.sin(angle);

      const dot = Math.cos(angle) * dx + Math.sin(angle) * dy;
      if (dot > 0) {
        projected.push({ x: px + dx, y: py + dy });
      } else {
        projected.push({ x: px, y: py });
      }
    }

    return projected;
  }

  return points.map(p => {
    const cx = furniture.x + furniture.width / 2;
    const cy = furniture.y + furniture.height / 2;
    const dirX = p.x - cx;
    const dirY = p.y - cy;
    const dot = dirX * dx + dirY * dy;
    const len = Math.sqrt(dirX * dirX + dirY * dirY) || 1;
    const normDot = dot / len;

    if (normDot > 0) {
      return { x: p.x + dx, y: p.y + dy };
    }
    return { x: p.x, y: p.y };
  });
}

function computeConvexHull(points: { x: number; y: number }[]): { x: number; y: number }[] {
  if (points.length < 3) return points;

  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: { x: number; y: number }, a: { x: number; y: number }, b: { x: number; y: number }) => {
    return (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  };

  const lower: { x: number; y: number }[] = [];
  for (const p of sorted) {
    while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) {
      lower.pop();
    }
    lower.push(p);
  }

  const upper: { x: number; y: number }[] = [];
  for (let i = sorted.length - 1; i >= 0; i--) {
    const p = sorted[i];
    while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) {
      upper.pop();
    }
    upper.push(p);
  }

  lower.pop();
  upper.pop();
  return lower.concat(upper);
}

function renderShadowToBuffer(
  furnitureList: FurnitureItem[],
  width: number,
  height: number,
  softness: number
): OffscreenCanvas {
  if (!shadowCanvas || shadowCanvas.width !== width || shadowCanvas.height !== height) {
    shadowCanvas = new OffscreenCanvas(width, height);
    shadowCtx = shadowCanvas.getContext('2d');
  }

  shadowCtx!.clearRect(0, 0, width, height);

  for (const furniture of furnitureList) {
    const outlineType = getFurnitureOutline(furniture.type);

    if (outlineType === 'circle') {
      const cx = furniture.x + furniture.width / 2;
      const cy = furniture.y + furniture.height / 2;
      const r = furniture.width / 2;
      const { dx, dy } = getLightVector();
      const shadowCx = cx + dx * 0.5;
      const shadowCy = cy + dy * 0.5;

      shadowCtx!.beginPath();
      shadowCtx!.ellipse(shadowCx, shadowCy, r + Math.abs(dx) * 0.3, r + Math.abs(dy) * 0.3, 0, 0, Math.PI * 2);
      shadowCtx!.fillStyle = 'rgba(0,0,0,0.3)';
      shadowCtx!.fill();
    } else {
      const projected = projectShadowOutline(furniture);
      const outline = getFurnitureOutlinePoints(furniture);
      const allPoints = [...outline, ...projected];
      const hull = computeConvexHull(allPoints);

      if (hull.length >= 3) {
        shadowCtx!.beginPath();
        shadowCtx!.moveTo(hull[0].x, hull[0].y);
        for (let i = 1; i < hull.length; i++) {
          shadowCtx!.lineTo(hull[i].x, hull[i].y);
        }
        shadowCtx!.closePath();
        shadowCtx!.fillStyle = 'rgba(0,0,0,0.3)';
        shadowCtx!.fill();
      }
    }
  }

  if (softness > 1) {
    const imageData = shadowCtx!.getImageData(0, 0, width, height);
    const blurred = applyGaussianBlur(imageData, softness);
    shadowCtx!.putImageData(blurred, 0, 0);
  }

  return shadowCanvas;
}

export function renderShadows(
  ctx: CanvasRenderingContext2D,
  furnitureList: FurnitureItem[],
  width: number,
  height: number
): void {
  const now = performance.now();

  let needsUpdate = shadowDirty;

  for (const f of furnitureList) {
    let state = shadowStates.get(f.id);
    if (!state) {
      state = { currentSoftness: currentLight.softness, targetSoftness: currentLight.softness, animStart: 0 };
      shadowStates.set(f.id, state);
    }
    if (state.targetSoftness !== currentLight.softness) {
      state.targetSoftness = currentLight.softness;
      state.animStart = now;
    }
    if (state.currentSoftness !== state.targetSoftness) {
      const elapsed = now - state.animStart;
      const duration = 200;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 2);
      state.currentSoftness = state.currentSoftness + (state.targetSoftness - state.currentSoftness) * eased;
      if (progress >= 1) state.currentSoftness = state.targetSoftness;
      needsUpdate = true;
    }
  }

  if (!needsUpdate && lastRenderedSoftness === currentLight.softness) return;

  const activeSoftness = furnitureList.length > 0
    ? shadowStates.get(furnitureList[0].id)?.currentSoftness ?? currentLight.softness
    : currentLight.softness;

  const shadowBuf = renderShadowToBuffer(furnitureList, width, height, activeSoftness);
  ctx.save();
  ctx.drawImage(shadowBuf, 0, 0);
  ctx.restore();

  lastRenderedSoftness = activeSoftness;
  shadowDirty = false;
}

export function renderLightHalo(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const intensity = currentLight.intensity / 100;
  if (intensity <= 0) return;

  const rad = (currentLight.angle * Math.PI) / 180;
  const radius = 40 + intensity * 160;
  const lx = width / 2 + Math.cos(rad) * (width / 3);
  const ly = height / 2 + Math.sin(rad) * (height / 3);

  const gradient = ctx.createRadialGradient(lx, ly, 0, lx, ly, radius);
  gradient.addColorStop(0, `rgba(255,235,59,${0.15 * intensity})`);
  gradient.addColorStop(0.5, `rgba(255,235,59,${0.08 * intensity})`);
  gradient.addColorStop(1, 'rgba(255,235,59,0)');

  ctx.save();
  ctx.beginPath();
  ctx.arc(lx, ly, radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();
  ctx.restore();
}
