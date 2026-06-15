import * as d3 from 'd3';
import type { SensorData } from './data-generator';
import { aqiToHex, getAqiLevel } from './color-utils';

export interface PanelCallbacks {
  onPauseToggle: () => void;
  onSetView: (mode: 'top' | 'perspective') => void;
  onPlaybackModeChange: (enabled: boolean) => void;
  onPlaybackTimeChange: (timestamp: number) => void;
}

export class UIPanel {
  private globalAqiEl: HTMLElement;
  private selectedPointEl: HTMLElement;
  private chartContainer: HTMLElement;
  private chartSvg: d3.Selection<SVGSVGElement, unknown, HTMLElement, any>;
  private btnPause: HTMLButtonElement;
  private btnTopView: HTMLButtonElement;
  private btnPerspective: HTMLButtonElement;
  private playbackModeCheckbox: HTMLInputElement;
  private timeSlider: HTMLInputElement;
  private timeDisplay: HTMLElement;
  private mobileToggle: HTMLElement;
  private panelEl: HTMLElement;

  private callbacks: PanelCallbacks;
  private isPaused: boolean = false;

  private chartWidth: number = 0;
  private chartHeight: number = 0;
  private chartMargin = { top: 15, right: 15, bottom: 25, left: 35 };

  private xScale: d3.ScaleLinear<number, number>;
  private yScale: d3.ScaleLinear<number, number>;
  private xAxis: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
  private yAxis: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
  private chartArea: d3.Selection<SVGGElement, unknown, HTMLElement, any>;
  private lineGenerator: d3.Line<SensorData>;
  private areaGenerator: d3.Area<SensorData>;
  private gradient: d3.Selection<SVGLinearGradientElement, unknown, HTMLElement, any>;
  private areaGradient: d3.Selection<SVGLinearGradientElement, unknown, HTMLElement, any>;

  private isPanelOpen: boolean = false;

  constructor(callbacks: PanelCallbacks) {
    this.callbacks = callbacks;

    this.globalAqiEl = document.getElementById('global-aqi')!;
    this.selectedPointEl = document.getElementById('selected-point')!;
    this.chartContainer = document.getElementById('chart-container')!;
    this.chartSvg = d3.select('#history-chart');
    this.btnPause = document.getElementById('btn-pause') as HTMLButtonElement;
    this.btnTopView = document.getElementById('btn-topview') as HTMLButtonElement;
    this.btnPerspective = document.getElementById('btn-perspective') as HTMLButtonElement;
    this.playbackModeCheckbox = document.getElementById('playback-mode') as HTMLInputElement;
    this.timeSlider = document.getElementById('time-slider') as HTMLInputElement;
    this.timeDisplay = document.getElementById('time-display')!;
    this.mobileToggle = document.getElementById('mobile-toggle')!;
    this.panelEl = document.getElementById('ui-panel')!;

    this.xScale = d3.scaleLinear();
    this.yScale = d3.scaleLinear();

    this.lineGenerator = d3.line<SensorData>()
      .x((d, i) => this.xScale(i))
      .y((d) => this.yScale(d.aqi))
      .curve(d3.curveCatmullRom.alpha(0.5));

    this.areaGenerator = d3.area<SensorData>()
      .x((d, i) => this.xScale(i))
      .y0(() => this.yScale.range()[0])
      .y1((d) => this.yScale(d.aqi))
      .curve(d3.curveCatmullRom.alpha(0.5));

    const defs = this.chartSvg.append('defs');
    this.gradient = defs.append('linearGradient')
      .attr('id', 'line-gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '100%').attr('y2', '0%');
    this.gradient.append('stop').attr('offset', '0%').attr('stop-color', '#64d2ff').attr('stop-opacity', 1);
    this.gradient.append('stop').attr('offset', '100%').attr('stop-color', '#4a9eff').attr('stop-opacity', 1);

    this.areaGradient = defs.append('linearGradient')
      .attr('id', 'area-gradient')
      .attr('x1', '0%').attr('y1', '0%')
      .attr('x2', '0%').attr('y2', '100%');
    this.areaGradient.append('stop').attr('offset', '0%').attr('stop-color', '#64d2ff').attr('stop-opacity', 0.4);
    this.areaGradient.append('stop').attr('offset', '100%').attr('stop-color', '#64d2ff').attr('stop-opacity', 0.02);

    this.chartArea = this.chartSvg.append('g');
    this.xAxis = this.chartSvg.append('g').attr('class', 'x-axis');
    this.yAxis = this.chartSvg.append('g').attr('class', 'y-axis');

    this.setupChartStyles();
    this.bindEvents();
    this.updateChartSize();
    this.renderEmptyChart();
  }

  private setupChartStyles(): void {
    const style = document.createElement('style');
    style.textContent = `
      .x-axis text, .y-axis text {
        fill: #8899aa;
        font-size: 10px;
        font-family: inherit;
      }
      .x-axis line, .y-axis line,
      .x-axis path, .y-axis path {
        stroke: rgba(100, 150, 200, 0.2);
      }
      .chart-grid line {
        stroke: rgba(100, 150, 200, 0.1);
        stroke-dasharray: 2, 2;
      }
    `;
    document.head.appendChild(style);
  }

  private bindEvents(): void {
    this.btnPause.addEventListener('click', () => {
      this.callbacks.onPauseToggle();
    });

    this.btnTopView.addEventListener('click', () => {
      this.callbacks.onSetView('top');
    });

    this.btnPerspective.addEventListener('click', () => {
      this.callbacks.onSetView('perspective');
    });

    this.playbackModeCheckbox.addEventListener('change', (e) => {
      const enabled = (e.target as HTMLInputElement).checked;
      this.timeSlider.disabled = !enabled;
      this.callbacks.onPlaybackModeChange(enabled);
      if (enabled) {
        this.timeDisplay.textContent = '回放中';
      } else {
        this.timeSlider.value = '100';
        this.timeDisplay.textContent = '实时';
      }
    });

    this.timeSlider.addEventListener('input', (e) => {
      const value = parseInt((e.target as HTMLInputElement).value, 10);
      const now = Date.now();
      const windowMs = 60000;
      const targetTime = now - windowMs * (1 - value / 100);
      const secondsAgo = Math.round((now - targetTime) / 1000);
      this.timeDisplay.textContent = secondsAgo === 0 ? '实时' : `${secondsAgo}秒前`;
      this.callbacks.onPlaybackTimeChange(targetTime);
    });

    this.mobileToggle.addEventListener('click', () => {
      this.toggleMobilePanel();
    });
  }

  private toggleMobilePanel(): void {
    this.isPanelOpen = !this.isPanelOpen;
    if (this.isPanelOpen) {
      this.panelEl.classList.add('panel-open');
      this.mobileToggle.classList.add('hidden');
    } else {
      this.panelEl.classList.remove('panel-open');
      this.mobileToggle.classList.remove('hidden');
    }
    setTimeout(() => this.updateChartSize(), 320);
  }

  public closeMobilePanel(): void {
    if (this.isPanelOpen) {
      this.isPanelOpen = false;
      this.panelEl.classList.remove('panel-open');
      this.mobileToggle.classList.remove('hidden');
    }
  }

  private updateChartSize(): void {
    const rect = this.chartContainer.getBoundingClientRect();
    this.chartWidth = rect.width;
    this.chartHeight = rect.height;

    this.chartSvg
      .attr('width', this.chartWidth)
      .attr('height', this.chartHeight);

    const innerWidth = this.chartWidth - this.chartMargin.left - this.chartMargin.right;
    const innerHeight = this.chartHeight - this.chartMargin.top - this.chartMargin.bottom;

    this.xScale.range([0, innerWidth]);
    this.yScale.range([innerHeight, 0]);

    this.chartArea.attr('transform', `translate(${this.chartMargin.left}, ${this.chartMargin.top})`);
    this.xAxis.attr('transform', `translate(${this.chartMargin.left}, ${this.chartHeight - this.chartMargin.bottom})`);
    this.yAxis.attr('transform', `translate(${this.chartMargin.left}, ${this.chartMargin.top})`);
  }

  private renderEmptyChart(): void {
    this.xScale.domain([0, 9]);
    this.yScale.domain([0, 300]);

    const innerWidth = this.chartWidth - this.chartMargin.left - this.chartMargin.right;
    const innerHeight = this.chartHeight - this.chartMargin.top - this.chartMargin.bottom;

    this.chartArea.selectAll('*').remove();

    const yAxisCall = d3.axisLeft(this.yScale)
      .ticks(5)
      .tickFormat((d) => String(d));

    const xAxisCall = d3.axisBottom(this.xScale)
      .ticks(5)
      .tickFormat((d) => {
        const ago = 9 - Number(d);
        return ago === 0 ? 'now' : `-${ago * 2}s`;
      });

    this.yAxis.call(yAxisCall);
    this.xAxis.call(xAxisCall);

    this.chartArea.append('text')
      .attr('x', innerWidth / 2)
      .attr('y', innerHeight / 2)
      .attr('text-anchor', 'middle')
      .attr('fill', '#556677')
      .attr('font-size', '12px')
      .text('点击色块查看历史数据');
  }

  public updateGlobalAqi(data: SensorData[]): void {
    if (data.length === 0) {
      this.globalAqiEl.textContent = '--';
      this.globalAqiEl.style.color = '#64d2ff';
      return;
    }

    const avgAqi = data.reduce((sum, d) => sum + d.aqi, 0) / data.length;
    const rounded = Math.round(avgAqi);
    this.globalAqiEl.textContent = String(rounded);
    this.globalAqiEl.style.color = aqiToHex(avgAqi);
  }

  public updateSelectedPoint(sensorId: string | null, gridX: number, gridY: number, sensorData?: SensorData): void {
    if (!sensorId) {
      this.selectedPointEl.textContent = '未选择';
      this.renderEmptyChart();
      return;
    }

    const label = `${sensorId} (${gridX},${gridY})`;
    if (sensorData) {
      const level = getAqiLevel(sensorData.aqi);
      this.selectedPointEl.textContent = `${label} · AQI ${sensorData.aqi.toFixed(1)} · ${level}`;
    } else {
      this.selectedPointEl.textContent = label;
    }
  }

  public updateHistoryChart(history: SensorData[]): void {
    this.updateChartSize();

    if (!history || history.length < 2) {
      this.renderEmptyChart();
      return;
    }

    const data = [...history];
    const innerWidth = this.chartWidth - this.chartMargin.left - this.chartMargin.right;
    const innerHeight = this.chartHeight - this.chartMargin.top - this.chartMargin.bottom;

    this.xScale.domain([0, data.length - 1]);

    const aqiValues = data.map((d) => d.aqi);
    const yMin = Math.max(0, Math.floor(Math.min(...aqiValues) / 20) * 20 - 20);
    const yMax = Math.min(500, Math.ceil(Math.max(...aqiValues) / 20) * 20 + 20);
    this.yScale.domain([yMin, yMax]);

    this.chartArea.selectAll('*').remove();

    const yTicks = this.yScale.ticks(5);
    yTicks.forEach((tick) => {
      this.chartArea.append('line')
        .attr('class', 'chart-grid')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', this.yScale(tick))
        .attr('y2', this.yScale(tick));
    });

    this.chartArea.append('path')
      .datum(data)
      .attr('fill', 'url(#area-gradient)')
      .attr('d', this.areaGenerator);

    this.chartArea.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', 'url(#line-gradient)')
      .attr('stroke-width', 2.5)
      .attr('stroke-linecap', 'round')
      .attr('stroke-linejoin', 'round')
      .attr('d', this.lineGenerator);

    this.chartArea.selectAll('.data-point')
      .data(data)
      .enter()
      .append('circle')
      .attr('class', 'data-point')
      .attr('cx', (d, i) => this.xScale(i))
      .attr('cy', (d) => this.yScale(d.aqi))
      .attr('r', 3.5)
      .attr('fill', (d) => aqiToHex(d.aqi))
      .attr('stroke', '#0a1628')
      .attr('stroke-width', 1.5);

    const yAxisCall = d3.axisLeft(this.yScale)
      .ticks(5)
      .tickFormat((d) => String(d));

    const xAxisCall = d3.axisBottom(this.xScale)
      .ticks(Math.min(5, data.length - 1))
      .tickFormat((d, i) => {
        const index = Number(d);
        if (index >= data.length) return '';
        const ageSeconds = Math.round((Date.now() - data[index].timestamp) / 1000);
        return ageSeconds <= 1 ? 'now' : `-${ageSeconds}s`;
      });

    this.yAxis.call(yAxisCall);
    this.xAxis.call(xAxisCall);
  }

  public setPaused(paused: boolean): void {
    this.isPaused = paused;
    this.btnPause.textContent = paused ? '继续' : '暂停';
    if (paused) {
      this.btnPause.classList.remove('btn-primary');
    } else {
      this.btnPause.classList.add('btn-primary');
    }
  }

  public updateTimeSliderRange(maxHistoryTime: number, minHistoryTime: number): void {
    if (!this.playbackModeCheckbox.checked) return;

    const now = Date.now();
    const windowStart = now - 60000;
    const currentValue = parseInt(this.timeSlider.value, 10);
    const targetTime = windowStart + (now - windowStart) * (currentValue / 100);
    const secondsAgo = Math.round((now - targetTime) / 1000);
    this.timeDisplay.textContent = secondsAgo <= 0 ? '实时' : `${secondsAgo}秒前`;
  }

  public handleResize(): void {
    this.updateChartSize();
  }

  public dispose(): void {
    this.btnPause.removeEventListener('click', () => {});
    this.btnTopView.removeEventListener('click', () => {});
    this.btnPerspective.removeEventListener('click', () => {});
    this.playbackModeCheckbox.removeEventListener('change', () => {});
    this.timeSlider.removeEventListener('input', () => {});
    this.mobileToggle.removeEventListener('click', () => {});
  }
}
