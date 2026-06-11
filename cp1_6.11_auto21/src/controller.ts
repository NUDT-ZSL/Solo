import { ColorProbe, ColorData } from './probe';
import { GradientGenerator, GradientType } from './gradient';
import { ColorHistory, HistoryItem } from './history';

interface ProbeControllerOptions {
  mainCanvas: HTMLCanvasElement;
  gradientCanvas: HTMLCanvasElement;
  historyContainer: HTMLElement;
  tooltip: HTMLElement;
  tooltipColor: HTMLElement;
  tooltipHex: HTMLElement;
  tooltipRgb: HTMLElement;
  tooltipHsl: HTMLElement;
  startColorSwatch: HTMLElement;
  endColorSwatch: HTMLElement;
  fineTuneSection: HTMLElement;
  fineTunePreview: HTMLElement;
  lockBtn: HTMLElement;
  rSlider: HTMLInputElement;
  gSlider: HTMLInputElement;
  bSlider: HTMLInputElement;
  hSlider: HTMLInputElement;
  sSlider: HTMLInputElement;
  lSlider: HTMLInputElement;
  rInput: HTMLInputElement;
  gInput: HTMLInputElement;
  bInput: HTMLInputElement;
  hInput: HTMLInputElement;
  sInput: HTMLInputElement;
  lInput: HTMLInputElement;
  exportBtn: HTMLElement;
  copyFeedback: HTMLElement;
  linearModeBtn: HTMLElement;
  radialModeBtn: HTMLElement;
}

export class ProbeController {
  private probe: ColorProbe;
  private gradient: GradientGenerator;
  private history: ColorHistory;
  private options: ProbeControllerOptions;
  
  private isImageLoaded: boolean = false;
  private currentColor: ColorData | null = null;
  private selectedStartColor: string | null = null;
  private selectedEndColor: string | null = null;
  private fineTuneId: string | null = null;
  private selectionMode: 'start' | 'end' = 'start';
  
  private lastFrameTime: number = 0;
  private frameInterval: number = 1000 / 60;
  private mouseX: number = 0;
  private mouseY: number = 0;
  private isHovering: boolean = false;
  private animationFrameId: number | null = null;
  
  private crosshairDotPhase: number = 0;

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

    const handleRgbChange = () => {
      const r = parseInt(rSlider.value);
      const g = parseInt(gSlider.value);
      const b = parseInt(bSlider.value);
      this.updateFineTuneFromRgb(r, g, b);
    };

    const handleHslChange = () => {
      const h = parseInt(hSlider.value);
      const s = parseInt(sSlider.value);
      const l = parseInt(lSlider.value);
      this.updateFineTuneFromHsl(h, s, l);
    };

    rSlider.addEventListener('input', handleRgbChange);
    gSlider.addEventListener('input', handleRgbChange);
    bSlider.addEventListener('input', handleRgbChange);
    
    hSlider.addEventListener('input', handleHslChange);
    sSlider.addEventListener('input', handleHslChange);
    lSlider.addEventListener('input', handleHslChange);

    rInput.addEventListener('change', () => { rSlider.value = rInput.value; handleRgbChange(); });
    gInput.addEventListener('change', () => { gSlider.value = gInput.value; handleRgbChange(); });
    bInput.addEventListener('change', () => { bSlider.value = bInput.value; handleRgbChange(); });
    
    hInput.addEventListener('change', () => { hSlider.value = hInput.value; handleHslChange(); });
    sInput.addEventListener('change', () => { sSlider.value = sInput.value; handleHslChange(); });
    lInput.addEventListener('change', () => { lSlider.value = lInput.value; handleHslChange(); });
  }

  loadImage(image: HTMLImageElement): void {
    this.probe.loadImage(image);
    this.isImageLoaded = true;
  }

  private handleMouseMove(e: MouseEvent): void {
    this.mouseX = e.clientX;
    this.mouseY = e.clientY;
    
    if (this.isImageLoaded && this.probe.isInImage(e.clientX, e.clientY)) {
      this.isHovering = true;
    } else {
      this.isHovering = false;
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

  private handleHistorySelect(item: HistoryItem): void {
    this.fineTuneId = item.id;
    this.showFineTunePanel(item.color);
    
    if (this.selectionMode === 'start') {
      this.selectedStartColor = item.color.hex;
      this.selectionMode = 'end';
    } else {
      this.selectedEndColor = item.color.hex;
      this.selectionMode = 'start';
    }
    
    this.updateGradient();
    this.updateGradientSwatches();
  }

  private handleHistoryDelete(id: string): void {
    const item = this.history.getItem(id);
    if (item && item.locked) {
      return;
    }
    
    this.history.removeColor(id);
    
    if (this.fineTuneId === id) {
      this.fineTuneId = null;
      this.options.fineTuneSection.style.display = 'none';
    }
    
    if (this.selectedStartColor && item?.color.hex === this.selectedStartColor) {
      this.selectedStartColor = null;
    }
    if (this.selectedEndColor && item?.color.hex === this.selectedEndColor) {
      this.selectedEndColor = null;
    }
    
    this.updateGradient();
    this.updateGradientSwatches();
  }

  private handleLockToggle(): void {
    if (!this.fineTuneId) return;
    
    const isLocked = this.history.toggleLock(this.fineTuneId);
    this.options.lockBtn.classList.toggle('locked', isLocked);
  }

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

    const item = this.fineTuneId ? this.history.getItem(this.fineTuneId) : null;
    lockBtn.classList.toggle('locked', item?.locked || false);
  }

  private updateFineTuneFromRgb(r: number, g: number, b: number): void {
    const hex = this.rgbToHex(r, g, b);
    const hsl = ColorProbe.rgbToHsl(r, g, b);
    
    this.options.fineTunePreview.style.backgroundColor = hex;
    
    this.options.hSlider.value = String(hsl.h);
    this.options.sSlider.value = String(hsl.s);
    this.options.lSlider.value = String(hsl.l);
    this.options.hInput.value = String(hsl.h);
    this.options.sInput.value = String(hsl.s);
    this.options.lInput.value = String(hsl.l);
    
    this.options.rInput.value = String(r);
    this.options.gInput.value = String(g);
    this.options.bInput.value = String(b);
    
    if (this.fineTuneId) {
      const colorData: ColorData = { r, g, b, hex, hsl };
      this.history.updateColor(this.fineTuneId, colorData);
      
      const item = this.history.getItem(this.fineTuneId);
      if (item) {
        if (this.selectedStartColor && item.color.hex !== hex && this.isSelectedStart(item.id)) {
          this.selectedStartColor = hex;
        }
        if (this.selectedEndColor && item.color.hex !== hex && this.isSelectedEnd(item.id)) {
          this.selectedEndColor = hex;
        }
      }
      
      this.updateGradient();
      this.updateGradientSwatches();
    }
  }

  private updateFineTuneFromHsl(h: number, s: number, l: number): void {
    const rgb = ColorProbe.hslToRgb(h, s, l);
    const hex = this.rgbToHex(rgb.r, rgb.g, rgb.b);
    const hsl = { h, s, l };
    
    this.options.fineTunePreview.style.backgroundColor = hex;
    
    this.options.rSlider.value = String(rgb.r);
    this.options.gSlider.value = String(rgb.g);
    this.options.bSlider.value = String(rgb.b);
    this.options.rInput.value = String(rgb.r);
    this.options.gInput.value = String(rgb.g);
    this.options.bInput.value = String(rgb.b);
    
    this.options.hInput.value = String(h);
    this.options.sInput.value = String(s);
    this.options.lInput.value = String(l);
    
    if (this.fineTuneId) {
      const colorData: ColorData = { r: rgb.r, g: rgb.g, b: rgb.b, hex, hsl };
      this.history.updateColor(this.fineTuneId, colorData);
      
      const item = this.history.getItem(this.fineTuneId);
      if (item) {
        if (this.selectedStartColor && this.isSelectedStart(item.id)) {
          this.selectedStartColor = hex;
        }
        if (this.selectedEndColor && this.isSelectedEnd(item.id)) {
          this.selectedEndColor = hex;
        }
      }
      
      this.updateGradient();
      this.updateGradientSwatches();
    }
  }

  private isSelectedStart(id: string): boolean {
    const item = this.history.getItem(id);
    return item ? item.color.hex === this.selectedStartColor : false;
  }

  private isSelectedEnd(id: string): boolean {
    const item = this.history.getItem(id);
    return item ? item.color.hex === this.selectedEndColor : false;
  }

  private setGradientMode(mode: GradientType): void {
    this.gradient.setConfig({ type: mode });
    
    this.options.linearModeBtn.classList.toggle('active', mode === 'linear');
    this.options.radialModeBtn.classList.toggle('active', mode === 'radial');
  }

  private updateGradient(): void {
    const start = this.selectedStartColor || '#FF0000';
    const end = this.selectedEndColor || '#0000FF';
    this.gradient.setConfig({ startColor: start, endColor: end });
  }

  private updateGradientSwatches(): void {
    this.options.startColorSwatch.style.backgroundColor = this.selectedStartColor || 'transparent';
    this.options.endColorSwatch.style.backgroundColor = this.selectedEndColor || 'transparent';
  }

  private handleExport(): void {
    const css = this.gradient.generateCSS();
    navigator.clipboard.writeText(css).then(() => {
      this.showCopyFeedback();
    });
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
    
    if (this.isHovering && this.isImageLoaded) {
      const color = this.probe.getColorAt(this.mouseX, this.mouseY);
      if (color) {
        this.currentColor = color;
        this.showTooltip(color);
      }
    }
    
    this.drawCrosshair();
  }

  private drawCrosshair(): void {
    const { mainCanvas } = this.options;
    const ctx = mainCanvas.getContext('2d');
    if (!ctx) return;

    this.probe['loadImage'] = this.probe['loadImage'];
    
    if (!this.isImageLoaded || !this.isHovering) {
      return;
    }

    const rect = mainCanvas.getBoundingClientRect();
    const scaleX = mainCanvas.width / rect.width;
    const scaleY = mainCanvas.height / rect.height;
    const x = (this.mouseX - rect.left) * scaleX;
    const y = (this.mouseY - rect.top) * scaleY;

    if (x < 0 || x > mainCanvas.width || y < 0 || y > mainCanvas.height) {
      return;
    }

    const dotSize = 4 + Math.sin(this.crosshairDotPhase) * 2;
    
    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 2;
    
    ctx.beginPath();
    ctx.moveTo(x - 15, y);
    ctx.lineTo(x - 5, y);
    ctx.moveTo(x + 5, y);
    ctx.lineTo(x + 15, y);
    ctx.moveTo(x, y - 15);
    ctx.lineTo(x, y - 5);
    ctx.moveTo(x, y + 5);
    ctx.lineTo(x, y + 15);
    ctx.stroke();
    
    ctx.fillStyle = `rgba(255, 255, 255, ${0.7 + Math.sin(this.crosshairDotPhase) * 0.3})`;
    ctx.beginPath();
    ctx.arc(x, y, dotSize, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
  }

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
    
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
    tooltip.style.display = 'block';
    
    tooltipColor.style.backgroundColor = color.hex;
    tooltipHex.textContent = color.hex;
    tooltipRgb.textContent = `${color.r}, ${color.g}, ${color.b}`;
    tooltipHsl.textContent = `${color.hsl.h}, ${color.hsl.s}%, ${color.hsl.l}%`;
  }

  private hideTooltip(): void {
    this.options.tooltip.style.display = 'none';
  }

  resizeGradientCanvas(width: number, height: number): void {
    this.gradient.setSize(width, height);
  }

  clearHistory(): void {
    this.history.clear();
    this.selectedStartColor = null;
    this.selectedEndColor = null;
    this.fineTuneId = null;
    this.options.fineTuneSection.style.display = 'none';
    this.updateGradient();
    this.updateGradientSwatches();
  }

  getHistory(): ColorHistory {
    return this.history;
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.gradient.destroy();
  }

  private rgbToHex(r: number, g: number, b: number): string {
    const toHex = (n: number) => n.toString(16).padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }
}
