import * as THREE from 'three';

const MAX_PARTICLES = 6000;

interface ParticleSlot {
  ox: number;
  oy: number;
  oz: number;
  startAngle: number;
  angularSpeed: number;
  radialSpeed: number;
  upDrift: number;
  life: number;
  maxLife: number;
  r: number;
  g: number;
  b: number;
  active: boolean;
}

const COLOR_A = new THREE.Color(0.388, 0.31, 0.95);
const COLOR_B = new THREE.Color(0.545, 0.36, 0.97);
const COLOR_C = new THREE.Color(0.96, 0.62, 0.04);

function sampleGradient(t: number): THREE.Color {
  const c = new THREE.Color();
  if (t < 0.5) {
    c.copy(COLOR_A).lerp(COLOR_B, t * 2);
  } else {
    c.copy(COLOR_B).lerp(COLOR_C, (t - 0.5) * 2);
  }
  return c;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private slots: ParticleSlot[] = [];
  private mesh: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private posAttr: THREE.BufferAttribute;
  private colorAttr: THREE.BufferAttribute;
  private alphaAttr: THREE.BufferAttribute;
  private sizeAttr: THREE.BufferAttribute;
  private material: THREE.ShaderMaterial;
  private _diffusionSpeed = 1.0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    const positions = new Float32Array(MAX_PARTICLES * 3);
    const colors = new Float32Array(MAX_PARTICLES * 3);
    const alphas = new Float32Array(MAX_PARTICLES);
    const sizes = new Float32Array(MAX_PARTICLES);

    this.geometry = new THREE.BufferGeometry();
    this.posAttr = new THREE.BufferAttribute(positions, 3);
    this.colorAttr = new THREE.BufferAttribute(colors, 3);
    this.alphaAttr = new THREE.BufferAttribute(alphas, 1);
    this.sizeAttr = new THREE.BufferAttribute(sizes, 1);

    this.geometry.setAttribute('position', this.posAttr);
    this.geometry.setAttribute('aColor', this.colorAttr);
    this.geometry.setAttribute('aAlpha', this.alphaAttr);
    this.geometry.setAttribute('aSize', this.sizeAttr);
    this.geometry.setDrawRange(0, 0);

    this.material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: /* glsl */ `
        attribute vec3 aColor;
        attribute float aAlpha;
        attribute float aSize;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = aColor;
          vAlpha = aAlpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (200.0 / -mvPosition.z);
          gl_PointSize = clamp(gl_PointSize, 1.0, 64.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: /* glsl */ `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5)) * 2.0;
          if (d > 1.0) discard;
          float glow = 1.0 - smoothstep(0.0, 1.0, d);
          glow = pow(glow, 1.5);
          gl_FragColor = vec4(vColor * (1.0 + glow * 0.3), glow * vAlpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.mesh = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.mesh);
  }

  emit(positions: THREE.Vector3[], colorOffset: number): void {
    const step = Math.max(1, Math.floor(positions.length / 40));
    for (let i = 0; i < positions.length; i += step) {
      const count = 8 + Math.floor(Math.random() * 6);
      for (let j = 0; j < count; j++) {
        this.spawnParticle(positions[i], colorOffset, i / positions.length);
      }
    }
  }

  private spawnParticle(
    origin: THREE.Vector3,
    colorOffset: number,
    trailProgress: number
  ): void {
    if (this.slots.length >= MAX_PARTICLES) return;

    const t = (colorOffset + trailProgress * 0.5) % 1.0;
    const col = sampleGradient(t);

    const slot: ParticleSlot = {
      ox: origin.x + (Math.random() - 0.5) * 0.05,
      oy: origin.y + (Math.random() - 0.5) * 0.05,
      oz: origin.z + (Math.random() - 0.5) * 0.05,
      startAngle: Math.random() * Math.PI * 2,
      angularSpeed: (2 + Math.random() * 3) * (Math.random() < 0.5 ? 1 : -1),
      radialSpeed: (0.8 + Math.random() * 1.5) * this._diffusionSpeed,
      upDrift: (Math.random() - 0.5) * 0.6 * this._diffusionSpeed,
      life: 0,
      maxLife: 1.2 + Math.random() * 1.5,
      r: col.r,
      g: col.g,
      b: col.b,
      active: true,
    };

    const idx = this.slots.length;
    this.slots.push(slot);

    this.posAttr.setXYZ(idx, slot.ox, slot.oy, slot.oz);
    this.colorAttr.setXYZ(idx, slot.r, slot.g, slot.b);
    this.alphaAttr.setX(idx, 0);
    this.sizeAttr.setX(idx, 1.5 + Math.random());

    this.geometry.setDrawRange(0, idx + 1);
  }

  update(delta: number): void {
    let aliveCount = 0;

    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      if (!s.active) continue;

      s.life += delta;
      if (s.life >= s.maxLife) {
        s.active = false;
        this.alphaAttr.setX(i, 0);
        continue;
      }

      const age = s.life;
      const radius = s.radialSpeed * age;
      const angle = s.startAngle + s.angularSpeed * age;
      const x = s.ox + Math.cos(angle) * radius;
      const y = s.oy + s.upDrift * age;
      const z = s.oz + Math.sin(angle) * radius;

      const lifeRatio = s.life / s.maxLife;
      const alpha = (1.0 - lifeRatio) * (1.0 - lifeRatio);
      const size = (1.5 + Math.random() * 0.2) * (1.0 - lifeRatio * 0.5);

      this.posAttr.setXYZ(i, x, y, z);
      this.alphaAttr.setX(i, alpha);
      this.sizeAttr.setX(i, size);
      aliveCount++;
    }

    this.posAttr.needsUpdate = true;
    this.alphaAttr.needsUpdate = true;
    this.sizeAttr.needsUpdate = true;

    if (aliveCount === 0 && this.slots.length > 0) {
      this.compactSlots();
    }
  }

  private compactSlots(): void {
    this.slots.length = 0;
    this.geometry.setDrawRange(0, 0);
  }

  setDiffusionSpeed(v: number): void {
    this._diffusionSpeed = v;
  }

  reset(): void {
    this.slots.length = 0;
    this.geometry.setDrawRange(0, 0);
  }
}
