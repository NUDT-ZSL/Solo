type ColorMapKey = 'flame' | 'ocean' | 'camo' | 'neon';

interface ColorStop {
  pos: number;
  r: number;
  g: number;
  b: number;
}

const COLOR_MAPS: Record<ColorMapKey, ColorStop[]> = {
  flame: [
    { pos: 0.0, r: 0.102, g: 0.137, b: 0.494 },
    { pos: 0.5, r: 0.550, g: 0.250, b: 0.200 },
    { pos: 1.0, r: 1.000, g: 0.435, b: 0.000 },
  ],
  ocean: [
    { pos: 0.0, r: 0.020, g: 0.027, b: 0.122 },
    { pos: 0.25, r: 0.020, g: 0.100, b: 0.350 },
    { pos: 0.5, r: 0.000, g: 0.400, b: 0.600 },
    { pos: 0.75, r: 0.100, g: 0.700, b: 0.800 },
    { pos: 1.0, r: 0.700, g: 0.950, b: 1.000 },
  ],
  camo: [
    { pos: 0.0, r: 0.050, g: 0.080, b: 0.050 },
    { pos: 0.3, r: 0.180, g: 0.280, b: 0.120 },
    { pos: 0.5, r: 0.380, g: 0.420, b: 0.180 },
    { pos: 0.75, r: 0.500, g: 0.500, b: 0.280 },
    { pos: 1.0, r: 0.750, g: 0.700, b: 0.450 },
  ],
  neon: [
    { pos: 0.0, r: 0.040, g: 0.000, b: 0.100 },
    { pos: 0.25, r: 0.400, g: 0.000, b: 0.800 },
    { pos: 0.5, r: 0.000, g: 0.900, b: 1.000 },
    { pos: 0.75, r: 0.900, g: 0.000, b: 0.800 },
    { pos: 1.0, r: 1.000, g: 1.000, b: 0.000 },
  ],
};

function lerpColor(stops: ColorStop[], t: number): [number, number, number] {
  t = Math.max(0, Math.min(1, t));
  let i = 0;
  while (i < stops.length - 1 && stops[i + 1].pos < t) i++;
  if (i >= stops.length - 1) {
    const s = stops[stops.length - 1];
    return [s.r, s.g, s.b];
  }
  const a = stops[i];
  const b = stops[i + 1];
  const range = b.pos - a.pos;
  const f = range <= 0 ? 0 : (t - a.pos) / range;
  return [a.r + (b.r - a.r) * f, a.g + (b.g - a.g) * f, a.b + (b.b - a.b) * f];
}

const GRID_SIZE = 256;

interface WorkerParams {
  cReal: number;
  cImag: number;
  maxIterations: number;
  colorMap: ColorMapKey;
}

interface WorkerResult {
  positions: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  wireframePositions: Float32Array;
}

self.onmessage = function (e: MessageEvent<WorkerParams>) {
  const params = e.data;
  const result = computeHeightField(params);
  self.postMessage(result, [
    result.positions.buffer,
    result.colors.buffer,
    result.indices.buffer,
    result.wireframePositions.buffer,
  ]);
};

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function isValid(v: number): boolean {
  return isFinite(v) && !isNaN(v);
}

function mandelbrotIter(zx0: number, zy0: number, cx: number, cy: number, maxIter: number): number {
  let zx = zx0;
  let zy = zy0;
  let iter = 0;
  const bailout = 4.0;

  for (iter = 0; iter < maxIter; iter++) {
    const x2 = zx * zx;
    const y2 = zy * zy;
    if (x2 + y2 > bailout) break;
    if (!isFinite(x2) || !isFinite(y2)) break;
    zy = 2.0 * zx * zy + cy;
    zx = x2 - y2 + cx;
  }

  if (iter < maxIter) {
    const magSq = zx * zx + zy * zy;
    if (isFinite(magSq) && magSq > 1.0) {
      const logZn = Math.log(magSq) * 0.5;
      if (isFinite(logZn) && logZn > 0.001) {
        const nu = Math.log(logZn / Math.LN2) / Math.LN2;
        if (isFinite(nu) && nu >= 0) {
          const smooth = iter + 1 - nu;
          if (isFinite(smooth) && smooth >= 0) {
            return Math.min(smooth, maxIter);
          }
        }
      }
    }
    return iter;
  }
  return maxIter;
}

function computeHeightField(params: WorkerParams): WorkerResult {
  const N = GRID_SIZE;
  const half = N / 2;
  const scale = 3.0 / half;

  const iterMap = new Float32Array(N * N);
  const heightMap = new Float32Array(N * N);

  const cReal = params.cReal;
  const cImag = params.cImag;
  const maxIter = params.maxIterations;

  for (let py = 0; py < N; py++) {
    for (let px = 0; px < N; px++) {
      const idx = py * N + px;

      const zx0 = (px - half) * scale;
      const zy0 = (py - half) * scale;

      const iterVal = mandelbrotIter(zx0, zy0, cReal, cImag, maxIter);
      iterMap[idx] = clamp(iterVal, 0, maxIter);

      const t = iterMap[idx] / maxIter;
      const h = Math.pow(t, 1.6) * 0.9;
      heightMap[idx] = isValid(h) ? h : 0;
    }
  }

  const vertexCount = N * N;
  const positions = new Float32Array(vertexCount * 3);
  const colors = new Float32Array(vertexCount * 3);
  const colorStops = COLOR_MAPS[params.colorMap];

  for (let py = 0; py < N; py++) {
    for (let px = 0; px < N; px++) {
      const idx = py * N + px;
      const vIdx = idx * 3;

      positions[vIdx] = (px - half) * scale;
      positions[vIdx + 1] = heightMap[idx];
      positions[vIdx + 2] = (py - half) * scale;

      const normIter = clamp(iterMap[idx] / maxIter, 0, 1);
      const [r, g, b] = lerpColor(colorStops, normIter);
      colors[vIdx] = r;
      colors[vIdx + 1] = g;
      colors[vIdx + 2] = b;
    }
  }

  const quadCount = (N - 1) * (N - 1);
  const indices = new Uint32Array(quadCount * 6);
  let iPtr = 0;
  for (let py = 0; py < N - 1; py++) {
    for (let px = 0; px < N - 1; px++) {
      const i0 = py * N + px;
      const i1 = i0 + 1;
      const i2 = i0 + N;
      const i3 = i2 + 1;
      indices[iPtr++] = i0;
      indices[iPtr++] = i2;
      indices[iPtr++] = i1;
      indices[iPtr++] = i1;
      indices[iPtr++] = i2;
      indices[iPtr++] = i3;
    }
  }

  const wireCount = (N - 1) * N * 2;
  const wirePositions = new Float32Array(wireCount * 3);
  let wPtr = 0;
  for (let py = 0; py < N; py++) {
    for (let px = 0; px < N - 1; px++) {
      const i0 = (py * N + px) * 3;
      const i1 = i0 + 3;
      wirePositions[wPtr++] = positions[i0];
      wirePositions[wPtr++] = positions[i0 + 1];
      wirePositions[wPtr++] = positions[i0 + 2];
      wirePositions[wPtr++] = positions[i1];
      wirePositions[wPtr++] = positions[i1 + 1];
      wirePositions[wPtr++] = positions[i1 + 2];
    }
  }
  for (let px = 0; px < N; px++) {
    for (let py = 0; py < N - 1; py++) {
      const i0 = (py * N + px) * 3;
      const i1 = ((py + 1) * N + px) * 3;
      wirePositions[wPtr++] = positions[i0];
      wirePositions[wPtr++] = positions[i0 + 1];
      wirePositions[wPtr++] = positions[i0 + 2];
      wirePositions[wPtr++] = positions[i1];
      wirePositions[wPtr++] = positions[i1 + 1];
      wirePositions[wPtr++] = positions[i1 + 2];
    }
  }

  return {
    positions,
    colors,
    indices,
    wireframePositions: wirePositions,
  };
}

export {};
