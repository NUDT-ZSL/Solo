import { Loom } from './loom.js';

export class UI {
  panel: HTMLDivElement;
  densitySlider: HTMLDivElement;
  tensionSlider: HTMLDivElement;
  colorSpeedSlider: HTMLDivElement;
  densityValue: HTMLSpanElement;
  tensionValue: HTMLSpanElement;
  colorSpeedValue: HTMLSpanElement;
  densityDisplay: HTMLSpanElement;
  tensionDisplay: HTMLSpanElement;
  colorSpeedDisplay: HTMLSpanElement;
  previewCanvas: HTMLCanvasElement;
  previewCtx: CanvasRenderingContext2D;
  resetBtn: HTMLButtonElement;
  saveBtn: HTMLButtonElement;

  private onResetCb: (() => void) | null = null;
  private onSaveCb: (() => void) | null = null;

  constructor() {
    this.panel = document.createElement('div');
    this.panel.id = 'uiPanel';

    const title = document.createElement('div');
    title.className = 'panel-title';
    title.textContent = '星尘织机';
    this.panel.appendChild(title);

    this.densitySlider = this.createSlider('纱线密度', '1', '10', '5', (v) => { this.densityValue.textContent = v; });
    this.densityValue = this.densitySlider.querySelector('.slider-value') as HTMLSpanElement;
    this.tensionSlider = this.createSlider('张力', '0', '10', '5', (v) => { this.tensionValue.textContent = v; });
    this.tensionValue = this.tensionSlider.querySelector('.slider-value') as HTMLSpanElement;
    this.colorSpeedSlider = this.createSlider('颜色流速', '0', '5', '1', (v) => { this.colorSpeedValue.textContent = v; });
    this.colorSpeedValue = this.colorSpeedSlider.querySelector('.slider-value') as HTMLSpanElement;

    const valuesRow = document.createElement('div');
    valuesRow.className = 'values-row';
    this.densityDisplay = document.createElement('span');
    this.tensionDisplay = document.createElement('span');
    this.colorSpeedDisplay = document.createElement('span');
    this.densityDisplay.innerHTML = '密度 <b>5</b>';
    this.tensionDisplay.innerHTML = '张力 <b>5</b>';
    this.colorSpeedDisplay.innerHTML = '流速 <b>1</b>';
    valuesRow.appendChild(this.densityDisplay);
    valuesRow.appendChild(this.tensionDisplay);
    valuesRow.appendChild(this.colorSpeedDisplay);

    this.previewCanvas = document.createElement('canvas');
    this.previewCanvas.id = 'previewCanvas';
    this.previewCanvas.width = 200;
    this.previewCanvas.height = 100;
    const pctx = this.previewCanvas.getContext('2d');
    if (!pctx) throw new Error('Preview canvas 2D context unavailable');
    this.previewCtx = pctx;

    const btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group';
    this.resetBtn = document.createElement('button');
    this.resetBtn.className = 'btn btn-reset';
    this.resetBtn.textContent = '重置织机';
    this.saveBtn = document.createElement('button');
    this.saveBtn.className = 'btn btn-save';
    this.saveBtn.textContent = '保存快照';
    btnGroup.appendChild(this.resetBtn);
    btnGroup.appendChild(this.saveBtn);

    this.panel.appendChild(this.densitySlider);
    this.panel.appendChild(this.tensionSlider);
    this.panel.appendChild(this.colorSpeedSlider);
    this.panel.appendChild(valuesRow);
    this.panel.appendChild(this.previewCanvas);
    this.panel.appendChild(btnGroup);

    document.body.appendChild(this.panel);
  }

  private createSlider(label: string, min: string, max: string, val: string, onChange: (v: string) => void): HTMLDivElement {
    const group = document.createElement('div');
    group.className = 'slider-group';

    const labelEl = document.createElement('div');
    labelEl.className = 'slider-label';
    const name = document.createElement('span');
    name.textContent = label;
    const value = document.createElement('span');
    value.className = 'slider-value';
    value.textContent = val;
    labelEl.appendChild(name);
    labelEl.appendChild(value);

    const input = document.createElement('input');
    input.type = 'range';
    input.min = min;
    input.max = max;
    input.step = '1';
    input.value = val;
    input.addEventListener('input', () => onChange(input.value));

    group.appendChild(labelEl);
    group.appendChild(input);
    return group;
  }

  bindEvents(loom: Loom): void {
    this.densitySlider.querySelector('input')!.addEventListener('input', (e) => {
      const v = parseInt((e.target as HTMLInputElement).value, 10);
      loom.setDensity(v);
      this.updateDisplays(loom);
    });
    this.tensionSlider.querySelector('input')!.addEventListener('input', (e) => {
      const v = parseInt((e.target as HTMLInputElement).value, 10);
      loom.setTension(v);
      this.updateDisplays(loom);
    });
    this.colorSpeedSlider.querySelector('input')!.addEventListener('input', (e) => {
      const v = parseInt((e.target as HTMLInputElement).value, 10);
      loom.setColorSpeed(v);
      this.updateDisplays(loom);
    });

    this.resetBtn.addEventListener('click', () => {
      if (this.onResetCb) this.onResetCb();
    });
    this.saveBtn.addEventListener('click', () => {
      if (this.onSaveCb) this.onSaveCb();
    });
  }

  updateDisplays(loom: Loom): void {
    this.densityDisplay.innerHTML = `密度 <b>${loom.density}</b>`;
    this.tensionDisplay.innerHTML = `张力 <b>${loom.tension}</b>`;
    this.colorSpeedDisplay.innerHTML = `流速 <b>${loom.colorSpeed}</b>`;
    this.densityValue.textContent = String(loom.density);
    this.tensionValue.textContent = String(loom.tension);
    this.colorSpeedValue.textContent = String(loom.colorSpeed);
  }

  resetSliders(loom: Loom): void {
    (this.densitySlider.querySelector('input') as HTMLInputElement).value = String(loom.density);
    (this.tensionSlider.querySelector('input') as HTMLInputElement).value = String(loom.tension);
    (this.colorSpeedSlider.querySelector('input') as HTMLInputElement).value = String(loom.colorSpeed);
    this.updateDisplays(loom);
  }

  updatePreview(loom: Loom): void {
    loom.renderPreview(this.previewCtx, this.previewCanvas.width, this.previewCanvas.height);
  }

  onReset(cb: () => void): void {
    this.onResetCb = cb;
  }

  onSave(cb: () => void): void {
    this.onSaveCb = cb;
  }
}
