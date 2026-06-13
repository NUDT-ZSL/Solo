import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { BuildingData, colorTempToRGB, getPerformanceLimits } from './DataGenerator';

const PARTICLE_COUNT = 3000;
const ROTATION_SPEED = 0.1;

export class ParticleOverlay {
  private scene: THREE.Scene;
  private composer: EffectComposer;
  private bloomPass: UnrealBloomPass;
  private points: THREE.Points | null = null;
  private pivotGroup: THREE.Group;
  private buildingData: BuildingData[] = [];
  private colorTempOffset = 0;
  private clock = new THREE.Clock();

  constructor(scene: THREE.Scene, renderer: THREE.WebGLRenderer) {
    this.scene = scene;
    this.pivotGroup = new THREE.Group();
    this.scene.add(this.pivotGroup);

    this.composer = new EffectComposer(renderer);
    this.composer.addPass(new RenderPass(scene, new THREE.Object3D() as any));

    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      1.2,
      0.6,
      0.3
    );
    this.composer.addPass(this.bloomPass);
  }

  init(data: BuildingData[]): void {
    this.buildingData = data;
    if (this.points) {
      this.pivotGroup.remove(this.points);
      this.points.geometry.dispose();
      (this.points.material as THREE.Material).dispose();
    }

    const count = Math.min(PARTICLE_COUNT, getPerformanceLimits().MAX_PARTICLES);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const bIdx = Math.floor(Math.random() * data.length);
      const b = data[bIdx];
      const heightOffset = Math.random() * 3;
      const baseY = b.height;

      positions[i * 3] = b.x + (Math.random() - 0.5) * 0.8;
      positions[i * 3 + 1] = baseY + heightOffset;
      positions[i * 3 + 2] = b.z + (Math.random() - 0.5) * 0.8;

      const [cr, cg, cb] = colorTempToRGB(b.colorTemp + this.colorTempOffset);
      colors[i * 3] = cr;
      colors[i * 3 + 1] = cg;
      colors[i * 3 + 2] = cb;

      sizes[i] = 2 + Math.random() * 4;
      alphas[i] = 1.0 - (heightOffset / 3.0);
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));
    geo.setAttribute('aAlpha', new THREE.Float32BufferAttribute(alphas, 1));

    const vertexShader = `
      attribute float size;
      attribute float aAlpha;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = color;
        vAlpha = aAlpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (200.0 / -mvPosition.z);
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
        gl_FragColor = vec4(vColor, vAlpha * glow);
      }
    `;

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    this.points = new THREE.Points(geo, mat);
    this.pivotGroup.add(this.points);
  }

  updateColorTempOffset(offset: number): void {
    this.colorTempOffset = offset;
    if (!this.points || this.buildingData.length === 0) return;
    const colors = this.points.geometry.getAttribute('color') as THREE.BufferAttribute;
    const count = colors.count;
    for (let i = 0; i < count; i++) {
      const bIdx = Math.floor(Math.random() * this.buildingData.length);
      const b = this.buildingData[bIdx];
      const [cr, cg, cb] = colorTempToRGB(b.colorTemp + offset);
      colors.setXYZ(i, cr, cg, cb);
    }
    colors.needsUpdate = true;
  }

  setCamera(camera: THREE.Camera): void {
    const renderPass = this.composer.passes[0] as RenderPass;
    renderPass.camera = camera;
  }

  render(camera: THREE.Camera): void {
    this.setCamera(camera);
    const delta = this.clock.getDelta();
    this.pivotGroup.rotation.y += ROTATION_SPEED * delta;
    this.composer.render();
  }

  getComposer(): EffectComposer {
    return this.composer;
  }

  resize(width: number, height: number): void {
    this.composer.setSize(width, height);
    this.bloomPass.resolution.set(width, height);
  }

  getParticleCount(): number {
    return this.points ? this.points.geometry.getAttribute('position').count : 0;
  }
}
