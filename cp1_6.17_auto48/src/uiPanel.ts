import * as THREE from 'three';
import { ZodiacManager } from './zodiacManager';
import constellationsData from './data/constellations';

export class UIPanel {
  private container: HTMLElement;
  private panel: HTMLElement | null = null;
  private dateOverlay: HTMLElement | null = null;
  private isVisible = false;
  private zodiacManager: ZodiacManager;
  private onCollect: ((id: string) => void) | null = null;

  constructor(container: HTMLElement, zodiacManager: ZodiacManager) {
    this.container = container;
    this.zodiacManager = zodiacManager;
  }

  setOnCollect(cb: (id: string) => void) {
    this.onCollect = cb;
  }

  show(constellationId: string) {
    this.hide();

    const data = this.zodiacManager.getConstellationData(constellationId);
    if (!data) return;

    this.panel = document.createElement('div');
    this.panel.className = 'info-panel';
    this.panel.innerHTML = `
      <div class="panel-header">
        <div class="panel-title-group">
          <h2 class="panel-title">${data.nameCN}</h2>
          <span class="panel-subtitle">${data.nameEN}</span>
        </div>
        <button class="panel-close" aria-label="关闭">&times;</button>
      </div>
      <div class="panel-body">
        <div class="panel-section">
          <h3 class="section-title">主星信息</h3>
          <div class="star-info">
            <div class="star-info-row">
              <span class="info-label">星名</span>
              <span class="info-value">${data.brightestStar.nameCN} (${data.brightestStar.nameEN})</span>
            </div>
            <div class="star-info-row">
              <span class="info-label">光谱类型</span>
              <span class="info-value">${data.brightestStar.spectralType}</span>
            </div>
            <div class="star-info-row">
              <span class="info-label">视星等</span>
              <span class="info-value">${data.brightestStar.magnitude}</span>
            </div>
          </div>
        </div>
        <div class="panel-section">
          <h3 class="section-title">星座线稿</h3>
          <canvas class="line-art-canvas" width="280" height="200"></canvas>
        </div>
        <div class="panel-section">
          <h3 class="section-title">神话传说</h3>
          <div class="mythology-text">
            <p class="myth-cn">${data.mythology.chinese}</p>
            <hr class="myth-divider">
            <p class="myth-en">${data.mythology.greek}</p>
          </div>
        </div>
        <div class="panel-actions">
          <button class="btn btn-collect" data-id="${data.id}">
            ${this.zodiacManager.isCollected(data.id) ? '✓ 已收集' : '收集星图碎片'}
          </button>
          <button class="btn btn-anim">播放今日视运动</button>
        </div>
      </div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .info-panel {
        position: absolute;
        top: 0;
        right: 0;
        width: 380px;
        height: 100%;
        background: rgba(20, 20, 40, 0.8);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        border-left: 1px solid rgba(255,255,255,0.1);
        color: #B0C4DE;
        font-family: 'Noto Sans SC', sans-serif;
        overflow-y: auto;
        padding: 24px;
        animation: panelSlideIn 0.4s ease-out;
        z-index: 100;
      }
      @keyframes panelSlideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      .panel-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 20px;
      }
      .panel-title {
        font-family: 'Noto Serif SC', 'Cinzel', serif;
        font-size: 28px;
        font-weight: 700;
        color: #FFFFFF;
        margin: 0;
        line-height: 1.3;
      }
      .panel-subtitle {
        font-size: 14px;
        color: #81D4FA;
        font-style: italic;
      }
      .panel-close {
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.2);
        color: #B0C4DE;
        font-size: 20px;
        width: 32px;
        height: 32px;
        border-radius: 8px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
      }
      .panel-close:hover {
        background: rgba(255,255,255,0.2);
        border-color: #81D4FA;
      }
      .panel-body { display: flex; flex-direction: column; gap: 20px; }
      .panel-section { }
      .section-title {
        font-family: 'Noto Serif SC', serif;
        font-size: 16px;
        font-weight: 700;
        color: #FFFFFF;
        margin: 0 0 12px 0;
        padding-bottom: 6px;
        border-bottom: 1px solid rgba(129, 212, 250, 0.3);
      }
      .star-info { display: flex; flex-direction: column; gap: 8px; }
      .star-info-row { display: flex; justify-content: space-between; align-items: center; }
      .info-label { color: #81D4FA; font-size: 13px; }
      .info-value { color: #E0E0E0; font-size: 14px; font-weight: 500; }
      .line-art-canvas {
        width: 100%;
        height: 180px;
        border-radius: 8px;
        background: rgba(10, 10, 30, 0.5);
        border: 1px solid rgba(255,255,255,0.1);
      }
      .mythology-text { line-height: 1.6; font-size: 14px; }
      .myth-cn { color: #B0C4DE; margin: 0 0 12px 0; }
      .myth-en { color: #8899AA; margin: 0; font-style: italic; }
      .myth-divider {
        border: none;
        border-top: 1px solid rgba(129,212,250,0.2);
        margin: 12px 0;
      }
      .panel-actions { display: flex; flex-direction: column; gap: 10px; }
      .btn {
        padding: 10px 16px;
        border-radius: 8px;
        border: 1px solid rgba(255,255,255,0.2);
        background: rgba(255,255,255,0.1);
        color: #B0C4DE;
        font-family: 'Noto Sans SC', sans-serif;
        font-size: 14px;
        cursor: pointer;
        transition: all 0.2s;
        text-align: center;
      }
      .btn:hover {
        background: rgba(255,255,255,0.2);
        border-color: #81D4FA;
        color: #FFFFFF;
      }
      .btn-collect.collected {
        background: rgba(255, 213, 79, 0.15);
        border-color: rgba(255, 213, 79, 0.4);
        color: #FFD54F;
      }
      .btn-anim { }
      @media (max-width: 768px) {
        .info-panel {
          width: 100%;
          height: 100%;
          border-left: none;
          border-top: 1px solid rgba(255,255,255,0.1);
        }
      }
    `;
    this.panel.prepend(style);

    this.drawLineArt(constellationId);

    const closeBtn = this.panel.querySelector('.panel-close');
    closeBtn?.addEventListener('click', () => this.hide());

    const collectBtn = this.panel.querySelector('.btn-collect');
    collectBtn?.addEventListener('click', () => {
      if (this.zodiacManager.isCollected(constellationId)) return;
      this.zodiacManager.collectConstellation(constellationId);
      if (this.onCollect) this.onCollect(constellationId);
      (collectBtn as HTMLElement).textContent = '✓ 已收集';
      (collectBtn as HTMLElement).classList.add('collected');
    });

    const animBtn = this.panel.querySelector('.btn-anim');
    animBtn?.addEventListener('click', () => {
      this.dispatchEvent('startApparentMotion');
    });

    this.container.appendChild(this.panel);
    this.isVisible = true;

    const panelEl = this.panel;
    setTimeout(() => {
      const onClickOutside = (e: MouseEvent) => {
        if (panelEl && !panelEl.contains(e.target as Node)) {
          this.hide();
          document.removeEventListener('click', onClickOutside);
        }
      };
      document.addEventListener('click', onClickOutside);
    }, 100);
  }

  private drawLineArt(constellationId: string) {
    const canvas = this.panel?.querySelector('.line-art-canvas') as HTMLCanvasElement;
    if (!canvas) return;

    const data = this.zodiacManager.getConstellationData(constellationId);
    if (!data) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    if (data.sketchPath) {
      ctx.save();
      const tokens = data.sketchPath.split(/\s+/);

      let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
      for (let i = 0; i < tokens.length; i++) {
        const cmd = tokens[i];
        if (cmd === 'M' || cmd === 'L') {
          const x = parseFloat(tokens[++i]);
          const y = parseFloat(tokens[++i]);
          minX = Math.min(minX, x); maxX = Math.max(maxX, x);
          minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        } else if (cmd === 'C') {
          for (let k = 0; k < 3; k++) {
            const x = parseFloat(tokens[++i]);
            const y = parseFloat(tokens[++i]);
            minX = Math.min(minX, x); maxX = Math.max(maxX, x);
            minY = Math.min(minY, y); maxY = Math.max(maxY, y);
          }
        }
      }

      const padding = 20;
      const rw = maxX - minX;
      const rh = maxY - minY;
      const scale = Math.min((w - padding * 2) / rw, (h - padding * 2) / rh);
      const tx = padding - minX * scale + (w - padding * 2 - rw * scale) / 2;
      const ty = padding - minY * scale + (h - padding * 2 - rh * scale) / 2;

      ctx.translate(tx, ty);
      ctx.scale(scale, scale);

      ctx.strokeStyle = '#81D4FA';
      ctx.lineWidth = 1.5 / scale;
      ctx.shadowColor = '#81D4FA';
      ctx.shadowBlur = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      for (let i = 0; i < tokens.length; i++) {
        const cmd = tokens[i];
        if (cmd === 'M') {
          const x = parseFloat(tokens[++i]);
          const y = parseFloat(tokens[++i]);
          ctx.moveTo(x, y);
        } else if (cmd === 'L') {
          const x = parseFloat(tokens[++i]);
          const y = parseFloat(tokens[++i]);
          ctx.lineTo(x, y);
        } else if (cmd === 'C') {
          const cp1x = parseFloat(tokens[++i]); const cp1y = parseFloat(tokens[++i]);
          const cp2x = parseFloat(tokens[++i]); const cp2y = parseFloat(tokens[++i]);
          const x = parseFloat(tokens[++i]); const y = parseFloat(tokens[++i]);
          ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x, y);
        }
      }
      ctx.stroke();
      ctx.restore();

      ctx.save();
      for (let i = 0; i < 30; i++) {
        const px = 20 + Math.random() * (w - 40);
        const py = 20 + Math.random() * (h - 40);
        const r = 0.8 + Math.random() * 1.5;
        ctx.fillStyle = 'rgba(255, 224, 130,' + (0.3 + Math.random() * 0.4) + ')';
        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  showDateOverlay(dateStr: string, constellationName: string) {
    this.hideDateOverlay();
    this.dateOverlay = document.createElement('div');
    this.dateOverlay.className = 'date-overlay';
    this.dateOverlay.innerHTML = `
      <div class="date-text">${dateStr}</div>
      <div class="constellation-text">☀ ${constellationName}</div>
    `;

    const style = document.createElement('style');
    style.textContent = `
      .date-overlay {
        position: absolute;
        top: 20px;
        right: 20px;
        background: rgba(20,20,40,0.8);
        backdrop-filter: blur(8px);
        border: 1px solid rgba(255,255,255,0.15);
        border-radius: 12px;
        padding: 12px 20px;
        z-index: 200;
        animation: fadeIn 0.3s ease-out;
      }
      .date-text {
        color: #FFD54F;
        font-size: 16px;
        font-weight: 600;
        font-family: 'Noto Sans SC', sans-serif;
      }
      .constellation-text {
        color: #81D4FA;
        font-size: 14px;
        margin-top: 4px;
        font-family: 'Noto Sans SC', sans-serif;
      }
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
    `;
    this.dateOverlay.prepend(style);
    this.container.appendChild(this.dateOverlay);
  }

  hideDateOverlay() {
    if (this.dateOverlay) {
      this.dateOverlay.remove();
      this.dateOverlay = null;
    }
  }

  hide() {
    if (this.panel) {
      this.panel.style.animation = 'panelSlideOut 0.3s ease-in forwards';
      const styleEl = document.createElement('style');
      styleEl.textContent = `
        @keyframes panelSlideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `;
      this.panel.appendChild(styleEl);
      setTimeout(() => {
        this.panel?.remove();
        this.panel = null;
      }, 300);
    }
    this.isVisible = false;
  }

  private eventListeners: Map<string, Function[]> = new Map();

  on(event: string, cb: Function) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(cb);
  }

  private dispatchEvent(event: string, data?: any) {
    const listeners = this.eventListeners.get(event) || [];
    for (const cb of listeners) {
      cb(data);
    }
  }
}
