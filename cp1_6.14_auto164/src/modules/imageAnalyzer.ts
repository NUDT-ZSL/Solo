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
  const fx = Math.max(0, Math.min(width - 1, Math.floor(x)));
  const fy = Math.max(0, Math.min(Math.floor(data.length / (width * 4)) - 1, Math.floor(y)));
  const idx = (fy * width + fx) * 4;
  return { r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3] };
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
}

function rgbaToString(r: number, g: number, b: number, a: number): string {
  if (a >= 250) return rgbToHex(r, g, b);
  return `rgba(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)}, ${(a / 255).toFixed(2)})`;
}

function colorDistance(c1: RGB, c2: RGB): number {
  const dr = c1.r - c2.r;
  const dg = c1.g - c2.g;
  const db = c1.b - c2.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;
  if (d !== 0) {
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: h * 360, s, v };
}

export function getAverageColor(
  imageData: ImageData,
  x: number,
  y: number,
  w: number,
  h: number
): string {
  const { data, width } = imageData;
  const sx = Math.max(0, Math.floor(x));
  const sy = Math.max(0, Math.floor(y));
  const ex = Math.min(width - 1, Math.floor(x + w - 1));
  const ey = Math.min(Math.floor(data.length / (width * 4)) - 1, Math.floor(y + h - 1));

  let rSum = 0, gSum = 0, bSum = 0, aSum = 0, count = 0;
  const step = Math.max(1, Math.floor(Math.min(w, h) / 30));

  for (let py = sy; py <= ey; py += step) {
    for (let px = sx; px <= ex; px += step) {
      const c = getPixel(data, width, px, py);
      if (c.a < 20) continue;
      rSum += c.r; gSum += c.g; bSum += c.b; aSum += c.a;
      count++;
    }
  }

  if (count === 0) return '#000000';
  return rgbaToString(rSum / count, gSum / count, bSum / count, aSum / count);
}

interface GradientResult {
  type: 'linear' | 'solid';
  angle: number;
  stops: { position: number; color: RGB }[];
}

function computeGradient(
  imageData: ImageData,
  x: number, y: number, w: number, h: number
): GradientResult {
  const { data, width } = imageData;
  const samples: { x: number; y: number; color: RGB }[] = [];
  const gridSize = 8;
  const stepX = Math.max(1, Math.floor(w / gridSize));
  const stepY = Math.max(1, Math.floor(h / gridSize));

  for (let sy = 0; sy < gridSize; sy++) {
    for (let sx = 0; sx < gridSize; sx++) {
      const px = x + Math.floor(sx * stepX + stepX / 2);
      const py = y + Math.floor(sy * stepY + stepY / 2);
      if (px >= x + w || py >= y + h) continue;
      const c = getPixel(data, width, px, py);
      if (c.a > 30) {
        samples.push({ x: sx, y: sy, color: c });
      }
    }
  }

  if (samples.length < 4) {
    const avg = samples.length > 0
      ? {
          r: samples.reduce((s, c) => s + c.color.r, 0) / samples.length,
          g: samples.reduce((s, c) => s + c.color.g, 0) / samples.length,
          b: samples.reduce((s, c) => s + c.color.b, 0) / samples.length,
          a: samples.reduce((s, c) => s + c.color.a, 0) / samples.length,
        }
      : { r: 0, g: 0, b: 0, a: 255 };
    return { type: 'solid', angle: 0, stops: [{ position: 0, color: avg }] };
  }

  let maxDist = 0;
  let bestAngle = 180;
  const angles = [0, 45, 90, 135, 180, 225, 270, 315];

  for (const angle of angles) {
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);

    const projections = samples.map(s => ({
      proj: s.x * cos + s.y * sin,
      color: s.color,
    }));

    projections.sort((a, b) => a.proj - b.proj);

    const firstColors = projections.slice(0, Math.max(2, Math.floor(projections.length / 4)));
    const lastColors = projections.slice(-Math.max(2, Math.floor(projections.length / 4)));

    const avgFirst = {
      r: firstColors.reduce((s, c) => s + c.color.r, 0) / firstColors.length,
      g: firstColors.reduce((s, c) => s + c.color.g, 0) / firstColors.length,
      b: firstColors.reduce((s, c) => s + c.color.b, 0) / firstColors.length,
      a: firstColors.reduce((s, c) => s + c.color.a, 0) / firstColors.length,
    };
    const avgLast = {
      r: lastColors.reduce((s, c) => s + c.color.r, 0) / lastColors.length,
      g: lastColors.reduce((s, c) => s + c.color.g, 0) / lastColors.length,
      b: lastColors.reduce((s, c) => s + c.color.b, 0) / lastColors.length,
      a: lastColors.reduce((s, c) => s + c.color.a, 0) / lastColors.length,
    };

    const dist = colorDistance(avgFirst, avgLast);
    if (dist > maxDist) {
      maxDist = dist;
      bestAngle = angle;
    }
  }

  if (maxDist < 20) {
    const avg = {
      r: samples.reduce((s, c) => s + c.color.r, 0) / samples.length,
      g: samples.reduce((s, c) => s + c.color.g, 0) / samples.length,
      b: samples.reduce((s, c) => s + c.color.b, 0) / samples.length,
      a: samples.reduce((s, c) => s + c.color.a, 0) / samples.length,
    };
    return { type: 'solid', angle: 0, stops: [{ position: 0, color: avg }] };
  }

  const rad = (bestAngle * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);

  const projections = samples.map(s => ({
    proj: s.x * cos + s.y * sin,
    color: s.color,
  }));

  projections.sort((a, b) => a.proj - b.proj);

  const minP = projections[0].proj;
  const maxP = projections[projections.length - 1].proj;
  const range = Math.max(0.001, maxP - minP);

  const stopCount = 3;
  const stops: { position: number; color: RGB }[] = [];

  for (let i = 0; i < stopCount; i++) {
    const targetP = minP + (range * i) / (stopCount - 1);
    let closest = projections[0];
    let closestDist = Infinity;
    for (const p of projections) {
      const d = Math.abs(p.proj - targetP);
      if (d < closestDist) {
        closestDist = d;
        closest = p;
      }
    }
    const nearIdx = projections.findIndex(p => p === closest);
    const start = Math.max(0, nearIdx - 1);
    const end = Math.min(projections.length, nearIdx + 2);
    const near = projections.slice(start, end);
    const avgColor = {
      r: near.reduce((s, c) => s + c.color.r, 0) / near.length,
      g: near.reduce((s, c) => s + c.color.g, 0) / near.length,
      b: near.reduce((s, c) => s + c.color.b, 0) / near.length,
      a: near.reduce((s, c) => s + c.color.a, 0) / near.length,
    };
    stops.push({ position: i / (stopCount - 1), color: avgColor });
  }

  return { type: 'linear', angle: bestAngle, stops };
}

export function analyzeGradient(
  imageData: ImageData,
  x: number, y: number, w: number, h: number
): string {
  const result = computeGradient(imageData, x, y, w, h);

  if (result.type === 'solid') {
    const c = result.stops[0].color;
    return rgbaToString(c.r, c.g, c.b, c.a);
  }

  const stopsStr = result.stops
    .map(s => `${rgbaToString(s.color.r, s.color.g, s.color.b, s.color.a)} ${Math.round(s.position * 100)}%`)
    .join(', ');

  return `linear-gradient(${result.angle}deg, ${stopsStr})`;
}

interface ShadowResult {
  type: 'outer' | 'inner' | 'none';
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: RGB;
}

function computeShadow(
  imageData: ImageData,
  x: number, y: number, w: number, h: number
): ShadowResult {
  const { data, width } = imageData;
  const padding = Math.max(8, Math.floor(Math.min(w, h) / 6));
  const maxDist = padding * 3;

  const dirSamples = [
    { name: 'top', dx: 0, dy: -1, sx: x + w / 2, sy: y },
    { name: 'bottom', dx: 0, dy: 1, sx: x + w / 2, sy: y + h },
    { name: 'left', dx: -1, dy: 0, sx: x, sy: y + h / 2 },
    { name: 'right', dx: 1, dy: 0, sx: x + w, sy: y + h / 2 },
    { name: 'tl', dx: -1, dy: -1, sx: x, sy: y },
    { name: 'tr', dx: 1, dy: -1, sx: x + w, sy: y },
    { name: 'bl', dx: -1, dy: 1, sx: x, sy: y + h },
    { name: 'br', dx: 1, dy: 1, sx: x + w, sy: y + h },
  ];

  const outerProfiles: { dir: string; profile: { dist: number; brightness: number; alpha: number }[] }[] = [];

  for (const dir of dirSamples) {
    const profile: { dist: number; brightness: number; alpha: number }[] = [];
    const mag = Math.sqrt(dir.dx * dir.dx + dir.dy * dir.dy);
    const nx = dir.dx / mag;
    const ny = dir.dy / mag;

    for (let d = 1; d <= maxDist; d += 1) {
      const px = Math.floor(dir.sx + nx * d);
      const py = Math.floor(dir.sy + ny * d);
      const c = getPixel(data, width, px, py);
      const brightness = (c.r + c.g + c.b) / 3;
      profile.push({ dist: d, brightness, alpha: c.a });
    }
    outerProfiles.push({ dir: dir.name, profile });
  }

  let totalShadowStrength = 0;
  let weightedOx = 0;
  let weightedOy = 0;
  let blurEstimate = 0;
  let hasShadowDirs = 0;
  let shadowColor: RGB = { r: 0, g: 0, b: 0, a: 0 };
  let shadowColorCount = 0;

  const dirMap: Record<string, { dx: number; dy: number }> = {
    top: { dx: 0, dy: -1 },
    bottom: { dx: 0, dy: 1 },
    left: { dx: -1, dy: 0 },
    right: { dx: 1, dy: 0 },
    tl: { dx: -0.707, dy: -0.707 },
    tr: { dx: 0.707, dy: -0.707 },
    bl: { dx: -0.707, dy: 0.707 },
    br: { dx: 0.707, dy: 0.707 },
  };

  for (const { dir, profile } of outerProfiles) {
    const baselineBrightness = (profile[0]?.brightness ?? 128);
    let shadowStart = -1;
    let shadowEnd = -1;
    let minBrightness = baselineBrightness;
    let minIdx = 0;

    for (let i = 0; i < profile.length; i++) {
      if (profile[i].brightness < minBrightness) {
        minBrightness = profile[i].brightness;
        minIdx = i;
      }
    }

    const drop = baselineBrightness - minBrightness;

    if (drop > 15 && profile[minIdx].alpha > 15) {
      shadowStart = 0;
      shadowEnd = minIdx;
      for (let i = minIdx; i < profile.length; i++) {
        if (profile[i].brightness > baselineBrightness - drop * 0.2) {
          shadowEnd = i;
          break;
        }
      }

      const strength = drop / 255;
      totalShadowStrength += strength;
      const d = dirMap[dir];
      const avgDist = (shadowStart + shadowEnd) / 2;
      weightedOx += d.dx * avgDist * strength;
      weightedOy += d.dy * avgDist * strength;
      blurEstimate += (shadowEnd - shadowStart) * strength;
      hasShadowDirs++;

      const c = profile[minIdx];
      const cRgb = getPixel(data, width,
        Math.floor(dirSamples.find(s => s.name === dir)!.sx + d.dx * minIdx),
        Math.floor(dirSamples.find(s => s.name === dir)!.sy + d.dy * minIdx)
      );
      shadowColor.r += cRgb.r * strength;
      shadowColor.g += cRgb.g * strength;
      shadowColor.b += cRgb.b * strength;
      shadowColor.a += cRgb.a * strength;
      shadowColorCount += strength;
    }
  }

  if (hasShadowDirs === 0 || totalShadowStrength < 0.15) {
    return { type: 'none', offsetX: 0, offsetY: 0, blur: 0, spread: 0, color: { r: 0, g: 0, b: 0, a: 0 } };
  }

  const ox = Math.round(weightedOx / totalShadowStrength);
  const oy = Math.round(weightedOy / totalShadowStrength);
  const blur = Math.min(40, Math.max(2, Math.round(blurEstimate / totalShadowStrength * 1.2)));
  const spread = Math.max(0, Math.round(blur / 10) - 1);

  if (shadowColorCount > 0) {
    shadowColor.r /= shadowColorCount;
    shadowColor.g /= shadowColorCount;
    shadowColor.b /= shadowColorCount;
    shadowColor.a = Math.min(255, Math.round(40 + totalShadowStrength * 80));
  } else {
    shadowColor = { r: 0, g: 0, b: 0, a: Math.min(255, Math.round(40 + totalShadowStrength * 80)) };
  }

  return { type: 'outer', offsetX: ox, offsetY: oy, blur, spread, color: shadowColor };
}

export function analyzeShadow(
  imageData: ImageData,
  x: number, y: number, w: number, h: number
): string {
  const result = computeShadow(imageData, x, y, w, h);

  if (result.type === 'none') return 'none';

  const alpha = Math.max(0.05, Math.min(0.6, result.color.a / 255));
  const color = `rgba(${Math.round(result.color.r)}, ${Math.round(result.color.g)}, ${Math.round(result.color.b)}, ${alpha.toFixed(2)})`;

  return `${result.offsetX}px ${result.offsetY}px ${result.blur}px ${result.spread}px ${color}`;
}

function computeCornerRadius(
  imageData: ImageData,
  cx: number, cy: number,
  maxR: number,
  insideDx: number, insideDy: number
): number {
  const { data, width } = imageData;

  let bestR = 0;
  let bestScore = -1;

  for (let r = 2; r <= maxR; r++) {
    let insideCount = 0;
    let insideOpaque = 0;
    let outsideCount = 0;
    let outsideTransparent = 0;
    let edgeScore = 0;
    const samples = 32;

    for (let i = 0; i < samples; i++) {
      const angle = (i / samples) * Math.PI / 2;
      const ex = cx + Math.cos(angle) * r * insideDx;
      const ey = cy + Math.sin(angle) * r * insideDy;
      const edgeColor = getPixel(data, width, ex, ey);

      for (let dr = -2; dr <= 2; dr++) {
        const rr = r + dr;
        const sx = cx + Math.cos(angle) * rr * insideDx;
        const sy = cy + Math.sin(angle) * rr * insideDy;
        const c = getPixel(data, width, sx, sy);

        if (dr < 0) {
          insideCount++;
          if (c.a > 180) insideOpaque++;
        } else if (dr > 0) {
          outsideCount++;
          if (c.a < 80) outsideTransparent++;
        } else {
          if (c.a > 80 && c.a < 200) edgeScore += 2;
          edgeColor.r += c.r; edgeColor.g += c.g; edgeColor.b += c.b;
        }
      }
    }

    const insideRatio = insideCount > 0 ? insideOpaque / insideCount : 0;
    const outsideRatio = outsideCount > 0 ? outsideTransparent / outsideCount : 0;
    const score = insideRatio * 0.4 + outsideRatio * 0.4 + (edgeScore / (samples * 5)) * 0.2;

    if (score > bestScore && insideRatio > 0.6 && outsideRatio > 0.4) {
      bestScore = score;
      bestR = r;
    }
  }

  return bestR;
}

export function analyzeBorderRadius(
  imageData: ImageData,
  x: number, y: number, w: number, h: number
): string {
  const { data, width } = imageData;
  const maxR = Math.min(Math.floor(Math.min(w, h) / 2), 50);

  const corners = [
    { name: 'tl', cx: x, cy: y, idx: 1, idy: 1 },
    { name: 'tr', cx: x + w - 1, cy: y, idx: -1, idy: 1 },
    { name: 'bl', cx: x, cy: y + h - 1, idx: 1, idy: -1 },
    { name: 'br', cx: x + w - 1, cy: y + h - 1, idx: -1, idy: -1 },
  ];

  const radii: number[] = [];
  for (const corner of corners) {
    const r = computeCornerRadius(imageData, corner.cx, corner.cy, maxR, corner.idx, corner.idy);
    radii.push(r);
  }

  const avgR = radii.reduce((s, r) => s + r, 0) / radii.length;
  const allSame = radii.every(r => Math.abs(r - avgR) <= 2);

  if (avgR < 2) {
    const outside = getPixel(data, width, Math.max(0, x - 3), Math.max(0, y - 3));
    if (outside.a < 30) return '0px';
    return '0px';
  }

  if (allSame) {
    return `${Math.round(avgR)}px`;
  }

  return `${radii.map(r => `${Math.round(r)}px`).join(' ')}`;
}

interface Edge {
  magnitude: number;
  dirX: number;
  dirY: number;
}

function computeSobelEdges(imageData: ImageData, targetX: number, targetY: number, targetW: number, targetH: number): Edge[][] {
  const { data, width } = imageData;
  const gray: number[][] = [];

  for (let y = targetY; y < targetY + targetH; y++) {
    const row: number[] = [];
    for (let x = targetX; x < targetX + targetW; x++) {
      const c = getPixel(data, width, x, y);
      row.push((c.r * 0.299 + c.g * 0.587 + c.b * 0.114) * (c.a / 255));
    }
    gray.push(row);
  }

  const h = gray.length;
  const w = gray[0]?.length || 0;
  const edges: Edge[][] = [];

  for (let y = 0; y < h; y++) {
    const row: Edge[] = [];
    for (let x = 0; x < w; x++) {
      if (x === 0 || y === 0 || x === w - 1 || y === h - 1) {
        row.push({ magnitude: 0, dirX: 0, dirY: 0 });
        continue;
      }
      const gx =
        -gray[y - 1][x - 1] - 2 * gray[y][x - 1] - gray[y + 1][x - 1] +
        gray[y - 1][x + 1] + 2 * gray[y][x + 1] + gray[y + 1][x + 1];
      const gy =
        -gray[y - 1][x - 1] - 2 * gray[y - 1][x] - gray[y - 1][x + 1] +
        gray[y + 1][x - 1] + 2 * gray[y + 1][x] + gray[y + 1][x + 1];
      const mag = Math.sqrt(gx * gx + gy * gy);
      row.push({ magnitude: mag, dirX: gx, dirY: gy });
    }
    edges.push(row);
  }

  return edges;
}

function findConnectedRegionsFromEdges(
  edges: Edge[][],
  threshold: number,
  originX: number,
  originY: number,
  minArea: number
): { x: number; y: number; w: number; h: number }[] {
  const h = edges.length;
  const w = edges[0]?.length || 0;
  const visited = Array.from({ length: h }, () => new Array(w).fill(false));
  const regions: { x: number; y: number; w: number; h: number }[] = [];

  for (let sy = 0; sy < h; sy += 2) {
    for (let sx = 0; sx < w; sx += 2) {
      if (visited[sy][sx]) continue;
      if (edges[sy][sx].magnitude < threshold) continue;

      let minX = sx, maxX = sx, minY = sy, maxY = sy;
      let pixelCount = 0;
      const stack: [number, number][] = [[sx, sy]];
      visited[sy][sx] = true;

      while (stack.length > 0) {
        const [cx, cy] = stack.pop()!;
        minX = Math.min(minX, cx); maxX = Math.max(maxX, cx);
        minY = Math.min(minY, cy); maxY = Math.max(maxY, cy);
        pixelCount++;

        const neighbors: [number, number][] = [
          [cx + 2, cy], [cx - 2, cy], [cx, cy + 2], [cx, cy - 2],
          [cx + 2, cy + 2], [cx - 2, cy - 2], [cx + 2, cy - 2], [cx - 2, cy + 2],
        ];

        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && ny >= 0 && nx < w && ny < h
              && !visited[ny][nx] && edges[ny][nx].magnitude >= threshold) {
            visited[ny][nx] = true;
            stack.push([nx, ny]);
          }
        }
      }

      const rw = maxX - minX + 1;
      const rh = maxY - minY + 1;
      if (pixelCount >= Math.max(8, minArea / 20) && rw > 15 && rh > 15) {
        regions.push({
          x: originX + minX,
          y: originY + minY,
          w: rw,
          h: rh,
        });
      }
    }
  }

  return regions;
}

function findAlphaRegions(
  imageData: ImageData,
  minArea: number
): { x: number; y: number; w: number; h: number }[] {
  const { data, width, height } = imageData;
  const visited = Array.from({ length: height }, () => new Array(width).fill(false));
  const regions: { x: number; y: number; w: number; h: number }[] = [];

  for (let sy = 0; sy < height; sy += 2) {
    for (let sx = 0; sx < width; sx += 2) {
      if (visited[sy][sx]) continue;
      const c = getPixel(data, width, sx, sy);
      if (c.a < 100) continue;

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
              && !visited[ny][nx]) {
            const nc = getPixel(data, width, nx, ny);
            if (nc.a >= 100) {
              visited[ny][nx] = true;
              stack.push([nx, ny]);
            }
          }
        }
      }

      const rw = maxX - minX + 1;
      const rh = maxY - minY + 1;
      if (rw * rh >= minArea && rw > 20 && rh > 20) {
        regions.push({ x: minX, y: minY, w: rw, h: rh });
      }
    }
  }

  return regions;
}

function mergeOverlapping(regions: { x: number; y: number; w: number; h: number }[], overlapThresh = 0.3)
  : { x: number; y: number; w: number; h: number }[] {
  const result: { x: number; y: number; w: number; h: number }[] = [];

  for (const r of regions) {
    let merged = false;
    for (let i = 0; i < result.length; i++) {
      const ex = result[i];
      const ix1 = Math.max(r.x, ex.x);
      const iy1 = Math.max(r.y, ex.y);
      const ix2 = Math.min(r.x + r.w, ex.x + ex.w);
      const iy2 = Math.min(r.y + r.h, ex.y + ex.h);
      if (ix2 > ix1 && iy2 > iy1) {
        const iArea = (ix2 - ix1) * (iy2 - iy1);
        const smaller = Math.min(r.w * r.h, ex.w * ex.h);
        if (iArea / smaller > overlapThresh) {
          const nx = Math.min(r.x, ex.x);
          const ny = Math.min(r.y, ex.y);
          const nw = Math.max(r.x + r.w, ex.x + ex.w) - nx;
          const nh = Math.max(r.y + r.h, ex.y + ex.h) - ny;
          result[i] = { x: nx, y: ny, w: nw, h: nh };
          merged = true;
          break;
        }
      }
    }
    if (!merged) result.push({ ...r });
  }

  return result;
}

function expandRegion(
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
  const grad = computeGradient(imageData, region.x, region.y, region.w, region.h);
  const shadow = computeShadow(imageData, region.x, region.y, region.w, region.h);
  const radiusStr = analyzeBorderRadius(imageData, region.x, region.y, region.w, region.h);

  const hasGradient = grad.type === 'linear';
  const hasShadow = shadow.type !== 'none';
  const hasRadius = radiusStr !== '0px';

  const features = [hasGradient, hasShadow, hasRadius].filter(Boolean).length;
  if (features > 1) return 'mixed';
  if (hasGradient) return 'gradient';
  if (hasShadow) return 'shadow';
  return 'border-radius';
}

export function detectRegions(imageData: ImageData): CSSRegion[] {
  const { width, height } = imageData;
  const minArea = Math.max(600, (width * height) / 600);

  const edges = computeSobelEdges(imageData, 0, 0, width, height);
  const edgeThreshold = 25;
  const edgeRegions = findConnectedRegionsFromEdges(edges, edgeThreshold, 0, 0, minArea);
  const alphaRegions = findAlphaRegions(imageData, minArea);

  let allRegions = [...edgeRegions, ...alphaRegions];
  allRegions = mergeOverlapping(allRegions, 0.2);

  allRegions.sort((a, b) => (b.w * b.h) - (a.w * a.h));
  allRegions = allRegions.slice(0, 40);

  const expandedRegions = allRegions.map(r => expandRegion(r, imageData, 8));
  const deduped = mergeOverlapping(expandedRegions, 0.5);

  const result: CSSRegion[] = [];

  for (let i = 0; i < deduped.length; i++) {
    const region = deduped[i];
    const type = detectRegionType(imageData, region);

    const background = analyzeGradient(imageData, region.x, region.y, region.w, region.h);
    const boxShadow = analyzeShadow(imageData, region.x, region.y, region.w, region.h);
    const borderRadius = analyzeBorderRadius(imageData, region.x, region.y, region.w, region.h);
    const primaryColor = getAverageColor(imageData, region.x, region.y, region.w, region.h);

    if (type === 'border-radius' && borderRadius === '0px' && !background.includes('gradient') && boxShadow === 'none') {
      continue;
    }

    result.push({
      id: `region-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
      x: region.x,
      y: region.y,
      width: region.w,
      height: region.h,
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
  const hasRadius = borderRadius !== '0px';

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
