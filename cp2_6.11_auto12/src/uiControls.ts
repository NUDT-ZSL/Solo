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

const PANEL_WIDTH = 280;
const TOGGLE_WIDTH = 28;
const SLIDE_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)';
const SLIDE_DURATION = '0.4s';

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

  private tooltipTargetPos = { x: -9999, y: -9999 };
  private tooltipCurrentPos = { x: -9999, y: -9999 };
  private tooltipVisible = false;
  private rafId = 0;
  private readonly LERP_ALPHA = 0.08;

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

    this.tooltip = this.buildTooltip();
    this.toggleBtn = this.buildToggleButton();
    this.panel = this.buildPanel();
    this.updatePanelPosition();
    this.startTooltipAnimation();
  }

  private buildTooltip(): HTMLDivElement {
    const t = document.createElement('div');
    Object.assign(t.style, {
      position: 'fixed',
      pointerEvents: 'none',
      background: 'rgba(26, 0, 51, 0.9)',
      border: '1px solid rgba(136, 34, 170, 0.8)',
      borderRadius: '8px',
      padding: '8px 12px',
      color: '#ffffff',
      fontSize: '13px',
      fontWeight: 'normal',
      lineHeight: '1.5',
      zIndex: '9999',
      opacity: '0',
      transform: 'translate(0, 0)',
      transition: 'opacity 0.15s ease-out',
      whiteSpace: 'nowrap',
      fontFamily: "'Segoe UI', 'PingFang SC', sans-serif",
      boxShadow: '0 2px 12px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.08) inset',
      userSelect: 'none',
    });
    document.body.appendChild(t);
    return t;
  }

  private buildToggleButton(): HTMLDivElement {
    const btn = document.createElement('div');
    Object.assign(btn.style, {
      position: 'fixed',
      right: '0',
      top: '50%',
      transform: 'translateY(-50%)',
      width: `${TOGGLE_WIDTH}px`,
      height: '64px',
      background: 'rgba(10, 0, 30, 0.6)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
      border: '1px solid #8822AA',
      borderRight: 'none',
      borderRadius: '8px 0 0 8px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: '51',
      transition: `transform ${SLIDE_DURATION} ${SLIDE_EASING}, right ${SLIDE_DURATION} ${SLIDE_EASING}`,
      boxShadow: '0 0 16px rgba(102, 34, 170, 0.4)',
    });

    const label = document.createElement('div');
    Object.assign(label.style, {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '4px',
      color: '#CC88FF',
    });

    const arrow = document.createElement('span');
    arrow.textContent = '◂';
    Object.assign(arrow.style, {
      fontSize: '14px',
      transition: `transform ${SLIDE_DURATION} ${SLIDE_EASING}`,
      display: 'inline-block',
      color: '#E0B0FF',
    });
    label.appendChild(arrow);

    const tinyLabel = document.createElement('span');
    tinyLabel.textContent = '设';
    Object.assign(tinyLabel.style, {
      fontSize: '10px',
      letterSpacing: '1px',
      writingMode: 'vertical-rl',
      textOrientation: 'upright',
      marginTop: '2px',
    });
    label.appendChild(tinyLabel);

    btn.appendChild(label);

    btn.addEventListener('click', () => this.toggleExpanded(arrow));
    document.body.appendChild(btn);
    return btn;
  }

  private buildPanel(): HTMLDivElement {
    const p = document.createElement('div');
    Object.assign(p.style, {
      position: 'fixed',
      top: '0',
      right: '0',
      width: `${PANEL_WIDTH}px`,
      height: '100%',
      background: 'rgba(10, 0, 30, 0.6)',
      backdropFilter: 'blur(20px) saturate(1.2)',
      WebkitBackdropFilter: 'blur(20px) saturate(1.2)',
      borderLeft: '1px solid #8822AA',
      boxShadow: '-8px 0 40px rgba(74, 0, 102, 0.3)',
      zIndex: '50',
      transform: 'translateX(100%)',
      transition: `transform ${SLIDE_DURATION} ${SLIDE_EASING}`,
      overflowY: 'auto',
      overflowX: 'hidden',
      padding: '24px 18px 24px 18px',
      color: '#E0D0FF',
      fontFamily: "'Segoe UI', 'PingFang SC', sans-serif",
      boxSizing: 'border-box',
    });

    const title = document.createElement('h2');
    title.textContent = '星尘拓印';
    Object.assign(title.style, {
      fontSize: '17px',
      fontWeight: '600',
      margin: '0 0 20px 0',
      padding: '0 0 12px 0',
      color: '#FF88CC',
      letterSpacing: '3px',
      textAlign: 'center',
      borderBottom: '1px solid rgba(136,34,170,0.4)',
      background: 'linear-gradient(135deg, #FF88CC, #8855FF)',
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    });
    p.appendChild(title);

    this.appendPresetSelectors(p);
    this.appendFileUpload(p);

    const divider = document.createElement('div');
    Object.assign(divider.style, {
      height: '1px',
      background: 'linear-gradient(90deg, transparent, #8822AA, transparent)',
      margin: '18px 0',
    });
    p.appendChild(divider);

    for (const def of SLIDERS) {
      if (def.isToggle) this.buildToggleControl(p, def);
      else this.buildSliderControl(p, def);
    }

    const divider2 = document.createElement('div');
    Object.assign(divider2.style, {
      height: '1px',
      background: 'linear-gradient(90deg, transparent, #8822AA, transparent)',
      margin: '18px 0',
    });
    p.appendChild(divider2);

    this.appendPresetButtons(p);
    document.body.appendChild(p);
    return p;
  }

  private appendPresetSelectors(p: HTMLDivElement) {
    const label = document.createElement('div');
    label.textContent = '天区模板';
    Object.assign(label.style, {
      marginBottom: '8px',
      fontSize: '12px',
      color: '#AA88CC',
      letterSpacing: '1px',
      textTransform: 'uppercase',
    });
    p.appendChild(label);

    const sel = document.createElement('select');
    Object.assign(sel.style, {
      width: '100%',
      padding: '8px 10px',
      marginBottom: '16px',
      background: 'rgba(30, 0, 60, 0.7)',
      backdropFilter: 'blur(8px)',
      border: '1px solid #8822AA',
      borderRadius: '8px',
      color: '#E0D0FF',
      fontSize: '13px',
      outline: 'none',
      cursor: 'pointer',
      transition: 'border-color 0.2s ease',
    });
    sel.addEventListener('focus', () => sel.style.borderColor = '#FF66AA');
    sel.addEventListener('blur', () => sel.style.borderColor = '#8822AA');

    for (const [key, val] of Object.entries(PRESETS)) {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = val.label;
      sel.appendChild(opt);
    }
    sel.addEventListener('change', () => this.onPresetChange(sel.value));
    p.appendChild(sel);
  }

  private appendFileUpload(p: HTMLDivElement) {
    const label = document.createElement('label');
    label.textContent = '✦ 上传星图 JSON';
    Object.assign(label.style, {
      display: 'block',
      padding: '9px 12px',
      marginBottom: '4px',
      background: 'rgba(30, 0, 60, 0.55)',
      backdropFilter: 'blur(8px)',
      border: '1px solid #6622AA',
      borderRadius: '8px',
      textAlign: 'center',
      cursor: 'pointer',
      color: '#CC88FF',
      fontSize: '12px',
      letterSpacing: '1px',
      transition: 'all 0.2s ease',
      fontWeight: '500',
    });
    label.addEventListener('mouseenter', () => {
      label.style.borderColor = '#FF66AA';
      label.style.color = '#FFAADD';
    });
    label.addEventListener('mouseleave', () => {
      label.style.borderColor = '#6622AA';
      label.style.color = '#CC88FF';
    });

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    Object.assign(input.style, { display: 'none' });
    input.addEventListener('change', () => {
      const f = input.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const data = JSON.parse(r.result as string);
          this.onFileUpload(data);
        } catch (e) {
          alert('JSON 解析失败，请检查格式');
        }
      };
      r.readAsText(f);
    });
    label.appendChild(input);
    p.appendChild(label);
  }

  private appendPresetButtons(p: HTMLDivElement) {
    const saveBtn = document.createElement('button');
    saveBtn.textContent = '✦ 保存当前预设';
    Object.assign(saveBtn.style, {
      width: '100%',
      padding: '10px',
      marginTop: '4px',
      background: 'linear-gradient(135deg, #6622AA 0%, #AA3388 50%, #FF66AA 100%)',
      border: 'none',
      borderRadius: '8px',
      color: '#fff',
      fontSize: '13px',
      cursor: 'pointer',
      letterSpacing: '1.5px',
      transition: 'transform 0.15s ease, box-shadow 0.2s ease, opacity 0.2s ease',
      fontWeight: '600',
      boxShadow: '0 2px 16px rgba(170, 51, 136, 0.35)',
    });
    saveBtn.addEventListener('mouseenter', () => {
      saveBtn.style.transform = 'translateY(-1px)';
      saveBtn.style.boxShadow = '0 4px 24px rgba(255, 102, 170, 0.5)';
    });
    saveBtn.addEventListener('mouseleave', () => {
      saveBtn.style.transform = 'translateY(0)';
      saveBtn.style.boxShadow = '0 2px 16px rgba(170, 51, 136, 0.35)';
    });
    saveBtn.addEventListener('mousedown', () => saveBtn.style.transform = 'translateY(0)');
    saveBtn.addEventListener('click', () => this.onSavePreset());
    p.appendChild(saveBtn);

    const loadBtn = document.createElement('button');
    loadBtn.textContent = '载入预设文件';
    Object.assign(loadBtn.style, {
      width: '100%',
      padding: '9px',
      marginTop: '10px',
      background: 'rgba(30, 0, 60, 0.55)',
      backdropFilter: 'blur(8px)',
      border: '1px solid #6622AA',
      borderRadius: '8px',
      color: '#E0D0FF',
      fontSize: '12px',
      cursor: 'pointer',
      letterSpacing: '1.5px',
      transition: 'all 0.2s ease',
      fontWeight: '500',
    });
    loadBtn.addEventListener('mouseenter', () => {
      loadBtn.style.borderColor = '#FF66AA';
      loadBtn.style.color = '#FFAADD';
    });
    loadBtn.addEventListener('mouseleave', () => {
      loadBtn.style.borderColor = '#6622AA';
      loadBtn.style.color = '#E0D0FF';
    });

    const loadInput = document.createElement('input');
    loadInput.type = 'file';
    loadInput.accept = '.json';
    Object.assign(loadInput.style, { display: 'none' });
    loadInput.addEventListener('change', () => {
      const f = loadInput.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = () => {
        try {
          const data = JSON.parse(r.result as string);
          if (data && typeof data === 'object' && (data as any).params) {
            this.setParams((data as any).params);
            this.onParamChange((data as any).params);
          } else {
            alert('预设文件格式不正确');
          }
        } catch {
          alert('预设文件解析失败');
        }
      };
      r.readAsText(f);
    });
    loadBtn.appendChild(loadInput);
    loadBtn.addEventListener('click', () => loadInput.click());
    p.appendChild(loadBtn);
  }

  private buildSliderControl(p: HTMLDivElement, def: SliderDef) {
    const wrap = document.createElement('div');
    wrap.style.marginBottom = '18px';

    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: '7px',
    });

    const label = document.createElement('span');
    label.textContent = def.label;
    Object.assign(label.style, {
      color: '#CC88FF',
      fontSize: '12px',
      letterSpacing: '0.5px',
    });

    const valSpan = document.createElement('span');
    valSpan.textContent = this.formatValue(def.key, this.params[def.key] as any);
    Object.assign(valSpan.style, {
      color: '#FF88CC',
      fontSize: '12px',
      fontVariantNumeric: 'tabular-nums',
      fontWeight: '600',
      minWidth: '40px',
      textAlign: 'right',
      transition: 'color 0.15s ease',
    });
    this.valueDisplays.set(def.key, valSpan);

    header.appendChild(label);
    header.appendChild(valSpan);
    wrap.appendChild(header);

    const trackWrap = document.createElement('div');
    Object.assign(trackWrap.style, {
      position: 'relative',
      height: '6px',
      borderRadius: '3px',
      background: 'rgba(30, 0, 60, 0.7)',
      border: '1px solid rgba(102, 34, 170, 0.5)',
      overflow: 'hidden',
    });

    const fill = document.createElement('div');
    const percent = ((Number(this.params[def.key]) - def.min) / (def.max - def.min)) * 100;
    Object.assign(fill.style, {
      position: 'absolute',
      left: '0', top: '0',
      height: '100%',
      width: `${percent}%`,
      background: 'linear-gradient(90deg, #6622AA, #AA3388, #FF66AA)',
      borderRadius: '3px 0 0 3px',
      transition: `width ${SLIDE_DURATION} ${SLIDE_EASING}`,
    });
    trackWrap.appendChild(fill);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(def.min);
    slider.max = String(def.max);
    slider.step = String(def.step);
    slider.value = String(this.params[def.key]);
    Object.assign(slider.style, {
      position: 'absolute',
      inset: '0',
      width: '100%',
      height: '100%',
      opacity: '0',
      cursor: 'pointer',
      margin: '0',
    });

    const uid = `slider-${def.key}-${Date.now()}`;
    slider.id = uid;

    const customThumb = document.createElement('div');
    Object.assign(customThumb.style, {
      position: 'absolute',
      top: '50%',
      left: `calc(${percent}% - 7px)`,
      width: '14px',
      height: '14px',
      borderRadius: '50%',
      background: '#FFFFFF',
      transform: 'translateY(-50%)',
      transition: `left ${SLIDE_DURATION} ${SLIDE_EASING}, box-shadow 0.15s ease, width 0.15s ease, height 0.15s ease`,
      boxShadow: '0 0 4px rgba(255,136,204,0.6), 0 0 10px rgba(102,34,170,0.4), 0 1px 3px rgba(0,0,0,0.4)',
      pointerEvents: 'none',
    });
    trackWrap.appendChild(customThumb);
    trackWrap.appendChild(slider);

    slider.addEventListener('input', () => {
      const v = parseFloat(slider.value);
      (this.params as any)[def.key] = v;
      valSpan.textContent = this.formatValue(def.key, v);
      const pct = ((v - def.min) / (def.max - def.min)) * 100;
      fill.style.width = `${pct}%`;
      customThumb.style.left = `calc(${pct}% - 7px)`;
      this.onParamChange({ [def.key]: v } as Partial<ReliefParams>);
    });

    slider.addEventListener('mouseenter', () => {
      customThumb.style.width = '16px';
      customThumb.style.height = '16px';
      customThumb.style.boxShadow = '0 0 8px rgba(255,136,204,0.8), 0 0 18px rgba(102,34,170,0.5), 0 1px 3px rgba(0,0,0,0.4)';
      valSpan.style.color = '#FFAADD';
    });
    slider.addEventListener('mouseleave', () => {
      customThumb.style.width = '14px';
      customThumb.style.height = '14px';
      customThumb.style.boxShadow = '0 0 4px rgba(255,136,204,0.6), 0 0 10px rgba(102,34,170,0.4), 0 1px 3px rgba(0,0,0,0.4)';
      valSpan.style.color = '#FF88CC';
    });

    wrap.appendChild(trackWrap);
    p.appendChild(wrap);
  }

  private buildToggleControl(p: HTMLDivElement, def: SliderDef) {
    const wrap = document.createElement('div');
    Object.assign(wrap.style, {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '18px',
      padding: '6px 2px',
    });

    const label = document.createElement('span');
    label.textContent = def.label;
    Object.assign(label.style, {
      color: '#CC88FF',
      fontSize: '12px',
      letterSpacing: '0.5px',
    });

    const rightSide = document.createElement('div');
    Object.assign(rightSide.style, {
      display: 'flex',
      alignItems: 'center',
      gap: '10px',
    });

    const valSpan = document.createElement('span');
    const isOn = this.params[def.key] as unknown as boolean;
    valSpan.textContent = isOn ? '开' : '关';
    Object.assign(valSpan.style, {
      color: isOn ? '#88FFAA' : '#AA88CC',
      fontSize: '12px',
      fontWeight: '600',
      minWidth: '18px',
      textAlign: 'center',
      transition: `color ${SLIDE_DURATION} ${SLIDE_EASING}`,
    });
    this.valueDisplays.set(def.key, valSpan);

    const toggle = document.createElement('div');
    Object.assign(toggle.style, {
      width: '44px',
      height: '22px',
      borderRadius: '11px',
      cursor: 'pointer',
      background: isOn
        ? 'linear-gradient(135deg, #6622AA, #AA3388)'
        : 'rgba(30, 0, 60, 0.8)',
      position: 'relative',
      transition: `background ${SLIDE_DURATION} ${SLIDE_EASING}`,
      border: `1px solid ${isOn ? '#FF66AA' : '#6622AA'}`,
      boxSizing: 'border-box',
      boxShadow: isOn ? '0 0 12px rgba(170,51,136,0.5)' : 'none',
    });

    const knob = document.createElement('div');
    Object.assign(knob.style, {
      width: '18px',
      height: '18px',
      borderRadius: '50%',
      background: '#fff',
      position: 'absolute',
      top: '1px',
      left: isOn ? '23px' : '1px',
      transition: `left ${SLIDE_DURATION} ${SLIDE_EASING}, box-shadow 0.2s ease`,
      boxShadow: isOn
        ? '0 0 6px rgba(255,136,204,0.6), 0 0 10px rgba(102,34,170,0.5)'
        : '0 0 3px rgba(136,34,170,0.4)',
    });
    toggle.appendChild(knob);

    toggle.addEventListener('click', () => {
      const newVal = !(this.params[def.key] as unknown as boolean);
      (this.params as any)[def.key] = newVal;
      toggle.style.background = newVal
        ? 'linear-gradient(135deg, #6622AA, #AA3388)'
        : 'rgba(30, 0, 60, 0.8)';
      toggle.style.borderColor = newVal ? '#FF66AA' : '#6622AA';
      toggle.style.boxShadow = newVal ? '0 0 12px rgba(170,51,136,0.5)' : 'none';
      knob.style.left = newVal ? '23px' : '1px';
      knob.style.boxShadow = newVal
        ? '0 0 6px rgba(255,136,204,0.6), 0 0 10px rgba(102,34,170,0.5)'
        : '0 0 3px rgba(136,34,170,0.4)';
      valSpan.textContent = newVal ? '开' : '关';
      valSpan.style.color = newVal ? '#88FFAA' : '#AA88CC';
      this.onParamChange({ [def.key]: newVal } as any);
    });

    rightSide.appendChild(valSpan);
    rightSide.appendChild(toggle);
    wrap.appendChild(label);
    wrap.appendChild(rightSide);
    p.appendChild(wrap);
  }

  private formatValue(key: keyof ReliefParams, value: number | boolean): string {
    if (typeof value === 'boolean') return value ? '开' : '关';
    const def = SLIDERS.find(s => s.key === key);
    if (!def) return String(value);
    return def.step < 1 ? value.toFixed(2) : value.toFixed(0);
  }

  private toggleExpanded(arrowEl: HTMLSpanElement) {
    this.expanded = !this.expanded;
    this.updatePanelPosition();
    arrowEl.style.transform = this.expanded ? 'rotate(180deg)' : 'rotate(0deg)';
  }

  private updatePanelPosition() {
    if (this.expanded) {
      this.panel.style.transform = 'translateX(0%)';
      this.toggleBtn.style.transform = `translateY(-50%) translateX(-${PANEL_WIDTH}px)`;
    } else {
      this.panel.style.transform = 'translateX(100%)';
      this.toggleBtn.style.transform = 'translateY(-50%)';
    }
  }

  showTooltipAt(star: StarData, screenX: number, screenY: number) {
    this.tooltip.innerHTML = `
      <div style="font-weight:600;color:#FF88CC;margin-bottom:4px;font-size:13px;letter-spacing:0.5px;">${this.escapeHtml(star.name)}</div>
      <div style="font-size:13px;margin-top:2px;"><span style="color:#AA88CC">距离：</span>${star.distance} <span style="color:#888">ly</span></div>
      <div style="font-size:13px;margin-top:2px;"><span style="color:#AA88CC">视星等：</span>${star.magnitude.toFixed(2)}</div>
      <div style="font-size:13px;margin-top:2px;"><span style="color:#AA88CC">绝对星等：</span>${star.absoluteMagnitude.toFixed(2)}</div>
      <div style="font-size:13px;margin-top:2px;"><span style="color:#AA88CC">光谱类型：</span><span style="color:#FFAADD;font-weight:500;">${this.escapeHtml(star.spectralType)}</span></div>
    `;
    this.tooltipTargetPos.x = screenX + 16;
    this.tooltipTargetPos.y = screenY - 10;
    this.tooltipVisible = true;
    this.tooltip.style.opacity = '1';
  }

  hideTooltip() {
    this.tooltipVisible = false;
    this.tooltip.style.opacity = '0';
  }

  private escapeHtml(str: string): string {
    const map: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return str.replace(/[&<>"']/g, c => map[c] || c);
  }

  private startTooltipAnimation() {
    const tick = () => {
      if (this.tooltipVisible) {
        this.tooltipCurrentPos.x += (this.tooltipTargetPos.x - this.tooltipCurrentPos.x) * this.LERP_ALPHA;
        this.tooltipCurrentPos.y += (this.tooltipTargetPos.y - this.tooltipCurrentPos.y) * this.LERP_ALPHA;

        const maxX = window.innerWidth - 260;
        const maxY = window.innerHeight - 180;
        const fx = Math.max(8, Math.min(maxX, this.tooltipCurrentPos.x));
        const fy = Math.max(8, Math.min(maxY, this.tooltipCurrentPos.y));

        this.tooltip.style.transform = `translate(${fx}px, ${fy}px)`;
      }
      this.rafId = requestAnimationFrame(tick);
    };
    this.rafId = requestAnimationFrame(tick);
  }

  getParams(): ReliefParams {
    return { ...this.params };
  }

  setParams(params: Partial<ReliefParams>) {
    Object.assign(this.params, params);
    for (const [key, val] of Object.entries(params)) {
      const disp = this.valueDisplays.get(key as keyof ReliefParams);
      if (disp) {
        disp.textContent = this.formatValue(key as keyof ReliefParams, val as any);
      }
    }
  }

  dispose() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.panel.remove();
    this.toggleBtn.remove();
    this.tooltip.remove();
  }
}
