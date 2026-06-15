import { StarCluster, StarClusterData } from './StarCluster';
import { Connection, ConnectionData } from './Connection';

interface SaveData {
  version: string;
  timestamp: number;
  clusters: StarClusterData[];
  connections: ConnectionData[];
}

interface MouseState {
  x: number;
  y: number;
  isDown: boolean;
  dragStartCluster: StarCluster | null;
}

type AppState = 'idle' | 'dissipating' | 'fadingIn';

export class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private toolbar: HTMLElement;
  private fileInput: HTMLInputElement;
  private infoBox: HTMLElement;

  private clusters: StarCluster[] = [];
  private connections: Connection[] = [];

  private mouse: MouseState = {
    x: 0,
    y: 0,
    isDown: false,
    dragStartCluster: null
  };

  private hoveredCluster: StarCluster | null = null;
  private animationId: number = 0;
  private lastTime: number = 0;
  private appState: AppState = 'idle';
  private fadeInProgress: number = 0;
  private backgroundStars: Array<{ x: number; y: number; r: number; a: number; s: number }> = [];

  private static readonly MAX_CLUSTERS = 30;
  private static readonly MAX_CONNECTIONS = 50;
  private static readonly FADE_IN_DURATION = 1000;
  private static readonly DISSIPATE_DURATION = 2000;

  constructor(canvas: HTMLCanvasElement, toolbar: HTMLElement, fileInput: HTMLInputElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.toolbar = toolbar;
    this.fileInput = fileInput;

    this.infoBox = document.createElement('div');
    this.infoBox.id = 'infoBox';
    this.infoBox.innerHTML = `<div class="letter"></div><div class="time"></div>`;
    document.body.appendChild(this.infoBox);

    this.resizeCanvas();
    this.initBackgroundStars();
    this.createUI();
    this.bindEvents();
  }

  private initBackgroundStars(): void {
    this.backgroundStars = [];
    const count = 200;
    for (let i = 0; i < count; i++) {
      this.backgroundStars.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        r: Math.random() * 1.2 + 0.3,
        a: Math.random() * 0.6 + 0.2,
        s: Math.random() * 0.02 + 0.005
      });
    }
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.initBackgroundStars();
  }

  private createUI(): void {
    const cornerBtns = document.createElement('div');
    cornerBtns.className = 'corner-btns';
    cornerBtns.innerHTML = `
      <button class="corner-btn" id="fullscreenBtn" title="全屏">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
        </svg>
      </button>
      <button class="corner-btn" id="resetBtn" title="重置">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="1 4 1 10 7 10"/>
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
        </svg>
      </button>
    `;
    document.body.appendChild(cornerBtns);

    const saveLoadArea = document.createElement('div');
    saveLoadArea.className = 'save-load-area';
    saveLoadArea.innerHTML = `
      <button class="save-load-btn" id="saveBtn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
          <polyline points="17 21 17 13 7 13 7 21"/>
          <polyline points="7 3 7 8 15 8"/>
        </svg>
        保存星图
      </button>
      <button class="save-load-btn" id="loadBtn">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        加载星图
      </button>
    `;
    document.body.appendChild(saveLoadArea);

    const hint = document.createElement('div');
    hint.className = 'hint';
    hint.textContent = '按 A-Z 生成星座种子 · 拖拽星团连线 · 悬停查看信息';
    document.body.appendChild(hint);

    document.getElementById('fullscreenBtn')!.addEventListener('click', () => this.toggleFullscreen());
    document.getElementById('resetBtn')!.addEventListener('click', () => this.showResetConfirm());
    document.getElementById('saveBtn')!.addEventListener('click', () => this.saveStarMap());
    document.getElementById('loadBtn')!.addEventListener('click', () => this.fileInput.click());

    this.toolbar.innerHTML = `
      <button class="tool-btn" id="tbSave" title="保存">
        <span class="btn-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
            <polyline points="17 21 17 13 7 13 7 21"/>
            <polyline points="7 3 7 8 15 8"/>
          </svg>
        </span>
        <span class="btn-label">保存星图</span>
      </button>
      <button class="tool-btn" id="tbLoad" title="加载">
        <span class="btn-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </span>
        <span class="btn-label">加载星图</span>
      </button>
      <button class="tool-btn" id="tbReset" title="重置">
        <span class="btn-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="1 4 1 10 7 10"/>
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>
          </svg>
        </span>
        <span class="btn-label">重置画布</span>
      </button>
    `;

    document.getElementById('tbSave')!.addEventListener('click', () => this.saveStarMap());
    document.getElementById('tbLoad')!.addEventListener('click', () => this.fileInput.click());
    document.getElementById('tbReset')!.addEventListener('click', () => this.showResetConfirm());
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resizeCanvas());

    window.addEventListener('keydown', (e) => {
      if (this.appState === 'dissipating') return;
      const key = e.key.toUpperCase();
      if (/^[A-Z]$/.test(key)) {
        this.createCluster(key);
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.handleHover();
      this.updateInfoBox();
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (this.appState === 'dissipating') return;
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;
      this.mouse.isDown = true;

      const cluster = this.findClusterAt(this.mouse.x, this.mouse.y);
      if (cluster) {
        this.mouse.dragStartCluster = cluster;
      }
    });

    this.canvas.addEventListener('mouseup', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouse.x = e.clientX - rect.left;
      this.mouse.y = e.clientY - rect.top;

      if (this.mouse.dragStartCluster && this.mouse.isDown) {
        const targetCluster = this.findClusterAt(this.mouse.x, this.mouse.y);
        if (targetCluster && targetCluster.id !== this.mouse.dragStartCluster.id) {
          this.createConnection(this.mouse.dragStartCluster, targetCluster);
        }
      }

      this.mouse.isDown = false;
      this.mouse.dragStartCluster = null;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouse.isDown = false;
      this.mouse.dragStartCluster = null;
      this.hoveredCluster = null;
      this.hideInfoBox();
    });

    this.fileInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.loadStarMap(file);
      }
      this.fileInput.value = '';
    });

    document.addEventListener('fullscreenchange', () => {
      setTimeout(() => this.resizeCanvas(), 100);
    });
  }

  private createCluster(letter: string): void {
    if (this.clusters.length >= App.MAX_CLUSTERS) return;

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight / 2;
    const offsetX = (Math.random() - 0.5) * 100;
    const offsetY = (Math.random() - 0.5) * 100;

    const cluster = new StarCluster(
      centerX + offsetX,
      centerY + offsetY,
      letter
    );

    this.clusters.push(cluster);
  }

  private findClusterAt(x: number, y: number): StarCluster | null {
    for (let i = this.clusters.length - 1; i >= 0; i--) {
      if (this.clusters[i].isMouseHovered(x, y) && !this.clusters[i].dissipating) {
        return this.clusters[i];
      }
    }
    return null;
  }

  private createConnection(from: StarCluster, to: StarCluster): void {
    if (this.connections.length >= App.MAX_CONNECTIONS) return;

    const exists = this.connections.some(
      c => !c.dissipating && (
        (c.fromCluster.id === from.id && c.toCluster.id === to.id) ||
        (c.fromCluster.id === to.id && c.toCluster.id === from.id)
      )
    );

    if (exists) return;

    const connection = new Connection(from, to);
    this.connections.push(connection);
  }

  private handleHover(): void {
    const previouslyHovered = this.hoveredCluster;
    this.hoveredCluster = this.findClusterAt(this.mouse.x, this.mouse.y);

    if (previouslyHovered && previouslyHovered.id !== this.hoveredCluster?.id) {
      previouslyHovered.isHovered = false;
    }
    if (this.hoveredCluster) {
      this.hoveredCluster.isHovered = true;
    }
  }

  private updateInfoBox(): void {
    if (this.hoveredCluster) {
      this.infoBox.querySelector('.letter')!.textContent = `★ ${this.hoveredCluster.letter}`;
      this.infoBox.querySelector('.time')!.textContent = `创建于 ${this.hoveredCluster.getCreatedTimeString()}`;
      this.infoBox.style.left = `${this.mouse.x + 16}px`;
      this.infoBox.style.top = `${this.mouse.y + 16}px`;
      this.infoBox.classList.add('visible');
    } else {
      this.hideInfoBox();
    }
  }

  private hideInfoBox(): void {
    this.infoBox.classList.remove('visible');
  }

  public saveStarMap(): void {
    const data: SaveData = {
      version: '1.0',
      timestamp: Date.now(),
      clusters: this.clusters.filter(c => !c.dissipating).map(c => c.toJSON()),
      connections: this.connections.filter(c => !c.dissipating).map(c => c.toJSON())
    };

    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const date = new Date(data.timestamp);
    const timestamp = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}_${String(date.getHours()).padStart(2, '0')}${String(date.getMinutes()).padStart(2, '0')}${String(date.getSeconds()).padStart(2, '0')}`;
    const filename = `starmap_${timestamp}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  public async loadStarMap(file: File): Promise<void> {
    try {
      const text = await file.text();
      const data: SaveData = JSON.parse(text);

      if (!data.clusters || !data.connections) {
        throw new Error('无效的星图文件');
      }

      this.clusters.forEach(c => c.startDissipate());
      this.connections.forEach(c => c.startDissipate());

      const newClusters: StarCluster[] = [];
      const clusterMap = new Map<string, StarCluster>();

      for (const cd of data.clusters) {
        const cluster = new StarCluster(cd.x, cd.y, cd.letter, cd.hue, cd);
        cluster.opacity = 0;
        newClusters.push(cluster);
        clusterMap.set(cluster.id, cluster);
      }

      const newConnections: Connection[] = [];
      for (const cd of data.connections) {
        const from = clusterMap.get(cd.fromClusterId);
        const to = clusterMap.get(cd.toClusterId);
        if (from && to) {
          const conn = new Connection(from, to, cd.id);
          conn.opacity = 0;
          newConnections.push(conn);
        }
      }

      this.clusters.push(...newClusters);
      this.connections.push(...newConnections);

      this.appState = 'fadingIn';
      this.fadeInProgress = 0;
      const startTime = performance.now();

      const fadeIn = () => {
        const elapsed = performance.now() - startTime;
        this.fadeInProgress = Math.min(1, elapsed / App.FADE_IN_DURATION);

        for (const c of newClusters) {
          c.opacity = this.fadeInProgress;
        }
        for (const c of newConnections) {
          c.opacity = this.fadeInProgress;
        }

        if (this.fadeInProgress < 1) {
          requestAnimationFrame(fadeIn);
        } else {
          this.appState = 'idle';
        }
      };

      requestAnimationFrame(fadeIn);
    } catch (err) {
      console.error('加载星图失败:', err);
      alert('加载星图失败，请检查文件格式是否正确。');
    }
  }

  private toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.error('全屏失败:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  private showResetConfirm(): void {
    if (this.clusters.filter(c => !c.dissipating).length === 0 &&
        this.connections.filter(c => !c.dissipating).length === 0) {
      return;
    }

    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
      <div class="modal-box">
        <div class="modal-title">确认清除</div>
        <div class="modal-desc">确认清除所有星团和连线？此操作不可撤销。</div>
        <div class="modal-actions">
          <button class="modal-btn cancel">取消</button>
          <button class="modal-btn confirm">确认清除</button>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.querySelector('.cancel')!.addEventListener('click', () => {
      overlay.remove();
    });

    overlay.querySelector('.confirm')!.addEventListener('click', () => {
      overlay.remove();
      this.resetCanvas();
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.remove();
      }
    });
  }

  private resetCanvas(): void {
    this.appState = 'dissipating';

    for (const cluster of this.clusters) {
      if (!cluster.dissipating) {
        cluster.startDissipate();
      }
    }
    for (const conn of this.connections) {
      if (!conn.dissipating) {
        conn.startDissipate();
      }
    }

    const startTime = performance.now();
    const checkDissipate = () => {
      const elapsed = performance.now() - startTime;
      if (elapsed >= App.DISSIPATE_DURATION) {
        this.clusters = this.clusters.filter(c => !c.dissipating);
        this.connections = this.connections.filter(c => !c.dissipating);
        this.appState = 'idle';
      } else {
        requestAnimationFrame(checkDissipate);
      }
    };

    requestAnimationFrame(checkDissipate);
  }

  private update(currentTime: number): void {
    for (const cluster of this.clusters) {
      cluster.update();
    }

    for (const conn of this.connections) {
      conn.update(currentTime);
    }

    this.clusters = this.clusters.filter(c => !c.isFullyDissipated());
    this.connections = this.connections.filter(c => !c.isFullyDissipated());

    for (const star of this.backgroundStars) {
      star.a += star.s;
      if (star.a > 0.8 || star.a < 0.1) {
        star.s = -star.s;
      }
    }
  }

  private draw(): void {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;

    ctx.clearRect(0, 0, w, h);

    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
    bgGrad.addColorStop(0, '#0B0C10');
    bgGrad.addColorStop(1, '#1F1B24');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    for (const star of this.backgroundStars) {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200, 220, 255, ${star.a})`;
      ctx.fill();
    }

    for (const conn of this.connections) {
      conn.draw(ctx);
    }

    if (this.mouse.isDown && this.mouse.dragStartCluster) {
      const from = this.mouse.dragStartCluster;
      const grad = ctx.createLinearGradient(from.x, from.y, this.mouse.x, this.mouse.y);
      grad.addColorStop(0, `hsla(${from.hue}, 90%, 80%, 0.5)`);
      grad.addColorStop(1, `hsla(${from.hue}, 90%, 80%, 0.1)`);

      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(this.mouse.x, this.mouse.y);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 8]);
      ctx.lineCap = 'round';
      ctx.stroke();
      ctx.setLineDash([]);
    }

    for (const cluster of this.clusters) {
      cluster.draw(ctx);
    }
  }

  public start(): void {
    const loop = (timestamp: number) => {
      this.lastTime = timestamp;
      this.update(timestamp);
      this.draw();
      this.animationId = requestAnimationFrame(loop);
    };

    this.animationId = requestAnimationFrame(loop);
  }

  public stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}
