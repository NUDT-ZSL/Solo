import * as THREE from 'three';

export interface MainStarData {
  mesh: THREE.Mesh;
  halo: THREE.Mesh;
  basePosition: THREE.Vector3;
  angle: number;
  baseRadius: number;
  pulsePhase: number;
  baseIntensity: number;
  isHighlighted: boolean;
  originalColor: THREE.Color;
}

export interface DustParticleData {
  mesh: THREE.Mesh;
  basePosition: THREE.Vector3;
  currentOffset: THREE.Vector3;
  targetOffset: THREE.Vector3;
  offsetRecoveryTime: number;
  flickerPhase: number;
  baseOpacity: number;
  originalColor: THREE.Color;
  colorTint: THREE.Color;
  tintIntensity: number;
  tintRecoveryTime: number;
}

export class CompassManager {
  private scene: THREE.Scene;
  public mainStars: MainStarData[] = [];
  public dustParticles: DustParticleData[] = [];
  private farStars: THREE.Points;
  public coreMesh: THREE.Mesh;
  private fog: THREE.Fog;
  private group: THREE.Group;

  private readonly STAR_COUNT = 12;
  private readonly DUST_COUNT = 200;
  private readonly FAR_STAR_COUNT = 50;
  private readonly ELLIPSE_RATIO = 0.9;
  private readonly MIN_RADIUS = 4;
  private readonly MAX_RADIUS = 8;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.setupEnvironment();
    this.coreMesh = this.createCore();
    this.farStars = this.createFarStars();
    this.createMainStars();
    this.createDustParticles();
  }

  private setupEnvironment(): void {
    this.scene.background = new THREE.Color(0x0a0a1a);
    this.fog = new THREE.Fog(0x0a0a1a, 15, 40);
    this.scene.fog = this.fog;
  }

  private hslToColor(hue: number, saturation: number, lightness: number): THREE.Color {
    const color = new THREE.Color();
    color.setHSL(hue / 360, saturation / 100, lightness / 100);
    return color;
  }

  private getStarColor(angle: number): THREE.Color {
    const normalizedAngle = ((angle % 360) + 360) % 360;
    if (normalizedAngle <= 180) {
      const t = normalizedAngle / 180;
      const hue = 0 + t * 280;
      return this.hslToColor(hue, 100, 60);
    } else {
      const t = (normalizedAngle - 180) / 180;
      const hue = 280 + t * 80;
      return this.hslToColor(hue % 360, 100, 60);
    }
  }

  private getEllipseRadius(angle: number): number {
    const t = angle / 360;
    const baseRadius = this.MIN_RADIUS + (this.MAX_RADIUS - this.MIN_RADIUS) * (0.5 - 0.5 * Math.cos(t * Math.PI * 2));
    return baseRadius;
  }

  private createCore(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.2, 32, 32);
    const material = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
    });
    const mesh = new THREE.Mesh(geometry, material);
    this.group.add(mesh);

    const glowGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.15,
      blending: THREE.AdditiveBlending,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    mesh.add(glow);

    return mesh;
  }

  private createFarStars(): THREE.Points {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.FAR_STAR_COUNT * 3);
    const colors = new Float32Array(this.FAR_STAR_COUNT * 3);

    for (let i = 0; i < this.FAR_STAR_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 30 + Math.random() * 10;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);

      const brightness = 0.15 + Math.random() * 0.1;
      colors[i * 3] = brightness;
      colors[i * 3 + 1] = brightness;
      colors[i * 3 + 2] = brightness + Math.random() * 0.05;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);
    return points;
  }

  private createMainStars(): void {
    for (let i = 0; i < this.STAR_COUNT; i++) {
      const angle = (i / this.STAR_COUNT) * 360;
      const angleRad = (angle * Math.PI) / 180;
      const baseRadius = this.getEllipseRadius(angle);

      const x = baseRadius * Math.cos(angleRad);
      const y = baseRadius * this.ELLIPSE_RATIO * Math.sin(angleRad);
      const z = 0;

      const basePosition = new THREE.Vector3(x, y, z);
      const color = this.getStarColor(angle);

      const geometry = new THREE.SphereGeometry(0.5, 32, 32);
      const material = new THREE.MeshBasicMaterial({
        color: color.clone(),
        transparent: true,
        opacity: 0.95,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(basePosition);
      this.group.add(mesh);

      const haloGeo = new THREE.RingGeometry(0.7, 1.0, 64);
      const haloMat = new THREE.MeshBasicMaterial({
        color: color.clone(),
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const halo = new THREE.Mesh(haloGeo, haloMat);
      halo.position.copy(basePosition);
      halo.lookAt(0, 6, 12);
      this.group.add(halo);

      this.mainStars.push({
        mesh,
        halo,
        basePosition: basePosition.clone(),
        angle,
        baseRadius,
        pulsePhase: Math.random() * Math.PI * 2,
        baseIntensity: 1.2,
        isHighlighted: false,
        originalColor: color.clone(),
      });
    }
  }

  private createDustParticles(): void {
    for (let i = 0; i < this.DUST_COUNT; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = Math.random() * 15;

      const x = r * Math.sin(phi) * Math.cos(theta);
      const y = r * Math.cos(phi) - 2.5;
      const z = r * Math.sin(phi) * Math.sin(theta);

      const basePosition = new THREE.Vector3(x, y, z);
      const size = 0.05 + Math.random() * 0.1;

      const geometry = new THREE.SphereGeometry(size, 8, 8);
      const opacity = 0.3 + Math.random() * 0.3;
      const material = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: opacity,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(basePosition);
      this.group.add(mesh);

      this.dustParticles.push({
        mesh,
        basePosition: basePosition.clone(),
        currentOffset: new THREE.Vector3(),
        targetOffset: new THREE.Vector3(),
        offsetRecoveryTime: 0,
        flickerPhase: Math.random() * Math.PI * 2,
        baseOpacity: opacity,
        originalColor: new THREE.Color(0xffffff),
        colorTint: new THREE.Color(0xffffff),
        tintIntensity: 0,
        tintRecoveryTime: 0,
      });
    }
  }

  public setMainStarHighlight(starIndex: number, highlighted: boolean): void {
    const star = this.mainStars[starIndex];
    if (!star || star.isHighlighted === highlighted) return;

    star.isHighlighted = highlighted;
    const haloMat = star.halo.material as THREE.MeshBasicMaterial;

    if (highlighted) {
      star.mesh.scale.setScalar(0.7 / 0.5);
      haloMat.opacity = 0.5;
    } else {
      star.mesh.scale.setScalar(1);
      haloMat.opacity = 0;
    }
  }

  public update(time: number, deltaTime: number): void {
    this.group.rotation.y += deltaTime * 0.01;

    for (let i = 0; i < this.mainStars.length; i++) {
      const star = this.mainStars[i];
      const pulse = Math.sin(time * Math.PI + star.pulsePhase) * 0.3;
      const pulseScale = 1 + pulse * 0.3;

      let finalScale = pulseScale;
      if (star.isHighlighted) {
        finalScale = (0.7 / 0.5) * (1 + pulse * 0.15);
      }

      star.mesh.scale.setScalar(finalScale);

      const haloMat = star.halo.material as THREE.MeshBasicMaterial;
      haloMat.opacity = star.isHighlighted ? 0.4 + Math.sin(time * 3) * 0.1 : 0;
      star.halo.lookAt(0, 6, 12);
    }

    for (let i = 0; i < this.dustParticles.length; i++) {
      const dust = this.dustParticles[i];

      dust.currentOffset.lerp(dust.targetOffset, Math.min(deltaTime * 8, 1));

      if (dust.offsetRecoveryTime > 0) {
        dust.offsetRecoveryTime -= deltaTime;
        if (dust.offsetRecoveryTime <= 0) {
          dust.targetOffset.set(0, 0, 0);
        }
      }

      if (dust.tintRecoveryTime > 0) {
        dust.tintRecoveryTime -= deltaTime;
        if (dust.tintRecoveryTime <= 0) {
          dust.tintIntensity = 0;
        }
      }

      const mesh = dust.mesh;
      mesh.position.copy(dust.basePosition).add(dust.currentOffset);

      const flicker = 0.3 + Math.sin(time * 2 + dust.flickerPhase) * 0.15 + 0.15;
      const mat = mesh.material as THREE.MeshBasicMaterial;

      const finalOpacity = dust.tintIntensity > 0
        ? Math.max(0.6, dust.baseOpacity * flicker + dust.tintIntensity * 0.4)
        : dust.baseOpacity * flicker;
      mat.opacity = finalOpacity;

      if (dust.tintIntensity > 0) {
        mat.color.copy(dust.originalColor).lerp(dust.colorTint, dust.tintIntensity);
      } else {
        mat.color.copy(dust.originalColor);
      }
    }

    const coreMat = this.coreMesh.material as THREE.MeshBasicMaterial;
    coreMat.opacity = 0.8 + Math.sin(time * 2) * 0.1;
    this.coreMesh.scale.setScalar(1 + Math.sin(time * 1.5) * 0.1);
  }

  public applyDustInteraction(
    burstPosition: THREE.Vector3,
    attractionRadius: number,
    attractStrength: number,
    color: THREE.Color,
    colorDuration: number,
    recoveryTime: number
  ): void {
    const worldBurstPos = burstPosition.clone();
    this.group.localToWorld(worldBurstPos);

    for (const dust of this.dustParticles) {
      const worldDustPos = dust.mesh.position.clone();
      this.group.localToWorld(worldDustPos);
      const dist = worldDustPos.distanceTo(worldBurstPos);

      if (dist < attractionRadius) {
        const factor = 1 - dist / attractionRadius;
        const direction = worldBurstPos.clone().sub(worldDustPos).normalize();
        direction.multiplyScalar(attractStrength * factor);
        this.group.worldToLocal(direction);

        dust.targetOffset.copy(direction);
        dust.offsetRecoveryTime = recoveryTime;

        dust.colorTint.copy(color);
        dust.tintIntensity = 1;
        dust.tintRecoveryTime = colorDuration;
      }
    }
  }

  public getGroup(): THREE.Group {
    return this.group;
  }
}
