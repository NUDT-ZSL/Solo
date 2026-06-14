import { eventBus, Events, FractalParams, FractalData } from '../ui/EventBus';

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
    { pos: 0.3, r: 0.251, g: 0.078, b: 0.490 },
    { pos: 0.5, r: 0.800, g: 0.200, b: 0.200 },
    { pos: 0.75, r: 1.000, g: 0.545, b: 0.000 },
    { pos: 1.0, r: 1.000, g: 1.000, b: 0.600 },
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
  const f = range === 0 ? 0 : (t - a.pos) / range;
  return [a.r + (b.r - a.r) * f, a.g + (b.g - a.g) * f, a.b + (b.b - a.b) * f];
}

const GRID_SIZE = 256;

export class FractalEngine {
  private currentParams: FractalParams = {
    cReal: -0.5,
    cImag: 0.0,
    maxIterations: 128,
    colorMap: 'flame',
  };

  private calculating = false;
  private pendingParams: FractalParams | null = null;

  constructor() {
    eventBus.on<FractalParams>(Events.PARAMS_UPDATED, (params) => {
      this.updateParams(params);
    });
  }

  getParams(): FractalParams {
    return { ...this.currentParams };
  }

  updateParams(params: FractalParams): void {
    this.currentParams = { ...params };
    if (this.calculating) {
      this.pendingParams = { ...params };
    } else {
      this.startCalculation();
    }
  }

  private async startCalculation(): Promise<void> {
    this.calculating = true;
    eventBus.emit(Events.FRACTAL_CALCULATING, true);

    try {
      const data = await this.calculateFractal(this.currentParams);
      eventBus.emit(Events.FRACTAL_DATA_READY, data);
    } catch (err) {
      console.error('Fractal calculation error:', err);
    } finally {
      this.calculating = false;
      eventBus.emit(Events.FRACTAL_CALCULATING, false);

      if (this.pendingParams) {
        const next = this.pendingParams;
        this.pendingParams = null;
        this.currentParams = next;
        this.startCalculation();
      }
    }
  }

  private calculateFractal(params: FractalParams): Promise<FractalData> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve(this.computeHeightField(params));
      }, 0);
    });
  }

  private computeHeightField(params: FractalParams): FractalData {
    const N = GRID_SIZE;
    const half = N / 2;
    const scale = 3.0 / half;

    const heightMap = new Float32Array(N * N);
    const iterMap = new Float32Array(N * N);

    const cReal = params.cReal;
    const cImag = params.cImag;
    const maxIter = params.maxIterations;

    for (let py = 0; py < N; py++) {
      for (let px = 0; px < N; px++) {
        const idx = py * N + px;

        let x = (px - half) * scale;
        let y = (py - half) * scale;

        let zx = x;
        let zy = y;
        let iter = 0;
        const bailout = 4.0;

        while (iter < maxIter) {
          const x2 = zx * zx;
          const y2 = zy * zy;
          if (x2 + y2 > bailout) break;
          zy = 2.0 * zx * zy + cImag;
          zx = x2 - y2 + cReal;
          iter++;
        }

        if (iter < maxIter) {
          const logZn = Math.log(x2 + y2) / 2.0;
          const nu = Math.log(logZn / Math.log(2)) / Math.log(2);
          iterMap[idx] = iter + 1 - nu;
        } else {
          iterMap[idx] = maxIter;
        }

        const normIter = iterMap[idx] / maxIter;
        heightMap[idx] = Math.pow(normIter, 1.5) * 0.8;
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

        const normIter = iterMap[idx] / maxIter;
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

    const wireIndices = new Uint32Array(quadCount * 8);
    let wPtr = 0;
    for (let py = 0; py < N - 1; py++) {
      for (let px = 0; px < N - 1; px++) {
        const i0 = py * N + px;
        const i1 = i0 + 1;
        const i2 = i0 + N;
        const i3 = i2 + 1;
        wireIndices[wPtr++] = i0;
        wireIndices[wPtr++] = i1;
        wireIndices[wPtr++] = i1;
        wireIndices[wPtr++] = i3;
        wireIndices[wPtr++] = i3;
        wireIndices[wPtr++] = i2;
        wireIndices[wPtr++] = i2;
        wireIndices[wPtr++] = i0;
      }
    }

    const wireframePositions = new Float32Array(wireIndices.length * 3);
    for (let i = 0; i < wireIndices.length; i++) {
      const srcIdx = wireIndices[i] * 3;
      const dstIdx = i * 3;
      wireframePositions[dstIdx] = positions[srcIdx];
      wireframePositions[dstIdx + 1] = positions[srcIdx + 1];
      wireframePositions[dstIdx + 2] = positions[srcIdx + 2];
    }

    return { positions, colors, indices, wireframePositions };
  }
}
