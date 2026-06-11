import type { StarData } from './starData';
import { PRESETS } from './starData';

export interface ReliefParams {
  rippleWaves: number;
  baseCurvature: number;
  bumpScale: number;
  colorTempShift: number;
  rotationSpeed: number;
  autoRotate: boolean;
  backgroundStarDensity: number;
}

export const DEFAULT_PARAMS: ReliefParams = {
  rippleWaves: 5,
  baseCurvature: 0.1,
  bumpScale: 1.0,
  colorTempShift: 0,
  rotationSpeed: 1.0,
  autoRotate: true,
  backgroundStarDensity: 80,
};

interface SliderDef {
  key: keyof ReliefParams;
  label: string;
  min: number;
  max: number;
  step: number;
  isToggle?: boolean;
}

const SLIDERS: SliderDef[] = [
  { key: 'rippleWaves', label: '涟漪波数', min: 2, max: 12, step: 1 },
  { key: 'baseCurvature', label: '基底曲率', min: -0.5, max: 0.5, step: 0.01 },
  { key: 'bumpScale', label: '鼓包缩放', min: 0.5, max: 2.0, step: 0.01 },
  { key: 'colorTempShift', label: '色温偏移', min: -0.3, max: 0.3, step: 0.01 },
  { key: 'rotationSpeed', label: '旋转速度', min: 0, max: 2, step: 0.01 },
  { key: 'autoRotate', label: '自转周期', min: 0, max: 1, step: 1, isToggle: true },
  { key: 'backgroundStarDensity', label: '背景星点密度', min: 0, max: 200, step: 1 },
];

export class UIControls {
  private panel: HTMLDivElement;
  private toggleBtn: HTMLDivElement;
  private tooltip: HTMLDivElement;
  private onParamChange: (params: Partial<ReliefParams>) => void;
  private onPresetChange: (presetName: string) => void;
  private onFileUpload: (data: unknown) => void;
  private onSavePreset: () => void;
  private params: ReliefParams;
  private expanded = false;
  private valueDisplays = new Map<keyof ReliefParams, HTMLSpanElement>();

  constructor(
    onParamChange: (params: Partial<ReliefParams>) => void,
    onPresetChange: (presetName: string) => void,
    onFileUpload: (data: unknown) => void,
    onSavePreset: () => void,
  ) {
    this.onParamChange = onParamChange;
    this.onPresetChange = onPresetChange;
    this.onFileUpload = onFileUpload;
    this.onSavePreset = onSavePreset;
    this.params = { ...DEFAULT_PARAMS };
    this.tooltip = document.getElementById('tooltip') as HTMLDivElement;

    this.toggleBtn = document.createElement('div');
    this.panel = document.createElement('div');
    this.buildPanel();
    this.buildToggle();
  }

  private buildToggle() {
    Object.assign(this.toggleBtn.style, {
      position: 'fixed',
      right: '0',
      top: '50%',
      transform: 'translateY(-50%)',
      width: '28px',
      height: '64px',
      background: 'rgba(10,0,30,0.6)',
      border: '1px solid #8822AA',
      borderRight: 'none',
      borderRadius: '8px 0 0 8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '50',
      transition: 'right 0.4s cubic-bezier(0.22,1,0.36,1)',
    });

    const arrow = document.createElement('span');
    arrow.textContent = '◂';
    arrow.style.cssText = 'color: #CC88FF; font-size: 14px; transition: transform 0.3s ease;';
    this.toggleBtn.appendChild(arrow);

    this.toggleBtn.addEventListener('click', () => {
      this.expanded = !this.expanded;
      if (this.expanded) {
        this.panel.style.right = '0';
        this.toggleBtn.style.right = '280px';
        arrow.style.transform = 'rotate(180deg)';
      } else {
        this.panel.style.right = '-280px';
        this.toggleBtn.style.right = '0';
        arrow.style.transform = 'rotate(0deg)';
      }
    });

    document.body.appendChild(this.toggleBtn);
  }

  private buildPanel() {
    Object.assign(this.panel.style, {
      position: 'fixed',
      right: '-280px',
      top: '0',
      width: '280px',
      height: '100%',
      background: 'rgba(10,0,30,0.6)',
      backdropFilter: 'blur(16px)',
      WebkitBackdropFilter: 'blur(16px)',
      borderLeft: '1px solid #8822AA',
      zIndex: '40',
      transition: 'right 0.4s cubic-bezier(0.22,1,0.36,1)',
      overflowY: 'auto',
      padding: '20px 16px',
      color: '#E0D0FF',
      fontSize: '13px',
    });

    const title = document.createElement('h2');
    title.textContent = '星尘拓印';
    title.style.cssText = 'font-size: 16px; font-weight: 600; margin-bottom: 16px; color: #FF88CC; letter-spacing: 2px; text-align: center;';
    this.panel.appendChild(title);

    const presetLabel = document.createElement('div');
    presetLabel.textContent = '天区模板';
    presetLabel.style.cssText = 'margin-bottom: 6px; font-size: 12px; color: #AA88CC;';
    this.panel.appendChild(presetLabel);

    const presetSelect = document.createElement('select');
    presetSelect.style.cssText = `
      width: 100%; padding: 6px 8px; margin-bottom: 14px;
      background: rgba(30,0,60,0.7); border: 1px solid #8822AA;
      border-radius: 6px; color: #E0D0FF; font-size: 13px;
      outline: none; cursor: pointer;
    `;
    for (const [key, val] of Object.entries(PRESETS)) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = val.label;
      presetSelect.appendChild(opt);
    }
    presetSelect.addEventListener('change', () => {
      this.onPresetChange(presetSelect.value);
    });
    this.panel.appendChild(presetSelect);

    const uploadLabel = document.createElement('label');
    uploadLabel.textContent = '上传星图 JSON';
    uploadLabel.style.cssText = `
      display: block; padding: 6px 10px; margin-bottom: 14px;
      background: rgba(30,0,60,0.7); border: 1px solid #6622AA;
      border-radius: 6px; text-align: center; cursor: pointer;
      color: #AA88CC; font-size: 12px; transition: border-color 0.2s;
    `;
    uploadLabel.addEventListener('mouseenter', () => { uploadLabel.style.borderColor = '#FF66AA'; });
    uploadLabel.addEventListener('mouseleave', () => { uploadLabel.style.borderColor = '#6622AA'; });
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.style.display = 'none';
    fileInput.addEventListener('change', () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          this.onFileUpload(data);
        } catch { /* ignore parse errors */ }
      };
      reader.readAsText(file);
    });
    uploadLabel.appendChild(fileInput);
    this.panel.appendChild(uploadLabel);

    const divider = document.createElement('div');
    divider.style.cssText = 'height: 1px; background: linear-gradient(90deg, transparent, #8822AA, transparent); margin: 12px 0;';
    this.panel.appendChild(divider);

    for (const def of SLIDERS) {
      if (def.isToggle) {
        this.buildToggleControl(def);
      } else {
        this.buildSliderControl(def);
      }
    }

    const divider2 = document.createElement('div');
    divider2.style.cssText = 'height: 1px; background: linear-gradient(90deg, transparent, #8822AA, transparent); margin: 12px 0;';
    this.panel.appendChild(divider2);

    const saveBtn = document.createElement('button');
    saveBtn.textContent = '保存预设';
    saveBtn.style.cssText = `
      width: 100%; padding: 8px; margin-top: 8px;
      background: linear-gradient(135deg, #6622AA, #FF66AA);
      border: none; border-radius: 6px; color: #fff;
      font-size: 13px; cursor: pointer; letter-spacing: 1px;
      transition: opacity 0.2s;
    `;
    saveBtn.addEventListener('mouseenter', () => { saveBtn.style.opacity = '0.85'; });
    saveBtn.addEventListener('mouseleave', () => { saveBtn.style.opacity = '1'; });
    saveBtn.addEventListener('click', () => this.onSavePreset());
    this.panel.appendChild(saveBtn);

    const loadBtn = document.createElement('button');
    loadBtn.textContent = '加载预设';
    loadBtn.style.cssText = `
      width: 100%; padding: 8px; margin-top: 8px;
      background: rgba(30,0,60,0.7); border: 1px solid #6622AA;
      border-radius: 6px; color: #E0D0FF; font-size: 13px;
      cursor: pointer; letter-spacing: 1px; transition: border-color 0.2s;
    `;
    loadBtn.addEventListener('mouseenter', () => { loadBtn.style.borderColor = '#FF66AA'; });
    loadBtn.addEventListener('mouseleave', () => { loadBtn.style.borderColor = '#6622AA'; });
    const loadInput = document.createElement('input');
    loadInput.type = 'file';
    loadInput.accept = '.json';
    loadInput.style.display = 'none';
    loadInput.addEventListener('change', () => {
      const file = loadInput.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result as string);
          if (data.params) {
            this.setParams(data.params);
            this.onParamChange(data.params);
          }
        } catch { /* ignore */ }
      };
      reader.readAsText(file);
    });
    loadBtn.appendChild(loadInput);
    loadBtn.addEventListener('click', () => loadInput.click());
    this.panel.appendChild(loadBtn);

    document.body.appendChild(this.panel);
  }

  private buildSliderControl(def: SliderDef) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom: 14px;';

    const header = document.createElement('div');
    header.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 4px;';

    const label = document.createElement('span');
    label.textContent = def.label;
    label.style.cssText = 'color: #CC88FF; font-size: 12px;';

    const valSpan = document.createElement('span');
    valSpan.textContent = String(this.params[def.key]);
    valSpan.style.cssText = 'color: #FF88CC; font-size: 12px; font-variant-numeric: tabular-nums;';
    this.valueDisplays.set(def.key, valSpan);

    header.appendChild(label);
    header.appendChild(valSpan);
    wrap.appendChild(header);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(def.min);
    slider.max = String(def.max);
    slider.step = String(def.step);
    slider.value = String(this.params[def.key]);
    slider.style.cssText = `
      width: 100%; height: 4px; -webkit-appearance: none; appearance: none;
      background: linear-gradient(90deg, #6622AA, #FF66AA);
      border-radius: 2px; outline: none; cursor: pointer;
    `;

    const thumbStyle = `
      -webkit-appearance: none; appearance: none;
      width: 14px; height: 14px; border-radius: 50%;
      background: #fff; cursor: pointer;
      box-shadow: 0 0 6px rgba(255,136,204,0.5), 0 0 12px rgba(102,34,170,0.3);
    `;
    const styleEl = document.createElement('style');
    const uid = `slider-${def.key}`;
    slider.id = uid;
    styleEl.textContent = `
      #${uid}::-webkit-slider-thumb { ${thumbStyle} }
      #${uid}::-moz-range-thumb { ${thumbStyle} border: none; }
    `;
    document.head.appendChild(styleEl);

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      (this.params as any)[def.key] = v;
      valSpan.textContent = v.toFixed(def.step < 1 ? 2 : 0);
      this.onParamChange({ [def.key]: v });
    });

    wrap.appendChild(slider);
    this.panel.appendChild(wrap);
  }

  private buildToggleControl(def: SliderDef) {
    const wrap = document.createElement('div');
    wrap.style.cssText = 'margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;';

    const label = document.createElement('span');
    label.textContent = def.label;
    label.style.cssText = 'color: #CC88FF; font-size: 12px;';

    const toggle = document.createElement('div');
    const isOn = this.params[def.key] as unknown as boolean;
    toggle.style.cssText = `
      width: 40px; height: 20px; border-radius: 10px; cursor: pointer;
      background: ${isOn ? '#6622AA' : '#331155'}; position: relative;
      transition: background 0.3s;
      border: 1px solid #8822AA;
    `;

    const knob = document.createElement('div');
    knob.style.cssText = `
      width: 16px; height: 16px; border-radius: 50%; background: #fff;
      position: absolute; top: 1px; left: ${isOn ? '21px' : '1px'};
      transition: left 0.3s cubic-bezier(0.22,1,0.36,1);
      box-shadow: 0 0 4px rgba(255,136,204,0.4);
    `;
    toggle.appendChild(knob);

    const valSpan = document.createElement('span');
    valSpan.textContent = isOn ? '开' : '关';
    valSpan.style.cssText = 'color: #FF88CC; font-size: 12px;';
    this.valueDisplays.set(def.key, valSpan);

    toggle.addEventListener('click', () => {
      const newVal = !(this.params[def.key] as unknown as boolean);
      (this.params as any)[def.key] = newVal;
      toggle.style.background = newVal ? '#6622AA' : '#331155';
      knob.style.left = newVal ? '21px' : '1px';
      valSpan.textContent = newVal ? '开' : '关';
      this.onParamChange({ [def.key]: newVal } as any);
    });

    wrap.appendChild(label);
    wrap.appendChild(valSpan);
    wrap.appendChild(toggle);
    this.panel.appendChild(wrap);
  }

  showTooltip(star: StarData, screenX: number, screenY: number) {
    this.tooltip.innerHTML = `
      <div style="font-weight:600;color:#FF88CC;margin-bottom:2px;">${star.name}</div>
      <div>距离: ${star.distance} ly</div>
      <div>视星等: ${star.magnitude.toFixed(2)}</div>
      <div>绝对星等: ${star.absoluteMagnitude.toFixed(2)}</div>
      <div>光谱: ${star.spectralType}</div>
    `;
    this.tooltip.style.left = `${screenX + 16}px`;
    this.tooltip.style.top = `${screenY - 10}px`;
    this.tooltip.classList.add('visible');
  }

  hideTooltip() {
    this.tooltip.classList.remove('visible');
  }

  getParams(): ReliefParams {
    return { ...this.params };
  }

  setParams(params: Partial<ReliefParams>) {
    Object.assign(this.params, params);
    for (const [key, val] of Object.entries(params)) {
      const disp = this.valueDisplays.get(key as keyof ReliefParams);
      if (disp) {
        if (typeof val === 'boolean') {
          disp.textContent = val ? '开' : '关';
        } else {
          disp.textContent = (val as number).toFixed(
            SLIDERS.find(s => s.key === key)?.step < 1 ? 2 : 0
          );
        }
      }
    }
  }

  dispose() {
    this.panel.remove();
    this.toggleBtn.remove();
  }
}
