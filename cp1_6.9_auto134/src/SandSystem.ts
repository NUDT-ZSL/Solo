import * as THREE from 'three';

export const GRID_SIZE = 100;
export const PARTICLE_COUNT = 12000;
export const SAND_AREA = 50;

interface WindSource {
  position: THREE.Vector2;
  direction: THREE.Vector2;
  strength: number;
}

interface Ripple {
  center: THREE.Vector2;
  startTime: number;
  duration: number;
  maxRadius: number;
}

interface ParticleState {
  baseY: number;
  targetY: number;
  baseColor: THREE.Color;
  currentColor: THREE.Color;
  size: number;
  rippleStartTime: number;
  colorChangeStartTime: number;
  highlightStartTime: number;
}

class PerlinNoise {
  private permutation: number[];

  constructor(seed: number = Math.random() * 10000) {
    this.permutation = this.generatePermutation(seed);
  }

  private generatePermutation(seed: number): number[] {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    
    let s = seed;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807 + 0) % 2147483647;
      const j = s % (i + 1);
      [p[i], p[j]] = [p[j], p[i]];
    }
    
    return [...p, ...p];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number): number {
    const h = hash & 3;
    const u = h < 2 ? x : y;
    const v = h < 2 ? y : x;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise2D(x: number, y: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    
    const u = this.fade(xf);
    const v = this.fade(yf);
    
    const aa = this.permutation[this.permutation[X] + Y];
    const ab = this.permutation[this.permutation[X] + Y + 1];
    const ba = this.permutation[this.permutation[X + 1] + Y];
    const bb = this.permutation[this.permutation[X + 1] + Y + 1];
    
    const x1 = this.lerp(this.grad(aa, xf, yf), this.grad(ba, xf - 1, yf), u);
    const x2 = this.lerp(this.grad(ab, xf, yf - 1), this.grad(bb, xf - 1, yf - 1), u);
    
    return this.lerp(x1, x2, v);
  }
}

const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255,
      }
    : { r: 0, g: 0, b: 0 };
};

const lerpColor = (
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  t: number
): THREE.Color => {
  return new THREE.Color(
    c1.r + (c2.r - c1.r) * t,
    c1.g + (c2.g - c1.g) * t,
    c1.b + (c2.b - c1.b) * t
  );
};

export class SandSystem {
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  highlights: Float32Array;
  
  private particleStates: ParticleState[];
  private windSources: WindSource[];
  private lastWindUpdate: number;
  private ripples: Ripple[];
  private perlin: PerlinNoise;
  private scanAngle: number;
  private time: number;

  warmColor = hexToRgb('#FF8C00');
  coolColor = hexToRgb('#4B0082');
  rippleColor = hexToRgb('#00BFFF');

  constructor() {
    this.perlin = new PerlinNoise(42);
    this.positions = new Float32Array(PARTICLE_COUNT * 3);
    this.colors = new Float32Array(PARTICLE_COUNT * 3);
    this.sizes = new Float32Array(PARTICLE_COUNT);
    this.highlights = new Float32Array(PARTICLE_COUNT);
    this.particleStates = new Array(PARTICLE_COUNT);
    this.ripples = [];
    this.scanAngle = 0;
    this.time = 0;
    this.lastWindUpdate = 0;

    this.windSources = [
      {
        position: new THREE.Vector2(-SAND_AREA / 2, 0),
        direction: new THREE.Vector2(1, 0.2).normalize(),
        strength: 0.5,
      },
      {
        position: new THREE.Vector2(SAND_AREA / 2, SAND_AREA / 4),
        direction: new THREE.Vector2(-0.8, -0.6).normalize(),
        strength: 0.3,
      },
    ];

    this.initializeParticles();
  }

  private initializeParticles(): void {
    const halfArea = SAND_AREA / 2;
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const gridX = (i % GRID_SIZE) / GRID_SIZE;
      const gridZ = Math.floor(i / GRID_SIZE) / GRID_SIZE;
      
      const jitterX = (Math.random() - 0.5) * 0.8;
      const jitterZ = (Math.random() - 0.5) * 0.8;
      
      const x = (gridX - 0.5) * SAND_AREA + jitterX;
      const z = (gridZ - 0.5) * SAND_AREA + jitterZ;
      
      const noiseVal = this.perlin.noise2D(x * 0.05, z * 0.05);
      const baseY = noiseVal * 0.5;
      
      this.positions[i * 3] = x;
      this.positions[i * 3 + 1] = baseY;
      this.positions[i * 3 + 2] = z;
      
      const distFromCenter = Math.sqrt(
        (x / halfArea) * (x / halfArea) + (z / halfArea) * (z / halfArea)
      );
      const colorT = Math.min(1, Math.max(0, distFromCenter * 0.7 + (Math.random() - 0.5) * 0.2));
      const color = lerpColor(this.warmColor, this.coolColor, colorT);
      
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;
      
      const size = 2 + Math.random() * 3;
      this.sizes[i] = size;
      this.highlights[i] = 0;
      
      this.particleStates[i] = {
        baseY,
        targetY: baseY,
        baseColor: color.clone(),
        currentColor: color.clone(),
        size,
        rippleStartTime: -1,
        colorChangeStartTime: -1,
        highlightStartTime: -1,
      };
    }
  }

  addRipple(worldX: number, worldZ: number): void {
    this.ripples.push({
      center: new THREE.Vector2(worldX, worldZ),
      startTime: this.time,
      duration: 1.0,
      maxRadius: 5,
    });
  }

  private updateWind(deltaTime: number): void {
    this.lastWindUpdate += deltaTime;
    
    if (this.lastWindUpdate >= 5) {
      this.lastWindUpdate = 0;
      this.windSources.forEach((wind) => {
        wind.strength = Math.random();
      });
    }
  }

  private calculateWindForce(x: number, z: number): THREE.Vector2 {
    const totalForce = new THREE.Vector2(0, 0);
    
    for (const wind of this.windSources) {
      const dx = x - wind.position.x;
      const dz = z - wind.position.y;
      const dist = Math.sqrt(dx * dx + dz * dz);
      const maxDist = SAND_AREA * 1.5;
      const falloff = Math.max(0, 1 - dist / maxDist);
      
      const speed = 0.2 + 0.6 * wind.strength;
      totalForce.x += wind.direction.x * speed * falloff * wind.strength;
      totalForce.y += wind.direction.y * speed * falloff * wind.strength;
    }
    
    return totalForce;
  }

  private updateScanLight(): void {
    this.scanAngle += (0.5 * Math.PI * 2) / 60;
  }

  private isInScanLight(x: number, y: number, z: number): boolean {
    const coneAngle = (30 * Math.PI) / 180 / 2;
    const lightHeight = SAND_AREA;
    const lightDir = new THREE.Vector3(
      Math.cos(Math.PI / 4) * Math.cos(this.scanAngle),
      -Math.sin(Math.PI / 4),
      Math.cos(Math.PI / 4) * Math.sin(this.scanAngle)
    );
    const lightPos = new THREE.Vector3(
      lightDir.x * -lightHeight,
      lightHeight,
      lightDir.z * -lightHeight
    );
    
    const toParticle = new THREE.Vector3(x - lightPos.x, y - lightPos.y, z - lightPos.z);
    const dist = toParticle.length();
    toParticle.normalize();
    
    const dot = toParticle.dot(lightDir.clone().negate());
    const angle = Math.acos(Math.min(1, Math.max(-1, dot)));
    
    return angle < coneAngle && dist < SAND_AREA * 2;
  }

  getScanLightData(): { position: THREE.Vector3; direction: THREE.Vector3; coneAngle: number } {
    const lightHeight = SAND_AREA;
    const lightDir = new THREE.Vector3(
      Math.cos(Math.PI / 4) * Math.cos(this.scanAngle),
      -Math.sin(Math.PI / 4),
      Math.cos(Math.PI / 4) * Math.sin(this.scanAngle)
    ).normalize();
    const lightPos = new THREE.Vector3(
      lightDir.x * -lightHeight,
      lightHeight,
      lightDir.z * -lightHeight
    );
    
    return {
      position: lightPos,
      direction: lightDir,
      coneAngle: (30 * Math.PI) / 180 / 2,
    };
  }

  getRipplesData(): Array<{ center: THREE.Vector2; progress: number; maxRadius: number }> {
    const now = this.time;
    return this.ripples
      .map((r) => ({
        center: r.center,
        progress: Math.min(1, (now - r.startTime) / r.duration),
        maxRadius: r.maxRadius,
      }))
      .filter((r) => r.progress < 1);
  }

  update(deltaTime: number): void {
    this.time += deltaTime;
    this.updateWind(deltaTime);
    this.updateScanLight();
    
    const halfArea = SAND_AREA / 2;
    
    this.ripples = this.ripples.filter(
      (r) => this.time - r.startTime < r.duration
    );
    
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const i3 = i * 3;
      let x = this.positions[i3];
      let y = this.positions[i3 + 1];
      let z = this.positions[i3 + 2];
      
      const state = this.particleStates[i];
      
      const windForce = this.calculateWindForce(x, z);
      x += windForce.x * deltaTime;
      z += windForce.y * deltaTime;
      
      if (x > halfArea) x = -halfArea + (x - halfArea);
      if (x < -halfArea) x = halfArea + (x + halfArea);
      if (z > halfArea) z = -halfArea + (z - halfArea);
      if (z < -halfArea) z = halfArea + (z + halfArea);
      
      const drift = (Math.random() - 0.5) * 0.1 * deltaTime;
      let newY = y + drift;
      const maxDeviation = 0.3;
      if (newY > state.baseY + maxDeviation) newY = state.baseY + maxDeviation;
      if (newY < state.baseY - maxDeviation) newY = state.baseY - maxDeviation;
      
      const rippleProgress = state.rippleStartTime >= 0 
        ? (this.time - state.rippleStartTime) / 0.8 
        : 1;
      
      if (state.rippleStartTime >= 0 && rippleProgress < 1) {
        const bounceTime = 0.3;
        if (rippleProgress < bounceTime / 0.8) {
          const t = rippleProgress / (bounceTime / 0.8);
          const bounce = Math.sin(t * Math.PI) * 0.4;
          newY = y + bounce * 0.05;
        }
      } else if (state.rippleStartTime >= 0 && rippleProgress >= 1) {
        const randomOffset = (Math.random() - 0.5) * 0.2;
        state.baseY = Math.max(-0.5, Math.min(0.5, state.baseY + randomOffset));
        state.rippleStartTime = -1;
      }
      
      for (const ripple of this.ripples) {
        const rippleElapsed = this.time - ripple.startTime;
        const rippleProgress2 = rippleElapsed / ripple.duration;
        const currentRadius = rippleProgress2 * ripple.maxRadius;
        
        const dx = x - ripple.center.x;
        const dz = z - ripple.center.y;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const ringWidth = 0.5;
        
        if (Math.abs(dist - currentRadius) < ringWidth && state.rippleStartTime < 0) {
          state.rippleStartTime = this.time;
          state.colorChangeStartTime = this.time;
        }
      }
      
      this.positions[i3] = x;
      this.positions[i3 + 1] = newY;
      this.positions[i3 + 2] = z;
      
      const colorProgress = state.colorChangeStartTime >= 0
        ? (this.time - state.colorChangeStartTime) / 0.8
        : 1;
      
      let finalColor = state.baseColor;
      if (state.colorChangeStartTime >= 0 && colorProgress < 1) {
        const rippleCol = new THREE.Color(this.rippleColor.r, this.rippleColor.g, this.rippleColor.b);
        const t = colorProgress;
        finalColor = new THREE.Color().lerpColors(rippleCol, state.baseColor, t);
      } else if (state.colorChangeStartTime >= 0 && colorProgress >= 1) {
        state.colorChangeStartTime = -1;
        finalColor = state.baseColor;
      }
      
      const inScan = this.isInScanLight(x, newY, z);
      if (inScan) {
        state.highlightStartTime = this.time;
      }
      
      let highlightAlpha = 0;
      if (state.highlightStartTime >= 0) {
        const highlightElapsed = this.time - state.highlightStartTime;
        if (highlightElapsed < 0.5) {
          highlightAlpha = 1 - highlightElapsed / 0.5;
        } else {
          state.highlightStartTime = -1;
        }
      }
      
      if (highlightAlpha > 0) {
        const highlightBoost = 0.6 * highlightAlpha;
        this.colors[i3] = Math.min(1, finalColor.r + highlightBoost + 0.3 * highlightAlpha);
        this.colors[i3 + 1] = Math.min(1, finalColor.g + highlightBoost + 0.3 * highlightAlpha);
        this.colors[i3 + 2] = Math.min(1, finalColor.b + highlightBoost + 0.3 * highlightAlpha);
      } else {
        this.colors[i3] = finalColor.r;
        this.colors[i3 + 1] = finalColor.g;
        this.colors[i3 + 2] = finalColor.b;
      }
      
      this.highlights[i] = highlightAlpha;
    }
  }
}
