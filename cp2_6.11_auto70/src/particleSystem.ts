import * as THREE from 'three';
import type { ColorTheme } from './terrainGenerator';

interface ParticleData {
  basePosition: THREE.Vector3;
  velocity: THREE.Vector3;
  phase: number;
  speed: number;
}

export class ParticleSystem {
  private scene: THREE.Scene;
  private points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private particleCount: number;
  private particles: ParticleData[] = [];
  private mouse: THREE.Vector2 = new THREE.Vector2(0, 0);
  private mouseWorld: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private mouseActive: boolean = false;
  private theme: ColorTheme = 'default';
  private terrainSize: number = 20;
  private camera: THREE.Camera;

  private static themeColors: Record<ColorTheme, { low: number; mid: number; high: number }> = {
    default: { low: 0xff3333, mid: 0x33ff33, high: 0x3366ff },
    neon: { low: 0xff00ff, mid: 0x00ffff, high: 0xffff00 },
    ice: { low: 0x66ccff, mid: 0x99eeee, high: 0xffffff },
    lava: { low: 0x990000, mid: 0xff6600, high: 0xffcc00 }
  };

  constructor(scene: THREE.Scene, camera: THREE.Camera, count: number = 300) {
    this.scene = scene;
    this.camera = camera;
    this.particleCount = count;

    this.geometry = new THREE.BufferGeometry();
    this.initParticles();

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, material);
    this.scene.add(this.points);
  }

  private initParticles(): void {
    const positions = new Float32Array(this.particleCount * 3);
    const colors = new Float32Array(this.particleCount * 3);
    this.particles = [];

    const themeColors = ParticleSystem.themeColors[this.theme];
    const colorArray = [
      new THREE.Color(themeColors.low),
      new THREE.Color(themeColors.mid),
      new THREE.Color(themeColors.high)
    ];

    for (let i = 0; i < this.particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * this.terrainSize * 0.5;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = 1 + Math.random() * 4;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const colorIndex = Math.floor(Math.random() * 3);
      const color = colorArray[colorIndex];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      this.particles.push({
        basePosition: new THREE.Vector3(x, y, z),
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01,
          (Math.random() - 0.5) * 0.01
        ),
        phase: Math.random() * Math.PI * 2,
        speed: 0.5 + Math.random() * 0.5
      });
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  }

  update(volume: number, frequencyData: Uint8Array, time: number): void {
    const positions = this.geometry.attributes.position.array as Float32Array;
    const colors = this.geometry.attributes.color.array as Float32Array;

    const themeColors = ParticleSystem.themeColors[this.theme];
    const lowColor = new THREE.Color(themeColors.low);
    const midColor = new THREE.Color(themeColors.mid);
    const highColor = new THREE.Color(themeColors.high);

    for (let i = 0; i < this.particleCount; i++) {
      const p = this.particles[i];
      const idx = i * 3;

      const floatY = Math.sin(time * p.speed + p.phase) * 0.3;
      const audioY = volume * 2 * p.speed;

      let targetX = p.basePosition.x;
      let targetY = p.basePosition.y + floatY + audioY;
      let targetZ = p.basePosition.z;

      if (this.mouseActive) {
        const dx = this.mouseWorld.x - p.basePosition.x;
        const dy = this.mouseWorld.y - p.basePosition.y;
        const dz = this.mouseWorld.z - p.basePosition.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < 8) {
          const force = (1 - dist / 8) * volume * 3;

          const perpX = -dz;
          const perpZ = dx;
          const perpLen = Math.sqrt(perpX * perpX + perpZ * perpZ) || 1;

          targetX += (perpX / perpLen) * force * 2;
          targetZ += (perpZ / perpLen) * force * 2;
          targetY += force * 0.5;

          targetX += dx * 0.1 * force;
          targetZ += dz * 0.1 * force;
        }
      }

      const currentX = positions[idx];
      const currentY = positions[idx + 1];
      const currentZ = positions[idx + 2];

      positions[idx] = currentX + (targetX - currentX) * 0.05;
      positions[idx + 1] = currentY + (targetY - currentY) * 0.05;
      positions[idx + 2] = currentZ + (targetZ - currentZ) * 0.05;

      const yRatio = Math.min(Math.max((positions[idx + 1] - 1) / 4, 0), 1);
      let r: number, g: number, b: number;

      if (yRatio < 0.5) {
        const t = yRatio * 2;
        r = lowColor.r + (midColor.r - lowColor.r) * t;
        g = lowColor.g + (midColor.g - lowColor.g) * t;
        b = lowColor.b + (midColor.b - lowColor.b) * t;
      } else {
        const t = (yRatio - 0.5) * 2;
        r = midColor.r + (highColor.r - midColor.r) * t;
        g = midColor.g + (highColor.g - midColor.g) * t;
        b = midColor.b + (highColor.b - midColor.b) * t;
      }

      const brightness = 0.6 + volume * 0.4;
      colors[idx] = r * brightness;
      colors[idx + 1] = g * brightness;
      colors[idx + 2] = b * brightness;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
  }

  setMousePosition(clientX: number, clientY: number, containerRect: DOMRect): void {
    const x = ((clientX - containerRect.left) / containerRect.width) * 2 - 1;
    const y = -((clientY - containerRect.top) / containerRect.height) * 2 + 1;

    this.mouse.set(x, y);

    const vector = new THREE.Vector3(x, y, 0.5);
    vector.unproject(this.camera);
    const dir = vector.sub(this.camera.position).normalize();
    const distance = (2 - this.camera.position.y) / dir.y;
    this.mouseWorld.copy(this.camera.position).add(dir.multiplyScalar(distance));
  }

  setMouseActive(active: boolean): void {
    this.mouseActive = active;
  }

  setCount(count: number): void {
    if (count === this.particleCount) return;

    this.particleCount = Math.max(100, Math.min(500, Math.floor(count)));
    this.scene.remove(this.points);
    this.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
    this.initParticles();

    const material = new THREE.PointsMaterial({
      size: 0.08,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.points = new THREE.Points(this.geometry, material);
    this.scene.add(this.points);
  }

  setColorTheme(theme: ColorTheme): void {
    this.theme = theme;

    const colors = this.geometry.attributes.color.array as Float32Array;
    const themeColors = ParticleSystem.themeColors[theme];
    const colorArray = [
      new THREE.Color(themeColors.low),
      new THREE.Color(themeColors.mid),
      new THREE.Color(themeColors.high)
    ];

    for (let i = 0; i < this.particleCount; i++) {
      const colorIndex = Math.floor(Math.random() * 3);
      const color = colorArray[colorIndex];
      const idx = i * 3;
      colors[idx] = color.r;
      colors[idx + 1] = color.g;
      colors[idx + 2] = color.b;
    }

    this.geometry.attributes.color.needsUpdate = true;
  }

  getPoints(): THREE.Points {
    return this.points;
  }
}
