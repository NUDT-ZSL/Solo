import * as THREE from 'three';
import ParticleWorker from './particle-worker.ts?worker';

export interface ParticleParams {
  count: number;
  speed: number;
  radius: number;
  colorStartHue: number;
  colorEndHue: number;
}

export const DEFAULT_PARAMS: ParticleParams = {
  count: 4000,
  speed: 1.0,
  radius: 5,
  colorStartHue: 0,
  colorEndHue: 0.47,
};

export const PRESETS: Record<string, ParticleParams & { colorStartHex: string; colorEndHex: string; label: string }> = {
  aurora: {
    count: 5000,
    speed: 3.0,
    radius: 6,
    colorStartHue: 0.42,
    colorEndHue: 0.54,
    colorStartHex: '#00FF88',
    colorEndHex: '#00BFFF',
    label: '极光',
  },
  fire: {
    count: 8000,
    speed: 0.8,
    radius: 3,
    colorStartHue: 0.04,
    colorEndHue: 0.14,
    colorStartHex: '#FF4500',
    colorEndHex: '#FFD700',
    label: '火焰',
  },
  galaxy: {
    count: 6000,
    speed: 1.5,
    radius: 9,
    colorStartHue: 0.1,
    colorEndHue: 0.6,
    colorStartHex: '#E8D5B7',
    colorEndHex: '#4A90D9',
    label: '银河',
  },
};

function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  let r: number, g: number, b: number;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number): number => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return [r, g, b];
}

export class ParticleManager {
  private scene: THREE.Scene;
  private particleSystem: THREE.Points | null = null;
  private bgStars: THREE.Points | null = null;
  private worker: Worker;
  private currentParams: ParticleParams;
  private targetParams: ParticleParams;
  private transitionProgress = 1;
  private transitionDuration = 0.5;
  private colorTransitionProgress = 1;
  private colorTransitionDuration = 1;
  private prevColorStartHue = 0;
  private prevColorEndHue = 0.47;
  private targetColorStartHue = 0;
  private targetColorEndHue = 0.47;
  private pendingPositions: Float32Array | null = null;
  private pendingBrightness: Float32Array | null = null;
  private pendingCount = 0;
  private clock: THREE.Clock;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.currentParams = { ...DEFAULT_PARAMS };
    this.targetParams = { ...DEFAULT_PARAMS };
    this.clock = new THREE.Clock();

    this.worker = new ParticleWorker();
    this.worker.onmessage = (e: MessageEvent) => {
      if (e.data.type === 'updated') {
        this.pendingPositions = new Float32Array(e.data.positions);
        this.pendingBrightness = new Float32Array(e.data.collisionBrightness);
        this.pendingCount = e.data.count;
      }
    };

    this.worker.postMessage({ type: 'init', params: this.currentParams });

    this.createBgStars();
    this.createParticleSystem();
  }

  private createBgStars(): void {
    if (this.bgStars) {
      this.scene.remove(this.bgStars);
      this.bgStars.geometry.dispose();
      (this.bgStars.material as THREE.Material).dispose();
    }

    const starCount = 300;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);
    const sizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const i3 = i * 3;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 40 + Math.random() * 40;

      positions[i3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i3 + 2] = r * Math.cos(phi);

      colors[i3] = 1;
      colors[i3 + 1] = 1;
      colors[i3 + 2] = 1;

      sizes[i] = 0.3 + Math.random() * 0.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.4,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });

    this.bgStars = new THREE.Points(geometry, material);
    this.scene.add(this.bgStars);
  }

  private createParticleSystem(): void {
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      (this.particleSystem.material as THREE.Material).dispose();
    }

    const { count } = this.currentParams;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    this.applyColors(colors, sizes, count);

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.12,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.scene.add(this.particleSystem);
  }

  private applyColors(colors: Float32Array, _sizes: Float32Array, count: number): void {
    let startHue: number, endHue: number;

    if (this.colorTransitionProgress < 1) {
      const t = this.easeInOutCubic(this.colorTransitionProgress);
      startHue = this.prevColorStartHue + (this.targetColorStartHue - this.prevColorStartHue) * t;
      endHue = this.prevColorEndHue + (this.targetColorEndHue - this.prevColorEndHue) * t;
    } else {
      startHue = this.currentParams.colorStartHue;
      endHue = this.currentParams.colorEndHue;
    }

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const t = i / count;
      const hue = startHue + (endHue - startHue) * t;
      const [r, g, b] = hslToRgb(hue, 0.8, 0.55);
      colors[i3] = r;
      colors[i3 + 1] = g;
      colors[i3 + 2] = b;
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  updateParams(params: ParticleParams, isPreset = false): void {
    if (isPreset) {
      this.prevColorStartHue = this.currentParams.colorStartHue;
      this.prevColorEndHue = this.currentParams.colorEndHue;
      this.targetColorStartHue = params.colorStartHue;
      this.targetColorEndHue = params.colorEndHue;
      this.colorTransitionProgress = 0;
      this.colorTransitionDuration = 1;
    } else {
      this.colorTransitionProgress = 1;
    }

    this.targetParams = { ...params };
    this.transitionProgress = 0;
    this.transitionDuration = 0.5;

    this.worker.postMessage({ type: 'updateParams', params });
  }

  update(): void {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    const time = this.clock.elapsedTime;

    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(1, this.transitionProgress + dt / this.transitionDuration);
      const t = this.easeInOutCubic(this.transitionProgress);
      this.currentParams.count = this.targetParams.count;
      this.currentParams.speed = this.currentParams.speed + (this.targetParams.speed - this.currentParams.speed) * t;
      this.currentParams.radius = this.currentParams.radius + (this.targetParams.radius - this.currentParams.radius) * t;

      if (this.transitionProgress >= 1) {
        this.currentParams.speed = this.targetParams.speed;
        this.currentParams.radius = this.targetParams.radius;
      }
    }

    if (this.colorTransitionProgress < 1) {
      this.colorTransitionProgress = Math.min(1, this.colorTransitionProgress + dt / this.colorTransitionDuration);
      if (this.colorTransitionProgress >= 1) {
        this.currentParams.colorStartHue = this.targetColorStartHue;
        this.currentParams.colorEndHue = this.targetColorEndHue;
      }
    } else {
      this.currentParams.colorStartHue = this.targetParams.colorStartHue;
      this.currentParams.colorEndHue = this.targetParams.colorEndHue;
    }

    this.worker.postMessage({ type: 'update', time, dt });

    if (this.particleSystem && this.pendingPositions) {
      const posAttr = this.particleSystem.geometry.getAttribute('position') as THREE.BufferAttribute;
      const colAttr = this.particleSystem.geometry.getAttribute('color') as THREE.BufferAttribute;

      if (posAttr.count !== this.pendingCount) {
        this.createParticleSystem();
      } else {
        const positions = posAttr.array as Float32Array;
        const colors = colAttr.array as Float32Array;

        for (let i = 0; i < this.pendingCount; i++) {
          const i3 = i * 3;
          positions[i3] = this.pendingPositions[i3];
          positions[i3 + 1] = this.pendingPositions[i3 + 1];
          positions[i3 + 2] = this.pendingPositions[i3 + 2];

          if (this.pendingBrightness && this.pendingBrightness[i] > 0) {
            const brightness = this.pendingBrightness[i];
            const t = i / this.pendingCount;
            let startHue = this.currentParams.colorStartHue;
            let endHue = this.currentParams.colorEndHue;
            const hue = startHue + (endHue - startHue) * t;
            const [r, g, b] = hslToRgb(hue, 0.8, 0.55 + brightness * 0.45);
            colors[i3] = Math.min(1, r + brightness * 0.5);
            colors[i3 + 1] = Math.min(1, g + brightness * 0.5);
            colors[i3 + 2] = Math.min(1, b + brightness * 0.5);
          }
        }

        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
      }

      this.pendingPositions = null;
      this.pendingBrightness = null;
    }
  }

  getCurrentParams(): ParticleParams {
    return { ...this.currentParams };
  }

  dispose(): void {
    this.worker.terminate();
    if (this.particleSystem) {
      this.scene.remove(this.particleSystem);
      this.particleSystem.geometry.dispose();
      (this.particleSystem.material as THREE.Material).dispose();
    }
    if (this.bgStars) {
      this.scene.remove(this.bgStars);
      this.bgStars.geometry.dispose();
      (this.bgStars.material as THREE.Material).dispose();
    }
  }
}
