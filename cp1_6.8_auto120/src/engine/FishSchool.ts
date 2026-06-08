import * as THREE from 'three';

const fishVertexShader = `
  attribute float aSize;
  attribute float aPhase;
  attribute vec3 aFishColor;
  varying vec3 vFishColor;
  varying float vAlpha;
  uniform float uTime;
  uniform float uFishDensity;

  void main() {
    vFishColor = aFishColor;
    float flicker = 0.6 + 0.4 * sin(uTime * 3.0 + aPhase * 6.28);
    vAlpha = flicker * uFishDensity;

    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * flicker * (200.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fishFragmentShader = `
  varying vec3 vFishColor;
  varying float vAlpha;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    float glow = 1.0 - dist * 2.0;
    glow = pow(glow, 1.5);
    vec3 finalColor = vFishColor * glow * 1.5;
    float alpha = glow * vAlpha;

    gl_FragColor = vec4(finalColor, alpha);
  }
`;

const FISH_COLORS = [
  new THREE.Color(0xffd700),
  new THREE.Color(0x00ffcc),
  new THREE.Color(0x88ccff),
  new THREE.Color(0xffaa44),
  new THREE.Color(0x44ffaa),
];

interface FishParticle {
  baseX: number;
  baseY: number;
  baseZ: number;
  speedX: number;
  speedY: number;
  speedZ: number;
  radius: number;
  phase: number;
}

export class FishSchool {
  points: THREE.Points;
  private material: THREE.ShaderMaterial;
  private particles: FishParticle[] = [];
  private maxCount: number = 200;
  private positions: Float32Array;
  private sizes: Float32Array;
  private phases: Float32Array;
  private colors: Float32Array;

  constructor() {
    this.positions = new Float32Array(this.maxCount * 3);
    this.sizes = new Float32Array(this.maxCount);
    this.phases = new Float32Array(this.maxCount);
    this.colors = new Float32Array(this.maxCount * 3);

    this.initParticles();

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(this.sizes, 1));
    geometry.setAttribute('aPhase', new THREE.BufferAttribute(this.phases, 1));
    geometry.setAttribute('aFishColor', new THREE.BufferAttribute(this.colors, 3));

    this.material = new THREE.ShaderMaterial({
      vertexShader: fishVertexShader,
      fragmentShader: fishFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uFishDensity: { value: 0.5 },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.points = new THREE.Points(geometry, this.material);
  }

  private initParticles() {
    for (let i = 0; i < this.maxCount; i++) {
      const radius = 2 + Math.random() * 8;
      const angle = Math.random() * Math.PI * 2;
      const baseX = Math.cos(angle) * radius;
      const baseY = 0.5 + Math.random() * 4;
      const baseZ = Math.sin(angle) * radius;

      this.particles.push({
        baseX,
        baseY,
        baseZ,
        speedX: 0.3 + Math.random() * 0.7,
        speedY: 0.2 + Math.random() * 0.5,
        speedZ: 0.3 + Math.random() * 0.7,
        radius,
        phase: Math.random(),
      });

      this.positions[i * 3] = baseX;
      this.positions[i * 3 + 1] = baseY;
      this.positions[i * 3 + 2] = baseZ;

      this.sizes[i] = 2 + Math.random() * 4;
      this.phases[i] = Math.random();

      const color = FISH_COLORS[Math.floor(Math.random() * FISH_COLORS.length)];
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
    }
  }

  update(delta: number, currentSpeed: number, fishDensity: number) {
    this.material.uniforms.uTime.value += delta;
    this.material.uniforms.uFishDensity.value = fishDensity;

    const time = this.material.uniforms.uTime.value;
    const posAttr = this.points.geometry.attributes.position as THREE.BufferAttribute;

    for (let i = 0; i < this.maxCount; i++) {
      const p = this.particles[i];
      const angle = time * p.speedX * currentSpeed + p.phase * Math.PI * 2;

      this.positions[i * 3] = p.baseX + Math.cos(angle) * 1.5 * currentSpeed;
      this.positions[i * 3 + 1] = p.baseY + Math.sin(time * p.speedY + p.phase * 6.28) * 0.5;
      this.positions[i * 3 + 2] = p.baseZ + Math.sin(angle) * 1.5 * currentSpeed;
    }

    posAttr.needsUpdate = true;
  }

  dispose() {
    this.points.geometry.dispose();
    this.material.dispose();
  }
}
