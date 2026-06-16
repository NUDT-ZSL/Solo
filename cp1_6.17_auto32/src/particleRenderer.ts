import * as THREE from 'three';
import type { ParticleData } from './weatherSystem';

interface PointsBundle {
  points: THREE.Points | null;
  geometry: THREE.BufferGeometry | null;
  material: THREE.ShaderMaterial | null;
  positionAttribute: THREE.BufferAttribute | null;
  colorAttribute: THREE.BufferAttribute | null;
  sizeAttribute: THREE.BufferAttribute | null;
  alphaAttribute: THREE.BufferAttribute | null;
  currentCount: number;
}

export class ParticleRenderer {
  private scene: THREE.Scene;
  private main: PointsBundle;
  private trail: PointsBundle;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.main = this.createBundle();
    this.trail = this.createBundle();
  }

  private createBundle(): PointsBundle {
    return {
      points: null,
      geometry: null,
      material: null,
      positionAttribute: null,
      colorAttribute: null,
      sizeAttribute: null,
      alphaAttribute: null,
      currentCount: 0
    };
  }

  public init(particleCount: number, trailTotalCount: number): void {
    this.disposeBundle(this.main);
    this.initBundle(this.main, particleCount, 1.0);
    this.disposeBundle(this.trail);
    this.initBundle(this.trail, trailTotalCount, 0.9);
  }

  private initBundle(bundle: PointsBundle, count: number, opacityMul: number): void {
    bundle.currentCount = count;
    bundle.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const alphas = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      sizes[i] = 1.5;
      alphas[i] = 1.0;
    }
    bundle.positionAttribute = new THREE.BufferAttribute(positions, 3);
    bundle.colorAttribute = new THREE.BufferAttribute(colors, 3);
    bundle.sizeAttribute = new THREE.BufferAttribute(sizes, 1);
    bundle.alphaAttribute = new THREE.BufferAttribute(alphas, 1);
    bundle.geometry.setAttribute('position', bundle.positionAttribute);
    bundle.geometry.setAttribute('aColor', bundle.colorAttribute);
    bundle.geometry.setAttribute('aSize', bundle.sizeAttribute);
    bundle.geometry.setAttribute('aAlpha', bundle.alphaAttribute);
    bundle.material = this.createShaderMaterial(opacityMul);
    bundle.points = new THREE.Points(bundle.geometry, bundle.material);
    bundle.points.frustumCulled = false;
    this.scene.add(bundle.points);
  }

  private createShaderMaterial(opacityMultiplier: number): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
        uSizeScale: { value: 120.0 },
        uOpacityMul: { value: opacityMultiplier }
      },
      vertexShader: `
        attribute float aSize;
        attribute vec3 aColor;
        attribute float aAlpha;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uPixelRatio;
        uniform float uSizeScale;
        uniform float uOpacityMul;
        void main() {
          vColor = aColor;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          float dist = -mvPosition.z;
          gl_PointSize = aSize * uSizeScale * uPixelRatio / max(dist, 0.1);
          float baseAlpha = clamp(0.8 + (1.0 - aSize / 3.0) * 0.2, 0.8, 1.0);
          vAlpha = aAlpha * baseAlpha * uOpacityMul;
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

  public update(mainData: ParticleData, trailData: ParticleData): void {
    this.copyBundleData(this.main, mainData);
    this.copyBundleData(this.trail, trailData);
  }

  private copyBundleData(bundle: PointsBundle, data: ParticleData): void {
    if (!bundle.positionAttribute || !bundle.colorAttribute || !bundle.sizeAttribute || !bundle.alphaAttribute) return;
    const count = Math.min(data.positions.length / 3, bundle.currentCount);
    const posArr = bundle.positionAttribute.array as Float32Array;
    const colArr = bundle.colorAttribute.array as Float32Array;
    const sizeArr = bundle.sizeAttribute.array as Float32Array;
    const alphaArr = bundle.alphaAttribute.array as Float32Array;
    const copyCount3 = count * 3;
    for (let i = 0; i < copyCount3; i++) {
      posArr[i] = data.positions[i];
      colArr[i] = data.colors[i];
    }
    for (let i = 0; i < count; i++) {
      sizeArr[i] = data.sizes[i];
      alphaArr[i] = (i < data.alphas.length) ? data.alphas[i] : 1.0;
    }
    bundle.positionAttribute.needsUpdate = true;
    bundle.colorAttribute.needsUpdate = true;
    bundle.sizeAttribute.needsUpdate = true;
    bundle.alphaAttribute.needsUpdate = true;
  }

  public setParticleCount(particleCount: number, trailTotalCount: number): void {
    if (particleCount !== this.main.currentCount || trailTotalCount !== this.trail.currentCount) {
      this.init(particleCount, trailTotalCount);
    }
  }

  public resize(): void {
    this.updateBundlePixelRatio(this.main);
    this.updateBundlePixelRatio(this.trail);
  }

  private updateBundlePixelRatio(bundle: PointsBundle): void {
    if (bundle.material && bundle.material.uniforms) {
      bundle.material.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
    }
  }

  private disposeBundle(bundle: PointsBundle): void {
    if (bundle.points) { this.scene.remove(bundle.points); bundle.points = null; }
    if (bundle.geometry) { bundle.geometry.dispose(); bundle.geometry = null; }
    if (bundle.material) { bundle.material.dispose(); bundle.material = null; }
    bundle.positionAttribute = null;
    bundle.colorAttribute = null;
    bundle.sizeAttribute = null;
    bundle.alphaAttribute = null;
    bundle.currentCount = 0;
  }

  public dispose(): void {
    this.disposeBundle(this.main);
    this.disposeBundle(this.trail);
  }
}
