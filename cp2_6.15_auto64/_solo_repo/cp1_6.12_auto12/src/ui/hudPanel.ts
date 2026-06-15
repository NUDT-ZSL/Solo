/**
 * ============================================================
 *  src/ui/hudPanel.ts — 左上 HUD + 右侧设备信息卡
 * ============================================================
 *
 *  【职责】
 *    1. HUD 面板：显示 FPS、设备总数、服务器连接状态（毛玻璃）
 *    2. 信息卡片：双击设备后滑入，显示设备名 / 状态徽章 / 3 个 Canvas 圆弧仪表盘
 *
 *  【上游调用】
 *    — main.ts:  new HudPanel(container)
 *               .setFPS() / .setTotalDevices() / .setServerStatus()
 *               .showInfo(device) / .updateDeviceData(device) / .hideInfo()
 *
 *  【下游依赖】
 *    — core/dataManager.ts: Device / STATUS_LABELS / STATUS_COLORS_STR
 *
 *  【数据流向】
 *    main.ts ──FPS / 总数──► setFPS / setTotalDevices ──► DOM 更新
 *    deviceRenderer.onDeviceClick ──► main.ts ──► showInfo(device) ──► 卡片滑入
 *    dataManager.data$ ──► main.ts ──► updateDeviceData(device) ──► targetValue 动画
 * ============================================================
 */

import { Subject, Subscription } from 'rxjs';
import {
  Device,
  STATUS_COLORS_STR,
  STATUS_LABELS
} from '../core/dataManager';

interface Gauge {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  value: number;
  targetValue: number;
  min: number;
  max: number;
  unit: string;
  label: string;
  colorStart: string;
  colorEnd: string;
  dpr: number;
  cssW: number;
  cssH: number;
}

export class HudPanel {
  private container: HTMLElement;
  private hudLeft: HTMLDivElement;
  private infoCard: HTMLDivElement;
  private fpsValue: HTMLSpanElement;
  private totalDevices: HTMLSpanElement;
  private serverStatus: HTMLSpanElement;
  private infoVisible = false;
  private gauges: Map<string, Gauge> = new Map();
  private subscriptions = new Subscription();
  private selectedDevice: Device | null = null;
  private deviceInfoName: HTMLDivElement;
  private deviceInfoId: HTMLDivElement;
  private deviceInfoStatus: HTMLDivElement;
  private infoCloseBtn: HTMLButtonElement;

  public readonly onCloseInfo = new Subject<void>();

  constructor(parent: HTMLElement) {
    this.container = parent;
    this.injectStyles();

    this.hudLeft = this.createHudLeft();
    this.container.appendChild(this.hudLeft);

    this.fpsValue = this.hudLeft.querySelector('#hud-fps-value') as HTMLSpanElement;
    this.totalDevices = this.hudLeft.querySelector('#hud-total-value') as HTMLSpanElement;
    this.serverStatus = this.hudLeft.querySelector('#hud-server-status') as HTMLSpanElement;

    this.infoCard = this.createInfoCard();
    this.container.appendChild(this.infoCard);

    this.deviceInfoName = this.infoCard.querySelector('#info-name') as HTMLDivElement;
    this.deviceInfoId = this.infoCard.querySelector('#info-id') as HTMLDivElement;
    this.deviceInfoStatus = this.infoCard.querySelector('#info-status-badge') as HTMLDivElement;
    this.infoCloseBtn = this.infoCard.querySelector('#info-close-btn') as HTMLButtonElement;

    this.setupGauges();
    this.bindCloseButton();
    this.startGaugeAnimation();
    window.addEventListener('resize', () => this.handleResize());
  }

  private handleResize() {
    this.gauges.forEach(g => {
      this.applyCanvasDPR(g);
      this.drawGauge(g);
    });
  }

  private injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .hud-left {
        position: absolute;
        top: 16px;
        left: 16px;
        z-index: 100;
        display: grid;
        grid-template-columns: auto auto;
        gap: 12px 24px;
        padding: 14px 20px;
        background: rgba(30, 41, 59, 0.7);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border: 1px solid rgba(100, 150, 255, 0.2);
        border-radius: 12px;
        box-shadow: 0 4px 24px rgba(0, 0, 0, 0.35);
        min-width: 220px;
        pointer-events: none;
      }
      .hud-label {
        font-size: 12px;
        color: #94a3b8;
        letter-spacing: 0.5px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      .hud-value {
        font-size: 15px;
        font-weight: 600;
        color: #e2e8f0;
        font-family: 'SF Mono', 'Consolas', monospace;
        justify-self: end;
      }
      .hud-value.fps { color: #00ff88; }
      .hud-value.total { color: #60a5fa; }
      .status-dot {
        display: inline-block;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        margin-right: 6px;
      }
      .status-dot.connected { background: #00ff88; box-shadow: 0 0 8px #00ff88; }
      .status-dot.disconnected { background: #ff3344; box-shadow: 0 0 8px #ff3344; }

      .info-card {
        position: absolute;
        top: 16px;
        right: 16px;
        z-index: 100;
        width: 340px;
        padding: 20px;
        background: rgba(30, 41, 59, 0.75);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(100, 150, 255, 0.25);
        border-radius: 14px;
        box-shadow: 0 8px 40px rgba(0, 0, 0, 0.5);
        transform: translateX(calc(100% + 40px));
        opacity: 0;
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.1s ease-out;
        pointer-events: auto;
      }
      .info-card.visible {
        transform: translateX(0);
        opacity: 1;
      }
      .info-card-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 16px;
      }
      .info-name {
        font-size: 20px;
        font-weight: 700;
        color: #f1f5f9;
        margin-bottom: 4px;
      }
      .info-id {
        font-size: 13px;
        color: #94a3b8;
        font-family: 'SF Mono', 'Consolas', monospace;
      }
      .info-close-btn {
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.15);
        color: #cbd5e1;
        width: 28px;
        height: 28px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 16px;
        line-height: 1;
        transition: all 0.2s;
      }
      .info-close-btn:hover {
        background: rgba(255, 51, 68, 0.2);
        border-color: rgba(255, 51, 68, 0.4);
        color: #ff3344;
      }
      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 5px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 600;
        margin-top: 10px;
      }
      .status-badge::before {
        content: '';
        width: 8px;
        height: 8px;
        border-radius: 50%;
      }
      .status-badge.normal {
        background: rgba(0, 255, 136, 0.12);
        color: #00ff88;
        border: 1px solid rgba(0, 255, 136, 0.3);
      }
      .status-badge.normal::before { background: #00ff88; box-shadow: 0 0 8px #00ff88; }
      .status-badge.alert {
        background: rgba(255, 136, 0, 0.12);
        color: #ff8800;
        border: 1px solid rgba(255, 136, 0, 0.3);
      }
      .status-badge.alert::before { background: #ff8800; box-shadow: 0 0 8px #ff8800; }
      .status-badge.offline {
        background: rgba(255, 51, 68, 0.12);
        color: #ff3344;
        border: 1px solid rgba(255, 51, 68, 0.3);
      }
      .status-badge.offline::before { background: #ff3344; box-shadow: 0 0 8px #ff3344; }

      .gauges-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 10px;
        margin-top: 16px;
      }
      .gauge-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
      }
      .gauge-canvas {
        display: block;
        width: 90px;
        height: 60px;
      }
      .gauge-label {
        font-size: 11px;
        color: #94a3b8;
        letter-spacing: 0.3px;
      }
      .gauge-value-text {
        font-size: 13px;
        font-weight: 700;
        color: #e2e8f0;
        font-family: 'SF Mono', 'Consolas', monospace;
        margin-top: -2px;
      }

      /* ===== 分辨率断点：1366 x 768 ===== */
      @media (max-width: 1440px) {
        .hud-left {
          padding: 10px 14px;
          min-width: 200px;
          gap: 10px 18px;
        }
        .hud-label { font-size: 11px; }
        .hud-value { font-size: 13px; }

        .info-card {
          width: 300px;
          padding: 16px;
          top: 12px;
          right: 12px;
        }
        .info-name { font-size: 18px; }
        .gauge-canvas { width: 80px; height: 54px; }
        .gauge-value-text { font-size: 12px; }
      }

      /* ===== 分辨率断点：1366 x 768 专用 ===== */
      @media (max-width: 1366px) {
        .hud-left {
          padding: 8px 12px;
          min-width: 180px;
          gap: 8px 14px;
          border-radius: 10px;
        }
        .hud-label { font-size: 10px; }
        .hud-value { font-size: 12px; }

        .info-card {
          width: 260px;
          padding: 14px;
        }
        .info-name { font-size: 16px; }
        .info-id { font-size: 11px; }
        .gauges-grid { gap: 6px; margin-top: 12px; }
        .gauge-canvas { width: 70px; height: 48px; }
        .gauge-value-text { font-size: 11px; }
        .gauge-label { font-size: 10px; }
        .status-badge { font-size: 11px; padding: 4px 10px; }
      }

      /* ===== 分辨率断点：<768px 移动端 ===== */
      @media (max-width: 768px) {
        .hud-left {
          padding: 8px 12px;
          min-width: auto;
          top: 8px;
          left: 8px;
          gap: 6px 12px;
        }
        .info-card {
          width: calc(100% - 32px);
          right: 16px;
          left: 16px;
          top: auto;
          bottom: 16px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  private createHudLeft(): HTMLDivElement {
    const hud = document.createElement('div');
    hud.className = 'hud-left';
    hud.innerHTML = `
      <span class="hud-label">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
        FPS
      </span>
      <span class="hud-value fps" id="hud-fps-value">--</span>

      <span class="hud-label">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3V7M8 3V7M3 11h18"/></svg>
        设备总数
      </span>
      <span class="hud-value total" id="hud-total-value">0</span>

      <span class="hud-label" style="grid-column: 1 / -1;">
        <span class="status-dot disconnected" id="hud-server-dot"></span>
        <span id="hud-server-status">未连接服务器</span>
      </span>
    `;
    return hud;
  }

  private createInfoCard(): HTMLDivElement {
    const card = document.createElement('div');
    card.className = 'info-card';
    card.innerHTML = `
      <div class="info-card-header">
        <div>
          <div class="info-name" id="info-name">--</div>
          <div class="info-id" id="info-id">--</div>
          <div id="info-status-badge" class="status-badge normal">运行正常</div>
        </div>
        <button class="info-close-btn" id="info-close-btn" title="关闭">×</button>
      </div>
      <div class="gauges-grid" id="gauges-grid">
        <div class="gauge-item">
          <canvas class="gauge-canvas" data-gauge="temperature"></canvas>
          <span class="gauge-value-text" id="gauge-temp-value">--°C</span>
          <span class="gauge-label">温度</span>
        </div>
        <div class="gauge-item">
          <canvas class="gauge-canvas" data-gauge="rpm"></canvas>
          <span class="gauge-value-text" id="gauge-rpm-value">--</span>
          <span class="gauge-label">转速 RPM</span>
        </div>
        <div class="gauge-item">
          <canvas class="gauge-canvas" data-gauge="load"></canvas>
          <span class="gauge-value-text" id="gauge-load-value">--%</span>
          <span class="gauge-label">负载率</span>
        </div>
      </div>
    `;
    return card;
  }

  private setupGauges() {
    const canvasTemp = this.infoCard.querySelector('canvas[data-gauge="temperature"]') as HTMLCanvasElement;
    const canvasRpm = this.infoCard.querySelector('canvas[data-gauge="rpm"]') as HTMLCanvasElement;
    const canvasLoad = this.infoCard.querySelector('canvas[data-gauge="load"]') as HTMLCanvasElement;

    const makeGauge = (
      c: HTMLCanvasElement,
      min: number, max: number, unit: string, label: string,
      colorStart: string, colorEnd: string
    ): Gauge => {
      const g: Gauge = {
        canvas: c,
        ctx: c.getContext('2d')!,
        value: 0, targetValue: 0,
        min, max, unit, label,
        colorStart, colorEnd,
        dpr: window.devicePixelRatio || 1,
        cssW: 90, cssH: 60
      };
      this.applyCanvasDPR(g);
      return g;
    };

    this.gauges.set('temperature', makeGauge(canvasTemp, 0, 120, '°C', '温度', '#00ff88', '#ff3344'));
    this.gauges.set('rpm', makeGauge(canvasRpm, 0, 4000, '', 'RPM', '#60a5fa', '#a78bfa'));
    this.gauges.set('load', makeGauge(canvasLoad, 0, 100, '%', '负载', '#00ff88', '#ff8800'));
  }

  private applyCanvasDPR(g: Gauge) {
    const rect = g.canvas.getBoundingClientRect();
    g.cssW = rect.width || g.canvas.clientWidth || 90;
    g.cssH = rect.height || g.canvas.clientHeight || 60;
    g.dpr = Math.max(1, Math.min(3, window.devicePixelRatio || 1));
    g.canvas.width = Math.round(g.cssW * g.dpr);
    g.canvas.height = Math.round(g.cssH * g.dpr);
    g.ctx.setTransform(g.dpr, 0, 0, g.dpr, 0, 0);
  }

  private bindCloseButton() {
    this.infoCloseBtn.addEventListener('click', () => {
      this.hideInfo();
      this.onCloseInfo.next();
    });
  }

  public setFPS(fps: number) {
    if (!this.fpsValue) return;
    this.fpsValue.textContent = String(Math.round(fps));
    if (fps >= 50) {
      this.fpsValue.style.color = '#00ff88';
    } else if (fps >= 30) {
      this.fpsValue.style.color = '#ff8800';
    } else {
      this.fpsValue.style.color = '#ff3344';
    }
  }

  public setTotalDevices(n: number) {
    if (this.totalDevices) {
      this.totalDevices.textContent = String(n);
    }
  }

  public setServerStatus(connected: boolean) {
    if (!this.serverStatus) return;
    const dot = this.hudLeft.querySelector('#hud-server-dot') as HTMLSpanElement;
    if (connected) {
      dot.className = 'status-dot connected';
      this.serverStatus.textContent = '服务器已连接';
      this.serverStatus.style.color = '#00ff88';
    } else {
      dot.className = 'status-dot disconnected';
      this.serverStatus.textContent = '本地模拟数据';
      this.serverStatus.style.color = '#ff8800';
    }
  }

  public showInfo(device: Device) {
    this.selectedDevice = device;
    this.deviceInfoName.textContent = device.name;
    this.deviceInfoId.textContent = `ID: ${device.id}`;
    this.deviceInfoStatus.className = `status-badge ${device.status}`;
    this.deviceInfoStatus.textContent = STATUS_LABELS[device.status];

    const temp = this.gauges.get('temperature')!;
    const rpm = this.gauges.get('rpm')!;
    const load = this.gauges.get('load')!;
    temp.targetValue = device.metrics.temperature;
    rpm.targetValue = device.metrics.rpm;
    load.targetValue = device.metrics.load;

    this.gauges.forEach(g => this.applyCanvasDPR(g));

    this.infoCard.classList.add('visible');
    this.infoVisible = true;
  }

  public updateDeviceData(device: Device) {
    if (this.selectedDevice?.id !== device.id) return;
    this.deviceInfoStatus.className = `status-badge ${device.status}`;
    this.deviceInfoStatus.textContent = STATUS_LABELS[device.status];

    const temp = this.gauges.get('temperature')!;
    const rpm = this.gauges.get('rpm')!;
    const load = this.gauges.get('load')!;
    temp.targetValue = device.metrics.temperature;
    rpm.targetValue = device.metrics.rpm;
    load.targetValue = device.metrics.load;
  }

  public hideInfo() {
    this.infoCard.classList.remove('visible');
    this.infoVisible = false;
    this.selectedDevice = null;
  }

  private startGaugeAnimation() {
    const animate = () => {
      this.gauges.forEach((g) => {
        g.value += (g.targetValue - g.value) * 0.12;
        this.drawGauge(g);
      });

      const tempValEl = this.infoCard.querySelector('#gauge-temp-value');
      const rpmValEl = this.infoCard.querySelector('#gauge-rpm-value');
      const loadValEl = this.infoCard.querySelector('#gauge-load-value');
      if (tempValEl) tempValEl.textContent = `${this.gauges.get('temperature')!.value.toFixed(1)}°C`;
      if (rpmValEl) rpmValEl.textContent = `${Math.round(this.gauges.get('rpm')!.value)}`;
      if (loadValEl) loadValEl.textContent = `${this.gauges.get('load')!.value.toFixed(1)}%`;

      requestAnimationFrame(animate);
    };
    requestAnimationFrame(animate);
  }

  /**
   * Canvas 圆弧仪表盘：底色圆弧 + 渐变色数值圆弧 + 指针
   * 全程基于 DPR 缩放后的 CSS 像素绘制，保证在 Retina/HiDPI 屏清晰。
   */
  private drawGauge(g: Gauge) {
    const { ctx } = g;
    const w = g.cssW, h = g.cssH;
    const cx = w / 2, cy = h - 8;
    const r = Math.min(cx, cy) - 4;

    ctx.clearRect(0, 0, w, h);

    const startAngle = Math.PI + 0.35;
    const endAngle = 2 * Math.PI - 0.35;
    const t = Math.max(0, Math.min(1, (g.value - g.min) / (g.max - g.min)));
    const valueAngle = startAngle + (endAngle - startAngle) * t;

    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.lineWidth = 5;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineCap = 'round';
    ctx.stroke();

    const gradient = ctx.createLinearGradient(cx - r, cy, cx + r, cy);
    gradient.addColorStop(0, g.colorStart);
    gradient.addColorStop(1, g.colorEnd);

    ctx.beginPath();
    ctx.arc(cx, cy, r, startAngle, valueAngle);
    ctx.lineWidth = 5;
    ctx.strokeStyle = gradient;
    ctx.lineCap = 'round';
    ctx.stroke();

    const needleAngle = valueAngle;
    const nx = cx + Math.cos(needleAngle) * (r - 5);
    const ny = cy + Math.sin(needleAngle) * (r - 5);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(nx, ny);
    ctx.lineWidth = 1.8;
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineCap = 'round';
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = '#e2e8f0';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(cx, cy, 1.6, 0, Math.PI * 2);
    ctx.fillStyle = '#0f172a';
    ctx.fill();
  }

  public dispose() {
    this.subscriptions.unsubscribe();
  }
}
