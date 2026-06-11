import * as THREE from 'three';
import { StarData, ConnectionData } from './transformer';

interface StarObject {
  data: StarData;
  sprite: THREE.Sprite;
  trailParticles: THREE.Sprite[];
  trailHistory: THREE.Vector3[];
  pulseSprite: THREE.Sprite | null;
  pulseStartTime: number;
  hasPulsed: boolean;
  startTime: number;
  currentPosition: THREE.Vector3;
}

interface ConnectionObject {
  data: ConnectionData;
  fromIndex: number;
  toIndex: number;
  baseOpacity: number;
  color: THREE.Color;
}

const TRAIL_LENGTH = 8;
const PULSE_DURATION = 0.5;
const PULSE_RADIUS = 10;

function createStarTexture(color: string, brightness: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = canvas.width / 2 - 4;

  const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, radius);
  gradient.addColorStop(0, `rgba(255, 255, 255, ${brightness})`);
  gradient.addColorStop(0.2, color);
  gradient.addColorStop(0.5, color + '80');
  gradient.addColorStop(1, color + '00');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function createPulseTexture(color: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const radius = canvas.width / 2 - 8;

  const gradient = ctx.createRadialGradient(centerX, centerY, radius * 0.7, centerX, centerY, radius);
  gradient.addColorStop(0, color + '00');
  gradient.addColorStop(0.5, color + '60');
  gradient.addColorStop(0.8, color + 'AA');
  gradient.addColorStop(1, color + '00');

  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutQuad(t: number): number {
  return 1 - (1 - t) * (1 - t);
}

export class StarSystem {
  private scene: THREE.Scene;
  private stars: Map<string, StarObject> = new Map();
  private connections: ConnectionObject[] = [];
  private connectionsLine: THREE.LineSegments | null = null;
  private connectionsOpacity: number = 0;
  private startPosition: THREE.Vector3;
  private rotationGroup: THREE.Group;
  private rotationSpeed: number = 1.5;
  private isAnimating: boolean = false;
  private animationStartTime: number = 0;
  private textureCache: Map<string, THREE.CanvasTexture> = new Map();
  private environmentStars: THREE.Points | null = null;

  constructor(scene: THREE.Scene, startPosition: THREE.Vector3) {
    this.scene = scene;
    this.startPosition = startPosition.clone();

    this.rotationGroup = new THREE.Group();
    this.scene.add(this.rotationGroup);

    this.createEnvironmentStars();
  }

  private createEnvironmentStars(): void {
    const starCount = 300;
    const positions = new Float32Array(starCount * 3);
    const colors = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 50 + Math.random() * 50;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      const brightness = 0.3 + Math.random() * 0.7;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.2,
      vertexColors: true,
      transparent: true,
      opacity: 0.7,
      sizeAttenuation: true,
      depthWrite: false
    });

    this.environmentStars = new THREE.Points(geometry, material);
    this.scene.add(this.environmentStars);
  }

  private getStarTexture(color: string, brightness: number): THREE.CanvasTexture {
    const key = `${color}-${brightness.toFixed(2)}`;
    if (!this.textureCache.has(key)) {
      this.textureCache.set(key, createStarTexture(color, brightness));
    }
    return this.textureCache.get(key)!;
  }

  setStartPosition(position: THREE.Vector3): void {
    this.startPosition.copy(position);
  }

  setRotationSpeed(speed: number): void {
    this.rotationSpeed = speed;
  }

  clear(): void {
    for (const star of this.stars.values()) {
      this.rotationGroup.remove(star.sprite);
      star.trailParticles.forEach(p => this.rotationGroup.remove(p));
      if (star.pulseSprite) {
        this.rotationGroup.remove(star.pulseSprite);
      }
    }
    this.stars.clear();

    for (const conn of this.connections) {
      this.rotationGroup.remove(conn.line);
    }
    this.connections = [];
  }

  createStars(starData: StarData[], connectionData: ConnectionData[]): void {
    this.clear();

    for (const data of starData) {
      const texture = this.getStarTexture(data.color, data.brightness);
      const material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });

      const sprite = new THREE.Sprite(material);
      sprite.position.copy(this.startPosition);
      sprite.scale.set(0.5 * data.brightness, 0.5 * data.brightness, 1);
      sprite.userData.starId = data.id;

      this.rotationGroup.add(sprite);

      const trailParticles: THREE.Sprite[] = [];
      const trailHistory: THREE.Vector3[] = [];

      for (let i = 0; i < TRAIL_LENGTH; i++) {
        const trailTexture = this.getStarTexture(data.color, data.brightness * 0.6);
        const trailMaterial = new THREE.SpriteMaterial({
          map: trailTexture,
          transparent: true,
          opacity: 0,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        });
        const trailSprite = new THREE.Sprite(trailMaterial);
        trailSprite.position.copy(this.startPosition);
        trailSprite.scale.set(0.3 * data.brightness, 0.3 * data.brightness, 1);
        this.rotationGroup.add(trailSprite);
        trailParticles.push(trailSprite);
        trailHistory.push(this.startPosition.clone());
      }

      this.stars.set(data.id, {
        data,
        sprite,
        trailParticles,
        trailHistory,
        pulseSprite: null,
        pulseStartTime: 0,
        hasPulsed: false,
        startTime: 0,
        currentPosition: this.startPosition.clone()
      });
    }

    for (const conn of connectionData) {
      const fromStar = this.stars.get(conn.from);
      const toStar = this.stars.get(conn.to);

      if (!fromStar || !toStar) continue;

      const points = [
        fromStar.data.targetPosition.clone(),
        toStar.data.targetPosition.clone()
      ];

      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: fromStar.data.color,
        transparent: true,
        opacity: 0,
        depthWrite: false
      });

      const line = new THREE.Line(geometry, material);
      line.userData.lineWidth = Math.max(0.5, 2 - conn.distance * 0.3);
      this.rotationGroup.add(line);

      this.connections.push({ data: conn, line });
    }

    this.isAnimating = true;
    this.animationStartTime = performance.now();
  }

  update(currentTime: number, deltaTime: number): void {
    const elapsed = (currentTime - this.animationStartTime) / 1000;

    if (this.environmentStars) {
      this.environmentStars.rotation.y += deltaTime * 0.02;
    }

    if (!this.isAnimating) {
      this.rotationGroup.rotation.y += (this.rotationSpeed * Math.PI / 180) * deltaTime;
      return;
    }

    let allArrived = true;

    for (const star of this.stars.values()) {
      const data = star.data;

      if (elapsed < data.flyDelay) {
        continue;
      }

      allArrived = false;

      if (star.startTime === 0) {
        star.startTime = currentTime;
        (star.sprite.material as THREE.SpriteMaterial).opacity = 1;
      }

      const starElapsed = (currentTime - star.startTime) / 1000;
      const progress = Math.min(1, starElapsed / data.flyDuration);
      const easedProgress = easeOutCubic(progress);

      star.currentPosition.lerpVectors(
        this.startPosition,
        data.targetPosition,
        easedProgress
      );
      star.sprite.position.copy(star.currentPosition);

      const scale = 0.3 + easedProgress * 0.2 * data.brightness;
      star.sprite.scale.set(scale, scale, 1);

      for (let i = TRAIL_LENGTH - 1; i > 0; i--) {
        star.trailHistory[i].copy(star.trailHistory[i - 1]);
      }
      star.trailHistory[0].copy(star.currentPosition);

      for (let i = 0; i < TRAIL_LENGTH; i++) {
        const trailParticle = star.trailParticles[i];
        const trailProgress = i / TRAIL_LENGTH;
        const trailOpacity = (1 - trailProgress) * 0.6 * Math.max(0, 1 - progress * 1.5);

        (trailParticle.material as THREE.SpriteMaterial).opacity = trailOpacity;
        trailParticle.position.copy(star.trailHistory[i]);

        const trailScale = (1 - trailProgress * 0.7) * 0.25 * data.brightness;
        trailParticle.scale.set(trailScale, trailScale, 1);
      }

      if (progress >= 1 && !star.hasPulsed) {
        star.hasPulsed = true;
        this.triggerPulse(star);
      }
    }

    if (allArrived && elapsed > 3) {
      this.isAnimating = false;
    }

    for (const star of this.stars.values()) {
      if (star.pulseSprite) {
        const pulseElapsed = (currentTime - star.pulseStartTime) / 1000;
        const pulseProgress = pulseElapsed / PULSE_DURATION;

        if (pulseProgress >= 1) {
          this.rotationGroup.remove(star.pulseSprite);
          star.pulseSprite = null;
        } else {
          const pulseScale = Math.sin(pulseProgress * Math.PI) * PULSE_RADIUS * 0.1;
          const pulseOpacity = Math.sin(pulseProgress * Math.PI) * 0.8;

          star.pulseSprite.scale.set(pulseScale, pulseScale, 1);
          (star.pulseSprite.material as THREE.SpriteMaterial).opacity = pulseOpacity;
        }
      }
    }

    const connectionProgress = Math.min(1, (elapsed - 1.5) / 1);
    if (connectionProgress > 0) {
      for (const conn of this.connections) {
        (conn.line.material as THREE.LineBasicMaterial).opacity =
          easeOutQuad(connectionProgress) * conn.data.opacity;
      }
    }

    this.rotationGroup.rotation.y += (this.rotationSpeed * Math.PI / 180) * deltaTime;
  }

  private triggerPulse(star: StarObject): void {
    const pulseTexture = createPulseTexture(star.data.color);
    const pulseMaterial = new THREE.SpriteMaterial({
      map: pulseTexture,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const pulseSprite = new THREE.Sprite(pulseMaterial);
    pulseSprite.position.copy(star.data.targetPosition);
    pulseSprite.scale.set(0, 0, 1);

    this.rotationGroup.add(pulseSprite);

    star.pulseSprite = pulseSprite;
    star.pulseStartTime = performance.now();
  }

  resetRotation(): void {
    this.rotationGroup.rotation.set(0, 0, 0);
  }

  getStarCount(): number {
    return this.stars.size;
  }

  dispose(): void {
    this.clear();

    if (this.environmentStars) {
      this.scene.remove(this.environmentStars);
      this.environmentStars.geometry.dispose();
      (this.environmentStars.material as THREE.Material).dispose();
    }

    for (const texture of this.textureCache.values()) {
      texture.dispose();
    }
    this.textureCache.clear();

    this.scene.remove(this.rotationGroup);
  }
}
