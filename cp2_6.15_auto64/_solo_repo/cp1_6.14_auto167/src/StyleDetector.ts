export interface GradientStop {
  color: string;
  position: number;
}

export interface GradientStyle {
  type: 'linear' | 'radial';
  angle: number;
  stops: GradientStop[];
}

export interface ShadowStyle {
  offsetX: number;
  offsetY: number;
  blur: number;
  spread: number;
  color: string;
  inset: boolean;
}

export interface StyleRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  borderRadius: number;
  gradient?: GradientStyle;
  boxShadow?: ShadowStyle[];
  innerShadow?: ShadowStyle[];
  backgroundColor?: string;
  thumbnail: string;
  cssText: string;
  name: string;
}

const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

const getPixel = (data: Uint8ClampedArray, x: number, y: number, w: number) => {
  const idx = (y * w + x) * 4;
  return { r: data[idx], g: data[idx + 1], b: data[idx + 2], a: data[idx + 3] };
};

const luminance = (r: number, g: number, b: number): number => {
  return 0.299 * r + 0.587 * g + 0.114 * b;
};

const colorDistance = (
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number }
): number => {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
};

const generateId = (): string => {
  return 'region_' + Math.random().toString(36).substr(2, 9);
};

const generateCSS = (region: Omit<StyleRegion, 'cssText' | 'id' | 'thumbnail' | 'name'>): string => {
  const lines: string[] = [];

  if (region.backgroundColor && !region.gradient) {
    lines.push(`  background-color: ${region.backgroundColor};`);
  }

  if (region.gradient) {
    const stopsStr = region.gradient.stops
      .map(s => `${s.color} ${(s.position * 100).toFixed(1)}%`)
      .join(', ');
    const gradFunc = region.gradient.type === 'linear'
      ? `linear-gradient(${region.gradient.angle}deg, ${stopsStr})`
      : `radial-gradient(circle, ${stopsStr})`;
    lines.push(`  background: ${gradFunc};`);
    lines.push(`  background: -webkit-${gradFunc};`);
  }

  const allShadows: string[] = [];
  if (region.boxShadow) {
    region.boxShadow.forEach(s => {
      allShadows.push(`${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread}px ${s.color}`);
    });
  }
  if (region.innerShadow) {
    region.innerShadow.forEach(s => {
      allShadows.push(`inset ${s.offsetX}px ${s.offsetY}px ${s.blur}px ${s.spread}px ${s.color}`);
    });
  }
  if (allShadows.length > 0) {
    lines.push(`  box-shadow: ${allShadows.join(', ')};`);
    lines.push(`  -webkit-box-shadow: ${allShadows.join(', ')};`);
  }

  if (region.borderRadius > 0) {
    lines.push(`  border-radius: ${region.borderRadius}px;`);
    lines.push(`  -webkit-border-radius: ${region.borderRadius}px;`);
  }

  return lines.join('\n');
};

interface BoundingBox {
  x: number;
  y: number;
  w: number;
  h: number;
  pixelCount: number;
}

const findOpaqueRegions = (data: Uint8ClampedArray, W: number, H: number): BoundingBox[] => {
  const mask = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    mask[i] = data[i * 4 + 3] > 128 ? 1 : 0;
  }

  const visited = new Uint8Array(W * H);
  const regions: BoundingBox[] = [];
  const step = Math.max(2, Math.floor(Math.min(W, H) / 400));

  const bfs = (sx: number, sy: number): BoundingBox | null => {
    if (sx < 0 || sy < 0 || sx >= W || sy >= H) return null;
    const startIdx = sy * W + sx;
    if (visited[startIdx] || !mask[startIdx]) return null;

    const queue: number[] = [startIdx];
    let minX = sx, maxX = sx, minY = sy, maxY = sy;
    let count = 0;
    visited[startIdx] = 1;

    while (queue.length > 0) {
      const idx = queue.pop()!;
      const px = idx % W;
      const py = Math.floor(idx / W);
      count++;
      minX = Math.min(minX, px);
      maxX = Math.max(maxX, px);
      minY = Math.min(minY, py);
      maxY = Math.max(maxY, py);

      const neighbors = [
        [px + step, py], [px - step, py],
        [px, py + step], [px, py - step]
      ];
      for (const [nx, ny] of neighbors) {
        if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
          const nIdx = ny * W + nx;
          if (!visited[nIdx] && mask[nIdx]) {
            visited[nIdx] = 1;
            queue.push(nIdx);
          }
        }
      }
    }

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    const fillRatio = count / (w * h);
    if (w < 20 || h < 20 || count < 200 || fillRatio < 0.15) return null;

    return { x: minX, y: minY, w, h, pixelCount: count };
  };

  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const region = bfs(x, y);
      if (region) {
        let merged = false;
        for (const existing of regions) {
          const overlapX = Math.max(0, Math.min(region.x + region.w, existing.x + existing.w) - Math.max(region.x, existing.x));
          const overlapY = Math.max(0, Math.min(region.y + region.h, existing.y + existing.h) - Math.max(region.y, existing.y));
          if (overlapX > 0 && overlapY > 0) {
            const newX = Math.min(region.x, existing.x);
            const newY = Math.min(region.y, existing.y);
            const newW = Math.max(region.x + region.w, existing.x + existing.w) - newX;
            const newH = Math.max(region.y + region.h, existing.y + existing.h) - newY;
            existing.x = newX;
            existing.y = newY;
            existing.w = newW;
            existing.h = newH;
            existing.pixelCount += region.pixelCount;
            merged = true;
            break;
          }
        }
        if (!merged) regions.push(region);
      }
    }
  }

  return regions;
};

const detectGradient = (
  data: Uint8ClampedArray,
  W: number,
  H: number,
  rx: number, ry: number, rw: number, rh: number
): GradientStyle | null => {
  const sampleCount = 30;
  const hSamples: Array<{ pos: number; r: number; g: number; b: number }> = [];
  const midY = Math.floor(ry + rh / 2);
  for (let i = 0; i < sampleCount; i++) {
    const px = Math.floor(rx + (rw * i) / (sampleCount - 1));
    if (px < 0 || px >= W || midY < 0 || midY >= H) continue;
    const c = getPixel(data, px, midY, W);
    if (c.a > 50) {
      hSamples.push({ pos: i / (sampleCount - 1), r: c.r, g: c.g, b: c.b });
    }
  }

  const vSamples: Array<{ pos: number; r: number; g: number; b: number }> = [];
  const midX = Math.floor(rx + rw / 2);
  for (let i = 0; i < sampleCount; i++) {
    const py = Math.floor(ry + (rh * i) / (sampleCount - 1));
    if (py < 0 || py >= H || midX < 0 || midX >= W) continue;
    const c = getPixel(data, midX, py, W);
    if (c.a > 50) {
      vSamples.push({ pos: i / (sampleCount - 1), r: c.r, g: c.g, b: c.b });
    }
  }

  const d45Samples: Array<{ pos: number; r: number; g: number; b: number }> = [];
  for (let i = 0; i < sampleCount; i++) {
    const t = i / (sampleCount - 1);
    const px = Math.floor(rx + rw * t);
    const py = Math.floor(ry + rh * t);
    if (px < 0 || px >= W || py < 0 || py >= H) continue;
    const c = getPixel(data, px, py, W);
    if (c.a > 50) {
      d45Samples.push({ pos: t, r: c.r, g: c.g, b: c.b });
    }
  }

  const d135Samples: Array<{ pos: number; r: number; g: number; b: number }> = [];
  for (let i = 0; i < sampleCount; i++) {
    const t = i / (sampleCount - 1);
    const px = Math.floor(rx + rw * (1 - t));
    const py = Math.floor(ry + rh * t);
    if (px < 0 || px >= W || py < 0 || py >= H) continue;
    const c = getPixel(data, px, py, W);
    if (c.a > 50) {
      d135Samples.push({ pos: t, r: c.r, g: c.g, b: c.b });
    }
  }

  const computeLinearFit = (samples: Array<{ pos: number; r: number; g: number; b: number }>) => {
    if (samples.length < 4) return { r2: 0, startColor: '#000000', endColor: '#000000', totalChange: 0 };
    const n = samples.length;
    let sumX = 0, sumXR = 0, sumXG = 0, sumXB = 0;
    let sumR = 0, sumG = 0, sumB = 0;
    let sumX2 = 0, sumR2 = 0, sumGR = 0, sumBR = 0;
    let sumG2 = 0, sumB2 = 0, sumRG = 0, sumRB = 0, sumGB = 0;

    for (const s of samples) {
      sumX += s.pos; sumR += s.r; sumG += s.g; sumB += s.b;
      sumX2 += s.pos * s.pos;
      sumR2 += s.r * s.r; sumG2 += s.g * s.g; sumB2 += s.b * s.b;
      sumXR += s.pos * s.r; sumXG += s.pos * s.g; sumXB += s.pos * s.b;
      sumGR += s.g * s.r; sumBR += s.b * s.r; sumGB += s.g * s.b;
      sumRG += s.r * s.g; sumRB += s.r * s.b;
    }

    const meanR = sumR / n;
    const meanG = sumG / n;
    const meanB = sumB / n;
    const meanX = sumX / n;

    const ssTotR = sumR2 - n * meanR * meanR;
    const ssTotG = sumG2 - n * meanG * meanG;
    const ssTotB = sumB2 - n * meanB * meanB;

    const slopeR = n > 1 ? (sumXR - n * meanX * meanR) / (sumX2 - n * meanX * meanX || 1) : 0;
    const slopeG = n > 1 ? (sumXG - n * meanX * meanG) / (sumX2 - n * meanX * meanX || 1) : 0;
    const slopeB = n > 1 ? (sumXB - n * meanX * meanB) / (sumX2 - n * meanX * meanX || 1) : 0;

    const ssResR = samples.reduce((s, p) => s + Math.pow(p.r - (meanR + slopeR * (p.pos - meanX)), 2), 0);
    const ssResG = samples.reduce((s, p) => s + Math.pow(p.g - (meanG + slopeG * (p.pos - meanX)), 2), 0);
    const ssResB = samples.reduce((s, p) => s + Math.pow(p.b - (meanB + slopeB * (p.pos - meanX)), 2), 0);

    const r2R = ssTotR > 0 ? 1 - ssResR / ssTotR : 0;
    const r2G = ssTotG > 0 ? 1 - ssResG / ssTotG : 0;
    const r2B = ssTotB > 0 ? 1 - ssResB / ssTotB : 0;

    const r2Parts: number[] = [];
    if (ssTotR > 0) r2Parts.push(r2R);
    if (ssTotG > 0) r2Parts.push(r2G);
    if (ssTotB > 0) r2Parts.push(r2B);
    const r2 = r2Parts.length > 0 ? r2Parts.reduce((a, b) => a + b, 0) / r2Parts.length : 0;

    const startR = meanR + slopeR * (0 - meanX);
    const startG = meanG + slopeG * (0 - meanX);
    const startB = meanB + slopeB * (0 - meanX);
    const endR = meanR + slopeR * (1 - meanX);
    const endG = meanG + slopeG * (1 - meanX);
    const endB = meanB + slopeB * (1 - meanX);

    return {
      r2,
      startColor: rgbToHex(startR, startG, startB),
      endColor: rgbToHex(endR, endG, endB),
      totalChange: Math.abs(endR - startR) + Math.abs(endG - startG) + Math.abs(endB - startB)
    };
  };

  const hFit = computeLinearFit(hSamples);
  const vFit = computeLinearFit(vSamples);
  const d45Fit = computeLinearFit(d45Samples);
  const d135Fit = computeLinearFit(d135Samples);

  const cX = Math.floor(rx + rw / 2);
  const cY = Math.floor(ry + rh / 2);
  const radialSamples: Array<{ dist: number; r: number; g: number; b: number }> = [];
  const maxDist = Math.sqrt(rw * rw + rh * rh) / 2;
  for (let i = 0; i < sampleCount; i++) {
    const t = i / (sampleCount - 1);
    const dist = t * maxDist;
    const angle = Math.PI / 4;
    const px = Math.floor(cX + dist * Math.cos(angle));
    const py = Math.floor(cY + dist * Math.sin(angle));
    if (px < 0 || px >= W || py < 0 || py >= H) continue;
    const c = getPixel(data, px, py, W);
    if (c.a > 50) {
      radialSamples.push({ dist: t, r: c.r, g: c.g, b: c.b });
    }
  }
  const radialFit = computeLinearFit(radialSamples.map(s => ({ pos: s.dist, r: s.r, g: s.g, b: s.b })));

  const candidates = [
    { fit: hFit, angle: 90, type: 'linear' as const },
    { fit: vFit, angle: 180, type: 'linear' as const },
    { fit: d45Fit, angle: 135, type: 'linear' as const },
    { fit: d135Fit, angle: 225, type: 'linear' as const },
    { fit: radialFit, angle: 0, type: 'radial' as const }
  ];

  let bestCandidate: typeof candidates[0] | null = null;
  for (const c of candidates) {
    if (c.fit.totalChange > 40 && c.fit.r2 >= 0.5) {
      if (!bestCandidate || c.fit.r2 > bestCandidate.fit.r2) {
        bestCandidate = c;
      }
    }
  }

  if (!bestCandidate) return null;

  const minChange = 30;
  const minR2 = 0.5;

  if (bestCandidate.fit.totalChange >= minChange && bestCandidate.fit.r2 >= minR2) {
    let refinedAngle = bestCandidate.angle;

    if (bestCandidate.type === 'linear' && hSamples.length >= 8 && vSamples.length >= 8) {
      let gradX = 0, gradY = 0;
      for (let i = 1; i < hSamples.length; i++) {
        const dx = hSamples[i].pos - hSamples[i - 1].pos;
        const dr = (hSamples[i].r - hSamples[i - 1].r) / (dx * rw || 1);
        const dg = (hSamples[i].g - hSamples[i - 1].g) / (dx * rw || 1);
        const db = (hSamples[i].b - hSamples[i - 1].b) / (dx * rw || 1);
        gradX += (dr + dg + db) / 3;
      }
      for (let i = 1; i < vSamples.length; i++) {
        const dy = vSamples[i].pos - vSamples[i - 1].pos;
        const dr = (vSamples[i].r - vSamples[i - 1].r) / (dy * rh || 1);
        const dg = (vSamples[i].g - vSamples[i - 1].g) / (dy * rh || 1);
        const db = (vSamples[i].b - vSamples[i - 1].b) / (dy * rh || 1);
        gradY += (dr + dg + db) / 3;
      }

      if (Math.abs(gradX) > 0.01 || Math.abs(gradY) > 0.01) {
        const rawAngle = Math.atan2(gradY, gradX) * (180 / Math.PI);
        refinedAngle = Math.round(((rawAngle + 360) % 360 + 90) % 360);
        if (refinedAngle < 0) refinedAngle += 360;
      }
    }

    const stops: GradientStop[] = [
      { color: bestCandidate.fit.startColor, position: 0 },
      { color: bestCandidate.fit.endColor, position: 1 }
    ];

    const midSampleCount = 10;
    const midStops: GradientStop[] = [];
    if (bestCandidate.type === 'linear') {
      const rad = (refinedAngle - 90) * Math.PI / 180;
      for (let i = 1; i < midSampleCount; i++) {
        const t = i / midSampleCount;
        const px = Math.floor(rx + rw / 2 + (t - 0.5) * rw * Math.cos(rad));
        const py = Math.floor(ry + rh / 2 + (t - 0.5) * rh * Math.sin(rad));
        if (px >= 0 && px < W && py >= 0 && py < H) {
          const c = getPixel(data, px, py, W);
          if (c.a > 50) {
            midStops.push({ color: rgbToHex(c.r, c.g, c.b), position: t });
          }
        }
      }
    }

    if (midStops.length >= 3) {
      const allStops = [stops[0], ...midStops, stops[1]];
      allStops.sort((a, b) => a.position - b.position);
      const filtered: GradientStop[] = [allStops[0]];
      for (let i = 1; i < allStops.length; i++) {
        if (colorDistance(
          { r: parseInt(allStops[i].color.slice(1, 3), 16), g: parseInt(allStops[i].color.slice(3, 5), 16), b: parseInt(allStops[i].color.slice(5, 7), 16) },
          { r: parseInt(filtered[filtered.length - 1].color.slice(1, 3), 16), g: parseInt(filtered[filtered.length - 1].color.slice(3, 5), 16), b: parseInt(filtered[filtered.length - 1].color.slice(5, 7), 16) }
        ) > 25) {
          filtered.push(allStops[i]);
        }
      }
      if (filtered.length >= 2) {
        return {
          type: bestCandidate.type,
          angle: refinedAngle,
          stops: filtered.length > 5 ? [filtered[0], ...filtered.slice(1, -1).filter((_, i) => i % 2 === 0), filtered[filtered.length - 1]] : filtered
        };
      }
    }

    return {
      type: bestCandidate.type,
      angle: refinedAngle,
      stops
    };
  }

  return null;
};

const detectBorderRadius = (
  data: Uint8ClampedArray,
  W: number,
  H: number,
  rx: number, ry: number, rw: number, rh: number
): number => {
  const corners: Array<{ originX: number; originY: number; dirX: number; dirY: number }> = [
    { originX: rx, originY: ry, dirX: 1, dirY: 1 },
    { originX: rx + rw - 1, originY: ry, dirX: -1, dirY: 1 },
    { originX: rx, originY: ry + rh - 1, dirX: 1, dirY: -1 },
    { originX: rx + rw - 1, originY: ry + rh - 1, dirX: -1, dirY: -1 }
  ];

  const maxCheck = Math.min(Math.floor(rw / 3), Math.floor(rh / 3), 80);
  const estimatedRadii: number[] = [];

  for (const corner of corners) {
    const edgePoints: Array<{ x: number; y: number }> = [];

    for (let d = 0; d <= maxCheck; d++) {
      let foundEdge = false;
      for (let t = 0; t <= d; t++) {
        const px1 = corner.originX + corner.dirX * t;
        const py1 = corner.originY + corner.dirY * (d - t);
        const px2 = corner.originX + corner.dirX * (d + 1);
        const py2 = corner.originY + corner.dirY * (d - t);

        if (px1 >= 0 && px1 < W && py1 >= 0 && py1 < H &&
            px2 >= 0 && px2 < W && py2 >= 0 && py2 < H) {
          const c1 = getPixel(data, px1, py1, W);
          const c2 = getPixel(data, px2, py2, W);
          if ((c1.a > 128 && c2.a <= 128) || (c1.a <= 128 && c2.a > 128)) {
            edgePoints.push({ x: px1, y: py1 });
            foundEdge = true;
          }
        }
      }
      if (!foundEdge && edgePoints.length > 2) break;
    }

    if (edgePoints.length < 3) continue;

    const innerLum = luminance(
      ...(() => {
        const ix = Math.min(W - 1, Math.max(0, corner.originX + corner.dirX * Math.min(maxCheck + 5, Math.floor(rw / 2))));
        const iy = Math.min(H - 1, Math.max(0, corner.originY + corner.dirY * Math.min(maxCheck + 5, Math.floor(rh / 2))));
        const c = getPixel(data, ix, iy, W);
        return [c.r, c.g, c.b];
      })()
    );

    const gradientEdgePoints: Array<{ x: number; y: number }> = [];
    const scanDepth = Math.min(maxCheck, 40);
    for (let d = 0; d <= scanDepth; d++) {
      for (let t = 0; t <= d; t++) {
        const px = corner.originX + corner.dirX * t;
        const py = corner.originY + corner.dirY * (d - t);
        if (px < 0 || px >= W || py < 0 || py >= H) continue;

        const c = getPixel(data, px, py, W);
        if (c.a > 128) {
          const lum = luminance(c.r, c.g, c.b);
          const neighbors: number[] = [];
          for (const [ndx, ndy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
            const npx = px + ndx;
            const npy = py + ndy;
            if (npx >= 0 && npx < W && npy >= 0 && npy < H) {
              const nc = getPixel(data, npx, npy, W);
              if (nc.a > 128) {
                neighbors.push(luminance(nc.r, nc.g, nc.b));
              }
            }
          }
          if (neighbors.length >= 2) {
            const gradMag = neighbors.reduce((s, n) => s + Math.abs(n - lum), 0) / neighbors.length;
            if (gradMag > 3) {
              gradientEdgePoints.push({ x: px, y: py });
            }
          }
        }
      }
    }

    const allEdgePoints = edgePoints.length >= gradientEdgePoints.length
      ? edgePoints
      : gradientEdgePoints;

    if (allEdgePoints.length < 3) continue;

    const fitCircleRadius = (points: Array<{ x: number; y: number }>): number => {
      if (points.length < 3) return 0;

      const idealCorner = { x: corner.originX, y: corner.originY };
      const maxScan = Math.min(rw, rh, maxCheck * 2);

      let bestR = 0;
      let bestErr = Infinity;

      for (let testR = 2; testR <= maxCheck; testR++) {
        let err = 0;
        let matchCount = 0;
        const arcCX = idealCorner.x + corner.dirX * testR;
        const arcCY = idealCorner.y + corner.dirY * testR;

        for (const p of points) {
          const dist = Math.sqrt(Math.pow(p.x - arcCX, 2) + Math.pow(p.y - arcCY, 2));
          const deviation = Math.abs(dist - testR);
          if (deviation < testR * 0.5) {
            err += deviation;
            matchCount++;
          }
        }

        if (matchCount >= 3) {
          err /= matchCount;
          if (err < bestErr) {
            bestErr = err;
            bestR = testR;
          }
        }
      }

      return bestR > 0 && bestErr < maxCheck * 0.3 ? bestR : 0;
    };

    const r = fitCircleRadius(allEdgePoints);
    if (r > 0) estimatedRadii.push(r);
  }

  if (estimatedRadii.length === 0) return 0;
  const avgRadius = Math.round(estimatedRadii.reduce((a, b) => a + b, 0) / estimatedRadii.length);
  return avgRadius >= 2 ? avgRadius : 0;
};

const detectBoxShadow = (
  data: Uint8ClampedArray,
  W: number,
  H: number,
  rx: number, ry: number, rw: number, rh: number
): ShadowStyle | null => {
  const maxShadowDist = Math.min(40, Math.floor(Math.min(rw, rh) / 4));

  interface ShadowScan {
    topDist: number;
    bottomDist: number;
    leftDist: number;
    rightDist: number;
    topAlpha: number;
    bottomAlpha: number;
    leftAlpha: number;
    rightAlpha: number;
    topColor: { r: number; g: number; b: number };
    bottomColor: { r: number; g: number; b: number };
    leftColor: { r: number; g: number; b: number };
    rightColor: { r: number; g: number; b: number };
  }

  const scan: ShadowScan = {
    topDist: 0, bottomDist: 0, leftDist: 0, rightDist: 0,
    topAlpha: 0, bottomAlpha: 0, leftAlpha: 0, rightAlpha: 0,
    topColor: { r: 0, g: 0, b: 0 }, bottomColor: { r: 0, g: 0, b: 0 },
    leftColor: { r: 0, g: 0, b: 0 }, rightColor: { r: 0, g: 0, b: 0 }
  };

  const scanSide = (
    side: 'top' | 'bottom' | 'left' | 'right',
    startCoord: number,
    dir: number,
    getCoord: (d: number, i: number) => [number, number]
  ) => {
    let maxDist = 0;
    let totalAlpha = 0;
    let totalR = 0, totalG = 0, totalB = 0;
    let sampleCount = 0;

    for (let d = 1; d <= maxShadowDist; d++) {
      const coord = startCoord + dir * d;
      let sideAlpha = 0;
      let sideR = 0, sideG = 0, sideB = 0;
      let sideCount = 0;
      const scanSteps = Math.min(30, Math.floor((side === 'top' || side === 'bottom' ? rw : rh) / 3));

      for (let i = 0; i < scanSteps; i++) {
        const t = (i + 0.5) / scanSteps;
        const [px, py] = getCoord(d, i);
        if (px < 0 || px >= W || py < 0 || py >= H) continue;
        const c = getPixel(data, px, py, W);
        if (c.a > 10 && c.a < 230) {
          sideAlpha += c.a / 255;
          sideR += c.r;
          sideG += c.g;
          sideB += c.b;
          sideCount++;
        }
      }

      if (sideCount > 0 && sideAlpha / sideCount > 0.05) {
        maxDist = d;
        totalAlpha += sideAlpha / sideCount;
        totalR += sideR / sideCount;
        totalG += sideG / sideCount;
        totalB += sideB / sideCount;
        sampleCount++;
      }
    }

    if (maxDist >= 2 && sampleCount > 0) {
      (scan as any)[side + 'Dist'] = maxDist;
      (scan as any)[side + 'Alpha'] = totalAlpha / sampleCount;
      (scan as any)[side + 'Color'] = {
        r: Math.round(totalR / sampleCount),
        g: Math.round(totalG / sampleCount),
        b: Math.round(totalB / sampleCount)
      };
    }
  };

  scanSide('top', ry, -1, (d, i) => {
    const t = (i + 0.5) / 30;
    return [Math.floor(rx + rw * t), ry - d];
  });
  scanSide('bottom', ry + rh, 1, (d, i) => {
    const t = (i + 0.5) / 30;
    return [Math.floor(rx + rw * t), ry + rh + d - 1];
  });
  scanSide('left', rx, -1, (d, i) => {
    const t = (i + 0.5) / 30;
    return [rx - d, Math.floor(ry + rh * t)];
  });
  scanSide('right', rx + rw, 1, (d, i) => {
    const t = (i + 0.5) / 30;
    return [rx + rw + d - 1, Math.floor(ry + rh * t)];
  });

  const hasTop = scan.topDist > 0;
  const hasBottom = scan.bottomDist > 0;
  const hasLeft = scan.leftDist > 0;
  const hasRight = scan.rightDist > 0;

  if (!hasTop && !hasBottom && !hasLeft && !hasRight) return null;

  let offsetX = 0;
  if (hasLeft && !hasRight) offsetX = -Math.floor(scan.leftDist / 2);
  else if (hasRight && !hasLeft) offsetX = Math.floor(scan.rightDist / 2);
  else if (hasRight && hasLeft) offsetX = Math.floor((scan.rightDist - scan.leftDist) / 2);

  let offsetY = 0;
  if (hasTop && !hasBottom) offsetY = -Math.floor(scan.topDist / 2);
  else if (hasBottom && !hasTop) offsetY = Math.floor(scan.bottomDist / 2);
  else if (hasBottom && hasTop) offsetY = Math.floor((scan.bottomDist - scan.topDist) / 2);

  const maxVisibleDist = Math.max(
    scan.topDist, scan.bottomDist, scan.leftDist, scan.rightDist
  );
  const blur = Math.max(1, Math.floor(maxVisibleDist * 0.7));

  let avgR = 0, avgG = 0, avgB = 0;
  let colorCount = 0;
  const sides = ['top', 'bottom', 'left', 'right'] as const;
  for (const side of sides) {
    const dist = (scan as any)[side + 'Dist'];
    if (dist > 0) {
      const c = (scan as any)[side + 'Color'] as { r: number; g: number; b: number };
      avgR += c.r; avgG += c.g; avgB += c.b;
      colorCount++;
    }
  }
  if (colorCount > 0) {
    avgR = Math.round(avgR / colorCount);
    avgG = Math.round(avgG / colorCount);
    avgB = Math.round(avgB / colorCount);
  } else {
    avgR = 0; avgG = 0; avgB = 0;
  }

  const avgAlpha = Math.max(0.1, Math.min(0.5,
    (scan.topAlpha + scan.bottomAlpha + scan.leftAlpha + scan.rightAlpha) / (colorCount || 1)
  ));

  return {
    offsetX,
    offsetY,
    blur,
    spread: 0,
    color: `rgba(${avgR}, ${avgG}, ${avgB}, ${avgAlpha.toFixed(2)})`,
    inset: false
  };
};

const detectInnerShadow = (
  data: Uint8ClampedArray,
  W: number,
  H: number,
  rx: number, ry: number, rw: number, rh: number
): ShadowStyle | null => {
  const borderWidth = Math.min(15, Math.floor(Math.min(rw, rh) / 8));
  if (borderWidth < 3 || rw < 30 || rh < 30) return null;

  const innerBand: Array<{ r: number; g: number; b: number }> = [];
  const outerBand: Array<{ r: number; g: number; b: number }> = [];

  const sampleStep = Math.max(1, Math.floor(rw / 40));
  for (let px = rx + borderWidth + 2; px < rx + rw - borderWidth - 2; px += sampleStep) {
    for (let t = 0; t < borderWidth; t++) {
      if (ry + t < H) {
        const c = getPixel(data, px, ry + t, W);
        if (c.a > 128) innerBand.push({ r: c.r, g: c.g, b: c.b });
      }
      if (ry + borderWidth + t < H) {
        const c = getPixel(data, px, ry + borderWidth + t, W);
        if (c.a > 128) outerBand.push({ r: c.r, g: c.g, b: c.b });
      }
      if (ry + rh - 1 - t >= 0) {
        const c = getPixel(data, px, ry + rh - 1 - t, W);
        if (c.a > 128) innerBand.push({ r: c.r, g: c.g, b: c.b });
      }
      if (ry + rh - 1 - borderWidth - t >= 0) {
        const c = getPixel(data, px, ry + rh - 1 - borderWidth - t, W);
        if (c.a > 128) outerBand.push({ r: c.r, g: c.g, b: c.b });
      }
    }
  }

  if (innerBand.length < 30 || outerBand.length < 30) return null;

  const avg = (arr: Array<{ r: number; g: number; b: number }>) => {
    let r = 0, g = 0, b = 0;
    arr.forEach(c => { r += c.r; g += c.g; b += c.b; });
    return { r: r / arr.length, g: g / arr.length, b: b / arr.length };
  };

  const innerAvg = avg(innerBand);
  const outerAvg = avg(outerBand);

  const innerLum = luminance(innerAvg.r, innerAvg.g, innerAvg.b);
  const outerLum = luminance(outerAvg.r, outerAvg.g, outerAvg.b);
  const lumDiff = innerLum - outerLum;

  if (Math.abs(lumDiff) < 12) return null;

  const isDarker = lumDiff < 0;
  const shadowStrength = Math.min(0.4, Math.abs(lumDiff) / 150);

  const innerVar = innerBand.reduce((s, c) => s + Math.pow(luminance(c.r, c.g, c.b) - innerLum, 2), 0) / innerBand.length;
  const outerVar = outerBand.reduce((s, c) => s + Math.pow(luminance(c.r, c.g, c.b) - outerLum, 2), 0) / outerBand.length;

  if (innerVar > outerVar * 3) return null;

  let shadowR: number, shadowG: number, shadowB: number;
  if (isDarker) {
    shadowR = Math.round(innerAvg.r * 0.3);
    shadowG = Math.round(innerAvg.g * 0.3);
    shadowB = Math.round(innerAvg.b * 0.3);
  } else {
    shadowR = Math.min(255, Math.round(innerAvg.r + (255 - innerAvg.r) * 0.5));
    shadowG = Math.min(255, Math.round(innerAvg.g + (255 - innerAvg.g) * 0.5));
    shadowB = Math.min(255, Math.round(innerAvg.b + (255 - innerAvg.b) * 0.5));
  }

  return {
    offsetX: 0,
    offsetY: isDarker ? Math.floor(borderWidth / 3) : -Math.floor(borderWidth / 3),
    blur: Math.floor(borderWidth * 0.8),
    spread: 0,
    color: `rgba(${shadowR}, ${shadowG}, ${shadowB}, ${shadowStrength.toFixed(2)})`,
    inset: true
  };
};

const generateSemanticName = (
  region: Omit<StyleRegion, 'cssText' | 'id' | 'thumbnail' | 'name'>,
  index: number
): string => {
  const parts: string[] = [];

  if (region.gradient) {
    const startHex = region.gradient.stops[0]?.color || '#000';
    const endHex = region.gradient.stops[region.gradient.stops.length - 1]?.color || '#fff';
    const startR = parseInt(startHex.slice(1, 3), 16);
    const startG = parseInt(startHex.slice(3, 5), 16);
    const startB = parseInt(startHex.slice(5, 7), 16);
    const endR = parseInt(endHex.slice(1, 3), 16);
    const endG = parseInt(endHex.slice(3, 5), 16);
    const endB = parseInt(endHex.slice(5, 7), 16);

    const startLum = luminance(startR, startG, startB);
    const endLum = luminance(endR, endG, endB);
    const startHue = rgbToHue(startR, startG, startB);
    const endHue = rgbToHue(endR, endG, endB);

    const warmColors = ['橙', '黄', '红', '粉'];
    const coolColors = ['蓝', '青', '紫', '绿'];
    const startHueName = getHueName(startHue, startLum);
    const endHueName = getHueName(endHue, endLum);

    if (region.gradient.type === 'radial') {
      parts.push('径向渐变');
    } else {
      parts.push('渐变');
    }
    parts.push(`${startHueName}-${endHueName}`);
  } else if (region.backgroundColor) {
    const hex = region.backgroundColor;
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const lum = luminance(r, g, b);
    const hue = rgbToHue(r, g, b);

    if (lum > 200) parts.push('浅色');
    else if (lum < 60) parts.push('深色');
    else parts.push(getHueName(hue, lum));
  }

  if (region.boxShadow?.length) parts.push('投影');
  if (region.innerShadow?.length) parts.push('内阴影');
  if (region.borderRadius > 0) {
    if (region.borderRadius >= 20) parts.push('大圆角');
    else if (region.borderRadius >= 8) parts.push('圆角');
    else parts.push('微圆角');
  }

  if (region.width > region.height * 2) parts.push('条形');
  else if (region.height > region.width * 2) parts.push('竖条');
  else if (region.width > 200 && region.height > 200) parts.push('大块');

  const name = parts.length > 0 ? parts.join('') : '元素';
  return `${name}-${index + 1}`;
};

const rgbToHue = (r: number, g: number, b: number): number => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  if (d === 0) return 0;
  let h = 0;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  h = Math.round(h * 60);
  if (h < 0) h += 360;
  return h;
};

const getHueName = (hue: number, lum: number): string => {
  if (lum < 30) return '黑';
  if (lum > 230) return '白';
  if (lum < 80) {
    if (hue < 20 || hue > 340) return '深红';
    if (hue < 45) return '深橙';
    if (hue < 70) return '深黄';
    if (hue < 160) return '深绿';
    if (hue < 200) return '深青';
    if (hue < 260) return '深蓝';
    if (hue < 300) return '深紫';
    return '深粉';
  }
  if (hue < 15 || hue > 345) return '红';
  if (hue < 40) return '橙';
  if (hue < 65) return '黄';
  if (hue < 160) return '绿';
  if (hue < 200) return '青';
  if (hue < 255) return '蓝';
  if (hue < 300) return '紫';
  return '粉';
};

export const detectStyles = async (
  imageSource: HTMLImageElement | string
): Promise<StyleRegion[]> => {
  const img: HTMLImageElement = await new Promise((resolve, reject) => {
    if (typeof imageSource === 'string') {
      const image = new Image();
      image.crossOrigin = 'anonymous';
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = imageSource;
    } else {
      resolve(imageSource);
    }
  });

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const W = canvas.width;
  const H = canvas.height;

  const boxes = findOpaqueRegions(data, W, H);
  const regions: StyleRegion[] = [];

  for (const box of boxes) {
    const { x: rx, y: ry, w: rw, h: rh } = box;

    const gradient = detectGradient(data, W, H, rx, ry, rw, rh);

    let backgroundColor: string | undefined;
    if (!gradient) {
      const sampleCount = 50;
      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      for (let i = 0; i < sampleCount; i++) {
        const px = Math.floor(rx + Math.random() * rw);
        const py = Math.floor(ry + Math.random() * rh);
        if (px >= 0 && px < W && py >= 0 && py < H) {
          const c = getPixel(data, px, py, W);
          if (c.a > 128) {
            rSum += c.r; gSum += c.g; bSum += c.b; count++;
          }
        }
      }
      if (count > 0) {
        backgroundColor = rgbToHex(rSum / count, gSum / count, bSum / count);
      }
    }

    const borderRadius = detectBorderRadius(data, W, H, rx, ry, rw, rh);
    const boxShadow = detectBoxShadow(data, W, H, rx, ry, rw, rh);
    const innerShadow = detectInnerShadow(data, W, H, rx, ry, rw, rh);

    const regionData = {
      x: rx,
      y: ry,
      width: rw,
      height: rh,
      borderRadius,
      gradient: gradient || undefined,
      boxShadow: boxShadow ? [boxShadow] : undefined,
      innerShadow: innerShadow ? [innerShadow] : undefined,
      backgroundColor
    };

    const thumbnail = createThumbnail(canvas, rx, ry, rw, rh);
    const cssText = generateCSS(regionData);
    const name = generateSemanticName(regionData, regions.length);

    regions.push({
      id: generateId(),
      ...regionData,
      thumbnail,
      cssText,
      name
    });
  }

  regions.sort((a, b) => (b.width * b.height) - (a.width * a.height));
  return regions;
};

const createThumbnail = (
  canvas: HTMLCanvasElement,
  x: number, y: number, w: number, h: number
): string => {
  const thumbW = 80;
  const thumbH = Math.max(40, Math.floor(thumbW * (h / w)));
  const thumbCanvas = document.createElement('canvas');
  thumbCanvas.width = thumbW;
  thumbCanvas.height = thumbH;
  const tctx = thumbCanvas.getContext('2d')!;
  tctx.drawImage(canvas, x, y, w, h, 0, 0, thumbW, thumbH);
  return thumbCanvas.toDataURL('image/png');
};

export const generateFullCSS = (regions: StyleRegion[]): string => {
  const parts: string[] = [];
  parts.push('/* Auto-generated CSS by Style Extractor */\n');
  regions.forEach((region) => {
    const className = region.name
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .toLowerCase() || 'element';
    parts.push(`/* Element: ${region.name} */`);
    parts.push(`.${className} {`);
    parts.push(region.cssText);
    parts.push('}\n');
  });
  return parts.join('\n');
};

export const downloadCSS = (content: string, filename: string = 'style.css'): void => {
  const blob = new Blob([content], { type: 'text/css' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      document.body.removeChild(ta);
      return false;
    }
  }
};

export { detectGradient, detectBorderRadius, detectBoxShadow, detectInnerShadow, findOpaqueRegions, generateSemanticName };
