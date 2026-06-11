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
const _tmpColor = new THREE.Color();

function easeOutCubic(t: number): number {
  return 1.0 - (1.0 - t) * (1.0 - t) * (1.0 - t);
}

function trailFadeAlpha(lifeRatio: number): number {
  if (lifeRatio < 0.5) return 1.0;
  if (lifeRatio < 0.75) return 1.0 - (lifeRatio - 0.5) * 2.0;
  const t = (lifeRatio - 0.75) / 0.25;
  return 0.5 * (1.0 - easeOutCubic(t));
}

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
  private debrisAlphas: Float32Array;
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
    this.debrisColors = new Float32Array(MAX_DEBRIS * 3);
    this.debrisAlphas = new Float32Array(MAX_DEBRIS);
    this.debrisSizes = new Float32Array(MAX_DEBRIS);

    this.debrisGeometry = new THREE.BufferGeometry();
    this.debrisGeometry.setAttribute('position', new THREE.BufferAttribute(this.debrisPositions, 3));
    this.debrisGeometry.setAttribute('color', new THREE.BufferAttribute(this.debrisColors, 3));
    this.debrisGeometry.setAttribute('flickerAlpha', new THREE.BufferAttribute(this.debrisAlphas, 1));
    this.debrisGeometry.setAttribute('size', new THREE.BufferAttribute(this.debrisSizes, 1));

    const debrisVertexShader = `
      attribute float size;
      attribute float flickerAlpha;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = color;
        vAlpha = flickerAlpha;
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
    const maxBurstDensity = Math.floor(this.freeMeteorIndices.length / 3.0);
    const neededDensity = this.config.density * 2;
    this.burstMultiplier = neededDensity <= maxBurstDensity ? 2 : Math.max(1, maxBurstDensity / this.config.density);
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
    const maxSpawnable = this.freeMeteorIndices.length;
    let spawned = 0;

    while (this.spawnAccumulator >= 1 && spawned < maxSpawnable) {
      this.spawnAccumulator -= 1;
      this.spawnMeteor();
      spawned++;
    }

    if (this.spawnAccumulator > maxSpawnable) {
      this.spawnAccumulator = maxSpawnable;
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

  private resetMeteor(meteor: Meteor): void {
    meteor.active = false;
    meteor.position.set(0, 0, 0);
    meteor.velocity.set(0, 0, 0);
    meteor.life = 0;
    meteor.maxLife = METEOR_TRAIL_DURATION;
    meteor.trailLength = 0;
    for (let k = 0; k < TRAIL_MAX_POINTS; k++) {
      meteor.trailPositions[k]!.set(0, 0, 0);
    }
  }

  private resetDebris(debris: Debris): void {
    debris.active = false;
    debris.position.set(0, 0, 0);
    debris.velocity.set(0, 0, 0);
    debris.life = 0;
    debris.maxLife = DEBRIS_DURATION;
    debris.flickerSpeed = 0;
    debris.flickerOffset = 0;
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
    for (let k = 1; k < TRAIL_MAX_POINTS; k++) {
      meteor.trailPositions[k]!.set(0, 0, 0);
    }
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
    const lifeRatio = Math.min(meteor.life / meteor.maxLife, 1.0);
    const fadeAlpha = trailFadeAlpha(lifeRatio);

    for (let j = 0; j < count; j++) {
      const t = count > 1 ? j / (count - 1) : 0;
      const p = meteor.trailPositions[j]!;

      posAttr.setXYZ(j, p.x, p.y, p.z);

      if (t < 0.5) {
        _tmpColor.copy(COL_WHITE).lerp(COL_ORANGE, t * 2);
      } else {
        _tmpColor.copy(COL_ORANGE).lerp(COL_DARK_RED, (t - 0.5) * 2);
      }
      const intensity = 0.7 + 0.3 * fadeAlpha;
      _tmpColor.multiplyScalar(intensity);
      colAttr.setXYZ(j, _tmpColor.r, _tmpColor.g, _tmpColor.b);

      const spatialFade = 1.0 - t * 0.6;
      const alpha = Math.max(0.0, Math.min(1.0, fadeAlpha * spatialFade));
      alpAttr.setX(j, alpha);
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    alpAttr.needsUpdate = true;
    geo.setDrawRange(0, count);
  }

  private deactivateMeteor(idx: number): void {
    const meteor = this.meteorPool[idx]!;
    this.resetMeteor(meteor);
    this.trailLines[idx]!.visible = false;
    const geo = this.trailGeometries[idx]!;
    geo.setDrawRange(0, 0);
    const posArr = (geo.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
    const colArr = (geo.getAttribute('color') as THREE.BufferAttribute).array as Float32Array;
    const alpArr = (geo.getAttribute('alpha') as THREE.BufferAttribute).array as Float32Array;
    posArr.fill(0);
    colArr.fill(0);
    alpArr.fill(0);
    geo.getAttribute('position').needsUpdate = true;
    geo.getAttribute('color').needsUpdate = true;
    geo.getAttribute('alpha').needsUpdate = true;
    this.releaseMeteorIndex(idx);
  }

  private spawnDebrisFromMeteor(meteor: Meteor): void {
    const count = 10 + Math.floor(Math.random() * 21);
    const ox = meteor.position.x;
    const oy = meteor.position.y;
    const oz = meteor.position.z;
    const baseSpeed = 2 + Math.random() * 4;
    const available = this.freeDebrisIndices.length;
    const actualCount = Math.min(count, available);

    for (let i = 0; i < actualCount; i++) {
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
        this.resetDebris(debris);
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
      this.debrisColors[pIdx] = 1.0 * colorTint;
      this.debrisColors[pIdx + 1] = (0.55 * colorTint) * (1.0 - lifeRatio * 0.3);
      this.debrisColors[pIdx + 2] = (0.1 * colorTint) * (1.0 - lifeRatio * 0.6);

      this.debrisAlphas[visibleCount] = alpha;

      this.debrisSizes[visibleCount] = (0.4 + 0.6 * fadeOut) * 3.5;

      visibleCount++;
    }

    const posAttr = this.debrisGeometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.debrisGeometry.getAttribute('color') as THREE.BufferAttribute;
    const alphaAttr = this.debrisGeometry.getAttribute('flickerAlpha') as THREE.BufferAttribute;
    const sizeAttr = this.debrisGeometry.getAttribute('size') as THREE.BufferAttribute;

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
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
