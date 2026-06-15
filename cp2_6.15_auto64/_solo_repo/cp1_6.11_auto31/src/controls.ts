import { RecordState } from './audioAnalyzer';

export interface ControlParams {
  particleDensity: number;
  ringCount: number;
  recordState: RecordState;
}

type ParamsChangeCallback = (params: ControlParams) => void;
type RecordCallback = () => void;
type ResetCameraCallback = () => void;

export class Controls {
  private densitySlider: HTMLInputElement;
  private ringSlider: HTMLInputElement;
  private densityValue: HTMLElement;
  private ringValue: HTMLElement;
  private recordBtn: HTMLElement;
  private recordLabel: HTMLElement;
  private iconIdle: SVGElement;
  private iconRecording: SVGElement;
  private iconRedo: SVGElement;
  private resetCameraBtn: HTMLElement;
  private onParamsChange: ParamsChangeCallback | null = null;
  private onRecord: RecordCallback | null = null;
  private onResetCamera: ResetCameraCallback | null = null;
  private currentState: RecordState = 'idle';

  constructor() {
    this.densitySlider = document.getElementById('density-slider') as HTMLInputElement;
    this.ringSlider = document.getElementById('ring-slider') as HTMLInputElement;
    this.densityValue = document.getElementById('density-value')!;
    this.ringValue = document.getElementById('ring-value')!;
    this.recordBtn = document.getElementById('record-btn')!;
    this.recordLabel = document.getElementById('record-label')!;
    this.iconIdle = document.querySelector('.icon-idle')!;
    this.iconRecording = document.querySelector('.icon-recording')!;
    this.iconRedo = document.querySelector('.icon-redo')!;
    this.resetCameraBtn = document.getElementById('reset-camera-btn')!;

    this.bindEvents();
  }

  onParamsChangeCallback(cb: ParamsChangeCallback): void {
    this.onParamsChange = cb;
  }

  onRecordCallback(cb: RecordCallback): void {
    this.onRecord = cb;
  }

  onResetCameraCallback(cb: ResetCameraCallback): void {
    this.onResetCamera = cb;
  }

  setRecordState(state: RecordState): void {
    this.currentState = state;
    this.updateRecordUI();
  }

  getParams(): ControlParams {
    return {
      particleDensity: parseInt(this.densitySlider.value),
      ringCount: parseInt(this.ringSlider.value),
      recordState: this.currentState,
    };
  }

  private bindEvents(): void {
    this.densitySlider.addEventListener('input', () => {
      this.densityValue.textContent = this.densitySlider.value;
      this.emitParams();
    });

    this.ringSlider.addEventListener('input', () => {
      this.ringValue.textContent = this.ringSlider.value;
      this.emitParams();
    });

    this.recordBtn.addEventListener('click', () => {
      if (this.onRecord) this.onRecord();
    });

    this.resetCameraBtn.addEventListener('click', () => {
      if (this.onResetCamera) this.onResetCamera();
    });
  }

  private emitParams(): void {
    if (this.onParamsChange) {
      this.onParamsChange(this.getParams());
    }
  }

  private updateRecordUI(): void {
    const btn = this.recordBtn;
    btn.classList.remove('record-idle', 'record-recording', 'record-redo');

    switch (this.currentState) {
      case 'idle':
        btn.classList.add('record-idle');
        this.iconIdle.style.display = '';
        this.iconRecording.style.display = 'none';
        this.iconRedo.style.display = 'none';
        this.recordLabel.textContent = '录制';
        break;
      case 'recording':
        btn.classList.add('record-recording');
        this.iconIdle.style.display = 'none';
        this.iconRecording.style.display = '';
        this.iconRedo.style.display = 'none';
        this.recordLabel.textContent = '停止';
        break;
      case 'redo':
        btn.classList.add('record-redo');
        this.iconIdle.style.display = 'none';
        this.iconRecording.style.display = 'none';
        this.iconRedo.style.display = '';
        this.recordLabel.textContent = '重录';
        break;
    }
  }
}
