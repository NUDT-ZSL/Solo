import * as THREE from 'three';
import { Hourglass } from './hourglass';

export interface ParticleData {
  count: number;
  positions: Float32Array;
  velocities: Float32Array;
  colors: Float32Array;
  baseColors: Float32Array;
  radii: Float32Array;
  baseRadii: Float32Array;
}

export class ParticleSystem {
  public instancedMesh: THREE.InstancedMesh;
  public data: ParticleData;
  public gravity: number = 1.0;
  public magneticForce: number = 2.5;
  public baseSizeMultiplier: number = 1.0;
  private dummy: THREE.Object3D;
  private colorObj: THREE.Color;

  constructor(count: number = 1000) {
    count = Math.max(800, Math.min(1200, count));
    this.dummy = new THREE.Object3D();
    this.colorObj = new THREE.Color();

    const geometry = new THREE.SphereGeometry(1, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.5,
      roughness: 0.35,
      metalness: 0.15
    });

    this.instancedMesh = new THREE.InstancedMesh(geometry, material, count);
    this.instancedMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.instancedMesh.frustumCulled = false;

    this.data = {
      count,
      positions: new Float32Array(count * 3),
      velocities: new Float32Array(count * 3),
      colors: new Float32Array(count * 3),
      baseColors: new Float32Array(count * 3),
      radii: new Float32Array(count),
      baseRadii: new Float32Array(count)
    };

    this.initializeParticles();
    this.updateInstanceAttributes();
  }

  private initializeParticles(): void {
    const { count, positions, velocities, colors, baseColors, radii, baseRadii } = this.data;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const maxRadius = 1.5;
      const r = Math.random() * maxRadius;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const yJitter = Math.random() * 0.5;

      const coneHeight = 2.25 - 0.2;
      const yStart = 0.3;
      const t = Math.pow(Math.random(), 0.5);
      const localY = yStart + t * coneHeight;
      const localRadiusAtY = 0.12 + (1.8 - 0.12) * (localY - yStart) / coneHeight;
      const actualR = r * (localRadiusAtY / maxRadius);

      positions[idx] = actualR * Math.sin(phi) * Math.cos(theta);
      positions[idx + 1] = localY + yJitter;
      positions[idx + 2] = actualR * Math.sin(phi) * Math.sin(theta);

      velocities[idx] = (Math.random() - 0.5) * 0.1;
      velocities[idx + 1] = -0.05 - Math.random() * 0.05;
      velocities[idx + 2] = (Math.random() - 0.5) * 0.1;

      const hue = Math.random() * 360;
      const saturation = 0.7 + Math.random() * 0.3;
      const lightness = 0.55 + Math.random() * 0.2;
      this.colorObj.setHSL(hue / 360, saturation, lightness);
      colors[idx] = this.colorObj.r;
      colors[idx + 1] = this.colorObj.g;
      colors[idx + 2] = this.colorObj.b;
      baseColors[idx] = this.colorObj.r;
      baseColors[idx + 1] = this.colorObj.g;
      baseColors[idx + 2] = this.colorObj.b;

      const radius = 0.05 + Math.random() * 0.15;
      radii[i] = radius;
      baseRadii[i] = radius;
    }
  }

  public updateInstanceAttributes(): void {
    const { count, positions, colors, radii } = this.data;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      this.dummy.position.set(positions[idx], positions[idx + 1], positions[idx + 2]);
      const scale = radii[i] * this.baseSizeMultiplier;
      this.dummy.scale.set(scale, scale, scale);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.instancedMesh.setMatrixAt(i, this.dummy.matrix);

      if (this.instancedMesh.instanceColor) {
        const colorAttr = this.instancedMesh.instanceColor;
        colorAttr.setXYZ(i, colors[idx], colors[idx + 1], colors[idx + 2]);
      }
    }

    this.instancedMesh.instanceMatrix.needsUpdate = true;
    if (this.instancedMesh.instanceColor) {
      this.instancedMesh.instanceColor.needsUpdate = true;
    }
  }

  public update(delta: number, hourglass: Hourglass, magnetPosition: THREE.Vector3, magnetActive: boolean): void {
    const { count, positions, velocities, colors, baseColors, radii } = this.data;
    const gravityDir = hourglass.getGravityDirection();
    const gravityStrength = this.gravity * 2.0;
    const dt = Math.min(delta, 0.033);

    const magnetWorldPos = magnetPosition.clone();
    const redColor = new THREE.Color(0xff5533);
    const orangeColor = new THREE.Color(0xffaa44);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const px = positions[idx];
      const py = positions[idx + 1];
      const pz = positions[idx + 2];

      let ax = gravityDir.x * gravityStrength;
      let ay = gravityDir.y * gravityStrength;
      let az = gravityDir.z * gravityStrength;

      let magnetInfluence = 0;
      if (magnetActive) {
        const dx = magnetWorldPos.x - px;
        const dy = magnetWorldPos.y - py;
        const dz = magnetWorldPos.z - pz;
        const distSq = dx * dx + dy * dy + dz * dz;
        const dist = Math.sqrt(distSq);

        if (dist < 5.0 && dist > 0.01) {
          const force = (this.magneticForce * 2.0) / Math.max(distSq, 0.1);
          const invDist = 1.0 / dist;
          ax += dx * invDist * force;
          ay += dy * invDist * force;
          az += dz * invDist * force;
          magnetInfluence = Math.max(0, 1.0 - dist / 4.0);
        }
      }

      velocities[idx] += ax * dt;
      velocities[idx + 1] += ay * dt;
      velocities[idx + 2] += az * dt;

      velocities[idx] *= 0.985;
      velocities[idx + 1] *= 0.985;
      velocities[idx + 2] *= 0.985;

      const maxSpeed = 3.0;
      const speed = Math.sqrt(
        velocities[idx] * velocities[idx] +
        velocities[idx + 1] * velocities[idx + 1] +
        velocities[idx + 2] * velocities[idx + 2]
      );
      if (speed > maxSpeed) {
        const ratio = maxSpeed / speed;
        velocities[idx] *= ratio;
        velocities[idx + 1] *= ratio;
        velocities[idx + 2] *= ratio;
      }

      positions[idx] += velocities[idx] * dt;
      positions[idx + 1] += velocities[idx + 1] * dt;
      positions[idx + 2] += velocities[idx + 2] * dt;

      const particleRadius = radii[i] * this.baseSizeMultiplier;
      const currentPos = new THREE.Vector3(positions[idx], positions[idx + 1], positions[idx + 2]);
      const clamped = hourglass.clampPosition(currentPos, particleRadius);

      if (!clamped.equals(currentPos)) {
        const bounceFactor = 0.35;
        const normal = new THREE.Vector3().subVectors(currentPos, clamped).normalize();
        const vel = new THREE.Vector3(velocities[idx], velocities[idx + 1], velocities[idx + 2]);
        const dot = vel.dot(normal);
        if (dot < 0) {
          vel.sub(normal.multiplyScalar(dot * (1 + bounceFactor)));
          velocities[idx] = vel.x;
          velocities[idx + 1] = vel.y;
          velocities[idx + 2] = vel.z;
        }
      }

      positions[idx] = clamped.x;
      positions[idx + 1] = clamped.y;
      positions[idx + 2] = clamped.z;

      if (magnetInfluence > 0) {
        const baseR = baseColors[idx];
        const baseG = baseColors[idx + 1];
        const baseB = baseColors[idx + 2];
        const mixColor = magnetInfluence > 0.5 ? redColor : orangeColor;
        const t = magnetInfluence;
        colors[idx] = baseR + (mixColor.r - baseR) * t;
        colors[idx + 1] = baseG + (mixColor.g - baseG) * t;
        colors[idx + 2] = baseB + (mixColor.b - baseB) * t;
      } else {
        colors[idx] = baseColors[idx];
        colors[idx + 1] = baseColors[idx + 1];
        colors[idx + 2] = baseColors[idx + 2];
      }
    }

    this.handleParticleCollisions(dt);
    this.updateInstanceAttributes();
  }

  private handleParticleCollisions(dt: number): void {
    const { count, positions, velocities, radii } = this.data;
    const cellSize = 0.3;
    const grid: Map<string, number[]> = new Map();

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const cx = Math.floor(positions[idx] / cellSize);
      const cy = Math.floor(positions[idx + 1] / cellSize);
      const cz = Math.floor(positions[idx + 2] / cellSize);
      const key = `${cx},${cy},${cz}`;
      if (!grid.has(key)) grid.set(key, []);
      grid.get(key)!.push(i);
    }

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const px = positions[idx];
      const py = positions[idx + 1];
      const pz = positions[idx + 2];
      const r1 = radii[i] * this.baseSizeMultiplier;

      const cx = Math.floor(px / cellSize);
      const cy = Math.floor(py / cellSize);
      const cz = Math.floor(pz / cellSize);

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const key = `${cx + dx},${cy + dy},${cz + dz}`;
            const cell = grid.get(key);
            if (!cell) continue;

            for (const j of cell) {
              if (j <= i) continue;
              const jdx = j * 3;
              const qx = positions[jdx];
              const qy = positions[jdx + 1];
              const qz = positions[jdx + 2];
              const r2 = radii[j] * this.baseSizeMultiplier;

              const diffx = px - qx;
              const diffy = py - qy;
              const diffz = pz - qz;
              const distSq = diffx * diffx + diffy * diffy + diffz * diffz;
              const minDist = r1 + r2;

              if (distSq < minDist * minDist && distSq > 0.00001) {
                const dist = Math.sqrt(distSq);
                const overlap = (minDist - dist) * 0.5;
                const nx = diffx / dist;
                const ny = diffy / dist;
                const nz = diffz / dist;

                positions[idx] += nx * overlap;
                positions[idx + 1] += ny * overlap;
                positions[idx + 2] += nz * overlap;
                positions[jdx] -= nx * overlap;
                positions[jdx + 1] -= ny * overlap;
                positions[jdx + 2] -= nz * overlap;

                const v1x = velocities[idx];
                const v1y = velocities[idx + 1];
                const v1z = velocities[idx + 2];
                const v2x = velocities[jdx];
                const v2y = velocities[jdx + 1];
                const v2z = velocities[jdx + 2];

                const relVx = v1x - v2x;
                const relVy = v1y - v2y;
                const relVz = v1z - v2z;
                const velAlongNormal = relVx * nx + relVy * ny + relVz * nz;

                if (velAlongNormal > 0) continue;

                const restitution = 0.3;
                const impulse = -(1 + restitution) * velAlongNormal / 2;

                velocities[idx] += impulse * nx;
                velocities[idx + 1] += impulse * ny;
                velocities[idx + 2] += impulse * nz;
                velocities[jdx] -= impulse * nx;
                velocities[jdx + 1] -= impulse * ny;
                velocities[jdx + 2] -= impulse * nz;
              }
            }
          }
        }
      }
    }
  }

  public setParticleSizeMultiplier(multiplier: number): void {
    this.baseSizeMultiplier = multiplier;
  }
}
