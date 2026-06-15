import * as THREE from 'three';

export interface NebulaConfig {
  particleCount: number;
  colorStops: { position: number; color: THREE.ColorRepresentation }[];
  driftSpeed: number;
}

interface ParticleData {
  basePosition: THREE.Vector3;
  driftOffset: THREE.Vector3;
  driftVelocity: THREE.Vector3;
  driftPhase: THREE.Vector3;
}

export class Nebula {
  public points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.PointsMaterial;
  private config: NebulaConfig;
  private particleData: ParticleData[] = [];
  private time: number = 0;
  private rotationY: number = 0;
  private rotationSpeed: number = 0.002;
  private driftAmplitude: number = 0.3;

  constructor(config: NebulaConfig) {
    this.config = config;
    this.geometry = new THREE.BufferGeometry();
    this.material = this.createMaterial();
    this.createParticles();
    this.points = new THREE.Points(this.geometry, this.material);
  }

  private createMaterial(): THREE.PointsMaterial {
    return new THREE.PointsMaterial({
      size: 0.125,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
  }

  private createParticles(): void {
    const count = this.config.particleCount;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const purple = new THREE.Color(0x9B59B6);
    const blue = new THREE.Color(0x3498DB);
    const pink = new THREE.Color(0xE91E63);

    const arms = 4;
    const armSpread = 0.6;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      const radius = 0.5 + Math.pow(Math.random(), 0.5) * 7.5;
      const armIndex = Math.floor(Math.random() * arms);
      const armAngle = (armIndex / arms) * Math.PI * 2;
      const spiralAngle = radius * 0.8;
      const spread = (1 - radius / 8) * armSpread + 0.1;
      const randomAngle = (Math.random() - 0.5) * spread;

      const angle = armAngle + spiralAngle + randomAngle;

      const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 0.4;
      const z = Math.sin(angle) * radius + (Math.random() - 0.5) * 0.4;
      const y = (Math.random() - 0.5) * 1.2 * (1 - radius / 10) + (Math.random() - 0.5) * 0.3;

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      const particleAngle = Math.atan2(z, x);
      const color = this.interpolateColorByAngle(particleAngle, purple, blue, pink);
      colors[i3] = color.r;
      colors[i3 + 1] = color.g;
      colors[i3 + 2] = color.b;

      sizes[i] = 0.05 + Math.random() * 0.15;

      this.particleData.push({
        basePosition: new THREE.Vector3(x, y, z),
        driftOffset: new THREE.Vector3(
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3,
          (Math.random() - 0.5) * 0.3
        ),
        driftVelocity: new THREE.Vector3(
          0.005 + Math.random() * 0.015,
          0.005 + Math.random() * 0.015,
          0.005 + Math.random() * 0.015
        ),
        driftPhase: new THREE.Vector3(
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2,
          Math.random() * Math.PI * 2
        )
      });
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  }

  private interpolateColorByAngle(
    angle: number,
    purple: THREE.Color,
    blue: THREE.Color,
    pink: THREE.Color
  ): THREE.Color {
    const normalizedAngle = angle / Math.PI;
    const transitionWidth = 0.3;

    let result = new THREE.Color();

    if (normalizedAngle < -transitionWidth) {
      result.copy(purple);
    } else if (normalizedAngle < 0) {
      const t = (normalizedAngle + transitionWidth) / transitionWidth;
      const smoothT = t * t * (3 - 2 * t);
      result.copy(purple).lerp(blue, smoothT);
    } else if (normalizedAngle < transitionWidth) {
      const t = normalizedAngle / transitionWidth;
      const smoothT = t * t * (3 - 2 * t);
      result.copy(blue).lerp(pink, smoothT);
    } else {
      result.copy(pink);
    }

    return result;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;
    this.rotationY += this.rotationSpeed * deltaTime * 60;
    this.points.rotation.y = this.rotationY;

    const positions = this.geometry.attributes.position.array as Float32Array;
    const count = this.config.particleCount;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const data = this.particleData[i];
      const amp = this.driftAmplitude;

      const dx = Math.sin(this.time * data.driftVelocity.x + data.driftPhase.x) * amp;
      const dy = Math.sin(this.time * data.driftVelocity.y + data.driftPhase.y) * amp * 0.7;
      const dz = Math.cos(this.time * data.driftVelocity.z + data.driftPhase.z) * amp;

      positions[i3] = data.basePosition.x + dx;
      positions[i3 + 1] = data.basePosition.y + dy;
      positions[i3 + 2] = data.basePosition.z + dz;
    }

    this.geometry.attributes.position.needsUpdate = true;
  }

  public setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed;
  }

  public setDriftAmplitude(amplitude: number): void {
    this.driftAmplitude = amplitude;
  }

  public setSizeScale(scale: number): void {
    this.material.size = 0.125 * scale;
  }

  public getRotationDegrees(): number {
    const degrees = (this.rotationY * 180) / Math.PI;
    return ((degrees % 360) + 360) % 360;
  }

  public getParticleCount(): number {
    return this.config.particleCount;
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
  }
}
