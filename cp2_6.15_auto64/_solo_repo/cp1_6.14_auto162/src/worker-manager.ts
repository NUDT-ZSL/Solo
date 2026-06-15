type FftResultCallback = (bands: Uint8Array) => void;

class WorkerManager {
  private worker: Worker | null = null;
  private busy = false;
  private callback: FftResultCallback | null = null;
  private pendingRange: string = 'full';

  constructor() {
    this.initWorker();
  }

  private initWorker(): void {
    this.worker = new Worker(
      new URL('./fft-worker.ts', import.meta.url),
      { type: 'module' }
    );
    this.worker.onmessage = (e: MessageEvent) => {
      const { bands } = e.data as { bands: Uint8Array };
      this.busy = false;
      if (this.callback) {
        this.callback(new Uint8Array(bands));
      }
    };
    this.worker.onerror = (err) => {
      console.error('FFT Worker error:', err);
      this.busy = false;
    };
  }

  dispatch(timeDomainData: Uint8Array, sampleRate: number, range: string, callback: FftResultCallback): void {
    if (this.busy) return;
    this.busy = true;
    this.callback = callback;
    this.pendingRange = range;
    this.worker?.postMessage(
      { timeDomainData, sampleRate, range },
      [timeDomainData.buffer]
    );
  }

  setRange(range: string): void {
    this.pendingRange = range;
  }

  getRange(): string {
    return this.pendingRange;
  }

  destroy(): void {
    this.worker?.terminate();
    this.worker = null;
    this.callback = null;
    this.busy = false;
  }
}

export default WorkerManager;
