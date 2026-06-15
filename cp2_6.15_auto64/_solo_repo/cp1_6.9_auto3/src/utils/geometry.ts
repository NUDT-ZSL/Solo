export type ShapeType = 'triangle' | 'square' | 'hexagon';
export type ColorTheme = 'aurora' | 'lava' | 'deepsea' | 'flower';

export interface HSLColor {
  h: number;
  s: number;
  l: number;
  a: number;
}

export interface GeometricShape {
  id: string;
  type: ShapeType;
  gridX: number;
  gridY: number;
  baseX: number;
  baseY: number;
  currentX: number;
  currentY: number;
  size: number;
  rotation: number;
  baseRotation: number;
  baseColor: HSLColor;
  currentColor: HSLColor;
  targetColor: HSLColor;
  colorTransitionStart: number;
  colorTransitionDuration: number;
  isHovered: boolean;
  hoverStartTime: number;
  isExploded: boolean;
  reassembling: boolean;
  reassembleStartTime: number;
  reassembleDuration: number;
  reassembleFromX: number;
  reassembleFromY: number;
  reassembleFromRotation: number;
}

export interface Particle {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: HSLColor;
  startTime: number;
  duration: number;
  shapeId: string;
}

export interface GeometricConfig {
  shapeTypes: ShapeType[];
  colorTheme: ColorTheme;
  density: number;
}

export interface ThemePalette {
  name: ColorTheme;
  displayName: string;
  baseHues: number[];
  minSaturation: number;
  maxSaturation: number;
  minLightness: number;
  maxLightness: number;
  sidebarTint: number;
}

export const THEME_PALETTES: Record<ColorTheme, ThemePalette> = {
  aurora: {
    name: 'aurora',
    displayName: '极光',
    baseHues: [180, 220, 280],
    minSaturation: 65,
    maxSaturation: 90,
    minLightness: 45,
    maxLightness: 65,
    sidebarTint: 200
  },
  lava: {
    name: 'lava',
    displayName: '熔岩',
    baseHues: [15, 35, 50],
    minSaturation: 80,
    maxSaturation: 100,
    minLightness: 40,
    maxLightness: 60,
    sidebarTint: 25
  },
  deepsea: {
    name: 'deepsea',
    displayName: '深海',
    baseHues: [190, 220, 250],
    minSaturation: 60,
    maxSaturation: 85,
    minLightness: 30,
    maxLightness: 55,
    sidebarTint: 220
  },
  flower: {
    name: 'flower',
    displayName: '花海',
    baseHues: [330, 350, 20],
    minSaturation: 50,
    maxSaturation: 80,
    minLightness: 60,
    maxLightness: 85,
    sidebarTint: 340
  }
};

const EXPORT_WIDTH = 1920;
const EXPORT_HEIGHT = 1080;
const MAX_PARTICLES = 60;

export function densityToGridSize(density: number): number {
  return Math.round(3 + (density - 1) * (9 / 9));
}

export function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function hslToString(c: HSLColor): string {
  return `hsla(${c.h.toFixed(1)}, ${c.s.toFixed(1)}%, ${c.l.toFixed(1)}%, ${c.a.toFixed(3)})`;
}

export function cloneHSL(c: HSLColor): HSLColor {
  return { h: c.h, s: c.s, l: c.l, a: c.a };
}

export function interpolateHSL(a: HSLColor, b: HSLColor, t: number): HSLColor {
  let dh = b.h - a.h;
  if (dh > 180) dh -= 360;
  if (dh < -180) dh += 360;
  return {
    h: ((a.h + dh * t) % 360 + 360) % 360,
    s: lerp(a.s, b.s, t),
    l: lerp(a.l, b.l, t),
    a: lerp(a.a, b.a, t)
  };
}

export function cubicBezierPoint(
  p0x: number, p0y: number,
  p1x: number, p1y: number,
  p2x: number, p2y: number,
  p3x: number, p3y: number,
  t: number
): { x: number; y: number } {
  const u = 1 - t;
  const tt = t * t;
  const uu = u * u;
  const uuu = uu * u;
  const ttt = tt * t;
  const x = uuu * p0x + 3 * uu * t * p1x + 3 * u * tt * p2x + ttt * p3x;
  const y = uuu * p0y + 3 * uu * t * p1y + 3 * u * tt * p2y + ttt * p3y;
  return { x, y };
}

export function getShapeVertices(type: ShapeType, cx: number, cy: number, size: number, rotation: number): Array<{ x: number; y: number }> {
  const vertices: Array<{ x: number; y: number }> = [];
  let sides = 4;
  let angleOffset = -Math.PI / 2;
  if (type === 'triangle') {
    sides = 3;
    angleOffset = -Math.PI / 2;
  } else if (type === 'hexagon') {
    sides = 6;
    angleOffset = 0;
  } else if (type === 'square') {
    sides = 4;
    angleOffset = -Math.PI / 4;
  }
  const r = size / 2;
  for (let i = 0; i < sides; i++) {
    const angle = angleOffset + (2 * Math.PI * i) / sides + rotation;
    vertices.push({
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle)
    });
  }
  return vertices;
}

export function pointInPolygon(px: number, py: number, vertices: Array<{ x: number; y: number }>): boolean {
  let inside = false;
  const n = vertices.length;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = vertices[i].x, yi = vertices[i].y;
    const xj = vertices[j].x, yj = vertices[j].y;
    const intersect = ((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function pointInShape(px: number, py: number, shape: GeometricShape): boolean {
  const vertices = getShapeVertices(shape.type, shape.currentX, shape.currentY, shape.size, shape.rotation);
  return pointInPolygon(px, py, vertices);
}

export function findShapeAtPoint(
  px: number, py: number,
  shapes: GeometricShape[]
): GeometricShape | null {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i];
    if (s.isExploded) continue;
    if (pointInShape(px, py, s)) return s;
  }
  return null;
}

export function generateShapes(config: GeometricConfig, width: number, height: number): GeometricShape[] {
  const gridSize = densityToGridSize(config.density);
  const palette = THEME_PALETTES[config.colorTheme];
  const cellW = width / gridSize;
  const cellH = height / gridSize;
  const shapes: GeometricShape[] = [];
  for (let gy = 0; gy < gridSize; gy++) {
    for (let gx = 0; gx < gridSize; gx++) {
      const typeIdx = Math.floor(Math.random() * config.shapeTypes.length);
      const type = config.shapeTypes[typeIdx];
      const baseSize = Math.min(cellW, cellH) * 0.88;
      const sizeJitter = 0.9 + Math.random() * 0.2;
      const size = baseSize * sizeJitter;
      const baseX = cellW * (gx + 0.5);
      const baseY = cellH * (gy + 0.5);
      const hueIdx = Math.floor(Math.random() * palette.baseHues.length);
      const baseHue = palette.baseHues[hueIdx];
      const hueShift = (Math.random() - 0.5) * 60;
      const neighborOffset = (gx + gy) % 2 === 0 ? 0 : 30 + Math.random() * 30;
      const hue = ((baseHue + hueShift + neighborOffset) % 360 + 360) % 360;
      const saturation = palette.minSaturation + Math.random() * (palette.maxSaturation - palette.minSaturation);
      const lightness = palette.minLightness + Math.random() * (palette.maxLightness - palette.minLightness);
      const baseColor: HSLColor = { h: hue, s: saturation, l: lightness, a: 1 };
      const baseRotation = type === 'square' ? 0 : (Math.random() - 0.5) * 0.3;
      shapes.push({
        id: `s_${gx}_${gy}_${Math.random().toString(36).slice(2, 7)}`,
        type,
        gridX: gx,
        gridY: gy,
        baseX,
        baseY,
        currentX: baseX,
        currentY: baseY,
        size,
        rotation: baseRotation,
        baseRotation,
        baseColor: cloneHSL(baseColor),
        currentColor: cloneHSL(baseColor),
        targetColor: cloneHSL(baseColor),
        colorTransitionStart: 0,
        colorTransitionDuration: 0,
        isHovered: false,
        hoverStartTime: 0,
        isExploded: false,
        reassembling: false,
        reassembleStartTime: 0,
        reassembleDuration: 0,
        reassembleFromX: baseX,
        reassembleFromY: baseY,
        reassembleFromRotation: baseRotation
      });
    }
  }
  return shapes;
}

export function updateColorsForTheme(
  shapes: GeometricShape[],
  theme: ColorTheme,
  startTime: number
): void {
  const palette = THEME_PALETTES[theme];
  const gridColors: Record<string, HSLColor> = {};
  shapes.forEach(s => {
    gridColors[`${s.gridX}_${s.gridY}`] = cloneHSL(s.baseColor);
  });
  shapes.forEach(s => {
    const hueIdx = Math.floor(((s.gridX * 7 + s.gridY * 13)) % palette.baseHues.length);
    const baseHue = palette.baseHues[hueIdx];
    const oldColor = gridColors[`${s.gridX}_${s.gridY}`];
    const relHue = ((oldColor.h - palette.baseHues[0]) % 360 + 360) % 360;
    const hue = ((baseHue + (relHue < 180 ? relHue : relHue - 360)) % 360 + 360) % 360;
    const satRatio = (oldColor.s - THEME_PALETTES[findOriginalThemeFromHue(oldColor.h) ?? theme].minSaturation) /
      Math.max(1, THEME_PALETTES[findOriginalThemeFromHue(oldColor.h) ?? theme].maxSaturation - THEME_PALETTES[findOriginalThemeFromHue(oldColor.h) ?? theme].minSaturation);
    const saturation = palette.minSaturation + Math.max(0, Math.min(1, isFinite(satRatio) ? satRatio : 0.5)) * (palette.maxSaturation - palette.minSaturation);
    const lightRatio = (oldColor.l - THEME_PALETTES[findOriginalThemeFromHue(oldColor.h) ?? theme].minLightness) /
      Math.max(1, THEME_PALETTES[findOriginalThemeFromHue(oldColor.h) ?? theme].maxLightness - THEME_PALETTES[findOriginalThemeFromHue(oldColor.h) ?? theme].minLightness);
    const lightness = palette.minLightness + Math.max(0, Math.min(1, isFinite(lightRatio) ? lightRatio : 0.5)) * (palette.maxLightness - palette.minLightness);
    s.targetColor = { h: hue, s: saturation, l: lightness, a: 1 };
    s.baseColor = cloneHSL(s.currentColor);
    s.colorTransitionStart = startTime;
    s.colorTransitionDuration = 800;
  });
}

function findOriginalThemeFromHue(_h: number): ColorTheme | null {
  return null;
}

export function createExplosionParticles(
  shape: GeometricShape,
  startTime: number
): Particle[] {
  const count = 8 + Math.floor(Math.random() * 5);
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const speed = 80 + Math.random() * 180;
    particles.push({
      id: `p_${shape.id}_${i}_${Math.random().toString(36).slice(2, 6)}`,
      x: shape.currentX + (Math.random() - 0.5) * shape.size * 0.3,
      y: shape.currentY + (Math.random() - 0.5) * shape.size * 0.3,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 2,
      color: { h: shape.currentColor.h, s: shape.currentColor.s, l: shape.currentColor.l, a: 1 },
      startTime,
      duration: 1500,
      shapeId: shape.id
    });
  }
  return particles;
}

export function addParticlesWithLimit(all: Particle[], incoming: Particle[]): Particle[] {
  const merged = [...all, ...incoming];
  if (merged.length > MAX_PARTICLES) {
    return merged.slice(merged.length - MAX_PARTICLES);
  }
  return merged;
}

export function triggerReassemble(shapes: GeometricShape[], particles: Particle[], startTime: number): { shapes: GeometricShape[]; removedIds: Set<string> } {
  const removedIds = new Set<string>();
  const updated = shapes.map(s => {
    let fromX = s.currentX;
    let fromY = s.currentY;
    let fromRot = s.rotation;
    if (s.isExploded) {
      const related = particles.filter(p => p.shapeId === s.id);
      if (related.length > 0) {
        const avgX = related.reduce((sum, p) => sum + p.x, 0) / related.length;
        const avgY = related.reduce((sum, p) => sum + p.y, 0) / related.length;
        fromX = avgX;
        fromY = avgY;
      }
      related.forEach(p => removedIds.add(p.id));
    }
    return {
      ...s,
      reassembling: true,
      reassembleStartTime: startTime + Math.random() * 300,
      reassembleDuration: 500 + Math.random() * 1500,
      reassembleFromX: fromX,
      reassembleFromY: fromY,
      reassembleFromRotation: fromRot,
      isExploded: false
    };
  });
  return { shapes: updated, removedIds };
}

export function getExportDimensions(): { w: number; h: number } {
  return { w: EXPORT_WIDTH, h: EXPORT_HEIGHT };
}

export function drawShapeOnContext(
  ctx: CanvasRenderingContext2D,
  shape: GeometricShape,
  x: number, y: number, rotation: number, color: HSLColor
): void {
  const verts = getShapeVertices(shape.type, x, y, shape.size, rotation);
  ctx.beginPath();
  ctx.moveTo(verts[0].x, verts[0].y);
  for (let i = 1; i < verts.length; i++) {
    ctx.lineTo(verts[i].x, verts[i].y);
  }
  ctx.closePath();
  ctx.fillStyle = hslToString(color);
  ctx.fill();
  ctx.strokeStyle = `hsla(${color.h}, ${color.s}%, ${Math.max(color.l - 15, 5)}%, ${Math.min(color.a * 1.2, 1)})`;
  ctx.lineWidth = 1.2;
  ctx.stroke();
}

export function generateShareDataURI(shapes: GeometricShape[], config: GeometricConfig): string {
  const snapshot = shapes.map(s => ({
    t: s.type,
    gx: s.gridX,
    gy: s.gridY,
    bx: Number(s.baseX.toFixed(2)),
    by: Number(s.baseY.toFixed(2)),
    sz: Number(s.size.toFixed(2)),
    br: Number(s.baseRotation.toFixed(4)),
    bh: Number(s.targetColor.h.toFixed(1)),
    bs: Number(s.targetColor.s.toFixed(1)),
    bl: Number(s.targetColor.l.toFixed(1))
  }));
  const payload = { v: 1, cfg: config, shapes: snapshot };
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  return `data:application/json;base64,${encoded}`;
}

export function parseShareDataURI(uri: string): { config: GeometricConfig; shapes: Array<Record<string, number | string>> } | null {
  try {
    const match = uri.match(/^data:application\/json;base64,(.+)$/);
    if (!match) return null;
    const decoded = JSON.parse(decodeURIComponent(escape(atob(match[1]))));
    if (!decoded.v || !decoded.cfg || !decoded.shapes) return null;
    return decoded;
  } catch {
    return null;
  }
}
