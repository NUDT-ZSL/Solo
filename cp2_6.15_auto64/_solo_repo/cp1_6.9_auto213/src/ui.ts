import { ColorTheme } from './grid';

export interface UIControls {
  onGridDensityChange: (density: number) => void;
  onFlowSpeedChange: (speed: number) => void;
  onThemeChange: (theme: ColorTheme) => void;
  onExport: () => void;
}

interface ThemeOption {
  value: ColorTheme;
  label: string;
}

const THEME_OPTIONS: ThemeOption[] = [
  { value: 'ocean', label: '海洋之夜' },
  { value: 'lava', label: '熔岩之心' },
  { value: 'aurora', label: '极光之梦' },
  { value: 'magic', label: '魔幻乐园' },
];

const PANEL_CSS = `
  position: absolute;
  left: 20px;
  bottom: 20px;
  background: rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 16px;
  padding: 20px 22px;
  width: 280px;
  color: rgba(255, 255, 255, 0.92);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  z-index: 10;
  user-select: none;
  font-size: 14px;
  transition: box-shadow 0.25s ease;
`;

const TITLE_CSS = `
  font-size: 15px;
  font-weight: 600;
  margin-bottom: 16px;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.98);
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ROW_CSS = `
  margin-bottom: 14px;
`;

const LABEL_ROW_CSS = `
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.75);
`;

const VALUE_BADGE_CSS = `
  background: rgba(255, 255, 255, 0.12);
  padding: 2px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-variant-numeric: tabular-nums;
  color: rgba(255, 255, 255, 0.95);
`;

const SLIDER_CSS = `
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: rgba(255, 255, 255, 0.12);
  outline: none;
  -webkit-appearance: none;
  appearance: none;
  cursor: pointer;
  transition: background 0.2s ease;
`;

const SELECT_CSS = `
  width: 100%;
  padding: 9px 12px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.95);
  font-size: 13px;
  cursor: pointer;
  outline: none;
  transition: all 0.2s ease;
`;

const BUTTON_CSS = `
  width: 100%;
  padding: 11px 16px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.22);
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.18), rgba(255, 255, 255, 0.06));
  color: rgba(255, 255, 255, 0.98);
  font-size: 14px;
  font-weight: 500;
  letter-spacing: 0.3px;
  cursor: pointer;
  outline: none;
  transition: transform 0.18s ease, box-shadow 0.22s ease, background 0.22s ease;
`;

export class ControlPanel {
  private panel: HTMLDivElement;
  private controls: UIControls;
  private densitySlider: HTMLInputElement;
  private speedSlider: HTMLInputElement;
  private themeSelect: HTMLSelectElement;
  private densityValue: HTMLSpanElement;
  private speedValue: HTMLSpanElement;
  private exportBtn: HTMLButtonElement;

  constructor(parent: HTMLElement, controls: UIControls) {
    this.controls = controls;
    this.panel = document.createElement('div');
    this.panel.style.cssText = PANEL_CSS;
    this.panel.addEventListener('mouseenter', () => {
      this.panel.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.42), 0 0 0 1px rgba(255, 255, 255, 0.04) inset';
    });
    this.panel.addEventListener('mouseleave', () => {
      this.panel.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
    });

    const title = document.createElement('div');
    title.style.cssText = TITLE_CSS;
    title.innerHTML = '<span style="width:6px;height:6px;border-radius:50%;background:linear-gradient(135deg,#7cc4ff,#a078ff);box-shadow:0 0 8px rgba(124,196,255,0.6);"></span>控制面板';
    this.panel.appendChild(title);

    const row1 = document.createElement('div');
    row1.style.cssText = ROW_CSS;
    const labelRow1 = document.createElement('div');
    labelRow1.style.cssText = LABEL_ROW_CSS;
    const label1 = document.createElement('span');
    label1.textContent = '网格密度';
    this.densityValue = document.createElement('span');
    this.densityValue.style.cssText = VALUE_BADGE_CSS;
    this.densityValue.textContent = '30×30';
    labelRow1.appendChild(label1);
    labelRow1.appendChild(this.densityValue);
    row1.appendChild(labelRow1);

    this.densitySlider = document.createElement('input');
    this.densitySlider.type = 'range';
    this.densitySlider.min = '10';
    this.densitySlider.max = '60';
    this.densitySlider.step = '1';
    this.densitySlider.value = '30';
    this.densitySlider.style.cssText = SLIDER_CSS;
    this.injectSliderStyles();
    this.densitySlider.addEventListener('input', () => {
      const v = parseInt(this.densitySlider.value, 10);
      this.densityValue.textContent = `${v}×${v}`;
      this.controls.onGridDensityChange(v);
    });
    row1.appendChild(this.densitySlider);
    this.panel.appendChild(row1);

    const row2 = document.createElement('div');
    row2.style.cssText = ROW_CSS;
    const labelRow2 = document.createElement('div');
    labelRow2.style.cssText = LABEL_ROW_CSS;
    const label2 = document.createElement('span');
    label2.textContent = '流动速度';
    this.speedValue = document.createElement('span');
    this.speedValue.style.cssText = VALUE_BADGE_CSS;
    this.speedValue.textContent = '1.50';
    labelRow2.appendChild(label2);
    labelRow2.appendChild(this.speedValue);
    row2.appendChild(labelRow2);

    this.speedSlider = document.createElement('input');
    this.speedSlider.type = 'range';
    this.speedSlider.min = '1';
    this.speedSlider.max = '50';
    this.speedSlider.step = '1';
    this.speedSlider.value = '15';
    this.speedSlider.style.cssText = SLIDER_CSS;
    this.speedSlider.addEventListener('input', () => {
      const raw = parseInt(this.speedSlider.value, 10);
      const v = 0.1 + (raw - 1) * (4.9 / 49);
      this.speedValue.textContent = v.toFixed(2);
      this.controls.onFlowSpeedChange(v);
    });
    row2.appendChild(this.speedSlider);
    this.panel.appendChild(row2);

    const row3 = document.createElement('div');
    row3.style.cssText = ROW_CSS;
    const labelRow3 = document.createElement('div');
    labelRow3.style.cssText = LABEL_ROW_CSS;
    const label3 = document.createElement('span');
    label3.textContent = '颜色主题';
    labelRow3.appendChild(label3);
    row3.appendChild(labelRow3);

    this.themeSelect = document.createElement('select');
    this.themeSelect.style.cssText = SELECT_CSS;
    THEME_OPTIONS.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt.value;
      option.textContent = opt.label;
      option.style.background = '#1f1f35';
      this.themeSelect.appendChild(option);
    });
    this.themeSelect.addEventListener('change', () => {
      this.controls.onThemeChange(this.themeSelect.value as ColorTheme);
    });
    this.themeSelect.addEventListener('mouseenter', () => {
      this.themeSelect.style.background = 'rgba(255, 255, 255, 0.14)';
      this.themeSelect.style.boxShadow = '0 0 16px rgba(124, 196, 255, 0.15)';
    });
    this.themeSelect.addEventListener('mouseleave', () => {
      this.themeSelect.style.background = 'rgba(255, 255, 255, 0.08)';
      this.themeSelect.style.boxShadow = 'none';
    });
    row3.appendChild(this.themeSelect);
    this.panel.appendChild(row3);

    this.exportBtn = document.createElement('button');
    this.exportBtn.textContent = '导出 PNG 快照';
    this.exportBtn.style.cssText = BUTTON_CSS;
    this.exportBtn.addEventListener('mouseenter', () => {
      this.exportBtn.style.transform = 'scale(1.03)';
      this.exportBtn.style.boxShadow = '0 6px 22px rgba(124, 196, 255, 0.25), 0 0 0 1px rgba(255, 255, 255, 0.18) inset';
    });
    this.exportBtn.addEventListener('mouseleave', () => {
      this.exportBtn.style.transform = 'scale(1)';
      this.exportBtn.style.boxShadow = 'none';
    });
    this.exportBtn.addEventListener('mousedown', () => {
      this.exportBtn.style.transform = 'scale(0.985)';
    });
    this.exportBtn.addEventListener('mouseup', () => {
      this.exportBtn.style.transform = 'scale(1.03)';
    });
    this.exportBtn.addEventListener('click', () => {
      this.controls.onExport();
    });
    this.panel.appendChild(this.exportBtn);

    parent.appendChild(this.panel);
  }

  private injectSliderStyles(): void {
    if (document.getElementById('fluid-slider-styles')) return;
    const style = document.createElement('style');
    style.id = 'fluid-slider-styles';
    style.textContent = `
      input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: linear-gradient(135deg, #ffffff, #bcd8ff);
        border: 2px solid rgba(255,255,255,0.9);
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(124, 196, 255, 0.45);
        transition: transform 0.15s ease, box-shadow 0.2s ease;
      }
      input[type="range"]::-webkit-slider-thumb:hover {
        transform: scale(1.18);
        box-shadow: 0 3px 14px rgba(124, 196, 255, 0.7);
      }
      input[type="range"]::-moz-range-thumb {
        width: 16px;
        height: 16px;
        border-radius: 50%;
        background: linear-gradient(135deg, #ffffff, #bcd8ff);
        border: 2px solid rgba(255,255,255,0.9);
        cursor: pointer;
        box-shadow: 0 2px 8px rgba(124, 196, 255, 0.45);
      }
      input[type="range"]:hover {
        background: rgba(255, 255, 255, 0.18) !important;
      }
    `;
    document.head.appendChild(style);
  }

  public getDensityValue(): number {
    return parseInt(this.densitySlider.value, 10);
  }

  public getFlowSpeedValue(): number {
    const raw = parseInt(this.speedSlider.value, 10);
    return 0.1 + (raw - 1) * (4.9 / 49);
  }

  public getThemeValue(): ColorTheme {
    return this.themeSelect.value as ColorTheme;
  }
}
