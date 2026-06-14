import { eventBus, Events, FractalParams, FractalData } from '../ui/EventBus';
import FractalWorker from './fractal.worker?worker';

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
    this.worker.onmessage = (e: MessageEvent<FractalData>) => {
      this.onCalculationComplete(e.data);
    };
    this.worker.onerror = (err) => {
      console.error('Fractal worker error:', err);
      this.calculating = false;
      eventBus.emit(Events.FRACTAL_CALCULATING, false);
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
