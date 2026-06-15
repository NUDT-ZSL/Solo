export interface LightParams {
  angle: number;
  amplitude: number;
  frequency: number;
  colorShift: number;
  pointCount: number;
  trailLength: number;
  glowRadius: number;
}

export interface LightPath {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
}

interface TrailPoint {
  x: number;
  y: number;
}

interface LightPointRuntime {
  pathIndex: number;
  phase: number;
  trail: TrailPoint[];
}

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
const clamp = (v: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, v));

export const defaultParams: LightParams = {
  angle: 45,
  amplitude: 80,
  frequency: 6,
  colorShift: 180,
  pointCount: 1500,
  trailLength: 120,
  glowRadius: 16
};

export const lerpParams = (
  current: LightParams,
  target: LightParams,
  t: number
): LightParams => ({
  angle: lerp(current.angle, target.angle, t),
  amplitude: lerp(current.amplitude, target.amplitude, t),
  frequency: lerp(current.frequency, target.frequency, t),
  colorShift: lerp(current.colorShift, target.colorShift, t),
  pointCount: Math.round(lerp(current.pointCount, target.pointCount, t)),
  trailLength: Math.round(lerp(current.trailLength, target.trailLength, t)),
  glowRadius: lerp(current.glowRadius, target.glowRadius, t)
});

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  spacing = 50
): void {
  ctx.save();
  ctx.strokeStyle = '#1A2040';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= width; x += spacing) {
    ctx.moveTo(x + 0.5, 0);
    ctx.lineTo(x + 0.5, height);
  }
  for (let y = 0; y <= height; y += spacing) {
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(width, y + 0.5);
  }
  ctx.stroke();
  ctx.restore();
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  opaque = false
): void {
  if (opaque) {
    ctx.fillStyle = '#0B0E1A';
    ctx.fillRect(0, 0, width, height);
  } else {
    ctx.clearRect(0, 0, width, height);
  }
}

function createPointRuntime(pathIndex: number, phase: number): LightPointRuntime {
  return {
    pathIndex,
    phase,
    trail: []
  };
}

const runtimeCache: LightPointRuntime[] = [];

function ensureRuntime(
  totalPoints: number,
  paths: LightPath[]
): LightPointRuntime[] {
  const pathCount = Math.max(1, paths.length);
  while (runtimeCache.length < totalPoints) {
    const pathIndex = runtimeCache.length % pathCount;
    const phase = Math.random() * 1000;
    runtimeCache.push(createPointRuntime(pathIndex, phase));
  }
  if (runtimeCache.length > totalPoints) {
    runtimeCache.length = totalPoints;
  }
  for (let i = 0; i < runtimeCache.length; i++) {
    runtimeCache[i].pathIndex = i % pathCount;
  }
  return runtimeCache;
}

function computePointPosition(
  path: LightPath,
  progress: number,
  params: LightParams,
  frame: number
): { x: number; y: number } {
  const rad = (params.angle * Math.PI) / 180;
  const dx = path.endX - path.startX;
  const dy = path.endY - path.startY;
  const baseX = lerp(path.startX, path.endX, progress);
  const baseY = lerp(path.startY, path.endY, progress);

  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;

  const rotatedNx = nx * Math.cos(rad) - ny * Math.sin(rad);
  const rotatedNy = nx * Math.sin(rad) + ny * Math.cos(rad);

  const wave =
    Math.sin(progress * Math.PI * 2 * params.frequency + frame * 0.015) *
    params.amplitude;

  return {
    x: baseX + rotatedNx * wave,
    y: baseY + rotatedNy * wave
  };
}

export function generateFrame(
  ctx: CanvasRenderingContext2D,
  paths: LightPath[],
  params: LightParams,
  frame: number,
  width: number,
  height: number,
  opaque = true
): void {
  drawBackground(ctx, width, height, opaque);
  drawGrid(ctx, width, height);

  if (paths.length === 0 || params.pointCount <= 0) {
    return;
  }

  const runtimes = ensureRuntime(params.pointCount, paths);

  for (let i = 0; i < runtimes.length; i++) {
    const rt = runtimes[i];
    const path = paths[rt.pathIndex % paths.length];
    if (!path) continue;

    const progress =
      (((i / params.pointCount) * 1.618 + rt.phase * 0.0001 + frame * 0.0025) %
        1 +
        1) %
      1;

    const pos = computePointPosition(path, progress, params, frame);

    rt.trail.unshift({ x: pos.x, y: pos.y });
    if (rt.trail.length > params.trailLength) {
      rt.trail.length = params.trailLength;
    }
  }

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (let i = 0; i < runtimes.length; i++) {
    const rt = runtimes[i];
    if (rt.trail.length < 2) continue;

    const hue =
      ((i / runtimes.length) * 360 + params.colorShift + frame * 0.15) % 360;

    for (let j = 1; j < rt.trail.length; j++) {
      const prev = rt.trail[j - 1];
      const curr = rt.trail[j];
      const alpha = 1 - j / params.trailLength;
      const lightness = 55 + alpha * 20;

      ctx.beginPath();
      ctx.strokeStyle = `hsla(${hue}, 100%, ${lightness}%, ${alpha})`;
      ctx.lineWidth = 1 + alpha * 1.8;
      ctx.shadowColor = `hsla(${hue}, 100%, 70%, ${alpha})`;
      ctx.shadowBlur = params.glowRadius * alpha;
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    }

    const head = rt.trail[0];
    if (head) {
      const headHue = ((i / runtimes.length) * 360 + params.colorShift) % 360;
      ctx.beginPath();
      ctx.fillStyle = `hsla(${headHue}, 100%, 85%, 1)`;
      ctx.shadowColor = `hsla(${headHue}, 100%, 70%, 1)`;
      ctx.shadowBlur = params.glowRadius * 1.6;
      ctx.arc(head.x, head.y, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

export function drawPathMarkers(
  ctx: CanvasRenderingContext2D,
  paths: LightPath[],
  frame: number
): void {
  ctx.save();
  for (const p of paths) {
    const pulse = 1 + Math.sin(frame * 0.08) * 0.25;

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.moveTo(p.startX, p.startY);
    ctx.lineTo(p.endX, p.endY);
    ctx.stroke();
    ctx.setLineDash([]);

    for (const pt of [
      { x: p.startX, y: p.startY },
      { x: p.endX, y: p.endY }
    ]) {
      ctx.beginPath();
      ctx.fillStyle = 'rgba(0, 212, 255, 0.9)';
      ctx.shadowColor = 'rgba(0, 212, 255, 1)';
      ctx.shadowBlur = 12 * pulse;
      ctx.arc(pt.x, pt.y, 5 * pulse, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawDragPreview(
  ctx: CanvasRenderingContext2D,
  start: { x: number; y: number } | null,
  current: { x: number; y: number } | null,
  frame: number
): void {
  if (!start) return;
  ctx.save();
  const pulse = 1 + Math.sin(frame * 0.12) * 0.3;

  ctx.beginPath();
  ctx.fillStyle = 'rgba(0, 255, 170, 0.95)';
  ctx.shadowColor = 'rgba(0, 255, 170, 1)';
  ctx.shadowBlur = 16 * pulse;
  ctx.arc(start.x, start.y, 6 * pulse, 0, Math.PI * 2);
  ctx.fill();

  if (current) {
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(0, 255, 170, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    ctx.moveTo(start.x, start.y);
    ctx.lineTo(current.x, current.y);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.fillStyle = 'rgba(255, 120, 200, 0.95)';
    ctx.shadowColor = 'rgba(255, 120, 200, 1)';
    ctx.shadowBlur = 16 * pulse;
    ctx.arc(current.x, current.y, 6 * pulse, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function takeSnapshot(
  paths: LightPath[],
  params: LightParams,
  frame: number,
  outWidth = 1920,
  outHeight = 1080
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = outWidth;
  canvas.height = outHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const screenPaths = paths;
  if (screenPaths.length === 0) {
    return canvas;
  }

  const minX = Math.min(
    ...screenPaths.flatMap((p) => [p.startX, p.endX])
  );
  const maxX = Math.max(
    ...screenPaths.flatMap((p) => [p.startX, p.endX])
  );
  const minY = Math.min(
    ...screenPaths.flatMap((p) => [p.startY, p.endY])
  );
  const maxY = Math.max(
    ...screenPaths.flatMap((p) => [p.startY, p.endY])
  );

  const srcW = Math.max(1, maxX - minX);
  const srcH = Math.max(1, maxY - minY);
  const padding = Math.max(srcW, srcH) * 0.4;
  const scale = Math.min(
    (outWidth - padding * 2) / srcW,
    (outHeight - padding * 2) / srcH
  );
  const offsetX = (outWidth - srcW * scale) / 2 - minX * scale;
  const offsetY = (outHeight - srcH * scale) / 2 - minY * scale;

  const scaledPaths: LightPath[] = screenPaths.map((p) => ({
    id: p.id,
    startX: p.startX * scale + offsetX,
    startY: p.startY * scale + offsetY,
    endX: p.endX * scale + offsetX,
    endY: p.endY * scale + offsetY
  }));

  const scaledParams: LightParams = {
    ...params,
    amplitude: params.amplitude * scale,
    glowRadius: clamp(params.glowRadius * scale, 8, 40)
  };

  const snapshotRuntime: LightPointRuntime[] = [];
  const pathCount = Math.max(1, scaledPaths.length);
  for (let i = 0; i < scaledParams.pointCount; i++) {
    snapshotRuntime.push(
      createPointRuntime(i % pathCount, runtimeCache[i]?.phase ?? Math.random() * 1000)
    );
  }

  for (let k = 0; k < 3; k++) {
    for (let i = 0; i < snapshotRuntime.length; i++) {
      const rt = snapshotRuntime[i];
      const path = scaledPaths[rt.pathIndex % scaledPaths.length];
      if (!path) continue;
      const progress =
        (((i / scaledParams.pointCount) * 1.618 +
          rt.phase * 0.0001 +
          (frame + k) * 0.0025) %
          1 +
          1) %
        1;
      const pos = computePointPosition(path, progress, scaledParams, frame + k);
      rt.trail.unshift({ x: pos.x, y: pos.y });
      if (rt.trail.length > scaledParams.trailLength) {
        rt.trail.length = scaledParams.trailLength;
      }
    }
  }

  drawBackground(ctx, outWidth, outHeight, false);

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < snapshotRuntime.length; i++) {
    const rt = snapshotRuntime[i];
    if (rt.trail.length < 2) continue;
    const hue =
      ((i / snapshotRuntime.length) * 360 + scaledParams.colorShift) % 360;
    for (let j = 1; j < rt.trail.length; j++) {
      const prev = rt.trail[j - 1];
      const curr = rt.trail[j];
      const alpha = 1 - j / scaledParams.trailLength;
      const lightness = 55 + alpha * 20;
      ctx.beginPath();
      ctx.strokeStyle = `hsla(${hue}, 100%, ${lightness}%, ${alpha})`;
      ctx.lineWidth = 1 + alpha * 2;
      ctx.shadowColor = `hsla(${hue}, 100%, 70%, ${alpha})`;
      ctx.shadowBlur = scaledParams.glowRadius * alpha;
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(curr.x, curr.y);
      ctx.stroke();
    }
    const head = rt.trail[0];
    if (head) {
      ctx.beginPath();
      ctx.fillStyle = `hsla(${hue}, 100%, 85%, 1)`;
      ctx.shadowColor = `hsla(${hue}, 100%, 70%, 1)`;
      ctx.shadowBlur = scaledParams.glowRadius * 1.6;
      ctx.arc(head.x, head.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();

  return canvas;
}

export function downloadPNG(
  canvas: HTMLCanvasElement,
  filename = 'light-painting.png'
): void {
  const url = canvas.toDataURL('image/png');
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

export function randomizeParams(): LightParams {
  return {
    angle: Math.floor(Math.random() * 360),
    amplitude: 20 + Math.floor(Math.random() * 180),
    frequency: 1 + Math.floor(Math.random() * 20),
    colorShift: Math.floor(Math.random() * 360),
    pointCount: 500 + Math.floor(Math.random() * 3500),
    trailLength: 60 + Math.floor(Math.random() * 140),
    glowRadius: 10 + Math.floor(Math.random() * 21)
  };
}
