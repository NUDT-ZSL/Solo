import * as THREE from 'three';
import type { FrequencyBands } from './audioAnalyzer';

interface ParticleData {
  baseRadius: number;
  baseTheta: number;
  basePhi: number;
  speedOffset: number;
  scaleOffset: number;
  zOffset: number;
  phaseOffset: number;
}

export interface ParticleSystemOptions {
  count?: number;
  radius?: number;
}

export class ParticleSystem {
  public points: THREE.Points;
  public glowSprites: THREE.Group;
  public geometry: THREE.BufferGeometry;
  public material: THREE.PointsMaterial;
  private particleData: ParticleData[] = [];
  private count: number;
  private radius: number;
  private opacity: number = 0.8;
  private paused: boolean = false;
  private fadeTarget: number = 1.0;
  private fadeSpeed: number = 1.0;
  private spriteTexture: THREE.Texture;
  private glowTexture: THREE.Texture;

  constructor(options: ParticleSystemOptions = {}) {
    this.count = options.count ?? 3000;
    this.count = Math.max(2000, Math.min(5000, this.count));
    this.radius = options.radius ?? 20;

    this.spriteTexture = this.createCircleTexture();
    this.glowTexture = this.createGlowTexture();

    this.geometry = new THREE.BufferGeometry();
    this.initGeometry();

    this.material = new THREE.PointsMaterial({
      size: 4,
      sizeAttenuation: true,
      transparent: true,
      opacity: this.opacity,
      vertexColors: true,
      map: this.spriteTexture,
      alphaTest: 0.01,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.glowSprites = new THREE.Group();
    this.initGlowSprites();
  }

  private createCircleTexture(): THREE.Texture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.9)');
    gradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.15)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createGlowTexture(): THREE.Texture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)');
    gradient.addColorStop(0.4, 'rgba(0, 212, 255, 0.04)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private initGlowSprites(): void {
    const glowCount = 5;
    for (let i = 0; i < glowCount; i++) {
      const material = new THREE.SpriteMaterial({
        map: this.glowTexture,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      const sprite = new THREE.Sprite(material);
      const scale = 30 + i * 8;
      sprite.scale.set(scale, scale, scale);
      sprite.position.set(0, 0, -i * 2);
      this.glowSprites.add(sprite);
    }
  }

  private initGeometry(): void {
    const positions = new Float32Array(this.count * 3);
    const colors = new Float32Array(this.count * 3);
    const sizes = new Float32Array(this.count);

    this.particleData = [];
    const color = new THREE.Color();

    for (let i = 0; i < this.count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = this.radius * (0.6 + Math.random() * 0.4);

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.sin(phi) * Math.sin(theta);
      const z = r * Math.cos(phi);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      color.setHSL(0.65, 0.9, 0.6);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = 2 + Math.random() * 4;

      this.particleData.push({
        baseRadius: r,
        baseTheta: theta,
        basePhi: phi,
        speedOffset: 0.8 + Math.random() * 0.4,
        scaleOffset: 0.8 + Math.random() * 0.4,
        zOffset: Math.random() * Math.PI * 2,
        phaseOffset: Math.random() * Math.PI * 2
      });
    }

    this.geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  }

  public update(deltaTime: number, elapsedTime: number, bands: FrequencyBands): void {
    this.updateFade(deltaTime);

    if (this.paused) return;

    const positions = this.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colors = this.geometry.getAttribute('color') as THREE.BufferAttribute;
    const sizes = this.geometry.getAttribute('size') as THREE.BufferAttribute;

    const posArr = positions.array as Float32Array;
    const colArr = colors.array as Float32Array;
    const sizeArr = sizes.array as Float32Array;

    const rotationSpeed = THREE.MathUtils.lerp(0.1, 2.0, bands.low);
    const scaleAmount = THREE.MathUtils.lerp(0.3, 1.5, bands.mid);
    const zAmplitude = THREE.MathUtils.lerp(1, 10, bands.high);

    const color = new THREE.Color();

    for (let i = 0; i < this.count; i++) {
      const data = this.particleData[i];

      const speed = rotationSpeed * data.speedOffset;
      const theta = data.baseTheta + elapsedTime * speed;
      const phi = data.basePhi;

      const scale = scaleAmount * data.scaleOffset;
      const r = data.baseRadius * scale;

      const zWave = Math.sin(elapsedTime * 2 + data.zOffset) * zAmplitude * (0.8 + data.scaleOffset * 0.4);

      let x = r * Math.sin(phi) * Math.cos(theta);
      let y = r * Math.sin(phi) * Math.sin(theta);
      let z = r * Math.cos(phi) + zWave;

      const wobbleX = Math.sin(elapsedTime * 1.5 + data.phaseOffset) * 0.3 * bands.mid;
      const wobbleY = Math.cos(elapsedTime * 1.7 + data.phaseOffset) * 0.3 * bands.mid;
      x += wobbleX;
      y += wobbleY;

      posArr[i * 3] = x;
      posArr[i * 3 + 1] = y;
      posArr[i * 3 + 2] = z;

      let hue: number;
      let saturation: number;
      let lightness: number;

      if (bands.high < 0.33) {
        hue = THREE.MathUtils.lerp(200, 240, bands.high / 0.33) / 360;
        saturation = 0.9;
        lightness = 0.45 + bands.high * 0.3;
      } else if (bands.high < 0.66) {
        const t = (bands.high - 0.33) / 0.33;
        hue = THREE.MathUtils.lerp(280, 20, t) / 360;
        if (hue < 0) hue += 1;
        saturation = 0.95;
        lightness = 0.5 + t * 0.1;
      } else {
        const t = (bands.high - 0.66) / 0.34;
        hue = THREE.MathUtils.lerp(20, 0, t) / 360;
        saturation = THREE.MathUtils.lerp(1.0, 0.0, t);
        lightness = THREE.MathUtils.lerp(0.6, 0.95, t);
      }

      color.setHSL(hue, saturation, lightness);
      colArr[i * 3] = color.r;
      colArr[i * 3 + 1] = color.g;
      colArr[i * 3 + 2] = color.b;

      const baseSize = 2 + Math.random() * 0.01;
      sizeArr[i] = (2.5 + bands.high * 3.5) * (0.8 + data.scaleOffset * 0.4);
      void baseSize;
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    sizes.needsUpdate = true;

    this.updateGlowSprites(bands);
  }

  private updateGlowSprites(bands: FrequencyBands): void {
    const intensity = (bands.low + bands.mid + bands.high) / 3;
    this.glowSprites.children.forEach((sprite, i) => {
      const mat = (sprite as THREE.Sprite).material as THREE.SpriteMaterial;
      mat.opacity = 0.3 + intensity * 0.5;
      const baseScale = 30 + i * 8;
      const scale = baseScale * (1 + intensity * 0.3);
      sprite.scale.set(scale, scale, scale);
    });
  }

  private updateFade(deltaTime: number): void {
    if (this.material.opacity !== this.fadeTarget) {
      const diff = this.fadeTarget - this.material.opacity;
      const step = this.fadeSpeed * deltaTime;

      if (Math.abs(diff) <= step) {
        this.material.opacity = this.fadeTarget;
      } else {
        this.material.opacity += Math.sign(diff) * step;
      }
    }
  }

  public setOpacity(opacity: number): void {
    this.opacity = THREE.MathUtils.clamp(opacity, 0.2, 1.0);
    this.fadeTarget = this.opacity;
  }

  public getOpacity(): number {
    return this.opacity;
  }

  public fadeOut(duration: number = 1.0): void {
    this.fadeTarget = 0;
    this.fadeSpeed = 1.0 / duration;
  }

  public fadeIn(duration: number = 1.0): void {
    this.fadeTarget = this.opacity;
    this.fadeSpeed = 1.0 / duration;
  }

  public isFadedOut(): boolean {
    return this.material.opacity <= 0.001;
  }

  public togglePause(): void {
    this.paused = !this.paused;
  }

  public isPaused(): boolean {
    return this.paused;
  }

  public addToScene(scene: THREE.Scene): void {
    scene.add(this.points);
    scene.add(this.glowSprites);
  }

  public removeFromScene(scene: THREE.Scene): void {
    scene.remove(this.points);
    scene.remove(this.glowSprites);
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.spriteTexture.dispose();
    this.glowTexture.dispose();

    this.glowSprites.children.forEach((sprite) => {
      const mat = (sprite as THREE.Sprite).material as THREE.SpriteMaterial;
      mat.dispose();
    });
  }
}
