import * as THREE from 'three';
import {
  LightTrail,
  Particle,
  ControlParams,
  sampleGradient,
  randomGradientColor,
  createTrailGeometry,
  updateTrailGeometry,
  screenToRay,
  rayTo3DPoint,
  pointDistance3D,
  createParticleBurst,
  updateParticle,
  isParticleAlive,
  particleOpacity,
} from '../utils/rayUtils';

const MAX_TRAIL_POINTS = 5000;
const MAX_PARTICLES = 2000;
const STAR_COUNT = 300;
const MIN_POINT_DISTANCE = 0.15;
const PARTICLES_PER_BURST = 80;

export class LightCanvas {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private canvas: HTMLCanvasElement;

  private trails: LightTrail[] = [];
  private activeTrail: LightTrail | null = null;
  private particles: Particle[] = [];
  private particlePoints: THREE.Points | null = null;
  private particleGeometry: THREE.BufferGeometry | null = null;

  private stars: THREE.Points;
  private starVelocities: Float32Array;

  private raycaster: THREE.Raycaster;
  private isDrawing = false;
  private mouseDownPos = new THREE.Vector2();
  private hasDragged = false;
  private totalTrailPoints = 0;

  private params: ControlParams = {
    lineWidth: 3,
    particleSpreadSpeed: 1.0,
  };

  private clock = new THREE.Clock();

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    const w = container.clientWidth;
    const h = container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    this.camera.position.set(0, 0, 30);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(w, h);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.canvas = this.renderer.domElement;
    this.canvas.style.display = 'block';
    container.appendChild(this.canvas);

    this.raycaster = new THREE.Raycaster();
    this.raycaster.params.Line = { threshold: 0.3 };

    this.stars = this.createStars();
    this.starVelocities = this.createStarVelocities();
    this.scene.add(this.stars);

    this.initParticleGeometry();

    this.bindEvents(container);
    this.animate();
  }

  private createStars(): THREE.Points {
    const positions = new Float32Array(STAR_COUNT * 3);
    const colors = new Float32Array(STAR_COUNT * 3);
    const sizes = new Float32Array(STAR_COUNT);

    for (let i = 0; i < STAR_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;

      const brightness = 0.3 + Math.random() * 0.5;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness + Math.random() * 0.2;

      sizes[i] = 0.5 + Math.random() * 1.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    return new THREE.Points(geometry, material);
  }

  private createStarVelocities(): Float32Array {
    const velocities = new Float32Array(STAR_COUNT * 3);
    for (let i = 0; i < STAR_COUNT; i++) {
      velocities[i * 3] = (Math.random() - 0.5) * 0.005;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.005;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.005;
    }
    return velocities;
  }

  private initParticleGeometry(): void {
    this.particleGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_PARTICLES * 3);
    const colors = new Float32Array(MAX_PARTICLES * 3);
    const sizes = new Float32Array(MAX_PARTICLES);
    this.particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particleGeometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.particleGeometry.setDrawRange(0, 0);

    const material = new THREE.PointsMaterial({
      size: 0.12,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.particlePoints = new THREE.Points(this.particleGeometry, material);
    this.scene.add(this.particlePoints);
  }

  private bindEvents(container: HTMLElement): void {
    const canvas = this.canvas;

    canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      this.mouseDownPos.set(e.clientX, e.clientY);
      this.hasDragged = false;
      this.isDrawing = true;
      this.startTrail(e.clientX, e.clientY, container);
    });

    canvas.addEventListener('mousemove', (e) => {
      if (!this.isDrawing) return;
      const dx = e.clientX - this.mouseDownPos.x;
      const dy = e.clientY - this.mouseDownPos.y;
      if (Math.sqrt(dx * dx + dy * dy) > 5) {
        this.hasDragged = true;
      }
      this.continueTrail(e.clientX, e.clientY, container);
    });

    canvas.addEventListener('mouseup', (e) => {
      if (e.button !== 0) return;
      if (!this.hasDragged && this.activeTrail === null) {
        this.tryHitTrail(e.clientX, e.clientY, container);
      }
      this.endTrail();
      this.isDrawing = false;
    });

    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length !== 1) return;
      e.preventDefault();
      const touch = e.touches[0];
      this.mouseDownPos.set(touch.clientX, touch.clientY);
      this.hasDragged = false;
      this.isDrawing = true;
      this.startTrail(touch.clientX, touch.clientY, container);
    }, { passive: false });

    canvas.addEventListener('touchmove', (e) => {
      if (e.touches.length !== 1 || !this.isDrawing) return;
      e.preventDefault();
      const touch = e.touches[0];
      const dx = touch.clientX - this.mouseDownPos.x;
      const dy = touch.clientY - this.mouseDownPos.y;
      if (Math.sqrt(dx * dx + dy * dy) > 5) {
        this.hasDragged = true;
      }
      this.continueTrail(touch.clientX, touch.clientY, container);
    }, { passive: false });

    canvas.addEventListener('touchend', () => {
      this.endTrail();
      this.isDrawing = false;
    });

    window.addEventListener('resize', () => this.onResize(container));
  }

  private startTrail(clientX: number, clientY: number, container: HTMLElement): void {
    const rect = container.getBoundingClientRect();
    const ray = screenToRay(
      clientX - rect.left,
      clientY - rect.top,
      rect.width,
      rect.height,
      this.camera
    );
    const point = rayTo3DPoint(ray, this.camera, 15);
    const colorStart = randomGradientColor();
    const colorEnd = randomGradientColor();

    const geometry = createTrailGeometry([point]);
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: 1,
    });
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);

    const id = Date.now() + Math.random();
    this.activeTrail = {
      id,
      points: [point.clone()],
      colorStart,
      colorEnd,
      lineWidth: this.params.lineWidth,
      line,
      createdAt: Date.now(),
    };
    this.trails.push(this.activeTrail);
  }

  private continueTrail(clientX: number, clientY: number, container: HTMLElement): void {
    if (!this.activeTrail) return;

    const rect = container.getBoundingClientRect();
    const ray = screenToRay(
      clientX - rect.left,
      clientY - rect.top,
      rect.width,
      rect.height,
      this.camera
    );
    const point = rayTo3DPoint(ray, this.camera, 15);

    const lastPoint = this.activeTrail.points[this.activeTrail.points.length - 1];
    if (pointDistance3D(point, lastPoint) < MIN_POINT_DISTANCE) return;

    this.activeTrail.points.push(point.clone());
    this.totalTrailPoints++;

    updateTrailGeometry(this.activeTrail.line.geometry as THREE.BufferGeometry, this.activeTrail.points);

    if (this.totalTrailPoints > MAX_TRAIL_POINTS) {
      this.removeOldestTrail();
    }
  }

  private endTrail(): void {
    this.activeTrail = null;
  }

  private tryHitTrail(clientX: number, clientY: number, container: HTMLElement): void {
    const rect = container.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    this.raycaster.setFromCamera(ndc, this.camera);

    const lineObjects = this.trails.map((t) => t.line);
    const intersects = this.raycaster.intersectObjects(lineObjects, false);

    if (intersects.length > 0) {
      const hitLine = intersects[0].object as THREE.Line;
      const hitTrail = this.trails.find((t) => t.line === hitLine);
      if (hitTrail && intersects[0].point) {
        this.burstTrail(hitTrail, intersects[0].point);
      }
    }
  }

  private burstTrail(trail: LightTrail, hitPoint: THREE.Vector3): void {
    const hitT = this.findClosestPointT(trail, hitPoint);
    const burstColor = sampleGradient(hitT);

    const newParticles = createParticleBurst(
      hitPoint,
      PARTICLES_PER_BURST,
      burstColor,
      this.params.particleSpreadSpeed
    );

    const available = MAX_PARTICLES - this.particles.length;
    this.particles.push(...newParticles.slice(0, available));

    this.removeTrail(trail);
  }

  private findClosestPointT(trail: LightTrail, point: THREE.Vector3): number {
    let minDist = Infinity;
    let closestIdx = 0;
    for (let i = 0; i < trail.points.length; i++) {
      const d = trail.points[i].distanceTo(point);
      if (d < minDist) {
        minDist = d;
        closestIdx = i;
      }
    }
    return trail.points.length > 1 ? closestIdx / (trail.points.length - 1) : 0;
  }

  private removeTrail(trail: LightTrail): void {
    this.scene.remove(trail.line);
    trail.line.geometry.dispose();
    (trail.line.material as THREE.Material).dispose();
    this.totalTrailPoints -= trail.points.length;
    this.trails = this.trails.filter((t) => t !== trail);
  }

  private removeOldestTrail(): void {
    if (this.trails.length === 0) return;
    const oldest = this.trails[0];
    if (oldest === this.activeTrail) return;
    this.removeTrail(oldest);
  }

  private updateStars(dt: number): void {
    const positions = this.stars.geometry.getAttribute('position') as THREE.BufferAttribute;
    const arr = positions.array as Float32Array;

    for (let i = 0; i < STAR_COUNT; i++) {
      arr[i * 3] += this.starVelocities[i * 3] * dt * 60;
      arr[i * 3 + 1] += this.starVelocities[i * 3 + 1] * dt * 60;
      arr[i * 3 + 2] += this.starVelocities[i * 3 + 2] * dt * 60;

      for (let axis = 0; axis < 3; axis++) {
        if (arr[i * 3 + axis] > 40) arr[i * 3 + axis] = -40;
        if (arr[i * 3 + axis] < -40) arr[i * 3 + axis] = 40;
      }
    }
    positions.needsUpdate = true;
  }

  private updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      updateParticle(this.particles[i], dt);
      if (!isParticleAlive(this.particles[i])) {
        this.particles.splice(i, 1);
      }
    }
  }

  private renderParticles(): void {
    if (!this.particleGeometry || !this.particlePoints) return;

    const posAttr = this.particleGeometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.particleGeometry.getAttribute('color') as THREE.BufferAttribute;
    const sizeAttr = this.particleGeometry.getAttribute('size') as THREE.BufferAttribute;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      if (i < this.particles.length) {
        const p = this.particles[i];
        posAttr.setXYZ(i, p.position.x, p.position.y, p.position.z);
        const opacity = particleOpacity(p);
        colAttr.setXYZ(i, p.color.r * opacity, p.color.g * opacity, p.color.b * opacity);
        sizeAttr.setX(i, p.size * (0.5 + opacity * 0.5));
      } else {
        posAttr.setXYZ(i, 0, 0, -1000);
        sizeAttr.setX(i, 0);
      }
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    this.particleGeometry.setDrawRange(0, Math.min(this.particles.length, MAX_PARTICLES));
  }

  private onResize(container: HTMLElement): void {
    const w = container.clientWidth;
    const h = container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.05);

    this.updateStars(dt);
    this.updateParticles(dt);
    this.renderParticles();

    this.renderer.render(this.scene, this.camera);
  };

  updateParams(params: ControlParams): void {
    this.params = { ...params };
  }

  reset(): void {
    for (const trail of this.trails) {
      this.scene.remove(trail.line);
      trail.line.geometry.dispose();
      (trail.line.material as THREE.Material).dispose();
    }
    this.trails = [];
    this.activeTrail = null;
    this.totalTrailPoints = 0;

    this.particles = [];
    if (this.particleGeometry) {
      this.particleGeometry.setDrawRange(0, 0);
    }
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }
}
