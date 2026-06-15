import * as THREE from 'three';

export interface ParticleConfig {
  count: number;
  speed: number;
  rotation: number;
  colorMix: number;
  size: number;
  trail: number;
  noise: number;
}

export const DEFAULT_CONFIG: ParticleConfig = {
  count: 5000,
  speed: 1.0,
  rotation: 0.2,
  colorMix: 0.5,
  size: 3.0,
  trail: 0.0,
  noise: 0.0,
};

const PRIMARY_COLOR = new THREE.Color('#fbbf24');
const SECONDARY_COLOR = new THREE.Color('#ec4899');

const vertexShader = `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vec2 center = gl_PointCoord - vec2(0.5);
    float dist = length(center);
    if (dist > 0.5) discard;
    float soft = smoothstep(0.5, 0.0, dist);
    gl_FragColor = vec4(vColor, vAlpha * soft);
  }
`;

export class ParticleEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private points: THREE.Points;
  private config: ParticleConfig;
  private animationId: number | null = null;
  private time: number = 0;
  private lastTime: number = 0;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private alphas: Float32Array;
  private baseRadii: Float32Array;
  private baseAngles: Float32Array;
  private elevations: Float32Array;
  private seeds: Float32Array;
  private phaseOffsets: Float32Array;
  private container: HTMLElement;
  private onFrame?: (fps: number) => void;
  private fpsAccum: number = 0;
  private fpsFrames: number = 0;
  private fpsTimer: number = 0;

  constructor(container: HTMLElement, config: ParticleConfig = DEFAULT_CONFIG, onFrame?: (fps: number) => void) {
    this.container = container;
    this.config = { ...config };
    this.onFrame = onFrame;

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0d0d1a');

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.NoToneMapping;
    container.appendChild(this.renderer.domElement);

    const count = this.config.count;
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.alphas = new Float32Array(count);
    this.baseRadii = new Float32Array(count);
    this.baseAngles = new Float32Array(count);
    this.elevations = new Float32Array(count);
    this.seeds = new Float32Array(count);
    this.phaseOffsets = new Float32Array(count);

    this.initParticles(count);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      uniforms: {},
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);

    this.setupResize();
  }

  private initParticles(count: number) {
    const tmpColor = new THREE.Color();
    const GOLDEN = Math.PI * (3 - Math.sqrt(5));

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const t = i / count;
      const spiralR = Math.sqrt(t) * 3.0;
      const spiralA = i * GOLDEN + Math.random() * 0.3;

      this.baseRadii[i] = spiralR;
      this.baseAngles[i] = spiralA;
      this.elevations[i] = (Math.random() - 0.5) * 0.8 + Math.sin(spiralA * 2) * 0.2;

      this.positions[i3] = Math.cos(spiralA) * spiralR * 0.05;
      this.positions[i3 + 1] = this.elevations[i] * 0.05;
      this.positions[i3 + 2] = Math.sin(spiralA) * spiralR * 0.05;

      const mixFactor = Math.random();
      tmpColor.copy(PRIMARY_COLOR).lerp(SECONDARY_COLOR, mixFactor * this.config.colorMix);
      this.colors[i3] = tmpColor.r;
      this.colors[i3 + 1] = tmpColor.g;
      this.colors[i3 + 2] = tmpColor.b;

      this.sizes[i] = (2 + Math.random() * 2) * this.config.size / 3;
      this.alphas[i] = 0.6 + Math.random() * 0.4;
      this.seeds[i] = Math.random() * Math.PI * 2;
      this.phaseOffsets[i] = Math.random() * 2.0;
    }
  }

  private setupResize() {
    const onResize = () => {
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(width, height);
    };
    window.addEventListener('resize', onResize);
  }

  private animate = (timestamp: number) => {
    this.animationId = requestAnimationFrame(this.animate);

    const delta = this.lastTime ? (timestamp - this.lastTime) / 1000 : 0.016;
    this.lastTime = timestamp;
    this.time += delta;
    const clampedDelta = Math.min(delta, 0.033);

    this.fpsAccum += 1 / Math.max(clampedDelta, 0.0001);
    this.fpsFrames += 1;
    this.fpsTimer += clampedDelta;
    if (this.fpsTimer >= 0.5 && this.onFrame) {
      this.onFrame(this.fpsAccum / this.fpsFrames);
      this.fpsAccum = 0;
      this.fpsFrames = 0;
      this.fpsTimer = 0;
    }

    const count = this.config.count;
    const rotSpeed = this.config.rotation;
    const spd = this.config.speed;
    const noiseAmt = this.config.noise;
    const colorMix = this.config.colorMix;
    const tmpColor = new THREE.Color();

    const TWO_PI = Math.PI * 2;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const seed = this.seeds[i];

      const br = this.baseRadii[i];
      const ba = this.baseAngles[i];
      const elev = this.elevations[i];

      const progress = ((this.time * spd * 0.3) + this.phaseOffsets[i]) % 2.0;
      const eased = progress < 1.0
        ? progress * progress * (3 - 2 * progress)
        : 1.0 - (progress - 1.0) * (progress - 1.0) * (3 - 2 * (progress - 1.0));

      const grow = eased;
      const currentR = br * grow;
      const spiralOffset = grow * 4.0;
      const rot = ba + spiralOffset + this.time * rotSpeed + Math.sin(this.time * 0.5 + seed) * 0.1;

      let nx = Math.cos(rot) * currentR;
      let nz = Math.sin(rot) * currentR;
      let ny = elev * grow + Math.sin(this.time * 1.0 + seed * 2.0) * 0.08 * spd;

      if (noiseAmt > 0) {
        nx += Math.sin(this.time * 1.5 + seed * 1.3) * noiseAmt * 0.15;
        ny += Math.cos(this.time * 1.2 + seed * 1.7) * noiseAmt * 0.15;
        nz += Math.sin(this.time * 1.8 + seed * 2.1) * noiseAmt * 0.15;
      }

      this.positions[i3] = nx;
      this.positions[i3 + 1] = ny;
      this.positions[i3 + 2] = nz;

      const blinkPhase = this.time * Math.PI + this.phaseOffsets[i] * Math.PI;
      const blinkVal = 0.5 + 0.5 * Math.sin(blinkPhase);
      const alpha = 0.6 + 0.4 * blinkVal;
      this.alphas[i] = alpha;

      const colorPhase = this.time * 0.7 + seed * 3.0;
      const mixFactor = (0.5 + 0.5 * Math.sin(colorPhase)) * colorMix;
      tmpColor.copy(PRIMARY_COLOR).lerp(SECONDARY_COLOR, mixFactor);
      this.colors[i3] = tmpColor.r;
      this.colors[i3 + 1] = tmpColor.g;
      this.colors[i3 + 2] = tmpColor.b;
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aColor as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.aAlpha as THREE.BufferAttribute).needsUpdate = true;

    this.renderer.render(this.scene, this.camera);
  };

  start() {
    if (this.animationId !== null) return;
    this.lastTime = 0;
    this.animationId = requestAnimationFrame(this.animate);
  }

  stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  updateConfig(newConfig: Partial<ParticleConfig>) {
    const t0 = performance.now();
    const oldCount = this.config.count;
    Object.assign(this.config, newConfig);

    if (newConfig.count !== undefined && newConfig.count !== oldCount) {
      this.rebuildParticles(newConfig.count);
    }
    if (newConfig.size !== undefined) {
      const count = this.config.count;
      for (let i = 0; i < count; i++) {
        this.sizes[i] = (2 + ((this.seeds[i] * 0.5 + 0.5) * 2)) * newConfig.size / 3;
      }
      (this.geometry.attributes.aSize as THREE.BufferAttribute).needsUpdate = true;
    }
    const elapsed = performance.now() - t0;
    if (elapsed > 1) {
      console.warn(`[ParticleEngine] updateConfig took ${elapsed.toFixed(2)}ms (target <= 1ms)`);
    }
  }

  private rebuildParticles(count: number) {
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.alphas = new Float32Array(count);
    this.baseRadii = new Float32Array(count);
    this.baseAngles = new Float32Array(count);
    this.elevations = new Float32Array(count);
    this.seeds = new Float32Array(count);
    this.phaseOffsets = new Float32Array(count);

    this.initParticles(count);

    this.geometry.dispose();
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));

    this.points.geometry = this.geometry;
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera;
  }

  getRenderer(): THREE.WebGLRenderer {
    return this.renderer;
  }

  getScene(): THREE.Scene {
    return this.scene;
  }

  getCanvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  dispose() {
    this.stop();
    this.geometry.dispose();
    this.material.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
