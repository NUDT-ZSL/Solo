import * as THREE from 'three';
import type { InstrumentType } from './instruments';

interface InstrumentColors {
  color1: THREE.Color;
  color2: THREE.Color;
  basePitch: number;
}

const INSTRUMENT_COLORS: Record<InstrumentType, InstrumentColors> = {
  piano: {
    color1: new THREE.Color(0xb388ff),
    color2: new THREE.Color(0x82b1ff),
    basePitch: 0.5
  },
  violin: {
    color1: new THREE.Color(0xffcc80),
    color2: new THREE.Color(0xffd54f),
    basePitch: 0.85
  },
  cello: {
    color1: new THREE.Color(0x5c6bc0),
    color2: new THREE.Color(0x26c6da),
    basePitch: 0.15
  },
  flute: {
    color1: new THREE.Color(0xf48fb1),
    color2: new THREE.Color(0xa5d6a7),
    basePitch: 0.7
  }
};

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  opacity: number;
  life: number;
  maxLife: number;
  born: number;
  baseAngle: number;
  type: InstrumentType;
  pitchVariation: number;
}

interface ParticleRing {
  id: number;
  particles: Particle[];
  center: THREE.Vector3;
  type: InstrumentType;
  startTime: number;
  life: number;
  currentRadius: number;
  active: boolean;
}

interface VortexParticle {
  position: THREE.Vector3;
  color: THREE.Color;
  angle: number;
  radius: number;
  yOffset: number;
  size: number;
  opacity: number;
}

interface DustParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  color: THREE.Color;
  size: number;
  life: number;
  maxLife: number;
}

interface LightVortex {
  id: number;
  center: THREE.Vector3;
  startTime: number;
  life: number;
  particles: VortexParticle[];
  dustParticles: DustParticle[];
  rotationSpeed: number;
  active: boolean;
}

interface OverlapZone {
  position: THREE.Vector3;
  rings: Set<number>;
  startTime: number;
  lastVortexTime: number;
}

export interface ParticleSystem {
  trigger: (type: InstrumentType, position: THREE.Vector3, time: number) => void;
  update: (dt: number, time: number) => void;
  addToScene: (scene: THREE.Scene) => void;
  getParticleCount: () => number;
}

class ParticleSystemImpl implements ParticleSystem {
  private scene: THREE.Scene | null = null;
  private rings: ParticleRing[] = [];
  private vortexes: LightVortex[] = [];
  private overlapZones: Map<string, OverlapZone> = new Map();
  private nextRingId = 0;
  private nextVortexId = 0;

  private particlePoints: THREE.Points;
  private particleGeo: THREE.BufferGeometry;
  private particleMat: THREE.ShaderMaterial;
  private maxParticles = 4000;
  private currentParticleCount = 0;

  private vortexPoints: THREE.Points;
  private vortexGeo: THREE.BufferGeometry;
  private vortexMat: THREE.ShaderMaterial;
  private maxVortexParticles = 1500;
  private currentVortexCount = 0;

  private dustPoints: THREE.Points;
  private dustGeo: THREE.BufferGeometry;
  private dustMat: THREE.ShaderMaterial;
  private maxDustParticles = 2000;
  private currentDustCount = 0;

  private ringParticles: Map<number, number[]> = new Map();
  private vortexParticleMap: Map<number, number[]> = new Map();
  private dustParticleMap: Map<number, number[]> = new Map();

  private particleTex: THREE.Texture;
  private softGlowTex: THREE.Texture;

  private currentRingParticleCount = 80;

  constructor() {
    this.particleTex = this.createParticleTexture();
    this.softGlowTex = this.createSoftGlowTexture();

    this.particleGeo = new THREE.BufferGeometry();
    this.initParticleBuffer();
    this.particleMat = this.createCustomPointsMaterial(this.particleTex, 1.0, 800);
    this.particlePoints = new THREE.Points(this.particleGeo, this.particleMat);
    this.particlePoints.frustumCulled = false;

    this.vortexGeo = new THREE.BufferGeometry();
    this.initVortexBuffer();
    this.vortexMat = this.createCustomPointsMaterial(this.softGlowTex, 1.0, 600);
    this.vortexPoints = new THREE.Points(this.vortexGeo, this.vortexMat);
    this.vortexPoints.frustumCulled = false;

    this.dustGeo = new THREE.BufferGeometry();
    this.initDustBuffer();
    this.dustMat = this.createCustomPointsMaterial(this.softGlowTex, 1.0, 400);
    this.dustPoints = new THREE.Points(this.dustGeo, this.dustMat);
    this.dustPoints.frustumCulled = false;
  }

  private createCustomPointsMaterial(map: THREE.Texture, opacity: number, baseSizeScale: number = 600.0): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: map },
        globalOpacity: { value: opacity },
        sizeScale: { value: baseSizeScale }
      },
      vertexShader: `
        attribute float size;
        attribute float alpha;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float sizeScale;
        void main() {
          vColor = color;
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (sizeScale / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D pointTexture;
        uniform float globalOpacity;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 texColor = texture2D(pointTexture, gl_PointCoord);
          if (texColor.a < 0.01) discard;
          gl_FragColor = vec4(vColor, texColor.a * vAlpha * globalOpacity);
        }
      `,
      vertexColors: true,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  private createParticleTexture(): THREE.Texture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const cx = size / 2;
    const cy = size / 2;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.25, 'rgba(255,255,255,0.85)');
    gradient.addColorStop(0.5, 'rgba(255,255,255,0.4)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  private createSoftGlowTexture(): THREE.Texture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const cx = size / 2;
    const cy = size / 2;
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,0.95)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.6)');
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.2)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  private initParticleBuffer(): void {
    const positions = new Float32Array(this.maxParticles * 3);
    const colors = new Float32Array(this.maxParticles * 3);
    const sizes = new Float32Array(this.maxParticles);
    const alphas = new Float32Array(this.maxParticles);

    for (let i = 0; i < this.maxParticles; i++) {
      sizes[i] = 0;
      alphas[i] = 0;
    }

    this.particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.particleGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.particleGeo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
  }

  private initVortexBuffer(): void {
    const positions = new Float32Array(this.maxVortexParticles * 3);
    const colors = new Float32Array(this.maxVortexParticles * 3);
    const sizes = new Float32Array(this.maxVortexParticles);
    const alphas = new Float32Array(this.maxVortexParticles);
    for (let i = 0; i < this.maxVortexParticles; i++) {
      sizes[i] = 0;
      alphas[i] = 0;
    }
    this.vortexGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.vortexGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.vortexGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.vortexGeo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
  }

  private initDustBuffer(): void {
    const positions = new Float32Array(this.maxDustParticles * 3);
    const colors = new Float32Array(this.maxDustParticles * 3);
    const sizes = new Float32Array(this.maxDustParticles);
    const alphas = new Float32Array(this.maxDustParticles);
    for (let i = 0; i < this.maxDustParticles; i++) {
      sizes[i] = 0;
      alphas[i] = 0;
    }
    this.dustGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.dustGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.dustGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    this.dustGeo.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));
  }

  addToScene(scene: THREE.Scene): void {
    this.scene = scene;
    scene.add(this.particlePoints);
    scene.add(this.vortexPoints);
    scene.add(this.dustPoints);
  }

  trigger(type: InstrumentType, position: THREE.Vector3, time: number): void {
    const totalParticles = this.getCurrentTotalParticles();
    if (totalParticles > 3000) {
      this.currentRingParticleCount = 40;
    } else {
      this.currentRingParticleCount = 80;
    }

    const particleCount = this.currentRingParticleCount + Math.floor(Math.random() * 21);
    const colors = INSTRUMENT_COLORS[type];

    const particles: Particle[] = [];
    const ringId = this.nextRingId++;
    const ringParticleIndices: number[] = [];

    for (let i = 0; i < particleCount; i++) {
      const angle = (i / particleCount) * Math.PI * 2;
      const jitter = (Math.random() - 0.5) * 0.035;
      const finalAngle = angle + jitter;

      const tangential = (Math.random() - 0.5) * 2 * (Math.PI / 180);
      const dirAngle = finalAngle + tangential;

      const speed = (80 - 10) / 0.8;
      const dirX = Math.cos(dirAngle);
      const dirZ = Math.sin(dirAngle);

      const pitchVar = Math.random();
      const t = pitchVar;
      const particleColor = colors.color1.clone().lerp(colors.color2, t);

      const pitchEffect = colors.basePitch + (pitchVar - 0.5) * 0.4;
      let sizeBase: number;
      if (pitchEffect > 0.7) {
        sizeBase = 6;
        particleColor.lerp(new THREE.Color(0xfff8a0), 0.15);
      } else if (pitchEffect < 0.3) {
        sizeBase = 14;
        particleColor.lerp(new THREE.Color(0x3a4fc0), 0.15);
      } else {
        sizeBase = 10;
      }
      const size = sizeBase + (Math.random() - 0.5) * 4;

      const idx = this.allocateParticleIndex();
      if (idx < 0) break;
      ringParticleIndices.push(idx);

      const startRadius = 10;
      const pos = new THREE.Vector3(
        position.x + Math.cos(finalAngle) * startRadius,
        position.y + (Math.random() - 0.5) * 3,
        position.z + Math.sin(finalAngle) * startRadius
      );

      const vel = new THREE.Vector3(dirX * speed, (Math.random() - 0.5) * 8, dirZ * speed);

      particles.push({
        position: pos,
        velocity: vel,
        color: particleColor,
        size,
        opacity: 1,
        life: 0.8,
        maxLife: 0.8,
        born: time,
        baseAngle: finalAngle,
        type,
        pitchVariation: pitchVar
      });

      this.writeParticle(idx, pos, particleColor, size, 1);
    }

    this.ringParticles.set(ringId, ringParticleIndices);

    this.rings.push({
      id: ringId,
      particles,
      center: position.clone(),
      type,
      startTime: time,
      life: 0.8,
      currentRadius: 10,
      active: true
    });
  }

  private particleFreeList: number[] = [];
  private particleNextAlloc = 0;

  private allocateParticleIndex(): number {
    if (this.particleFreeList.length > 0) {
      return this.particleFreeList.pop()!;
    }
    if (this.particleNextAlloc < this.maxParticles) {
      return this.particleNextAlloc++;
    }
    return -1;
  }

  private freeParticleIndex(idx: number): void {
    this.writeParticle(idx, new THREE.Vector3(0, -9999, 0), new THREE.Color(0, 0, 0), 0, 0);
    this.particleFreeList.push(idx);
  }

  private vortexFreeList: number[] = [];
  private vortexNextAlloc = 0;

  private allocateVortexIndex(): number {
    if (this.vortexFreeList.length > 0) {
      return this.vortexFreeList.pop()!;
    }
    if (this.vortexNextAlloc < this.maxVortexParticles) {
      return this.vortexNextAlloc++;
    }
    return -1;
  }

  private freeVortexIndex(idx: number): void {
    this.writeVortex(idx, new THREE.Vector3(0, -9999, 0), new THREE.Color(0, 0, 0), 0, 0);
    this.vortexFreeList.push(idx);
  }

  private dustFreeList: number[] = [];
  private dustNextAlloc = 0;

  private allocateDustIndex(): number {
    if (this.dustFreeList.length > 0) {
      return this.dustFreeList.pop()!;
    }
    if (this.dustNextAlloc < this.maxDustParticles) {
      return this.dustNextAlloc++;
    }
    return -1;
  }

  private freeDustIndex(idx: number): void {
    this.writeDust(idx, new THREE.Vector3(0, -9999, 0), new THREE.Color(0, 0, 0), 0, 0);
    this.dustFreeList.push(idx);
  }

  private writeParticle(idx: number, pos: THREE.Vector3, color: THREE.Color, size: number, alpha: number): void {
    const pa = this.particleGeo.attributes.position as THREE.BufferAttribute;
    const ca = this.particleGeo.attributes.color as THREE.BufferAttribute;
    const sa = this.particleGeo.attributes.size as THREE.BufferAttribute;
    const aa = this.particleGeo.attributes.alpha as THREE.BufferAttribute;

    pa.setXYZ(idx, pos.x, pos.y, pos.z);
    ca.setXYZ(idx, color.r, color.g, color.b);
    (sa.array as Float32Array)[idx] = size;
    (aa.array as Float32Array)[idx] = alpha;

    pa.needsUpdate = true;
    ca.needsUpdate = true;
    sa.needsUpdate = true;
    aa.needsUpdate = true;
  }

  private writeVortex(idx: number, pos: THREE.Vector3, color: THREE.Color, size: number, alpha: number): void {
    const pa = this.vortexGeo.attributes.position as THREE.BufferAttribute;
    const ca = this.vortexGeo.attributes.color as THREE.BufferAttribute;
    const sa = this.vortexGeo.attributes.size as THREE.BufferAttribute;
    const aa = this.vortexGeo.attributes.alpha as THREE.BufferAttribute;

    pa.setXYZ(idx, pos.x, pos.y, pos.z);
    ca.setXYZ(idx, color.r, color.g, color.b);
    (sa.array as Float32Array)[idx] = size;
    (aa.array as Float32Array)[idx] = alpha;

    pa.needsUpdate = true;
    ca.needsUpdate = true;
    sa.needsUpdate = true;
    aa.needsUpdate = true;
  }

  private writeDust(idx: number, pos: THREE.Vector3, color: THREE.Color, size: number, alpha: number): void {
    const pa = this.dustGeo.attributes.position as THREE.BufferAttribute;
    const ca = this.dustGeo.attributes.color as THREE.BufferAttribute;
    const sa = this.dustGeo.attributes.size as THREE.BufferAttribute;
    const aa = this.dustGeo.attributes.alpha as THREE.BufferAttribute;

    pa.setXYZ(idx, pos.x, pos.y, pos.z);
    ca.setXYZ(idx, color.r, color.g, color.b);
    (sa.array as Float32Array)[idx] = size;
    (aa.array as Float32Array)[idx] = alpha;

    pa.needsUpdate = true;
    ca.needsUpdate = true;
    sa.needsUpdate = true;
    aa.needsUpdate = true;
  }

  getParticleCount(): number {
    return this.getCurrentTotalParticles();
  }

  private getCurrentTotalParticles(): number {
    return (
      this.particleNextAlloc -
      this.particleFreeList.length +
      this.vortexNextAlloc -
      this.vortexFreeList.length +
      this.dustNextAlloc -
      this.dustFreeList.length
    );
  }

  update(dt: number, time: number): void {
    this.updateRings(dt, time);
    this.checkOverlaps(time);
    this.updateVortexes(dt, time);
  }

  private updateRings(dt: number, time: number): void {
    const toRemove: number[] = [];

    for (const ring of this.rings) {
      if (!ring.active) continue;

      const age = time - ring.startTime;
      const lifeRatio = age / ring.life;

      if (lifeRatio >= 1) {
        ring.active = false;
        toRemove.push(ring.id);
        continue;
      }

      ring.currentRadius = 10 + lifeRatio * 70;

      const indices = this.ringParticles.get(ring.id) || [];

      for (let i = 0; i < ring.particles.length; i++) {
        const p = ring.particles[i];
        const idx = indices[i];
        if (idx === undefined) continue;

        p.position.addScaledVector(p.velocity, dt);
        p.opacity = 1 - lifeRatio;

        const shimmer = 1.0 + 0.5 * Math.sin(time * 6 + p.baseAngle * 8);
        const displaySize = p.size * (0.8 + 0.4 * (1 - lifeRatio)) * (0.8 + shimmer * 0.2);
        const alpha = p.opacity * (0.6 + 0.4 * shimmer);

        this.writeParticle(idx, p.position, p.color, displaySize, alpha);
      }
    }

    for (const ringId of toRemove) {
      this.removeRing(ringId);
    }

    this.rings = this.rings.filter((r) => r.active);
  }

  private removeRing(ringId: number): void {
    const indices = this.ringParticles.get(ringId);
    if (indices) {
      for (const idx of indices) {
        this.freeParticleIndex(idx);
      }
      this.ringParticles.delete(ringId);
    }
  }

  private checkOverlaps(time: number): void {
    const activeRings = this.rings.filter((r) => r.active);
    const zones: Map<string, { pos: THREE.Vector3; rings: number[] }> = new Map();

    for (let i = 0; i < activeRings.length; i++) {
      for (let j = i + 1; j < activeRings.length; j++) {
        const r1 = activeRings[i];
        const r2 = activeRings[j];

        const dist = r1.center.distanceTo(r2.center);
        const radiusSum = r1.currentRadius + r2.currentRadius;
        const radiusDiff = Math.abs(r1.currentRadius - r2.currentRadius);

        if (dist <= radiusSum + 10 && dist >= radiusDiff - 10) {
          const overlapDist = radiusSum - dist;
          if (overlapDist > -10) {
            const t = Math.max(0, Math.min(1, (r1.currentRadius) / (r1.currentRadius + r2.currentRadius)));
            const midPoint = r1.center.clone().lerp(r2.center, t);

            const key = this.zoneKey(midPoint);
            if (!zones.has(key)) {
              zones.set(key, { pos: midPoint.clone(), rings: [] });
            }
            const zone = zones.get(key)!;
            if (!zone.rings.includes(r1.id)) zone.rings.push(r1.id);
            if (!zone.rings.includes(r2.id)) zone.rings.push(r2.id);

            this.applyOverlapColors(r1, r2, midPoint, dist, time);
          }
        }
      }
    }

    for (const [key, zone] of zones) {
      if (zone.rings.length >= 3) {
        let existingZone = this.overlapZones.get(key);
        if (!existingZone) {
          existingZone = {
            position: zone.pos,
            rings: new Set(zone.rings),
            startTime: time,
            lastVortexTime: -999
          };
          this.overlapZones.set(key, existingZone);
        } else {
          for (const rid of zone.rings) existingZone.rings.add(rid);
        }

        if (existingZone.rings.size >= 3 && time - existingZone.lastVortexTime > 1.5) {
          this.spawnVortex(zone.pos, time);
          existingZone.lastVortexTime = time;
        }
      }
    }

    const toDelete: string[] = [];
    for (const [key, zone] of this.overlapZones) {
      let stillActive = false;
      for (const rid of zone.rings) {
        if (activeRings.find((r) => r.id === rid)) {
          stillActive = true;
          break;
        }
      }
      if (!stillActive && time - zone.startTime > 2) {
        toDelete.push(key);
      }
    }
    for (const key of toDelete) this.overlapZones.delete(key);
  }

  private zoneKey(pos: THREE.Vector3): string {
    const gx = Math.round(pos.x / 10);
    const gy = Math.round(pos.y / 10);
    const gz = Math.round(pos.z / 10);
    return `${gx},${gy},${gz}`;
  }

  private applyOverlapColors(r1: ParticleRing, r2: ParticleRing, midPoint: THREE.Vector3, dist: number, time: number): void {
    const indices1 = this.ringParticles.get(r1.id) || [];
    const indices2 = this.ringParticles.get(r2.id) || [];

    const shimmer = 1.0 + 0.5 * Math.sin(time * 8);

    for (let i = 0; i < r1.particles.length; i++) {
      const p = r1.particles[i];
      const idx = indices1[i];
      if (idx === undefined) continue;

      const dToMid = p.position.distanceTo(midPoint);
      if (dToMid < 15) {
        const mix = Math.max(0, 1 - dToMid / 15);
        const mixColor = p.color.clone().lerp(this.getAvgColor([r1, r2]), mix * 0.5);
        const pa = this.particleGeo.attributes.color as THREE.BufferAttribute;
        pa.setXYZ(idx, mixColor.r * shimmer, mixColor.g * shimmer, mixColor.b * shimmer);
        pa.needsUpdate = true;
      }
    }

    for (let i = 0; i < r2.particles.length; i++) {
      const p = r2.particles[i];
      const idx = indices2[i];
      if (idx === undefined) continue;

      const dToMid = p.position.distanceTo(midPoint);
      if (dToMid < 15) {
        const mix = Math.max(0, 1 - dToMid / 15);
        const mixColor = p.color.clone().lerp(this.getAvgColor([r1, r2]), mix * 0.5);
        const pa = this.particleGeo.attributes.color as THREE.BufferAttribute;
        pa.setXYZ(idx, mixColor.r * shimmer, mixColor.g * shimmer, mixColor.b * shimmer);
        pa.needsUpdate = true;
      }
    }
  }

  private getAvgColor(rings: ParticleRing[]): THREE.Color {
    let r = 0;
    let g = 0;
    let b = 0;
    for (const ring of rings) {
      const c = INSTRUMENT_COLORS[ring.type];
      const avgC = c.color1.clone().lerp(c.color2, 0.5);
      r += avgC.r;
      g += avgC.g;
      b += avgC.b;
    }
    return new THREE.Color(r / rings.length, g / rings.length, b / rings.length);
  }

  private spawnVortex(center: THREE.Vector3, time: number): void {
    const vortexId = this.nextVortexId++;
    const vortexParticles: VortexParticle[] = [];
    const vortexIndices: number[] = [];
    const dustParticles: DustParticle[] = [];
    const dustIndices: number[] = [];

    const particleCount = 80;

    const warmColors = [
      new THREE.Color(0xffcc80),
      new THREE.Color(0xff8a65),
      new THREE.Color(0xffd54f),
      new THREE.Color(0xffb74d),
      new THREE.Color(0xffab91),
      new THREE.Color(0xf48fb1),
      new THREE.Color(0xea80fc),
      new THREE.Color(0xff80ab)
    ];

    for (let i = 0; i < particleCount; i++) {
      const idx = this.allocateVortexIndex();
      if (idx < 0) break;
      vortexIndices.push(idx);

      const angle = Math.random() * Math.PI * 2;
      const radius = 2 + Math.random() * 13;
      const yOffset = (Math.random() - 0.5) * 8;
      const color = warmColors[Math.floor(Math.random() * warmColors.length)].clone();
      const size = 2 + Math.random() * 2;
      const opacity = 0.5 + Math.random() * 0.3;

      vortexParticles.push({
        position: new THREE.Vector3(),
        color,
        angle,
        radius,
        yOffset,
        size,
        opacity
      });

      const pos = new THREE.Vector3(
        center.x + Math.cos(angle) * radius,
        center.y + yOffset,
        center.z + Math.sin(angle) * radius
      );
      this.writeVortex(idx, pos, color, size, opacity);
    }

    this.vortexParticleMap.set(vortexId, vortexIndices);

    const dustCount = 40;
    for (let i = 0; i < dustCount; i++) {
      const idx = this.allocateDustIndex();
      if (idx < 0) break;
      dustIndices.push(idx);

      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 8;
      const yAngle = Math.acos(2 * Math.random() - 1);

      const speed = 15 + Math.random() * 20;
      const vel = new THREE.Vector3(
        Math.sin(yAngle) * Math.cos(angle) * speed,
        Math.cos(yAngle) * speed * 0.5,
        Math.sin(yAngle) * Math.sin(angle) * speed
      );

      const color = warmColors[Math.floor(Math.random() * warmColors.length)].clone();

      dustParticles.push({
        position: center.clone(),
        velocity: vel,
        color,
        size: 1,
        life: 0.5,
        maxLife: 0.5
      });

      this.writeDust(idx, center, color, 1, 0.3);
    }

    this.dustParticleMap.set(vortexId, dustIndices);

    this.vortexes.push({
      id: vortexId,
      center: center.clone(),
      startTime: time,
      life: 1.2,
      particles: vortexParticles,
      dustParticles,
      rotationSpeed: 4 * Math.PI,
      active: true
    });
  }

  private updateVortexes(dt: number, time: number): void {
    const toRemove: number[] = [];

    for (const vortex of this.vortexes) {
      if (!vortex.active) continue;

      const age = time - vortex.startTime;
      const lifeRatio = age / vortex.life;

      if (lifeRatio >= 1) {
        vortex.active = false;
        toRemove.push(vortex.id);
        continue;
      }

      const fadeIn = Math.min(1, age / 0.15);
      const fadeOut = 1 - Math.max(0, (age - 0.9) / 0.3);
      const envelope = fadeIn * Math.min(1, fadeOut);

      const vIndices = this.vortexParticleMap.get(vortex.id) || [];
      for (let i = 0; i < vortex.particles.length; i++) {
        const vp = vortex.particles[i];
        const idx = vIndices[i];
        if (idx === undefined) continue;

        vp.angle += vortex.rotationSpeed * dt;
        const pulse = 1 + 0.3 * Math.sin(time * 10 + i * 0.3);
        const effectiveRadius = vp.radius * (1 + lifeRatio * 0.5) * pulse;

        const pos = new THREE.Vector3(
          vortex.center.x + Math.cos(vp.angle) * effectiveRadius,
          vortex.center.y + vp.yOffset + Math.sin(vp.angle * 2 + i) * 1.5,
          vortex.center.z + Math.sin(vp.angle) * effectiveRadius
        );

        const size = vp.size * (0.8 + 0.4 * (1 - lifeRatio));
        const alpha = vp.opacity * envelope * (0.7 + 0.3 * Math.sin(time * 8 + i));

        this.writeVortex(idx, pos, vp.color, size, alpha);
      }

      const dIndices = this.dustParticleMap.get(vortex.id) || [];
      for (let i = 0; i < vortex.dustParticles.length; i++) {
        const dp = vortex.dustParticles[i];
        const idx = dIndices[i];
        if (idx === undefined) continue;

        dp.life -= dt;
        if (dp.life <= 0) {
          this.writeDust(idx, new THREE.Vector3(0, -9999, 0), dp.color, 0, 0);
          continue;
        }

        dp.position.addScaledVector(dp.velocity, dt);
        dp.velocity.multiplyScalar(0.96);

        const dustRatio = 1 - dp.life / dp.maxLife;
        const alpha = 0.3 * (1 - dustRatio);

        this.writeDust(idx, dp.position, dp.color, 1 + dustRatio, alpha);
      }
    }

    for (const id of toRemove) {
      this.removeVortex(id);
    }

    this.vortexes = this.vortexes.filter((v) => v.active);
  }

  private removeVortex(id: number): void {
    const vIndices = this.vortexParticleMap.get(id);
    if (vIndices) {
      for (const idx of vIndices) this.freeVortexIndex(idx);
      this.vortexParticleMap.delete(id);
    }
    const dIndices = this.dustParticleMap.get(id);
    if (dIndices) {
      for (const idx of dIndices) this.freeDustIndex(idx);
      this.dustParticleMap.delete(id);
    }
  }
}

export function createParticleSystem(): ParticleSystem {
  return new ParticleSystemImpl();
}
