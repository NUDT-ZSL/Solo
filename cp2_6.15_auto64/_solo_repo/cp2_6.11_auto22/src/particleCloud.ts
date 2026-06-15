import * as THREE from 'three';
import { SampledParticle, hexToRgb } from './utils';

const MAX_PARTICLES = 3000;
const Z_SCALE = 30;
const Z_MIN = -60;
const Z_MAX = 60;
const Y_ROT_SPEED = 0.5 * Math.PI / 180;
const ROT_PER_PIXEL = 0.3 * Math.PI / 180;
const MIN_ZOOM = 0.3;
const MAX_ZOOM = 3.0;

interface ParticleRuntime {
  baseX: number; baseY: number; baseZ: number;
  baseSize: number;
  normalX: number; normalY: number; normalZ: number;
  amplitude: number;
  frequency: number;
  phase: number;
  color: THREE.Color;
  orig2D: { x: number; y: number };
  colorHex: string;
  segmentId: number;
}

interface SegmentRecord {
  id: number;
  count: number;
  startIndex: number;
}

export class ParticleCloud {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private threeCanvas: HTMLCanvasElement;
  private drawCanvas: HTMLCanvasElement;
  private container: HTMLElement;
  private tooltipEl: HTMLElement;

  private points: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.ShaderMaterial | null = null;

  private runtime: ParticleRuntime[] = [];
  private segments: SegmentRecord[] = [];
  private totalCount = 0;

  private positionAttr: Float32Array | null = null;
  private colorAttr: Float32Array | null = null;
  private sizeAttr: Float32Array | null = null;
  private centerDistAttr: Float32Array | null = null;

  private rotX = 0;
  private rotY = 0;
  private targetRotX = 0;
  private targetRotY = 0;
  private zoom = 1;
  private targetZoom = 1;

  private isDragging = false;
  private lastX = 0;
  private lastY = 0;

  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private hoveredIndex = -1;

  private startTime = performance.now();

  constructor(
    threeCanvas: HTMLCanvasElement,
    drawCanvas: HTMLCanvasElement,
    container: HTMLElement,
    tooltipEl: HTMLElement
  ) {
    this.threeCanvas = threeCanvas;
    this.drawCanvas = drawCanvas;
    this.container = container;
    this.tooltipEl = tooltipEl;

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.camera = new THREE.PerspectiveCamera(
      50,
      threeCanvas.clientWidth / threeCanvas.clientHeight,
      0.1,
      5000
    );
    this.camera.position.set(0, 0, 380);

    this.renderer = new THREE.WebGLRenderer({
      canvas: threeCanvas,
      antialias: true,
      alpha: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);

    this.bindEvents();
    this.resize();
  }

  resize(): void {
    const w = this.drawCanvas.clientWidth;
    const h = this.drawCanvas.clientHeight;
    this.renderer.setSize(w, h, false);
    this.threeCanvas.style.width = w + 'px';
    this.threeCanvas.style.height = h + 'px';
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  private bindEvents(): void {
    const el = this.threeCanvas;
    el.addEventListener('mousedown', this.onMouseDown);
    window.addEventListener('mousemove', this.onMouseMove);
    window.addEventListener('mouseup', this.onMouseUp);
    el.addEventListener('wheel', this.onWheel, { passive: false });
    el.addEventListener('mouseleave', this.onLeave);
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.lastX = e.clientX;
    this.lastY = e.clientY;
  };

  private onMouseUp = (): void => {
    this.isDragging = false;
  };

  private onLeave = (): void => {
    this.isDragging = false;
    this.hideTooltip();
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (this.isDragging) {
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.targetRotY += dx * ROT_PER_PIXEL;
      this.targetRotX += dy * ROT_PER_PIXEL;
      const lim = Math.PI * 0.48;
      this.targetRotX = Math.max(-lim, Math.min(lim, this.targetRotX));
    }
    this.updateHover(e);
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    this.targetZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, this.targetZoom * factor));
  };

  private updateHover(e: MouseEvent): void {
    if (!this.points || this.runtime.length === 0) { this.hideTooltip(); return; }
    const r = this.threeCanvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    this.mouse.y = -((e.clientY - r.top) / r.height) * 2 + 1;
    this.raycaster.setFromCamera(this.mouse, this.camera);
    this.raycaster.params.Points = { threshold: 14 };
    const hits = this.raycaster.intersectObject(this.points, false);
    if (hits.length > 0 && hits[0].index !== undefined) {
      this.hoveredIndex = hits[0].index;
      const rp = this.runtime[this.hoveredIndex];
      if (rp) {
        this.showTooltip(e.clientX, e.clientY, rp);
        return;
      }
    }
    this.hoveredIndex = -1;
    this.hideTooltip();
  }

  private showTooltip(x: number, y: number, p: ParticleRuntime): void {
    const el = this.tooltipEl;
    el.textContent = `x: ${Math.round(p.orig2D.x)}, y: ${Math.round(p.orig2D.y)}  |  ${p.colorHex.toUpperCase()}`;
    el.style.left = (x + 14) + 'px';
    el.style.top = (y + 14) + 'px';
    el.classList.add('visible');
  }

  private hideTooltip(): void {
    this.tooltipEl.classList.remove('visible');
  }

  addParticles(particles: SampledParticle[], segmentId: number): void {
    if (particles.length === 0) return;

    const needed = this.totalCount + particles.length;
    if (needed > MAX_PARTICLES) {
      this.dropSegmentsFor(needed - MAX_PARTICLES);
    }

    const startIndex = this.totalCount;
    for (const p of particles) {
      if (this.totalCount >= MAX_PARTICLES) break;
      const z = Math.max(Z_MIN, Math.min(Z_MAX, p.curvature * Z_SCALE * (Math.random() * 0.6 + 0.7)));
      const cw = this.drawCanvas.clientWidth;
      const ch = this.drawCanvas.clientHeight;
      const baseX = p.x - cw / 2;
      const baseY = -(p.y - ch / 2);
      const { tx: tnx, ty: tny, tz: tnz } = this.build3DNormal(p.normalX, p.normalY);
      const rgb = hexToRgb(p.color);
      const col = new THREE.Color(rgb.r / 255, rgb.g / 255, rgb.b / 255);
      this.runtime.push({
        baseX, baseY, baseZ: z,
        baseSize: 3 + Math.random() * 5,
        normalX: tnx, normalY: tny, normalZ: tnz,
        amplitude: 2 + Math.random() * 2,
        frequency: 0.8 + Math.random() * 0.4,
        phase: Math.random() * Math.PI * 2,
        color: col,
        orig2D: { x: p.x, y: p.y },
        colorHex: p.color,
        segmentId
      });
      this.totalCount++;
    }
    const added = this.totalCount - startIndex;
    if (added > 0) {
      this.segments.push({ id: segmentId, count: added, startIndex });
      this.rebuildGeometry();
    }
  }

  removeSegment(segmentId: number): void {
    const idx = this.segments.findIndex(s => s.id === segmentId);
    if (idx < 0) return;
    const seg = this.segments[idx];
    this.runtime.splice(seg.startIndex, seg.count);
    this.totalCount -= seg.count;
    this.segments.splice(idx, 1);
    for (let i = idx; i < this.segments.length; i++) {
      this.segments[i].startIndex -= seg.count;
    }
    this.rebuildGeometry();
  }

  private dropSegmentsFor(needRemove: number): void {
    let removed = 0;
    while (removed < needRemove && this.segments.length > 0) {
      const seg = this.segments.shift()!;
      this.runtime.splice(seg.startIndex, seg.count);
      this.totalCount -= seg.count;
      removed += seg.count;
      for (let i = 0; i < this.segments.length; i++) {
        this.segments[i].startIndex -= seg.count;
      }
    }
    if (removed > 0) this.rebuildGeometry();
  }

  private build3DNormal(nx: number, ny: number): { tx: number; ty: number; tz: number } {
    const len2d = Math.sqrt(nx * nx + ny * ny) || 1;
    const ux = nx / len2d;
    const uy = ny / len2d;
    const nzBias = (Math.random() - 0.5) * 0.8;
    const total = Math.sqrt(ux * ux + uy * uy + nzBias * nzBias) || 1;
    return { tx: ux / total, ty: uy / total, tz: nzBias / total };
  }

  resetView(): void {
    this.targetRotX = 0;
    this.targetRotY = 0;
    this.targetZoom = 1;
  }

  resetAll(): void {
    this.runtime = [];
    this.segments = [];
    this.totalCount = 0;
    this.disposeGeometry();
    this.resetView();
  }

  private disposeGeometry(): void {
    if (this.geometry) { this.geometry.dispose(); this.geometry = null; }
    if (this.material) { this.material.dispose(); this.material = null; }
    this.points = null;
    this.positionAttr = null;
    this.colorAttr = null;
    this.sizeAttr = null;
    this.centerDistAttr = null;
  }

  private rebuildGeometry(): void {
    this.disposeGeometry();
    if (this.totalCount === 0) return;

    const N = this.totalCount;
    this.positionAttr = new Float32Array(N * 3);
    this.colorAttr = new Float32Array(N * 3);
    this.sizeAttr = new Float32Array(N);
    this.centerDistAttr = new Float32Array(N);

    let maxDist = 1;
    for (let i = 0; i < N; i++) {
      const p = this.runtime[i];
      this.positionAttr[i * 3] = p.baseX;
      this.positionAttr[i * 3 + 1] = p.baseY;
      this.positionAttr[i * 3 + 2] = p.baseZ;
      this.colorAttr[i * 3] = p.color.r;
      this.colorAttr[i * 3 + 1] = p.color.g;
      this.colorAttr[i * 3 + 2] = p.color.b;
      this.sizeAttr[i] = p.baseSize;
      const d = Math.sqrt(p.baseX * p.baseX + p.baseY * p.baseY + p.baseZ * p.baseZ);
      this.centerDistAttr[i] = d;
      if (d > maxDist) maxDist = d;
    }
    for (let i = 0; i < N; i++) this.centerDistAttr[i] = 1 - this.centerDistAttr[i] / maxDist * 0.6;

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positionAttr, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colorAttr, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizeAttr, 1));
    this.geometry.setAttribute('aCenterWeight', new THREE.BufferAttribute(this.centerDistAttr, 1));

    this.material = this.buildShaderMaterial();

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);
  }

  private buildShaderMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uPixelRatio: { value: this.renderer.getPixelRatio() }
      },
      vertexShader: `
        attribute float aSize;
        attribute float aCenterWeight;
        varying vec3 vColor;
        varying float vCenterWeight;
        varying float vSize;
        uniform float uPixelRatio;
        void main() {
          vColor = color;
          vCenterWeight = aCenterWeight;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          float size = aSize;
          gl_PointSize = size * uPixelRatio * (300.0 / -mv.z);
          vSize = size;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vCenterWeight;
        varying float vSize;
        void main() {
          vec2 c = gl_PointCoord - 0.5;
          float d = length(c);
          if (d > 0.5) discard;
          float glow = smoothstep(0.5, 0.0, d);
          float alpha = glow * (0.55 + 0.45 * vCenterWeight);
          vec3 col = vColor * (0.6 + 0.6 * vCenterWeight);
          gl_FragColor = vec4(col, alpha);
        }
      `,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  update(dt: number): void {
    const t = (performance.now() - this.startTime) / 1000;
    this.rotX += (this.targetRotX - this.rotX) * 0.12;
    this.rotY += (this.targetRotY - this.rotY) * 0.12 + Y_ROT_SPEED * dt;
    this.zoom += (this.targetZoom - this.zoom) * 0.12;

    if (this.runtime.length > 0 && this.points && this.geometry) {
      const posAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
      const sizeAttr = this.geometry.getAttribute('aSize') as THREE.BufferAttribute;
      const pos = posAttr.array as Float32Array;
      const sz = sizeAttr.array as Float32Array;
      for (let i = 0; i < this.runtime.length; i++) {
        const p = this.runtime[i];
        const wave = Math.sin(t * p.frequency * Math.PI * 2 + p.phase);
        const displacement = wave * p.amplitude;
        const sizeFactor = 0.5 + 0.5 * (wave * 0.5 + 0.5);
        const hoverBoost = (i === this.hoveredIndex) ? 2.2 : 1.0;
        pos[i * 3] = p.baseX + p.normalX * displacement;
        pos[i * 3 + 1] = p.baseY + p.normalY * displacement;
        pos[i * 3 + 2] = p.baseZ + p.normalZ * displacement;
        sz[i] = p.baseSize * (0.5 + sizeFactor) * hoverBoost;
      }
      posAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;

      if (this.material && this.material.uniforms.uTime) {
        this.material.uniforms.uTime.value = t;
      }
    }

    if (this.points) {
      this.points.rotation.x = this.rotX;
      this.points.rotation.y = this.rotY;
      this.points.scale.setScalar(this.zoom);
    }
  }

  render(): void {
    this.renderer.render(this.scene, this.camera);
  }

  dispose(): void {
    this.disposeGeometry();
    this.renderer.dispose();
  }
}
