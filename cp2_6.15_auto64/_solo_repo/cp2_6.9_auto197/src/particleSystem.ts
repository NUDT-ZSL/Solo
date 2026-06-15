import * as THREE from 'three';

interface SparkleData {
  baseOffset: THREE.Vector3;
  phase: number;
  speed: number;
  baseColor: THREE.Color;
  currentColor: THREE.Color;
}

interface EnergyRing {
  mesh: THREE.Mesh;
  startTime: number;
  active: boolean;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private particleA!: THREE.Mesh;
  private particleB!: THREE.Mesh;
  private particleAGlow!: THREE.Mesh;
  private particleBGlow!: THREE.Mesh;
  private sparkles!: THREE.Points;
  private sparkleData: SparkleData[] = [];
  private energyRings: EnergyRing[] = [];
  private readonly MAX_ENERGY_RINGS = 10;
  private readonly RING_DURATION = 0.6;
  private readonly RING_COOLDOWN = 0.2;
  private lastRingTime = -1;
  private burstCount = 0;
  private sparkleGoldTime = 0;
  private sparkleShakeBoostTime = 0;
  private time = 0;
  private particleDistance = 0;
  private onBurstCallback: (() => void) | null = null;

  private readonly SPIRAL_RADIUS = 1.5;
  private readonly SPIRAL_AMPLITUDE = 1.0;
  private readonly ROTATION_SPEED = 0.5;
  private readonly Z_AMPLITUDE = 2.0;
  private readonly Z_PERIOD = 4.0;
  private readonly COLLISION_DISTANCE = 0.4;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.createParticles();
    this.createSparkles();
    this.initEnergyRingPool();
  }

  setOnBurstCallback(callback: () => void): void {
    this.onBurstCallback = callback;
  }

  getParticleDistance(): number {
    return this.particleDistance;
  }

  getBurstCount(): number {
    return this.burstCount;
  }

  private createParticles(): void {
    const blueColor = new THREE.Color(0x3A86FF);
    const redColor = new THREE.Color(0xFF006E);

    const sphereGeo = new THREE.SphereGeometry(0.3, 32, 32);
    const matA = new THREE.MeshPhongMaterial({
      color: blueColor,
      emissive: blueColor,
      emissiveIntensity: 0.6,
      shininess: 100
    });
    const matB = new THREE.MeshPhongMaterial({
      color: redColor,
      emissive: redColor,
      emissiveIntensity: 0.6,
      shininess: 100
    });

    this.particleA = new THREE.Mesh(sphereGeo, matA);
    this.particleB = new THREE.Mesh(sphereGeo, matB);

    const glowGeo = new THREE.SphereGeometry(0.38, 32, 32);
    const glowMatA = new THREE.MeshBasicMaterial({
      color: blueColor,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const glowMatB = new THREE.MeshBasicMaterial({
      color: redColor,
      transparent: true,
      opacity: 0.25,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.particleAGlow = new THREE.Mesh(glowGeo, glowMatA);
    this.particleBGlow = new THREE.Mesh(glowGeo, glowMatB);

    this.particleA.add(this.particleAGlow);
    this.particleB.add(this.particleBGlow);

    this.scene.add(this.particleA);
    this.scene.add(this.particleB);
  }

  private createSparkles(): void {
    const sparkleCount = 1500;
    const positions = new Float32Array(sparkleCount * 3);
    const colors = new Float32Array(sparkleCount * 3);
    const sizes = new Float32Array(sparkleCount);

    const colorStart = new THREE.Color(0x6A4C93);
    const colorEnd = new THREE.Color(0x00F5D4);

    for (let i = 0; i < sparkleCount; i++) {
      this.sparkleData.push({
        baseOffset: new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          (Math.random() - 0.5) * 4,
          (Math.random() - 0.5) * 6
        ),
        phase: Math.random() * Math.PI * 2,
        speed: 1.5 + Math.random() * 1.5,
        baseColor: colorStart.clone().lerp(colorEnd, Math.random()),
        currentColor: new THREE.Color()
      });

      sizes[i] = 0.02 + Math.random() * 0.06;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true
    });

    this.sparkles = new THREE.Points(geo, mat);
    this.scene.add(this.sparkles);
  }

  private initEnergyRingPool(): void {
    for (let i = 0; i < this.MAX_ENERGY_RINGS; i++) {
      const ringGeo = new THREE.RingGeometry(0.1, 0.15, 64);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xFFD166,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const mesh = new THREE.Mesh(ringGeo, ringMat);
      mesh.visible = false;
      this.scene.add(mesh);
      this.energyRings.push({ mesh, startTime: -1, active: false });
    }
  }

  private triggerEnergyBurst(center: THREE.Vector3): void {
    if (this.time - this.lastRingTime < this.RING_COOLDOWN) return;
    this.lastRingTime = this.time;

    const ring = this.energyRings.find(r => !r.active);
    if (!ring) return;

    ring.startTime = this.time;
    ring.active = true;
    ring.mesh.visible = true;
    ring.mesh.position.copy(center);
    ring.mesh.lookAt(center.x + 1, center.y, center.z);
    (ring.mesh.material as THREE.MeshBasicMaterial).opacity = 0.8;
    ring.mesh.rotation.x = Math.random() * Math.PI;
    ring.mesh.rotation.y = Math.random() * Math.PI;

    this.burstCount++;
    this.sparkleGoldTime = 0.3;
    this.sparkleShakeBoostTime = 0.5;

    if (this.onBurstCallback) {
      this.onBurstCallback();
    }
  }

  private updateEnergyRings(_dt: number): void {
    for (const ring of this.energyRings) {
      if (!ring.active) continue;

      const elapsed = this.time - ring.startTime;
      const t = elapsed / this.RING_DURATION;

      if (t >= 1) {
        ring.active = false;
        ring.mesh.visible = false;
        (ring.mesh.material as THREE.MeshBasicMaterial).opacity = 0;
        continue;
      }

      const currentRadius = 0.1 + t * 2.4;
      const thickness = 0.05;
      const opacity = 0.8 * (1 - t);

      ring.mesh.geometry.dispose();
      ring.mesh.geometry = new THREE.RingGeometry(currentRadius, currentRadius + thickness, 64);

      const mat = ring.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = opacity;
      const color = new THREE.Color(0xFFD166).lerp(new THREE.Color(0xFF006E), t);
      mat.color.copy(color);
    }
  }

  private computeParticlePosition(phase: number): THREE.Vector3 {
    const angle = this.time * this.ROTATION_SPEED + phase;
    const x = this.SPIRAL_RADIUS * Math.cos(angle);
    const y = this.SPIRAL_AMPLITUDE * Math.sin(angle * 2);
    const zPhase = (this.time / this.Z_PERIOD) * Math.PI * 2 + phase;
    const z = this.Z_AMPLITUDE * Math.sin(zPhase);
    return new THREE.Vector3(x, y, z);
  }

  update(dt: number): void {
    this.time += dt;

    const posA = this.computeParticlePosition(0);
    const posB = this.computeParticlePosition(Math.PI);

    this.particleA.position.copy(posA);
    this.particleB.position.copy(posB);

    this.particleDistance = posA.distanceTo(posB);

    if (this.particleDistance < this.COLLISION_DISTANCE) {
      const center = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);
      this.triggerEnergyBurst(center);
    }

    this.updateEnergyRings(dt);
    this.updateSparkles(dt, posA, posB);

    const glowPulse = 0.9 + Math.sin(this.time * 4) * 0.1;
    this.particleAGlow.scale.setScalar(glowPulse);
    this.particleBGlow.scale.setScalar(glowPulse);
  }

  private updateSparkles(dt: number, posA: THREE.Vector3, posB: THREE.Vector3): void {
    const center = new THREE.Vector3().addVectors(posA, posB).multiplyScalar(0.5);
    const positions = this.sparkles.geometry.attributes.position.array as Float32Array;
    const colors = this.sparkles.geometry.attributes.color.array as Float32Array;

    const goldColor = new THREE.Color(0xFFD166);
    const shakeBoost = this.sparkleShakeBoostTime > 0 ? 2 : 1;
    const useGoldColor = this.sparkleGoldTime > 0;

    if (this.sparkleShakeBoostTime > 0) this.sparkleShakeBoostTime -= dt;
    if (this.sparkleGoldTime > 0) this.sparkleGoldTime -= dt;

    for (let i = 0; i < this.sparkleData.length; i++) {
      const data = this.sparkleData[i];
      const flicker = 0.7 + 0.3 * Math.sin(this.time * data.speed + data.phase);

      const shakeX = (Math.random() - 0.5) * 0.15 * shakeBoost;
      const shakeY = (Math.random() - 0.5) * 0.15 * shakeBoost;
      const shakeZ = (Math.random() - 0.5) * 0.15 * shakeBoost;

      positions[i * 3] = center.x + data.baseOffset.x + shakeX;
      positions[i * 3 + 1] = center.y + data.baseOffset.y + shakeY;
      positions[i * 3 + 2] = center.z + data.baseOffset.z + shakeZ;

      let color: THREE.Color;
      if (useGoldColor) {
        color = goldColor;
      } else {
        color = data.baseColor;
      }
      data.currentColor.copy(color);

      colors[i * 3] = data.currentColor.r * flicker;
      colors[i * 3 + 1] = data.currentColor.g * flicker;
      colors[i * 3 + 2] = data.currentColor.b * flicker;
    }

    this.sparkles.geometry.attributes.position.needsUpdate = true;
    this.sparkles.geometry.attributes.color.needsUpdate = true;
    (this.sparkles.material as THREE.PointsMaterial).opacity = 0.5 + 0.3 * Math.sin(this.time * 2);
  }

  render(): void {
  }

  dispose(): void {
    this.particleA.geometry.dispose();
    this.particleB.geometry.dispose();
    (this.particleA.material as THREE.Material).dispose();
    (this.particleB.material as THREE.Material).dispose();

    this.particleAGlow.geometry.dispose();
    this.particleBGlow.geometry.dispose();
    (this.particleAGlow.material as THREE.Material).dispose();
    (this.particleBGlow.material as THREE.Material).dispose();

    this.sparkles.geometry.dispose();
    (this.sparkles.material as THREE.Material).dispose();

    for (const ring of this.energyRings) {
      ring.mesh.geometry.dispose();
      (ring.mesh.material as THREE.Material).dispose();
    }
  }
}
