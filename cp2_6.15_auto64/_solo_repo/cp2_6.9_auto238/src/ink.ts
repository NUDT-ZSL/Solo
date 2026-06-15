import type {
  Point,
  InkPoint,
  InkStroke,
  InkBranch,
  DiffusionArea,
  BrushSettings,
} from './types';

function random(min: number, max: number): number {
  return Math.random() * (max - min) + min;
}

function randomInt(min: number, max: number): number {
  return Math.floor(random(min, max + 1));
}

function distance(p1: Point, p2: Point): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function generateId(): string {
  return `stroke_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 26, g: 26, b: 26 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

export function mixColors(color1: string, color2: string, ratio: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return rgbToHex(
    lerp(c1.r, c2.r, ratio),
    lerp(c1.g, c2.g, ratio),
    lerp(c1.b, c2.b, ratio)
  );
}

export function createInkPoint(x: number, y: number, pressure: number = 1): InkPoint {
  return {
    x: x + random(-1.5, 1.5),
    y: y + random(-1.5, 1.5),
    pressure,
    timestamp: Date.now(),
  };
}

export function createStroke(settings: BrushSettings): InkStroke {
  const colorVariation = random(0, 1);
  const baseColor = mixColors('#1A1A1A', '#3A2A2A', colorVariation);
  const opacity = lerp(0.7, 1.0, settings.density / 100);

  return {
    id: generateId(),
    points: [],
    branches: [],
    color: baseColor,
    opacity,
    baseWidth: settings.size,
    createdAt: Date.now(),
    isActive: true,
    diffusionRadius: 0,
    diffusionComplete: false,
  };
}

function generateBranch(
  from: InkPoint,
  direction: Point,
  side: number,
  baseWidth: number
): InkBranch | null {
  if (Math.random() > 0.35) return null;

  const branchLength = random(5, 15);
  const angleOffset = random(30, 60) * (Math.PI / 180) * side;
  const baseAngle = Math.atan2(direction.y, direction.x);
  const finalAngle = baseAngle + angleOffset;

  const points: Point[] = [];
  const segments = randomInt(2, 5);

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const dist = branchLength * t;
    const wobble = random(-1, 1) * t;
    points.push({
      x: from.x + Math.cos(finalAngle) * dist + Math.sin(finalAngle) * wobble,
      y: from.y + Math.sin(finalAngle) * dist - Math.cos(finalAngle) * wobble,
    });
  }

  return {
    points,
    opacity: random(0.2, 0.5),
    color: '#4A3A3A',
    width: random(1, 3) * (baseWidth / 8),
  };
}

export function addPointToStroke(
  stroke: InkStroke,
  point: InkPoint,
  settings: BrushSettings
): void {
  const lastPoint = stroke.points[stroke.points.length - 1];
  stroke.points.push(point);

  if (lastPoint && stroke.points.length > 1) {
    const direction: Point = {
      x: point.x - lastPoint.x,
      y: point.y - lastPoint.y,
    };
    const len = Math.sqrt(direction.x ** 2 + direction.y ** 2);
    if (len > 0.1) {
      direction.x /= len;
      direction.y /= len;

      const leftBranch = generateBranch(point, direction, -1, settings.size);
      const rightBranch = generateBranch(point, direction, 1, settings.size);

      if (leftBranch) stroke.branches.push(leftBranch);
      if (rightBranch) stroke.branches.push(rightBranch);
    }
  }
}

export function finalizeStroke(stroke: InkStroke): void {
  stroke.isActive = false;
}

export function updateStrokeDiffusion(
  stroke: InkStroke,
  deltaTime: number
): boolean {
  if (stroke.diffusionComplete) return false;

  const diffusionSpeed = 4;
  const maxDiffusion = 5;
  const increment = diffusionSpeed * deltaTime;

  stroke.diffusionRadius = Math.min(maxDiffusion, stroke.diffusionRadius + increment);

  if (stroke.diffusionRadius >= maxDiffusion) {
    stroke.diffusionComplete = true;
    return false;
  }
  return true;
}

export function checkStrokeOverlap(
  stroke1: InkStroke,
  stroke2: InkStroke,
  threshold: number = 20
): boolean {
  for (let i = 0; i < stroke1.points.length; i += 3) {
    for (let j = 0; j < stroke2.points.length; j += 3) {
      if (distance(stroke1.points[i], stroke2.points[j]) < threshold) {
        return true;
      }
    }
  }
  return false;
}

export function createDiffusionAreas(
  stroke: InkStroke,
  bgColor: string
): DiffusionArea[] {
  const areas: DiffusionArea[] = [];
  const step = Math.max(2, Math.floor(stroke.points.length / 15));

  for (let i = 0; i < stroke.points.length; i += step) {
    const point = stroke.points[i];
    const mixRatio = random(0.4, 0.7);
    const diffuseColor = mixColors(stroke.color, bgColor, mixRatio);

    areas.push({
      centerX: point.x,
      centerY: point.y,
      radius: random(3, 8),
      color: diffuseColor,
      opacity: random(0.6, 0.9),
      blurRadius: random(2, 4),
      createdAt: Date.now(),
      duration: 500,
    });
  }

  return areas;
}

export function darkenStroke(stroke: InkStroke, amount: number = 0.1): void {
  stroke.opacity = Math.min(1, stroke.opacity + amount);
}

export function getStrokeLength(stroke: InkStroke): number {
  let length = 0;
  for (let i = 1; i < stroke.points.length; i++) {
    length += distance(stroke.points[i - 1], stroke.points[i]);
  }
  return length;
}

export function shouldMergeStrokes(
  stroke1: InkStroke,
  stroke2: InkStroke,
  distanceThreshold: number = 5,
  colorThreshold: number = 30
): boolean {
  const color1 = hexToRgb(stroke1.color);
  const color2 = hexToRgb(stroke2.color);
  const colorDist =
    Math.abs(color1.r - color2.r) +
    Math.abs(color1.g - color2.g) +
    Math.abs(color1.b - color2.b);

  if (colorDist > colorThreshold) return false;

  for (let i = 0; i < stroke1.points.length; i += 2) {
    for (let j = 0; j < stroke2.points.length; j += 2) {
      if (distance(stroke1.points[i], stroke2.points[j]) < distanceThreshold) {
        return true;
      }
    }
  }
  return false;
}

export function mergeStrokes(stroke1: InkStroke, stroke2: InkStroke): InkStroke {
  const allPoints = [...stroke1.points, ...stroke2.points].sort(
    (a, b) => a.timestamp - b.timestamp
  );

  return {
    id: stroke1.id,
    points: allPoints,
    branches: [...stroke1.branches, ...stroke2.branches],
    color: mixColors(stroke1.color, stroke2.color, 0.5),
    opacity: Math.max(stroke1.opacity, stroke2.opacity),
    baseWidth: (stroke1.baseWidth + stroke2.baseWidth) / 2,
    createdAt: Math.min(stroke1.createdAt, stroke2.createdAt),
    isActive: false,
    diffusionRadius: Math.max(stroke1.diffusionRadius, stroke2.diffusionRadius),
    diffusionComplete: stroke1.diffusionComplete && stroke2.diffusionComplete,
  };
}
