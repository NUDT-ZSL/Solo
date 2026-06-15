import * as THREE from 'three';
import {
  SCENE_RADIUS,
  BURST_FORCE,
  BURST_DURATION,
  CONVERGE_DURATION,
  COLOR_THEMES,
  randomInSphere,
  lerp,
  clamp,
  smoothstep,
  createGlowTexture,
  type ColorTheme,
} from './utils';

interface ParticleState {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  homePosition: THREE.Vector3;
  flowOffset: THREE.Vector3;
  phase: number;
  distFromCenter: number;
  state: 'flowing' | 'bursting' | 'converging';
  burstOrigin: THREE.Vector3;
  burstDir: THREE.Vector3;
  burstTimer: number;
  convergeTarget: THREE.Vector3;
  convergeTimer: number;
  convergeStart: THREE.Vector3;
  convergeSpiralAngle: number;
}

export class ParticleSystem {
  private count: number;
  private flowSpeed: number;
  private themeKey: string;
  private theme: ColorTheme;
  private particles: ParticleState[];
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private points: THREE.Points;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private burstPoints: THREE.Points[];
  private burstTimers: { mesh: THREE.Points; timer: number; maxTimer: number }[];
  private glowTexture: THREE.Texture;

  constructor(count: number, flowSpeed: number, themeKey: string) {
    this.count = count;
    this.flowSpeed = flowSpeed;
    this.themeKey = themeKey;
    this.theme = COLOR_THEMES[themeKey];
    this.particles = [];
    this.burstPoints = [];
    this.burstTimers = [];
    this.glowTexture = createGlowTexture();

    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);

    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.25,
      map: this.glowTexture,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;

    this.initParticles();
  }

  private initParticles() {
    this.particles = [];
    const tempColor = new THREE.Color();
    for (let i = 0; i < this.count; i++) {
      const pos = randomInSphere(SCENE_RADIUS);
      const homePos = pos.clone();
      const dist = pos.length();
      const particle: ParticleState = {
        position: pos,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        ),
        homePosition: homePos,
        flowOffset: new THREE.Vector3(
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2,
          (Math.random() - 0.5) * 2
        ),
        phase: Math.random() * Math.PI * 2,
        distFromCenter: dist / SCENE_RADIUS,
        state: 'flowing',
        burstOrigin: new THREE.Vector3(),
        burstDir: new THREE.Vector3(),
        burstTimer: 0,
        convergeTarget: new THREE.Vector3(),
        convergeTimer: 0,
        convergeStart: new THREE.Vector3(),
        convergeSpiralAngle: Math.random() * Math.PI * 2,
      };
      this.particles.push(particle);

      this.positions[i * 3] = pos.x;
      this.positions[i * 3 + 1] = pos.y;
      this.positions[i * 3 + 2] = pos.z;

      tempColor.copy(this.theme.center).lerp(this.theme.edge, particle.distFromCenter);
      this.colors[i * 3] = tempColor.r;
      this.colors[i * 3 + 1] = tempColor.g;
      this.colors[i * 3 + 2] = tempColor.b;

      this.sizes[i] = lerp(2.5, 0.8, particle.distFromCenter);
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  getObject(): THREE.Points {
    return this.points;
  }

  getCount(): number {
    return this.count;
  }

  getPositions(): Float32Array {
    return this.positions;
  }

  getColors(): Float32Array {
    return this.colors;
  }

  getFlowSpeed(): number {
    return this.flowSpeed;
  }

  setFlowSpeed(speed: number) {
    this.flowSpeed = clamp(speed, 0.1, 2.0);
  }

  setTheme(key: string) {
    if (COLOR_THEMES[key]) {
      this.themeKey = key;
      this.theme = COLOR_THEMES[key];
    }
  }

  setParticleCount(newCount: number) {
    newCount = clamp(newCount, 500, 5000);
    if (newCount === this.count) return;

    this.count = newCount;
    this.positions = new Float32Array(newCount * 3);
    this.colors = new Float32Array(newCount * 3);
    this.sizes = new Float32Array(newCount);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.initParticles();
  }

  triggerBurst(worldPoint: THREE.Vector3) {
    const burstRadius = 3.5;
    const affected: number[] = [];
    const burstTargetCount = Math.min(60, Math.floor(this.count * 0.04));
    let closestDist = Infinity;

    for (let i = 0; i < this.particles.length; i++) {
      const d = this.particles[i].position.distanceTo(worldPoint);
      if (d < burstRadius) {
        affected.push(i);
      }
      if (d < closestDist) closestDist = d;
    }

    if (affected.length < burstTargetCount) {
      const sorted = this.particles
        .map((p, i) => ({ i, d: p.position.distanceTo(worldPoint) }))
        .sort((a, b) => a.d - b.d);
      for (const item of sorted) {
        if (!affected.includes(item.i)) {
          affected.push(item.i);
        }
        if (affected.length >= burstTargetCount) break;
      }
    }

    for (const i of affected) {
      const p = this.particles[i];
      if (p.state !== 'flowing') continue;
      p.state = 'bursting';
      p.burstOrigin.copy(p.position);
      p.burstDir.copy(p.position).sub(worldPoint).normalize();
      if (p.burstDir.lengthSq() < 0.001) {
        p.burstDir.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize();
      }
      p.burstDir.add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5,
          (Math.random() - 0.5) * 0.5
        ).normalize().multiplyScalar(0.3)
      );
      p.burstDir.normalize();
      p.burstTimer = 0;
    }

    this.createBurstEffect(worldPoint);
  }

  private createBurstEffect(origin: THREE.Vector3) {
    const burstCount = 40;
    const bGeo = new THREE.BufferGeometry();
    const bPos = new Float32Array(burstCount * 3);
    const bCol = new Float32Array(burstCount * 3);
    const bSize = new Float32Array(burstCount);

    const tempColor = new THREE.Color();
    for (let i = 0; i < burstCount; i++) {
      bPos[i * 3] = origin.x;
      bPos[i * 3 + 1] = origin.y;
      bPos[i * 3 + 2] = origin.z;

      tempColor.copy(this.theme.burst).offsetHSL((Math.random() - 0.5) * 0.1, 0, (Math.random() - 0.5) * 0.2);
      bCol[i * 3] = tempColor.r;
      bCol[i * 3 + 1] = tempColor.g;
      bCol[i * 3 + 2] = tempColor.b;

      bSize[i] = 1.0 + Math.random() * 2.0;
    }

    bGeo.setAttribute('position', new THREE.BufferAttribute(bPos, 3));
    bGeo.setAttribute('color', new THREE.BufferAttribute(bCol, 3));
    bGeo.setAttribute('size', new THREE.BufferAttribute(bSize, 1));

    const bMat = new THREE.PointsMaterial({
      size: 0.4,
      map: this.glowTexture,
      vertexColors: true,
      transparent: true,
      opacity: 1.0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const bMesh = new THREE.Points(bGeo, bMat);
    bMesh.frustumCulled = false;
    this.points.parent?.add(bMesh);

    this.burstPoints.push(bMesh);
    this.burstTimers.push({ mesh: bMesh, timer: 0, maxTimer: 1.0 });
  }

  reset() {
    for (let i = 0; i < this.particles.length; i++) {
      this.particles[i].state = 'flowing';
    }
    this.initParticles();
  }

  update(dt: number, time: number) {
    const tempColor = new THREE.Color();
    dt = Math.min(dt, 0.05);

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];

      if (p.state === 'flowing') {
        this.updateFlowing(p, i, dt, time, tempColor);
      } else if (p.state === 'bursting') {
        p.burstTimer += dt;
        const t = p.burstTimer / BURST_DURATION;

        if (t >= 1.0) {
          p.state = 'converging';
          p.convergeTimer = 0;
          p.convergeStart.copy(p.position);
          p.convergeTarget.copy(randomInSphere(SCENE_RADIUS));
          p.convergeSpiralAngle = Math.atan2(p.position.y, p.position.x);
        } else {
          const easeT = 1.0 - Math.pow(1.0 - t, 3);
          const force = BURST_FORCE * (1.0 - easeT);
          p.position.addScaledVector(p.burstDir, force * dt);
        }
      } else if (p.state === 'converging') {
        p.convergeTimer += dt;
        const t = p.convergeTimer / CONVERGE_DURATION;

        if (t >= 1.0) {
          p.state = 'flowing';
          p.homePosition.copy(p.convergeTarget);
          p.position.copy(p.convergeTarget);
          p.distFromCenter = p.position.length() / SCENE_RADIUS;
          p.velocity.set(
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3,
            (Math.random() - 0.5) * 0.3
          );
        } else {
          const easeT = smoothstep(0, 1, t);
          p.position.lerpVectors(p.convergeStart, p.convergeTarget, easeT);

          p.convergeSpiralAngle += dt * 4.0;
          const spiralR = (1.0 - easeT) * 1.5;
          p.position.x += Math.cos(p.convergeSpiralAngle) * spiralR * dt * 3;
          p.position.y += Math.sin(p.convergeSpiralAngle) * spiralR * dt * 3;
        }
      }

      this.positions[i * 3] = p.position.x;
      this.positions[i * 3 + 1] = p.position.y;
      this.positions[i * 3 + 2] = p.position.z;

      p.distFromCenter = p.position.length() / SCENE_RADIUS;
      const colorT = clamp(p.distFromCenter, 0, 1);
      tempColor.copy(this.theme.center).lerp(this.theme.edge, colorT);

      if (p.state === 'bursting') {
        tempColor.lerp(this.theme.burst, 0.6);
      }

      this.colors[i * 3] = tempColor.r;
      this.colors[i * 3 + 1] = tempColor.g;
      this.colors[i * 3 + 2] = tempColor.b;

      const baseSize = lerp(2.5, 0.8, clamp(p.distFromCenter, 0, 1));
      if (p.state === 'bursting') {
        this.sizes[i] = baseSize * (1.5 + 0.5 * Math.sin(p.burstTimer * 20));
      } else if (p.state === 'converging') {
        this.sizes[i] = baseSize * (1.0 + 0.3 * Math.sin(p.convergeTimer * 10));
      } else {
        this.sizes[i] = baseSize * (0.9 + 0.1 * Math.sin(time * 2 + p.phase));
      }
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;

    this.updateBurstEffects(dt);
  }

  private updateFlowing(p: ParticleState, _i: number, dt: number, time: number, _tempColor: THREE.Color) {
    const speed = this.flowSpeed;
    const t = time * speed;

    const flowX = Math.sin(p.phase + t * 0.3) * p.flowOffset.x * 0.5;
    const flowY = Math.cos(p.phase + t * 0.2) * p.flowOffset.y * 0.5;
    const flowZ = Math.sin(p.phase * 0.7 + t * 0.25) * p.flowOffset.z * 0.5;

    const targetX = p.homePosition.x + flowX;
    const targetY = p.homePosition.y + flowY;
    const targetZ = p.homePosition.z + flowZ;

    p.position.x += (targetX - p.position.x) * dt * 2.0;
    p.position.y += (targetY - p.position.y) * dt * 2.0;
    p.position.z += (targetZ - p.position.z) * dt * 2.0;

    p.velocity.x += (Math.random() - 0.5) * 0.02 * speed;
    p.velocity.y += (Math.random() - 0.5) * 0.02 * speed;
    p.velocity.z += (Math.random() - 0.5) * 0.02 * speed;
    p.velocity.multiplyScalar(0.98);

    p.position.addScaledVector(p.velocity, dt);

    const dist = p.position.length();
    if (dist > SCENE_RADIUS * 1.3) {
      const dir = p.position.clone().normalize();
      p.position.copy(dir.multiplyScalar(SCENE_RADIUS * 1.3));
      p.velocity.reflect(dir.negate());
      p.velocity.multiplyScalar(0.5);
    }
  }

  private updateBurstEffects(dt: number) {
    for (let i = this.burstTimers.length - 1; i >= 0; i--) {
      const b = this.burstTimers[i];
      b.timer += dt;
      const t = b.timer / b.maxTimer;

      if (t >= 1.0) {
        b.mesh.parent?.remove(b.mesh);
        b.mesh.geometry.dispose();
        (b.mesh.material as THREE.Material).dispose();
        this.burstPoints.splice(i, 1);
        this.burstTimers.splice(i, 1);
        continue;
      }

      const bGeo = b.mesh.geometry;
      const posAttr = bGeo.getAttribute('position') as THREE.BufferAttribute;
      const arr = posAttr.array as Float32Array;
      const count = arr.length / 3;

      const expandSpeed = 8.0 * (1.0 - t);
      for (let j = 0; j < count; j++) {
        const angle = (j / count) * Math.PI * 2;
        const elev = ((j * 7) % count) / count * Math.PI - Math.PI / 2;
        arr[j * 3] += Math.cos(angle) * Math.cos(elev) * expandSpeed * dt;
        arr[j * 3 + 1] += Math.sin(elev) * expandSpeed * dt;
        arr[j * 3 + 2] += Math.sin(angle) * Math.cos(elev) * expandSpeed * dt;
      }
      posAttr.needsUpdate = true;

      (b.mesh.material as THREE.PointsMaterial).opacity = 1.0 - t;
      (b.mesh.material as THREE.PointsMaterial).size = 0.4 + t * 1.5;
    }
  }

  getThemeKey(): string {
    return this.themeKey;
  }

  getTheme(): ColorTheme {
    return this.theme;
  }

  dispose() {
    this.geometry.dispose();
    this.material.dispose();
    this.glowTexture.dispose();
    for (const b of this.burstPoints) {
      b.geometry.dispose();
      (b.material as THREE.Material).dispose();
    }
  }
}
