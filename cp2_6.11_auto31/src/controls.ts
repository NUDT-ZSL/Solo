export type RecordingButtonState = 'idle' | 'recording' | 'done';

export interface ControlParams {
  particleCount: number;
  ringCount: number;
}

export type ParamsChangeCallback = (params: ControlParams) => void;
export type RecordClickCallback = () => void;
export type ResetViewCallback = () => void;

export class ControlPanel {
  private root: HTMLElement;
  private particleSlider: HTMLInputElement;
  private particleVal: HTMLSpanElement;
  private ringSlider: HTMLInputElement;
  private ringVal: HTMLSpanElement;
  private recordBtn: HTMLButtonElement;
  private resetViewBtn: HTMLButtonElement;
  private iconIdle: SVGElement;
  private iconRecording: SVGElement;
  private iconDone: SVGElement;
  private recordLabel: HTMLSpanElement;
  private statusBar: HTMLElement;
  private statusText: HTMLSpanElement;

  private paramsChangeCallback: ParamsChangeCallback | null = null;
  private recordClickCallback: RecordClickCallback | null = null;
  private resetViewCallback: ResetViewCallback | null = null;

  constructor(rootElement: HTMLElement) {
    this.root = rootElement;

    this.particleSlider = document.getElementById('particle-count') as HTMLInputElement;
    this.particleVal = document.getElementById('particle-count-val') as HTMLSpanElement;
    this.ringSlider = document.getElementById('ring-count') as HTMLInputElement;
    this.ringVal = document.getElementById('ring-count-val') as HTMLSpanElement;
    this.recordBtn = document.getElementById('record-btn') as HTMLButtonElement;
    this.resetViewBtn = document.getElementById('reset-view-btn') as HTMLButtonElement;
    this.iconIdle = document.getElementById('icon-idle') as unknown as SVGElement;
    this.iconRecording = document.getElementById('icon-recording') as unknown as SVGElement;
    this.iconDone = document.getElementById('icon-done') as unknown as SVGElement;
    this.recordLabel = document.getElementById('record-label') as HTMLSpanElement;
    this.statusBar = document.getElementById('status-bar') as HTMLElement;
    this.statusText = document.getElementById('status-text') as HTMLSpanElement;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.particleSlider.addEventListener('input', () => {
      const val = parseInt(this.particleSlider.value, 10);
      this.particleVal.textContent = val.toString();
      this.emitParamsChange();
    });

    this.ringSlider.addEventListener('input', () => {
      const val = parseInt(this.ringSlider.value, 10);
      this.ringVal.textContent = val.toString();
      this.emitParamsChange();
    });

    this.recordBtn.addEventListener('click', () => {
      if (this.recordClickCallback) this.recordClickCallback();
    });

    this.resetViewBtn.addEventListener('click', () => {
      if (this.resetViewCallback) this.resetViewCallback();
    });
  }

  private emitParamsChange(): void {
    if (this.paramsChangeCallback) {
      this.paramsChangeCallback(this.getParams());
    }
  }

  getParams(): ControlParams {
    return {
      particleCount: parseInt(this.particleSlider.value, 10),
      ringCount: parseInt(this.ringSlider.value, 10),
    };
  }

  onParamsChange(callback: ParamsChangeCallback): void {
    this.paramsChangeCallback = callback;
  }

  onRecordClick(callback: RecordClickCallback): void {
    this.recordClickCallback = callback;
  }

  onResetView(callback: ResetViewCallback): void {
    this.resetViewCallback = callback;
  }

  setRecordingState(state: RecordingButtonState): void {
    this.recordBtn.dataset.state = state;
    this.iconIdle.classList.toggle('hidden', state !== 'idle');
    this.iconRecording.classList.toggle('hidden', state !== 'recording');
    this.iconDone.classList.toggle('hidden', state !== 'done');

    switch (state) {
      case 'idle':
        this.recordLabel.textContent = '录制';
        break;
      case 'recording':
        this.recordLabel.textContent = '停止';
        break;
      case 'done':
        this.recordLabel.textContent = '重录';
        break;
    }
  }

  showStatus(text: string): void {
    this.statusText.textContent = text;
    this.statusBar.classList.remove('hidden');
    this.statusBar.classList.add('visible');
  }

  hideStatus(): void {
    this.statusBar.classList.add('hidden');
    this.statusBar.classList.remove('visible');
  }

  getRingCount(): number {
    return parseInt(this.ringSlider.value, 10);
  }
}
