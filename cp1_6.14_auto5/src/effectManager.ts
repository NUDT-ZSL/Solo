import * as THREE from 'three';
import type { WaveformBuilder } from './waveformBuilder';

const TRAIL_MAX_FRAMES = 60;
const TRAIL_VERTEX_COUNT = 5000;

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

  private minimapCanvas: HTMLCanvasElement | null = null;
  private minimapCtx: CanvasRenderingContext2D | null = null;
  private minimapContainer: HTMLElement | null = null;
  private minimapIsDragging: boolean = false;

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

      const alpha = 0.5 * (1 - i / TRAIL_MAX_FRAMES);
      const [r, g, b] = this.waveformBuilder.getStylePrimaryColor();

      const material = new THREE.PointsMaterial({
        size: 0.05,
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

  updateTrail(deltaTime: number): void {
    const currentPositions = this.waveformBuilder.getVertexPositions();
    const history = this.positionHistory[this.frameIndex % TRAIL_MAX_FRAMES];

    for (let i = 0; i < TRAIL_VERTEX_COUNT * 3; i++) {
      history[i] = currentPositions[i] + (i % 3 === 0 ? this.trailOffset.x : i % 3 === 1 ? this.trailOffset.y : this.trailOffset.z);
    }

    const primaryColor = this.waveformBuilder.getStylePrimaryColor();
    const threeColor = new THREE.Color(primaryColor[0], primaryColor[1], primaryColor[2]);

    for (let t = 0; t < TRAIL_MAX_FRAMES; t++) {
      const historyIdx = (this.frameIndex - t + TRAIL_MAX_FRAMES) % TRAIL_MAX_FRAMES;
      const avgPos = this.trailGeometries[t].getAttribute('position') as THREE.BufferAttribute;
      const avgArr = avgPos.array as Float32Array;

      const avgWindow = Math.min(t + 1, 5);
      for (let i = 0; i < TRAIL_VERTEX_COUNT * 3; i++) {
        let sum = 0;
        for (let w = 0; w < avgWindow; w++) {
          const wi = (historyIdx - w + TRAIL_MAX_FRAMES) % TRAIL_MAX_FRAMES;
          sum += this.positionHistory[wi][i];
        }
        avgArr[i] = sum / avgWindow;
      }

      avgPos.needsUpdate = true;

      const alpha = 0.5 * (1 - t / TRAIL_MAX_FRAMES);
      this.trailMaterials[t].color.copy(threeColor);
      this.trailMaterials[t].opacity = alpha;
      this.trailMaterials[t].size = 0.05 * (1 - t * 0.008);
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
    this.minimapContainer = container;
    this.minimapCanvas = document.createElement('canvas');
    this.minimapCanvas.style.width = '100%';
    this.minimapCanvas.style.height = '100%';

    const updateSize = () => {
      if (!this.minimapCanvas || !this.minimapContainer) return;
      const rect = this.minimapContainer.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      this.minimapCanvas.width = rect.width * dpr;
      this.minimapCanvas.height = rect.height * dpr;
      const ctx = this.minimapCanvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);

    this.minimapCtx = this.minimapCanvas.getContext('2d');
    this.minimapContainer.appendChild(this.minimapCanvas);

    this.minimapContainer.addEventListener('pointerdown', this.onMinimapPointerDown.bind(this));
    window.addEventListener('pointermove', this.onMinimapPointerMove.bind(this));
    window.addEventListener('pointerup', this.onMinimapPointerUp.bind(this));
  }

  private onMinimapPointerDown(e: PointerEvent): void {
    e.stopPropagation();
    this.minimapIsDragging = true;
    this.updateCameraFromMinimap(e);
  }

  private onMinimapPointerMove(e: PointerEvent): void {
    if (!this.minimapIsDragging) return;
    this.updateCameraFromMinimap(e);
  }

  private onMinimapPointerUp(): void {
    this.minimapIsDragging = false;
  }

  private updateCameraFromMinimap(e: PointerEvent): void {
    if (!this.minimapContainer) return;
    const rect = this.minimapContainer.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;

    this.cameraTheta = Math.atan2(x, -y);
    this.updateCameraPosition();
    if (this.onCameraChangeCallback) this.onCameraChangeCallback();
  }

  renderMinimap(): void {
    if (!this.minimapCtx || !this.minimapContainer || !this.minimapCanvas) return;

    const rect = this.minimapContainer.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const dpr = window.devicePixelRatio || 1;

    this.minimapCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.minimapCtx.clearRect(0, 0, w, h);

    this.minimapCtx.fillStyle = 'rgba(30, 30, 63, 0.6)';
    this.minimapCtx.fillRect(0, 0, w, h);

    const heights = this.waveformBuilder.getSampleHeights(10);
    const maxHeight = 8;
    const pad = 15;

    this.minimapCtx.strokeStyle = '#6366f1';
    this.minimapCtx.lineWidth = 1;
    this.minimapCtx.beginPath();

    for (let i = 0; i < heights.length; i++) {
      const px = pad + (i / (heights.length - 1)) * (w - pad * 2);
      const normalized = Math.max(-1, Math.min(1, heights[i] / maxHeight));
      const py = h / 2 - normalized * (h / 2 - pad);

      if (i === 0) {
        this.minimapCtx.moveTo(px, py);
      } else {
        this.minimapCtx.lineTo(px, py);
      }
    }
    this.minimapCtx.stroke();

    const cx = w / 2;
    const cy = h / 2;
    const dirX = Math.sin(this.cameraTheta);
    const dirY = -Math.cos(this.cameraTheta);
    const arrowLen = 10;

    this.minimapCtx.fillStyle = '#a78bfa';
    this.minimapCtx.beginPath();
    const tipX = cx + dirX * arrowLen;
    const tipY = cy + dirY * arrowLen;
    const perpX = -dirY;
    const perpY = dirX;
    const baseX = cx - dirX * arrowLen * 0.4;
    const baseY = cy - dirY * arrowLen * 0.4;

    this.minimapCtx.moveTo(tipX, tipY);
    this.minimapCtx.lineTo(baseX + perpX * arrowLen * 0.5, baseY + perpY * arrowLen * 0.5);
    this.minimapCtx.lineTo(baseX - perpX * arrowLen * 0.5, baseY - perpY * arrowLen * 0.5);
    this.minimapCtx.closePath();
    this.minimapCtx.fill();
  }

  update(deltaTime: number): void {
    this.updateTrail(deltaTime);
    this.renderMinimap();
  }

  dispose(): void {
    for (let i = 0; i < this.trailPoints.length; i++) {
      this.scene.remove(this.trailPoints[i]);
      this.trailGeometries[i].dispose();
      this.trailMaterials[i].dispose();
    }
  }
}
