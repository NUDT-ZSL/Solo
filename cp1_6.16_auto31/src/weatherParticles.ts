import * as THREE from 'three';

export class WeatherParticles {
  private scene: THREE.Scene;
  private particles!: THREE.Points;
  private particleCount: number = 500;
  private positions!: Float32Array;
  private velocities!: Float32Array;
  private phases!: Float32Array;
  private isNight: boolean = false;
  private _enabled: boolean = true;

  private dayColor = new THREE.Color(0xffffff);
  private nightColor = new THREE.Color(0xfff4e6);
  private currentColor = new THREE.Color(0xffffff);

  private bounds = {
    minX: -100,
    maxX: 100,
    minZ: -100,
    maxZ: 100,
    minY: -10,
    maxY: 120,
  };

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.init();
  }

  private init(): void {
    const geometry = new THREE.BufferGeometry();

    this.positions = new Float32Array(this.particleCount * 3);
    this.velocities = new Float32Array(this.particleCount * 3);
    this.phases = new Float32Array(this.particleCount);
    const sizes = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      this.resetParticle(i);
      sizes[i] = 0.5 + Math.random() * 1.5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 1,
      map: texture,
      transparent: true,
      opacity: 0.3,
      color: this.currentColor,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    this.particles = new THREE.Points(geometry, material);
    this.particles.frustumCulled = false;
    this.scene.add(this.particles);
  }

  private resetParticle(index: number): void {
    const i3 = index * 3;

    this.positions[i3] = this.bounds.minX + Math.random() * (this.bounds.maxX - this.bounds.minX);
    this.positions[i3 + 1] = this.bounds.maxY - Math.random() * 20;
    this.positions[i3 + 2] = this.bounds.minZ + Math.random() * (this.bounds.maxZ - this.bounds.minZ);

    this.velocities[i3] = (Math.random() - 0.5) * 0.1;
    this.velocities[i3 + 1] = -(0.2 + Math.random() * 0.3);
    this.velocities[i3 + 2] = (Math.random() - 0.5) * 0.1;

    this.phases[index] = Math.random() * Math.PI * 2;
  }

  public update(delta: number): void {
    if (!this._enabled) return;

    const targetOpacity = this.isNight ? 0.7 : 0.3;
    const material = this.particles.material as THREE.PointsMaterial;
    material.opacity += (targetOpacity - material.opacity) * 0.02;

    const targetColor = this.isNight ? this.nightColor : this.dayColor;
    this.currentColor.lerp(targetColor, 0.02);
    material.color.copy(this.currentColor);

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      this.phases[i] += delta * 0.5;

      const swayX = Math.sin(this.phases[i]) * 0.03;
      const swayZ = Math.cos(this.phases[i] * 0.7) * 0.02;

      this.positions[i3] += (this.velocities[i3] + swayX) * delta * 10;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * delta * 10;
      this.positions[i3 + 2] += (this.velocities[i3 + 2] + swayZ) * delta * 10;

      if (this.positions[i3 + 1] < this.bounds.minY) {
        this.resetParticle(i);
      }

      if (this.positions[i3] < this.bounds.minX) {
        this.positions[i3] = this.bounds.maxX;
      } else if (this.positions[i3] > this.bounds.maxX) {
        this.positions[i3] = this.bounds.minX;
      }

      if (this.positions[i3 + 2] < this.bounds.minZ) {
        this.positions[i3 + 2] = this.bounds.maxZ;
      } else if (this.positions[i3 + 2] > this.bounds.maxZ) {
        this.positions[i3 + 2] = this.bounds.minZ;
      }
    }

    this.particles.geometry.attributes.position.needsUpdate = true;
  }

  public setNight(value: boolean): void {
    this.isNight = value;
  }

  public setEnabled(value: boolean): void {
    this._enabled = value;
    this.particles.visible = value;
  }

  public get enabled(): boolean {
    return this._enabled;
  }

  public toggle(): boolean {
    this.setEnabled(!this._enabled);
    return this._enabled;
  }

  public dispose(): void {
    if (this.particles) {
      this.particles.geometry.dispose();
      if (this.particles.material instanceof THREE.Material) {
        const mat = this.particles.material as THREE.PointsMaterial;
        if (mat.map) mat.map.dispose();
        mat.dispose();
      }
      this.scene.remove(this.particles);
    }
  }
}
