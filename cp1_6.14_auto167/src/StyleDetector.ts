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
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
};

const colorDistance = (
  c1: { r: number; g: number; b: number; a: number },
  c2: { r: number; g: number; b: number; a: number }
): number => {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2) +
    Math.pow((c1.a - c2.a) * 255, 2)
  );
};

const generateId = (): string => {
  return 'region_' + Math.random().toString(36).substr(2, 9);
};

const getPixel = (data: Uint8ClampedArray, x: number, y: number, w: number) => {
  const idx = (y * w + x) * 4;
  return {
    r: data[idx],
    g: data[idx + 1],
    b: data[idx + 2],
    a: data[idx + 3]
  };
};

const generateCSS = (region: Omit<StyleRegion, 'cssText' | 'id' | 'thumbnail' | 'name'>): string => {
  const lines: string[] = [];

  if (region.backgroundColor) {
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

  const visited = new Uint8Array(W * H);
  const regions: StyleRegion[] = [];

  const bfs = (sx: number, sy: number): { x: number; y: number; w: number; h: number; pixels: Array<{x: number; y: number}> } | null => {
    if (sx < 0 || sy < 0 || sx >= W || sy >= H) return null;
    const startIdx = sy * W + sx;
    if (visited[startIdx]) return null;

    const startPixel = getPixel(data, sx, sy, W);
    if (startPixel.a < 30) return null;

    const queue: Array<{x: number; y: number}> = [{ x: sx, y: sy }];
    const pixels: Array<{x: number; y: number}> = [];
    let minX = sx, maxX = sx, minY = sy, maxY = sy;
    visited[startIdx] = 1;

    while (queue.length > 0) {
      const p = queue.shift()!;
      pixels.push(p);
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);

      const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
      for (const [dx, dy] of dirs) {
        const nx = p.x + dx;
        const ny = p.y + dy;
        if (nx >= 0 && nx < W && ny >= 0 && ny < H) {
          const nIdx = ny * W + nx;
          if (!visited[nIdx]) {
            const np = getPixel(data, nx, ny, W);
            if (np.a > 30 && colorDistance(startPixel, np) < 120) {
              visited[nIdx] = 1;
              queue.push({ x: nx, y: ny });
            }
          }
        }
      }
    }

    const w = maxX - minX + 1;
    const h = maxY - minY + 1;
    if (w < 20 || h < 20 || pixels.length < 400) return null;

    return { x: minX, y: minY, w, h, pixels };
  };

  const analyzeRegion = (
    box: { x: number; y: number; w: number; h: number; pixels: Array<{x: number; y: number}> },
    canvasCtx: CanvasRenderingContext2D,
    originalImg: HTMLImageElement
  ): Omit<StyleRegion, 'cssText' | 'id' | 'thumbnail' | 'name'> => {
    const { x: rx, y: ry, w: rw, h: rh } = box;

    const samplePoints: Array<{x: number; y: number; c: {r: number; g: number; b: number; a: number}}> = [];
    for (let i = 0; i < Math.min(200, box.pixels.length); i++) {
      const idx = Math.floor((i / Math.min(200, box.pixels.length)) * box.pixels.length);
      const p = box.pixels[idx];
      samplePoints.push({ x: p.x, y: p.y, c: getPixel(data, p.x, p.y, W) });
    }

    let hasGradient = false;
    let maxColorDiff = 0;
    for (let i = 0; i < samplePoints.length; i++) {
      for (let j = i + 1; j < samplePoints.length; j++) {
        const d = colorDistance(samplePoints[i].c, samplePoints[j].c);
        maxColorDiff = Math.max(maxColorDiff, d);
        if (d > 80) hasGradient = true;
      }
    }

    let gradient: GradientStyle | undefined;
    let backgroundColor: string | undefined;

    if (hasGradient && maxColorDiff > 100) {
      const horizontalSamples: Array<{pos: number; color: string}> = [];
      const midY = Math.floor(ry + rh / 2);
      for (let px = rx; px < rx + rw; px += Math.max(1, Math.floor(rw / 20))) {
        const c = getPixel(data, px, midY, W);
        if (c.a > 30) {
          horizontalSamples.push({
            pos: (px - rx) / rw,
            color: rgbToHex(c.r, c.g, c.b)
          });
        }
      }

      const verticalSamples: Array<{pos: number; color: string}> = [];
      const midX = Math.floor(rx + rw / 2);
      for (let py = ry; py < ry + rh; py += Math.max(1, Math.floor(rh / 20))) {
        const c = getPixel(data, midX, py, W);
        if (c.a > 30) {
          verticalSamples.push({
            pos: (py - ry) / rh,
            color: rgbToHex(c.r, c.g, c.b)
          });
        }
      }

      let useHorizontal = false;
      let horizDiff = 0, vertDiff = 0;
      if (horizontalSamples.length >= 2) {
        const f = hexToRgb(horizontalSamples[0].color)!;
        const l = hexToRgb(horizontalSamples[horizontalSamples.length - 1].color)!;
        horizDiff = colorDistance({...f, a: 255}, {...l, a: 255});
      }
      if (verticalSamples.length >= 2) {
        const f = hexToRgb(verticalSamples[0].color)!;
        const l = hexToRgb(verticalSamples[verticalSamples.length - 1].color)!;
        vertDiff = colorDistance({...f, a: 255}, {...l, a: 255});
      }
      useHorizontal = horizDiff >= vertDiff;

      const samples = useHorizontal ? horizontalSamples : verticalSamples;
      if (samples.length >= 2) {
        const startColor = samples[0].color;
        const endColor = samples[samples.length - 1].color;
        gradient = {
          type: 'linear',
          angle: useHorizontal ? 90 : 180,
          stops: [
            { color: startColor, position: 0 },
            { color: endColor, position: 1 }
          ]
        };
      }
    }

    if (!gradient) {
      let rSum = 0, gSum = 0, bSum = 0, count = 0;
      samplePoints.forEach(sp => {
        rSum += sp.c.r;
        gSum += sp.c.g;
        bSum += sp.c.b;
        count++;
      });
      if (count > 0) {
        backgroundColor = rgbToHex(rSum / count, gSum / count, bSum / count);
      }
    }

    let borderRadius = 0;
    const cornerSize = Math.min(Math.floor(rw / 4), Math.floor(rh / 4));
    const corners = [
      { cx: rx, cy: ry, dx: 1, dy: 1 },
      { cx: rx + rw - 1, cy: ry, dx: -1, dy: 1 },
      { cx: rx, cy: ry + rh - 1, dx: 1, dy: -1 },
      { cx: rx + rw - 1, cy: ry + rh - 1, dx: -1, dy: -1 }
    ];

    let totalRadius = 0;
    let validCorners = 0;

    for (const corner of corners) {
      let r = 0;
      for (let test = 0; test < cornerSize; test++) {
        const tx = corner.cx + corner.dx * test;
        const ty = corner.cy + corner.dy * test;
        if (tx >= 0 && tx < W && ty >= 0 && ty < H) {
          const p = getPixel(data, tx, ty, W);
          if (p.a < 50) {
            r = test;
            break;
          }
        }
      }
      if (r > 0) {
        totalRadius += r;
        validCorners++;
      } else {
        totalRadius += 0;
        validCorners++;
      }
    }
    borderRadius = validCorners > 0 ? Math.floor(totalRadius / validCorners) : 0;
    if (borderRadius < 2) borderRadius = 0;

    const boxShadow: ShadowStyle[] = [];
    const shadowThickness = Math.min(30, Math.floor(Math.min(rw, rh) / 6));

    let shadowFound = false;
    let shadowR = 0, shadowG = 0, shadowB = 0, shadowA = 0;
    let shadowCount = 0;
    let maxShadowOffset = 0;

    for (let side = 0; side < 4 && !shadowFound; side++) {
      for (let d = 1; d <= shadowThickness && !shadowFound; d++) {
        let edgePixels = 0;
        let opaquePixels = 0;
        const colorAccum = { r: 0, g: 0, b: 0, a: 0 };

        if (side === 0 && ry - d >= 0) {
          for (let px = rx; px < rx + rw; px++) {
            const p = getPixel(data, px, ry - d, W);
            edgePixels++;
            colorAccum.r += p.r;
            colorAccum.g += p.g;
            colorAccum.b += p.b;
            colorAccum.a += p.a;
            if (p.a > 20 && p.a < 200) opaquePixels++;
          }
        } else if (side === 1 && ry + rh + d - 1 < H) {
          for (let px = rx; px < rx + rw; px++) {
            const p = getPixel(data, px, ry + rh + d - 1, W);
            edgePixels++;
            colorAccum.r += p.r;
            colorAccum.g += p.g;
            colorAccum.b += p.b;
            colorAccum.a += p.a;
            if (p.a > 20 && p.a < 200) opaquePixels++;
          }
        } else if (side === 2 && rx - d >= 0) {
          for (let py = ry; py < ry + rh; py++) {
            const p = getPixel(data, rx - d, py, W);
            edgePixels++;
            colorAccum.r += p.r;
            colorAccum.g += p.g;
            colorAccum.b += p.b;
            colorAccum.a += p.a;
            if (p.a > 20 && p.a < 200) opaquePixels++;
          }
        } else if (side === 3 && rx + rw + d - 1 < W) {
          for (let py = ry; py < ry + rh; py++) {
            const p = getPixel(data, rx + rw + d - 1, py, W);
            edgePixels++;
            colorAccum.r += p.r;
            colorAccum.g += p.g;
            colorAccum.b += p.b;
            colorAccum.a += p.a;
            if (p.a > 20 && p.a < 200) opaquePixels++;
          }
        }

        if (edgePixels > 0 && opaquePixels / edgePixels > 0.15) {
          maxShadowOffset = Math.max(maxShadowOffset, d);
          shadowR += colorAccum.r / edgePixels;
          shadowG += colorAccum.g / edgePixels;
          shadowB += colorAccum.b / edgePixels;
          shadowA += colorAccum.a / edgePixels;
          shadowCount++;
          if (d >= 3) shadowFound = true;
        }
      }
    }

    if (shadowCount > 0 && maxShadowOffset >= 2) {
      const avgR = Math.floor(shadowR / shadowCount);
      const avgG = Math.floor(shadowG / shadowCount);
      const avgB = Math.floor(shadowB / shadowCount);
      const avgA = Math.max(0.15, Math.min(0.6, (shadowA / shadowCount) / 255));
      boxShadow.push({
        offsetX: 0,
        offsetY: Math.floor(maxShadowOffset / 2),
        blur: Math.floor(maxShadowOffset * 1.5),
        spread: 0,
        color: `rgba(${avgR}, ${avgG}, ${avgB}, ${avgA.toFixed(2)})`,
        inset: false
      });
    }

    const innerShadow: ShadowStyle[] = [];
    if (rw > 20 && rh > 20) {
      const borderThickness = Math.min(10, Math.floor(Math.min(rw, rh) / 10));
      const innerColors: Array<{r: number; g: number; b: number; a: number}> = [];
      const outerColors: Array<{r: number; g: number; b: number; a: number}> = [];

      for (let px = rx + borderThickness; px < rx + rw - borderThickness; px += Math.max(1, Math.floor(rw / 30))) {
        for (let t = 0; t < borderThickness; t++) {
          if (ry + t < H) innerColors.push(getPixel(data, px, ry + t, W));
          if (ry + borderThickness + t < H) outerColors.push(getPixel(data, px, ry + borderThickness + t, W));
          if (ry + rh - 1 - t >= 0) innerColors.push(getPixel(data, px, ry + rh - 1 - t, W));
          if (ry + rh - 1 - borderThickness - t >= 0) outerColors.push(getPixel(data, px, ry + rh - 1 - borderThickness - t, W));
        }
      }

      if (innerColors.length > 20 && outerColors.length > 20) {
        let iR = 0, iG = 0, iB = 0;
        innerColors.forEach(c => { iR += c.r; iG += c.g; iB += c.b; });
        iR /= innerColors.length; iG /= innerColors.length; iB /= innerColors.length;

        let oR = 0, oG = 0, oB = 0;
        outerColors.forEach(c => { oR += c.r; oG += c.g; oB += c.b; });
        oR /= outerColors.length; oG /= outerColors.length; oB /= outerColors.length;

        const darknessDiff = ((iR + iG + iB) / 3) - ((oR + oG + oB) / 3);

        if (Math.abs(darknessDiff) > 15) {
          const isDarker = darknessDiff < 0;
          const alpha = Math.min(0.35, Math.abs(darknessDiff) / 200);
          innerShadow.push({
            offsetX: 0,
            offsetY: isDarker ? Math.floor(borderThickness / 2) : -Math.floor(borderThickness / 2),
            blur: borderThickness,
            spread: 0,
            color: isDarker
              ? `rgba(0, 0, 0, ${alpha.toFixed(2)})`
              : `rgba(255, 255, 255, ${alpha.toFixed(2)})`,
            inset: true
          });
        }
      }
    }

    return {
      x: rx,
      y: ry,
      width: rw,
      height: rh,
      borderRadius,
      gradient,
      boxShadow: boxShadow.length > 0 ? boxShadow : undefined,
      innerShadow: innerShadow.length > 0 ? innerShadow : undefined,
      backgroundColor
    };
  };

  const createThumbnail = (
    x: number, y: number, w: number, h: number
  ): string => {
    const thumbW = 80;
    const thumbH = Math.max(40, Math.floor(thumbW * (h / w)));
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = thumbW;
    thumbCanvas.height = thumbH;
    const tctx = thumbCanvas.getContext('2d')!;
    tctx.drawImage(
      canvas,
      x, y, w, h,
      0, 0, thumbW, thumbH
    );
    return thumbCanvas.toDataURL('image/png');
  };

  const step = Math.max(4, Math.floor(Math.min(W, H) / 300));
  for (let y = 0; y < H; y += step) {
    for (let x = 0; x < W; x += step) {
      const result = bfs(x, y);
      if (result) {
        const analyzed = analyzeRegion(result, ctx, img);
        const thumbnail = createThumbnail(analyzed.x, analyzed.y, analyzed.width, analyzed.height);
        const cssText = generateCSS(analyzed);
        const regionCount = regions.length + 1;
        const hasGradient = !!analyzed.gradient;
        const hasShadow = !!analyzed.boxShadow?.length || !!analyzed.innerShadow?.length;
        const hasRadius = analyzed.borderRadius > 0;

        let name = `元素 ${regionCount}`;
        if (hasGradient && hasShadow) name = `渐变+阴影元素 ${regionCount}`;
        else if (hasGradient) name = `渐变元素 ${regionCount}`;
        else if (hasShadow && hasRadius) name = `圆角+阴影元素 ${regionCount}`;
        else if (hasShadow) name = `阴影元素 ${regionCount}`;
        else if (hasRadius) name = `圆角元素 ${regionCount}`;

        regions.push({
          id: generateId(),
          ...analyzed,
          thumbnail,
          cssText,
          name
        });
      }
    }
  }

  regions.sort((a, b) => (b.width * b.height) - (a.width * a.height));

  return regions;
};

export const generateFullCSS = (regions: StyleRegion[]): string => {
  const parts: string[] = [];
  parts.push('/* Auto-generated CSS by Style Extractor */\n');
  regions.forEach((region, idx) => {
    parts.push(`/* Element: ${region.name} */`);
    parts.push(`.element-${idx + 1} {`);
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
