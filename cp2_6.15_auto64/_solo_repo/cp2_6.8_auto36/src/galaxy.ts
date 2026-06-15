
import * as THREE from 'three';

export interface GalaxyParams {
  armCount: number;
  armTightness: number;
  scatter: number;
  thickness: number;
  rotationSpeed: number;
}

export const DEFAULT_PARAMS: GalaxyParams = {
  armCount: 4,
  armTightness: 1.5,
  scatter: 0.3,
  thickness: 0.6,
  rotationSpeed: 1.0,
};

const PARTICLE_COUNT = 2500;
const GALAXY_RADIUS = 15;
const BASE_ROTATION_SPEED = 0.2;
const INTERPOLATION_DURATION = 0.3;

function hslToRgb(h: number, s: number, l: number): THREE.Color {
  return new THREE.Color().setHSL(h / 360, s / 100, l / 100);
}

function lerpColor(a: THREE.Color, b: THREE.Color, t: number): THREE.Color {
  return new THREE.Color().lerpColors(a, b, t);
}

function createPointTexture(): THREE.Texture {
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const gradient = ctx.createRadialGradient(
    size / 2, size / 2, 0,
    size / 2, size / 2, size / 2
  );
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

export class Galaxy {
  public points: THREE.Points;
  public params: GalaxyParams;

  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;

  private currentPositions: Float32Array;
  private targetPositions: Float32Array;
  private sizes: Float32Array;

  private centerColor: THREE.Color;
  private edgeColor: THREE.Color;

  constructor(params: GalaxyParams) {
    this.params = { ...params };

    this.centerColor = hslToRgb(45, 100, 70);
    this.edgeColor = hslToRgb(260, 80, 60);

    this.currentPositions = new Float32Array(PARTICLE_COUNT * 3);
    this.targetPositions = new Float32Array(PARTICLE_COUNT * 3);
    this.sizes = new Float32Array(PARTICLE_COUNT);

    this.geometry = new THREE.BufferGeometry();
    this.material = new THREE.PointsMaterial({
      size: 0.8,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: createPointTexture(),
      alphaTest: 0.001,
    });

    this.generateInitialData();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.currentPositions, 3));
    this.geometry.setAttribute('color', this.createColorAttribute());

    this.points = new THREE.Points(this.geometry, this.material);
    this.updateTargetPositions();
    this.currentPositions.set(this.targetPositions);
  }

  private generateInitialData(): void {
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      this.sizes[i] = 0.5 + Math.random() * 2.5;
    }
  }

  private createColorAttribute(): THREE.BufferAttribute {
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t = (i / PARTICLE_COUNT);
      const radiusFactor = Math.pow(t, 0.5);
      const color = lerpColor(this.centerColor, this.edgeColor, radiusFactor);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    return new THREE.BufferAttribute(colors, 3);
  }

  private updateTargetPositions(): void {
    const { armCount, armTightness, scatter, thickness } = this.params;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t = i / PARTICLE_COUNT;
      const radius = Math.pow(t, 0.6) * GALAXY_RADIUS;
      const armIndex = i % armCount;
      const baseAngle = (armIndex / armCount) * Math.PI * 2;
      const spiralAngle = radius * armTightness * 0.15;
      const angle = baseAngle + spiralAngle;

      const scatterAmount = scatter * radius * 0.25;
      const randomAngle = (Math.random() - 0.5) * scatter * Math.PI;
      const randomRadius = (Math.random() - 0.5) * scatterAmount;

      const finalAngle = angle + randomAngle;
      const finalRadius = radius + randomRadius;

      const x = Math.cos(finalAngle) * finalRadius;
      const z = Math.sin(finalAngle) * finalRadius;

      const thicknessFactor = 1 - (radius / GALAXY_RADIUS) * 0.7;
      const y = (Math.random() - 0.5) * thickness * 3 * thicknessFactor;

      this.targetPositions[i * 3] = x;
      this.targetPositions[i * 3 + 1] = y;
      this.targetPositions[i * 3 + 2] = z;
    }
  }

  public setParams(newParams: Partial<GalaxyParams>): void {
    const changed = Object.keys(newParams).some(
      (key) => this.params[key as keyof GalaxyParams] !== newParams[key as keyof GalaxyParams]
    );
    if (!changed) return;

    this.params = { ...this.params, ...newParams };
    this.updateTargetPositions();
  }

  public update(deltaTime: number): void {
    const lerpFactor = 1 - Math.exp(-deltaTime / INTERPOLATION_DURATION);

    const positionAttr = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = positionAttr.array as Float32Array;

    for (let i = 0; i < PARTICLE_COUNT * 3; i++) {
      positions[i] += (this.targetPositions[i] - positions[i]) * lerpFactor;
    }
    positionAttr.needsUpdate = true;

    const rotationSpeed = BASE_ROTATION_SPEED * this.params.rotationSpeed;
    this.points.rotation.y += rotationSpeed * deltaTime;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
