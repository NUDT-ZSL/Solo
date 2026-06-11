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
const SCENE_HALF_SIZE = 30;

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

  private spawnAccumulator = 0;
  private burstMultiplier = 1;
  private burstTimer = 0;

  private meteorGroup: THREE.Group;
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

    for (let i = 0; i < MAX_METEORS; i++) {
      this.meteorPool.push({
        active: false,
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: METEOR_TRAIL_DURATION,
        trailPositions: [],
        trailLength: 0,
      });
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(TRAIL_MAX_POINTS * 3);
      const col = new Float32Array(TRAIL_MAX_POINTS * 3);
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      geo.setDrawRange(0, 0);
      const mat = new THREE.LineBasicMaterial({
        vertexColors: true,
        blending: THREE.AdditiveBlending,
        transparent: true,
        depthWrite: false,
      });
      const line = new THREE.Line(geo, mat);
      line.frustumCulled = false;
      line.visible = false;
      scene.add(line);
      this.trailLines.push(line);
      this.trailGeometries.push(geo);
    }

    this.meteorGroup = new THREE.Group();
    scene.add(this.meteorGroup);

    this.debrisPositions = new Float32Array(MAX_DEBRIS * 3);
    this.debrisColors = new Float32Array(MAX_DEBRIS * 3);
    this.debrisSizes = new Float32Array(MAX_DEBRIS);

    this.debrisGeometry = new THREE.BufferGeometry();
    this.debrisGeometry.setAttribute('position', new THREE.BufferAttribute(this.debrisPositions, 3));
    this.debrisGeometry.setAttribute('color', new THREE.BufferAttribute(this.debrisColors, 3));
    this.debrisGeometry.setAttribute('size', new THREE.BufferAttribute(this.debrisSizes, 1));

    const debrisMaterial = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: `
        attribute float size;
        varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * (200.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        void main() {
          float dist = length(gl_PointCoord - vec2(0.5));
          if (dist > 0.5) discard;
          float alpha = 1.0 - smoothstep(0.0, 0.5, dist);
          gl_FragColor = vec4(vColor, alpha);
        }
      `,
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

  private spawnMeteor(): void {
    const meteor = this.meteorPool.find((m) => !m.active);
    if (!meteor) return;

    const idx = this.meteorPool.indexOf(meteor);
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
    meteor.trailPositions = [meteor.position.clone()];
    meteor.trailLength = 1;

    this.trailLines[idx]!.visible = true;
  }

  private updateMeteors(delta: number): void {
    for (let i = 0; i < MAX_METEORS; i++) {
      const meteor = this.meteorPool[i]!;
      if (!meteor.active) {
        this.trailLines[i]!.visible = false;
        continue;
      }

      meteor.life += delta;
      if (meteor.life >= meteor.maxLife) {
        this.spawnDebrisFromMeteor(meteor);
        this.deactivateMeteor(meteor, i);
        continue;
      }

      meteor.position.addScaledVector(meteor.velocity, delta);

      if (meteor.trailPositions.length < TRAIL_MAX_POINTS) {
        meteor.trailPositions.push(meteor.position.clone());
      } else {
        for (let j = 0; j < meteor.trailPositions.length - 1; j++) {
          meteor.trailPositions[j]!.copy(meteor.trailPositions[j + 1]!);
        }
        meteor.trailPositions[meteor.trailPositions.length - 1]!.copy(meteor.position);
      }
      meteor.trailLength = meteor.trailPositions.length;

      this.updateTrailGeometry(meteor, i);
    }
  }

  private updateTrailGeometry(meteor: Meteor, idx: number): void {
    const geo = this.trailGeometries[idx]!;
    const posAttr = geo.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = geo.getAttribute('color') as THREE.BufferAttribute;

    const count = meteor.trailLength;
    const fadeProgress = Math.min(meteor.life / meteor.maxLife, 1.0);

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
      color.multiplyScalar(1.0 - fadeProgress * 0.7);
      colAttr.setXYZ(j, color.r, color.g, color.b);
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    geo.setDrawRange(0, count);
  }

  private deactivateMeteor(meteor: Meteor, idx: number): void {
    meteor.active = false;
    meteor.trailPositions = [];
    meteor.trailLength = 0;
    this.trailLines[idx]!.visible = false;
    this.trailGeometries[idx]!.setDrawRange(0, 0);
  }

  private spawnDebrisFromMeteor(meteor: Meteor): void {
    const count = 10 + Math.floor(Math.random() * 21);
    const origin = meteor.position.clone();
    const baseSpeed = 2 + Math.random() * 4;

    for (let i = 0; i < count; i++) {
      const debris = this.debrisPool.find((d) => !d.active);
      if (!debris) break;

      debris.active = true;
      debris.position.copy(origin);
      debris.velocity.set(
        (Math.random() - 0.5) * baseSpeed * 2,
        (Math.random() - 0.5) * baseSpeed * 2,
        (Math.random() - 0.5) * baseSpeed * 2
      );
      debris.life = 0;
      debris.maxLife = DEBRIS_DURATION;
      debris.flickerSpeed = 8 + Math.random() * 15;
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
        continue;
      }

      debris.position.addScaledVector(debris.velocity, delta);
      debris.velocity.multiplyScalar(0.98);
    }
  }

  private renderDebris(): void {
    let visibleCount = 0;

    for (let i = 0; i < MAX_DEBRIS; i++) {
      const debris = this.debrisPool[i]!;
      if (!debris.active) continue;

      const idx = visibleCount * 3;
      const lifeRatio = debris.life / debris.maxLife;
      const flicker = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(debris.life * debris.flickerSpeed + debris.flickerOffset));
      const fadeOut = 1.0 - lifeRatio;
      const alpha = flicker * fadeOut;

      this.debrisPositions[idx] = debris.position.x;
      this.debrisPositions[idx + 1] = debris.position.y;
      this.debrisPositions[idx + 2] = debris.position.z;

      const r = 1.0 * alpha;
      const g = (0.55 * (1.0 - lifeRatio)) * alpha;
      const b = (0.1 * (1.0 - lifeRatio)) * alpha;
      this.debrisColors[idx] = r;
      this.debrisColors[idx + 1] = g;
      this.debrisColors[idx + 2] = b;

      this.debrisSizes[visibleCount] = (0.3 + 0.7 * fadeOut) * 3.0;

      visibleCount++;
    }

    for (let i = visibleCount; i < MAX_DEBRIS; i++) {
      this.debrisPositions[i * 3] = 0;
      this.debrisPositions[i * 3 + 1] = 0;
      this.debrisPositions[i * 3 + 2] = 0;
      this.debrisSizes[i] = 0;
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
    }
    this.debrisGeometry.dispose();
    (this.debrisPoints.material as THREE.Material)?.dispose();
  }
}
