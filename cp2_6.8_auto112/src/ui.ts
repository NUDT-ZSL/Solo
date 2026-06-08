import { Neuron } from './network';

const CHART_MIN_MV = -70;
const CHART_MAX_MV = 30;
const CHART_WINDOW_SEC = 10;

export class UIManager {
  fpsElement: HTMLElement;
  chartCanvas: HTMLCanvasElement;
  chartContainer: HTMLElement;
  tooltip: HTMLElement;
  densitySlider: HTMLInputElement;
  frequencySlider: HTMLInputElement;
  densityValue: HTMLElement;
  frequencyValue: HTMLElement;
  resetButton: HTMLButtonElement;
  chartTitle: HTMLElement;
  selectedNeuron: Neuron | null = null;
  private chartCtx: CanvasRenderingContext2D;

  constructor() {
    this.fpsElement = document.getElementById('fps-counter')!;
    this.chartCanvas = document.getElementById('chart-canvas') as HTMLCanvasElement;
    this.chartContainer = document.getElementById('chart-container')!;
    this.tooltip = document.getElementById('tooltip')!;
    this.densitySlider = document.getElementById('density-slider') as HTMLInputElement;
    this.frequencySlider = document.getElementById('frequency-slider') as HTMLInputElement;
    this.densityValue = document.getElementById('density-value')!;
    this.frequencyValue = document.getElementById('frequency-value')!;
    this.resetButton = document.getElementById('reset-btn') as HTMLButtonElement;
    this.chartTitle = document.getElementById('chart-title')!;
    this.chartCtx = this.chartCanvas.getContext('2d')!;
    this.resizeChartCanvas();
    window.addEventListener('resize', () => this.resizeChartCanvas());
  }

  private resizeChartCanvas(): void {
    const rect = this.chartCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.chartCanvas.width = rect.width * dpr;
    this.chartCanvas.height = rect.height * dpr;
    this.chartCtx.scale(dpr, dpr);
  }

  bindControls(
    onDensityChange: (v: number) => void,
    onFrequencyChange: (v: number) => void,
    onReset: () => void
  ): void {
    this.densitySlider.addEventListener('input', () => {
      const val = parseFloat(this.densitySlider.value);
      this.densityValue.textContent = val.toFixed(1);
      onDensityChange(val);
    });

    this.frequencySlider.addEventListener('input', () => {
      const val = parseFloat(this.frequencySlider.value);
      this.frequencyValue.textContent = val.toFixed(1) + ' Hz';
      onFrequencyChange(val);
    });

    this.resetButton.addEventListener('click', () => {
      onReset();
    });
  }

  updateFPS(fps: number): void {
    this.fpsElement.textContent = 'FPS: ' + Math.round(fps);
  }

  private getPotentialColor(value: number): string {
    if (value <= -50) return '#2ECC71';
    if (value <= -10) return '#F1C40F';
    return '#E74C3C';
  }

  updateChart(currentTime: number): void {
    if (!this.selectedNeuron) return;

    const rect = this.chartCanvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const ctx = this.chartCtx;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#1A1A2E';
    ctx.fillRect(0, 0, w, h);

    const history = this.selectedNeuron.potentialHistory;
    if (history.length < 2) return;

    const startTime = currentTime - CHART_WINDOW_SEC;
    const timeRange = CHART_WINDOW_SEC;
    const mvRange = CHART_MAX_MV - CHART_MIN_MV;

    ctx.strokeStyle = '#FFFFFF15';
    ctx.lineWidth = 1;
    const yMin = ((CHART_MAX_MV - (-55)) / mvRange) * h;
    ctx.beginPath();
    ctx.moveTo(0, yMin);
    ctx.lineTo(w, yMin);
    ctx.stroke();

    ctx.lineWidth = 2;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    let currentPath: { x: number; y: number; color: string }[] = [];
    let currentColor = '';

    for (let i = 0; i < history.length; i++) {
      const pt = history[i];
      if (pt.time < startTime) continue;

      const x = ((pt.time - startTime) / timeRange) * w;
      const y = ((CHART_MAX_MV - pt.value) / mvRange) * h;
      const color = this.getPotentialColor(pt.value);

      if (color !== currentColor && currentPath.length > 0) {
        const last = currentPath[currentPath.length - 1];
        ctx.strokeStyle = currentColor;
        ctx.beginPath();
        ctx.moveTo(last.x, last.y);
        ctx.lineTo(x, y);
        ctx.stroke();

        ctx.strokeStyle = currentColor;
        ctx.beginPath();
        for (let j = 0; j < currentPath.length; j++) {
          const p = currentPath[j];
          if (j === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        }
        ctx.stroke();

        currentPath = [{ x, y, color }];
      } else {
        currentPath.push({ x, y, color });
      }
      currentColor = color;
    }

    if (currentPath.length > 1) {
      ctx.strokeStyle = currentColor;
      ctx.beginPath();
      for (let j = 0; j < currentPath.length; j++) {
        const p = currentPath[j];
        if (j === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }
  }

  selectNeuron(neuron: Neuron | null): void {
    this.selectedNeuron = neuron;
    if (neuron) {
      const label = neuron.type === 'excitatory'
        ? `Ex-Neuron #${neuron.id}`
        : `In-Neuron #${neuron.id}`;
      this.chartTitle.textContent = `膜电位 - ${label} (mV)`;
      this.chartContainer.style.display = 'block';
    } else {
      this.chartContainer.style.display = 'none';
    }
  }

  showTooltip(neuron: Neuron, x: number, y: number): void {
    const label = neuron.type === 'excitatory'
      ? `Ex-Neuron #${neuron.id}`
      : `In-Neuron #${neuron.id}`;
    this.tooltip.textContent = label;
    this.tooltip.style.display = 'block';
    this.tooltip.style.left = (x + 12) + 'px';
    this.tooltip.style.top = (y + 12) + 'px';
  }

  hideTooltip(): void {
    this.tooltip.style.display = 'none';
  }
}
