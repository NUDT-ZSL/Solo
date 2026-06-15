import { TerrainManager, TerrainType } from './terrain';
import { PhysicsEngine } from './engine';

export type Mode = 'editor' | 'play';

export class UIManager {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  terrainManager: TerrainManager;
  engine: PhysicsEngine;

  mode: Mode = 'editor';

  speedValueEl: HTMLElement;
  angVelValueEl: HTMLElement;
  timeValueEl: HTMLElement;
  fpsCounterEl: HTMLElement;
  previewBar: HTMLElement;
  launchControls: HTMLElement;
  toolbar: HTMLElement;

  arrowStart: { x: number; y: number } | null = null;
  arrowEnd: { x: number; y: number } | null = null;
  isDraggingArrow: boolean = false;
  maxPower = 200;

  private onModeChangeCallback: ((mode: Mode) => void) | null = null;
  private onLaunchCallback: (() => void) | null = null;
  private onResetCallback: (() => void) | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    terrainManager: TerrainManager,
    engine: PhysicsEngine
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.terrainManager = terrainManager;
    this.engine = engine;

    this.speedValueEl = document.getElementById('speedValue')!;
    this.angVelValueEl = document.getElementById('angVelValue')!;
    this.timeValueEl = document.getElementById('timeValue')!;
    this.fpsCounterEl = document.getElementById('fpsCounter')!;
    this.previewBar = document.getElementById('previewBar')!;
    this.launchControls = document.getElementById('launchControls')!;
    this.toolbar = document.getElementById('toolbar')!;

    this.bindEvents();
  }

  setModeChangeCallback(cb: (mode: Mode) => void) {
    this.onModeChangeCallback = cb;
  }

  setLaunchCallback(cb: () => void) {
    this.onLaunchCallback = cb;
  }

  setResetCallback(cb: () => void) {
    this.onResetCallback = cb;
  }

  bindEvents() {
    document.getElementById('modeEditor')!.addEventListener('click', () => this.setMode('editor'));
    document.getElementById('modePlay')!.addEventListener('click', () => this.setMode('play'));

    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const type = (e.currentTarget as HTMLElement).dataset.type as TerrainType;
        this.selectTool(type);
      });
    });

    document.getElementById('launchBtn')!.addEventListener('click', () => {
      if (this.arrowStart && this.arrowEnd) {
        const dx = this.arrowEnd.x - this.arrowStart.x;
        const dy = this.arrowEnd.y - this.arrowStart.y;
        const power = Math.min(Math.sqrt(dx * dx + dy * dy), this.maxPower);
        this.engine.launch(dx, dy, power);
        this.onLaunchCallback?.();
      }
    });

    document.getElementById('resetBtn')!.addEventListener('click', () => {
      this.resetArrow();
      this.onResetCallback?.();
    });

    this.canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.canvas.addEventListener('mouseup', () => this.onMouseUp());
    this.canvas.addEventListener('mouseleave', () => this.onMouseUp());
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('resize', () => this.handleResize());
  }

  handleResize() {
    const container = this.canvas.parentElement;
    if (!container) return;
    const maxWidth = Math.min(window.innerWidth * 0.7, 900);
    const width = Math.max(600, Math.floor(maxWidth / 40) * 40);
    const height = Math.floor(width * 400 / 600 / 40) * 40;
    this.canvas.width = width;
    this.canvas.height = height;
    this.terrainManager.setCanvasSize(width, height);
    this.engine.setCanvasSize(width, height);
    this.previewBar.style.width = width + 'px';
  }

  selectTool(type: TerrainType) {
    if (this.terrainManager.selectedType === type) {
      this.terrainManager.selectedType = null;
    } else {
      this.terrainManager.selectedType = type;
    }
    this.updateToolbarUI();
  }

  updateToolbarUI() {
    document.querySelectorAll('.tool-btn').forEach(btn => {
      const t = (btn as HTMLElement).dataset.type;
      if (t === this.terrainManager.selectedType) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  setMode(mode: Mode) {
    this.mode = mode;
    document.getElementById('modeEditor')!.classList.toggle('active', mode === 'editor');
    document.getElementById('modePlay')!.classList.toggle('active', mode === 'play');
    this.toolbar.style.display = mode === 'editor' ? 'flex' : 'none';
    this.launchControls.style.display = mode === 'play' ? 'flex' : 'none';
    this.canvas.style.cursor = mode === 'editor' ? 'crosshair' : 'default';
    this.resetArrow();
    this.onModeChangeCallback?.(mode);
  }

  getCanvasPos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
    };
  }

  onMouseDown(e: MouseEvent) {
    const pos = this.getCanvasPos(e);

    if (this.mode === 'editor') {
      if (e.button === 2) {
        const t = this.terrainManager.getTerrainAt(pos.x, pos.y);
        if (t) this.terrainManager.removeTerrain(t.id);
        return;
      }
      if (!this.terrainManager.startDrag(pos.x, pos.y)) {
        this.terrainManager.handleCanvasClick(pos.x, pos.y);
      }
    } else if (this.mode === 'play') {
      if (!this.engine.character.launched) {
        this.arrowStart = { x: this.engine.character.x, y: this.engine.character.y };
        this.arrowEnd = pos;
        this.isDraggingArrow = true;
      }
    }
  }

  onMouseMove(e: MouseEvent) {
    const pos = this.getCanvasPos(e);

    if (this.mode === 'editor') {
      this.terrainManager.updateDrag(pos.x, pos.y);
    } else if (this.mode === 'play' && this.isDraggingArrow) {
      this.arrowEnd = pos;
    }
  }

  onMouseUp() {
    if (this.mode === 'editor') {
      this.terrainManager.endDrag();
    } else if (this.mode === 'play') {
      this.isDraggingArrow = false;
    }
  }

  resetArrow() {
    this.arrowStart = null;
    this.arrowEnd = null;
    this.isDraggingArrow = false;
  }

  updateStats() {
    this.speedValueEl.textContent = this.engine.getSpeed().toFixed(2);
    this.angVelValueEl.textContent = (this.engine.character.angularVelocity * 60).toFixed(2);
    this.timeValueEl.textContent = Math.floor(this.engine.elapsedTime).toString();
  }

  updateFPS(fps: number) {
    this.fpsCounterEl.textContent = `FPS: ${fps.toFixed(0)}`;
  }

  drawArrow() {
    if (!this.arrowStart || !this.arrowEnd || this.mode !== 'play') return;
    if (this.engine.character.launched) return;

    let dx = this.arrowEnd.x - this.arrowStart.x;
    let dy = this.arrowEnd.y - this.arrowStart.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    if (length === 0) return;

    const clampedLength = Math.min(length, this.maxPower);
    const ratio = clampedLength / length;
    const endX = this.arrowStart.x + dx * ratio;
    const endY = this.arrowStart.y + dy * ratio;

    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(246, 224, 94, 0.25)';
    this.ctx.lineWidth = 10;
    this.ctx.lineCap = 'round';
    this.ctx.beginPath();
    this.ctx.moveTo(this.arrowStart.x, this.arrowStart.y);
    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();

    this.ctx.strokeStyle = '#F6E05E';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    this.ctx.moveTo(this.arrowStart.x, this.arrowStart.y);
    this.ctx.lineTo(endX, endY);
    this.ctx.stroke();

    const angle = Math.atan2(endY - this.arrowStart.y, endX - this.arrowStart.x);
    const headLen = 12;
    this.ctx.fillStyle = '#F6E05E';
    this.ctx.beginPath();
    this.ctx.moveTo(endX, endY);
    this.ctx.lineTo(endX - headLen * Math.cos(angle - Math.PI / 6), endY - headLen * Math.sin(angle - Math.PI / 6));
    this.ctx.lineTo(endX - headLen * Math.cos(angle + Math.PI / 6), endY - headLen * Math.sin(angle + Math.PI / 6));
    this.ctx.closePath();
    this.ctx.fill();
    this.ctx.restore();
  }

  renderPreviewBar() {
    this.previewBar.innerHTML = '';
    for (const t of this.terrainManager.terrains) {
      const item = document.createElement('div');
      item.className = `preview-item ${t.type}`;
      item.dataset.id = String(t.id);

      if (t.type === 'portal' && t.portalPairId) {
        const badge = document.createElement('div');
        badge.className = 'portal-pair';
        badge.textContent = String(t.portalPairId);
        item.appendChild(badge);
      }

      item.addEventListener('mouseenter', () => {
        this.terrainManager.highlightedTerrainId = t.id;
      });
      item.addEventListener('mouseleave', () => {
        this.terrainManager.highlightedTerrainId = null;
      });

      this.previewBar.appendChild(item);
    }
  }

  render() {
    this.drawArrow();
  }
}
