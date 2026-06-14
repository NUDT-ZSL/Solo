export interface CSSRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: 'gradient' | 'shadow' | 'border-radius' | 'mixed';
  properties: {
    background?: string;
    boxShadow?: string;
    borderRadius?: string;
    primaryColor?: string;
  };
}

interface RGB {
  r: number;
  g: number;
  b: number;
  a: number;
}

function getPixel(data: Uint8ClampedArray, width: number, x: number, y: number): RGB {
  const idx = (Math.floor(y) * width + Math.floor(x)) * 4;
  return { r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3] };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}

function rgbaToString(r: number, g: number, b: number, a: number): string {
  if (a >= 255) return rgbToHex(r, g, b);
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${(a / 255).toFixed(2)})`;
}

function colorDistance(c1: RGB, c2: RGB): number {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

export function getAverageColor(
  imageData: ImageData,
  x: number,
  y: number,
  w: number,
  h: number
): string {
  const { data, width, height } = imageData;
  const sx = Math.max(0, Math.floor(x));
  const sy = Math.max(0, Math.floor(y));
  const ex = Math.min(width - 1, Math.floor(x + w));
  const ey = Math.min(height - 1, Math.floor(y + h));
  
  let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
  
  for (let py = sy; py <= ey; py += 2) {
    for (let px = sx; px <= ex; px += 2) {
      const c = getPixel(data, width, px, py);
      rSum += c.r; gSum += c.g; bSum += c.b; aSum += c.a;
      count++;
    }
  }
  
  if (count === 0) return '#000000';
  return rgbaToString(rSum / count, gSum / count, bSum / count, aSum / count);
}

function sampleEdgeColors(
  imageData: ImageData,
  x: number, y: number, w: number, h: number
): { top: RGB[]; bottom: RGB[]; left: RGB[]; right: RGB[] } {
  const { data, width } = imageData;
  const top: RGB[] = [];
  const bottom: RGB[] = [];
  const left: RGB[] = [];
  const right: RGB[] = [];
  const step = Math.max(1, Math.floor(w / 20));
  
  for (let px = 0; px < w; px += step) {
    top.push(getPixel(data, width, x + px, y));
    bottom.push(getPixel(data, width, x + px, y + h - 1));
  }
  for (let py = 0; py < h; py += step) {
    left.push(getPixel(data, width, x, y + py));
    right.push(getPixel(data, width, x + w - 1, y + py));
  }
  return { top, bottom, left, right };
}

export function analyzeGradient(
  imageData: ImageData,
  x: number, y: number, w: number, h: number
): string {
  const { top, bottom, left, right } = sampleEdgeColors(imageData, x, y, w, h);
  
  const avg = (arr: RGB[]) => {
    if (arr.length === 0) return { r: 0, g: 0, b: 0, a: 255 };
    return {
      r: arr.reduce((s, c) => s + c.r, 0) / arr.length,
      g: arr.reduce((s, c) => s + c.g, 0) / arr.length,
      b: arr.reduce((s, c) => s + c.b, 0) / arr.length,
      a: arr.reduce((s, c) => s + c.a, 0) / arr.length,
    };
  };
  
  const topAvg = avg(top);
  const bottomAvg = avg(bottom);
  const leftAvg = avg(left);
  const rightAvg = avg(right);
  
  const vDist = colorDistance(topAvg, bottomAvg);
  const hDist = colorDistance(leftAvg, rightAvg);
  
  const primary = getAverageColor(imageData, x, y, w, h);
  
  if (vDist < 25 && hDist < 25) {
    return primary;
  }
  
  if (vDist >= hDist) {
    const startColor = rgbaToString(topAvg.r, topAvg.g, topAvg.b, topAvg.a);
    const endColor = rgbaToString(bottomAvg.r, bottomAvg.g, bottomAvg.b, bottomAvg.a);
    return `linear-gradient(to bottom, ${startColor} 0%, ${endColor} 100%)`;
  } else {
    const startColor = rgbaToString(leftAvg.r, leftAvg.g, leftAvg.b, leftAvg.a);
    const endColor = rgbaToString(rightAvg.r, rightAvg.g, rightAvg.b, rightAvg.a);
    return `linear-gradient(to right, ${startColor} 0%, ${endColor} 100%)`;
  }
}

function isNearTransparent(c: RGB): boolean {
  return c.a < 30;
}

function getSurroundingAlpha(
  data: Uint8ClampedArray, width: number,
  cx: number, cy: number, radius: number
): { outer: number[]; inner: number[] } {
  const outer: number[] = [];
  const inner: number[] = [];
  
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist >= radius - 1 && dist <= radius + 2) {
        const px = cx + dx;
        const py = cy + dy;
        if (px >= 0 && py >= 0 && px < width) {
          const c = getPixel(data, width, px, py);
          outer.push(c.a);
        }
      }
      if (dist <= radius - 3) {
        const px = cx + dx;
        const py = cy + dy;
        if (px >= 0 && py >= 0 && px < width) {
          const c = getPixel(data, width, px, py);
          inner.push(c.a);
        }
      }
    }
  }
  return { outer, inner };
}

export function analyzeBorderRadius(
  imageData: ImageData,
  x: number, y: number, w: number, h: number
): string {
  const { data, width } = imageData;
  const testRadius = Math.min(40, Math.floor(Math.min(w, h) / 4));
  
  const corners = [
    { cx: x + testRadius, cy: y + testRadius, name: 'tl' },
    { cx: x + w - testRadius - 1, cy: y + testRadius, name: 'tr' },
    { cx: x + testRadius, cy: y + h - testRadius - 1, name: 'bl' },
    { cx: x + w - testRadius - 1, cy: y + h - testRadius - 1, name: 'br' },
  ];
  
  let hasRounded = false;
  let estimatedRadius = 0;
  
  for (const corner of corners) {
    for (let r = 4; r <= testRadius; r += 2) {
      const { outer, inner } = getSurroundingAlpha(data, width, corner.cx, corner.cy, r);
      const outerAvg = outer.length ? outer.reduce((s, a) => s + a, 0) / outer.length : 0;
      const innerAvg = inner.length ? inner.reduce((s, a) => s + a, 0) / inner.length : 0;
      
      if (innerAvg > 200 && outerAvg < 100) {
        hasRounded = true;
        estimatedRadius = Math.max(estimatedRadius, r);
        break;
      }
    }
  }
  
  if (!hasRounded) {
    const bg = getPixel(data, width, Math.max(0, x - 2), Math.max(0, y - 2));
    if (bg.a < 50) return '0px';
    return '4px';
  }
  
  return `${estimatedRadius}px`;
}

export function analyzeShadow(
  imageData: ImageData,
  x: number, y: number, w: number, h: number
): string {
  const { data, width, height } = imageData;
  const sampleSize = 8;
  let darkPixels = 0;
  let totalDarkness = 0;
  let offsetX = 0, offsetY = 0, blurSamples = 0;
  
  const directions = [
    { dx: 0, dy: 1, name: 'bottom' },
    { dx: 1, dy: 0, name: 'right' },
    { dx: -1, dy: 0, name: 'left' },
    { dx: 0, dy: -1, name: 'top' },
    { dx: 1, dy: 1, name: 'br' },
    { dx: -1, dy: 1, name: 'bl' },
  ];
  
  for (const dir of directions) {
    for (let i = 2; i <= sampleSize; i++) {
      const sx = Math.floor(x + w / 2 + dir.dx * (w / 2 + i));
      const sy = Math.floor(y + h / 2 + dir.dy * (h / 2 + i));
      if (sx < 0 || sy < 0 || sx >= width || sy >= height) continue;
      
      const c = getPixel(data, width, sx, sy);
      const brightness = (c.r + c.g + c.b) / 3;
      if (c.a > 20 && brightness < 180) {
        darkPixels++;
        totalDarkness += (255 - brightness) / 255;
        if (i > 2 && i < 6) {
          offsetX += dir.dx * i;
          offsetY += dir.dy * i;
          blurSamples++;
        }
      }
    }
  }
  
  if (darkPixels < 5) return 'none';
  
  const avgDarkness = darkPixels ? totalDarkness / darkPixels : 0;
  const alpha = Math.min(0.5, Math.max(0.08, avgDarkness * 0.6));
  const ox = blurSamples ? Math.round(offsetX / blurSamples) : 2;
  const oy = blurSamples ? Math.round(offsetY / blurSamples) : 4;
  const blur = Math.min(20, Math.max(4, Math.round(darkPixels / 2)));
  const spread = Math.max(0, Math.round(blur / 6) - 2);
  
  return `${ox}px ${oy}px ${blur}px ${spread}px rgba(0, 0, 0, ${alpha.toFixed(2)})`;
}

function findConnectedRegions(
  imageData: ImageData,
  mask: boolean[][],
  minArea: number
): { x: number; y: number; w: number; h: number }[] {
  const { width, height } = imageData;
  const visited = Array.from({ length: height }, () => new Array(width).fill(false));
  const regions: { x: number; y: number; w: number; h: number }[] = [];
  
  for (let sy = 0; sy < height; sy += 2) {
    for (let sx = 0; sx < width; sx += 2) {
      if (visited[sy][sx] || !mask[sy][sx]) continue;
      
      let minX = sx, maxX = sx, minY = sy, maxY = sy;
      const stack: [number, number][] = [[sx, sy]];
      visited[sy][sx] = true;
      
      while (stack.length > 0) {
        const [cx, cy] = stack.pop()!;
        minX = Math.min(minX, cx); maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
        
        const neighbors: [number, number][] = [
          [cx + 2, cy], [cx - 2, cy], [cx, cy + 2], [cx, cy - 2],
        ];
        
        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && ny >= 0 && nx < width && ny < height
              && !visited[ny][nx] && mask[ny][nx]) {
            visited[ny][nx] = true;
            stack.push([nx, ny]);
          }
        }
      }
      
      const rw = maxX - minX + 1;
      const rh = maxY - minY + 1;
      if (rw * rh >= minArea && rw > 20 && rh > 20) {
        regions.push({ x: minX, y: minY, width: rw, height: rh });
      }
    }
  }
  
  return regions;
}

function buildEdgeMask(imageData: ImageData, threshold: number): boolean[][] {
  const { data, width, height } = imageData;
  const mask: boolean[][] = Array.from({ length: height }, () => new Array(width).fill(false));
  
  for (let y = 2; y < height - 2; y += 2) {
    for (let x = 2; x < width - 2; x += 2) {
      const c = getPixel(data, width, x, y);
      if (c.a < 20) continue;
      
      const neighbors = [
        getPixel(data, width, x + 2, y),
        getPixel(data, width, x - 2, y),
        getPixel(data, width, x, y + 2),
        getPixel(data, width, x, y - 2),
      ];
      
      let hasEdge = false;
      for (const n of neighbors) {
        if (colorDistance(c, n) > threshold) {
          hasEdge = true;
          break;
        }
      }
      mask[y][x] = hasEdge;
    }
  }
  return mask;
}

function buildAlphaMask(imageData: ImageData): boolean[][] {
  const { data, width, height } = imageData;
  const mask: boolean[][] = Array.from({ length: height }, () => new Array(width).fill(false));
  
  for (let y = 2; y < height - 2; y += 2) {
    for (let x = 2; x < width - 2; x += 2) {
      const c = getPixel(data, width, x, y);
      mask[y][x] = c.a > 80;
    }
  }
  return mask;
}

function expandRegion(
  img: HTMLImageElement | HTMLCanvasElement,
  region: { x: number; y: number; w: number; h: number },
  imageData: ImageData,
  pad: number
): { x: number; y: number; w: number; h: number } {
  const { width, height } = imageData;
  const nx = Math.max(0, region.x - pad);
  const ny = Math.max(0, region.y - pad);
  const nw = Math.min(width - nx, region.w + pad * 2);
  const nh = Math.min(height - ny, region.h + pad * 2);
  return { x: nx, y: ny, w: nw, h: nh };
}

function detectRegionType(
  imageData: ImageData,
  region: { x: number; y: number; w: number; h: number }
): CSSRegion['type'] {
  const gradientStr = analyzeGradient(imageData, region.x, region.y, region.w, region.h);
  const shadowStr = analyzeShadow(imageData, region.x, region.y, region.w, region.h);
  const radiusStr = analyzeBorderRadius(imageData, region.x, region.y, region.w, region.h);
  
  const hasGradient = gradientStr.includes('gradient');
  const hasShadow = shadowStr !== 'none';
  const hasRadius = radiusStr !== '0px' && radiusStr !== '4px';
  
  const features = [hasGradient, hasShadow, hasRadius].filter(Boolean).length;
  if (features > 1) return 'mixed';
  if (hasGradient) return 'gradient';
  if (hasShadow) return 'shadow';
  return 'border-radius';
}

export function detectRegions(imageData: ImageData): CSSRegion[] {
  const { width, height } = imageData;
  const minArea = Math.max(800, (width * height) / 500);
  
  const edgeMask = buildEdgeMask(imageData, 40);
  const alphaMask = buildAlphaMask(imageData);
  
  const combinedMask: boolean[][] = Array.from({ length: height }, (_, y) =>
    Array.from({ length: width }, (_, x) => edgeMask[y][x] || alphaMask[y][x])
  );
  
  let regions = findConnectedRegions(imageData, combinedMask, minArea);
  
  regions = regions.sort((a, b) => b.w * b.h - a.w * a.h).slice(0, 30);
  
  const result: CSSRegion[] = [];
  
  for (let i = 0; i < regions.length; i++) {
    const region = regions[i];
    const expanded = expandRegion(imageData as any, region, imageData, 6);
    
    let overlap = false;
    for (const existing of result) {
      const ix1 = Math.max(expanded.x, existing.x);
      const iy1 = Math.max(expanded.y, existing.y);
      const ix2 = Math.min(expanded.x + expanded.w, existing.x + existing.width);
      const iy2 = Math.min(expanded.y + expanded.h, existing.y + existing.height);
      if (ix2 > ix1 && iy2 > iy1) {
        const iw = ix2 - ix1;
        const ih = iy2 - iy1;
        const overlapArea = iw * ih;
        const smallerArea = Math.min(expanded.w * expanded.h, existing.width * existing.height);
        if (overlapArea / smallerArea > 0.5) {
          overlap = true;
          break;
        }
      }
    }
    if (overlap) continue;
    
    const type = detectRegionType(imageData, expanded);
    
    const background = analyzeGradient(imageData, expanded.x, expanded.y, expanded.w, expanded.h);
    const boxShadow = analyzeShadow(imageData, expanded.x, expanded.y, expanded.w, expanded.h);
    const borderRadius = analyzeBorderRadius(imageData, expanded.x, expanded.y, expanded.w, expanded.h);
    const primaryColor = getAverageColor(imageData, expanded.x, expanded.y, expanded.w, expanded.h);
    
    result.push({
      id: `region-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      x: expanded.x,
      y: expanded.y,
      width: expanded.w,
      height: expanded.h,
      type,
      properties: {
        background,
        boxShadow: boxShadow !== 'none' ? boxShadow : undefined,
        borderRadius: borderRadius !== '0px' ? borderRadius : undefined,
        primaryColor,
      },
    });
  }
  
  return result;
}

export function analyzeRegion(
  imageData: ImageData,
  x: number, y: number, w: number, h: number
): CSSRegion {
  const background = analyzeGradient(imageData, x, y, w, h);
  const boxShadow = analyzeShadow(imageData, x, y, w, h);
  const borderRadius = analyzeBorderRadius(imageData, x, y, w, h);
  const primaryColor = getAverageColor(imageData, x, y, w, h);
  
  const hasGradient = background.includes('gradient');
  const hasShadow = boxShadow !== 'none';
  const hasRadius = borderRadius !== '0px' && borderRadius !== '4px';
  
  const features = [hasGradient, hasShadow, hasRadius].filter(Boolean).length;
  let type: CSSRegion['type'] = 'border-radius';
  if (features > 1) type = 'mixed';
  else if (hasGradient) type = 'gradient';
  else if (hasShadow) type = 'shadow';
  
  return {
    id: `manual-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    x, y, width: w, height: h, type,
    properties: {
      background,
      boxShadow: boxShadow !== 'none' ? boxShadow : undefined,
      borderRadius: borderRadius !== '0px' ? borderRadius : undefined,
      primaryColor,
    },
  };
}

export function generateCSSCode(region: CSSRegion): string {
  const lines: string[] = [];
  const p = region.properties;
  
  if (p.background) lines.push(`  background: ${p.background};`);
  if (p.borderRadius) lines.push(`  border-radius: ${p.borderRadius};`);
  if (p.boxShadow) lines.push(`  box-shadow: ${p.boxShadow};`);
  
  if (lines.length === 0 && p.primaryColor) {
    lines.push(`  background: ${p.primaryColor};`);
  }
  
  if (lines.length === 0) return '/* 未检测到可提取的CSS属性 */';
  
  return `.element {\n${lines.join('\n')}\n}`;
}
