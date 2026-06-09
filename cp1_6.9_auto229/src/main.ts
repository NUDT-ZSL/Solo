import * as THREE from 'three';
import { StarSystem, type ConstellationMode } from './starSystem';
import { ConnectionSystem } from './connectionSystem';
import { UIController } from './uiController';

class ConstellationApp {
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private composerCanvas!: HTMLCanvasElement;
  private composerCtx!: CanvasRenderingContext2D;
  private container!: HTMLElement;
  private mainCanvas!: HTMLCanvasElement;
  private bgCanvas!: HTMLCanvasElement;

  private starSystem!: StarSystem;
  private connectionSystem!: ConnectionSystem;
  private uiController!: UIController;

  private globalTimeMs: number = 0;
  private lastFrameTime: number = 0;

  private targetYaw: number = 0;
  private targetPitch: number = 0;
  private currentYaw: number = 0;
  private currentPitch: number = 0;
  private targetDistance: number = 18;
  private currentDistance: number = 18;
  private targetOffset: THREE.Vector3 = new THREE.Vector3();
  private currentOffset: THREE.Vector3 = new THREE.Vector3();

  private minDistance: number = 5;
  private maxDistance: number = 30;
  private dampingFactor: number = 0.08;

  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private hasMovedBeyondClickThreshold: boolean = false;
  private readonly clickThresholdPx: number = 5;

  private mouseNdcX: number = 0;
  private mouseNdcY: number = 0;

  private keys: Set<string> = new Set();

  private width: number = 0;
  private height: number = 0;

  private pulseMeshGroup: THREE.Group = new THREE.Group();
  private pulseMeshes: Map<number, THREE.Mesh> = new Map();
  private nextPulseMeshId: number = 0;

  private rafId: number = 0;
  private isRunning: boolean = false;

  public start(): void {
    this.init();
    this.bindEvents();
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.animate();
  }

  private init(): void {
    this.container = document.getElementById('app')!;
    this.mainCanvas = document.createElement('canvas');
    this.mainCanvas.style.position = 'absolute';
    this.mainCanvas.style.top = '0';
    this.mainCanvas.style.left = '0';
    this.mainCanvas.style.zIndex = '2';
    this.bgCanvas = document.getElementById('bg-stars') as HTMLCanvasElement;
    this.bgCanvas.style.position = 'absolute';
    this.bgCanvas.style.top = '0';
    this.bgCanvas.style.left = '0';
    this.bgCanvas.style.zIndex = '1';
    this.container.appendChild(this.mainCanvas);

    this.composerCanvas = document.createElement('canvas');
    this.composerCanvas.style.display = 'none';

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x020612, 0.02);

    this.updateSize();
    this.camera = new THREE.PerspectiveCamera(
      55,
      this.width / this.height,
      0.1,
      200
    );

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.mainCanvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.width, this.height, false);
    this.renderer.setClearColor(0x000000, 0);

    this.starSystem = new StarSystem(500, 15);
    this.starSystem.init(this.scene);

    this.connectionSystem = new ConnectionSystem(3, 4500);
    this.connectionSystem.init(this.scene, this.starSystem.stars);

    this.scene.add(this.pulseMeshGroup);

    this.drawBackgroundStars();
    this.setupComposerCanvas();

    this.uiController = new UIController();
    this.uiController.init(this.mainCanvas, (mode: ConstellationMode) => {
      this.handleModeChange(mode);
    });

    this.updateCameraPosition(0);
  }

  private setupComposerCanvas(): void {
    const pr = Math.min(window.devicePixelRatio, 2);
    this.composerCanvas.width = Math.floor(this.width * pr);
    this.composerCanvas.height = Math.floor(this.height * pr);
    const ctx = this.composerCanvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context for composer');
    this.composerCtx = ctx;
  }

  private drawBackgroundStars(): void {
    const pr = Math.min(window.devicePixelRatio, 2);
    this.bgCanvas.width = Math.floor(this.width * pr);
    this.bgCanvas.height = Math.floor(this.height * pr);
    const ctx = this.bgCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.clearRect(0, 0, this.bgCanvas.width, this.bgCanvas.height);

    const starCount = 50;
    const cw = this.bgCanvas.width;
    const ch = this.bgCanvas.height;

    for (let i = 0; i < starCount; i++) {
      const x = Math.random() * cw;
      const y = Math.random() * ch;
      const baseSize = (0.5 + Math.random() * 1.8) * pr;
      const brightness = 0.2 + Math.random() * 0.5;
      const hue = 200 + Math.random() * 50;
      const saturation = 20 + Math.random() * 30;
      const lightness = 60 + Math.random() * 30;

      const grad = ctx.createRadialGradient(x, y, 0, x, y, baseSize * 4);
      grad.addColorStop(0, `hsla(${hue}, ${saturation}%, ${lightness}%, ${brightness})`);
      grad.addColorStop(0.4, `hsla(${hue}, ${saturation}%, ${lightness}%, ${brightness * 0.3})`);
      grad.addColorStop(1, 'hsla(220, 40%, 70%, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, baseSize * 4, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `hsla(${hue}, ${saturation}%, 90%, ${brightness * 1.4})`;
      ctx.beginPath();
      ctx.arc(x, y, baseSize * 0.6, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private updateSize(): void {
    this.width = window.innerWidth;
    this.height = window.innerHeight;
  }

  private bindEvents(): void {
    window.addEventListener('resize', this.onResize);

    this.mainCanvas.addEventListener('pointerdown', this.onPointerDown);
    window.addEventListener('pointermove', this.onPointerMove);
    window.addEventListener('pointerup', this.onPointerUp);

    this.mainCanvas.addEventListener('wheel', this.onWheel, { passive: false });
    this.mainCanvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  private onResize = (): void => {
    this.updateSize();
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.width, this.height, false);
    this.starSystem.resize(this.width, this.height);
    this.connectionSystem.resize(this.width, this.height);
    this.drawBackgroundStars();
    this.setupComposerCanvas();
  };

  private onPointerDown = (e: PointerEvent): void => {
    if (e.button !== undefined && e.button !== 0) return;
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
    this.dragStartX = e.clientX;
    this.dragStartY = e.clientY;
    this.hasMovedBeyondClickThreshold = false;
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch { /* noop */ }
  };

  private onPointerMove = (e: PointerEvent): void => {
    this.mouseNdcX = (e.clientX / this.width) * 2 - 1;
    this.mouseNdcY = -(e.clientY / this.height) * 2 + 1;

    if (this.isDragging) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;

      const totalDx = e.clientX - this.dragStartX;
      const totalDy = e.clientY - this.dragStartY;
      if (Math.abs(totalDx) > this.clickThresholdPx || Math.abs(totalDy) > this.clickThresholdPx) {
        this.hasMovedBeyondClickThreshold = true;
      }

      if (e.shiftKey || e.buttons === 4) {
        const panSpeed = 0.015 * this.currentDistance / 18;
        this.targetOffset.x -= dx * panSpeed;
        this.targetOffset.y += dy * panSpeed;
      } else {
        this.targetYaw -= dx * 0.0045;
        this.targetPitch -= dy * 0.0045;
        const pitchLimit = Math.PI / 2 - 0.05;
        this.targetPitch = Math.max(-pitchLimit, Math.min(pitchLimit, this.targetPitch));
      }

      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  };

  private onPointerUp = (e: PointerEvent): void => {
    const wasDragging = this.isDragging;
    this.isDragging = false;

    if (wasDragging && !this.hasMovedBeyondClickThreshold) {
      this.handleClick(e.clientX, e.clientY);
    }

    try {
      (e.target as Element).releasePointerCapture?.(e.pointerId);
    } catch { /* noop */ }
  };

  private onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    const zoomAmount = delta * 1.6;
    this.targetDistance = Math.max(
      this.minDistance,
      Math.min(this.maxDistance, this.targetDistance + zoomAmount)
    );
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.key.toLowerCase());
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.key.toLowerCase());
  };

  private handleClick(screenX: number, screenY: number): void {
    const ndcX = (screenX / this.width) * 2 - 1;
    const ndcY = -(screenY / this.height) * 2 + 1;

    const starId = this.starSystem.getStarAtScreenPosition(ndcX, ndcY, this.camera, 25);
    if (starId !== null) {
      this.starSystem.spawnPulse(starId);
      this.spawnPulseMesh(starId);
      this.uiController.triggerClickFeedback(starId);
    }
  }

  private spawnPulseMesh(starId: number): void {
    const star = this.starSystem.stars[starId];
    if (!star) return;

    const geometry = new THREE.RingGeometry(0.28, 0.32, 64, 1);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(0x88ccff),
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(star.currentPosition);
    mesh.rotation.x = Math.random() * Math.PI;
    mesh.rotation.y = Math.random() * Math.PI;
    mesh.rotation.z = Math.random() * Math.PI;
    mesh.userData = {
      startTime: this.globalTimeMs,
      duration: 600,
      startInner: 0.28,
      startOuter: 0.32,
      endRadius: 4,
      meshId: this.nextPulseMeshId++
    };

    this.pulseMeshes.set(mesh.userData.meshId, mesh);
    this.pulseMeshGroup.add(mesh);
  }

  private updatePulseMeshes(_deltaMs: number): void {
    const toRemove: number[] = [];

    this.pulseMeshes.forEach((mesh, id) => {
      const data = mesh.userData;
      const elapsed = this.globalTimeMs - data.startTime;
      const progress = Math.min(1, elapsed / data.duration);

      if (progress >= 1) {
        toRemove.push(id);
        return;
      }

      const eased = 1 - Math.pow(1 - progress, 3);
      const currentRadius = data.startOuter + (data.endRadius - data.startOuter) * eased;
      const ringWidth = 0.35 + eased * 0.8;
      const inner = Math.max(0.01, currentRadius - ringWidth);
      const outer = currentRadius;

      (mesh.geometry as THREE.RingGeometry).dispose();
      mesh.geometry = new THREE.RingGeometry(inner, outer, 64, 1);

      const mat = mesh.material as THREE.MeshBasicMaterial;
      const alpha = (1 - progress) * 0.85;
      mat.opacity = alpha;

      const pulseColor = new THREE.Color();
      const hue = 0.58 - eased * 0.15;
      pulseColor.setHSL(hue, 0.7, 0.75);
      mat.color.copy(pulseColor);
    });

    for (const id of toRemove) {
      const mesh = this.pulseMeshes.get(id);
      if (mesh) {
        (mesh.geometry as THREE.RingGeometry).dispose();
        (mesh.material as THREE.MeshBasicMaterial).dispose();
        this.pulseMeshGroup.remove(mesh);
        this.pulseMeshes.delete(id);
      }
    }
  }

  private handleModeChange(mode: ConstellationMode): void {
    this.starSystem.transitionToMode(mode);
    setTimeout(() => {
      this.connectionSystem.forceRecompute();
    }, 150);
    setTimeout(() => {
      this.connectionSystem.forceRecompute();
    }, 500);
    setTimeout(() => {
      this.connectionSystem.forceRecompute();
    }, 1000);
  }

  private updateCameraPosition(deltaMs: number): void {
    const d = Math.max(1, deltaMs);
    const damp = 1 - Math.pow(1 - this.dampingFactor, d / 16.67);

    this.currentYaw += (this.targetYaw - this.currentYaw) * damp;
    this.currentPitch += (this.targetPitch - this.currentPitch) * damp;
    this.currentDistance += (this.targetDistance - this.currentDistance) * damp;
    this.currentOffset.lerp(this.targetOffset, damp);

    const panSpeed = 0.008 * this.currentDistance / 18;
    const moveAmount = (deltaMs / 16.67) * panSpeed * 4;

    const forward = new THREE.Vector3(
      -Math.sin(this.currentYaw) * Math.cos(this.currentPitch),
      Math.sin(this.currentPitch),
      -Math.cos(this.currentYaw) * Math.cos(this.currentPitch)
    );
    const right = new THREE.Vector3().crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();
    const worldUp = new THREE.Vector3(0, 1, 0);

    if (this.keys.has('w')) this.targetOffset.addScaledVector(forward, moveAmount * 10);
    if (this.keys.has('s')) this.targetOffset.addScaledVector(forward, -moveAmount * 10);
    if (this.keys.has('a')) this.targetOffset.addScaledVector(right, -moveAmount * 10);
    if (this.keys.has('d')) this.targetOffset.addScaledVector(right, moveAmount * 10);
    if (this.keys.has('q') || this.keys.has(' ')) this.targetOffset.addScaledVector(worldUp, moveAmount * 10);
    if (this.keys.has('e') || this.keys.has('shift')) this.targetOffset.addScaledVector(worldUp, -moveAmount * 10);

    const lookAt = new THREE.Vector3(0, 0, 0).add(this.currentOffset);
    const camPos = new THREE.Vector3(
      this.currentDistance * Math.cos(this.currentPitch) * Math.sin(this.currentYaw),
      this.currentDistance * Math.sin(this.currentPitch),
      this.currentDistance * Math.cos(this.currentPitch) * Math.cos(this.currentYaw)
    ).add(this.currentOffset);

    this.camera.position.copy(camPos);
    this.camera.lookAt(lookAt);
    this.camera.up.set(0, 1, 0);
    this.camera.updateMatrixWorld(true);
  }

  private updateHoverDetection(): void {
    if (this.isDragging) {
      if (this.uiController.getHoveredStar() !== null) {
        this.uiController.setHoveredStar(null);
        this.starSystem.setHoveredStar(null);
      }
      return;
    }

    const starId = this.starSystem.getStarAtScreenPosition(
      this.mouseNdcX,
      this.mouseNdcY,
      this.camera,
      22
    );

    if (starId !== this.uiController.getHoveredStar()) {
      this.uiController.setHoveredStar(starId);
      this.starSystem.setHoveredStar(starId);
    }
  }

  private composeGlowOverlay(): void {
    const cw = this.composerCanvas.width;
    const ch = this.composerCanvas.height;
    const ctx = this.composerCtx;

    ctx.clearRect(0, 0, cw, ch);
    ctx.globalCompositeOperation = 'lighter';

    const pulseData = this.starSystem.getPulseRenderData();
    const projMat = this.camera.projectionMatrix.clone();
    const viewMat = this.camera.matrixWorldInverse.clone();
    const tmpVec = new THREE.Vector4();

    for (const pulse of pulseData) {
      tmpVec.set(pulse.position.x, pulse.position.y, pulse.position.z, 1);
      tmpVec.applyMatrix4(viewMat);
      tmpVec.applyMatrix4(projMat);

      if (tmpVec.w <= 0 || tmpVec.z < -1 || tmpVec.z > 1) continue;

      const ndcX = tmpVec.x / tmpVec.w;
      const ndcY = tmpVec.y / tmpVec.w;
      const screenX = (ndcX * 0.5 + 0.5) * cw;
      const screenY = (1 - ndcY * 0.5 - 0.5) * ch;

      const radiusAtOrigin = pulse.radius;
      const scaleToPixels = (cw / 2) / tmpVec.w;
      const screenRadius = radiusAtOrigin * scaleToPixels;

      if (screenRadius < 2 || screenRadius > Math.max(cw, ch) * 1.5) continue;

      const alpha = pulse.alpha * 0.55;
      const grad = ctx.createRadialGradient(
        screenX, screenY, screenRadius * 0.6,
        screenX, screenY, screenRadius * 1.15
      );
      grad.addColorStop(0, `rgba(150, 210, 255, 0)`);
      grad.addColorStop(0.4, `rgba(130, 190, 255, ${alpha * 0.4})`);
      grad.addColorStop(0.7, `rgba(170, 200, 255, ${alpha * 0.7})`);
      grad.addColorStop(0.95, `rgba(210, 230, 255, ${alpha})`);
      grad.addColorStop(1, `rgba(255, 255, 255, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(screenX, screenY, screenRadius * 1.15, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  private finalCompose(): void {
    const cw = this.composerCanvas.width;
    const ch = this.composerCanvas.height;
    const mainCtx = this.mainCanvas.getContext('webgl2') || this.mainCanvas.getContext('webgl');

    if (cw <= 0 || ch <= 0) return;

    try {
      const destCtx = this.bgCanvas.getContext('2d');
      if (!destCtx) return;

      const hasPulses = this.starSystem.getPulseRenderData().length > 0;
      if (hasPulses && this.composerCanvas.width > 0 && this.composerCanvas.height > 0) {
        destCtx.globalCompositeOperation = 'lighter';
        destCtx.drawImage(this.composerCanvas, 0, 0, this.width, this.height);
        destCtx.globalCompositeOperation = 'source-over';
      }
    } catch {
      // ignore compose errors
    }
    void mainCtx;
  }

  private animate = (): void => {
    if (!this.isRunning) return;
    this.rafId = requestAnimationFrame(this.animate);

    const now = performance.now();
    let deltaMs = now - this.lastFrameTime;
    this.lastFrameTime = now;

    if (deltaMs > 200) deltaMs = 16.67;
    if (deltaMs < 0) deltaMs = 16.67;

    this.globalTimeMs += deltaMs;

    this.updateCameraPosition(deltaMs);
    this.updateHoverDetection();
    this.starSystem.update(deltaMs, this.globalTimeMs);
    this.connectionSystem.update(deltaMs, this.globalTimeMs);
    this.updatePulseMeshes(deltaMs);

    this.renderer.render(this.scene, this.camera);

    this.composeGlowOverlay();
    this.finalCompose();
  };

  public dispose(): void {
    this.isRunning = false;
    if (this.rafId) cancelAnimationFrame(this.rafId);

    window.removeEventListener('resize', this.onResize);
    this.mainCanvas?.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointermove', this.onPointerMove);
    window.removeEventListener('pointerup', this.onPointerUp);
    this.mainCanvas?.removeEventListener('wheel', this.onWheel);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);

    this.pulseMeshes.forEach(mesh => {
      (mesh.geometry as THREE.BufferGeometry).dispose();
      (mesh.material as THREE.Material).dispose();
    });
    this.pulseMeshes.clear();

    this.starSystem?.dispose();
    this.connectionSystem?.dispose();
    this.uiController?.dispose();
    this.renderer?.dispose();
  }
}

const app = new ConstellationApp();

window.addEventListener('DOMContentLoaded', () => {
  app.start();
});

window.addEventListener('beforeunload', () => {
  app.dispose();
});
