import * as THREE from 'three';

export interface MeteorConfig {
  density: number;
  direction: number;
  speed: number;
}

export interface PoolStats {
  activeMeteors: number;
  totalMeteors: number;
  activeDebris: number;
  totalDebris: number;
  meteorPoolExhausted: number;
  debrisPoolExhausted: number;
}

const TRAIL_LENGTH = 40;
const METEOR_MAX_LIFE = 1.5;
const DEBRIS_MAX_LIFE = 2.0;
const METEOR_POOL_SIZE = 200;
const DEBRIS_POOL_SIZE = 2000;

const COLOR_WHITE = new THREE.Color(0xFFFFFF);
const COLOR_ORANGE = new THREE.Color(0xFF8C00);
const COLOR_DARK_RED = new THREE.Color(0x8B0000);

interface MeteorParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  trail: Float32Array;
  trailColors: Float32Array;
  active: boolean;
  size: number;
}

interface DebrisParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  flickerPhase: number;
  flickerSpeed: number;
  flickerSpeed2: number;
  active: boolean;
  size: number;
  baseColor: THREE.Color;
}

export class MeteorParticleSystem {
  private scene: THREE.Scene;
  private config: MeteorConfig;

  private meteorPool: MeteorParticle[] = [];
  private debrisPool: DebrisParticle[] = [];
  private activeMeteors: MeteorParticle[] = [];
  private activeDebris: DebrisParticle[] = [];

  private meteorPoolExhausted = 0;
  private debrisPoolExhausted = 0;

  private meteorGeometry!: THREE.BufferGeometry;
  private meteorMaterial!: THREE.PointsMaterial;
  private meteors!: THREE.Points;

  private trailGeometry!: THREE.BufferGeometry;
  private trailMaterial!: THREE.LineBasicMaterial;
  private trails!: THREE.LineSegments;

  private debrisGeometry!: THREE.BufferGeometry;
  private debrisMaterial!: THREE.PointsMaterial;
  private debrisPoints!: THREE.Points;

  private spawnAccumulator = 0;

  constructor(scene: THREE.Scene, config: MeteorConfig) {
    this.scene = scene;
    this.config = { ...config };
    this.initPools();
    this.initRenderObjects();
  }

  private initPools(): void {
    for (let i = 0; i < METEOR_POOL_SIZE; i++) {
      this.meteorPool.push(this.createMeteor());
    }
    for (let i = 0; i < DEBRIS_POOL_SIZE; i++) {
      this.debrisPool.push(this.createDebris());
    }
  }

  private createMeteor(): MeteorParticle {
    return {
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      life: 0,
      maxLife: METEOR_MAX_LIFE,
      trail: new Float32Array(TRAIL_LENGTH * 3),
      trailColors: new Float32Array(TRAIL_LENGTH * 3),
      active: false,
      size: 1
    };
  }

  private createDebris(): DebrisParticle {
    return {
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      life: 0,
      maxLife: DEBRIS_MAX_LIFE,
      flickerPhase: 0,
      flickerSpeed: 1,
      flickerSpeed2: 1,
      active: false,
      size: 1,
      baseColor: new THREE.Color()
    };
  }

  private acquireMeteor(): MeteorParticle | null {
    for (let i = 0; i < this.meteorPool.length; i++) {
      if (!this.meteorPool[i].active) {
        const m = this.meteorPool[i];
        m.active = true;
        return m;
      }
    }
    this.meteorPoolExhausted++;
    console.debug(`[ParticleSystem] 流星对象池耗尽！活跃: ${this.activeMeteors.length}, 总池: ${METEOR_POOL_SIZE}, 累计溢出: ${this.meteorPoolExhausted}`);
    return null;
  }

  private releaseMeteor(m: MeteorParticle): void {
    m.active = false;
    m.life = 0;
    const idx = this.activeMeteors.indexOf(m);
    if (idx !== -1) {
      this.activeMeteors[idx] = this.activeMeteors[this.activeMeteors.length - 1];
      this.activeMeteors.pop();
    }
  }

  private acquireDebris(): DebrisParticle | null {
    for (let i = 0; i < this.debrisPool.length; i++) {
      if (!this.debrisPool[i].active) {
        const d = this.debrisPool[i];
        d.active = true;
        return d;
      }
    }
    this.debrisPoolExhausted++;
    console.debug(`[ParticleSystem] 碎片对象池耗尽！活跃: ${this.activeDebris.length}, 总池: ${DEBRIS_POOL_SIZE}, 累计溢出: ${this.debrisPoolExhausted}`);
    return null;
  }

  private releaseDebris(d: DebrisParticle): void {
    d.active = false;
    d.life = 0;
    const idx = this.activeDebris.indexOf(d);
    if (idx !== -1) {
      this.activeDebris[idx] = this.activeDebris[this.activeDebris.length - 1];
      this.activeDebris.pop();
    }
  }

  private initRenderObjects(): void {
    this.meteorGeometry = new THREE.BufferGeometry();
    const meteorPositions = new Float32Array(METEOR_POOL_SIZE * 3);
    const meteorColors = new Float32Array(METEOR_POOL_SIZE * 3);
    this.meteorGeometry.setAttribute('position', new THREE.BufferAttribute(meteorPositions, 3));
    this.meteorGeometry.setAttribute('color', new THREE.BufferAttribute(meteorColors, 3));
    this.meteorGeometry.setDrawRange(0, 0);
    this.meteorMaterial = new THREE.PointsMaterial({
      size: 2.5,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    this.meteors = new THREE.Points(this.meteorGeometry, this.meteorMaterial);
    this.scene.add(this.meteors);

    this.trailGeometry = new THREE.BufferGeometry();
    const maxTrailVertices = METEOR_POOL_SIZE * TRAIL_LENGTH * 2;
    const trailPositions = new Float32Array(maxTrailVertices * 3);
    const trailColors = new Float32Array(maxTrailVertices * 3);
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
    this.trailGeometry.setAttribute('color', new THREE.BufferAttribute(trailColors, 3));
    this.trailGeometry.setDrawRange(0, 0);
    this.trailMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.trails = new THREE.LineSegments(this.trailGeometry, this.trailMaterial);
    this.scene.add(this.trails);

    this.debrisGeometry = new THREE.BufferGeometry();
    const debrisPositions = new Float32Array(DEBRIS_POOL_SIZE * 3);
    const debrisColors = new Float32Array(DEBRIS_POOL_SIZE * 3);
    this.debrisGeometry.setAttribute('position', new THREE.BufferAttribute(debrisPositions, 3));
    this.debrisGeometry.setAttribute('color', new THREE.BufferAttribute(debrisColors, 3));
    this.debrisGeometry.setDrawRange(0, 0);
    this.debrisMaterial = new THREE.PointsMaterial({
      size: 1.2,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });
    this.debrisPoints = new THREE.Points(this.debrisGeometry, this.debrisMaterial);
    this.scene.add(this.debrisPoints);
  }

  public updateConfig(config: MeteorConfig): void {
    const oldDensity = this.config.density;
    this.config = { ...config };
    console.debug(`[ParticleSystem] updateConfig: density ${oldDensity} → ${this.config.density}, direction=${this.config.direction}, speed=${this.config.speed}`);
  }

  private spawnMeteor(): void {
    const m = this.acquireMeteor();
    if (!m) return;

    const radius = 60 + Math.random() * 30;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * 0.4;
    m.position.set(
      Math.cos(theta) * Math.sin(phi + Math.PI / 2) * radius,
      Math.cos(phi) * radius,
      Math.sin(theta) * Math.sin(phi + Math.PI / 2) * radius
    );

    const dirRad = (this.config.direction * Math.PI) / 180;
    const baseSpeed = this.config.speed;
    m.velocity.set(
      Math.cos(dirRad) * baseSpeed * (0.3 + Math.random() * 0.2),
      -baseSpeed * (0.9 + Math.random() * 0.3),
      Math.sin(dirRad) * baseSpeed * (0.3 + Math.random() * 0.2)
    );

    m.life = METEOR_MAX_LIFE;
    m.maxLife = METEOR_MAX_LIFE;
    m.size = 0.8 + Math.random() * 1.2;

    for (let i = 0; i < TRAIL_LENGTH; i++) {
      m.trail[i * 3] = m.position.x;
      m.trail[i * 3 + 1] = m.position.y;
      m.trail[i * 3 + 2] = m.position.z;
    }

    this.activeMeteors.push(m);
  }

  private spawnDebris(position: THREE.Vector3, count: number): void {
    for (let i = 0; i < count; i++) {
      const d = this.acquireDebris();
      if (!d) return;

      d.position.copy(position);

      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const speed = 2 + Math.random() * 6;
      d.velocity.set(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed,
        Math.sin(phi) * Math.sin(theta) * speed
      );

      d.life = DEBRIS_MAX_LIFE;
      d.maxLife = DEBRIS_MAX_LIFE;
      d.flickerPhase = Math.random() * Math.PI * 2;
      d.flickerSpeed = 15 + Math.random() * 25;
      d.flickerSpeed2 = 7 + Math.random() * 13;
      d.size = 0.4 + Math.random() * 0.8;

      const colorMix = Math.random();
      if (colorMix < 0.5) {
        d.baseColor.copy(COLOR_ORANGE);
      } else if (colorMix < 0.8) {
        d.baseColor.copy(COLOR_WHITE).lerp(COLOR_ORANGE, 0.5);
      } else {
        d.baseColor.copy(COLOR_DARK_RED).lerp(COLOR_ORANGE, 0.3);
      }

      this.activeDebris.push(d);
    }
  }

  private getTrailColor(lifeRatio: number, trailRatio: number, out: THREE.Color): void {
    if (trailRatio < 0.15) {
      out.copy(COLOR_WHITE).lerp(COLOR_ORANGE, trailRatio / 0.15);
    } else if (trailRatio < 0.6) {
      const t = (trailRatio - 0.15) / 0.45;
      out.copy(COLOR_ORANGE).lerp(COLOR_DARK_RED, t);
    } else {
      out.copy(COLOR_DARK_RED);
    }
    const fade = lifeRatio * (1 - trailRatio * 0.85);
    out.multiplyScalar(fade);
  }

  private computeFlicker(time: number, d: DebrisParticle): number {
    const wave1 = Math.sin(time * d.flickerSpeed + d.flickerPhase);
    const wave2 = Math.sin(time * d.flickerSpeed2 + d.flickerPhase * 1.7);
    const combined = 0.5 * wave1 + 0.5 * wave2;
    const normalized = 0.5 + 0.5 * combined;
    return 0.2 + 0.8 * normalized;
  }

  public update(dt: number, time: number): void {
    this.spawnAccumulator += this.config.density * dt;
    while (this.spawnAccumulator >= 1) {
      this.spawnMeteor();
      this.spawnAccumulator -= 1;
    }

    const tmpColor = new THREE.Color();
    for (let i = this.activeMeteors.length - 1; i >= 0; i--) {
      const m = this.activeMeteors[i];
      m.life -= dt;

      if (m.life <= 0) {
        const debrisCount = 10 + Math.floor(Math.random() * 21);
        this.spawnDebris(m.position, debrisCount);
        this.releaseMeteor(m);
        continue;
      }

      m.position.x += m.velocity.x * dt;
      m.position.y += m.velocity.y * dt;
      m.position.z += m.velocity.z * dt;

      for (let j = TRAIL_LENGTH - 1; j > 0; j--) {
        m.trail[j * 3] = m.trail[(j - 1) * 3];
        m.trail[j * 3 + 1] = m.trail[(j - 1) * 3 + 1];
        m.trail[j * 3 + 2] = m.trail[(j - 1) * 3 + 2];
      }
      m.trail[0] = m.position.x;
      m.trail[1] = m.position.y;
      m.trail[2] = m.position.z;
    }

    for (let i = this.activeDebris.length - 1; i >= 0; i--) {
      const d = this.activeDebris[i];
      d.life -= dt;
      if (d.life <= 0) {
        this.releaseDebris(d);
        continue;
      }
      d.position.x += d.velocity.x * dt;
      d.position.y += d.velocity.y * dt;
      d.position.z += d.velocity.z * dt;
      d.velocity.y -= 1.5 * dt;
    }

    this.updateGeometry(time);
  }

  private updateGeometry(time: number): void {
    const tmpColor = new THREE.Color();
    const meteorPosAttr = this.meteorGeometry.getAttribute('position') as THREE.BufferAttribute;
    const meteorColAttr = this.meteorGeometry.getAttribute('color') as THREE.BufferAttribute;
    const meteorPosArr = meteorPosAttr.array as Float32Array;
    const meteorColArr = meteorColAttr.array as Float32Array;

    for (let i = 0; i < this.activeMeteors.length; i++) {
      const m = this.activeMeteors[i];
      meteorPosArr[i * 3] = m.position.x;
      meteorPosArr[i * 3 + 1] = m.position.y;
      meteorPosArr[i * 3 + 2] = m.position.z;

      const lifeRatio = Math.max(0, m.life / m.maxLife);
      tmpColor.copy(COLOR_WHITE).multiplyScalar(lifeRatio);
      meteorColArr[i * 3] = tmpColor.r;
      meteorColArr[i * 3 + 1] = tmpColor.g;
      meteorColArr[i * 3 + 2] = tmpColor.b;
    }
    meteorPosAttr.needsUpdate = true;
    meteorColAttr.needsUpdate = true;
    this.meteorGeometry.setDrawRange(0, this.activeMeteors.length);

    const trailPosAttr = this.trailGeometry.getAttribute('position') as THREE.BufferAttribute;
    const trailColAttr = this.trailGeometry.getAttribute('color') as THREE.BufferAttribute;
    const trailPosArr = trailPosAttr.array as Float32Array;
    const trailColArr = trailColAttr.array as Float32Array;
    let trailIndex = 0;

    for (let i = 0; i < this.activeMeteors.length; i++) {
      const m = this.activeMeteors[i];
      const lifeRatio = Math.max(0, m.life / m.maxLife);

      for (let j = 0; j < TRAIL_LENGTH - 1; j++) {
        const trailRatio = j / (TRAIL_LENGTH - 1);
        trailPosArr[trailIndex * 3] = m.trail[j * 3];
        trailPosArr[trailIndex * 3 + 1] = m.trail[j * 3 + 1];
        trailPosArr[trailIndex * 3 + 2] = m.trail[j * 3 + 2];
        this.getTrailColor(lifeRatio, trailRatio, tmpColor);
        trailColArr[trailIndex * 3] = tmpColor.r;
        trailColArr[trailIndex * 3 + 1] = tmpColor.g;
        trailColArr[trailIndex * 3 + 2] = tmpColor.b;
        trailIndex++;

        trailPosArr[trailIndex * 3] = m.trail[(j + 1) * 3];
        trailPosArr[trailIndex * 3 + 1] = m.trail[(j + 1) * 3 + 1];
        trailPosArr[trailIndex * 3 + 2] = m.trail[(j + 1) * 3 + 2];
        this.getTrailColor(lifeRatio, (j + 1) / (TRAIL_LENGTH - 1), tmpColor);
        trailColArr[trailIndex * 3] = tmpColor.r;
        trailColArr[trailIndex * 3 + 1] = tmpColor.g;
        trailColArr[trailIndex * 3 + 2] = tmpColor.b;
        trailIndex++;
      }
    }
    trailPosAttr.needsUpdate = true;
    trailColAttr.needsUpdate = true;
    this.trailGeometry.setDrawRange(0, trailIndex);

    const debrisPosAttr = this.debrisGeometry.getAttribute('position') as THREE.BufferAttribute;
    const debrisColAttr = this.debrisGeometry.getAttribute('color') as THREE.BufferAttribute;
    const debrisPosArr = debrisPosAttr.array as Float32Array;
    const debrisColArr = debrisColAttr.array as Float32Array;

    for (let i = 0; i < this.activeDebris.length; i++) {
      const d = this.activeDebris[i];
      debrisPosArr[i * 3] = d.position.x;
      debrisPosArr[i * 3 + 1] = d.position.y;
      debrisPosArr[i * 3 + 2] = d.position.z;

      const lifeRatio = Math.max(0, d.life / d.maxLife);
      const flicker = this.computeFlicker(time, d);
      const alpha = lifeRatio * flicker;
      debrisColArr[i * 3] = d.baseColor.r * alpha;
      debrisColArr[i * 3 + 1] = d.baseColor.g * alpha;
      debrisColArr[i * 3 + 2] = d.baseColor.b * alpha;
    }
    debrisPosAttr.needsUpdate = true;
    debrisColAttr.needsUpdate = true;
    this.debrisGeometry.setDrawRange(0, this.activeDebris.length);
  }

  public getActiveMeteorCount(): number {
    return this.activeMeteors.length;
  }

  public getActiveDebrisCount(): number {
    return this.activeDebris.length;
  }

  public getPoolStats(): PoolStats {
    return {
      activeMeteors: this.activeMeteors.length,
      totalMeteors: METEOR_POOL_SIZE,
      activeDebris: this.activeDebris.length,
      totalDebris: DEBRIS_POOL_SIZE,
      meteorPoolExhausted: this.meteorPoolExhausted,
      debrisPoolExhausted: this.debrisPoolExhausted
    };
  }

  public getConfig(): MeteorConfig {
    return { ...this.config };
  }

  public dispose(): void {
    this.scene.remove(this.meteors);
    this.scene.remove(this.trails);
    this.scene.remove(this.debrisPoints);
    this.meteorGeometry.dispose();
    this.meteorMaterial.dispose();
    this.trailGeometry.dispose();
    this.trailMaterial.dispose();
    this.debrisGeometry.dispose();
    this.debrisMaterial.dispose();
  }
}
