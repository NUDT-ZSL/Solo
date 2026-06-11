import * as THREE from 'three';

export interface MeteorConfig {
  density: number;
  direction: number;
  speed: number;
}

interface Meteor {
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  trailPositions: THREE.Vector3[];
  trailLength: number;
}

interface Debris {
  active: boolean;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  flickerSpeed: number;
  flickerOffset: number;
}

const MAX_METEORS = 300;
const MAX_DEBRIS = 8000;
const TRAIL_MAX_POINTS = 24;
const METEOR_TRAIL_DURATION = 1.5;
const DEBRIS_DURATION = 2.0;
const SPAWN_RADIUS = 40;
const SPAWN_HEIGHT_MIN = 20;
const SPAWN_HEIGHT_MAX = 35;

const COL_WHITE = new THREE.Color(0xffffff);
const COL_ORANGE = new THREE.Color(0xff8c00);
const COL_DARK_RED = new THREE.Color(0x8b0000);

export class ParticleSystem {
  private config: MeteorConfig = {
    density: 15,
    direction: 225,
    speed: 15,
  };

  private meteorPool: Meteor[] = [];
  private debrisPool: Debris[] = [];
  private freeMeteorIndices: number[] = [];
  private freeDebrisIndices: number[] = [];

  private spawnAccumulator = 0;
  private burstMultiplier = 1;
  private burstTimer = 0;

  private debrisPoints: THREE.Points;
  private debrisGeometry: THREE.BufferGeometry;
  private debrisPositions: Float32Array;
  private debrisColors: Float32Array;
  private debrisSizes: Float32Array;

  private trailLines: THREE.Line[] = [];
  private trailGeometries: THREE.BufferGeometry[] = [];

  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    const trailVertexShader = `
      varying vec3 vColor;
      varying float vAlpha;
      attribute float alpha;
      void main() {
        vColor = color;
        vAlpha = alpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const trailFragmentShader = `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4(vColor, vAlpha);
      }
    `;

    for (let i = 0; i < MAX_METEORS; i++) {
      const trailVecs: THREE.Vector3[] = [];
      for (let k = 0; k < TRAIL_MAX_POINTS; k++) {
        trailVecs.push(new THREE.Vector3());
      }
      this.meteorPool.push({
        active: false,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: METEOR_TRAIL_DURATION,
        trailPositions: trailVecs,
        trailLength: 0,
      });
      this.freeMeteorIndices.push(i);

      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(TRAIL_MAX_POINTS * 3);
      const col = new Float32Array(TRAIL_MAX_POINTS * 3);
      const alp = new Float32Array(TRAIL_MAX_POINTS);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geo.setAttribute('alpha', new THREE.BufferAttribute(alp, 1));
      geo.setDrawRange(0, 0);

      const mat = new THREE.ShaderMaterial({
        uniforms: {},
        vertexShader: trailVertexShader,
        fragmentShader: trailFragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        vertexColors: true,
      });
      const line = new THREE.Line(geo, mat);
      line.frustumCulled = false;
      line.visible = false;
      scene.add(line);
      this.trailLines.push(line);
      this.trailGeometries.push(geo);
    }

    this.debrisPositions = new Float32Array(MAX_DEBRIS * 3);
    this.debrisColors = new Float32Array(MAX_DEBRIS * 4);
    this.debrisSizes = new Float32Array(MAX_DEBRIS);

    this.debrisGeometry = new THREE.BufferGeometry();
    this.debrisGeometry.setAttribute('position', new THREE.BufferAttribute(this.debrisPositions, 3));
    this.debrisGeometry.setAttribute('color', new THREE.BufferAttribute(this.debrisColors, 4));
    this.debrisGeometry.setAttribute('size', new THREE.BufferAttribute(this.debrisSizes, 1));

    const debrisVertexShader = `
      attribute float size;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = color.rgb;
        vAlpha = color.a;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (220.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;
    const debrisFragmentShader = `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float dist = length(gl_PointCoord - vec2(0.5));
        if (dist > 0.5) discard;
        float radialAlpha = 1.0 - smoothstep(0.0, 0.5, dist);
        float finalAlpha = vAlpha * radialAlpha;
        gl_FragColor = vec4(vColor, finalAlpha);
      }
    `;

    const debrisMaterial = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: debrisVertexShader,
      fragmentShader: debrisFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true,
    });

    this.debrisPoints = new THREE.Points(this.debrisGeometry, debrisMaterial);
    this.debrisPoints.frustumCulled = false;
    scene.add(this.debrisPoints);

    for (let i = 0; i < MAX_DEBRIS; i++) {
      this.debrisPool.push({
        active: false,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: DEBRIS_DURATION,
        flickerSpeed: 0,
        flickerOffset: 0,
      });
      this.freeDebrisIndices.push(i);
    }
  }

  updateConfig(config: Partial<MeteorConfig>): void {
    if (config.density !== undefined) this.config.density = config.density;
    if (config.direction !== undefined) this.config.direction = config.direction;
    if (config.speed !== undefined) this.config.speed = config.speed;
  }

  triggerBurst(): void {
    this.burstMultiplier = 2;
    this.burstTimer = 3.0;
  }

  update(delta: number): void {
    if (this.burstTimer > 0) {
      this.burstTimer -= delta;
      if (this.burstTimer <= 0) {
        this.burstMultiplier = 1;
        this.burstTimer = 0;
      }
    }

    this.spawnMeteors(delta);
    this.updateMeteors(delta);
    this.updateDebris(delta);
    this.renderDebris();
  }

  private spawnMeteors(delta: number): void {
    const effectiveDensity = this.config.density * this.burstMultiplier;
    this.spawnAccumulator += effectiveDensity * delta;

    while (this.spawnAccumulator >= 1) {
      this.spawnAccumulator -= 1;
      this.spawnMeteor();
    }
  }

  private acquireMeteorIndex(): number {
    return this.freeMeteorIndices.length > 0 ? (this.freeMeteorIndices.pop() as number) : -1;
  }

  private releaseMeteorIndex(idx: number): void {
    this.freeMeteorIndices.push(idx);
  }

  private acquireDebrisIndex(): number {
    return this.freeDebrisIndices.length > 0 ? (this.freeDebrisIndices.pop() as number) : -1;
  }

  private releaseDebrisIndex(idx: number): void {
    this.freeDebrisIndices.push(idx);
  }

  private spawnMeteor(): void {
    const idx = this.acquireMeteorIndex();
    if (idx < 0) return;
    const meteor = this.meteorPool[idx]!;

    const angle = (this.config.direction * Math.PI) / 180;
    const spreadAngle = angle + (Math.random() - 0.5) * 0.4;

    const startX = (Math.random() - 0.5) * SPAWN_RADIUS * 2;
    const startZ = (Math.random() - 0.5) * SPAWN_RADIUS * 2;
    const startY = SPAWN_HEIGHT_MIN + Math.random() * (SPAWN_HEIGHT_MAX - SPAWN_HEIGHT_MIN);

    meteor.active = true;
    meteor.position.set(startX, startY, startZ);
    meteor.velocity.set(
      Math.sin(spreadAngle) * this.config.speed,
      -this.config.speed * 0.8 - Math.random() * this.config.speed * 0.4,
      Math.cos(spreadAngle) * this.config.speed * 0.3
    );
    meteor.life = 0;
    meteor.maxLife = METEOR_TRAIL_DURATION;
    meteor.trailPositions[0]!.copy(meteor.position);
    meteor.trailLength = 1;

    this.trailLines[idx]!.visible = true;
  }

  private updateMeteors(delta: number): void {
    for (let i = 0; i < MAX_METEORS; i++) {
      const meteor = this.meteorPool[i]!;
      if (!meteor.active) {
        if (this.trailLines[i]!.visible) {
          this.trailLines[i]!.visible = false;
        }
        continue;
      }

      meteor.life += delta;
      if (meteor.life >= meteor.maxLife) {
        this.spawnDebrisFromMeteor(meteor);
        this.deactivateMeteor(i);
        continue;
      }

      meteor.position.addScaledVector(meteor.velocity, delta);

      if (meteor.trailLength < TRAIL_MAX_POINTS) {
        meteor.trailPositions[meteor.trailLength]!.copy(meteor.position);
        meteor.trailLength++;
      } else {
        for (let j = 0; j < TRAIL_MAX_POINTS - 1; j++) {
          meteor.trailPositions[j]!.copy(meteor.trailPositions[j + 1]!);
        }
        meteor.trailPositions[TRAIL_MAX_POINTS - 1]!.copy(meteor.position);
      }

      this.updateTrailGeometry(meteor, i);
    }
  }

  private updateTrailGeometry(meteor: Meteor, idx: number): void {
    const geo = this.trailGeometries[idx]!;
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = geo.getAttribute('color') as THREE.BufferAttribute;
    const alpAttr = geo.getAttribute('alpha') as THREE.BufferAttribute;

    const count = meteor.trailLength;
    const fadeProgress = Math.min(meteor.life / meteor.maxLife, 1.0);
    const lifeFade = 1.0 - fadeProgress;
    const lifeFadeSq = lifeFade * lifeFade;

    for (let j = 0; j < count; j++) {
      const t = count > 1 ? j / (count - 1) : 0;
      const p = meteor.trailPositions[j]!;

      posAttr.setXYZ(j, p.x, p.y, p.z);

      let color: THREE.Color;
      if (t < 0.5) {
        color = COL_WHITE.clone().lerp(COL_ORANGE, t * 2);
      } else {
        color = COL_ORANGE.clone().lerp(COL_DARK_RED, (t - 0.5) * 2);
      }
      const intensity = 0.6 + 0.4 * lifeFade;
      color.multiplyScalar(intensity);
      colAttr.setXYZ(j, color.r, color.g, color.b);

      const spatialFade = 1.0 - t * 0.7;
      const alpha = Math.max(0.0, Math.min(1.0, lifeFadeSq * spatialFade));
      alpAttr.setX(j, alpha);
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    alpAttr.needsUpdate = true;
    geo.setDrawRange(0, count);
  }

  private deactivateMeteor(idx: number): void {
    const meteor = this.meteorPool[idx]!;
    meteor.active = false;
    meteor.trailLength = 0;
    this.trailLines[idx]!.visible = false;
    this.trailGeometries[idx]!.setDrawRange(0, 0);
    this.releaseMeteorIndex(idx);
  }

  private spawnDebrisFromMeteor(meteor: Meteor): void {
    const count = 10 + Math.floor(Math.random() * 21);
    const ox = meteor.position.x;
    const oy = meteor.position.y;
    const oz = meteor.position.z;
    const baseSpeed = 2 + Math.random() * 4;

    for (let i = 0; i < count; i++) {
      const idx = this.acquireDebrisIndex();
      if (idx < 0) break;
      const debris = this.debrisPool[idx]!;

      debris.active = true;
      debris.position.set(ox, oy, oz);
      debris.velocity.set(
        (Math.random() - 0.5) * baseSpeed * 2,
        (Math.random() - 0.5) * baseSpeed * 2,
        (Math.random() - 0.5) * baseSpeed * 2
      );
      debris.life = 0;
      debris.maxLife = DEBRIS_DURATION;
      debris.flickerSpeed = 10 + Math.random() * 20;
      debris.flickerOffset = Math.random() * Math.PI * 2;
    }
  }

  private updateDebris(delta: number): void {
    for (let i = 0; i < MAX_DEBRIS; i++) {
      const debris = this.debrisPool[i]!;
      if (!debris.active) continue;

      debris.life += delta;
      if (debris.life >= debris.maxLife) {
        debris.active = false;
        this.releaseDebrisIndex(i);
        continue;
      }

      debris.position.addScaledVector(debris.velocity, delta);
      debris.velocity.multiplyScalar(0.985);
    }
  }

  private renderDebris(): void {
    let visibleCount = 0;

    for (let i = 0; i < MAX_DEBRIS; i++) {
      const debris = this.debrisPool[i]!;
      if (!debris.active) continue;

      const pIdx = visibleCount * 3;
      const cIdx = visibleCount * 4;
      const lifeRatio = debris.life / debris.maxLife;

      const flickerPhase = debris.life * debris.flickerSpeed + debris.flickerOffset;
      const sinVal = Math.sin(flickerPhase);
      const flicker = 0.2 + 0.8 * (0.5 + 0.5 * sinVal);
      const flickerClamped = Math.max(0.2, Math.min(1.0, flicker));

      const fadeOut = 1.0 - lifeRatio * lifeRatio;
      const alpha = flickerClamped * fadeOut;

      this.debrisPositions[pIdx] = debris.position.x;
      this.debrisPositions[pIdx + 1] = debris.position.y;
      this.debrisPositions[pIdx + 2] = debris.position.z;

      const colorTint = 1.0 - lifeRatio * 0.4;
      this.debrisColors[cIdx] = 1.0 * colorTint;
      this.debrisColors[cIdx + 1] = (0.55 * colorTint) * (1.0 - lifeRatio * 0.3);
      this.debrisColors[cIdx + 2] = (0.1 * colorTint) * (1.0 - lifeRatio * 0.6);
      this.debrisColors[cIdx + 3] = alpha;

      this.debrisSizes[visibleCount] = (0.4 + 0.6 * fadeOut) * 3.5;

      visibleCount++;
    }

    const posAttr = this.debrisGeometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.debrisGeometry.getAttribute('color') as THREE.BufferAttribute;
    const sizeAttr = this.debrisGeometry.getAttribute('size') as THREE.BufferAttribute;

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;

    this.debrisGeometry.setDrawRange(0, visibleCount);
  }

  dispose(): void {
    for (let i = 0; i < MAX_METEORS; i++) {
      this.trailGeometries[i]?.dispose();
      (this.trailLines[i]?.material as THREE.Material)?.dispose();
      if (this.trailLines[i]) this.scene.remove(this.trailLines[i]!);
    }
    this.debrisGeometry.dispose();
    (this.debrisPoints.material as THREE.Material)?.dispose();
    this.scene.remove(this.debrisPoints);
  }
}
