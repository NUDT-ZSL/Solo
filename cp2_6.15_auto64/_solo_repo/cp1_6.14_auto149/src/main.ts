import * as THREE from 'three';
import { EventBus } from './EventBus';
import { FlowFieldEngine, ControlPoint, ParticleData } from './FlowFieldEngine';
import { ParticleRenderer } from './ParticleRenderer';

type ToolMode = 'none' | 'add' | 'delete';

class FlowFieldApp {
  private container: HTMLDivElement;
  private threeCanvas: HTMLCanvasElement;
  private overlayCanvas: HTMLCanvasElement;
  private overlayCtx: CanvasRenderingContext2D;
  private eventBus: EventBus;
  private engine: FlowFieldEngine;
  private particleRenderer: ParticleRenderer | null = null;
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private renderer: THREE.WebGLRenderer;
  private width: number = 0;
  private height: number = 0;
  private toolMode: ToolMode = 'none';
  private selectedCPId: string | null = null;
  private draggingCPId: string | null = null;
  private dragOffset: { x: number; y: number } = { x: 0, y: 0 };
  private activeModalCPId: string | null = null;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private fps: number = 60;
  private fpsUpdateTime: number = 0;
  private particleCount: number = 0;
  private currentParticles: ParticleData[] = [];
  private suppressClick: boolean = false;
  private mouseDownTime: number = 0;
  private mouseDownPos: { x: number; y: number } = { x: 0, y: 0 };

  constructor() {
    this.container = document.getElementById('canvas-container') as HTMLDivElement;
    this.threeCanvas = document.getElementById('three-canvas') as HTMLCanvasElement;
    this.overlayCanvas = document.getElementById('overlay-canvas') as HTMLCanvasElement;
    this.overlayCtx = this.overlayCanvas.getContext('2d')!;

    this.eventBus = new EventBus();
    this.engine = new FlowFieldEngine(this.eventBus);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.threeCanvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.camera = new THREE.OrthographicCamera(0, 1, 1, 0, -10, 10);

    this.particleRenderer = new ParticleRenderer(this.scene, this.camera, this.renderer, this.eventBus, 4096);

    this.setupEventBusHandlers();
    this.bindUI();
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  private setupEventBusHandlers(): void {
    this.eventBus.on('cp:added', () => {
      this.renderControlPointsPanel();
    });
    this.eventBus.on('cp:removed', () => {
      this.renderControlPointsPanel();
      if (this.selectedCPId) this.selectedCPId = null;
    });
    this.eventBus.on('cp:updated', () => {
      this.renderControlPointsPanel();
    });
    this.eventBus.on('field:reset', () => {
      this.renderControlPointsPanel();
      this.selectedCPId = null;
      if (this.particleRenderer) this.particleRenderer.clearTrails();
    });
    this.eventBus.on('particles:count', (count: number) => {
      this.particleCount = count;
    });
    this.eventBus.on('particles:update', (data: ParticleData[]) => {
      this.currentParticles = data;
    });
  }

  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;

    this.renderer.setSize(this.width, this.height, false);

    this.camera.left = 0;
    this.camera.right = this.width;
    this.camera.top = 0;
    this.camera.bottom = this.height;
    this.camera.updateProjectionMatrix();

    this.overlayCanvas.width = this.width;
    this.overlayCanvas.height = this.height;

    this.eventBus.emit('canvas:resize', this.width, this.height);
    if (this.particleRenderer) this.particleRenderer.setSize(this.width, this.height);
  }

  private bindUI(): void {
    const btnAdd = document.getElementById('btn-add')!;
    const btnDelete = document.getElementById('btn-delete')!;
    const btnReset = document.getElementById('btn-reset')!;
    const btnPlay = document.getElementById('btn-play')!;

    btnAdd.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.setToolMode(this.toolMode === 'add' ? 'none' : 'add');
      btnAdd.classList.toggle('active', this.toolMode === 'add');
      btnDelete.classList.remove('active');
    });

    btnDelete.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.setToolMode(this.toolMode === 'delete' ? 'none' : 'delete');
      btnDelete.classList.toggle('active', this.toolMode === 'delete');
      btnAdd.classList.remove('active');
    });

    btnReset.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.eventBus.emit('cp:reset');
    });

    btnPlay.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.eventBus.emit('engine:toggle-play');
      this.engine.isPlaying ? (btnPlay.textContent = '▶') : (btnPlay.textContent = '⏸');
      btnPlay.classList.toggle('active', !this.engine.isPlaying);
    });

    this.overlayCanvas.addEventListener('click', (e) => this.onCanvasClick(e));
    this.overlayCanvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.overlayCanvas.addEventListener('dblclick', (e) => this.onDoubleClick(e));
    this.overlayCanvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      e.stopPropagation();
    });

    document.addEventListener('mousemove', (e) => this.onDocumentMouseMove(e));
    document.addEventListener('mouseup', (e) => this.onDocumentMouseUp(e));
    document.addEventListener('selectstart', (e) => {
      if (this.draggingCPId) e.preventDefault();
    });

    document.getElementById('modal-close')!.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.closeModal();
    });
    document.getElementById('settings-modal')!.addEventListener('click', (e) => {
      if (e.target === document.getElementById('settings-modal')) this.closeModal();
    });

    ['input-x', 'input-y', 'input-angle', 'input-radius', 'input-strength'].forEach((id) => {
      document.getElementById(id)!.addEventListener('input', () => this.applyModalChanges());
    });
  }

  private setToolMode(mode: ToolMode): void {
    this.toolMode = mode;
    this.overlayCanvas.style.cursor = mode === 'add' ? 'crosshair' : mode === 'delete' ? 'not-allowed' : 'default';
  }

  private getCanvasPos(e: MouseEvent): { x: number; y: number } {
    const rect = this.overlayCanvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private isEventOnCanvas(e: MouseEvent): boolean {
    const rect = this.overlayCanvas.getBoundingClientRect();
    return (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top &&
      e.clientY <= rect.bottom
    );
  }

  private findCPAt(x: number, y: number): ControlPoint | null {
    const cps = this.engine.getAllControlPoints();
    for (let i = cps.length - 1; i >= 0; i--) {
      const cp = cps[i];
      const dx = x - cp.x;
      const dy = y - cp.y;
      if (dx * dx + dy * dy <= 100) {
        return cp;
      }
    }
    return null;
  }

  private onCanvasClick(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();

    if (this.suppressClick) {
      this.suppressClick = false;
      return;
    }

    const pos = this.getCanvasPos(e);
    if (this.toolMode === 'add') {
      this.eventBus.emit('cp:add', pos.x, pos.y);
      return;
    }
    if (this.toolMode === 'delete') {
      const cp = this.findCPAt(pos.x, pos.y);
      if (cp) this.eventBus.emit('cp:remove', cp.id);
      return;
    }
    const cp = this.findCPAt(pos.x, pos.y);
    this.selectedCPId = cp ? cp.id : null;
    this.renderControlPointsPanel();
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();

    const pos = this.getCanvasPos(e);
    this.mouseDownTime = performance.now();
    this.mouseDownPos = pos;

    const cp = this.findCPAt(pos.x, pos.y);

    if (this.toolMode === 'none' && cp) {
      this.draggingCPId = cp.id;
      this.selectedCPId = cp.id;
      this.dragOffset = { x: pos.x - cp.x, y: pos.y - cp.y };
      this.overlayCanvas.style.cursor = 'grabbing';
      this.renderControlPointsPanel();
      this.suppressClick = true;
      return;
    }

    if (this.toolMode === 'delete' && cp) {
      this.eventBus.emit('cp:remove', cp.id);
      this.suppressClick = true;
    }
  }

  private onDocumentMouseMove(e: MouseEvent): void {
    if (!this.draggingCPId) return;
    e.preventDefault();

    if (!this.isEventOnCanvas(e)) {
      return;
    }

    const pos = this.getCanvasPos(e);
    const newX = Math.max(8, Math.min(this.width - 8, pos.x - this.dragOffset.x));
    const newY = Math.max(8, Math.min(this.height - 8, pos.y - this.dragOffset.y));
    this.eventBus.emit('cp:update', this.draggingCPId, { x: newX, y: newY });
  }

  private onDocumentMouseUp(e: MouseEvent): void {
    if (!this.draggingCPId) return;

    const now = performance.now();
    const pos = this.isEventOnCanvas(e) ? this.getCanvasPos(e) : this.mouseDownPos;
    const dragDist = Math.hypot(pos.x - this.mouseDownPos.x, pos.y - this.mouseDownPos.y);
    const dragDuration = now - this.mouseDownTime;

    if (dragDist < 4 && dragDuration < 300) {
      this.suppressClick = false;
    } else {
      this.suppressClick = true;
    }

    this.draggingCPId = null;
    this.overlayCanvas.style.cursor =
      this.toolMode === 'add' ? 'crosshair' : this.toolMode === 'delete' ? 'not-allowed' : 'default';
  }

  private onDoubleClick(e: MouseEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.suppressClick = true;

    const pos = this.getCanvasPos(e);
    const cp = this.findCPAt(pos.x, pos.y);
    if (cp) {
      this.selectedCPId = cp.id;
      this.openModal(cp);
    }
  }

  private openModal(cp: ControlPoint): void {
    this.activeModalCPId = cp.id;
    document.getElementById('modal-cp-dot')!.style.background = this.engine.getColorForIndex(cp.colorIndex);
    (document.getElementById('input-x') as HTMLInputElement).value = cp.x.toFixed(0);
    (document.getElementById('input-y') as HTMLInputElement).value = cp.y.toFixed(0);
    (document.getElementById('input-angle') as HTMLInputElement).value = cp.angle.toFixed(0);
    (document.getElementById('input-radius') as HTMLInputElement).value = cp.radius.toFixed(0);
    (document.getElementById('input-strength') as HTMLInputElement).value = cp.strength.toFixed(1);
    document.getElementById('settings-modal')!.classList.add('visible');
  }

  private closeModal(): void {
    document.getElementById('settings-modal')!.classList.remove('visible');
    this.activeModalCPId = null;
  }

  private applyModalChanges(): void {
    if (!this.activeModalCPId) return;
    const cp = this.engine.getControlPoint(this.activeModalCPId);
    if (!cp) return;

    const x = parseFloat((document.getElementById('input-x') as HTMLInputElement).value) || 0;
    const y = parseFloat((document.getElementById('input-y') as HTMLInputElement).value) || 0;
    const angle = parseFloat((document.getElementById('input-angle') as HTMLInputElement).value) || 0;
    const radius = Math.max(20, Math.min(200, parseFloat((document.getElementById('input-radius') as HTMLInputElement).value) || 80));
    const strength = Math.max(0.1, Math.min(3.0, parseFloat((document.getElementById('input-strength') as HTMLInputElement).value) || 1.0));

    this.eventBus.emit('cp:update', this.activeModalCPId, {
      x: Math.max(0, Math.min(this.width, x)),
      y: Math.max(0, Math.min(this.height, y)),
      angle: Math.max(-180, Math.min(180, angle)),
      radius,
      strength,
    });
  }

  private renderControlPointsPanel(): void {
    const panel = document.getElementById('cp-panel')!;
    const cps = this.engine.getAllControlPoints();

    if (cps.length === 0) {
      panel.innerHTML = `<div style="color:#64748b;font-size:11px;text-align:center;padding:12px 0;">点击 + 添加控制点</div>`;
      return;
    }

    panel.innerHTML = cps
      .map((cp, idx) => {
        const color = this.engine.getColorForIndex(cp.colorIndex);
        const isSelected = cp.id === this.selectedCPId;
        return `
        <div class="control-point-card" data-id="${cp.id}" style="border-color: ${isSelected ? color + '80' : ''}; background: ${isSelected ? color + '10' : ''};">
          <div class="cp-header">
            <div class="cp-title">
              <span class="cp-dot" style="background:${color};box-shadow:0 0 6px ${color}"></span>
              控制点 ${idx + 1}
            </div>
            <button class="cp-delete" data-delete="${cp.id}">✕</button>
          </div>
          <div class="slider-group">
            <div class="slider-label"><span>影响半径</span><span class="slider-value">${cp.radius}px</span></div>
            <input type="range" min="20" max="200" step="5" value="${cp.radius}" data-slider="radius" data-id="${cp.id}">
          </div>
          <div class="slider-group">
            <div class="slider-label"><span>旋转角度</span><span class="slider-value">${cp.angle}°</span></div>
            <input type="range" min="-180" max="180" step="1" value="${cp.angle}" data-slider="angle" data-id="${cp.id}">
          </div>
          <div class="slider-group">
            <div class="slider-label"><span>强度</span><span class="slider-value">${cp.strength.toFixed(1)}</span></div>
            <input type="range" min="0.1" max="3.0" step="0.1" value="${cp.strength}" data-slider="strength" data-id="${cp.id}">
          </div>
        </div>
      `;
      })
      .join('');

    panel.querySelectorAll('[data-delete]').forEach((btn) => {
      btn.addEventListener('click', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        this.eventBus.emit('cp:remove', (btn as HTMLElement).getAttribute('data-delete')!);
      });
    });

    panel.querySelectorAll('input[type="range"]').forEach((input) => {
      input.addEventListener('input', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        const id = (input as HTMLInputElement).getAttribute('data-id')!;
        const slider = (input as HTMLInputElement).getAttribute('data-slider')!;
        const value = parseFloat((input as HTMLInputElement).value);
        this.eventBus.emit('cp:update', id, { [slider]: value });
      });
    });
  }

  private drawParticleTrails(): void {
    const ctx = this.overlayCtx;

    for (const p of this.currentParticles) {
      if (p.trail.length < 2) continue;

      for (let i = 1; i < p.trail.length; i++) {
        const prev = p.trail[i - 1];
        const curr = p.trail[i];
        const t = i / p.trail.length;
        const alpha = t * 0.3 * p.a;

        ctx.beginPath();
        ctx.moveTo(prev.x, prev.y);
        ctx.lineTo(curr.x, curr.y);
        ctx.strokeStyle = `rgba(${Math.floor(p.r)}, ${Math.floor(p.g)}, ${Math.floor(p.b)}, ${alpha})`;
        ctx.lineWidth = 1.5 + t * 1.5;
        ctx.lineCap = 'round';
        ctx.stroke();
      }
    }
  }

  private drawOverlay(): void {
    const ctx = this.overlayCtx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawParticleTrails();

    const cps = this.engine.getAllControlPoints();

    for (const cp of cps) {
      const color = this.engine.getColorForIndex(cp.colorIndex);

      ctx.beginPath();
      ctx.arc(cp.x, cp.y, cp.radius, 0, Math.PI * 2);
      ctx.strokeStyle = color + '25';
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    for (const cp of cps) {
      const color = this.engine.getColorForIndex(cp.colorIndex);

      const angleRad = (cp.angle * Math.PI) / 180;
      const arrowLen = 20;
      const endX = cp.x + Math.cos(angleRad) * arrowLen;
      const endY = cp.y + Math.sin(angleRad) * arrowLen;

      if (this.draggingCPId === cp.id || this.selectedCPId === cp.id) {
        ctx.beginPath();
        ctx.moveTo(cp.x, cp.y);
        ctx.lineTo(endX, endY);
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.stroke();

        const headLen = 6;
        const headAngle = Math.PI / 6;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - headLen * Math.cos(angleRad - headAngle),
          endY - headLen * Math.sin(angleRad - headAngle)
        );
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - headLen * Math.cos(angleRad + headAngle),
          endY - headLen * Math.sin(angleRad + headAngle)
        );
        ctx.strokeStyle = '#00f5d4';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }

    for (const cp of cps) {
      const color = this.engine.getColorForIndex(cp.colorIndex);
      const nextColor = this.engine.getColorForIndex(cp.colorIndex + 1);

      const isSelected = this.selectedCPId === cp.id || this.draggingCPId === cp.id;

      if (isSelected) {
        ctx.beginPath();
        ctx.arc(cp.x, cp.y, 14, 0, Math.PI * 2);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.shadowColor = color;
        ctx.shadowBlur = 12;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      const gradient = ctx.createRadialGradient(cp.x - 3, cp.y - 3, 0, cp.x, cp.y, 8);
      gradient.addColorStop(0, color);
      gradient.addColorStop(1, nextColor);

      ctx.beginPath();
      ctx.arc(cp.x, cp.y, 8, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.9)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cp.x - 5, cp.y);
      ctx.lineTo(cp.x + 5, cp.y);
      ctx.moveTo(cp.x, cp.y - 5);
      ctx.lineTo(cp.x, cp.y + 5);
      ctx.stroke();
    }
  }

  private updateFPS(dt: number): void {
    this.frameCount++;
    this.fpsUpdateTime += dt;
    if (this.fpsUpdateTime >= 0.5) {
      this.fps = Math.round(this.frameCount / this.fpsUpdateTime);
      this.frameCount = 0;
      this.fpsUpdateTime = 0;

      document.getElementById('fps')!.textContent = `FPS: ${this.fps}`;
      document.getElementById('particles')!.textContent = `粒子: ${this.particleCount}`;

      if (this.particleCount > 2048 && this.fps < 30) {
        this.engine.currentParticlesPerFrame = Math.max(0, this.engine.currentParticlesPerFrame - 2);

        const targetCount = Math.max(2048, Math.floor(this.particleCount * 0.7));
        if (this.particleCount > targetCount) {
          this.engine.trimParticles(targetCount);
        }
      } else if (this.fps >= 35 && this.particleCount < 2500) {
        this.engine.currentParticlesPerFrame = Math.min(
          this.engine.particlesPerFrame,
          this.engine.currentParticlesPerFrame + 1
        );
      } else if (this.fps > 55 && this.engine.currentParticlesPerFrame < this.engine.particlesPerFrame) {
        this.engine.currentParticlesPerFrame = Math.min(
          this.engine.particlesPerFrame,
          this.engine.currentParticlesPerFrame + 1
        );
      }
    }
  }

  start(): void {
    this.lastTime = performance.now();
    this.renderControlPointsPanel();
    this.animate();
  }

  private animate(): void {
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.updateFPS(dt);

    const particles = this.engine.update(dt);
    if (this.particleRenderer) this.particleRenderer.update(particles);

    this.drawOverlay();

    this.renderer.render(this.scene, this.camera);

    requestAnimationFrame(() => this.animate());
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const app = new FlowFieldApp();
  app.start();
});
