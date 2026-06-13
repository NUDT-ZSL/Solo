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

export class ParticleEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private config: ParticleConfig;
  private animationId: number | null = null;
  private time: number = 0;
  private lastTime: number = 0;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private alphas: Float32Array;
  private basePositions: Float32Array;
  private seeds: Float32Array;
  private trails: THREE.Line[] = [];
  private trailGeometry: THREE.BufferGeometry[] = [];
  private trailPositions: Float32Array[] = [];
  private container: HTMLElement;

  constructor(container: HTMLElement, config: ParticleConfig = DEFAULT_CONFIG) {
    this.container = container;
    this.config = { ...config };

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#0d0d1a');

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.z = 5;

    this.renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      preserveDrawingBuffer: true,
    });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    const count = this.config.count;
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.alphas = new Float32Array(count);
    this.basePositions = new Float32Array(count * 3);
    this.seeds = new Float32Array(count);

    this.initParticles(count);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: this.config.size,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.points);

    this.setupResize();
  }

  private initParticles(count: number) {
    const tmpColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 3.0;
      const elevation = (Math.random() - 0.5) * 1.5;

      this.basePositions[i3] = Math.cos(angle) * radius;
      this.basePositions[i3 + 1] = elevation;
      this.basePositions[i3 + 2] = Math.sin(angle) * radius;

      this.positions[i3] = this.basePositions[i3];
      this.positions[i3 + 1] = this.basePositions[i3 + 1];
      this.positions[i3 + 2] = this.basePositions[i3 + 2];

      const mixFactor = Math.random();
      tmpColor.copy(PRIMARY_COLOR).lerp(SECONDARY_COLOR, mixFactor * this.config.colorMix);
      this.colors[i3] = tmpColor.r;
      this.colors[i3 + 1] = tmpColor.g;
      this.colors[i3 + 2] = tmpColor.b;

      this.sizes[i] = 2 + Math.random() * 2;
      this.alphas[i] = 0.6 + Math.random() * 0.4;
      this.seeds[i] = Math.random() * Math.PI * 2;
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

    const count = this.config.count;
    const rotSpeed = this.config.rotation;
    const spd = this.config.speed;
    const noiseAmt = this.config.noise;
    const colorMix = this.config.colorMix;
    const trailLen = this.config.trail;
    const tmpColor = new THREE.Color();

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const seed = this.seeds[i];

      const bx = this.basePositions[i3];
      const by = this.basePositions[i3 + 1];
      const bz = this.basePositions[i3 + 2];

      const dist = Math.sqrt(bx * bx + bz * bz);
      const baseAngle = Math.atan2(bz, bx);
      const newAngle = baseAngle + this.time * rotSpeed * (1 + dist * 0.3);

      const expandFactor = 1 + this.time * spd * 0.02;
      const maxExpand = 4.0;
      const effectiveExpand = Math.min(expandFactor, maxExpand);
      const newDist = dist * effectiveExpand;

      let nx = Math.cos(newAngle) * newDist;
      let ny = by + Math.sin(this.time * 1.5 + seed) * 0.1 * spd;
      let nz = Math.sin(newAngle) * newDist;

      if (noiseAmt > 0) {
        nx += Math.sin(this.time * 2.0 + seed * 3.0) * noiseAmt * 0.3;
        ny += Math.cos(this.time * 1.7 + seed * 2.0) * noiseAmt * 0.3;
        nz += Math.sin(this.time * 1.3 + seed * 4.0) * noiseAmt * 0.3;
      }

      this.positions[i3] = nx;
      this.positions[i3 + 1] = ny;
      this.positions[i3 + 2] = nz;

      const alphaCycle = 0.6 + 0.4 * Math.sin(this.time * Math.PI + seed * 3.0);
      this.alphas[i] = alphaCycle;

      const mixFactor = (Math.sin(this.time + seed * 5.0) * 0.5 + 0.5) * colorMix;
      tmpColor.copy(PRIMARY_COLOR).lerp(SECONDARY_COLOR, mixFactor);
      this.colors[i3] = tmpColor.r;
      this.colors[i3 + 1] = tmpColor.g;
      this.colors[i3 + 2] = tmpColor.b;
    }

    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;

    this.material.opacity = 0.85;
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
    const oldCount = this.config.count;
    Object.assign(this.config, newConfig);

    if (newConfig.count !== undefined && newConfig.count !== oldCount) {
      this.rebuildParticles(newConfig.count);
    }

    if (newConfig.size !== undefined) {
      this.material.size = newConfig.size;
    }
  }

  private rebuildParticles(count: number) {
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.alphas = new Float32Array(count);
    this.basePositions = new Float32Array(count * 3);
    this.seeds = new Float32Array(count);

    this.initParticles(count);

    this.geometry.dispose();
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

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
    this.trails.forEach((t) => {
      t.geometry.dispose();
      (t.material as THREE.Material).dispose();
    });
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
