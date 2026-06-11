import { ColorProbe } from './probe';
import {
  ColorData,
  GradientType,
  HistoryItem,
  ProbeControllerOptions,
  HSL
} from './types';
import { GradientGenerator } from './gradient';
import { ColorHistory } from './history';

type SelectionMode = 'start' | 'end';

interface PendingSliderState {
  source: 'rgb' | 'hsl' | null;
  r?: number;
  g?: number;
  b?: number;
  h?: number;
  s?: number;
  l?: number;
}

export class ProbeController {
  private readonly probe: ColorProbe;
  private readonly gradient: GradientGenerator;
  private readonly history: ColorHistory;
  private readonly options: ProbeControllerOptions;

  private isImageLoaded: boolean = false;
  private _currentColor: ColorData | null = null;

  private selectedStartId: string | null = null;
  private selectedEndId: string | null = null;
  private fineTuneId: string | null = null;
  private selectionMode: SelectionMode = 'start';

  private lastFrameTime: number = 0;
  private readonly frameInterval: number = 1000 / 60;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private isHovering: boolean = false;
  private animationFrameId: number | null = null;

  private crosshairDotPhase: number = 0;
  private previousHoverState: boolean = false;

  private pendingSliderState: PendingSliderState = { source: null };
  private sliderUpdateRaf: number | null = null;

  constructor(options: ProbeControllerOptions) {
    this.options = options;
    this.probe = new ColorProbe(options.mainCanvas);
    this.gradient = new GradientGenerator(options.gradientCanvas);
    this.history = new ColorHistory(20);

    this.history.setContainer(options.historyContainer);
    this.history.setOnSelect(this.handleHistorySelect.bind(this));
    this.history.setOnDelete(this.handleHistoryDelete.bind(this));

    this.bindEvents();
    this.updateGradientSwatches();
  }

  // ============================================================
  // 事件绑定
  // ============================================================

  private bindEvents(): void {
    const { mainCanvas } = this.options;

    mainCanvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    mainCanvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    mainCanvas.addEventListener('click', this.handleCanvasClick.bind(this));

    this.options.exportBtn.addEventListener('click', this.handleExport.bind(this));
    this.options.linearModeBtn.addEventListener('click', () => this.setGradientMode('linear'));
    this.options.radialModeBtn.addEventListener('click', () => this.setGradientMode('radial'));
    this.options.lockBtn.addEventListener('click', this.handleLockToggle.bind(this));

    this.bindSliderEvents();
    this.startAnimation();
  }

  private bindSliderEvents(): void {
    const {
      rSlider, gSlider, bSlider,
      hSlider, sSlider, lSlider,
      rInput, gInput, bInput,
      hInput, sInput, lInput
    } = this.options;

    const onRgbSliderInput = () => {
      const r = parseInt(rSlider.value, 10);
      const g = parseInt(gSlider.value, 10);
      const b = parseInt(bSlider.value, 10);
      this.scheduleSliderUpdate({ source: 'rgb', r, g, b });
    };

    const onHslSliderInput = () => {
      const h = parseInt(hSlider.value, 10);
      const s = parseInt(sSlider.value, 10);
      const l = parseInt(lSlider.value, 10);
      this.scheduleSliderUpdate({ source: 'hsl', h, s, l });
    };

    rSlider.addEventListener('input', onRgbSliderInput);
    gSlider.addEventListener('input', onRgbSliderInput);
    bSlider.addEventListener('input', onRgbSliderInput);

    hSlider.addEventListener('input', onHslSliderInput);
    sSlider.addEventListener('input', onHslSliderInput);
    lSlider.addEventListener('input', onHslSliderInput);

    rInput.addEventListener('change', () => {
      rSlider.value = rInput.value;
      onRgbSliderInput();
    });
    gInput.addEventListener('change', () => {
      gSlider.value = gInput.value;
      onRgbSliderInput();
    });
    bInput.addEventListener('change', () => {
      bSlider.value = bInput.value;
      onRgbSliderInput();
    });

    hInput.addEventListener('change', () => {
      hSlider.value = hInput.value;
      onHslSliderInput();
    });
    sInput.addEventListener('change', () => {
      sSlider.value = sInput.value;
      onHslSliderInput();
    });
    lInput.addEventListener('change', () => {
      lSlider.value = lInput.value;
      onHslSliderInput();
    });
  }

  // ============================================================
  // 滑块更新 debounce (基于 requestAnimationFrame 合并)
  // ============================================================

  private scheduleSliderUpdate(state: PendingSliderState): void {
    this.pendingSliderState = { ...this.pendingSliderState, ...state };

    if (this.sliderUpdateRaf !== null) return;

    this.sliderUpdateRaf = requestAnimationFrame(() => {
      this.sliderUpdateRaf = null;
      this.flushSliderUpdate();
    });
  }

  private flushSliderUpdate(): void {
    const state = this.pendingSliderState;
    this.pendingSliderState = { source: null };

    if (state.source === 'rgb' && state.r !== undefined && state.g !== undefined && state.b !== undefined) {
      this.applyFineTuneFromRgb(state.r, state.g, state.b);
    } else if (state.source === 'hsl' && state.h !== undefined && state.s !== undefined && state.l !== undefined) {
      this.applyFineTuneFromHsl(state.h, state.s, state.l);
    }
  }

  // ============================================================
  // 图片加载
  // ============================================================

  loadImage(image: HTMLImageElement): void {
    this.probe.loadImage(image);
    this.isImageLoaded = true;
    this.previousHoverState = false;
  }

  // ============================================================
  // 鼠标事件
  // ============================================================

  private handleMouseMove(e: MouseEvent): void {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;

    const inImage = this.isImageLoaded && this.probe.isInImage(e.clientX, e.clientY);
    this.isHovering = inImage;

    if (!inImage) {
      this.hideTooltip();
    }
  }

  private handleMouseLeave(): void {
    this.isHovering = false;
    this.hideTooltip();
  }

  private handleCanvasClick(e: MouseEvent): void {
    if (!this.isImageLoaded) return;

    const color = this.probe.getColorAt(e.clientX, e.clientY);
    if (color) {
      this.history.addColor(color);
      this.showClickFeedback(e.clientX, e.clientY);
    }
  }

  // ============================================================
  // 历史记录处理
  // ============================================================

  private handleHistorySelect(item: HistoryItem): void {
    this.fineTuneId = item.id;
    this.showFineTunePanel(item.color);

    if (this.selectionMode === 'start') {
      this.selectedStartId = item.id;
      this.selectionMode = 'end';
    } else {
      this.selectedEndId = item.id;
      this.selectionMode = 'start';
    }

    this.updateGradient();
    this.updateGradientSwatches();
  }

  private handleHistoryDelete(id: string): void {
    const item = this.history.getItem(id);
    if (item && item.locked) return;

    this.history.removeColor(id);

    if (this.fineTuneId === id) {
      this.fineTuneId = null;
      this.options.fineTuneSection.style.display = 'none';
    }

    if (this.selectedStartId === id) this.selectedStartId = null;
    if (this.selectedEndId === id) this.selectedEndId = null;

    this.updateGradient();
    this.updateGradientSwatches();
  }

  private handleLockToggle(): void {
    if (!this.fineTuneId) return;
    const isLocked = this.history.toggleLock(this.fineTuneId);
    this.options.lockBtn.classList.toggle('locked', isLocked);
  }

  // ============================================================
  // 颜色微调面板
  // ============================================================

  private showFineTunePanel(color: ColorData): void {
    const {
      fineTuneSection, fineTunePreview, lockBtn,
      rSlider, gSlider, bSlider,
      hSlider, sSlider, lSlider,
      rInput, gInput, bInput,
      hInput, sInput, lInput
    } = this.options;

    fineTuneSection.style.display = 'block';
    fineTunePreview.style.backgroundColor = color.hex;

    rSlider.value = String(color.r);
    gSlider.value = String(color.g);
    bSlider.value = String(color.b);
    hSlider.value = String(color.hsl.h);
    sSlider.value = String(color.hsl.s);
    lSlider.value = String(color.hsl.l);

    rInput.value = String(color.r);
    gInput.value = String(color.g);
    bInput.value = String(color.b);
    hInput.value = String(color.hsl.h);
    sInput.value = String(color.hsl.s);
    lInput.value = String(color.hsl.l);

    const item = this.fineTuneId ? this.history.getItem(this.fineTuneId) : undefined;
    lockBtn.classList.toggle('locked', item?.locked || false);
  }

  private applyFineTuneFromRgb(r: number, g: number, b: number): void {
    const sr = Math.max(0, Math.min(255, r | 0));
    const sg = Math.max(0, Math.min(255, g | 0));
    const sb = Math.max(0, Math.min(255, b | 0));

    const hex = ColorProbe.rgbToHex(sr, sg, sb);
    const hsl = ColorProbe.rgbToHsl(sr, sg, sb);

    this.syncFineTuneUi({ r: sr, g: sg, b: sb, hex, hsl });

    if (this.fineTuneId) {
      this.commitFineTuneChange({ r: sr, g: sg, b: sb, hex, hsl });
    }
  }

  private applyFineTuneFromHsl(h: number, s: number, l: number): void {
    const sh = ((h | 0) % 360 + 360) % 360;
    const ss = Math.max(0, Math.min(100, s | 0));
    const sl = Math.max(0, Math.min(100, l | 0));

    const rgb = ColorProbe.hslToRgb(sh, ss, sl);
    const hex = ColorProbe.rgbToHex(rgb.r, rgb.g, rgb.b);
    const hsl: HSL = { h: sh, s: ss, l: sl };

    this.syncFineTuneUi({ r: rgb.r, g: rgb.g, b: rgb.b, hex, hsl });

    if (this.fineTuneId) {
      this.commitFineTuneChange({ r: rgb.r, g: rgb.g, b: rgb.b, hex, hsl });
    }
  }

  private syncFineTuneUi(color: ColorData): void {
    const {
      fineTunePreview,
      rSlider, gSlider, bSlider,
      hSlider, sSlider, lSlider,
      rInput, gInput, bInput,
      hInput, sInput, lInput
    } = this.options;

    fineTunePreview.style.backgroundColor = color.hex;

    rSlider.value = String(color.r);
    gSlider.value = String(color.g);
    bSlider.value = String(color.b);
    hSlider.value = String(color.hsl.h);
    sSlider.value = String(color.hsl.s);
    lSlider.value = String(color.hsl.l);

    rInput.value = String(color.r);
    gInput.value = String(color.g);
    bInput.value = String(color.b);
    hInput.value = String(color.hsl.h);
    sInput.value = String(color.hsl.s);
    lInput.value = String(color.hsl.l);
  }

  private commitFineTuneChange(color: ColorData): void {
    if (!this.fineTuneId) return;

    this.history.updateColor(this.fineTuneId, color);

    this.updateGradient();
    this.updateGradientSwatches();
  }

  // ============================================================
  // 渐变相关
  // ============================================================

  private setGradientMode(mode: GradientType): void {
    this.gradient.setConfig({ type: mode });

    this.options.linearModeBtn.classList.toggle('active', mode === 'linear');
    this.options.radialModeBtn.classList.toggle('active', mode === 'radial');
  }

  private updateGradient(): void {
    const startHex = this.getHexById(this.selectedStartId);
    const endHex = this.getHexById(this.selectedEndId);

    const start = startHex || '#FF0000';
    const end = endHex || '#0000FF';

    this.gradient.setConfig({ startColor: start, endColor: end });
  }

  private updateGradientSwatches(): void {
    const startHex = this.getHexById(this.selectedStartId);
    const endHex = this.getHexById(this.selectedEndId);

    this.options.startColorSwatch.style.backgroundColor = startHex || 'transparent';
    this.options.endColorSwatch.style.backgroundColor = endHex || 'transparent';

    this.options.startColorSwatch.parentElement?.classList.toggle('active', !!this.selectedStartId);
    this.options.endColorSwatch.parentElement?.classList.toggle('active', !!this.selectedEndId);
  }

  private getHexById(id: string | null): string | null {
    if (!id) return null;
    const item = this.history.getItem(id);
    return item ? item.color.hex : null;
  }

  // ============================================================
  // 导出 & 反馈
  // ============================================================

  private handleExport(): void {
    const css = this.gradient.generateCSS();
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(css).then(() => {
        this.showCopyFeedback();
      }).catch(() => {
        this.fallbackCopy(css);
      });
    } else {
      this.fallbackCopy(css);
    }
  }

  private fallbackCopy(text: string): void {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.left = '-9999px';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      this.showCopyFeedback();
    } catch (e) {
      console.warn('复制失败', e);
    }
  }

  private showCopyFeedback(): void {
    const feedback = this.options.copyFeedback;
    feedback.classList.add('show');
    setTimeout(() => {
      feedback.classList.remove('show');
    }, 3000);
  }

  private showClickFeedback(x: number, y: number): void {
    const ripple = document.createElement('div');
    ripple.className = 'click-ripple';
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;
    document.body.appendChild(ripple);

    setTimeout(() => {
      ripple.remove();
    }, 400);
  }

  // ============================================================
  // 动画循环 (60fps，上限 60fps 采样取色)
  // ============================================================

  private startAnimation(): void {
    const animate = (timestamp: number) => {
      if (timestamp - this.lastFrameTime >= this.frameInterval) {
        this.lastFrameTime = timestamp;
        this.update();
      }
      this.animationFrameId = requestAnimationFrame(animate);
    };
    this.animationFrameId = requestAnimationFrame(animate);
  }

  private update(): void {
    this.crosshairDotPhase += 0.05;

    const justLeft = !this.isHovering && this.previousHoverState;

    if (justLeft) {
      this.probe.restoreCanvasBase();
      this.hideTooltip();
    }

    if (this.isHovering && this.isImageLoaded) {
      const color = this.probe.getColorAt(this.mouseX, this.mouseY);
      if (color) {
        this._currentColor = color;
        this.showTooltip(color);
      } else {
        this.hideTooltip();
      }
      this.drawCrosshair();
    }

    this.previousHoverState = this.isHovering;
  }

  // ============================================================
  // 十字线绘制 (显式清除 + 重绘底图，保证无残留)
  // ============================================================

  private drawCrosshair(): void {
    const { mainCanvas } = this.options;
    const ctx = mainCanvas.getContext('2d');
    if (!ctx) return;

    if (!this.isImageLoaded) return;

    this.probe.restoreCanvasBase();

    if (!this.isHovering) return;

    const rect = mainCanvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const scaleX = mainCanvas.width / rect.width;
    const scaleY = mainCanvas.height / rect.height;
    const x = (this.mouseX - rect.left) * scaleX;
    const y = (this.mouseY - rect.top) * scaleY;

    if (x < 0 || x > mainCanvas.width || y < 0 || y > mainCanvas.height) return;

    const dotSize = 4 + Math.sin(this.crosshairDotPhase) * 2;

    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = Math.max(1, 1 / Math.max(scaleX, scaleY));
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 2;

    const arm = 15 * Math.max(scaleX, scaleY);
    const gap = 5 * Math.max(scaleX, scaleY);

    ctx.beginPath();
    ctx.moveTo(x - arm, y);
    ctx.lineTo(x - gap, y);
    ctx.moveTo(x + gap, y);
    ctx.lineTo(x + arm, y);
    ctx.moveTo(x, y - arm);
    ctx.lineTo(x, y - gap);
    ctx.moveTo(x, y + gap);
    ctx.lineTo(x, y + arm);
    ctx.stroke();

    ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + Math.sin(this.crosshairDotPhase) * 0.3})`;
    ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(x, y, dotSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // ============================================================
  // Tooltip 显示/隐藏
  // ============================================================

  private showTooltip(color: ColorData): void {
    const { tooltip, tooltipColor, tooltipHex, tooltipRgb, tooltipHsl, mainCanvas } = this.options;

    const rect = mainCanvas.getBoundingClientRect();
    const offsetX = 20;
    const offsetY = 20;

    let left = this.mouseX - rect.left + offsetX;
    let top = this.mouseY - rect.top + offsetY;

    const tooltipWidth = 180;
    const tooltipHeight = 100;

    if (left + tooltipWidth > rect.width) {
      left = this.mouseX - rect.left - tooltipWidth - offsetX;
    }
    if (top + tooltipHeight > rect.height) {
      top = this.mouseY - rect.top - tooltipHeight - offsetY;
    }

    tooltip.style.left = `${Math.max(0, left)}px`;
    tooltip.style.top = `${Math.max(0, top)}px`;
    tooltip.style.display = 'block';

    tooltipColor.style.backgroundColor = color.hex;
    tooltipHex.textContent = color.hex;
    tooltipRgb.textContent = `${color.r}, ${color.g}, ${color.b}`;
    tooltipHsl.textContent = `${color.hsl.h}, ${color.hsl.s}%, ${color.hsl.l}%`;
  }

  private hideTooltip(): void {
    this.options.tooltip.style.display = 'none';
  }

  // ============================================================
  // 外部 API
  // ============================================================

  resizeGradientCanvas(width: number, height: number): void {
    this.gradient.setSize(width, height);
  }

  clearHistory(): void {
    this.history.clear();
    this.selectedStartId = null;
    this.selectedEndId = null;
    this.fineTuneId = null;
    this.options.fineTuneSection.style.display = 'none';
    this.updateGradient();
    this.updateGradientSwatches();
  }

  getHistory(): ColorHistory {
    return this.history;
  }

  destroy(): void {
    if (this.sliderUpdateRaf !== null) {
      cancelAnimationFrame(this.sliderUpdateRaf);
      this.sliderUpdateRaf = null;
    }
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.gradient.destroy();
  }
}
