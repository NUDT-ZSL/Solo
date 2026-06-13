import * as THREE from 'three';
import type { WaveformBuilder } from './waveformBuilder';

const TRAIL_MAX_FRAMES = 60;
const TRAIL_VERTEX_COUNT = 5000;

interface MinimapInstance {
  container: HTMLElement;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  isDragging: boolean;
}

export class EffectManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private waveformBuilder: WaveformBuilder;

  private trailGeometries: THREE.BufferGeometry[] = [];
  private trailMaterials: THREE.PointsMaterial[] = [];
  private trailPoints: THREE.Points[] = [];
  private positionHistory: Float32Array[] = [];
  private frameIndex: number = 0;
  private trailOffset: THREE.Vector3 = new THREE.Vector3(0, -0.3, 0.5);

  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };
  private cameraTheta: number = 0;
  private cameraPhi: number = Math.atan2(5, 15);
  private cameraRadius: number = Math.sqrt(5 * 5 + 15 * 15);
  private cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  private minimaps: MinimapInstance[] = [];

  private onCameraChangeCallback: (() => void) | null = null;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    waveformBuilder: WaveformBuilder,
  ) {
    this.scene = scene;
    this.camera = camera;
    this.waveformBuilder = waveformBuilder;

    this.initCameraSpherical();
    this.initTrail();
  }

  private initCameraSpherical(): void {
    const pos = this.camera.position;
    this.cameraRadius = Math.sqrt(pos.x * pos.x + pos.y * pos.y + pos.z * pos.z);
    this.cameraTheta = Math.atan2(pos.x, pos.z);
    this.cameraPhi = Math.acos(Math.max(-1, Math.min(1, pos.y / this.cameraRadius)));
  }

  private initTrail(): void {
    for (let f = 0; f < TRAIL_MAX_FRAMES; f++) {
      this.positionHistory.push(new Float32Array(TRAIL_VERTEX_COUNT * 3));
    }

    for (let i = 0; i < TRAIL_MAX_FRAMES; i++) {
      const geometry = new THREE.BufferGeometry();
      const positions = new Float32Array(TRAIL_VERTEX_COUNT * 3);
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const alpha = this.getTrailAlpha(i);
      const [r, g, b] = this.waveformBuilder.getStylePrimaryColor();

      const material = new THREE.PointsMaterial({
        size: this.getTrailSize(i),
        color: new THREE.Color(r, g, b),
        transparent: true,
        opacity: alpha,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        sizeAttenuation: true,
      });

      const points = new THREE.Points(geometry, material);
      points.frustumCulled = false;

      this.trailGeometries.push(geometry);
      this.trailMaterials.push(material);
      this.trailPoints.push(points);
      this.scene.add(points);
    }
  }

  private getTrailAlpha(frameIndex: number): number {
    const t = frameIndex / (TRAIL_MAX_FRAMES - 1);
    const alpha = 0.5 * (1 - t);
    return Math.max(0, alpha);
  }

  private getTrailSize(frameIndex: number): number {
    const t = frameIndex / (TRAIL_MAX_FRAMES - 1);
    return 0.08 * (1 - t * 0.7);
  }

  updateTrail(deltaTime: number): void {
    const currentPositions = this.waveformBuilder.getVertexPositions();
    const history = this.positionHistory[this.frameIndex % TRAIL_MAX_FRAMES];

    for (let i = 0; i < TRAIL_VERTEX_COUNT * 3; i++) {
      const axisOffset = i % 3 === 0
        ? this.trailOffset.x
        : i % 3 === 1
          ? this.trailOffset.y
          : this.trailOffset.z;
      history[i] = currentPositions[i] + axisOffset;
    }

    const primaryColor = this.waveformBuilder.getStylePrimaryColor();
    const threeColor = new THREE.Color(primaryColor[0], primaryColor[1], primaryColor[2]);

    for (let t = 0; t < TRAIL_MAX_FRAMES; t++) {
      const historyIdx = (this.frameIndex - t + TRAIL_MAX_FRAMES) % TRAIL_MAX_FRAMES;
      const avgPos = this.trailGeometries[t].getAttribute('position') as THREE.BufferAttribute;
      const avgArr = avgPos.array as Float32Array;

      const avgWindow = Math.max(1, Math.min(TRAIL_MAX_FRAMES, Math.floor(t / 3) + 1));
      for (let i = 0; i < TRAIL_VERTEX_COUNT * 3; i++) {
        let sum = 0;
        for (let w = 0; w < avgWindow; w++) {
          const wi = (historyIdx - w + TRAIL_MAX_FRAMES) % TRAIL_MAX_FRAMES;
          sum += this.positionHistory[wi][i];
        }
        avgArr[i] = sum / avgWindow;
      }

      avgPos.needsUpdate = true;

      const alpha = this.getTrailAlpha(t);
      this.trailMaterials[t].color.copy(threeColor);
      this.trailMaterials[t].opacity = alpha;
      this.trailMaterials[t].size = this.getTrailSize(t);
      this.trailMaterials[t].needsUpdate = true;
    }

    this.frameIndex++;
    void deltaTime;
  }

  setupPointerControls(canvas: HTMLCanvasElement): void {
    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('pointermove', this.onPointerMove.bind(this));
    window.addEventListener('pointerup', this.onPointerUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });
  }

  private onPointerDown(e: PointerEvent): void {
    if (e.button !== 0) return;
    this.isDragging = true;
    this.previousMouse = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.previousMouse.x;
    const deltaY = e.clientY - this.previousMouse.y;

    this.cameraTheta -= deltaX * 0.005;
    this.cameraPhi = Math.max(0.15, Math.min(Math.PI - 0.15, this.cameraPhi - deltaY * 0.005));

    this.updateCameraPosition();
    this.previousMouse = { x: e.clientX, y: e.clientY };

    if (this.onCameraChangeCallback) this.onCameraChangeCallback();
  }

  private onPointerUp(e: PointerEvent): void {
    this.isDragging = false;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch (_err) {
      // noop
    }
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    this.cameraRadius = Math.max(5, Math.min(40, this.cameraRadius + e.deltaY * 0.02));
    this.updateCameraPosition();
    if (this.onCameraChangeCallback) this.onCameraChangeCallback();
  }

  private updateCameraPosition(): void {
    const x = this.cameraRadius * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    const y = this.cameraRadius * Math.cos(this.cameraPhi);
    const z = this.cameraRadius * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);

    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  setOnCameraChange(callback: () => void): void {
    this.onCameraChangeCallback = callback;
  }

  setupMinimap(container: HTMLElement): void {
    const canvas = document.createElement('canvas');
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';

    const updateSize = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.scale(dpr, dpr);
      }
    };

    updateSize();
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(container);
    window.addEventListener('resize', updateSize);

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    container.appendChild(canvas);

    const minimapInstance: MinimapInstance = {
      container,
      canvas,
      ctx,
      isDragging: false,
    };
    this.minimaps.push(minimapInstance);

    const onDown = (e: PointerEvent) => {
      e.stopPropagation();
      minimapInstance.isDragging = true;
      this.updateCameraFromMinimapEvent(e, container);
    };
    const onMove = (e: PointerEvent) => {
      if (!minimapInstance.isDragging) return;
      this.updateCameraFromMinimapEvent(e, container);
    };
    const onUp = () => {
      minimapInstance.isDragging = false;
    };

    container.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  }

  private updateCameraFromMinimapEvent(e: PointerEvent, container: HTMLElement): void {
    const rect = container.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    this.cameraTheta = Math.atan2(x, -y);
    this.updateCameraPosition();
    if (this.onCameraChangeCallback) this.onCameraChangeCallback();
  }

  renderMinimapOnInstance(instance: MinimapInstance): void {
    const { container, canvas, ctx } = instance;
    if (!ctx || !canvas) return;

    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w === 0 || h === 0) return;

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    ctx.fillStyle = 'rgba(30, 30, 63, 0.6)';
    ctx.fillRect(0, 0, w, h);

    const heights = this.waveformBuilder.getSampleHeights(10);
    const maxHeight = 8;
    const pad = 15;

    ctx.strokeStyle = '#6366f1';
    ctx.lineWidth = 1;
    ctx.beginPath();

    for (let i = 0; i < heights.length; i++) {
      const px = pad + (i / (heights.length - 1)) * (w - pad * 2);
      const normalized = Math.max(-1, Math.min(1, heights[i] / maxHeight));
      const py = h / 2 - normalized * (h / 2 - pad);

      if (i === 0) {
        ctx.moveTo(px, py);
      } else {
        ctx.lineTo(px, py);
      }
    }
    ctx.stroke();

    const cx = w / 2;
    const cy = h / 2;
    const dirX = Math.sin(this.cameraTheta);
    const dirY = -Math.cos(this.cameraTheta);
    const arrowLen = Math.min(12, Math.min(w, h) / 7);

    ctx.fillStyle = '#a78bfa';
    ctx.strokeStyle = '#c4b5fd';
    ctx.lineWidth = 1;
    ctx.beginPath();

    const tipX = cx + dirX * arrowLen;
    const tipY = cy + dirY * arrowLen;
    const perpX = -dirY;
    const perpY = dirX;
    const baseX = cx - dirX * arrowLen * 0.5;
    const baseY = cy - dirY * arrowLen * 0.5;

    ctx.moveTo(tipX, tipY);
    ctx.lineTo(baseX + perpX * arrowLen * 0.55, baseY + perpY * arrowLen * 0.55);
    ctx.lineTo(baseX - perpX * arrowLen * 0.55, baseY - perpY * arrowLen * 0.55);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = 'rgba(139, 92, 246, 0.35)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.min(w, h) * 0.35, 0, Math.PI * 2);
    ctx.stroke();
  }

  renderAllMinimaps(): void {
    for (const m of this.minimaps) {
      this.renderMinimapOnInstance(m);
    }
  }

  update(deltaTime: number): void {
    this.updateTrail(deltaTime);
    this.renderAllMinimaps();
  }

  dispose(): void {
    for (let i = 0; i < this.trailPoints.length; i++) {
      this.scene.remove(this.trailPoints[i]);
      this.trailGeometries[i].dispose();
      this.trailMaterials[i].dispose();
    }
  }
}
