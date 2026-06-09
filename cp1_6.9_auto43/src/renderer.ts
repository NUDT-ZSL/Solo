import { Shard, getWorldVertices, Point } from './shapes';

export interface RendererState {
  shards: Shard[];
  selectedId: number | null;
  victory: boolean;
  victoryProgress: number;
  ripples: RippleEffect[];
  flashAlpha: number;
  elapsedSeconds: number;
  showMirrorImage: boolean;
  mirrorImageAlpha: number;
}

export interface RippleEffect {
  startTime: number;
  duration: number;
  maxRadius: number;
  width: number;
}

const CANVAS_SIZE = 800;
const MIRROR_SIZE = 128;

let texturePattern: CanvasPattern | null = null;
let textureCanvas: HTMLCanvasElement | null = null;
let mirrorImageCanvas: HTMLCanvasElement | null = null;

function buildTextureCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = MIRROR_SIZE;
  c.height = MIRROR_SIZE;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, MIRROR_SIZE, MIRROR_SIZE);
  grad.addColorStop(0, '#FF4500');
  grad.addColorStop(0.25, '#FF6347');
  grad.addColorStop(0.5, '#FF8C00');
  grad.addColorStop(0.75, '#FFA500');
  grad.addColorStop(1, '#FFD700');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, MIRROR_SIZE, MIRROR_SIZE);
  ctx.globalAlpha = 0.3;
  for (let i = -MIRROR_SIZE; i < MIRROR_SIZE * 2; i += 12) {
    const hue = 0 + (i / MIRROR_SIZE) * 60;
    ctx.strokeStyle = `hsl(${hue}, 100%, 60%)`;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(i, -20);
    ctx.lineTo(i + MIRROR_SIZE * 1.5, MIRROR_SIZE + 20);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return c;
}

function buildMirrorImageCanvas(): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = MIRROR_SIZE;
  c.height = MIRROR_SIZE;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(64, 64, 5, 64, 64, 64);
  g.addColorStop(0, '#FFFFFF');
  g.addColorStop(0.3, '#E0BBE4');
  g.addColorStop(0.6, '#957DAD');
  g.addColorStop(1, '#553C9A');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, MIRROR_SIZE, MIRROR_SIZE);
  ctx.save();
  ctx.translate(64, 64);
  for (let i = 0; i < 8; i++) {
    ctx.rotate(Math.PI / 4);
    ctx.strokeStyle = `hsla(${i * 45}, 100%, 80%, 0.6)`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(55, 0);
    ctx.stroke();
  }
  ctx.restore();
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 40px serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.globalAlpha = 0.85;
  ctx.fillText('✦', 64, 64);
  ctx.globalAlpha = 1;
  return c;
}

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
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
    r = hue2rgb(p, q, h / 360 + 1 / 3);
    g = hue2rgb(p, q, h / 360);
    b = hue2rgb(p, q, h / 360 - 1 / 3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

function drawStarfield(ctx: CanvasRenderingContext2D): void {
  ctx.fillStyle = '#0B0B1A';
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  const starCount = 200;
  for (let i = 0; i < starCount; i++) {
    const x = (Math.sin(i * 99.13) * 0.5 + 0.5) * CANVAS_SIZE;
    const y = (Math.cos(i * 73.47) * 0.5 + 0.5) * CANVAS_SIZE;
    const size = (Math.sin(i * 13.7) * 0.5 + 0.5) * 1.5 + 0.3;
    const alpha = (Math.sin(i * 5.3) * 0.5 + 0.5) * 0.6 + 0.2;
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
    ctx.fillRect(x, y, size, size);
  }
}

function drawProgressRing(ctx: CanvasRenderingContext2D, placedCount: number, total: number): void {
  const centerX = CANVAS_SIZE / 2;
  const centerY = CANVAS_SIZE / 2;
  const radius = 440;
  const segments = 12;
  const segmentAngle = (Math.PI * 2) / segments;
  const gap = 0.02;
  const hues = [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330];
  const progress = placedCount / total;
  const activeSegments = Math.floor(progress * segments);

  for (let i = 0; i < segments; i++) {
    const start = -Math.PI / 2 + i * segmentAngle + gap;
    const end = -Math.PI / 2 + (i + 1) * segmentAngle - gap;
    const isActive = i < activeSegments;
    const isCurrent = i === activeSegments && placedCount > 0;
    let alpha = 0.2;
    let lineWidth = 4;
    if (isActive) {
      alpha = 0.8;
      lineWidth = 6;
    } else if (isCurrent) {
      alpha = 0.5;
      lineWidth = 5;
    }
    ctx.strokeStyle = `hsla(${hues[i]}, 90%, 65%, ${alpha})`;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, start, end);
    ctx.stroke();
  }
}

function buildPolygonPath(ctx: CanvasRenderingContext2D, verts: Point[]): void {
  ctx.beginPath();
  ctx.moveTo(verts[0].x, verts[0].y);
  for (let i = 1; i < verts.length; i++) {
    ctx.lineTo(verts[i].x, verts[i].y);
  }
  ctx.closePath();
}

function getEdgeColor(
  shard: Shard,
  selected: boolean,
  victory: boolean,
  snapHighlight: number
): { color: string; glowColor: string; lineWidth: number } {
  if (victory) {
    return { color: '#FFD700', glowColor: '#FFD700', lineWidth: 2 };
  }
  if (snapHighlight > 0) {
    return { color: '#FFD700', glowColor: '#FFD700', lineWidth: 2 };
  }
  if (shard.flashWhite > 0) {
    return { color: '#FFFFFF', glowColor: '#FFFFFF', lineWidth: 2 };
  }
  if (selected) {
    return { color: '#00E5FF', glowColor: '#00E5FF', lineWidth: 2 };
  }
  const hue = shard.hue;
  return {
    color: `hsla(${hue}, 100%, 85%, 0.4)`,
    glowColor: `hsla(${hue}, 100%, 75%, 0.4)`,
    lineWidth: 1.5
  };
}

function drawShard(
  ctx: CanvasRenderingContext2D,
  shard: Shard,
  selected: boolean,
  victory: boolean,
  snapHighlight: number
): void {
  if (!textureCanvas || !texturePattern) return;

  const worldVerts = getWorldVertices(shard);
  const shadowOffset = selected ? 4 : 2;
  const shadowBlur = selected ? 6 : 4;

  ctx.save();
  ctx.shadowColor = `rgba(0, 0, 0, 0.3)`;
  ctx.shadowOffsetX = shadowOffset;
  ctx.shadowOffsetY = shadowOffset;
  ctx.shadowBlur = shadowBlur;
  buildPolygonPath(ctx, worldVerts);
  ctx.fillStyle = 'rgba(0,0,0,0.01)';
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(shard.position.x - shard.centroid.x, shard.position.y - shard.centroid.y);
  ctx.translate(shard.centroid.x, shard.centroid.y);
  ctx.rotate(shard.rotation);
  ctx.translate(-shard.centroid.x, -shard.centroid.y);

  buildPolygonPath(ctx, shard.vertices);
  ctx.save();
  ctx.clip();

  ctx.drawImage(textureCanvas, -MIRROR_SIZE / 2, -MIRROR_SIZE / 2, MIRROR_SIZE, MIRROR_SIZE);
  ctx.restore();

  const opacity = shard.isPlaced ? 1.0 : 0.8;
  if (opacity < 1) {
    ctx.save();
    ctx.globalAlpha = 1 - opacity;
    buildPolygonPath(ctx, shard.vertices);
    ctx.fillStyle = '#0B0B1A';
    ctx.fill();
    ctx.restore();
  }

  ctx.restore();

  const { color, glowColor, lineWidth } = getEdgeColor(shard, selected, victory, snapHighlight);
  const brightness = shard.edgeBrightness;

  ctx.save();
  buildPolygonPath(ctx, worldVerts);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth * brightness;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.shadowColor = glowColor;
  ctx.shadowBlur = (selected ? 15 : 8) * brightness;
  ctx.stroke();
  ctx.restore();

  if (snapHighlight > 0) {
    ctx.save();
    ctx.globalAlpha = snapHighlight;
    buildPolygonPath(ctx, worldVerts);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 25;
    ctx.stroke();
    ctx.restore();
  }

  if (shard.flashWhite > 0) {
    ctx.save();
    ctx.globalAlpha = shard.flashWhite * 3;
    buildPolygonPath(ctx, worldVerts);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }
}

function drawRipples(
  ctx: CanvasRenderingContext2D,
  ripples: RippleEffect[],
  now: number
): void {
  const centerX = CANVAS_SIZE / 2;
  const centerY = CANVAS_SIZE / 2;
  for (const ripple of ripples) {
    const t = (now - ripple.startTime) / ripple.duration;
    if (t >= 1 || t < 0) continue;
    const radius = t * ripple.maxRadius;
    const alpha = 1 - t;
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const innerR = radius - ripple.width / 2 + i * (ripple.width / 4);
      const hue = 300 + (i / 4) * 180;
      ctx.strokeStyle = `hsla(${hue % 360}, 100%, 70%, ${alpha * 0.6})`;
      ctx.lineWidth = 4;
      ctx.shadowColor = `hsla(${hue % 360}, 100%, 70%, ${alpha})`;
      ctx.shadowBlur = 20;
      ctx.beginPath();
      ctx.arc(centerX, centerY, Math.max(0, innerR), 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawMirrorImage(ctx: CanvasRenderingContext2D, alpha: number): void {
  if (!mirrorImageCanvas) return;
  const centerX = CANVAS_SIZE / 2;
  const centerY = CANVAS_SIZE / 2;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(
    mirrorImageCanvas,
    centerX - MIRROR_SIZE / 2,
    centerY - MIRROR_SIZE / 2,
    MIRROR_SIZE,
    MIRROR_SIZE
  );
  ctx.shadowColor = '#FFFFFF';
  ctx.shadowBlur = 40 * alpha;
  ctx.strokeStyle = `rgba(255, 215, 0, ${alpha})`;
  ctx.lineWidth = 2;
  ctx.strokeRect(
    centerX - MIRROR_SIZE / 2,
    centerY - MIRROR_SIZE / 2,
    MIRROR_SIZE,
    MIRROR_SIZE
  );
  ctx.restore();
}

function drawFlash(ctx: CanvasRenderingContext2D, alpha: number): void {
  if (alpha <= 0) return;
  ctx.save();
  ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
  ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  ctx.restore();
}

function drawTimer(ctx: CanvasRenderingContext2D, elapsed: number): void {
  const mins = Math.floor(elapsed / 60);
  const secs = Math.floor(elapsed % 60);
  const mm = String(mins).padStart(2, '0');
  const ss = String(secs).padStart(2, '0');
  ctx.save();
  ctx.font = '16px "Segoe UI", sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0, 229, 255, 0.8)';
  ctx.shadowBlur = 4;
  ctx.fillText(`${mm}:${ss}`, CANVAS_SIZE - 20, 20);
  ctx.restore();
}

export function initRenderer(): void {
  textureCanvas = buildTextureCanvas();
  mirrorImageCanvas = buildMirrorImageCanvas();
  const tmpCtx = textureCanvas.getContext('2d')!;
  texturePattern = tmpCtx.createPattern(textureCanvas, 'no-repeat');
}

export function renderFrame(
  ctx: CanvasRenderingContext2D,
  state: RendererState,
  snapHighlights: Map<number, number>,
  now: number
): void {
  if (!textureCanvas) initRenderer();

  drawStarfield(ctx);

  const placedCount = state.shards.filter(s => s.isPlaced).length;
  drawProgressRing(ctx, placedCount, state.shards.length);

  if (state.victory && state.showMirrorImage) {
    drawMirrorImage(ctx, state.mirrorImageAlpha);
  }

  const sortedShards = [...state.shards].sort((a, b) => {
    if (state.selectedId === a.id) return 1;
    if (state.selectedId === b.id) return -1;
    return a.id - b.id;
  });

  for (const shard of sortedShards) {
    const selected = state.selectedId === shard.id;
    const snapH = snapHighlights.get(shard.id) || 0;
    drawShard(ctx, shard, selected, state.victory, snapH);
  }

  drawRipples(ctx, state.ripples, now);
  drawFlash(ctx, state.flashAlpha);
  drawTimer(ctx, state.elapsedSeconds);
}

export function createRipple(): RippleEffect {
  return {
    startTime: performance.now(),
    duration: 1500,
    maxRadius: 200,
    width: 20
  };
}
