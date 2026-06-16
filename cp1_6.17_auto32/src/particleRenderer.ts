import * as THREE from 'three';
import type { ParticleData } from './weatherSystem';

export class ParticleRenderer {
  private scene: THREE.Scene;
  private points: THREE.Points | null = null;
  private geometry: THREE.BufferGeometry | null = null;
  private material: THREE.ShaderMaterial | null = null;
  private positionAttribute: THREE.BufferAttribute | null = null;
  private colorAttribute: THREE.BufferAttribute | null = null;
  private sizeAttribute: THREE.BufferAttribute | null = null;
  private currentParticleCount: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public init(particleCount: number): void {
    this.dispose();
    this.currentParticleCount = particleCount;
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    for (let i = 0; i < particleCount; i++) {
      sizes[i] = 1.5;
    }
    this.positionAttribute = new THREE.BufferAttribute(positions, 3);
    this.colorAttribute = new THREE.BufferAttribute(colors, 3);
    this.sizeAttribute = new THREE.BufferAttribute(sizes, 1);
    this.geometry.setAttribute('position', this.positionAttribute);
    this.geometry.setAttribute('aColor', this.colorAttribute);
    this.geometry.setAttribute('aSize', this.sizeAttribute);
    this.material = this.createShaderMaterial();
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.scene.add(this.points);
  }

  private createShaderMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uSizeScale: { value: 120.0 }
      },
      vertexShader: `
        attribute float aSize;
        attribute vec3 aColor;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uPixelRatio;
        uniform float uSizeScale;
        void main() {
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float dist = -mvPosition.z;
          gl_PointSize = aSize * uSizeScale * uPixelRatio / max(dist, 0.1);
          vAlpha = clamp(0.8 + (1.0 - aSize / 3.0) * 0.2, 0.8, 1.0);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) {
            discard;
          }
          float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  public update(data: ParticleData): void {
    if (!this.positionAttribute || !this.colorAttribute || !this.sizeAttribute) return;
    const count = Math.min(data.positions.length / 3, this.currentParticleCount);
    const posArr = this.positionAttribute.array as Float32Array;
    const colArr = this.colorAttribute.array as Float32Array;
    const sizeArr = this.sizeAttribute.array as Float32Array;
    const copyCount = count * 3;
    for (let i = 0; i < copyCount; i++) {
      posArr[i] = data.positions[i];
      colArr[i] = data.colors[i];
    }
    for (let i = 0; i < count; i++) {
      sizeArr[i] = data.sizes[i];
    }
    this.positionAttribute.needsUpdate = true;
    this.colorAttribute.needsUpdate = true;
    this.sizeAttribute.needsUpdate = true;
  }

  public setParticleCount(count: number): void {
    if (count !== this.currentParticleCount) {
      this.init(count);
    }
  }

  public resize(): void {
    if (this.material && this.material.uniforms) {
      this.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
    }
  }

  public dispose(): void {
    if (this.points) {
      this.scene.remove(this.points);
      this.points = null;
    }
    if (this.geometry) {
      this.geometry.dispose();
      this.geometry = null;
    }
    if (this.material) {
      this.material.dispose();
      this.material = null;
    }
    this.positionAttribute = null;
    this.colorAttribute = null;
    this.sizeAttribute = null;
    this.currentParticleCount = 0;
  }
}
