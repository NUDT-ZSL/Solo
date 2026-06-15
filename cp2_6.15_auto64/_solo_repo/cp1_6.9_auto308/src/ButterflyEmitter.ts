import * as THREE from 'three';
import type { EjectedParticle } from './ParticleSystem';

interface Butterfly {
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  body: THREE.Mesh;
  glow: THREE.Mesh;

  position: THREE.Vector3;
  velocity: THREE.Vector3;
  horizontalAngle: number;
  initialY: number;
  initialSpeed: number;

  age: number;
  lifespan: number;
  wingColor: THREE.Color;
  wingPhase: number;
  wingFrequency: number;

  trailParticles: TrailParticle[];
  lastTrailTime: number;
  trailInterval: number;

  isFading: boolean;
  fadeStartTime: number;

  id: number;
}

interface TrailParticle {
  mesh: THREE.Mesh;
  position: THREE.Vector3;
  age: number;
  lifespan: number;
  baseColor: THREE.Color;
  baseSize: number;
  distanceFromButterfly: number;
}

export class ButterflyEmitter {
  private scene: THREE.Scene;
  private butterflies: Butterfly[] = [];
  private maxButterflies: number = 30;
  private nextId: number = 0;
  private isMobile: boolean;
  private speedMultiplier: number;

  private wingMaterialCache: Map<number, THREE.MeshBasicMaterial> = new Map();
  private bodyMaterial: THREE.MeshBasicMaterial;
  private glowMaterial: THREE.MeshBasicMaterial;
  private trailMaterialTemplate: THREE.MeshBasicMaterial;

  private readonly WING_FLAP_MIN = THREE.MathUtils.degToRad(30);
  private readonly WING_FLAP_MAX = THREE.MathUtils.degToRad(150);
  private readonly WING_FLAP_FREQ = 2;
  private readonly VERTICAL_DROP_SPEED = 0.2;
  private readonly TRAIL_LIFESPAN = 2.0;
  private readonly TRAIL_INTERVAL = 0.02;
  private readonly TRAIL_PARTICLE_COUNT = 12;

  constructor(scene: THREE.Scene, isMobile: boolean = false) {
    this.scene = scene;
    this.isMobile = isMobile;
    this.speedMultiplier = isMobile ? 0.5 : 1.0;

    this.bodyMaterial = new THREE.MeshBasicMaterial({
      color: 0x333344,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false
    });

    this.glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.trailMaterialTemplate = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }

  private createWingGeometry(): THREE.BufferGeometry {
    const scale = 0.35;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.quadraticCurveTo(0.3 * scale, 0.45 * scale, 0.12 * scale, 0.38 * scale);
    shape.quadraticCurveTo(0.05 * scale, 0.3 * scale, 0.02 * scale, 0.18 * scale);
    shape.lineTo(0, 0.08 * scale);
    shape.closePath();

    const geometry = new THREE.ShapeGeometry(shape);
    geometry.translate(0, -0.02 * scale, 0);
    return geometry;
  }

  private createBodyGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.CylinderGeometry(0.012, 0.02, 0.08, 6);
    geometry.rotateX(Math.PI / 2);
    return geometry;
  }

  private createGlowGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.CircleGeometry(0.18, 16);
    return geometry;
  }

  private createTrailParticleGeometry(): THREE.BufferGeometry {
    const geometry = new THREE.SphereGeometry(0.012, 6, 4);
    return geometry;
  }

  private getWingMaterial(color: THREE.Color): THREE.MeshBasicMaterial {
    const colorHex = color.getHex();
    if (this.wingMaterialCache.has(colorHex)) {
      return this.wingMaterialCache.get(colorHex)!;
    }
    const material = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    this.wingMaterialCache.set(colorHex, material);
    return material;
  }

  private generateWingColor(): THREE.Color {
    const hue = Math.random();
    const saturation = 0.75 + Math.random() * 0.25;
    const lightness = 0.82 + Math.random() * 0.12;
    return new THREE.Color().setHSL(hue, saturation, lightness);
  }

  public spawnButterfly(ejected: EjectedParticle): void {
    if (this.butterflies.length >= this.maxButterflies) {
      const oldest = this.butterflies[0];
      this.removeButterfly(oldest);
    }

    const wingColor = this.generateWingColor();
    const wingMaterial = this.getWingMaterial(wingColor);
    const wingGeometry = this.createWingGeometry();

    const group = new THREE.Group();

    const leftWing = new THREE.Mesh(wingGeometry.clone(), wingMaterial);
    leftWing.position.set(-0.02, 0, 0);
    leftWing.rotation.y = this.WING_FLAP_MAX / 2;

    const rightWing = new THREE.Mesh(wingGeometry.clone(), wingMaterial);
    rightWing.position.set(0.02, 0, 0);
    rightWing.scale.x = -1;
    rightWing.rotation.y = -this.WING_FLAP_MAX / 2;

    const body = new THREE.Mesh(this.createBodyGeometry(), this.bodyMaterial);

    const glow = new THREE.Mesh(this.createGlowGeometry(), this.glowMaterial.clone());
    glow.position.z = -0.05;
    glow.visible = false;

    group.add(leftWing);
    group.add(rightWing);
    group.add(body);
    group.add(glow);

    const pos = ejected.position.clone();
    group.position.copy(pos);

    const horizontalAngle = Math.random() * Math.PI * 2;
    const initialSpeed = (1.0 + Math.random() * 1.5) * this.speedMultiplier;

    const butterfly: Butterfly = {
      group,
      leftWing,
      rightWing,
      body,
      glow,

      position: pos.clone(),
      velocity: new THREE.Vector3(
        Math.cos(horizontalAngle) * initialSpeed,
        0,
        Math.sin(horizontalAngle) * initialSpeed
      ),
      horizontalAngle,
      initialY: pos.y,
      initialSpeed,

      age: 0,
      lifespan: (3 + Math.random() * 2),
      wingColor,
      wingPhase: Math.random() * Math.PI * 2,
      wingFrequency: this.WING_FLAP_FREQ + (Math.random() - 0.5) * 0.5,

      trailParticles: [],
      lastTrailTime: 0,
      trailInterval: this.TRAIL_INTERVAL,

      isFading: false,
      fadeStartTime: 0,

      id: this.nextId++
    };

    this.scene.add(group);
    this.butterflies.push(butterfly);

    this.spawnInitialTrail(butterfly);
  }

  private spawnInitialTrail(butterfly: Butterfly): void {
    for (let i = 0; i < this.TRAIL_PARTICLE_COUNT; i++) {
      const offset = i * 0.05;
      const trailPos = butterfly.position.clone();
      trailPos.x -= Math.cos(butterfly.horizontalAngle) * offset;
      trailPos.z -= Math.sin(butterfly.horizontalAngle) * offset;
      trailPos.y += 0.001 * i;
      this.addTrailParticle(butterfly, trailPos, offset);
    }
  }

  private addTrailParticle(butterfly: Butterfly, pos: THREE.Vector3, dist: number): void {
    const trailColor = butterfly.wingColor.clone();

    const material = this.trailMaterialTemplate.clone();
    material.color = trailColor;
    material.opacity = 0.8;

    const geometry = this.createTrailParticleGeometry();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(pos);
    mesh.scale.setScalar(1.0 - dist * 0.5);

    this.scene.add(mesh);

    const particle: TrailParticle = {
      mesh,
      position: pos.clone(),
      age: 0,
      lifespan: this.TRAIL_LIFESPAN,
      baseColor: trailColor,
      baseSize: 0.02,
      distanceFromButterfly: dist
    };

    butterfly.trailParticles.push(particle);
  }

  public update(deltaTime: number): void {
    for (let i = this.butterflies.length - 1; i >= 0; i--) {
      const b = this.butterflies[i];
      b.age += deltaTime;

      const remainingLife = b.lifespan - b.age;
      const fadeThreshold = 0.8;
      if (remainingLife < fadeThreshold && !b.isFading) {
        b.isFading = true;
        b.fadeStartTime = b.age;
      }

      let alpha = 1.0;
      if (b.isFading) {
        const fadeProgress = (b.age - b.fadeStartTime) / Math.min(fadeThreshold, remainingLife + 0.001);
        alpha = Math.max(0, 1 - Math.min(1, fadeProgress));
      }

      const flapProgress = Math.sin(b.age * b.wingFrequency * Math.PI * 2 + b.wingPhase);
      let wingAngle;
      if (b.isFading && alpha < 0.3) {
        const closeSpeed = 8;
        wingAngle = this.WING_FLAP_MIN + (this.WING_FLAP_MAX - this.WING_FLAP_MIN) * 0.5 * (1 + Math.sin(b.age * closeSpeed));
      } else {
        wingAngle = this.WING_FLAP_MIN + (this.WING_FLAP_MAX - this.WING_FLAP_MIN) * 0.5 * (1 + flapProgress);
      }
      b.leftWing.rotation.y = wingAngle / 2;
      b.rightWing.rotation.y = -wingAngle / 2;

      const timeSinceStart = b.age;
      const parabolicY = b.initialY - this.VERTICAL_DROP_SPEED * this.speedMultiplier * timeSinceStart
        - 0.05 * timeSinceStart * timeSinceStart;

      const speedDamping = Math.pow(0.4, deltaTime);
      b.velocity.multiplyScalar(speedDamping);
      b.velocity.x += Math.cos(b.horizontalAngle) * 0.8 * deltaTime * this.speedMultiplier;
      b.velocity.z += Math.sin(b.horizontalAngle) * 0.8 * deltaTime * this.speedMultiplier;

      b.horizontalAngle += Math.sin(b.age * 0.7) * 0.3 * deltaTime;

      b.position.add(b.velocity.clone().multiplyScalar(deltaTime));
      b.position.y = parabolicY;

      b.group.position.copy(b.position);
      b.group.lookAt(
        b.position.x + b.velocity.x,
        b.position.y,
        b.position.z + b.velocity.z
      );
      b.group.rotateY(Math.PI);

      const wingMaterial = b.leftWing.material as THREE.MeshBasicMaterial;
      wingMaterial.opacity = 0.95 * alpha;
      (b.rightWing.material as THREE.MeshBasicMaterial).opacity = 0.95 * alpha;
      (b.body.material as THREE.MeshBasicMaterial).opacity = 0.9 * alpha;

      if (b.isFading && alpha < 0.5) {
        b.glow.visible = true;
        const glowMat = b.glow.material as THREE.MeshBasicMaterial;
        glowMat.color.copy(b.wingColor);
        glowMat.opacity = Math.max(0, (0.5 - alpha) * 0.8);
        b.glow.scale.setScalar(1 + (1 - alpha) * 2);
      }

      b.lastTrailTime += deltaTime;
      if (b.lastTrailTime >= b.trailInterval && alpha > 0.05) {
        b.lastTrailTime = 0;
        this.addTrailParticle(b, b.position.clone(), 0);

        for (let j = b.trailParticles.length - 1; j >= 0; j--) {
          const tp = b.trailParticles[j];
          tp.distanceFromButterfly += 0.05;
          const shrinkFactor = Math.max(0, 1 - tp.distanceFromButterfly * 2.5);
          tp.mesh.scale.setScalar(Math.max(0.1, shrinkFactor));
        }
      }

      this.updateTrailParticles(b, deltaTime);

      if (b.age >= b.lifespan || alpha <= 0.01) {
        this.removeButterfly(b);
        this.butterflies.splice(i, 1);
      }
    }
  }

  private updateTrailParticles(butterfly: Butterfly, deltaTime: number): void {
    for (let i = butterfly.trailParticles.length - 1; i >= 0; i--) {
      const tp = butterfly.trailParticles[i];
      tp.age += deltaTime;

      const lifeProgress = tp.age / tp.lifespan;
      const alpha = Math.max(0, 0.8 * (1 - lifeProgress));
      const material = tp.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = alpha;

      const colorShift = 1 - lifeProgress * 0.3;
      material.color.copy(tp.baseColor).multiplyScalar(colorShift);

      if (tp.age >= tp.lifespan || alpha <= 0.01) {
        this.scene.remove(tp.mesh);
        (tp.mesh.geometry as THREE.BufferGeometry).dispose();
        material.dispose();
        butterfly.trailParticles.splice(i, 1);
      }
    }

    if (butterfly.trailParticles.length > this.TRAIL_PARTICLE_COUNT * 3) {
      const excess = butterfly.trailParticles.length - this.TRAIL_PARTICLE_COUNT * 2;
      for (let i = 0; i < excess; i++) {
        const tp = butterfly.trailParticles[i];
        this.scene.remove(tp.mesh);
        (tp.mesh.geometry as THREE.BufferGeometry).dispose();
        (tp.mesh.material as THREE.Material).dispose();
      }
      butterfly.trailParticles.splice(0, excess);
    }
  }

  private removeButterfly(butterfly: Butterfly): void {
    for (const tp of butterfly.trailParticles) {
      this.scene.remove(tp.mesh);
      (tp.mesh.geometry as THREE.BufferGeometry).dispose();
      (tp.mesh.material as THREE.Material).dispose();
    }
    butterfly.trailParticles = [];

    (butterfly.leftWing.geometry as THREE.BufferGeometry).dispose();
    (butterfly.rightWing.geometry as THREE.BufferGeometry).dispose();
    (butterfly.body.geometry as THREE.BufferGeometry).dispose();
    (butterfly.glow.geometry as THREE.BufferGeometry).dispose();

    (butterfly.glow.material as THREE.Material).dispose();

    this.scene.remove(butterfly.group);
  }

  public getButterflyCount(): number {
    return this.butterflies.length;
  }

  public dispose(): void {
    for (let i = this.butterflies.length - 1; i >= 0; i--) {
      this.removeButterfly(this.butterflies[i]);
    }
    this.butterflies = [];

    this.bodyMaterial.dispose();
    this.glowMaterial.dispose();
    this.trailMaterialTemplate.dispose();
    for (const mat of this.wingMaterialCache.values()) {
      mat.dispose();
    }
    this.wingMaterialCache.clear();
  }
}
