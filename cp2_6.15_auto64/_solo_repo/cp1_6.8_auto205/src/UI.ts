import * as THREE from 'three';
import { RayEmitter } from './RayEmitter';
import { ParticleSystem } from './ParticleSystem';

export class UI {
  private camera: THREE.PerspectiveCamera;
  private domElement: HTMLElement;
  private rayEmitter: RayEmitter;
  private particleSystem: ParticleSystem;

  private theta = 0;
  private phi = Math.PI / 3;
  private radius = 22;
  private target = new THREE.Vector3(0, 0, 0);

  private isOrbiting = false;
  private isEmitting = false;
  private prevMouse = new THREE.Vector2();
  private mouseDownPos = new THREE.Vector2();
  private isDragging = false;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

  private emitThrottle = 0;
  private thickness = 3.0;
  private diffusionSpeed = 1.0;

  onReset?: () => void;

  constructor(
    camera: THREE.PerspectiveCamera,
    domElement: HTMLElement,
    rayEmitter: RayEmitter,
    particleSystem: ParticleSystem
  ) {
    this.camera = camera;
    this.domElement = domElement;
    this.rayEmitter = rayEmitter;
    this.particleSystem = particleSystem;

    this.raycaster.params.Points = { threshold: 0.4 };

    this.updateCamera();
    this.bindEvents();
    this.createControlPanel();
  }

  private bindEvents(): void {
    this.domElement.addEventListener('contextmenu', (e) => e.preventDefault());

    this.domElement.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', (e) => this.onMouseUp(e));
    this.domElement.addEventListener('wheel', (e) => this.onWheel(e), {
      passive: false,
    });

    this.domElement.addEventListener('touchstart', (e) =>
      this.onTouchStart(e)
    );
    this.domElement.addEventListener('touchmove', (e) =>
      this.onTouchMove(e)
    );
    this.domElement.addEventListener('touchend', (e) =>
      this.onTouchEnd(e)
    );
  }

  private getNDC(clientX: number, clientY: number): THREE.Vector2 {
    const rect = this.domElement.getBoundingClientRect();
    return new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
  }

  private getWorldPos(ndc: THREE.Vector2): THREE.Vector3 | null {
    const rc = new THREE.Raycaster();
    rc.setFromCamera(ndc, this.camera);
    const hit = new THREE.Vector3();
    const result = rc.ray.intersectPlane(this.plane, hit);
    return result;
  }

  private getEmitDirection(): THREE.Vector3 {
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(
      this.camera.quaternion
    );
    const spread = 0.4;
    forward.x += (Math.random() - 0.5) * spread;
    forward.y += (Math.random() - 0.5) * spread;
    forward.z += (Math.random() - 0.5) * spread;
    return forward.normalize();
  }

  private tryExplodeTrail(ndc: THREE.Vector2): boolean {
    this.raycaster.setFromCamera(ndc, this.camera);
    const meshes = this.rayEmitter.getTrailMeshes();
    if (meshes.length === 0) return false;
    const hits = this.raycaster.intersectObjects(meshes, false);
    if (hits.length === 0) return false;

    const hitMesh = hits[0].object;
    const trail = this.rayEmitter.findTrailByMesh(hitMesh);
    if (!trail) return false;

    const { positions, colorOffset } = this.rayEmitter.explodeTrail(trail);
    this.particleSystem.emit(positions, colorOffset);
    this.rayEmitter.scene.remove(trail.mesh);
    trail.dispose();
    return true;
  }

  private emitRayAt(clientX: number, clientY: number): void {
    const ndc = this.getNDC(clientX, clientY);
    const worldPos = this.getWorldPos(ndc);
    if (!worldPos) return;
    const dir = this.getEmitDirection();
    this.rayEmitter.emit(worldPos, dir);
  }

  private onMouseDown(e: MouseEvent): void {
    const ndc = this.getNDC(e.clientX, e.clientY);
    this.mouseDownPos.set(e.clientX, e.clientY);
    this.isDragging = false;

    if (e.button === 2 || e.button === 1) {
      this.isOrbiting = true;
      this.prevMouse.set(e.clientX, e.clientY);
      return;
    }

    if (e.button === 0) {
      this.prevMouse.set(e.clientX, e.clientY);
      if (this.tryExplodeTrail(ndc)) return;
      this.isEmitting = true;
      this.emitThrottle = 0;
      this.emitRayAt(e.clientX, e.clientY);
    }
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.isOrbiting) {
      const dx = e.clientX - this.prevMouse.x;
      const dy = e.clientY - this.prevMouse.y;
      this.theta -= dx * 0.005;
      this.phi = Math.max(
        0.1,
        Math.min(Math.PI - 0.1, this.phi - dy * 0.005)
      );
      this.prevMouse.set(e.clientX, e.clientY);
      this.updateCamera();
      return;
    }

    if (this.isEmitting) {
      const dx = e.clientX - this.mouseDownPos.x;
      const dy = e.clientY - this.mouseDownPos.y;
      if (Math.sqrt(dx * dx + dy * dy) > 5) {
        this.isDragging = true;
      }
      if (this.isDragging) {
        this.emitThrottle++;
        if (this.emitThrottle % 4 === 0) {
          this.emitRayAt(e.clientX, e.clientY);
        }
      }
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (e.button === 2 || e.button === 1) {
      this.isOrbiting = false;
      return;
    }
    this.isEmitting = false;
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.radius = Math.max(5, Math.min(60, this.radius + e.deltaY * 0.02));
    this.updateCamera();
  }

  private touchState: 'none' | 'orbit' | 'emit' = 'none';
  private touchStartDist = 0;

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      const t = e.touches[0];
      const ndc = this.getNDC(t.clientX, t.clientY);
      this.mouseDownPos.set(t.clientX, t.clientY);
      this.isDragging = false;

      if (this.tryExplodeTrail(ndc)) {
        this.touchState = 'none';
        return;
      }
      this.touchState = 'emit';
      this.emitThrottle = 0;
      this.emitRayAt(t.clientX, t.clientY);
      this.prevMouse.set(t.clientX, t.clientY);
    } else if (e.touches.length === 2) {
      this.touchState = 'orbit';
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      this.touchStartDist = Math.hypot(
        t1.clientX - t0.clientX,
        t1.clientY - t0.clientY
      );
      this.prevMouse.set(
        (t0.clientX + t1.clientX) / 2,
        (t0.clientY + t1.clientY) / 2
      );
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (this.touchState === 'orbit' && e.touches.length === 2) {
      const t0 = e.touches[0];
      const t1 = e.touches[1];
      const cx = (t0.clientX + t1.clientX) / 2;
      const cy = (t0.clientY + t1.clientY) / 2;
      const dx = cx - this.prevMouse.x;
      const dy = cy - this.prevMouse.y;
      this.theta -= dx * 0.005;
      this.phi = Math.max(
        0.1,
        Math.min(Math.PI - 0.1, this.phi - dy * 0.005)
      );
      const dist = Math.hypot(
        t1.clientX - t0.clientX,
        t1.clientY - t0.clientY
      );
      const scale = this.touchStartDist / dist;
      this.radius = Math.max(5, Math.min(60, this.radius * scale));
      this.touchStartDist = dist;
      this.prevMouse.set(cx, cy);
      this.updateCamera();
    } else if (this.touchState === 'emit' && e.touches.length === 1) {
      const t = e.touches[0];
      const dx = t.clientX - this.mouseDownPos.x;
      const dy = t.clientY - this.mouseDownPos.y;
      if (Math.sqrt(dx * dx + dy * dy) > 5) this.isDragging = true;
      if (this.isDragging) {
        this.emitThrottle++;
        if (this.emitThrottle % 4 === 0) {
          this.emitRayAt(t.clientX, t.clientY);
        }
      }
    }
  }

  private onTouchEnd(_e: TouchEvent): void {
    this.touchState = 'none';
    this.isDragging = false;
  }

  updateCamera(): void {
    const x = this.radius * Math.sin(this.phi) * Math.sin(this.theta);
    const y = this.radius * Math.cos(this.phi);
    const z = this.radius * Math.sin(this.phi) * Math.cos(this.theta);
    this.camera.position.set(
      this.target.x + x,
      this.target.y + y,
      this.target.z + z
    );
    this.camera.lookAt(this.target);
  }

  private createControlPanel(): void {
    const panel = document.createElement('div');
    panel.id = 'control-panel';
    panel.innerHTML = `
      <div class="panel-title">流光织诗</div>
      <div class="control-group">
        <label>光线粗细</label>
        <input type="range" id="thickness-slider" min="1" max="8" step="0.5" value="3" />
        <span id="thickness-value">3.0</span>
      </div>
      <div class="control-group">
        <label>粒子扩散</label>
        <input type="range" id="diffusion-slider" min="0.2" max="3" step="0.1" value="1" />
        <span id="diffusion-value">1.0</span>
      </div>
      <button id="reset-btn">重置画布</button>
    `;

    const style = document.createElement('style');
    style.textContent = `
      #control-panel {
        position: fixed;
        bottom: 24px;
        right: 24px;
        padding: 20px 24px;
        background: rgba(255, 255, 255, 0.06);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 16px;
        color: rgba(255, 255, 255, 0.85);
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        z-index: 100;
        min-width: 200px;
        user-select: none;
      }
      .panel-title {
        font-size: 15px;
        font-weight: 600;
        margin-bottom: 16px;
        letter-spacing: 2px;
        background: linear-gradient(90deg, #8b5cf6, #f59e0b);
        -webkit-background-clip: text;
        -webkit-text-fill-color: transparent;
        background-clip: text;
      }
      .control-group {
        margin-bottom: 14px;
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .control-group label {
        min-width: 60px;
        font-size: 12px;
        color: rgba(255, 255, 255, 0.6);
      }
      .control-group input[type="range"] {
        flex: 1;
        height: 4px;
        -webkit-appearance: none;
        appearance: none;
        background: rgba(255, 255, 255, 0.15);
        border-radius: 2px;
        outline: none;
      }
      .control-group input[type="range"]::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: linear-gradient(135deg, #8b5cf6, #f59e0b);
        cursor: pointer;
        border: none;
      }
      .control-group span {
        min-width: 28px;
        text-align: right;
        font-size: 11px;
        color: rgba(255, 255, 255, 0.5);
        font-variant-numeric: tabular-nums;
      }
      #reset-btn {
        width: 100%;
        padding: 8px 0;
        margin-top: 6px;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 8px;
        color: rgba(255, 255, 255, 0.7);
        font-size: 12px;
        cursor: pointer;
        transition: all 0.2s ease;
        font-family: inherit;
      }
      #reset-btn:hover {
        background: rgba(255, 255, 255, 0.14);
        color: rgba(255, 255, 255, 0.95);
        border-color: rgba(255, 255, 255, 0.2);
      }
      @media (max-width: 768px) {
        #control-panel {
          bottom: 12px;
          right: 12px;
          padding: 14px 16px;
          min-width: 170px;
          font-size: 12px;
        }
        .panel-title { font-size: 13px; }
        .control-group label { min-width: 48px; font-size: 11px; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(panel);

    const thickSlider = document.getElementById(
      'thickness-slider'
    ) as HTMLInputElement;
    const thickVal = document.getElementById('thickness-value')!;
    thickSlider.addEventListener('input', () => {
      this.thickness = parseFloat(thickSlider.value);
      thickVal.textContent = this.thickness.toFixed(1);
      this.rayEmitter.setThickness(this.thickness);
    });

    const diffSlider = document.getElementById(
      'diffusion-slider'
    ) as HTMLInputElement;
    const diffVal = document.getElementById('diffusion-value')!;
    diffSlider.addEventListener('input', () => {
      this.diffusionSpeed = parseFloat(diffSlider.value);
      diffVal.textContent = this.diffusionSpeed.toFixed(1);
      this.particleSystem.setDiffusionSpeed(this.diffusionSpeed);
    });

    document.getElementById('reset-btn')!.addEventListener('click', () => {
      this.rayEmitter.reset();
      this.particleSystem.reset();
      this.onReset?.();
    });
  }
}
