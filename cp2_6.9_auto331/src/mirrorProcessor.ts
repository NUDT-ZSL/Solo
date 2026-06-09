export type MirrorType = 'convex' | 'concave' | 'wave' | 'kaleidoscope';

export interface MirrorParams {
  strength: number;
  frequency?: number;
}

const DEFAULT_PARAMS: Record<MirrorType, MirrorParams> = {
  convex: { strength: 1.0 },
  concave: { strength: 1.0 },
  wave: { strength: 1.0, frequency: 6 },
  kaleidoscope: { strength: 1.0 },
};

export function getDefaultParams(type: MirrorType): MirrorParams {
  return { ...DEFAULT_PARAMS[type] };
}

function bilinearSample(
  srcData: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  x: number,
  y: number
): [number, number, number, number] {
  if (x < 0 || x >= srcW - 1 || y < 0 || y >= srcH - 1) {
    return [0, 0, 0, 0];
  }
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const fx = x - x0;
  const fy = y - y0;
  const i00 = (y0 * srcW + x0) * 4;
  const i10 = (y0 * srcW + x1) * 4;
  const i01 = (y1 * srcW + x0) * 4;
  const i11 = (y1 * srcW + x1) * 4;
  const r =
    srcData[i00] * (1 - fx) * (1 - fy) +
    srcData[i10] * fx * (1 - fy) +
    srcData[i01] * (1 - fx) * fy +
    srcData[i11] * fx * fy;
  const g =
    srcData[i00 + 1] * (1 - fx) * (1 - fy) +
    srcData[i10 + 1] * fx * (1 - fy) +
    srcData[i01 + 1] * (1 - fx) * fy +
    srcData[i11 + 1] * fx * fy;
  const b =
    srcData[i00 + 2] * (1 - fx) * (1 - fy) +
    srcData[i10 + 2] * fx * (1 - fy) +
    srcData[i01 + 2] * (1 - fx) * fy +
    srcData[i11 + 2] * fx * fy;
  const a =
    srcData[i00 + 3] * (1 - fx) * (1 - fy) +
    srcData[i10 + 3] * fx * (1 - fy) +
    srcData[i01 + 3] * (1 - fx) * fy +
    srcData[i11 + 3] * fx * fy;
  return [r, g, b, a];
}

export function convexMirror(
  srcData: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  dstData: Uint8ClampedArray,
  dstW: number,
  dstH: number,
  strength: number
): void {
  const cx = dstW / 2;
  const cy = dstH / 2;
  const maxR = Math.min(cx, cy);
  const k = strength;
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dstI = (y * dstW + x) * 4;
      if (dist >= maxR) {
        dstData[dstI] = 10;
        dstData[dstI + 1] = 15;
        dstData[dstI + 2] = 25;
        dstData[dstI + 3] = 255;
        continue;
      }
      const rNorm = dist / maxR;
      const rSrc = rNorm * rNorm * maxR / Math.max(0.3, k);
      const scale = rSrc / (dist || 1);
      const sx = cx + dx * scale;
      const sy = cy + dy * scale;
      const sampleX = (sx / dstW) * srcW;
      const sampleY = (sy / dstH) * srcH;
      const [r, g, b, a] = bilinearSample(srcData, srcW, srcH, sampleX, sampleY);
      dstData[dstI] = r;
      dstData[dstI + 1] = g;
      dstData[dstI + 2] = b;
      dstData[dstI + 3] = a;
    }
  }
}

export function concaveMirror(
  srcData: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  dstData: Uint8ClampedArray,
  dstW: number,
  dstH: number,
  strength: number
): void {
  const cx = dstW / 2;
  const cy = dstH / 2;
  const maxR = Math.min(cx, cy);
  const k = strength;
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dstI = (y * dstW + x) * 4;
      if (dist >= maxR) {
        dstData[dstI] = 10;
        dstData[dstI + 1] = 15;
        dstData[dstI + 2] = 25;
        dstData[dstI + 3] = 255;
        continue;
      }
      const rNorm = dist / maxR;
      const rSrc = Math.sqrt(rNorm) * maxR * Math.max(0.3, k);
      const scale = rSrc / (dist || 1);
      const sx = cx + dx * scale;
      const sy = cy + dy * scale;
      const sampleX = (sx / dstW) * srcW;
      const sampleY = (sy / dstH) * srcH;
      const [r, g, b, a] = bilinearSample(srcData, srcW, srcH, sampleX, sampleY);
      dstData[dstI] = r;
      dstData[dstI + 1] = g;
      dstData[dstI + 2] = b;
      dstData[dstI + 3] = a;
    }
  }
}

export function waveMirror(
  srcData: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  dstData: Uint8ClampedArray,
  dstW: number,
  dstH: number,
  strength: number,
  frequency: number = 6
): void {
  const amp = 12 * strength;
  const freq = frequency;
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const offsetX =
        Math.sin((y / dstH) * Math.PI * 2 * freq) * amp +
        Math.cos((x / dstW) * Math.PI * 2 * freq * 0.7) * amp * 0.5;
      const offsetY =
        Math.cos((x / dstW) * Math.PI * 2 * freq) * amp +
        Math.sin((y / dstH) * Math.PI * 2 * freq * 0.7) * amp * 0.5;
      const sx = x + offsetX;
      const sy = y + offsetY;
      const sampleX = (sx / dstW) * srcW;
      const sampleY = (sy / dstH) * srcH;
      const dstI = (y * dstW + x) * 4;
      const [r, g, b, a] = bilinearSample(srcData, srcW, srcH, sampleX, sampleY);
      dstData[dstI] = r;
      dstData[dstI + 1] = g;
      dstData[dstI + 2] = b;
      dstData[dstI + 3] = a;
    }
  }
}

export function kaleidoscopeMirror(
  srcData: Uint8ClampedArray,
  srcW: number,
  srcH: number,
  dstData: Uint8ClampedArray,
  dstW: number,
  dstH: number,
  strength: number
): void {
  const cx = dstW / 2;
  const cy = dstH / 2;
  const maxR = Math.min(cx, cy);
  const segments = 6;
  const segmentAngle = (Math.PI * 2) / segments;
  const k = strength;
  for (let y = 0; y < dstH; y++) {
    for (let x = 0; x < dstW; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const dstI = (y * dstW + x) * 4;
      if (dist > maxR) {
        dstData[dstI] = 10;
        dstData[dstI + 1] = 15;
        dstData[dstI + 2] = 25;
        dstData[dstI + 3] = 255;
        continue;
      }
      let angle = Math.atan2(dy, dx);
      if (angle < 0) angle += Math.PI * 2;
      const segIdx = Math.floor(angle / segmentAngle);
      const segAngle = angle - segIdx * segmentAngle;
      const mirrored = segIdx % 2 === 1;
      let finalAngle = mirrored ? segmentAngle - segAngle : segAngle;
      finalAngle = finalAngle * k;
      const rScale = dist / maxR;
      const sx = cx + Math.cos(finalAngle) * rScale * maxR * 0.9;
      const sy = cy + Math.sin(finalAngle) * rScale * maxR * 0.9;
      const sampleX = (sx / dstW) * srcW;
      const sampleY = (sy / dstH) * srcH;
      const [r, g, b, a] = bilinearSample(srcData, srcW, srcH, sampleX, sampleY);
      dstData[dstI] = r;
      dstData[dstI + 1] = g;
      dstData[dstI + 2] = b;
      dstData[dstI + 3] = a;
    }
  }
}

export function renderMirror(
  type: MirrorType,
  sourceCanvas: HTMLCanvasElement,
  targetCanvas: HTMLCanvasElement,
  params: MirrorParams
): void {
  const srcCtx = sourceCanvas.getContext('2d');
  const dstCtx = targetCanvas.getContext('2d');
  if (!srcCtx || !dstCtx) return;
  const srcW = sourceCanvas.width;
  const srcH = sourceCanvas.height;
  const dstW = targetCanvas.width;
  const dstH = targetCanvas.height;
  if (srcW === 0 || srcH === 0) {
    dstCtx.fillStyle = 'rgba(20,25,40,1)';
    dstCtx.fillRect(0, 0, dstW, dstH);
    return;
  }
  const srcImageData = srcCtx.getImageData(0, 0, srcW, srcH);
  const dstImageData = dstCtx.createImageData(dstW, dstH);
  switch (type) {
    case 'convex':
      convexMirror(
        srcImageData.data,
        srcW,
        srcH,
        dstImageData.data,
        dstW,
        dstH,
        params.strength
      );
      break;
    case 'concave':
      concaveMirror(
        srcImageData.data,
        srcW,
        srcH,
        dstImageData.data,
        dstW,
        dstH,
        params.strength
      );
      break;
    case 'wave':
      waveMirror(
        srcImageData.data,
        srcW,
        srcH,
        dstImageData.data,
        dstW,
        dstH,
        params.strength,
        params.frequency ?? 6
      );
      break;
    case 'kaleidoscope':
      kaleidoscopeMirror(
        srcImageData.data,
        srcW,
        srcH,
        dstImageData.data,
        dstW,
        dstH,
        params.strength
      );
      break;
  }
  dstCtx.putImageData(dstImageData, 0, 0);
}
