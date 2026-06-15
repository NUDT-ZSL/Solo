import * as THREE from 'three';
import { StarTypeData, LifeStage } from './StarData';

interface DustParticle {
  orbitRadius: number;
  orbitSpeed: number;
  orbitPhase: number;
  orbitTilt: number;
  yOffset: number;
  baseY: number;
}

export class StarDust {
  public group: THREE.Group;
  public data: StarTypeData;

  private particleMesh: THREE.Points;
  private particles: DustParticle[];
  private positions: Float32Array;
  private targetColor: THREE.Color;
  private currentColor: THREE.Color;
  private convergeProgress: number = 0;
  private convergeTarget: THREE.Vector3 = new THREE.Vector3();
  private isConverging: boolean = false;
  private isExploding: boolean = false;
  private explodeProgress: number = 0;
  private explodeDirections: THREE.Vector3[];
  private explodeOrigin: THREE.Vector3 = new THREE.Vector3();

  constructor(data: StarTypeData, position: THREE.Vector3) {
    this.data = data;
    this.group = new THREE.Group();
    this.group.position.copy(position);

    this.currentColor = data.dustColor.clone();
    this.targetColor = data.dustColor.clone();

    const count = data.dustCount;
    this.particles = [];
    this.positions = new Float32Array(count * 3);
    this.explodeDirections = [];
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      const orbitRadius = data.baseRadius * (1.5 + Math.random() * 2.0);
      const orbitSpeed = 0.1 + Math.random() * 0.3;
      const orbitPhase = Math.random() * Math.PI * 2;
      const orbitTilt = (Math.random() - 0.5) * Math.PI * 0.6;
      const yOffset = (Math.random() - 0.5) * data.baseRadius;
      const baseY = yOffset;

      this.particles.push({ orbitRadius, orbitSpeed, orbitPhase, orbitTilt, yOffset, baseY });

      this.positions[i * 3] = Math.cos(orbitPhase) * orbitRadius;
      this.positions[i * 3 + 1] = yOffset;
      this.positions[i * 3 + 2] = Math.sin(orbitPhase) * orbitRadius;

      this.explodeDirections.push(
        new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ).normalize()
      );

      colors[i * 3] = this.currentColor.r;
      colors[i * 3 + 1] = this.currentColor.g;
      colors[i * 3 + 2] = this.currentColor.b;
      sizes[i] = 1.0 + Math.random() * 2.0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vColor = color;
          vAlpha = 0.7;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          float alpha = smoothstep(0.5, 0.1, d) * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.particleMesh = new THREE.Points(geometry, material);
    this.group.add(this.particleMesh);
  }

  public setStage(stage: LifeStage) {
    const stageColors: Record<LifeStage, { r: number; g: number; b: number }> = {
      main_sequence: { r: this.data.dustColor.r, g: this.data.dustColor.g, b: this.data.dustColor.b },
      red_giant: { r: 0.8, g: 0.2, b: 0.05 },
      white_dwarf: { r: 0.8, g: 0.8, b: 0.9 },
    };
    this.targetColor = new THREE.Color(
      stageColors[stage].r,
      stageColors[stage].g,
      stageColors[stage].b
    );
  }

  public triggerConverge(target: THREE.Vector3) {
    this.isConverging = true;
    this.convergeProgress = 0;
    this.convergeTarget.copy(target);
    this.isExploding = false;
    this.explodeProgress = 0;
  }

  private triggerExplode() {
    this.isConverging = false;
    this.isExploding = true;
    this.explodeProgress = 0;
    this.explodeOrigin.copy(this.convergeTarget);
  }

  public update(delta: number, elapsed: number) {
    const colAttr = this.particleMesh.geometry.getAttribute('color') as THREE.BufferAttribute;
    this.currentColor.lerp(this.targetColor, delta * 2.0);

    if (this.isConverging) {
      this.convergeProgress += delta * 2.5;
      if (this.convergeProgress >= 1.0) {
        this.convergeProgress = 1.0;
        this.triggerExplode();
      }
    }

    if (this.isExploding) {
      this.explodeProgress += delta * 1.8;
      if (this.explodeProgress >= 1.0) {
        this.isExploding = false;
        this.explodeProgress = 0;
      }
    }

    for (let i = 0; i < this.data.dustCount; i++) {
      const p = this.particles[i];
      const angle = elapsed * p.orbitSpeed + p.orbitPhase;

      let x = Math.cos(angle) * p.orbitRadius;
      let y = p.baseY + Math.sin(elapsed * 0.5 + p.orbitPhase) * 0.2;
      let z = Math.sin(angle) * p.orbitRadius * Math.cos(p.orbitTilt);

      if (this.isConverging) {
        const t = this.convergeProgress;
        const ease = t * t;
        const localTarget = this.convergeTarget.clone().sub(this.group.position);
        x = x + (localTarget.x - x) * ease;
        y = y + (localTarget.y - y) * ease;
        z = z + (localTarget.z - z) * ease;
      }

      if (this.isExploding) {
        const t = this.explodeProgress;
        const ease = 1.0 - (1.0 - t) * (1.0 - t);
        const dir = this.explodeDirections[i];
        const localOrigin = this.explodeOrigin.clone().sub(this.group.position);
        const speed = 3.0 + Math.random() * 2.0;
        x = localOrigin.x + dir.x * speed * ease;
        y = localOrigin.y + dir.y * speed * ease;
        z = localOrigin.z + dir.z * speed * ease;
      }

      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = y;
      this.positions[i * 3 + 2] = z;

      colAttr.setXYZ(i, this.currentColor.r, this.currentColor.g, this.currentColor.b);
    }

    const posAttr = this.particleMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;

    (this.particleMesh.material as THREE.ShaderMaterial).uniforms.uTime.value = elapsed;
  }

  public dispose() {
    this.particleMesh.geometry.dispose();
    (this.particleMesh.material as THREE.ShaderMaterial).dispose();
  }
}
