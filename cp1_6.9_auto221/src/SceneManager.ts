import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { CrystalCluster } from './CrystalCluster';
import {
  ColorTheme,
  THEMES,
  FireflySystem,
  ConnectionNetwork,
  PulseRing,
  TipParticles,
  updateRippleTexture
} from './effects';

export interface SceneManagerCallbacks {
  onFpsUpdate?: (fps: number) => void;
}

const DEFAULT_CLUSTER_COUNT = 15;
const DEFAULT_RIPPLE_SPEED = 1.0;
const DEFAULT_THEME: ColorTheme = 'aurora';
const SCENE_BOUNDS = 6.5;
const CAMERA_RESET_DURATION = 1.5;
const PULSE_MAX_RADIUS = 8;
const PULSE_DURATION = 2;

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private renderer: THREE.WebGLRenderer;
  private composer: EffectComposer;
  private callbacks: SceneManagerCallbacks;

  private clusters: CrystalCluster[] = [];
  private desiredClusterCount: number = DEFAULT_CLUSTER_COUNT;
  private rippleSpeed: number = DEFAULT_RIPPLE_SPEED;
  private currentTheme: ColorTheme = DEFAULT_THEME;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouseNDC: THREE.Vector2 = new THREE.Vector2(-10, -10);
  private mouseDirty: boolean = false;
  private hoveredCluster: CrystalCluster | null = null;
  private hoveredTimeoutId: number | null = null;

  private fireflies!: FireflySystem;
  private connectionNetwork!: ConnectionNetwork;
  private tipParticles!: TipParticles;
  private pulseRings: PulseRing[] = [];

  private resetState: {
    active: boolean;
    elapsed: number;
    fromPos: THREE.Vector3;
    fromTarget: THREE.Vector3;
    toPos: THREE.Vector3;
    toTarget: THREE.Vector3;
  } = {
      active: false,
      elapsed: 0,
      fromPos: new THREE.Vector3(),
      fromTarget: new THREE.Vector3(),
      toPos: new THREE.Vector3(),
      toTarget: new THREE.Vector3()
    };

  private initialCameraPos: THREE.Vector3 = new THREE.Vector3(0, 0, 10);
  private initialCameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private prevCameraDir: THREE.Vector3 = new THREE.Vector3();

  private fpsFrames: number = 0;
  private fpsElapsed: number = 0;
  private totalTime: number = 0;

  private canvas: HTMLCanvasElement;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    controls: OrbitControls,
    renderer: THREE.WebGLRenderer,
    callbacks: SceneManagerCallbacks = {}
  ) {
    this.scene = scene;
    this.camera = camera;
    this.controls = controls;
    this.renderer = renderer;
    this.callbacks = callbacks;
    this.canvas = renderer.domElement;

    this.initialCameraPos.copy(camera.position);
    this.initialCameraTarget.copy(controls.target);

    this.setupPostProcessing();
    this.setupAmbient();
    this.setupEffects();
    this.setupEventListeners();
    this.generateClusters(this.desiredClusterCount);

    requestAnimationFrame(() => {
      for (const c of this.clusters) c.startFlyIn();
    });
  }

  private setupPostProcessing(): void {
    const size = new THREE.Vector2();
    this.renderer.getSize(size);
    const pixelRatio = this.renderer.getPixelRatio();

    this.composer = new EffectComposer(this.renderer);
    this.composer.setPixelRatio(pixelRatio);
    this.composer.setSize(size.x, size.y);

    const renderPass = new RenderPass(this.scene, this.camera);
    this.composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(size.x, size.y),
      0.75,
      0.55,
      0.18
    );
    this.composer.addPass(bloomPass);

    const outputPass = new OutputPass();
    this.composer.addPass(outputPass);
  }

  private setupAmbient(): void {
    this.scene.fog = new THREE.FogExp2(0x060312, 0.022);

    const ambient = new THREE.AmbientLight(0x4a3a7a, 0.2);
    this.scene.add(ambient);

    const hemi = new THREE.HemisphereLight(0x8b5cf6, 0x0f0520, 0.15);
    this.scene.add(hemi);

    const bgGeo = new THREE.SphereGeometry(40, 32, 32);
    const bgMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        uTop: { value: new THREE.Color('#1a0a2e') },
        uBot: { value: new THREE.Color('#020108') },
        uMid: { value: new THREE.Color('#0c0520') }
      },
      vertexShader: `
        varying vec3 vPos;
        void main() {
          vPos = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vPos;
        uniform vec3 uTop;
        uniform vec3 uBot;
        uniform vec3 uMid;
        void main() {
          float t = normalize(vPos).y * 0.5 + 0.5;
          vec3 c = mix(uBot, uMid, smoothstep(0.0, 0.55, t));
          c = mix(c, uTop, smoothstep(0.55, 1.0, t));
          float r = length(vPos.xy) / 40.0;
          c *= 1.0 - r * 0.15;
          gl_FragColor = vec4(c, 1.0);
        }
      `
    });
    const bg = new THREE.Mesh(bgGeo, bgMat);
    this.scene.add(bg);
  }

  private setupEffects(): void {
    this.fireflies = new FireflySystem({
      count: 90,
      scene: this.scene,
      bounds: 9,
      theme: this.currentTheme
    });

    this.connectionNetwork = new ConnectionNetwork(
      this.fireflies.getPoints(),
      this.scene,
      1.8
    );

    this.tipParticles = new TipParticles({
      scene: this.scene
    });
  }

  private setupEventListeners(): void {
    const onMouseMove = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseNDC.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouseNDC.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.mouseDirty = true;

      if (this.hoveredTimeoutId !== null) {
        clearTimeout(this.hoveredTimeoutId);
        this.hoveredTimeoutId = null;
      }
    };

    const onMouseLeave = () => {
      this.mouseNDC.set(-10, -10);
      this.mouseDirty = true;
      if (this.hoveredCluster) {
        this.hoveredCluster.setHovered(false);
        this.hoveredCluster = null;
      }
    };

    const onClick = (e: MouseEvent) => {
      const rect = this.canvas.getBoundingClientRect();
      const ndcX = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const ndcY = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      this.raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), this.camera);
      const hit = this.raycastCluster();
      if (hit) {
        this.spawnPulse(hit);
      }
    };

    this.canvas.addEventListener('pointermove', onMouseMove);
    this.canvas.addEventListener('pointerleave', onMouseLeave);
    this.canvas.addEventListener('click', onClick);
  }

  private raycastCluster(): CrystalCluster | null {
    const meshes: THREE.Mesh[] = [];
    const meshToCluster = new Map<THREE.Mesh, CrystalCluster>();
    for (const cluster of this.clusters) {
      cluster.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const mesh = obj as THREE.Mesh;
          meshes.push(mesh);
          meshToCluster.set(mesh, cluster);
        }
      });
    }
    const intersects = this.raycaster.intersectObjects(meshes, false);
    if (intersects.length === 0) return null;
    const hitMesh = intersects[0].object as THREE.Mesh;
    return meshToCluster.get(hitMesh) || null;
  }

  private generateClusterPosition(): THREE.Vector3 {
    const centerBias = Math.pow(Math.random(), 1.8);
    const r = 0.8 + centerBias * SCENE_BOUNDS;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    return new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.sin(phi) * Math.sin(theta) * 0.75,
      r * Math.cos(phi) * 0.85
    );
  }

  private generateClusters(count: number): void {
    for (let i = 0; i < count; i++) {
      const pos = this.generateClusterPosition();
      const crystalCount = 4 + Math.floor(Math.random() * 6);
      const cluster = new CrystalCluster({
        position: pos,
        theme: this.currentTheme,
        crystalCount
      });
      this.scene.add(cluster);
      this.clusters.push(cluster);
    }
  }

  setClusterCount(count: number): void {
    count = Math.max(5, Math.min(30, Math.round(count)));
    if (count === this.desiredClusterCount) return;
    this.desiredClusterCount = count;
    const diff = count - this.clusters.length;

    if (diff > 0) {
      for (let i = 0; i < diff; i++) {
        const pos = this.generateClusterPosition();
        const crystalCount = 4 + Math.floor(Math.random() * 6);
        const cluster = new CrystalCluster({
          position: pos,
          theme: this.currentTheme,
          crystalCount
        });
        this.scene.add(cluster);
        this.clusters.push(cluster);
        setTimeout(() => cluster.startFlyIn(), i * 40);
      }
    } else if (diff < 0) {
      const toRemove = this.clusters.slice(diff);
      this.clusters = this.clusters.slice(0, diff);
      for (const c of toRemove) {
        c.flyOut();
      }
    }
  }

  setRippleSpeed(speed: number): void {
    this.rippleSpeed = Math.max(0.1, Math.min(2.0, speed));
  }

  setTheme(theme: ColorTheme): void {
    if (theme === this.currentTheme) return;
    this.currentTheme = theme;
    this.fireflies.theme = theme;
    for (const c of this.clusters) {
      c.setTheme(theme);
    }
  }

  resetCamera(): void {
    this.resetState.active = true;
    this.resetState.elapsed = 0;
    this.resetState.fromPos.copy(this.camera.position);
    this.resetState.fromTarget.copy(this.controls.target);
    this.resetState.toPos.copy(this.initialCameraPos);
    this.resetState.toTarget.copy(this.initialCameraTarget);
  }

  private spawnPulse(cluster: CrystalCluster): void {
    const pos = new THREE.Vector3();
    cluster.getWorldPosition(pos);
    const ring = new PulseRing({
      position: pos,
      theme: this.currentTheme,
      maxRadius: PULSE_MAX_RADIUS,
      duration: PULSE_DURATION,
      scene: this.scene,
      onRadiusReached: (radius, ringPos, theme) => {
        for (const c of this.clusters) {
          if (c === cluster) continue;
          const cPos = new THREE.Vector3();
          c.getWorldPosition(cPos);
          const dist = cPos.distanceTo(ringPos);
          if (dist <= radius + 0.6 && dist >= radius - 0.6) {
            c.triggerPulse(theme);
          }
        }
      }
    });
    this.pulseRings.push(ring);
    cluster.triggerPulse(this.currentTheme);
  }

  handleResize(width: number, height: number, pixelRatio: number): void {
    if (this.composer) {
      this.composer.setPixelRatio(pixelRatio);
      this.composer.setSize(width, height);
    }
  }

  update(delta: number): void {
    this.totalTime += delta;

    updateRippleTexture(this.totalTime, this.rippleSpeed);

    if (this.resetState.active) {
      this.resetState.elapsed += delta;
      const t = Math.min(this.resetState.elapsed / CAMERA_RESET_DURATION, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      this.camera.position.lerpVectors(this.resetState.fromPos, this.resetState.toPos, eased);
      this.controls.target.lerpVectors(this.resetState.fromTarget, this.resetState.toTarget, eased);
      this.controls.update();
      if (t >= 1) this.resetState.active = false;
    }

    if (this.mouseDirty) {
      this.mouseDirty = false;
      this.raycaster.setFromCamera(this.mouseNDC, this.camera);
      const hit = this.raycastCluster();
      if (hit !== this.hoveredCluster) {
        if (this.hoveredCluster) this.hoveredCluster.setHovered(false);
        this.hoveredCluster = hit;
        if (this.hoveredCluster) this.hoveredCluster.setHovered(true);
      }
    }

    const camDir = new THREE.Vector3();
    this.camera.getWorldDirection(camDir);
    const parallaxDir = new THREE.Vector3(
      camDir.x - this.prevCameraDir.x,
      camDir.y - this.prevCameraDir.y,
      camDir.z - this.prevCameraDir.z
    );
    this.prevCameraDir.copy(camDir);

    for (const cluster of this.clusters) {
      cluster.update(delta, this.totalTime, this.rippleSpeed, parallaxDir);
    }

    this.fireflies.update(delta, this.totalTime);
    this.connectionNetwork.update(this.currentTheme);

    const emitters = this.clusters.filter((c) => c.visible);
    this.tipParticles.emitFromEmitters(emitters as any, delta, this.totalTime);
    this.tipParticles.update(delta, this.totalTime);

    this.pulseRings = this.pulseRings.filter((ring) => !ring.update(delta, this.totalTime));

    if (!this.resetState.active) {
      this.controls.update();
    }

    this.fpsFrames++;
    this.fpsElapsed += delta;
    if (this.fpsElapsed >= 0.5) {
      const fps = Math.round(this.fpsFrames / this.fpsElapsed);
      this.callbacks.onFpsUpdate?.(fps);
      this.fpsFrames = 0;
      this.fpsElapsed = 0;
    }
  }

  render(): void {
    this.composer.render();
  }

  dispose(): void {
    for (const c of this.clusters) c.dispose();
    this.clusters = [];
    this.fireflies.dispose();
    this.connectionNetwork.dispose();
    this.tipParticles.dispose();
    for (const ring of this.pulseRings) ring.dispose();
    this.pulseRings = [];
  }
}
