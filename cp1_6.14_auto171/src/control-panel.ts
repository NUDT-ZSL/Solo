export interface AtriumParams {
  floors: number;
  floorHeight: number;
  columnSpacing: number;
  windowRatio: number;
}

export const DEFAULT_PARAMS: AtriumParams = {
  floors: 5,
  floorHeight: 4,
  columnSpacing: 3,
  windowRatio: 0.5,
};

interface SliderConfig {
  key: keyof AtriumParams;
  label: string;
  min: number;
  max: number;
  step: number;
  toDisplay: (v: number) => string;
  fromSlider: (v: number) => number;
  toSlider: (v: number) => number;
}

const SLIDER_CONFIGS: SliderConfig[] = [
  { key: 'floors', label: '层数', min: 1, max: 10, step: 1, toDisplay: (v) => String(v), fromSlider: (v) => v, toSlider: (v) => v },
  { key: 'floorHeight', label: '每层挑高', min: 3, max: 6, step: 0.1, toDisplay: (v) => v.toFixed(1) + ' 米', fromSlider: (v) => Math.round(v * 10) / 10, toSlider: (v) => v },
  { key: 'columnSpacing', label: '柱子间距', min: 2, max: 4, step: 0.1, toDisplay: (v) => v.toFixed(1) + ' 米', fromSlider: (v) => Math.round(v * 10) / 10, toSlider: (v) => v },
  { key: 'windowRatio', label: '立面开窗率', min: 30, max: 80, step: 1, toDisplay: (v) => Math.round(v * 100) + '%', fromSlider: (v) => v / 100, toSlider: (v) => Math.round(v * 100) },
];

const PANEL_STYLES = `
#control-panel{width:320px;min-width:320px;height:100%;background:#1e293b;border-radius:0 12px 12px 0;box-shadow:4px 0 16px rgba(0,0,0,0.3);padding:32px 24px;display:flex;flex-direction:column;gap:24px;overflow-y:auto;z-index:10;flex-shrink:0}
#control-panel h2{color:#e2e8f0;font-size:20px;font-weight:700;letter-spacing:0.5px;margin:0;padding-bottom:16px;border-bottom:1px solid #334155}
.param-group{display:flex;flex-direction:column;gap:8px}
.param-label{display:flex;justify-content:space-between;align-items:center;color:#94a3b8;font-size:13px;font-weight:500}
.param-value{color:#3b82f6;font-size:14px;font-weight:700;font-variant-numeric:tabular-nums;min-width:56px;text-align:right}
.param-slider{
  -webkit-appearance:none !important;
  appearance:none !important;
  width:100%;
  height:6px !important;
  background:#334155 !important;
  border-radius:3px !important;
  outline:none !important;
  cursor:pointer;
  border:none !important;
  padding:0 !important;
}
.param-slider::-webkit-slider-runnable-track{
  -webkit-appearance:none;
  width:100%;
  height:6px;
  background:#334155;
  border-radius:3px;
  border:none;
}
.param-slider::-webkit-slider-thumb{
  -webkit-appearance:none !important;
  appearance:none !important;
  width:24px !important;
  height:24px !important;
  background:#3b82f6 !important;
  border-radius:50% !important;
  cursor:pointer;
  border:3px solid #1e293b !important;
  box-shadow:0 0 0 2px #3b82f6 !important;
  transition:box-shadow 0.15s ease;
  margin-top:-9px;
}
.param-slider:hover::-webkit-slider-thumb{
  box-shadow:0 0 0 3px #60a5fa !important;
}
.param-slider::-moz-range-track{
  width:100%;
  height:6px;
  background:#334155;
  border-radius:3px;
  border:none;
}
.param-slider::-moz-range-thumb{
  width:24px !important;
  height:24px !important;
  background:#3b82f6 !important;
  border-radius:50% !important;
  cursor:pointer;
  border:3px solid #1e293b !important;
  box-shadow:0 0 0 2px #3b82f6 !important;
}
.btn-group{display:flex;flex-direction:column;gap:12px;margin-top:8px}
.btn-apply{
  background:#f97316 !important;
  color:#fff;
  border:none;
  border-radius:10px;
  padding:14px 0;
  font-size:15px;
  font-weight:700;
  cursor:pointer;
  transition:background 0.2s ease, transform 0.15s ease;
  letter-spacing:1px;
  user-select:none;
}
.btn-apply:hover{background:#ea580c !important}
.btn-apply:active{transform:scale(0.94) !important}
.btn-apply.bounce{
  animation:btnBounce 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) !important;
}
@keyframes btnBounce{
  0%{transform:scale(1)}
  30%{transform:scale(0.9)}
  50%{transform:scale(1.06)}
  70%{transform:scale(0.97)}
  100%{transform:scale(1)}
}
.btn-reset{background:#6b7280;color:#fff;border:none;border-radius:10px;padding:12px 0;font-size:14px;font-weight:600;cursor:pointer;transition:background 0.2s ease;letter-spacing:0.5px}
.btn-reset:hover{background:#9ca3af}
#data-cards{position:absolute;bottom:24px;right:24px;display:flex;gap:12px;z-index:5;pointer-events:none}
.data-card{
  background:rgba(255,255,255,0.08) !important;
  backdrop-filter:blur(12px);
  -webkit-backdrop-filter:blur(12px);
  border:1px solid rgba(255,255,255,0.12) !important;
  border-radius:12px;
  padding:12px 16px;
  display:flex;
  flex-direction:column;
  gap:4px;
  min-width:90px;
}
.data-card-label{color:#94a3b8;font-size:11px;font-weight:500;letter-spacing:0.3px}
.data-card-value{color:#e2e8f0;font-size:20px;font-weight:700;font-variant-numeric:tabular-nums}
`;

export class ControlPanel {
  private panel: HTMLElement;
  private dataCardsContainer: HTMLElement;
  private dataValues: Map<string, HTMLElement> = new Map();
  private sliders: Map<string, HTMLInputElement> = new Map();
  private valueDisplays: Map<string, HTMLElement> = new Map();
  private onApplyCallback: (params: AtriumParams) => void;
  private onResetCallback: () => void;
  private currentParams: AtriumParams;

  constructor(
    appContainer: HTMLElement,
    viewportContainer: HTMLElement,
    onApply: (params: AtriumParams) => void,
    onReset: () => void
  ) {
    this.onApplyCallback = onApply;
    this.onResetCallback = onReset;
    this.currentParams = { ...DEFAULT_PARAMS };

    const styleEl = document.createElement('style');
    styleEl.textContent = PANEL_STYLES;
    document.head.appendChild(styleEl);

    this.panel = this.createPanel();
    appContainer.insertBefore(this.panel, viewportContainer);

    this.dataCardsContainer = this.createDataCards();
    viewportContainer.appendChild(this.dataCardsContainer);

    this.updateDataCards(this.currentParams);
  }

  private createPanel(): HTMLElement {
    const panel = document.createElement('div');
    panel.id = 'control-panel';

    const title = document.createElement('h2');
    title.textContent = 'Atrium 参数控制';
    panel.appendChild(title);

    for (const config of SLIDER_CONFIGS) {
      const group = document.createElement('div');
      group.className = 'param-group';

      const label = document.createElement('div');
      label.className = 'param-label';

      const labelText = document.createElement('span');
      labelText.textContent = config.label;
      const valueSpan = document.createElement('span');
      valueSpan.className = 'param-value';
      valueSpan.textContent = config.toDisplay(this.currentParams[config.key]);

      label.appendChild(labelText);
      label.appendChild(valueSpan);

      const slider = document.createElement('input');
      slider.type = 'range';
      slider.className = 'param-slider';
      slider.min = String(config.min);
      slider.max = String(config.max);
      slider.step = String(config.step);
      slider.value = String(config.toSlider(this.currentParams[config.key]));

      slider.addEventListener('input', () => {
        const rawVal = parseFloat(slider.value);
        const paramVal = config.fromSlider(rawVal);
        this.currentParams[config.key] = paramVal as never;
        valueSpan.textContent = config.toDisplay(paramVal);
      });

      this.sliders.set(config.key, slider);
      this.valueDisplays.set(config.key, valueSpan);

      group.appendChild(label);
      group.appendChild(slider);
      panel.appendChild(group);
    }

    const btnGroup = document.createElement('div');
    btnGroup.className = 'btn-group';

    const applyBtn = document.createElement('button');
    applyBtn.className = 'btn-apply';
    applyBtn.textContent = '应 用';
    applyBtn.addEventListener('click', () => {
      applyBtn.classList.remove('bounce');
      void applyBtn.offsetWidth;
      applyBtn.classList.add('bounce');
      this.onApplyCallback({ ...this.currentParams });
    });
    applyBtn.addEventListener('animationend', () => {
      applyBtn.classList.remove('bounce');
    });

    const resetBtn = document.createElement('button');
    resetBtn.className = 'btn-reset';
    resetBtn.textContent = '重 置';
    resetBtn.addEventListener('click', () => {
      this.currentParams = { ...DEFAULT_PARAMS };
      for (const config of SLIDER_CONFIGS) {
        const slider = this.sliders.get(config.key)!;
        const display = this.valueDisplays.get(config.key)!;
        slider.value = String(config.toSlider(DEFAULT_PARAMS[config.key]));
        display.textContent = config.toDisplay(DEFAULT_PARAMS[config.key]);
      }
      this.onResetCallback();
    });

    btnGroup.appendChild(applyBtn);
    btnGroup.appendChild(resetBtn);
    panel.appendChild(btnGroup);

    return panel;
  }

  private createDataCards(): HTMLElement {
    const container = document.createElement('div');
    container.id = 'data-cards';

    const cards: Array<{ key: string; label: string }> = [
      { key: 'floors', label: '当前层数' },
      { key: 'area', label: '总楼层面积' },
      { key: 'windowRatio', label: '开窗率' },
    ];

    for (const card of cards) {
      const el = document.createElement('div');
      el.className = 'data-card';
      const labelEl = document.createElement('span');
      labelEl.className = 'data-card-label';
      labelEl.textContent = card.label;
      const valueEl = document.createElement('span');
      valueEl.className = 'data-card-value';
      el.appendChild(labelEl);
      el.appendChild(valueEl);
      container.appendChild(el);
      this.dataValues.set(card.key, valueEl);
    }

    return container;
  }

  updateDataCards(params: AtriumParams): void {
    const floorsEl = this.dataValues.get('floors');
    const areaEl = this.dataValues.get('area');
    const ratioEl = this.dataValues.get('windowRatio');
    if (floorsEl) floorsEl.textContent = String(params.floors);
    if (areaEl) {
      const area = params.floors * 12 * params.columnSpacing * params.columnSpacing;
      areaEl.textContent = area.toFixed(0) + 'm²';
    }
    if (ratioEl) ratioEl.textContent = Math.round(params.windowRatio * 100) + '%';
  }

  getParams(): AtriumParams {
    return { ...this.currentParams };
  }

  setParams(params: AtriumParams): void {
    this.currentParams = { ...params };
    for (const config of SLIDER_CONFIGS) {
      const slider = this.sliders.get(config.key)!;
      const display = this.valueDisplays.get(config.key)!;
      slider.value = String(config.toSlider(params[config.key]));
      display.textContent = config.toDisplay(params[config.key]);
    }
    this.updateDataCards(params);
  }
}
