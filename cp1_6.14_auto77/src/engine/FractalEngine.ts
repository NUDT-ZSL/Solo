import { eventBus, Events, FractalParams, FractalData } from '../ui/EventBus';
import FractalWorker from './fractal.worker?worker';

function isValidTypedArray(arr: unknown): arr is Float32Array | Uint32Array {
  return (
    arr instanceof Float32Array ||
    arr instanceof Uint32Array
  );
}

function validateFractalData(data: unknown): data is FractalData {
  if (!data || typeof data !== 'object') return false;

  const d = data as Record<string, unknown>;

  if (!isValidTypedArray(d.positions) || d.positions.length % 3 !== 0) return false;
  if (!isValidTypedArray(d.colors) || d.colors.length % 3 !== 0) return false;
  if (!isValidTypedArray(d.indices) || d.indices.length % 3 !== 0) return false;
  if (!isValidTypedArray(d.wireframePositions) || d.wireframePositions.length % 3 !== 0) return false;

  if (d.positions.length !== d.colors.length) return false;

  const expectedVertices = d.positions.length / 3;
  const expectedQuads = (Math.sqrt(expectedVertices) - 1);
  if (Math.abs(expectedQuads - Math.round(expectedQuads)) > 0.01) return false;

  for (let i = 0; i < Math.min(d.positions.length, 100); i++) {
    const v = d.positions[i];
    if (!isFinite(v) || isNaN(v)) return false;
  }

  return true;
}

function sanitizeFractalData(data: FractalData): FractalData {
  const positions = new Float32Array(data.positions.length);
  for (let i = 0; i < data.positions.length; i++) {
    const v = data.positions[i];
    positions[i] = isFinite(v) && !isNaN(v) ? v : 0;
  }

  const colors = new Float32Array(data.colors.length);
  for (let i = 0; i < data.colors.length; i++) {
    const v = data.colors[i];
    colors[i] = isFinite(v) && !isNaN(v) ? Math.max(0, Math.min(1, v)) : 0;
  }

  return {
    positions,
    colors,
    indices: data.indices,
    wireframePositions: data.wireframePositions,
  };
}

export class FractalEngine {
  private worker: Worker | null = null;
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
    this.initWorker();
  }

  private initWorker(): void {
    this.worker = new FractalWorker();

    this.worker.onmessage = (e: MessageEvent<unknown>) => {
      const rawData = e.data;

      if (!validateFractalData(rawData)) {
        console.error('FractalEngine: received invalid data from worker', rawData);
        this.calculating = false;
        eventBus.emit(Events.FRACTAL_CALCULATING, false);
        this.tryNextPending();
        return;
      }

      const validData = sanitizeFractalData(rawData);
      this.onCalculationComplete(validData);
    };

    this.worker.onerror = (err) => {
      console.error('FractalEngine: worker error:', err);
      this.calculating = false;
      eventBus.emit(Events.FRACTAL_CALCULATING, false);
      eventBus.emit<{ message: string; type: 'error' }>(Events.SHOW_TOAST, {
        message: '分形计算出错，请重试',
        type: 'error',
      });
      this.tryNextPending();
    };
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

  private startCalculation(): void {
    if (!this.worker) return;
    this.calculating = true;
    eventBus.emit(Events.FRACTAL_CALCULATING, true);
    this.worker.postMessage(this.currentParams);
  }

  private onCalculationComplete(data: FractalData): void {
    this.calculating = false;
    eventBus.emit(Events.FRACTAL_CALCULATING, false);
    eventBus.emit(Events.FRACTAL_DATA_READY, data);
    this.tryNextPending();
  }

  private tryNextPending(): void {
    if (this.pendingParams && !this.calculating) {
      const next = this.pendingParams;
      this.pendingParams = null;
      this.currentParams = next;
      this.startCalculation();
    }
  }

  initialGenerate(): void {
    this.startCalculation();
  }

  dispose(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
  }
}
