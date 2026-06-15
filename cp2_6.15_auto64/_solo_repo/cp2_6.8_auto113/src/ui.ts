import { TreeParams, DEFAULT_PARAMS } from './tree';

export interface UIHandlers {
  onParamsChange: (params: Partial<TreeParams>) => void;
  onPresetSelect: (presetName: string) => void;
  onGrowToggle: () => void;
  onExport: () => void;
  onReset: () => void;
}

export interface SliderElements {
  depth: HTMLInputElement;
  angle: HTMLInputElement;
  ratio: HTMLInputElement;
  length: HTMLInputElement;
  hue: HTMLInputElement;
}

export interface ValueElements {
  depth: HTMLElement;
  angle: HTMLElement;
  ratio: HTMLElement;
  length: HTMLElement;
  hue: HTMLElement;
}

export class UIController {
  private sliders: SliderElements;
  private values: ValueElements;
  private handlers: UIHandlers;
  private growBtn: HTMLButtonElement;
  private countValue: HTMLElement;

  constructor(handlers: UIHandlers) {
    this.handlers = handlers;

    this.sliders = {
      depth: document.getElementById('depth-slider') as HTMLInputElement,
      angle: document.getElementById('angle-slider') as HTMLInputElement,
      ratio: document.getElementById('ratio-slider') as HTMLInputElement,
      length: document.getElementById('length-slider') as HTMLInputElement,
      hue: document.getElementById('hue-slider') as HTMLInputElement,
    };

    this.values = {
      depth: document.getElementById('depth-value') as HTMLElement,
      angle: document.getElementById('angle-value') as HTMLElement,
      ratio: document.getElementById('ratio-value') as HTMLElement,
      length: document.getElementById('length-value') as HTMLElement,
      hue: document.getElementById('hue-value') as HTMLElement,
    };

    this.growBtn = document.getElementById('grow-btn') as HTMLButtonElement;
    this.countValue = document.getElementById('count-value') as HTMLElement;

    this.bindEvents();
    this.updateValuesFromSliders();
  }

  private bindEvents(): void {
    this.sliders.depth.addEventListener('input', () => {
      this.updateDepth();
      this.handlers.onParamsChange({
        maxDepth: parseInt(this.sliders.depth.value, 10),
      });
    });

    this.sliders.angle.addEventListener('input', () => {
      this.updateAngle();
      this.handlers.onParamsChange({
        branchAngle: parseInt(this.sliders.angle.value, 10),
      });
    });

    this.sliders.ratio.addEventListener('input', () => {
      this.updateRatio();
      this.handlers.onParamsChange({
        lengthRatio: parseInt(this.sliders.ratio.value, 10) / 100,
      });
    });

    this.sliders.length.addEventListener('input', () => {
      this.updateLength();
      this.handlers.onParamsChange({
        trunkLength: parseInt(this.sliders.length.value, 10),
      });
    });

    this.sliders.hue.addEventListener('input', () => {
      this.updateHue();
      this.handlers.onParamsChange({
        startHue: parseInt(this.sliders.hue.value, 10),
      });
    });

    const presetBtns = document.querySelectorAll('[data-preset]');
    presetBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const presetName = (btn as HTMLElement).dataset.preset;
        if (presetName) {
          this.handlers.onPresetSelect(presetName);
        }
      });
    });

    this.growBtn.addEventListener('click', () => {
      this.handlers.onGrowToggle();
    });

    document.getElementById('export-btn')?.addEventListener('click', () => {
      this.handlers.onExport();
    });

    document.getElementById('reset-btn')?.addEventListener('click', () => {
      this.handlers.onReset();
    });
  }

  private updateDepth(): void {
    this.values.depth.textContent = this.sliders.depth.value;
  }

  private updateAngle(): void {
    this.values.angle.textContent = `${this.sliders.angle.value}°`;
  }

  private updateRatio(): void {
    const ratio = (parseInt(this.sliders.ratio.value, 10) / 100).toFixed(2);
    this.values.ratio.textContent = ratio;
  }

  private updateLength(): void {
    this.values.length.textContent = `${this.sliders.length.value}px`;
  }

  private updateHue(): void {
    this.values.hue.textContent = `${this.sliders.hue.value}°`;
  }

  private updateValuesFromSliders(): void {
    this.updateDepth();
    this.updateAngle();
    this.updateRatio();
    this.updateLength();
    this.updateHue();
  }

  public setParams(params: TreeParams): void {
    this.sliders.depth.value = params.maxDepth.toString();
    this.sliders.angle.value = Math.round(params.branchAngle).toString();
    this.sliders.ratio.value = Math.round(params.lengthRatio * 100).toString();
    this.sliders.length.value = Math.round(params.trunkLength).toString();
    this.sliders.hue.value = Math.round(params.startHue).toString();
    this.updateValuesFromSliders();
  }

  public setBranchCount(count: number): void {
    this.countValue.textContent = count.toString();
  }

  public setGrowing(isGrowing: boolean): void {
    this.growBtn.textContent = isGrowing ? '暂停' : '生长';
  }

  public resetToDefault(): void {
    this.setParams(DEFAULT_PARAMS);
  }
}
