import * as THREE from 'three';
import {
  ColorTheme,
  colorThemes,
  getGradientColor,
  randomRange,
  generateNebulaPosition,
  smoothDamp
} from './utils';

interface TempParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: THREE.Color;
}

export class ParticleSystem {
  public points: THREE.Points;
  public geometry: THREE.BufferGeometry;
  public material: THREE.PointsMaterial;
  public starField: THREE.Points;

  private particleCount: number;
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private velocities: Float32Array;
  private originalPositions: Float32Array;
  private baseSizes: Float32Array;
  private speedFactors: Float32Array;

  private currentThemeIndex: number = 0;
  private targetThemeIndex: number = 0;
  private themeTransitionProgress: number = 1;
  private themeTransitionDuration: number = 0.5;

  public rotationSpeed: number = 1.0;
  public sizeMin: number = 0.1;
  public sizeMax: number = 0.5;
  public breathingPhase: number = 0;

  private tempParticles: TempParticle[] = [];
  private tempGeometry: THREE.BufferGeometry;
  private tempMaterial: THREE.PointsMaterial;
  public tempPoints: THREE.Points;

  private visibleRatio: number = 1.0;
  private targetVisibleRatio: number = 1.0;

  constructor(particleCount: number = 50000) {
    this.particleCount = particleCount;
    this.geometry = new THREE.BufferGeometry();
    this.allocateBuffers(particleCount);

    const glowTexture = this.createGlowTexture();

    this.material = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
      map: glowTexture,
      alphaTest: 0.01
    });

    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;

    this.createStarField();
    this.createTempParticlesSystem();
    this.initParticles();
  }

  private createGlowTexture(): THREE.Texture {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private allocateBuffers(count: number): void {
    this.positions = new Float32Array(count * 3);
    this.colors = new Float32Array(count * 3);
    this.sizes = new Float32Array(count);
    this.velocities = new Float32Array(count * 3);
    this.originalPositions = new Float32Array(count * 3);
    this.baseSizes = new Float32Array(count);
    this.speedFactors = new Float32Array(count);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));

    this.geometry.setDrawRange(0, Math.floor(count * this.visibleRatio));
  }

  private createStarField(): void {
    const starCount = 2000;
    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(starCount * 3);
    const starColors = new Float32Array(starCount * 3);
    const starSizes = new Float32Array(starCount);

    for (let i = 0; i < starCount; i++) {
      const radius = randomRange(100, 300);
      const theta = randomRange(0, Math.PI * 2);
      const phi = Math.acos(randomRange(-1, 1));

      starPositions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      starPositions[i * 3 + 2] = radius * Math.cos(phi);

      const brightness = randomRange(0.3, 1);
      starColors[i * 3] = brightness;
      starColors[i * 3 + 1] = brightness;
      starColors[i * 3 + 2] = brightness * randomRange(0.8, 1.2);
      starSizes[i] = randomRange(0.5, 2);
    }

    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    starGeometry.setAttribute('size', new THREE.BufferAttribute(starSizes, 1));

    const starTexture = this.createGlowTexture();
    const starMaterial = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: starTexture,
      alphaTest: 0.01
    });

    this.starField = new THREE.Points(starGeometry, starMaterial);
    this.starField.frustumCulled = false;
  }

  private createTempParticlesSystem(): void {
    const maxTempParticles = 1000;
    this.tempGeometry = new THREE.BufferGeometry();
    const tempPositions = new Float32Array(maxTempParticles * 3);
    const tempColors = new Float32Array(maxTempParticles * 3);
    const tempSizes = new Float32Array(maxTempParticles);

    this.tempGeometry.setAttribute('position', new THREE.BufferAttribute(tempPositions, 3));
    this.tempGeometry.setAttribute('color', new THREE.BufferAttribute(tempColors, 3));
    this.tempGeometry.setAttribute('size', new THREE.BufferAttribute(tempSizes, 1));
    this.tempGeometry.setDrawRange(0, 0);

    const tempTexture = this.createGlowTexture();
    this.tempMaterial = new THREE.PointsMaterial({
      size: 1,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: tempTexture,
      alphaTest: 0.01
    });

    this.tempPoints = new THREE.Points(this.tempGeometry, this.tempMaterial);
    this.tempPoints.frustumCulled = false;
  }

  private initParticles(): void {
    const theme = colorThemes[this.currentThemeIndex];

    for (let i = 0; i < this.particleCount; i++) {
      const pos = generateNebulaPosition(i, this.particleCount);
      this.positions[i * 3] = pos.x;
      this.positions[i * 3 + 1] = pos.y;
      this.positions[i * 3 + 2] = pos.z;

      this.originalPositions[i * 3] = pos.x;
      this.originalPositions[i * 3 + 1] = pos.y;
      this.originalPositions[i * 3 + 2] = pos.z;

      this.velocities[i * 3] = randomRange(-0.02, 0.02);
      this.velocities[i * 3 + 1] = randomRange(-0.01, 0.01);
      this.velocities[i * 3 + 2] = randomRange(-0.02, 0.02);

      this.speedFactors[i] = randomRange(0, 1);

      const radius = pos.length();
      const t = Math.min(1, radius / 50);
      const color = getGradientColor(t, theme);
      this.colors[i * 3] = color.r;
      this.colors[i * 3 + 1] = color.g;
      this.colors[i * 3 + 2] = color.b;

      const size = randomRange(this.sizeMin, this.sizeMax);
      this.sizes[i] = size;
      this.baseSizes[i] = size;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
  }

  public setParticleCount(count: number): void {
    if (count === this.particleCount) return;
    this.particleCount = count;
    this.allocateBuffers(count);
    this.initParticles();
  }

  public getParticleCount(): number {
    return this.particleCount;
  }

  public setTheme(index: number): void {
    if (index === this.targetThemeIndex) return;
    this.targetThemeIndex = index;
    this.themeTransitionProgress = 0;
  }

  public getCurrentTheme(): number {
    return this.currentThemeIndex;
  }

  public setSizeRange(min: number, max: number): void {
    this.sizeMin = min;
    this.sizeMax = max;
    for (let i = 0; i < this.particleCount; i++) {
      this.baseSizes[i] = randomRange(min, max);
    }
  }

  public setVisibleRatio(ratio: number): void {
    this.targetVisibleRatio = Math.max(0.3, Math.min(1, ratio));
  }

  public getVisibleRatio(): number {
    return this.targetVisibleRatio;
  }

  public burst(worldPosition: THREE.Vector3): void {
    const theme = colorThemes[this.currentThemeIndex];
    for (let i = 0; i < 100; i++) {
      const theta = randomRange(0, Math.PI * 2);
      const phi = Math.acos(randomRange(-1, 1));
      const speed = randomRange(0.3, 1.5);

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.sin(phi) * Math.sin(theta) * speed,
        Math.cos(phi) * speed
      );

      const t = randomRange(0, 1);
      const color = getGradientColor(t, theme);

      this.tempParticles.push({
        position: worldPosition.clone(),
        velocity,
        life: 2.0,
        maxLife: 2.0,
        size: randomRange(0.3, 1.0),
        color
      });
    }
  }

  public getParticleInfoAt(
    screenX: number,
    screenY: number,
    camera: THREE.Camera,
    width: number,
    height: number
  ): { position: THREE.Vector3; color: THREE.Color; velocity: THREE.Vector3 } | null {
    const ndc = new THREE.Vector2(
      (screenX / width) * 2 - 1,
      -(screenY / height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, camera);
    raycaster.params.Points = { threshold: 2 };

    const intersects = raycaster.intersectObject(this.points);
    if (intersects.length > 0 && intersects[0].index !== undefined) {
      const idx = intersects[0].index;
      const position = new THREE.Vector3(
        this.positions[idx * 3],
        this.positions[idx * 3 + 1],
        this.positions[idx * 3 + 2]
      );
      const color = new THREE.Color(
        this.colors[idx * 3],
        this.colors[idx * 3 + 1],
        this.colors[idx * 3 + 2]
      );
      const velocity = new THREE.Vector3(
        this.velocities[idx * 3],
        this.velocities[idx * 3 + 1],
        this.velocities[idx * 3 + 2]
      );
      return { position, color, velocity };
    }
    return null;
  }

  public update(deltaTime: number, elapsedTime: number): void {
    this.breathingPhase += deltaTime * 0.5;
    const breathing = Math.sin(this.breathingPhase) * 0.15 + 1;
    const brightnessBreathing = Math.sin(this.breathingPhase * 1.2) * 0.2 + 0.8;

    if (this.themeTransitionProgress < 1) {
      this.themeTransitionProgress = Math.min(
        1,
        this.themeTransitionProgress + deltaTime / this.themeTransitionDuration
      );
    }

    this.visibleRatio = smoothDamp(this.visibleRatio, this.targetVisibleRatio, 0.3, deltaTime);
    this.geometry.setDrawRange(0, Math.floor(this.particleCount * this.visibleRatio));

    const currentTheme = colorThemes[this.currentThemeIndex];
    const targetTheme = colorThemes[this.targetThemeIndex];
    const lerpT = this.themeTransitionProgress;

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;

      const ox = this.originalPositions[idx];
      const oy = this.originalPositions[idx + 1];
      const oz = this.originalPositions[idx + 2];

      const angle = elapsedTime * 0.1 * this.rotationSpeed;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const rx = ox * cosA - oz * sinA;
      const rz = ox * sinA + oz * cosA;

      this.velocities[idx] += randomRange(-0.001, 0.001);
      this.velocities[idx + 1] += randomRange(-0.0005, 0.0005);
      this.velocities[idx + 2] += randomRange(-0.001, 0.001);
      this.velocities[idx] *= 0.98;
      this.velocities[idx + 1] *= 0.98;
      this.velocities[idx + 2] *= 0.98;

      this.positions[idx] = rx + this.velocities[idx] * 10;
      this.positions[idx + 1] = oy + this.velocities[idx + 1] * 10;
      this.positions[idx + 2] = rz + this.velocities[idx + 2] * 10;

      this.sizes[i] = this.baseSizes[i] * breathing;

      const velMag = Math.sqrt(
        this.velocities[idx] * this.velocities[idx] +
        this.velocities[idx + 1] * this.velocities[idx + 1] +
        this.velocities[idx + 2] * this.velocities[idx + 2]
      );
      this.speedFactors[i] += (velMag * 50 - this.speedFactors[i]) * deltaTime * 2;
      this.speedFactors[i] = Math.max(0, Math.min(1, this.speedFactors[i]));

      const posVecX = this.positions[idx];
      const posVecY = this.positions[idx + 1];
      const posVecZ = this.positions[idx + 2];
      const radius = Math.sqrt(posVecX * posVecX + posVecY * posVecY + posVecZ * posVecZ);
      const posT = Math.min(1, radius / 50);
      const t = Math.min(1, (posT * 0.6 + this.speedFactors[i] * 0.4));

      const colorCurrent = getGradientColor(t, currentTheme);
      const colorTarget = getGradientColor(t, targetTheme);

      const r = colorCurrent.r + (colorTarget.r - colorCurrent.r) * lerpT;
      const g = colorCurrent.g + (colorTarget.g - colorCurrent.g) * lerpT;
      const b = colorCurrent.b + (colorTarget.b - colorCurrent.b) * lerpT;

      this.colors[idx] = Math.min(1, r * brightnessBreathing);
      this.colors[idx + 1] = Math.min(1, g * brightnessBreathing);
      this.colors[idx + 2] = Math.min(1, b * brightnessBreathing);
    }

    if (this.themeTransitionProgress >= 1) {
      this.currentThemeIndex = this.targetThemeIndex;
      this.themeTransitionProgress = 1;
    }

    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;

    this.updateTempParticles(deltaTime);
    this.updateStarField(elapsedTime);
  }

  private updateTempParticles(deltaTime: number): void {
    const posAttr = this.tempGeometry.attributes.position as THREE.BufferAttribute;
    const colorAttr = this.tempGeometry.attributes.color as THREE.BufferAttribute;
    const sizeAttr = this.tempGeometry.attributes.size as THREE.BufferAttribute;
    const maxParticles = posAttr.count;

    for (let i = this.tempParticles.length - 1; i >= 0; i--) {
      const p = this.tempParticles[i];
      p.life -= deltaTime;
      if (p.life <= 0) {
        this.tempParticles.splice(i, 1);
        continue;
      }

      p.position.addScaledVector(p.velocity, deltaTime * 60);
      p.velocity.multiplyScalar(0.97);

      const lifeRatio = p.life / p.maxLife;
      const safeIndex = Math.min(i, maxParticles - 1);
      if (safeIndex >= 0) {
        posAttr.array[safeIndex * 3] = p.position.x;
        posAttr.array[safeIndex * 3 + 1] = p.position.y;
        posAttr.array[safeIndex * 3 + 2] = p.position.z;

        colorAttr.array[safeIndex * 3] = p.color.r * lifeRatio;
        colorAttr.array[safeIndex * 3 + 1] = p.color.g * lifeRatio;
        colorAttr.array[safeIndex * 3 + 2] = p.color.b * lifeRatio;

        sizeAttr.array[safeIndex] = p.size * lifeRatio;
      }
    }

    const drawCount = Math.min(this.tempParticles.length, maxParticles);
    this.tempGeometry.setDrawRange(0, drawCount);
    posAttr.needsUpdate = true;
    colorAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
  }

  private updateStarField(elapsedTime: number): void {
    const starPosAttr = this.starField.geometry.attributes.position as THREE.BufferAttribute;
    const starColorAttr = this.starField.geometry.attributes.color as THREE.BufferAttribute;

    this.starField.rotation.y += 0.0001;

    for (let i = 0; i < starPosAttr.count; i++) {
      const twinkle = Math.sin(elapsedTime * 2 + i * 0.5) * 0.3 + 0.7;
      starColorAttr.array[i * 3] = twinkle;
      starColorAttr.array[i * 3 + 1] = twinkle;
      starColorAttr.array[i * 3 + 2] = twinkle * (0.8 + Math.sin(elapsedTime * 3 + i) * 0.2);
    }
    starColorAttr.needsUpdate = true;
  }
}
