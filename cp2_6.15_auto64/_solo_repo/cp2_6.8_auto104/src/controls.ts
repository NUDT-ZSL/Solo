import { TreeParams } from './fractalTree';

export interface Preset {
  name: string;
  params: Partial<TreeParams>;
}

export const PRESETS: Record<string, Preset> = {
  oak: {
    name: '自然橡树',
    params: { angle: 40, lengthRatio: 0.65, depth: 7, randomOffset: 0 }
  },
  maple: {
    name: '对称枫树',
    params: { angle: 25, lengthRatio: 0.8, depth: 6, randomOffset: 0 }
  },
  willow: {
    name: '扭曲柳树',
    params: { angle: 15, lengthRatio: 0.5, depth: 8, randomOffset: 5 }
  }
};

export interface ControlCallbacks {
  onParamChange: (params: Partial<TreeParams>) => void;
  onPresetSelect: (preset: Preset, currentParams: TreeParams) => void;
  onPruneModeToggle: (enabled: boolean) => void;
  onUndoPrune: () => void;
  onExportSVG: () => void;
  onExportPNG: () => void;
}

export class ControlsManager {
  private elements: {
    depthSlider: HTMLInputElement;
    angleSlider: HTMLInputElement;
    ratioSlider: HTMLInputElement;
    lengthSlider: HTMLInputElement;
    depthValue: HTMLElement;
    angleValue: HTMLElement;
    ratioValue: HTMLElement;
    lengthValue: HTMLElement;
    presetButtons: NodeListOf<HTMLElement>;
    pruneToggle: HTMLElement;
    undoPruneBtn: HTMLButtonElement;
    exportSVGBtn: HTMLButtonElement;
    exportPNGBtn: HTMLButtonElement;
    prunedCounter: HTMLElement;
    exportToast: HTMLElement;
    hamburgerBtn: HTMLButtonElement;
    controlsPanel: HTMLElement;
  };

  private callbacks: ControlCallbacks;
  private pruneMode: boolean = false;
  private prunedCount: number = 0;

  constructor(callbacks: ControlCallbacks) {
    this.callbacks = callbacks;

    this.elements = {
      depthSlider: document.getElementById('depth-slider') as HTMLInputElement,
      angleSlider: document.getElementById('angle-slider') as HTMLInputElement,
      ratioSlider: document.getElementById('ratio-slider') as HTMLInputElement,
      lengthSlider: document.getElementById('length-slider') as HTMLInputElement,
      depthValue: document.getElementById('depth-value') as HTMLElement,
      angleValue: document.getElementById('angle-value') as HTMLElement,
      ratioValue: document.getElementById('ratio-value') as HTMLElement,
      lengthValue: document.getElementById('length-value') as HTMLElement,
      presetButtons: document.querySelectorAll('.preset-btn'),
      pruneToggle: document.getElementById('prune-toggle') as HTMLElement,
      undoPruneBtn: document.getElementById('undo-prune-btn') as HTMLButtonElement,
      exportSVGBtn: document.getElementById('export-svg-btn') as HTMLButtonElement,
      exportPNGBtn: document.getElementById('export-png-btn') as HTMLButtonElement,
      prunedCounter: document.getElementById('pruned-counter') as HTMLElement,
      exportToast: document.getElementById('export-toast') as HTMLElement,
      hamburgerBtn: document.getElementById('hamburger-btn') as HTMLButtonElement,
      controlsPanel: document.getElementById('controls-panel') as HTMLElement
    };

    this.bindEvents();
  }

  private bindEvents(): void {
    const { elements } = this;

    elements.depthSlider.addEventListener('input', () => {
      const value = parseInt(elements.depthSlider.value);
      this.updateDepthDisplay(value);
      this.callbacks.onParamChange({ depth: value });
    });

    elements.angleSlider.addEventListener('input', () => {
      const value = parseInt(elements.angleSlider.value);
      this.updateAngleDisplay(value);
      this.callbacks.onParamChange({ angle: value });
    });

    elements.ratioSlider.addEventListener('input', () => {
      const value = parseFloat(elements.ratioSlider.value);
      this.updateRatioDisplay(value);
      this.callbacks.onParamChange({ lengthRatio: value });
    });

    elements.lengthSlider.addEventListener('input', () => {
      const value = parseInt(elements.lengthSlider.value);
      this.updateLengthDisplay(value);
      this.callbacks.onParamChange({ trunkLength: value });
    });

    elements.presetButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        const presetKey = btn.getAttribute('data-preset');
        if (presetKey && PRESETS[presetKey]) {
          const currentParams = this.getCurrentParams();
          this.callbacks.onPresetSelect(PRESETS[presetKey], currentParams);
        }
      });
    });

    elements.pruneToggle.addEventListener('click', () => {
      this.pruneMode = !this.pruneMode;
      elements.pruneToggle.classList.toggle('active', this.pruneMode);
      this.callbacks.onPruneModeToggle(this.pruneMode);
    });

    elements.undoPruneBtn.addEventListener('click', () => {
      this.callbacks.onUndoPrune();
    });

    elements.exportSVGBtn.addEventListener('click', () => {
      this.callbacks.onExportSVG();
    });

    elements.exportPNGBtn.addEventListener('click', () => {
      this.callbacks.onExportPNG();
    });

    elements.hamburgerBtn.addEventListener('click', () => {
      elements.controlsPanel.classList.toggle('mobile-open');
    });
  }

  getCurrentParams(): TreeParams {
    return {
      depth: parseInt(this.elements.depthSlider.value),
      angle: parseInt(this.elements.angleSlider.value),
      lengthRatio: parseFloat(this.elements.ratioSlider.value),
      trunkLength: parseInt(this.elements.lengthSlider.value),
      randomOffset: 0
    };
  }

  updateParams(params: Partial<TreeParams>): void {
    if (params.depth !== undefined) {
      this.elements.depthSlider.value = String(params.depth);
      this.updateDepthDisplay(params.depth);
    }
    if (params.angle !== undefined) {
      this.elements.angleSlider.value = String(params.angle);
      this.updateAngleDisplay(params.angle);
    }
    if (params.lengthRatio !== undefined) {
      this.elements.ratioSlider.value = String(params.lengthRatio);
      this.updateRatioDisplay(params.lengthRatio);
    }
    if (params.trunkLength !== undefined) {
      this.elements.lengthSlider.value = String(params.trunkLength);
      this.updateLengthDisplay(params.trunkLength);
    }
  }

  private updateDepthDisplay(value: number): void {
    this.elements.depthValue.textContent = String(value);
  }

  private updateAngleDisplay(value: number): void {
    this.elements.angleValue.textContent = `${value}°`;
  }

  private updateRatioDisplay(value: number): void {
    this.elements.ratioValue.textContent = value.toFixed(2);
  }

  private updateLengthDisplay(value: number): void {
    this.elements.lengthValue.textContent = `${value}px`;
  }

  setPrunedCount(count: number): void {
    this.prunedCount = count;
    this.elements.prunedCounter.textContent = `已裁剪 ${count} 段`;
    this.elements.prunedCounter.classList.toggle('visible', count > 0);
    this.elements.undoPruneBtn.disabled = count <= 0;
  }

  showExportToast(): void {
    this.elements.exportToast.classList.add('visible');
    setTimeout(() => {
      this.elements.exportToast.classList.remove('visible');
    }, 2000);
  }

  isPruneMode(): boolean {
    return this.pruneMode;
  }
}
