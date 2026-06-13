import * as math from 'mathjs';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface Expression {
  id: string;
  formula: string;
  color: string;
  type: '2d-line' | '2d-scatter' | '3d-surface' | '3d-contour' | 'implicit' | 'polar';
  visible: boolean;
}

export interface Parameters {
  [key: string]: number;
}

export interface ViewState {
  mode: '2d' | '3d';
  rotationX: number;
  rotationY: number;
  zoom: number;
  panX: number;
  panY: number;
  xRange: [number, number];
  yRange: [number, number];
  zRange: [number, number];
}

export interface FrameData {
  expressions: Expression[];
  parameters: Parameters;
  viewState: ViewState;
}

type MathFn2D = (x: number) => number;
type MathFn3D = (x: number, y: number) => number;
type MathFnImplicit = (x: number, y: number) => number;
type MathFnPolar = (theta: number) => number;

interface ParsedExpression {
  expression: Expression;
  compiled: math.EvalFunction | null;
  fn2D?: MathFn2D;
  fn3D?: MathFn3D;
  fnImplicit?: MathFnImplicit;
  fnPolar?: MathFnPolar;
  error?: string;
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function parseExpression(formula: string, parameters: Parameters, type: Expression['type']): ParsedExpression {
  let processed = formula.trim();
  if (type === 'implicit' && processed.includes('=')) {
    const parts = processed.split('=');
    processed = `(${parts[0].trim()}) - (${parts[1].trim()})`;
  }

  try {
    const scope = { ...parameters, theta: 0, x: 0, y: 0, z: 0 };
    const compiled = math.compile(processed);

    const pe: ParsedExpression = { expression: { formula, type } as Expression, compiled };

    if (type === 'polar') {
      pe.fnPolar = (theta: number) => {
        try {
          const result = compiled.evaluate({ ...parameters, theta });
          return typeof result === 'number' && isFinite(result) ? result : NaN;
        } catch {
          return NaN;
        }
      };
    } else if (type === 'implicit') {
      pe.fnImplicit = (x: number, y: number) => {
        try {
          const result = compiled.evaluate({ ...parameters, x, y });
          return typeof result === 'number' && isFinite(result) ? result : NaN;
        } catch {
          return NaN;
        }
      };
    } else if (type === '3d-surface' || type === '3d-contour') {
      pe.fn3D = (x: number, y: number) => {
        try {
          const result = compiled.evaluate({ ...parameters, x, y });
          return typeof result === 'number' && isFinite(result) ? result : NaN;
        } catch {
          return NaN;
        }
      };
    } else {
      pe.fn2D = (x: number) => {
        try {
          const result = compiled.evaluate({ ...parameters, x });
          return typeof result === 'number' && isFinite(result) ? result : NaN;
        } catch {
          return NaN;
        }
      };
    }

    return pe;
  } catch (e) {
    return {
      expression: { formula, type } as Expression,
      compiled: null,
      error: (e as Error).message,
    };
  }
}

export function detectExpressionType(formula: string): Expression['type'] {
  const f = formula.toLowerCase().trim();
  if (f.includes('z') && (f.includes('x') || f.includes('y'))) return '3d-surface';
  if (f.includes('=') && (f.includes('x') || f.includes('y'))) return 'implicit';
  if (f.includes('theta') || f.includes('r(') || f.startsWith('r=')) return 'polar';
  if (f.includes('x') || f.includes('y')) return '2d-line';
  return '2d-line';
}

export class GraphEngine {
  private container: HTMLElement;
  private canvas2D: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer3D: THREE.WebGLRenderer | null = null;
  private scene3D: THREE.Scene | null = null;
  private camera3D: THREE.PerspectiveCamera | null = null;
  private controls3D: OrbitControls | null = null;
  private surfaceMeshes: Map<string, THREE.Mesh> = new Map();

  private frameData: FrameData;
  private targetFrameData: FrameData | null = null;
  private animationStart: number = 0;
  private animationDuration: number = 400;
  private parsedExpressions: ParsedExpression[] = [];

  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private velocityX: number = 0;
  private velocityY: number = 0;
  private lastFrameTime: number = 0;
  private rafId: number | null = null;

  private touchStartDist: number = 0;
  private touchStartZoom: number = 1;

  private onViewChange?: (view: ViewState) => void;
  private needs3DRebuild: boolean = false;
  private is3DInitialized: boolean = false;

  constructor(
    container: HTMLElement,
    canvas: HTMLCanvasElement,
    initialData: FrameData,
    onViewChange?: (view: ViewState) => void
  ) {
    this.container = container;
    this.canvas2D = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D canvas context');
    this.ctx = ctx;
    this.frameData = initialData;
    this.onViewChange = onViewChange;
    this.reparseExpressions();
    this.attachEvents();
    this.resize();
    this.startRenderLoop();
  }

  public setFrameData(data: FrameData, animate: boolean = true): void {
    if (animate) {
      this.targetFrameData = JSON.parse(JSON.stringify(data));
      this.animationStart = performance.now();
    } else {
      this.frameData = JSON.parse(JSON.stringify(data));
      this.targetFrameData = null;
      this.reparseExpressions();
      if (this.frameData.viewState.mode === '3d') {
        this.needs3DRebuild = true;
        this.ensure3DInitialized();
      }
    }
    if (data.viewState.mode === '3d') {
      this.needs3DRebuild = true;
    }
  }

  public updateParameters(params: Parameters): void {
    this.frameData.parameters = { ...params };
    if (this.targetFrameData) this.targetFrameData.parameters = { ...params };
    this.reparseExpressions();
    if (this.frameData.viewState.mode === '3d') {
      this.update3DSurfaceData();
    }
  }

  public setMode(mode: '2d' | '3d'): void {
    const current = this.frameData.viewState;
    this.frameData.viewState = {
      ...current,
      mode,
      rotationX: mode === '3d' ? 30 : 0,
      rotationY: mode === '3d' ? 45 : 0,
    };
    if (mode === '3d') {
      this.ensure3DInitialized();
      this.needs3DRebuild = true;
    }
    if (this.onViewChange) this.onViewChange(this.frameData.viewState);
  }

  public getViewState(): ViewState {
    return { ...this.frameData.viewState };
  }

  public getFrameData(): FrameData {
    return JSON.parse(JSON.stringify(this.frameData));
  }

  public destroy(): void {
    this.detachEvents();
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    if (this.renderer3D) {
      this.renderer3D.dispose();
      if (this.renderer3D.domElement.parentNode) {
        this.renderer3D.domElement.parentNode.removeChild(this.renderer3D.domElement);
      }
    }
    if (this.controls3D) this.controls3D.dispose();
  }

  public resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas2D.getBoundingClientRect();
    this.canvas2D.width = rect.width * dpr;
    this.canvas2D.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    if (this.renderer3D && this.camera3D) {
      this.renderer3D.setSize(rect.width, rect.height);
      this.camera3D.aspect = rect.width / rect.height;
      this.camera3D.updateProjectionMatrix();
    }
  }

  public captureThumbnail(): string {
    try {
      const c = document.createElement('canvas');
      c.width = 200;
      c.height = 160;
      const ctx = c.getContext('2d');
      if (!ctx) return '';

      if (this.frameData.viewState.mode === '3d' && this.renderer3D) {
        const imgData = this.renderer3D.domElement.toDataURL('image/jpeg', 0.7);
        const img = new Image();
        img.src = imgData;
        return imgData;
      } else {
        ctx.drawImage(this.canvas2D, 0, 0, 200, 160);
        return c.toDataURL('image/jpeg', 0.7);
      }
    } catch {
      return '';
    }
  }

  private ensure3DInitialized(): void {
    if (this.is3DInitialized) return;
    this.init3D();
    this.is3DInitialized = true;
  }

  private init3D(): void {
    const rect = this.canvas2D.getBoundingClientRect();

    this.renderer3D = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer3D.setSize(rect.width, rect.height);
    this.renderer3D.setPixelRatio(window.devicePixelRatio || 1);
    this.renderer3D.domElement.style.position = 'absolute';
    this.renderer3D.domElement.style.top = '0';
    this.renderer3D.domElement.style.left = '0';
    this.renderer3D.domElement.style.width = '100%';
    this.renderer3D.domElement.style.height = '100%';
    this.renderer3D.domElement.style.pointerEvents = 'none';
    this.container.appendChild(this.renderer3D.domElement);

    this.scene3D = new THREE.Scene();
    const gradCanvas = document.createElement('canvas');
    gradCanvas.width = 2;
    gradCanvas.height = 256;
    const gctx = gradCanvas.getContext('2d')!;
    const grad = gctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, '#0d0d1a');
    grad.addColorStop(1, '#1a1a2e');
    gctx.fillStyle = grad;
    gctx.fillRect(0, 0, 2, 256);
    const bgTex = new THREE.CanvasTexture(gradCanvas);
    this.scene3D.background = bgTex;

    this.camera3D = new THREE.PerspectiveCamera(60, rect.width / rect.height, 0.1, 1000);
    this.camera3D.position.set(5, 5, 5);
    this.camera3D.lookAt(0, 0, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene3D.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(5, 10, 7);
    this.scene3D.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0x48dbfb, 0.3);
    fillLight.position.set(-5, 3, -5);
    this.scene3D.add(fillLight);

    const axesHelper = new THREE.AxesHelper(3);
    this.scene3D.add(axesHelper);

    const gridHelper = new THREE.GridHelper(10, 20, 0xffffff30, 0xffffff15);
    this.scene3D.add(gridHelper);

    this.controls3D = new OrbitControls(this.camera3D, this.renderer3D.domElement);
    this.controls3D.enableDamping = true;
    this.controls3D.dampingFactor = 0.08;
    this.controls3D.minDistance = 2;
    this.controls3D.maxDistance = 20;
    this.controls3D.maxPolarAngle = (70 * Math.PI) / 180;
    this.controls3D.minPolarAngle = (-45 * Math.PI) / 180;
    this.controls3D.zoomSpeed = 1.0;
    this.controls3D.rotateSpeed = 0.8;
    this.controls3D.panSpeed = 0.8;
    this.controls3D.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };

    this.controls3D.addEventListener('change', () => {
      if (!this.camera3D) return;
      const spherical = new THREE.Spherical();
      spherical.setFromVector3(this.camera3D.position);
      const vs = this.frameData.viewState;
      vs.rotationX = (spherical.phi * 180) / Math.PI - 90;
      vs.rotationY = (spherical.theta * 180) / Math.PI;
      vs.zoom = spherical.radius / 5;
      if (this.onViewChange) this.onViewChange({ ...vs });
    });
  }

  private reparseExpressions(): void {
    this.parsedExpressions = this.frameData.expressions
      .filter((e) => e.visible && e.formula.trim())
      .map((expr) => {
        const pe = parseExpression(expr.formula, this.frameData.parameters, expr.type);
        (pe.expression as Expression) = expr;
        return pe;
      })
      .filter((pe) => !pe.error);
  }

  private build3DSurfaces(): void {
    if (!this.scene3D) return;

    for (const [id, mesh] of this.surfaceMeshes) {
      this.scene3D.remove(mesh);
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
    }
    this.surfaceMeshes.clear();

    const vs = this.frameData.viewState;
    const sizeX = vs.xRange[1] - vs.xRange[0];
    const sizeY = vs.yRange[1] - vs.yRange[0];

    for (const pe of this.parsedExpressions) {
      if (pe.expression.type !== '3d-surface' && pe.expression.type !== '3d-contour') continue;
      if (!pe.fn3D) continue;

      const resolution = 80;
      const geometry = new THREE.PlaneGeometry(sizeX, sizeY, resolution - 1, resolution - 1);
      geometry.rotateX(-Math.PI / 2);

      const positions = geometry.attributes.position;
      const colors = new Float32Array(positions.count * 3);
      let minZ = Infinity;
      let maxZ = -Infinity;
      const zValues: number[] = [];

      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i);
        const y = positions.getZ(i);
        const z = pe.fn3D(x, y);
        const zClamped = isFinite(z) ? Math.max(-10, Math.min(10, z)) : 0;
        positions.setY(i, zClamped);
        zValues.push(zClamped);
        minZ = Math.min(minZ, zClamped);
        maxZ = Math.max(maxZ, zClamped);
      }

      if (minZ === maxZ) { minZ -= 0.5; maxZ += 0.5; }
      const rangeZ = maxZ - minZ || 1;

      const baseColor = new THREE.Color(pe.expression.color);
      for (let i = 0; i < positions.count; i++) {
        const t = (zValues[i] - minZ) / rangeZ;
        const lightness = 0.35 + t * 0.65;
        const c = baseColor.clone().offsetHSL(0, 0, lightness - 0.5);
        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
      }

      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      geometry.computeVertexNormals();

      let material: THREE.Material;
      if (pe.expression.type === '3d-contour') {
        material = new THREE.MeshBasicMaterial({
          vertexColors: true,
          wireframe: true,
          transparent: true,
          opacity: 0.9,
        });
      } else {
        material = new THREE.MeshPhysicalMaterial({
          vertexColors: true,
          side: THREE.DoubleSide,
          roughness: 0.6,
          metalness: 0.1,
          clearcoat: 0.2,
          transparent: true,
          opacity: 0.95,
        });
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set((vs.xRange[0] + vs.xRange[1]) / 2, 0, (vs.yRange[0] + vs.yRange[1]) / 2);
      this.scene3D.add(mesh);
      this.surfaceMeshes.set(pe.expression.id, mesh);
    }

    this.needs3DRebuild = false;
  }

  private update3DSurfaceData(): void {
    if (!this.scene3D || this.surfaceMeshes.size === 0) {
      this.needs3DRebuild = true;
      return;
    }

    const vs = this.frameData.viewState;
    for (const pe of this.parsedExpressions) {
      if (pe.expression.type !== '3d-surface' && pe.expression.type !== '3d-contour') continue;
      if (!pe.fn3D) continue;
      const mesh = this.surfaceMeshes.get(pe.expression.id);
      if (!mesh) continue;

      const positions = mesh.geometry.attributes.position;
      const colors = mesh.geometry.attributes.color as THREE.BufferAttribute;
      let minZ = Infinity;
      let maxZ = -Infinity;
      const zValues: number[] = [];

      for (let i = 0; i < positions.count; i++) {
        const x = positions.getX(i) + vs.xRange[0];
        const y = positions.getZ(i) + vs.yRange[0];
        const z = pe.fn3D(x, y);
        const zClamped = isFinite(z) ? Math.max(-10, Math.min(10, z)) : 0;
        positions.setY(i, zClamped);
        zValues.push(zClamped);
        minZ = Math.min(minZ, zClamped);
        maxZ = Math.max(maxZ, zClamped);
      }
      positions.needsUpdate = true;

      if (minZ === maxZ) { minZ -= 0.5; maxZ += 0.5; }
      const rangeZ = maxZ - minZ || 1;
      const baseColor = new THREE.Color(pe.expression.color);

      for (let i = 0; i < positions.count; i++) {
        const t = (zValues[i] - minZ) / rangeZ;
        const lightness = 0.35 + t * 0.65;
        const c = baseColor.clone().offsetHSL(0, 0, lightness - 0.5);
        colors.setXYZ(i, c.r, c.g, c.b);
      }
      colors.needsUpdate = true;

      mesh.geometry.computeVertexNormals();
    }
  }

  private attachEvents(): void {
    this.canvas2D.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    this.canvas2D.addEventListener('wheel', this.onWheel, { passive: false });
    this.canvas2D.addEventListener('touchstart', this.onTouchStart, { passive: false });
    this.canvas2D.addEventListener('touchmove', this.onTouchMove, { passive: false });
    this.canvas2D.addEventListener('touchend', this.onTouchEnd);
    window.addEventListener('resize', this.resize);
  }

  private detachEvents(): void {
    this.canvas2D.removeEventListener('mousedown', this.onMouseDown);
    window.removeEventListener('mousemove', this.onMouseMove);
    window.removeEventListener('mouseup', this.onMouseUp);
    this.canvas2D.removeEventListener('wheel', this.onWheel);
    this.canvas2D.removeEventListener('touchstart', this.onTouchStart);
    this.canvas2D.removeEventListener('touchmove', this.onTouchMove);
    this.canvas2D.removeEventListener('touchend', this.onTouchEnd);
    window.removeEventListener('resize', this.resize);
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (this.frameData.viewState.mode === '3d') return;
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.velocityX = 0;
    this.velocityY = 0;
    this.canvas2D.style.cursor = 'grabbing';
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (this.frameData.viewState.mode === '3d') return;
    if (!this.isDragging) return;
    const dx = e.clientX - this.lastMouseX;
    const dy = e.clientY - this.lastMouseY;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    const now = performance.now();
    const dt = Math.max(now - this.lastFrameTime, 1);
    this.velocityX = (dx / dt) * 16;
    this.velocityY = (dy / dt) * 16;
    this.applyDrag(dx, dy, e.shiftKey);
    this.lastFrameTime = now;
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
    this.canvas2D.style.cursor = 'grab';
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    if (this.frameData.viewState.mode === '3d') return;

    const delta = -e.deltaY * 0.001;
    const vs = this.frameData.viewState;
    const newZoom = Math.min(5, Math.max(0.5, vs.zoom * (1 + delta)));
    vs.zoom = this.inertialDamp(vs.zoom, newZoom, 0.3);
    if (this.onViewChange) this.onViewChange(vs);
  };

  private inertialDamp(current: number, target: number, factor: number): number {
    return current + (target - current) * factor;
  }

  private onTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (this.frameData.viewState.mode === '3d') return;
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      this.touchStartDist = Math.sqrt(dx * dx + dy * dy);
      this.touchStartZoom = this.frameData.viewState.zoom;
    }
  };

  private onTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (this.frameData.viewState.mode === '3d') return;
    if (e.touches.length === 1 && this.isDragging) {
      const dx = e.touches[0].clientX - this.lastMouseX;
      const dy = e.touches[0].clientY - this.lastMouseY;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
      this.applyDrag(dx, dy, false);
    } else if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const scale = dist / this.touchStartDist;
      const vs = this.frameData.viewState;
      vs.zoom = Math.min(5, Math.max(0.5, this.touchStartZoom * scale));
      const cx1 = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const cy1 = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      if (this.lastMouseX !== -999) {
        const rdx = cx1 - this.lastMouseX;
        const rdy = cy1 - this.lastMouseY;
        vs.panX += rdx / vs.zoom;
        vs.panY += rdy / vs.zoom;
      }
      this.lastMouseX = cx1;
      this.lastMouseY = cy1;
      if (this.onViewChange) this.onViewChange(vs);
    }
  };

  private onTouchEnd = (): void => {
    this.isDragging = false;
    this.lastMouseX = -999;
  };

  private applyDrag(dx: number, dy: number, _pan: boolean): void {
    const vs = this.frameData.viewState;
    vs.panX += dx / vs.zoom;
    vs.panY += dy / vs.zoom;
    if (this.onViewChange) this.onViewChange(vs);
  }

  private startRenderLoop(): void {
    const loop = () => {
      this.render();
      this.rafId = requestAnimationFrame(loop);
    };
    loop();
  }

  private render(): void {
    const now = performance.now();
    if (this.targetFrameData) {
      const t = Math.min(1, (now - this.animationStart) / this.animationDuration);
      const ease = easeInOutCubic(t);
      this.interpolateFrameData(ease);
      if (t >= 1) {
        this.frameData = this.targetFrameData;
        this.targetFrameData = null;
        this.reparseExpressions();
        if (this.frameData.viewState.mode === '3d') {
          this.needs3DRebuild = true;
        }
      }
    }

    if (this.frameData.viewState.mode === '3d') {
      this.canvas2D.style.display = 'none';
      if (this.renderer3D) {
        this.renderer3D.domElement.style.display = 'block';
        this.renderer3D.domElement.style.pointerEvents = 'auto';
      }
      if (this.needs3DRebuild) this.build3DSurfaces();
      if (this.controls3D) this.controls3D.update();
      if (this.renderer3D && this.scene3D && this.camera3D) {
        this.renderer3D.render(this.scene3D, this.camera3D);
      }
      return;
    }

    this.canvas2D.style.display = 'block';
    if (this.renderer3D) {
      this.renderer3D.domElement.style.display = 'none';
      this.renderer3D.domElement.style.pointerEvents = 'none';
    }

    if (!this.isDragging) {
      const vs = this.frameData.viewState;
      if (Math.abs(this.velocityX) > 0.1 || Math.abs(this.velocityY) > 0.1) {
        vs.panX += this.velocityX * 0.05 / vs.zoom;
        vs.panY += this.velocityY * 0.05 / vs.zoom;
        this.velocityX *= 0.92;
        this.velocityY *= 0.92;
        if (this.onViewChange) this.onViewChange(vs);
      }
    }

    this.draw2D();
  }

  private interpolateFrameData(t: number): void {
    if (!this.targetFrameData) return;
    const src = this.frameData.viewState;
    const dst = this.targetFrameData.viewState;
    this.frameData.viewState = {
      mode: dst.mode,
      rotationX: src.rotationX + (dst.rotationX - src.rotationX) * t,
      rotationY: src.rotationY + (dst.rotationY - src.rotationY) * t,
      zoom: src.zoom + (dst.zoom - src.zoom) * t,
      panX: src.panX + (dst.panX - src.panX) * t,
      panY: src.panY + (dst.panY - src.panY) * t,
      xRange: [
        src.xRange[0] + (dst.xRange[0] - src.xRange[0]) * t,
        src.xRange[1] + (dst.xRange[1] - src.xRange[1]) * t,
      ],
      yRange: [
        src.yRange[0] + (dst.yRange[0] - src.yRange[0]) * t,
        src.yRange[1] + (dst.yRange[1] - src.yRange[1]) * t,
      ],
      zRange: [
        src.zRange[0] + (dst.zRange[0] - src.zRange[0]) * t,
        src.zRange[1] + (dst.zRange[1] - src.zRange[1]) * t,
      ],
    };
    if (!this.targetFrameData || t >= 1) this.reparseExpressions();
  }

  private draw2D(): void {
    const rect = this.canvas2D.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const vs = this.frameData.viewState;

    const grad = this.ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0d0d1a');
    grad.addColorStop(1, '#1a1a2e');
    this.ctx.fillStyle = grad;
    this.ctx.fillRect(0, 0, w, h);

    this.ctx.save();
    this.ctx.translate(w / 2 + vs.panX, h / 2 + vs.panY);
    this.ctx.scale(vs.zoom, vs.zoom);

    this.drawGrid2D(w, h);
    this.drawAxes2D(w, h);
    for (const pe of this.parsedExpressions) {
      if (pe.expression.type === 'polar' && pe.fnPolar) this.drawPolar(pe, w, h);
      else if (pe.expression.type === 'implicit' && pe.fnImplicit) this.drawImplicit(pe, w, h);
      else if (pe.expression.type === '2d-scatter' && pe.fn2D) this.drawScatter(pe, w, h);
      else if (pe.fn2D) this.drawLine2D(pe, w, h);
    }

    this.ctx.restore();
  }

  private worldToScreen2D(x: number, y: number, w: number, h: number): [number, number] {
    const vs = this.frameData.viewState;
    const sx = ((x - vs.xRange[0]) / (vs.xRange[1] - vs.xRange[0]) - 0.5) * Math.min(w, h) * 0.8;
    const sy = -((y - vs.yRange[0]) / (vs.yRange[1] - vs.yRange[0]) - 0.5) * Math.min(w, h) * 0.8;
    return [sx, sy];
  }

  private drawGrid2D(w: number, h: number): void {
    const vs = this.frameData.viewState;
    this.ctx.strokeStyle = '#ffffff10';
    this.ctx.lineWidth = 1 / vs.zoom;
    const step = this.getNiceStep(vs.xRange[1] - vs.xRange[0]);
    for (let x = Math.ceil(vs.xRange[0] / step) * step; x <= vs.xRange[1]; x += step) {
      const [sx1, sy1] = this.worldToScreen2D(x, vs.yRange[0], w, h);
      const [sx2, sy2] = this.worldToScreen2D(x, vs.yRange[1], w, h);
      this.ctx.beginPath();
      this.ctx.moveTo(sx1, sy1);
      this.ctx.lineTo(sx2, sy2);
      this.ctx.stroke();
    }
    const ystep = this.getNiceStep(vs.yRange[1] - vs.yRange[0]);
    for (let y = Math.ceil(vs.yRange[0] / ystep) * ystep; y <= vs.yRange[1]; y += ystep) {
      const [sx1, sy1] = this.worldToScreen2D(vs.xRange[0], y, w, h);
      const [sx2, sy2] = this.worldToScreen2D(vs.xRange[1], y, w, h);
      this.ctx.beginPath();
      this.ctx.moveTo(sx1, sy1);
      this.ctx.lineTo(sx2, sy2);
      this.ctx.stroke();
    }
  }

  private drawAxes2D(w: number, h: number): void {
    this.ctx.strokeStyle = '#ffffff40';
    this.ctx.lineWidth = 1.5 / this.frameData.viewState.zoom;
    const vs = this.frameData.viewState;
    const [ox, oy] = this.worldToScreen2D(0, 0, w, h);
    const [x1, y1] = this.worldToScreen2D(vs.xRange[0], 0, w, h);
    const [x2, y2] = this.worldToScreen2D(vs.xRange[1], 0, w, h);
    const [x3, y3] = this.worldToScreen2D(0, vs.yRange[0], w, h);
    const [x4, y4] = this.worldToScreen2D(0, vs.yRange[1], w, h);
    this.ctx.beginPath();
    this.ctx.moveTo(Math.min(x1, x2), oy);
    this.ctx.lineTo(Math.max(x1, x2), oy);
    this.ctx.moveTo(ox, Math.min(y3, y4));
    this.ctx.lineTo(ox, Math.max(y3, y4));
    this.ctx.stroke();

    this.ctx.fillStyle = '#ffffff80';
    this.ctx.font = `${12 / this.frameData.viewState.zoom}px sans-serif`;
    this.ctx.textAlign = 'center';
    const step = this.getNiceStep(vs.xRange[1] - vs.xRange[0]);
    for (let x = Math.ceil(vs.xRange[0] / step) * step; x <= vs.xRange[1]; x += step) {
      if (Math.abs(x) < 0.0001) continue;
      const [sx, sy] = this.worldToScreen2D(x, 0, w, h);
      this.ctx.fillText(x.toFixed(Math.abs(x) < 1 ? 2 : 0), sx, sy + 15 / vs.zoom);
    }
    const ystep = this.getNiceStep(vs.yRange[1] - vs.yRange[0]);
    for (let y = Math.ceil(vs.yRange[0] / ystep) * ystep; y <= vs.yRange[1]; y += ystep) {
      if (Math.abs(y) < 0.0001) continue;
      const [sx, sy] = this.worldToScreen2D(0, y, w, h);
      this.ctx.textAlign = 'right';
      this.ctx.fillText(y.toFixed(Math.abs(y) < 1 ? 2 : 0), sx - 6 / vs.zoom, sy + 4 / vs.zoom);
    }
  }

  private drawLine2D(pe: ParsedExpression, w: number, h: number): void {
    const vs = this.frameData.viewState;
    const samples = 800;
    const dx = (vs.xRange[1] - vs.xRange[0]) / samples;
    this.ctx.strokeStyle = pe.expression.color;
    this.ctx.lineWidth = 2 / vs.zoom;
    this.ctx.lineJoin = 'round';
    this.ctx.beginPath();
    let started = false;
    let prevY = NaN;

    for (let i = 0; i <= samples; i++) {
      const x = vs.xRange[0] + i * dx;
      const y = pe.fn2D!(x);
      if (!isFinite(y) || Math.abs(y) > 1e6 || (isFinite(prevY) && Math.abs(y - prevY) > (vs.yRange[1] - vs.yRange[0]) * 10)) {
        started = false;
      } else {
        const [sx, sy] = this.worldToScreen2D(x, y, w, h);
        if (!started) {
          this.ctx.moveTo(sx, sy);
          started = true;
        } else {
          this.ctx.lineTo(sx, sy);
        }
      }
      prevY = y;
    }
    this.ctx.stroke();
  }

  private drawPolar(pe: ParsedExpression, w: number, h: number): void {
    const vs = this.frameData.viewState;
    const samples = 800;
    this.ctx.strokeStyle = pe.expression.color;
    this.ctx.lineWidth = 2 / vs.zoom;
    this.ctx.beginPath();
    for (let i = 0; i <= samples; i++) {
      const theta = (i / samples) * Math.PI * 8;
      const r = pe.fnPolar!(theta);
      if (!isFinite(r)) continue;
      const x = r * Math.cos(theta);
      const y = r * Math.sin(theta);
      const [sx, sy] = this.worldToScreen2D(x, y, w, h);
      if (i === 0) this.ctx.moveTo(sx, sy);
      else this.ctx.lineTo(sx, sy);
    }
    this.ctx.stroke();
  }

  private drawScatter(pe: ParsedExpression, w: number, h: number): void {
    const vs = this.frameData.viewState;
    const samples = 120;
    const dx = (vs.xRange[1] - vs.xRange[0]) / samples;
    this.ctx.fillStyle = pe.expression.color;
    for (let i = 0; i <= samples; i++) {
      const x = vs.xRange[0] + i * dx;
      const y = pe.fn2D!(x);
      if (!isFinite(y)) continue;
      const [sx, sy] = this.worldToScreen2D(x, y, w, h);
      this.ctx.beginPath();
      this.ctx.arc(sx, sy, 3 / vs.zoom, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private drawImplicit(pe: ParsedExpression, w: number, h: number): void {
    const vs = this.frameData.viewState;
    const steps = 250;
    const dx = (vs.xRange[1] - vs.xRange[0]) / steps;
    const dy = (vs.yRange[1] - vs.yRange[0]) / steps;
    const grid: number[][] = [];
    for (let j = 0; j <= steps; j++) {
      grid[j] = [];
      for (let i = 0; i <= steps; i++) {
        const x = vs.xRange[0] + i * dx;
        const y = vs.yRange[0] + j * dy;
        grid[j][i] = pe.fnImplicit!(x, y);
      }
    }
    this.ctx.strokeStyle = pe.expression.color;
    this.ctx.lineWidth = 2 / vs.zoom;
    for (let j = 0; j < steps; j++) {
      for (let i = 0; i < steps; i++) {
        const v00 = grid[j][i], v10 = grid[j][i + 1], v01 = grid[j + 1][i], v11 = grid[j + 1][i + 1];
        const x0 = vs.xRange[0] + i * dx, x1 = x0 + dx;
        const y0 = vs.yRange[0] + j * dy, y1 = y0 + dy;
        const edges: [number, number, number, number][] = [];
        if ((v00 < 0) !== (v10 < 0)) {
          const t = v00 / (v00 - v10);
          edges.push([x0 + t * dx, y0, -1, -1]);
        }
        if ((v10 < 0) !== (v11 < 0)) {
          const t = v10 / (v10 - v11);
          if (edges[edges.length - 1] && edges[edges.length - 1][2] === -1) {
            edges[edges.length - 1][2] = x1;
            edges[edges.length - 1][3] = y0 + t * dy;
          } else edges.push([-1, -1, x1, y0 + t * dy]);
        }
        if ((v01 < 0) !== (v11 < 0)) {
          const t = v01 / (v01 - v11);
          if (edges[edges.length - 1] && edges[edges.length - 1][2] === -1) {
            edges[edges.length - 1][2] = x0 + t * dx;
            edges[edges.length - 1][3] = y1;
          } else edges.push([-1, -1, x0 + t * dx, y1]);
        }
        if ((v00 < 0) !== (v01 < 0)) {
          const t = v00 / (v00 - v01);
          if (edges[edges.length - 1] && edges[edges.length - 1][2] === -1) {
            edges[edges.length - 1][2] = x0;
            edges[edges.length - 1][3] = y0 + t * dy;
          } else edges.push([-1, -1, x0, y0 + t * dy]);
        }
        for (const e of edges) {
          if (e[2] === -1) continue;
          const [sx1, sy1] = this.worldToScreen2D(e[0], e[1], w, h);
          const [sx2, sy2] = this.worldToScreen2D(e[2], e[3], w, h);
          this.ctx.beginPath();
          this.ctx.moveTo(sx1, sy1);
          this.ctx.lineTo(sx2, sy2);
          this.ctx.stroke();
        }
      }
    }
  }

  private getNiceStep(range: number): number {
    const rough = range / 10;
    const pow = Math.pow(10, Math.floor(Math.log10(rough)));
    const n = rough / pow;
    if (n < 1.5) return pow;
    if (n < 3) return 2 * pow;
    if (n < 7) return 5 * pow;
    return 10 * pow;
  }
}

export const FUNCTION_TEMPLATES: { label: string; template: string; desc: string; lang: string }[] = [
  { label: 'sin(x)', template: 'sin(x)', desc: 'Sine function', lang: 'en' },
  { label: 'cos(x)', template: 'cos(x)', desc: 'Cosine function', lang: 'en' },
  { label: 'tan(x)', template: 'tan(x)', desc: 'Tangent function', lang: 'en' },
  { label: 'sin(x)', template: 'sin(x)', desc: '正弦函数', lang: 'zh' },
  { label: 'cos(x)', template: 'cos(x)', desc: '余弦函数', lang: 'zh' },
  { label: 'tan(x)', template: 'tan(x)', desc: '正切函数', lang: 'zh' },
  { label: 'exp(x)', template: 'exp(x)', desc: 'Exponential e^x', lang: 'en' },
  { label: 'log(x)', template: 'log(x)', desc: 'Natural logarithm', lang: 'en' },
  { label: 'log(x, base)', template: 'log(x, 10)', desc: 'Log with custom base', lang: 'en' },
  { label: 'pow(x, n)', template: 'pow(x, 2)', desc: 'Power function x^n', lang: 'en' },
  { label: 'exp(x)', template: 'exp(x)', desc: '指数函数 e^x', lang: 'zh' },
  { label: 'log(x)', template: 'log(x)', desc: '自然对数', lang: 'zh' },
  { label: 'log(x, base)', template: 'log(x, 10)', desc: '对数函数(可指定底)', lang: 'zh' },
  { label: 'pow(x, n)', template: 'pow(x, 2)', desc: '幂函数 x^n', lang: 'zh' },
  { label: 'sqrt(x)', template: 'sqrt(x)', desc: 'Square root', lang: 'en' },
  { label: 'abs(x)', template: 'abs(x)', desc: 'Absolute value', lang: 'en' },
  { label: 'floor(x)', template: 'floor(x)', desc: 'Floor (round down)', lang: 'en' },
  { label: 'ceil(x)', template: 'ceil(x)', desc: 'Ceiling (round up)', lang: 'en' },
  { label: 'sqrt(x)', template: 'sqrt(x)', desc: '平方根', lang: 'zh' },
  { label: 'abs(x)', template: 'abs(x)', desc: '绝对值', lang: 'zh' },
  { label: 'floor(x)', template: 'floor(x)', desc: '向下取整', lang: 'zh' },
  { label: 'ceil(x)', template: 'ceil(x)', desc: '向上取整', lang: 'zh' },
  { label: 'a*sin(b*x)', template: 'a*sin(b*x)', desc: 'Sine with amplitude a, freq b', lang: 'en' },
  { label: 'sin(x)*cos(a*x)', template: 'sin(x)*cos(a*x)', desc: 'AM modulated wave', lang: 'en' },
  { label: 'a*sin(b*x)', template: 'a*sin(b*x)', desc: '振幅a频率b的正弦波', lang: 'zh' },
  { label: 'sin(x)*cos(a*x)', template: 'sin(x)*cos(a*x)', desc: '带参数a的调制波', lang: 'zh' },
  { label: 'x^2+y^2', template: 'x^2 + y^2', desc: '3D paraboloid', lang: 'en' },
  { label: 'sin(sqrt(x^2+y^2))', template: 'sin(sqrt(x^2 + y^2))', desc: '3D ripples', lang: 'en' },
  { label: 'x^2+y^2', template: 'x^2 + y^2', desc: '3D抛物面', lang: 'zh' },
  { label: 'sin(sqrt(x^2+y^2))', template: 'sin(sqrt(x^2 + y^2))', desc: '3D涟漪曲面', lang: 'zh' },
  { label: 'r=cos(2*theta)', template: 'cos(2*theta)', desc: '4-leaf rose (polar)', lang: 'en' },
  { label: 'x^2+y^2=r^2', template: 'x^2 + y^2 = 4', desc: 'Circle (implicit)', lang: 'en' },
  { label: 'r=cos(2*theta)', template: 'cos(2*theta)', desc: '四叶玫瑰线(极坐标)', lang: 'zh' },
  { label: 'x^2+y^2=r^2', template: 'x^2 + y^2 = 4', desc: '圆形(隐函数)', lang: 'zh' },
];
