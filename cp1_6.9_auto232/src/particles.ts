import * as THREE from 'three';

const PARTICLE_COUNT = 500;
const CAVE_RADIUS = 12;
const CAVE_HEIGHT = 10;
const LAVA_Y = -3;

interface ParticleExtra {
  velocity: THREE.Vector3;
  baseSize: number;
  sizePhase: number;
  pulseBoost: number;
  colorBoost: number;
}

export class AshParticleSystem {
  private scene: THREE.Scene;
  private particles!: THREE.Points;
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.PointsMaterial;
  private extras: ParticleExtra[] = [];
  private pulseEffects: { position: THREE.Vector3; startTime: number; radius: number }[] = [];

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.init();
  }

  private init(): void {
    this.geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(PARTICLE_COUNT * 3);
    const colors = new Float32Array(PARTICLE_COUNT * 3);
    const sizes = new Float32Array(PARTICLE_COUNT);

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      const r = Math.pow(Math.random(), 0.5) * CAVE_RADIUS * 0.9;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = (Math.random() - 0.3) * CAVE_HEIGHT;
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const colorT = Math.random();
      const rC = 0.5 + colorT * 0.3;
      const gC = 0.45 + colorT * 0.15;
      const bC = 0.4 + colorT * 0.1;
      colors[i * 3] = rC;
      colors[i * 3 + 1] = gC;
      colors[i * 3 + 2] = bC;

      const baseSize = 1 + Math.random() * 3;
      sizes[i] = baseSize;

      const speed = 0.1 + Math.random() * 0.2;
      const vTheta = Math.random() * Math.PI * 2;
      const vPhi = Math.random() * Math.PI;
      this.extras.push({
        velocity: new THREE.Vector3(
          speed * Math.sin(vPhi) * Math.cos(vTheta),
          (Math.random() - 0.3) * speed * 0.5,
          speed * Math.sin(vPhi) * Math.sin(vTheta)
        ),
        baseSize,
        sizePhase: Math.random() * Math.PI * 2,
        pulseBoost: 0,
        colorBoost: 0
      });
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    this.material = new THREE.PointsMaterial({
      size: 0.08,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(this.geometry, this.material);
    this.scene.add(this.particles);
  }

  setLavaSurface(_mesh: THREE.Mesh): void {
  }

  addPulseEffect(worldPos: THREE.Vector3): void {
    this.pulseEffects.push({
      position: worldPos.clone(),
      startTime: performance.now(),
      radius: 0
    });
  }

  update(delta: number, elapsed: number): void {
    const positions = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colors = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const sizes = this.geometry.getAttribute('size') as THREE.BufferAttribute;
    const posArr = positions.array as Float32Array;
    const colArr = colors.array as Float32Array;
    const sizeArr = sizes.array as Float32Array;

    this.pulseEffects = this.pulseEffects.filter((pulse) => {
      pulse.radius += delta * 12;
      return pulse.radius < CAVE_RADIUS * 2;
    });

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const extra = this.extras[i];
      const ix = i * 3;

      let px = posArr[ix];
      let py = posArr[ix + 1];
      let pz = posArr[ix + 2];

      const horizontalDist = Math.sqrt(px * px + pz * pz);
      if (horizontalDist > CAVE_RADIUS * 0.95) {
        const scale = (CAVE_RADIUS * 0.9) / horizontalDist;
        px *= scale;
        pz *= scale;
        extra.velocity.x *= -0.5;
        extra.velocity.z *= -0.5;
      }

      if (py > CAVE_HEIGHT * 0.8) {
        py = CAVE_HEIGHT * 0.8;
        extra.velocity.y *= -0.5;
      }
      if (py < LAVA_Y + 0.5) {
        py = LAVA_Y + 0.5;
        extra.velocity.y = Math.abs(extra.velocity.y) * 0.5 + 0.2;
      }

      let vx = extra.velocity.x;
      let vy = extra.velocity.y;
      let vz = extra.velocity.z;

      const distToLava = py - LAVA_Y;
      if (distToLava < 4) {
        const heatFactor = Math.max(0, 1 - distToLava / 4);
        vy += heatFactor * 0.5 * delta * 3;
        vy = Math.min(vy, 0.5);
      }

      let colorBoostFactor = extra.colorBoost;
      let speedBoostFactor = 1 + extra.pulseBoost;

      for (const pulse of this.pulseEffects) {
        const dx = px - pulse.position.x;
        const dy = py - pulse.position.y;
        const dz = pz - pulse.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        const pulseRing = Math.abs(dist - pulse.radius);
        if (pulseRing < 1.5) {
          const influence = 1 - pulseRing / 1.5;
          colorBoostFactor = Math.max(colorBoostFactor, influence);
          speedBoostFactor = Math.max(speedBoostFactor, 1 + influence * 3);
          if (dist > 0.01) {
            vx += (dx / dist) * influence * 0.3;
            vy += (dy / dist) * influence * 0.3;
            vz += (dz / dist) * influence * 0.3;
          }
        }
      }

      extra.pulseBoost *= Math.pow(0.1, delta);
      extra.colorBoost *= Math.pow(0.05, delta);
      extra.colorBoost = Math.max(extra.colorBoost, colorBoostFactor * 0.8);

      px += vx * speedBoostFactor * delta;
      py += vy * speedBoostFactor * delta;
      pz += vz * speedBoostFactor * delta;

      vx += (Math.random() - 0.5) * 0.02;
      vy += (Math.random() - 0.5) * 0.02;
      vz += (Math.random() - 0.5) * 0.02;

      const maxSpeed = 0.4;
      const currentSpeed = Math.sqrt(vx * vx + vy * vy + vz * vz);
      if (currentSpeed > maxSpeed) {
        vx = (vx / currentSpeed) * maxSpeed;
        vy = (vy / currentSpeed) * maxSpeed;
        vz = (vz / currentSpeed) * maxSpeed;
      }

      extra.velocity.set(vx, vy, vz);

      posArr[ix] = px;
      posArr[ix + 1] = py;
      posArr[ix + 2] = pz;

      const pulse = 0.8 + 0.4 * Math.sin(elapsed * 2 + extra.sizePhase);
      sizeArr[i] = extra.baseSize * pulse * (1 + extra.pulseBoost * 0.5);

      const baseT = i / PARTICLE_COUNT;
      let rC = 0.5 + baseT * 0.3;
      let gC = 0.45 + baseT * 0.15;
      let bC = 0.4 + baseT * 0.1;

      if (extra.colorBoost > 0.01) {
        rC = Math.min(1, rC + extra.colorBoost * 0.5);
        gC = Math.min(1, gC + extra.colorBoost * 0.3);
        bC = Math.max(0, bC - extra.colorBoost * 0.2);
      }

      if (distToLava < 3) {
        const heatGlow = (1 - distToLava / 3) * 0.3;
        rC = Math.min(1, rC + heatGlow);
        gC = Math.min(1, gC + heatGlow * 0.5);
      }

      colArr[ix] = rC;
      colArr[ix + 1] = gC;
      colArr[ix + 2] = bC;
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    sizes.needsUpdate = true;
  }

  getObject(): THREE.Points {
    return this.particles;
  }

  applyPulseToNearby(position: THREE.Vector3, radius: number): void {
    const posArr = this.geometry.getAttribute('position')!.array as Float32Array;
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3;
      const dx = posArr[ix] - position.x;
      const dy = posArr[ix + 1] - position.y;
      const dz = posArr[ix + 2] - position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (dist < radius) {
        const influence = 1 - dist / radius;
        this.extras[i].pulseBoost = Math.max(this.extras[i].pulseBoost, influence);
        this.extras[i].colorBoost = Math.max(this.extras[i].colorBoost, influence);
      }
    }
  }
}
