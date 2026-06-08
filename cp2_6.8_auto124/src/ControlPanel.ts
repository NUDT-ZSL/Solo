import { SculptureManager } from './SculptureManager';

export class ControlPanel {
  private panel: HTMLElement;
  private sculptureManager: SculptureManager;
  private inputs: Record<string, HTMLInputElement> = {};
  private valueLabels: Record<string, HTMLElement> = {};
  private debounceTimers: Record<string, number> = {};

  constructor(sculptureManager: SculptureManager) {
    this.sculptureManager = sculptureManager;
    this.panel = document.getElementById('control-panel') as HTMLElement;

    const ids = [
      'pos-x', 'pos-y', 'pos-z',
      'rot-x', 'rot-y', 'rot-z',
      'scale', 'opacity', 'color-picker',
    ];
    for (const id of ids) {
      const el = document.getElementById(id);
      if (el) this.inputs[id] = el as HTMLInputElement;
    }

    const scaleLabel = document.getElementById('scale-val');
    const opacityLabel = document.getElementById('opacity-val');
    if (scaleLabel) this.valueLabels['scale'] = scaleLabel;
    if (opacityLabel) this.valueLabels['opacity'] = opacityLabel;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.inputs['pos-x']?.addEventListener('input', (e) =>
      this.handleParamChange('posX', parseFloat((e.target as HTMLInputElement).value))
    );
    this.inputs['pos-y']?.addEventListener('input', (e) =>
      this.handleParamChange('posY', parseFloat((e.target as HTMLInputElement).value))
    );
    this.inputs['pos-z']?.addEventListener('input', (e) =>
      this.handleParamChange('posZ', parseFloat((e.target as HTMLInputElement).value))
    );
    this.inputs['rot-x']?.addEventListener('input', (e) =>
      this.handleParamChange('rotX', parseFloat((e.target as HTMLInputElement).value))
    );
    this.inputs['rot-y']?.addEventListener('input', (e) =>
      this.handleParamChange('rotY', parseFloat((e.target as HTMLInputElement).value))
    );
    this.inputs['rot-z']?.addEventListener('input', (e) =>
      this.handleParamChange('rotZ', parseFloat((e.target as HTMLInputElement).value))
    );
    this.inputs['scale']?.addEventListener('input', (e) => {
      const v = parseFloat((e.target as HTMLInputElement).value);
      this.valueLabels['scale'].textContent = v.toFixed(2);
      this.handleParamChange('scale', v);
    });
    this.inputs['opacity']?.addEventListener('input', (e) => {
      const v = parseFloat((e.target as HTMLInputElement).value);
      this.valueLabels['opacity'].textContent = v.toFixed(2);
      this.handleParamChange('opacity', v);
    });
    this.inputs['color-picker']?.addEventListener('input', (e) =>
      this.handleParamChange('color', (e.target as HTMLInputElement).value)
    );

    const closeBtn = document.getElementById('panel-close');
    closeBtn?.addEventListener('click', () => {
      this.sculptureManager.deselectAll();
      this.hide();
    });
  }

  private handleParamChange(key: string, value: number | string): void {
    clearTimeout(this.debounceTimers[key]);
    this.debounceTimers[key] = window.setTimeout(() => {
      this.sculptureManager.updateSelectedParam(key, value);
    }, 16);
  }

  public show(): void {
    this.panel.classList.add('visible');
    this.refreshFromSelection();
  }

  public hide(): void {
    this.panel.classList.remove('visible');
  }

  public refreshFromSelection(): void {
    const params = this.sculptureManager.getSelectedParams();
    if (!params) return;

    this.setInputValue('pos-x', params.posX as number);
    this.setInputValue('pos-y', params.posY as number);
    this.setInputValue('pos-z', params.posZ as number);
    this.setInputValue('rot-x', params.rotX as number);
    this.setInputValue('rot-y', params.rotY as number);
    this.setInputValue('rot-z', params.rotZ as number);
    this.setInputValue('scale', params.scale as number);
    this.setInputValue('opacity', params.opacity as number);
    this.setInputValue('color-picker', params.color as string, true);

    if (this.valueLabels['scale']) {
      this.valueLabels['scale'].textContent = (params.scale as number).toFixed(2);
    }
    if (this.valueLabels['opacity']) {
      this.valueLabels['opacity'].textContent = (params.opacity as number).toFixed(2);
    }
  }

  private setInputValue(id: string, value: number | string, isColor = false): void {
    const input = this.inputs[id];
    if (!input) return;
    if (isColor) {
      input.value = value as string;
    } else {
      input.value = String(value);
    }
  }
}
