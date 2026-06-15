import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import eventBus from './event-bus';
import {
  ParticleShape,
  ParticleData,
  GestureData,
  AudioEnergy,
  EventCallback,
  GestureType
} from './types';

export interface NebulaConfig {
  particleCount?: number;
  shapeTransitionDuration?: number;
  burstDuration?: number;
  sizeScaleRange?: [number, number];
  speedScaleRange?: [number, number];
  burstThreshold?: number;
  minDistance?: number;
  maxDistance?: number;
}

const DEFAULT_CONFIG: Required<NebulaConfig> = {
  particleCount: 20000,
  shapeTransitionDuration: 1500,
  burstDuration: 300,
  sizeScaleRange: [0.5, 2.0],
  speedScaleRange: [0.3, 2.0],
  burstThreshold: 0.65,
  minDistance: 5,
  maxDistance: 50
};

const PARTICLE_COUNT = DEFAULT_CONFIG.particleCount;
const COLOR_GRADIENT: [number, number, number][] = [
  [0.48627, 0.22745, 0.92941],
  [0.02353, 0.71373, 0.83137],
  [0.92549, 0.28235, 0.60000]
];

type BezierControlPoints = [THREE.Vector3, THREE.Vector3, THREE.Vector3, THREE.Vector3];

enum BurstState {
  IDLE = 'idle',
  BURST = 'burst',
  RECOVER = 'recover'
}

export class ParticleNebula {
  private container: HTMLElement;
  private config: Required<NebulaConfig>;
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private points: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.PointsMaterial | null = null;
  private clock: THREE.Clock;

  private particleData: ParticleData;
  private bezierControls: BezierControlPoints[] = [];

  private currentShape: ParticleShape = ParticleShape.CLOUD;
  private targetShape: ParticleShape = ParticleShape.CLOUD;
  private transitionProgress: number = 1;
  private transitionStart: number = 0;

  private burstState: BurstState = BurstState.IDLE;
  private burstProgress: number = 0;
  private burstStart: number = 0;
  private burstDirections: Float32Array;

  private currentGesture: GestureType = GestureType.NONE;
  private lowEnergy: number = 0;
  private highEnergy: number = 0;
  private sizeScale: number = 1;
  private speedScale: number = 1;

  private isRunning: boolean = false;
  private animationId: number = 0;

  private onGestureData: EventCallback;
  private onAudioEnergy: EventCallback;
  private onTogglePlay: EventCallback;
  private onSwitchShape: EventCallback;

  constructor(container: HTMLElement, config: NebulaConfig = {}) {
    this.container = container;
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.clock = new THREE.Clock();

    this.particleData = this.initParticleData();
    this.burstDirections = new Float32Array(PARTICLE_COUNT * 3);

    const { renderer, scene, camera, controls } = this.initThreeScene();
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;

    this.initParticleSystem();

    this.onGestureData = (data) => this.handleGestureData(data as GestureData);
    this.onAudioEnergy = (data) => this.handleAudioEnergy(data as AudioEnergy);
    this.onTogglePlay = (playing) => this.setPlaying(playing as boolean);
    this.onSwitchShape = (shape) => this.switchShape(shape as ParticleShape);

    this.bindEvents();
    this.handleResize();
    window.addEventListener('resize', this.handleResize);
  }

  private initParticleData(): ParticleData {
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const targetPositions = new Float32Array(PARTICLE_COUNT * 3);
    const startPositions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);
    const baseSizes = new Float32Array(PARTICLE_COUNT);
    const velocities = new Float32Array(PARTICLE_COUNT * 3);
    const phases = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const r = 3 + Math.random() * 4;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;
      startPositions[i3] = x;
      startPositions[i3 + 1] = y;
      startPositions[i3 + 2] = z;
      targetPositions[i3] = x;
      targetPositions[i3 + 1] = y;
      targetPositions[i3 + 2] = z;

      const colorT = Math.random();
      const col = this.interpolateGradient(colorT);
      colors[i3] = col[0];
      colors[i3 + 1] = col[1];
      colors[i3 + 2] = col[2];

      const size = 0.05 + Math.random() * 0.25;
      baseSizes[i] = size;
      sizes[i] = size;

      velocities[i3] = (Math.random() - 0.5) * 0.01;
      velocities[i3 + 1] = (Math.random() - 0.5) * 0.01;
      velocities[i3 + 2] = (Math.random() - 0.5) * 0.01;

      phases[i] = Math.random() * Math.PI * 2;
    }

    return {
      positions,
      targetPositions,
      startPositions,
      colors,
      sizes,
      baseSizes,
      velocities,
      phases
    };
  }

  private interpolateGradient(t: number): [number, number, number] {
    const seg = t * (COLOR_GRADIENT.length - 1);
    const idx = Math.min(Math.floor(seg), COLOR_GRADIENT.length - 2);
    const frac = seg - idx;
    const c1 = COLOR_GRADIENT[idx];
    const c2 = COLOR_GRADIENT[idx + 1];
    return [
      c1[0] + (c2[0] - c1[0]) * frac,
      c1[1] + (c2[1] - c1[1]) * frac,
      c1[2] + (c2[2] - c1[2]) * frac
    ];
  }

  private initThreeScene() {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
      logarithmicDepthBuffer: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    renderer.setClearColor(0x0a0a1a, 1);
    this.container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0a0a1a, 0.015);

    const camera = new THREE.PerspectiveCamera(
      60,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 15);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = this.config.minDistance;
    controls.maxDistance = this.config.maxDistance;
    controls.minPolarAngle = Math.PI / 6;
    controls.maxPolarAngle = (2 * Math.PI) / 3;
    controls.enablePan = false;

    return { renderer, scene, camera, controls };
  }

  private initParticleSystem(): void {
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(this.particleData.positions, 3)
    );
    this.geometry.setAttribute(
      'color',
      new THREE.BufferAttribute(this.particleData.colors, 3)
    );
    this.geometry.setAttribute(
      'size',
      new THREE.BufferAttribute(this.particleData.sizes, 1)
    );

    this.material = new THREE.PointsMaterial({
      size: 0.15,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);

    this.computeTargetPositions(ParticleShape.CLOUD);
    this.initBezierControls();
  }

  private initBezierControls(): void {
    this.bezierControls = [];
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const start = new THREE.Vector3(
        this.particleData.startPositions[i3],
        this.particleData.startPositions[i3 + 1],
        this.particleData.startPositions[i3 + 2]
      );
      const end = new THREE.Vector3(
        this.particleData.targetPositions[i3],
        this.particleData.targetPositions[i3 + 1],
        this.particleData.targetPositions[i3 + 2]
      );
      this.bezierControls.push([
        start.clone(),
        this.generateControlPoint(start, end, 0.33),
        this.generateControlPoint(start, end, 0.66),
        end.clone()
      ]);
    }
  }

  private generateControlPoint(
    start: THREE.Vector3,
    end: THREE.Vector3,
    t: number
  ): THREE.Vector3 {
    const mid = new THREE.Vector3().lerpVectors(start, end, t);
    const center = new THREE.Vector3(0, 0, 0);
    const dir = mid.clone().sub(center).normalize();
    const offset = (Math.random() - 0.5) * 4 + 2;
    return mid.add(dir.multiplyScalar(offset));
  }

  private computeTargetPositions(shape: ParticleShape): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      let x = 0,
        y = 0,
        z = 0;

      switch (shape) {
        case ParticleShape.SPHERE: {
          const r = 2 + Math.pow(Math.random(), 0.5) * 3;
          const theta = Math.random() * Math.PI * 2;
          const phi = Math.acos(2 * Math.random() - 1);
          x = r * Math.sin(phi) * Math.cos(theta);
          y = r * Math.sin(phi) * Math.sin(theta);
          z = r * Math.cos(phi);
          break;
        }
        case ParticleShape.CLOUD: {
          const gaussian = (n: number) => {
            let val = 0;
            for (let j = 0; j < n; j++) val += Math.random();
            return val / n - 0.5;
          };
          x = gaussian(6) * 14;
          y = gaussian(6) * 14;
          z = gaussian(6) * 14;
          break;
        }
        case ParticleShape.GALAXY: {
          const arm = Math.floor(Math.random() * 3);
          const armOffset = (arm / 3) * Math.PI * 2;
          const radius = Math.pow(Math.random(), 0.3) * 7;
          const spin = radius * 0.8;
          const angle = armOffset + spin + (Math.random() - 0.5) * 0.5;
          const thickness = (Math.random() - 0.5) * 0.8 * (1 - radius / 8);
          x = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.6;
          y = thickness * 2;
          z = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.6;
          break;
        }
      }

      this.particleData.targetPositions[i3] = x;
      this.particleData.targetPositions[i3 + 1] = y;
      this.particleData.targetPositions[i3 + 2] = z;
    }
  }

  private bindEvents(): void {
    eventBus.on('gestureData', this.onGestureData);
    eventBus.on('audioEnergy', this.onAudioEnergy);
    eventBus.on('togglePlay', this.onTogglePlay);
    eventBus.on('switchShape', this.onSwitchShape);
  }

  private unbindEvents(): void {
    eventBus.off('gestureData', this.onGestureData);
    eventBus.off('audioEnergy', this.onAudioEnergy);
    eventBus.off('togglePlay', this.onTogglePlay);
    eventBus.off('switchShape', this.onSwitchShape);
  }

  private handleGestureData(data: GestureData): void {
    if (!this.isRunning) return;

    if (data.gestureType !== this.currentGesture && data.gestureType !== GestureType.NONE) {
      this.currentGesture = data.gestureType;
      switch (data.gestureType) {
        case GestureType.FIST:
          this.switchShape(ParticleShape.SPHERE);
          break;
        case GestureType.OPEN:
          this.switchShape(ParticleShape.CLOUD);
          break;
        case GestureType.VICTORY:
          this.switchShape(ParticleShape.GALAXY);
          break;
      }
    }
  }

  private handleAudioEnergy(data: AudioEnergy): void {
    if (!this.isRunning) return;

    this.lowEnergy = data.lowFreq;
    this.highEnergy = data.highFreq;

    const [sizeMin, sizeMax] = this.config.sizeScaleRange;
    const [speedMin, speedMax] = this.config.speedScaleRange;
    this.sizeScale = sizeMin + this.lowEnergy * (sizeMax - sizeMin);
    this.speedScale = speedMin + this.highEnergy * (speedMax - speedMin);

    if (data.isBurst && this.burstState === BurstState.IDLE) {
      this.triggerBurst();
    }
  }

  private triggerBurst(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      const x = this.particleData.positions[i3];
      const y = this.particleData.positions[i3 + 1];
      const z = this.particleData.positions[i3 + 2];
      const len = Math.sqrt(x * x + y * y + z * z) || 1;
      this.burstDirections[i3] = x / len;
      this.burstDirections[i3 + 1] = y / len;
      this.burstDirections[i3 + 2] = z / len;
    }

    this.burstState = BurstState.BURST;
    this.burstProgress = 0;
    this.burstStart = performance.now();
  }

  switchShape(shape: ParticleShape): void {
    if (shape === this.targetShape && this.transitionProgress >= 1) return;

    this.targetShape = shape;
    this.transitionStart = performance.now();
    this.transitionProgress = 0;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      this.particleData.startPositions[i3] = this.particleData.positions[i3];
      this.particleData.startPositions[i3 + 1] = this.particleData.positions[i3 + 1];
      this.particleData.startPositions[i3 + 2] = this.particleData.positions[i3 + 2];
    }

    this.computeTargetPositions(shape);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      this.bezierControls[i][0].set(
        this.particleData.startPositions[i3],
        this.particleData.startPositions[i3 + 1],
        this.particleData.startPositions[i3 + 2]
      );
      this.bezierControls[i][3].set(
        this.particleData.targetPositions[i3],
        this.particleData.targetPositions[i3 + 1],
        this.particleData.targetPositions[i3 + 2]
      );
      this.bezierControls[i][1] = this.generateControlPoint(
        this.bezierControls[i][0],
        this.bezierControls[i][3],
        0.33
      );
      this.bezierControls[i][2] = this.generateControlPoint(
        this.bezierControls[i][0],
        this.bezierControls[i][3],
        0.66
      );
    }
  }

  private cubicBezier(t: number, cp: BezierControlPoints, out: THREE.Vector3): void {
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;

    out.set(
      mt3 * cp[0].x + 3 * mt2 * t * cp[1].x + 3 * mt * t2 * cp[2].x + t3 * cp[3].x,
      mt3 * cp[0].y + 3 * mt2 * t * cp[1].y + 3 * mt * t2 * cp[2].y + t3 * cp[3].y,
      mt3 * cp[0].z + 3 * mt2 * t * cp[1].z + 3 * mt * t2 * cp[2].z + t3 * cp[3].z
    );
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private updateBurst(now: number): number {
    if (this.burstState === BurstState.IDLE) return 0;

    const elapsed = now - this.burstStart;
    const halfDuration = this.config.burstDuration / 2;

    if (this.burstState === BurstState.BURST) {
      if (elapsed >= halfDuration) {
        this.burstState = BurstState.RECOVER;
        this.burstStart = now - halfDuration;
        this.burstProgress = 1;
      } else {
        this.burstProgress = elapsed / halfDuration;
      }
    }

    if (this.burstState === BurstState.RECOVER) {
      const adjusted = now - this.burstStart;
      if (adjusted >= this.config.burstDuration) {
        this.burstState = BurstState.IDLE;
        this.burstProgress = 0;
        return 0;
      }
      this.burstProgress = 1 - (adjusted - halfDuration) / halfDuration;
    }

    const curveT = this.easeInOutCubic(this.burstProgress);
    return curveT * 2.5;
  }

  setPlaying(playing: boolean): void {
    if (playing && !this.isRunning) {
      this.start();
    } else if (!playing && this.isRunning) {
      this.stop();
    }
  }

  start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.clock.start();
    this.animate();
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = 0;
    }
  }

  private animate = (): void => {
    if (!this.isRunning) return;
    this.animationId = requestAnimationFrame(this.animate);

    const delta = Math.min(this.clock.getDelta(), 0.1);
    const now = performance.now();

    if (this.transitionProgress < 1) {
      const rawT = Math.min(1, (now - this.transitionStart) / this.config.shapeTransitionDuration);
      this.transitionProgress = this.easeInOutCubic(rawT);
      if (rawT >= 1) {
        this.currentShape = this.targetShape;
      }
    }

    const burstOffset = this.updateBurst(now);
    const temp = new THREE.Vector3();

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      if (this.transitionProgress < 1) {
        this.cubicBezier(this.transitionProgress, this.bezierControls[i], temp);
        this.particleData.positions[i3] = temp.x;
        this.particleData.positions[i3 + 1] = temp.y;
        this.particleData.positions[i3 + 2] = temp.z;
      } else {
        const phase = this.particleData.phases[i];
        const time = now * 0.001;
        const speed = this.speedScale * 0.3;
        const drift =
          Math.sin(time * 0.7 + phase) * 0.02 +
          Math.cos(time * 1.1 + phase * 1.3) * 0.01;

        this.particleData.positions[i3] =
          this.particleData.targetPositions[i3] +
          this.particleData.velocities[i3] * speed * delta * 60 +
          drift;
        this.particleData.positions[i3 + 1] =
          this.particleData.targetPositions[i3 + 1] +
          this.particleData.velocities[i3 + 1] * speed * delta * 60 +
          drift * 0.8;
        this.particleData.positions[i3 + 2] =
          this.particleData.targetPositions[i3 + 2] +
          this.particleData.velocities[i3 + 2] * speed * delta * 60 +
          drift;

        if (this.currentShape === ParticleShape.GALAXY) {
          const px = this.particleData.positions[i3];
          const pz = this.particleData.positions[i3 + 2];
          const radius = Math.sqrt(px * px + pz * pz);
          const rotSpeed = speed * 0.5 / (radius + 0.5);
          const cos = Math.cos(rotSpeed * delta);
          const sin = Math.sin(rotSpeed * delta);
          this.particleData.positions[i3] = px * cos - pz * sin;
          this.particleData.positions[i3 + 2] = px * sin + pz * cos;
        }
      }

      if (burstOffset > 0) {
        this.particleData.positions[i3] += this.burstDirections[i3] * burstOffset;
        this.particleData.positions[i3 + 1] += this.burstDirections[i3 + 1] * burstOffset;
        this.particleData.positions[i3 + 2] += this.burstDirections[i3 + 2] * burstOffset;
      }

      this.particleData.sizes[i] =
        this.particleData.baseSizes[i] * this.sizeScale * (1 + burstOffset * 0.2);
    }

    if (this.geometry) {
      (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
      (this.geometry.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    }

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  private handleResize = (): void => {
    const w = this.container.clientWidth;
    const h = this.container.clientHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  destroy(): void {
    this.stop();
    window.removeEventListener('resize', this.handleResize);
    this.unbindEvents();

    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    this.points = null;
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
