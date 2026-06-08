import * as THREE from 'three';
import type { SceneParams } from './CoreScene';

export interface BubbleData {
  temperature: number;
  pressure: number;
  burstStrength: number;
}

interface Bubble {
  mesh: THREE.Mesh;
  data: BubbleData;
  birthTime: number;
  baseScale: number;
  phase: number;
  alive: boolean;
}

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
}

const BUBBLE_VERTEX_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const BUBBLE_FRAGMENT_SHADER = /* glsl */ `
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  uniform float uOpacity;
  uniform vec3 uColor;
  void main() {
    vec3 viewDir = normalize(vViewPosition);
    float fresnel = pow(1.0 - abs(dot(vNormal, viewDir)), 2.0);
    vec3 color = mix(uColor, vec3(1.0, 0.9, 0.7), fresnel * 0.7);
    float alpha = mix(0.3, 0.85, fresnel) * uOpacity;
    gl_FragColor = vec4(color, alpha);
  }
`;

const PARTICLE_VERTEX_SHADER = /* glsl */ `
  attribute float aLife;
  attribute float aSize;
  varying float vLife;
  varying float vSize;
  void main() {
    vLife = aLife;
    vSize = aSize;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (150.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const PARTICLE_FRAGMENT_SHADER = /* glsl */ `
  varying float vLife;
  varying float vSize;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.1, d) * vLife;
    vec3 color = mix(vec3(1.0, 0.2, 0.0), vec3(1.0, 0.8, 0.2), vLife * 0.5);
    gl_FragColor = vec4(color, alpha);
  }
`;

export class BubbleSystem {
  private scene: THREE.Scene;
  private params: SceneParams;
  private bubbles: Bubble[] = [];
  private particles: Particle[] = [];
  private particlePoints: THREE.Points | null = null;
  private spawnTimer: number = 0;
  private maxBubbles: number = 15;
  private bubbleGeometry: THREE.SphereGeometry;

  constructor(scene: THREE.Scene, params: SceneParams) {
    this.scene = scene;
    this.params = params;
    this.bubbleGeometry = new THREE.SphereGeometry(1, 24, 24);
  }

  private createBubble(elapsed: number): void {
    if (this.bubbles.length >= this.maxBubbles) return;

    const x = (Math.random() - 0.5) * 20;
    const z = (Math.random() - 0.5) * 20;
    const baseScale = Math.random() * 0.3 + 0.2;

    const material = new THREE.ShaderMaterial({
      vertexShader: BUBBLE_VERTEX_SHADER,
      fragmentShader: BUBBLE_FRAGMENT_SHADER,
      uniforms: {
        uOpacity: { value: 0.8 },
        uColor: { value: new THREE.Color(0.9, 0.3, 0.0) },
      },
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

    const mesh = new THREE.Mesh(this.bubbleGeometry, material);
    mesh.position.set(x, 0.5, z);
    mesh.scale.setScalar(0.01);
    this.scene.add(mesh);

    const temperature = 800 + Math.random() * 700;
    const pressure = 1.5 + Math.random() * 3.5;
    const burstStrength = (temperature / 1500) * pressure * 0.4;

    this.bubbles.push({
      mesh,
      data: { temperature, pressure, burstStrength },
      birthTime: elapsed,
      baseScale,
      phase: Math.random() * Math.PI * 2,
      alive: true,
    });
  }

  burstBubble(mesh: THREE.Mesh, worldPos: THREE.Vector3): void {
    const bubble = this.bubbles.find((b) => b.mesh === mesh);
    if (!bubble || !bubble.alive) return;

    bubble.alive = false;

    const particleCount = 60 + Math.floor(bubble.data.burstStrength * 40);
    for (let i = 0; i < particleCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.6;
      const speed = 2 + Math.random() * 4 * bubble.data.burstStrength;

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed * 0.8 + speed * 0.5,
        Math.sin(phi) * Math.sin(theta) * speed
      );

      this.particles.push({
        position: worldPos.clone(),
        velocity,
        life: 1.0,
        maxLife: 1.0 + Math.random() * 1.0,
        size: Math.random() * 3 + 1,
      });
    }

    this.scene.remove(mesh);
    (mesh.material as THREE.ShaderMaterial).dispose();
    this.bubbles = this.bubbles.filter((b) => b !== bubble);
  }

  getBubbleMeshes(): THREE.Object3D[] {
    return this.bubbles.filter((b) => b.alive).map((b) => b.mesh);
  }

  getBubbleData(mesh: THREE.Mesh): BubbleData | null {
    const bubble = this.bubbles.find((b) => b.mesh === mesh);
    return bubble ? bubble.data : null;
  }

  private updateParticles(delta: number): void {
    const gravity = -6;
    const drag = 0.98;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.velocity.y += gravity * delta;
      p.velocity.multiplyScalar(drag);
      p.position.add(p.velocity.clone().multiplyScalar(delta));
      p.life -= delta / p.maxLife;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }

    if (this.particlePoints) {
      this.scene.remove(this.particlePoints);
      this.particlePoints.geometry.dispose();
      (this.particlePoints.material as THREE.ShaderMaterial).dispose();
      this.particlePoints = null;
    }

    if (this.particles.length === 0) return;

    const count = this.particles.length;
    const positions = new Float32Array(count * 3);
    const lives = new Float32Array(count);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const p = this.particles[i];
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
      lives[i] = Math.max(0, p.life);
      sizes[i] = p.size * Math.max(0, p.life);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aLife', new THREE.BufferAttribute(lives, 1));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      vertexShader: PARTICLE_VERTEX_SHADER,
      fragmentShader: PARTICLE_FRAGMENT_SHADER,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.particlePoints = new THREE.Points(geometry, material);
    this.scene.add(this.particlePoints);
  }

  update(elapsed: number): void {
    const delta = 0.016;

    this.spawnTimer += delta;
    const spawnInterval = 1.5 / Math.max(0.1, this.params.flowSpeed);
    if (this.spawnTimer >= spawnInterval) {
      this.createBubble(elapsed);
      this.spawnTimer = 0;
    }

    for (const bubble of this.bubbles) {
      if (!bubble.alive) continue;

      const age = elapsed - bubble.birthTime;
      const growDuration = 3.0;
      const maxAge = 8 + Math.random() * 5;

      let scale: number;
      if (age < growDuration) {
        scale = bubble.baseScale * (age / growDuration);
      } else {
        scale = bubble.baseScale;
      }

      const wobble = Math.sin(elapsed * 2 + bubble.phase) * 0.05;
      scale += wobble;
      scale = Math.max(0.01, scale);

      bubble.mesh.scale.setScalar(scale);
      bubble.mesh.position.y = 0.3 + Math.sin(elapsed * 1.5 + bubble.phase) * 0.1;

      const heatRatio = 1 - age / maxAge;
      const mat = bubble.mesh.material as THREE.ShaderMaterial;
      mat.uniforms.uColor.value.setRGB(
        0.5 + heatRatio * 0.5,
        0.15 + heatRatio * 0.35,
        heatRatio * 0.1
      );
      mat.uniforms.uOpacity.value = 0.5 + heatRatio * 0.4;

      if (age > maxAge) {
        bubble.alive = false;
        this.burstBubble(bubble.mesh, bubble.mesh.position.clone());
      }
    }

    this.updateParticles(delta);
  }

  dispose(): void {
    for (const bubble of this.bubbles) {
      this.scene.remove(bubble.mesh);
      (bubble.mesh.material as THREE.ShaderMaterial).dispose();
    }
    this.bubbles = [];
    this.bubbleGeometry.dispose();

    if (this.particlePoints) {
      this.scene.remove(this.particlePoints);
      this.particlePoints.geometry.dispose();
      (this.particlePoints.material as THREE.ShaderMaterial).dispose();
    }
    this.particles = [];
  }
}
