export type ShapeType = 'circle' | 'triangle' | 'hexagon';
export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay';

export interface ShapePath {
  path: Path2D;
  points: { x: number; y: number }[];
}

export interface RenderInstruction {
  path: Path2D;
  fillColors: { r: number; g: number; b: number }[];
  strokeColor: string;
  strokeWidth: number;
  glowColor: string;
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function rotatePoint(x: number, y: number, cx: number, cy: number, angle: number): { x: number; y: number } {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const dx = x - cx;
  const dy = y - cy;
  return {
    x: cx + dx * cos - dy * sin,
    y: cy + dx * sin + dy * cos
  };
}

export function createShape(
  type: ShapeType,
  size: number,
  rotation: number,
  centerX: number,
  centerY: number
): ShapePath {
  const path = new Path2D();
  const points: { x: number; y: number }[] = [];
  const angle = degToRad(rotation);
  const half = size / 2;

  if (type === 'circle') {
    path.arc(centerX, centerY, half, 0, Math.PI * 2);
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * Math.PI * 2;
      points.push({
        x: centerX + Math.cos(a) * half,
        y: centerY + Math.sin(a) * half
      });
    }
  } else if (type === 'triangle') {
    const h = (size * Math.sqrt(3)) / 2;
    const top = { x: centerX, y: centerY - h * 2 / 3 };
    const bl = { x: centerX - half, y: centerY + h / 3 };
    const br = { x: centerX + half, y: centerY + h / 3 };
    const p1 = rotatePoint(top.x, top.y, centerX, centerY, angle);
    const p2 = rotatePoint(bl.x, bl.y, centerX, centerY, angle);
    const p3 = rotatePoint(br.x, br.y, centerX, centerY, angle);
    path.moveTo(p1.x, p1.y);
    path.lineTo(p2.x, p2.y);
    path.lineTo(p3.x, p3.y);
    path.closePath();
    points.push(p1, p2, p3);
  } else if (type === 'hexagon') {
    for (let i = 0; i < 6; i++) {
      const a = degToRad(i * 60 - 90 + rotation);
      const pt = {
        x: centerX + Math.cos(a) * half,
        y: centerY + Math.sin(a) * half
      };
      points.push(pt);
      if (i === 0) path.moveTo(pt.x, pt.y);
      else path.lineTo(pt.x, pt.y);
    }
    path.closePath();
  }

  return { path, points };
}

export function pointInShape(
  px: number,
  py: number,
  type: ShapeType,
  size: number,
  rotation: number,
  centerX: number,
  centerY: number
): boolean {
  const angle = degToRad(-rotation);
  const rotated = rotatePoint(px, py, centerX, centerY, angle);
  const dx = rotated.x - centerX;
  const dy = rotated.y - centerY;
  const half = size / 2;

  if (type === 'circle') {
    return dx * dx + dy * dy <= half * half;
  } else if (type === 'triangle') {
    const h = (size * Math.sqrt(3)) / 2;
    const x1 = centerX, y1 = centerY - h * 2 / 3;
    const x2 = centerX - half, y2 = centerY + h / 3;
    const x3 = centerX + half, y3 = centerY + h / 3;
    const A = 0.5 * (-y2 * x3 + y1 * (-x2 + x3) + x1 * (y2 - y3) + x2 * y3);
    const sign = A < 0 ? -1 : 1;
    const s = (y1 * x3 - x1 * y3 + (y3 - y1) * rotated.x + (x1 - x3) * rotated.y) * sign;
    const t = (x1 * y2 - y1 * x2 + (y1 - y2) * rotated.x + (x2 - x1) * rotated.y) * sign;
    return s > 0 && t > 0 && (s + t) < 2 * A * sign;
  } else if (type === 'hexagon') {
    const r = half;
    const qx = Math.abs(dx);
    const qy = Math.abs(dy);
    return qy <= r * Math.sqrt(3) / 2 && qx * Math.sqrt(3) / 2 + qy / 2 <= r;
  }
  return false;
}

export function getShapePixelRegion(
  type: ShapeType,
  size: number,
  rotation: number,
  centerX: number,
  centerY: number,
  imagePixelData: ImageData,
  imageX: number,
  imageY: number,
  imageWidth: number,
  imageHeight: number
): { r: number; g: number; b: number }[] {
  const colors: { r: number; g: number; b: number }[] = [];
  const half = size / 2;
  const step = Math.max(1, Math.floor(size / 30));

  for (let dy = -half; dy <= half; dy += step) {
    for (let dx = -half; dx <= half; dx += step) {
      const px = centerX + dx;
      const py = centerY + dy;
      if (!pointInShape(px, py, type, size, rotation, centerX, centerY)) continue;

      const localX = px - imageX;
      const localY = py - imageY;
      const scaleX = imagePixelData.width / imageWidth;
      const scaleY = imagePixelData.height / imageHeight;
      const dataX = Math.floor(localX * scaleX);
      const dataY = Math.floor(localY * scaleY);

      if (dataX >= 0 && dataX < imagePixelData.width && dataY >= 0 && dataY < imagePixelData.height) {
        const idx = (dataY * imagePixelData.width + dataX) * 4;
        colors.push({
          r: imagePixelData.data[idx],
          g: imagePixelData.data[idx + 1],
          b: imagePixelData.data[idx + 2]
        });
      }
    }
  }

  if (colors.length === 0) {
    colors.push({ r: 0, g: 255, b: 255 });
  }
  return colors;
}

function clampChannel(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

export function applyBlendMode(
  baseColor: { r: number; g: number; b: number },
  blendColor: { r: number; g: number; b: number },
  mode: BlendMode,
  opacity: number
): { r: number; g: number; b: number } {
  const a = opacity / 100;
  let result = { ...blendColor };

  switch (mode) {
    case 'normal':
      result = blendColor;
      break;
    case 'multiply':
      result = {
        r: (baseColor.r * blendColor.r) / 255,
        g: (baseColor.g * blendColor.g) / 255,
        b: (baseColor.b * blendColor.b) / 255
      };
      break;
    case 'screen':
      result = {
        r: 255 - ((255 - baseColor.r) * (255 - blendColor.r)) / 255,
        g: 255 - ((255 - baseColor.g) * (255 - blendColor.g)) / 255,
        b: 255 - ((255 - baseColor.b) * (255 - blendColor.b)) / 255
      };
      break;
    case 'overlay': {
      const overlayChannel = (b: number, t: number) =>
        b < 128 ? (2 * b * t) / 255 : 255 - (2 * (255 - b) * (255 - t)) / 255;
      result = {
        r: overlayChannel(baseColor.r, blendColor.r),
        g: overlayChannel(baseColor.g, blendColor.g),
        b: overlayChannel(baseColor.b, blendColor.b)
      };
      break;
    }
  }

  return {
    r: clampChannel(baseColor.r * (1 - a) + result.r * a),
    g: clampChannel(baseColor.g * (1 - a) + result.g * a),
    b: clampChannel(baseColor.b * (1 - a) + result.b * a)
  };
}

export function getAveragePixelColor(
  colors: { r: number; g: number; b: number }[]
): { r: number; g: number; b: number } {
  if (colors.length === 0) return { r: 0, g: 255, b: 255 };
  let r = 0, g = 0, b = 0;
  for (const c of colors) {
    r += c.r;
    g += c.g;
    b += c.b;
  }
  return {
    r: Math.floor(r / colors.length),
    g: Math.floor(g / colors.length),
    b: Math.floor(b / colors.length)
  };
}
