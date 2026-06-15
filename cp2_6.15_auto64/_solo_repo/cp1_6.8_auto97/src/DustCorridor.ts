import * as THREE from 'three';
import {
  StarParticleData,
  SpectralType,
  SPECTRAL_CONFIG,
  createStarParticle,
  updateStarParticlePosition,
  getSpectralColor,
} from './StarParticle';

const MAX_PARTICLES = 5000;
const CORRIDOR_RADIUS = 55;
const CORRIDOR_HEIGHT = 60;
const SPIRAL_TURNS = 4;

const vertexShader = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = aColor;
    vAlpha = aAlpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    gl_PointSize = clamp(gl_PointSize, 1.0, 64.0);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float glow = 1.0 - smoothstep(0.0, 0.5, dist);
    float core = 1.0 - smoothstep(0.0, 0.15, dist);
    vec3 color = vColor * glow + vec3(1.0) * core * 0.5;
    float alpha = vAlpha * glow * 0.8;
    gl_FragColor = vec4(color, alpha);
  }
`;

export class DustCorridor {
  private scene: THREE.Scene;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private points: THREE.Points;
  private particles: StarParticleData[] = [];
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private alphas: Float32Array;
  private _density: number = 2000;
  private _flowSpeed: number = 0.5;
  private _spectralShift: number = 0;
  private rippleMeshes: THREE.Mesh[] = [];
  private rippleLife: number[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.positions = new Float32Array(MAX_PARTICLES * 3);
    this.colors = new Float32Array(MAX_PARTICLES * 3);
    this.sizes = new Float32Array(MAX_PARTICLES);
    this.alphas = new Float32Array(MAX_PARTICLES);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('aColor', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('aAlpha', new THREE.BufferAttribute(this.alphas, 1));

    this.material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    scene.add(this.points);

    this.generateParticles(this._density);
  }

  get density(): number {
    return this._density;
  }
  set density(v: number) {
    const clamped = Math.max(500, Math.min(5000, Math.round(v)));
    if (clamped !== this._density) {
      this._density = clamped;
      this.generateParticles(clamped);
    }
  }

  get flowSpeed(): number {
    return this._flowSpeed;
  }
  set flowSpeed(v: number) {
    this._flowSpeed = Math.max(0.1, Math.min(2.0, v));
  }

  get spectralShift(): number {
    return this._spectralShift;
  }
  set spectralShift(v: number) {
    this._spectralShift = v;
    this.updateColors();
  }

  private generateParticles(count: number) {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push(createStarParticle(i, count));
    }
    for (let i = count; i < MAX_PARTICLES; i++) {
      this.positions[i * 3] = 0;
      this.positions[i * 3 + 1] = 0;
      this.positions[i * 3 + 2] = 0;
      this.alphas[i] = 0;
      this.sizes[i] = 0;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aAlpha.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;
    this.geometry.setDrawRange(0, count);
    this.updateColors();
  }

  private updateColors() {
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const color = getSpectralColor(p.spectralType, this._spectralShift);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
      const config = SPECTRAL_CONFIG[p.spectralType];
      this.alphas[i] = 0.4 + config.brightness * 0.6;
    }
    this.geometry.attributes.aColor.needsUpdate = true;
    this.geometry.attributes.aAlpha.needsUpdate = true;
  }

  randomize() {
    this.generateParticles(this._density);
  }

  update(deltaTime: number) {
    const dt = Math.min(deltaTime, 0.05);
    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const pos = updateStarParticlePosition(p, this._flowSpeed, dt);
      this.positions[i * 3] = pos.x;
      this.positions[i * 3 + 1] = pos.y;
      this.positions[i * 3 + 2] = pos.z;
      this.sizes[i] = pos.currentSize;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;

    this.updateRipples(dt);
  }

  getPointsObject(): THREE.Points {
    return this.points;
  }

  findNearestParticle(point: THREE.Vector3): { index: number; data: StarParticleData } | null {
    let minDist = Infinity;
    let nearestIdx = -1;
    const tempVec = new THREE.Vector3();
    for (let i = 0; i < this.particles.length; i++) {
      tempVec.set(
        this.positions[i * 3],
        this.positions[i * 3 + 1],
        this.positions[i * 3 + 2]
      );
      const dist = tempVec.distanceTo(point);
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = i;
      }
    }
    if (nearestIdx < 0 || minDist > 10) return null;
    return { index: nearestIdx, data: this.particles[nearestIdx] };
  }

  findParticleByScreenRay(
    raycaster: THREE.Raycaster
  ): { index: number; data: StarParticleData; worldPos: THREE.Vector3 } | null {
    const ray = raycaster.ray;
    let minDist = Infinity;
    let nearestIdx = -1;
    const tempVec = new THREE.Vector3();
    const closestOnRay = new THREE.Vector3();

    for (let i = 0; i < this.particles.length; i++) {
      tempVec.set(
        this.positions[i * 3],
        this.positions[i * 3 + 1],
        this.positions[i * 3 + 2]
      );
      ray.closestPointToPoint(tempVec, closestOnRay);
      const dist = tempVec.distanceTo(closestOnRay);
      if (dist < minDist) {
        minDist = dist;
        nearestIdx = i;
      }
    }

    if (nearestIdx < 0 || minDist > 3) return null;
    const worldPos = new THREE.Vector3(
      this.positions[nearestIdx * 3],
      this.positions[nearestIdx * 3 + 1],
      this.positions[nearestIdx * 3 + 2]
    );
    return { index: nearestIdx, data: this.particles[nearestIdx], worldPos };
  }

  spawnRipple(position: THREE.Vector3, spectralType: SpectralType) {
    const config = SPECTRAL_CONFIG[spectralType];
    const rippleColor = getSpectralColor(spectralType, this._spectralShift);
    const rippleGeo = new THREE.RingGeometry(0.1, 0.3, 64);
    const rippleMat = new THREE.MeshBasicMaterial({
      color: rippleColor,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const rippleMesh = new THREE.Mesh(rippleGeo, rippleMat);
    rippleMesh.position.copy(position);
    rippleMesh.lookAt(position.clone().add(new THREE.Vector3(0, 1, 0)));
    this.scene.add(rippleMesh);
    this.rippleMeshes.push(rippleMesh);
    this.rippleLife.push(1.5);
  }

  private updateRipples(dt: number) {
    for (let i = this.rippleMeshes.length - 1; i >= 0; i--) {
      this.rippleLife[i] -= dt;
      if (this.rippleLife[i] <= 0) {
        this.scene.remove(this.rippleMeshes[i]);
        this.rippleMeshes[i].geometry.dispose();
        (this.rippleMeshes[i].material as THREE.Material).dispose();
        this.rippleMeshes.splice(i, 1);
        this.rippleLife.splice(i, 1);
        continue;
      }
      const life = this.rippleLife[i];
      const maxLife = 1.5;
      const progress = 1 - life / maxLife;
      const scale = 1 + progress * 15;
      this.rippleMeshes[i].scale.set(scale, scale, scale);
      const mat = this.rippleMeshes[i].material as THREE.MeshBasicMaterial;
      mat.opacity = Math.max(0, (1 - progress) * 0.8);
    }
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.rippleMeshes.forEach((m) => {
      this.scene.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    });
  }
}
