import * as THREE from 'three';

export interface ColorTheme {
  lowStart: string;
  lowEnd: string;
  midStart: string;
  midEnd: string;
  highStart: string;
  highEnd: string;
}

export const defaultTheme: ColorTheme = {
  lowStart: '#8b5cf6',
  lowEnd: '#c084fc',
  midStart: '#3b82f6',
  midEnd: '#93c5fd',
  highStart: '#ec4899',
  highEnd: '#f9a8d4',
};

export const auroraTheme: ColorTheme = {
  lowStart: '#065f46',
  lowEnd: '#10b981',
  midStart: '#0e7490',
  midEnd: '#22d3ee',
  highStart: '#059669',
  highEnd: '#6ee7b7',
};

export const sunsetTheme: ColorTheme = {
  lowStart: '#c2410c',
  lowEnd: '#fb923c',
  midStart: '#dc2626',
  midEnd: '#f87171',
  highStart: '#ea580c',
  highEnd: '#fdba74',
};

export const iceTheme: ColorTheme = {
  lowStart: '#1e3a8a',
  lowEnd: '#60a5fa',
  midStart: '#0c4a6e',
  midEnd: '#7dd3fc',
  highStart: '#e0f2fe',
  highEnd: '#ffffff',
};

const PARTICLE_COUNT = 4000;
const SPHERE_RADIUS = 10;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpColor(color1: THREE.Color, color2: THREE.Color, t: number): THREE.Color {
  return new THREE.Color(
    lerp(color1.r, color2.r, t),
    lerp(color1.g, color2.g, t),
    lerp(color1.b, color2.b, t),
  );
}

function hexToColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

export class ParticleSystem {
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  private points: THREE.Points;
  private basePositions: Float32Array;
  private currentSizes: Float32Array;
  private targetSizes: Float32Array;
  private currentColors: Float32Array;
  private targetColors: Float32Array;
  private frequencyIndexMap: Uint16Array;
  private currentTheme: ColorTheme;
  private speedMultiplier = 1;

  constructor() {
    this.currentTheme = defaultTheme;
    this.geometry = new THREE.BufferGeometry();
    this.basePositions = new Float32Array(PARTICLE_COUNT * 3);
    this.currentSizes = new Float32Array(PARTICLE_COUNT);
    this.targetSizes = new Float32Array(PARTICLE_COUNT);
    this.currentColors = new Float32Array(PARTICLE_COUNT * 3);
    this.targetColors = new Float32Array(PARTICLE_COUNT * 3);
    this.frequencyIndexMap = new Uint16Array(PARTICLE_COUNT);

    this.initParticles();

    this.material = this.createShaderMaterial();
    this.points = new THREE.Points(this.geometry, this.material);
  }

  private initParticles(): void {
    const lowColor = hexToColor(this.currentTheme.lowStart);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      const u = Math.random();
      const v = Math.random();
      const theta = 2 * Math.PI * u;
      const phi = Math.acos(2 * v - 1);
      const r = SPHERE_RADIUS * Math.cbrt(Math.random());

      this.basePositions[i3] = r * Math.sin(phi) * Math.cos(theta);
      this.basePositions[i3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      this.basePositions[i3 + 2] = r * Math.cos(phi);

      const initialSize = lerp(4, 12, Math.random());
      this.currentSizes[i] = initialSize;
      this.targetSizes[i] = initialSize;

      this.currentColors[i3] = lowColor.r;
      this.currentColors[i3 + 1] = lowColor.g;
      this.currentColors[i3 + 2] = lowColor.b;

      this.targetColors[i3] = lowColor.r;
      this.targetColors[i3 + 1] = lowColor.g;
      this.targetColors[i3 + 2] = lowColor.b;

      this.frequencyIndexMap[i] = Math.floor((i / PARTICLE_COUNT) * 1024);
    }

    const positions = new Float32Array(this.basePositions);
    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.currentColors, 3));
    this.geometry.setAttribute('aSize', new THREE.BufferAttribute(this.currentSizes, 1));
  }

  private createShaderMaterial(): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute float aSize;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = aSize * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          vec2 center = gl_PointCoord - vec2(0.5);
          float dist = length(center);
          if (dist > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          alpha *= 0.8;
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
      transparent: true,
      vertexColors: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
  }

  setAudioData(frequencyData: Uint8Array): void {
    const lowStart = hexToColor(this.currentTheme.lowStart);
    const lowEnd = hexToColor(this.currentTheme.lowEnd);
    const midStart = hexToColor(this.currentTheme.midStart);
    const midEnd = hexToColor(this.currentTheme.midEnd);
    const highStart = hexToColor(this.currentTheme.highStart);
    const highEnd = hexToColor(this.currentTheme.highEnd);

    const lowBandEnd = 341;
    const midBandEnd = 682;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const freqIdx = this.frequencyIndexMap[i];
      const amplitude = frequencyData[freqIdx] / 255;
      const i3 = i * 3;

      this.targetSizes[i] = lerp(4, 20, amplitude);

      let colorStart: THREE.Color;
      let colorEnd: THREE.Color;

      if (freqIdx < lowBandEnd) {
        const t = freqIdx / lowBandEnd;
        colorStart = lerpColor(lowStart, lowEnd, 0.3);
        colorEnd = lerpColor(lowStart, lowEnd, t);
      } else if (freqIdx < midBandEnd) {
        const t = (freqIdx - lowBandEnd) / (midBandEnd - lowBandEnd);
        colorStart = lerpColor(midStart, midEnd, 0.3);
        colorEnd = lerpColor(midStart, midEnd, t);
      } else {
        const t = (freqIdx - midBandEnd) / (1024 - midBandEnd);
        colorStart = lerpColor(highStart, highEnd, 0.3);
        colorEnd = lerpColor(highStart, highEnd, t);
      }

      const finalColor = lerpColor(colorStart, colorEnd, amplitude);

      this.targetColors[i3] = finalColor.r;
      this.targetColors[i3 + 1] = finalColor.g;
      this.targetColors[i3 + 2] = finalColor.b;
    }
  }

  update(delta: number): void {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;
    const sizes = this.geometry.attributes.aSize.array as Float32Array;

    const speedFactor = this.speedMultiplier;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;

      const targetZ = this.basePositions[i3 + 2] + (this.targetSizes[i] - 12) / 8 * 2;
      positions[i3] = this.basePositions[i3];
      positions[i3 + 1] = this.basePositions[i3 + 1];
      positions[i3 + 2] = lerp(positions[i3 + 2], targetZ, 0.15 * speedFactor);

      sizes[i] = lerp(sizes[i], this.targetSizes[i], 0.15 * speedFactor);

      colors[i3] = lerp(colors[i3], this.targetColors[i3], 0.1 * speedFactor);
      colors[i3 + 1] = lerp(colors[i3 + 1], this.targetColors[i3 + 1], 0.1 * speedFactor);
      colors[i3 + 2] = lerp(colors[i3 + 2], this.targetColors[i3 + 2], 0.1 * speedFactor);
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.aSize.needsUpdate = true;

    if (this.material.uniforms) {
      this.material.uniforms.uTime.value += delta;
    }
  }

  setTheme(theme: ColorTheme): void {
    this.currentTheme = theme;
  }

  setSpeedMultiplier(multiplier: number): void {
    this.speedMultiplier = Math.max(0.5, Math.min(2, multiplier));
  }

  getParticleMesh(): THREE.Points {
    return this.points;
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
