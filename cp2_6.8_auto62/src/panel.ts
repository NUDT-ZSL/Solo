import { Intersection, Direction, Vehicle, COLORS } from './traffic';

export interface Stats {
  totalVehicles: number;
  avgWaitTime: number;
  maxQueue: number;
  totalPassed: number;
}

export interface HistoryPoint {
  vehicles: number;
  avgWait: number;
  maxQueue: number;
  passed: number;
}

const DIR_LABEL: { [key in Direction]: string } = {
  north: '北',
  south: '南',
  east: '东',
  west: '西'
};

const LIGHT_LABEL: { [key: string]: string } = {
  red: '红灯',
  yellow: '黄灯',
  green: '绿灯'
};

const PHASE_LABEL = {
  northSouth: '南北方向',
  eastWest: '东西方向'
};

export class UIPanel {
  private statVehicles: HTMLElement;
  private statWait: HTMLElement;
  private statQueue: HTMLElement;
  private statPassed: HTMLElement;
  private chartCanvas: HTMLCanvasElement;
  private chartCtx: CanvasRenderingContext2D;
  private strategySelect: HTMLSelectElement;
  private modalOverlay: HTMLElement;
  private modalTitle: HTMLElement;
  private modalContent: HTMLElement;
  private modalClose: HTMLElement;
  private strategyHint: HTMLElement;
  public onStrategyChange: ((strategy: string) => void) | null = null;
  public onModalClose: (() => void) | null = null;
  private fadeTimer: number | null = null;

  constructor() {
    this.statVehicles = document.getElementById('stat-vehicles')!;
    this.statWait = document.getElementById('stat-wait')!;
    this.statQueue = document.getElementById('stat-queue')!;
    this.statPassed = document.getElementById('stat-passed')!;
    this.chartCanvas = document.getElementById('chart-canvas') as HTMLCanvasElement;
    this.chartCtx = this.chartCanvas.getContext('2d')!;
    this.strategySelect = document.getElementById('strategy-select') as HTMLSelectElement;
    this.modalOverlay = document.getElementById('modal-overlay')!;
    this.modalTitle = document.getElementById('modal-title')!.querySelector('span')!;
    this.modalContent = document.getElementById('modal-content')!;
    this.modalClose = document.getElementById('modal-close')!;
    this.strategyHint = document.getElementById('strategy-hint')!;

    this.strategySelect.addEventListener('change', (e) => {
      const val = (e.target as HTMLSelectElement).value;
      if (this.onStrategyChange) {
        this.triggerFade();
        this.onStrategyChange(val);
      }
    });

    this.modalClose.addEventListener('click', () => this.closeModal());
    this.modalOverlay.addEventListener('click', (e) => {
      if (e.target === this.modalOverlay) this.closeModal();
    });

    this.resizeChart();
    window.addEventListener('resize', () => this.resizeChart());
  }

  private triggerFade() {
    this.strategyHint.style.opacity = '0.3';
    if (this.fadeTimer) window.clearTimeout(this.fadeTimer);
    this.fadeTimer = window.setTimeout(() => {
      this.strategyHint.style.opacity = '1';
    }, 500);
  }

  private resizeChart() {
    const rect = this.chartCanvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.chartCanvas.width = Math.floor(rect.width * dpr);
    this.chartCanvas.height = Math.floor(rect.height * dpr);
    this.chartCtx.scale(dpr, dpr);
  }

  public updateStats(stats: Stats) {
    this.statVehicles.textContent = String(stats.totalVehicles);
    this.statWait.textContent = stats.avgWaitTime.toFixed(1);
    this.statQueue.textContent = String(stats.maxQueue);
    this.statPassed.textContent = String(stats.totalPassed);
  }

  public drawChart(history: HistoryPoint[]) {
    const ctx = this.chartCtx;
    const rect = this.chartCanvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#121225';
    ctx.fillRect(0, 0, w, h);

    if (history.length < 2) return;

    const padding = { top: 8, right: 8, bottom: 16, left: 28 };
    const chartW = w - padding.left - padding.right;
    const chartH = h - padding.top - padding.bottom;

    let maxV = 1;
    for (const p of history) {
      maxV = Math.max(maxV, p.vehicles, p.maxQueue, Math.ceil(p.avgWait));
    }
    maxV = Math.ceil(maxV * 1.1);

    ctx.strokeStyle = '#252545';
    ctx.lineWidth = 1;
    ctx.fillStyle = '#555577';
    ctx.font = '9px sans-serif';
    for (let i = 0; i <= 4; i++) {
      const y = padding.top + (chartH * i) / 4;
      ctx.beginPath();
      ctx.moveTo(padding.left, y);
      ctx.lineTo(padding.left + chartW, y);
      ctx.stroke();
      const val = Math.round(maxV - (maxV * i) / 4);
      ctx.fillText(String(val), 2, y + 3);
    }

    const lines: { color: string; key: keyof HistoryPoint }[] = [
      { color: '#4A90D9', key: 'vehicles' },
      { color: '#D94A4A', key: 'maxQueue' },
      { color: '#D9C74A', key: 'avgWait' }
    ];

    const n = history.length;
    const stepX = n > 1 ? chartW / (n - 1) : 0;

    for (const line of lines) {
      ctx.strokeStyle = line.color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const val = (history[i] as any)[line.key] as number;
        const x = padding.left + i * stepX;
        const y = padding.top + chartH - (val / maxV) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    ctx.fillStyle = '#555577';
    ctx.font = '9px sans-serif';
    const labels = [
      { color: '#4A90D9', text: '车辆' },
      { color: '#D94A4A', text: '排队' },
      { color: '#D9C74A', text: '等待' }
    ];
    let lx = padding.left;
    for (const l of labels) {
      ctx.fillStyle = l.color;
      ctx.fillRect(lx, h - 10, 8, 4);
      ctx.fillStyle = '#777799';
      ctx.fillText(l.text, lx + 10, h - 4);
      lx += 48;
    }
  }

  public showModal(intersection: Intersection) {
    this.modalTitle.textContent = `路口 (${intersection.gridX}, ${intersection.gridY})${intersection.isMainRoad ? ' — 主干道' : ''}`;

    let html = '<div class="modal-section">';
    html += '<div class="modal-section-title">信号灯状态</div>';
    const lightClass =
      intersection.signal.currentLight === 'red' ? 'red' :
      intersection.signal.currentLight === 'yellow' ? 'yellow' : 'green';
    html += `<div class="modal-row"><span class="label">当前相位</span><span class="value">${PHASE_LABEL[intersection.signal.currentPhase]}</span></div>`;
    html += `<div class="modal-row"><span class="label">当前灯色</span><span class="value ${lightClass}">${LIGHT_LABEL[intersection.signal.currentLight]}</span></div>`;
    html += `<div class="modal-row"><span class="label">剩余时间</span><span class="value">${Math.max(0, intersection.signal.remainingTime).toFixed(1)} 秒</span></div>`;
    html += `<div class="modal-row"><span class="label">绿灯时长</span><span class="value">${intersection.signal.greenDuration.toFixed(0)} 秒</span></div>`;
    html += '</div>';

    html += '<div class="modal-section">';
    html += '<div class="modal-section-title">各方向排队长度</div>';
    const dirs: Direction[] = ['north', 'south', 'east', 'west'];
    for (const d of dirs) {
      let total = 0;
      for (const lane of intersection.lanes[d]) total += lane.queueLength;
      const cls = total >= 5 ? 'red' : total >= 2 ? 'yellow' : 'green';
      html += `<div class="modal-row"><span class="label">${DIR_LABEL[d]}向</span><span class="value ${cls}">${total} 辆</span></div>`;
    }
    html += '</div>';

    html += '<div class="modal-section">';
    html += '<div class="modal-section-title">最近30秒车流量</div>';
    const last30 = intersection.trafficHistory.slice(-30);
    const totalFlow = last30.reduce((s, v) => s + v, 0);
    const avgFlow = last30.length > 0 ? totalFlow / last30.length : 0;
    const peakFlow = last30.length > 0 ? Math.max(...last30) : 0;
    html += `<div class="modal-row"><span class="label">总通过</span><span class="value green">${totalFlow} 辆</span></div>`;
    html += `<div class="modal-row"><span class="label">平均每秒</span><span class="value">${avgFlow.toFixed(1)} 辆</span></div>`;
    html += `<div class="modal-row"><span class="label">峰值每秒</span><span class="value red">${peakFlow} 辆</span></div>`;
    html += '</div>';

    this.modalContent.innerHTML = html;
    this.modalOverlay.classList.add('visible');
  }

  public closeModal() {
    this.modalOverlay.classList.remove('visible');
    if (this.onModalClose) this.onModalClose();
  }

  public setStrategy(value: string) {
    this.strategySelect.value = value;
  }
}

export function computeStats(vehicles: Vehicle[], intersections: Intersection[], totalPassed: number): Stats {
  let totalWait = 0;
  let maxQ = 0;
  for (const v of vehicles) {
    totalWait += v.waitTime / 60;
  }
  for (const it of intersections) {
    for (const d of ['north', 'south', 'east', 'west'] as Direction[]) {
      for (const lane of it.lanes[d]) {
        if (lane.queueLength > maxQ) maxQ = lane.queueLength;
      }
    }
  }
  return {
    totalVehicles: vehicles.length,
    avgWaitTime: vehicles.length > 0 ? totalWait / vehicles.length : 0,
    maxQueue: maxQ,
    totalPassed
  };
}
