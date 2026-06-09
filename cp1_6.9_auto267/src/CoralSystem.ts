import * as THREE from 'three';
import { Coral, CoralConfig } from './Coral';

interface ClickParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  material: THREE.MeshBasicMaterial;
}

interface BackgroundParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  bounds: number;
}

interface PendingClickEffect {
  coral: Coral;
  delay: number;
}

export class CoralSystem {
  private readonly scene: THREE.Scene;
  private readonly camera: THREE.PerspectiveCamera;
  private readonly rendererDomElement: HTMLElement;

  private readonly corals: Coral[] = [];
  private readonly raycaster: THREE.Raycaster = new THREE.Raycaster();
  private readonly mouseNDC: THREE.Vector2 = new THREE.Vector2();

  private readonly clickParticles: ClickParticle[] = [];
  private readonly pendingClicks: PendingClickEffect[] = [];
  private readonly backgroundParticles: BackgroundParticle[] = [];

  private elapsedTime: number = 0;

  private readonly coralCount: number;
  private readonly reefRadius: number = 8;

  private readonly driftSpeed: number = 0.03;
  private readonly driftAmplitude: number = 1.5;
  private readonly driftPeriod: number = 15;

  private readonly backgroundParticleCount: number = 150;
  private readonly backgroundBounds: number = 14;

  private hoveredCoral: Coral | null = null;

  private readonly onMouseMoveBound: (e: MouseEvent) => void;
  private readonly onClickBound: (e: MouseEvent) => void;

  private static readonly clickParticleGeometry = new THREE.SphereGeometry(
    0.08,
    8,
    8
  );

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    rendererDomElement: HTMLElement
  ) {
    this.scene = scene;
    this.camera = camera;
    this.rendererDomElement = rendererDomElement;

    this.coralCount = 30 + Math.floor(Math.random() * 21);

    this.onMouseMoveBound = this.onMouseMove.bind(this);
    this.onClickBound = this.onClick.bind(this);

    this.generateCorals();
    this.generateBackgroundParticles();
    this.attachEventListeners();
  }

  private generateCorals(): void {
    for (let i = 0; i < this.coralCount; i++) {
      const config = this.createRandomCoralConfig();
      const coral = new Coral(config);
      this.corals.push(coral);
      this.scene.add(coral.group);
    }
  }

  private createRandomCoralConfig(): CoralConfig {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = Math.cbrt(Math.random()) * this.reefRadius;

    const position = new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi) * 0.7,
      r * Math.sin(phi) * Math.sin(theta)
    );

    const baseSize = 0.3 + Math.random() * 0.5;
    const hue = 200 + Math.random() * 150;
    const rotationSpeed = 0.005 + Math.random() * 0.005;
    const growDuration = 8 + Math.random() * 4;
    const floatAmplitude = 0.3;
    const floatPeriod = 3 + Math.random() * 2;
    const floatPhase = Math.random() * Math.PI * 2;

    return {
      position,
      baseSize,
      hue,
      rotationSpeed,
      growDuration,
      floatAmplitude,
      floatPeriod,
      floatPhase,
    };
  }

  private generateBackgroundParticles(): void {
    for (let i = 0; i < this.backgroundParticleCount; i++) {
      const size = 0.02 + Math.random() * 0.03;
      const geometry = new THREE.SphereGeometry(size, 6, 6);

      const hue = 190 + Math.random() * 40;
      const opacity = 0.2 + Math.random() * 0.3;
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color().setHSL(hue / 360, 0.7, 0.65),
        transparent: true,
        opacity,
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(
        (Math.random() - 0.5) * this.backgroundBounds * 2,
        (Math.random() - 0.5) * this.backgroundBounds * 1.6,
        (Math.random() - 0.5) * this.backgroundBounds * 2
      );

      const speed = 0.01 + Math.random() * 0.02;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      const velocity = new THREE.Vector3(
        speed * Math.sin(phi) * Math.cos(theta),
        speed * Math.sin(phi) * Math.sin(theta) * 0.5,
        speed * Math.cos(phi)
      );

      this.scene.add(mesh);
      this.backgroundParticles.push({
        mesh,
        velocity,
        bounds: this.backgroundBounds,
      });
    }
  }

  private attachEventListeners(): void {
    this.rendererDomElement.addEventListener(
      'mousemove',
      this.onMouseMoveBound
    );
    this.rendererDomElement.addEventListener('click', this.onClickBound);
  }

  private onMouseMove(event: MouseEvent): void {
    const rect = this.rendererDomElement.getBoundingClientRect();
    this.mouseNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.performHoverCheck();
  }

  private performHoverCheck(): void {
    this.raycaster.setFromCamera(this.mouseNDC, this.camera);

    const allMeshes: THREE.Mesh[] = [];
    const coralMap = new Map<THREE.Mesh, Coral>();

    for (const coral of this.corals) {
      if (!coral.isReadyForInteraction()) continue;
      for (const mesh of coral.getAllMeshes()) {
        allMeshes.push(mesh);
        coralMap.set(mesh, coral);
      }
    }

    const intersects = this.raycaster.intersectObjects(allMeshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const hitCoral = coralMap.get(hitMesh);

      if (hitCoral && hitCoral !== this.hoveredCoral) {
        this.hoveredCoral = hitCoral;
        hitCoral.triggerHover();
      }
    } else {
      this.hoveredCoral = null;
    }
  }

  private onClick(event: MouseEvent): void {
    const rect = this.rendererDomElement.getBoundingClientRect();
    this.mouseNDC.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouseNDC.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouseNDC, this.camera);

    const allMeshes: THREE.Mesh[] = [];
    const coralMap = new Map<THREE.Mesh, Coral>();

    for (const coral of this.corals) {
      if (!coral.isReadyForInteraction()) continue;
      for (const mesh of coral.getAllMeshes()) {
        allMeshes.push(mesh);
        coralMap.set(mesh, coral);
      }
    }

    const intersects = this.raycaster.intersectObjects(allMeshes, false);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const hitCoral = coralMap.get(hitMesh);
      if (hitCoral) {
        this.pendingClicks.push({
          coral: hitCoral,
          delay: 0.1,
        });
      }
    }
  }

  public update(deltaTime: number): void {
    this.elapsedTime += deltaTime;

    const driftOffset = this.calculateGlobalDriftOffset();

    for (const coral of this.corals) {
      coral.update(deltaTime, driftOffset);
    }

    this.processPendingClicks(deltaTime);
    this.updateClickParticles(deltaTime);
    this.updateBackgroundParticles(deltaTime);
  }

  private calculateGlobalDriftOffset(): THREE.Vector3 {
    const t = this.elapsedTime;
    const progress = (t / this.driftPeriod) * Math.PI * 2;

    const x = Math.sin(progress) * this.driftAmplitude;
    const z = this.driftSpeed * t;

    const wrappedZ = ((z % (this.reefRadius * 4)) + this.reefRadius * 4) % (this.reefRadius * 4) - this.reefRadius * 2;

    return new THREE.Vector3(x, 0, wrappedZ);
  }

  private processPendingClicks(deltaTime: number): void {
    for (let i = this.pendingClicks.length - 1; i >= 0; i--) {
      this.pendingClicks[i].delay -= deltaTime;
      if (this.pendingClicks[i].delay <= 0) {
        const { coral } = this.pendingClicks[i];
        this.emitClickParticles(coral);
        this.pendingClicks.splice(i, 1);
      }
    }
  }

  private emitClickParticles(coral: Coral): void {
    const glowPositions = coral.getGlowSpherePositions();
    if (glowPositions.length === 0) return;

    const sourceIndex = Math.floor(Math.random() * glowPositions.length);
    const source = glowPositions[sourceIndex];

    const particleCount = 6;
    const baseSpeed = 0.3;

    for (let i = 0; i < particleCount; i++) {
      const theta = (i / particleCount) * Math.PI * 2 + Math.random() * 0.3;
      const phi = Math.random() * Math.PI;

      const speedVariation = 0.8 + Math.random() * 0.5;
      const speed = baseSpeed * speedVariation;

      const velocity = new THREE.Vector3(
        Math.sin(phi) * Math.cos(theta) * speed,
        Math.cos(phi) * speed,
        Math.sin(phi) * Math.sin(theta) * speed
      );

      const hue = 200 + Math.random() * 160;
      const color = new THREE.Color().setHSL(hue / 360, 0.8, 0.7);

      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1.0,
      });

      const mesh = new THREE.Mesh(
        CoralSystem.clickParticleGeometry,
        material
      );
      mesh.position.copy(source);
      mesh.position.x += (Math.random() - 0.5) * 0.1;
      mesh.position.y += (Math.random() - 0.5) * 0.1;
      mesh.position.z += (Math.random() - 0.5) * 0.1;

      this.scene.add(mesh);
      this.clickParticles.push({
        mesh,
        velocity,
        life: 0,
        maxLife: 1.2,
        material,
      });
    }
  }

  private updateClickParticles(deltaTime: number): void {
    for (let i = this.clickParticles.length - 1; i >= 0; i--) {
      const p = this.clickParticles[i];
      p.life += deltaTime;

      p.mesh.position.addScaledVector(p.velocity, deltaTime);
      p.velocity.multiplyScalar(0.98);

      const lifeRatio = p.life / p.maxLife;
      p.material.opacity = Math.max(0, 1 - lifeRatio);

      const scale = 1 + lifeRatio * 0.5;
      p.mesh.scale.setScalar(scale);

      if (p.life >= p.maxLife) {
        this.scene.remove(p.mesh);
        p.material.dispose();
        this.clickParticles.splice(i, 1);
      }
    }
  }

  private updateBackgroundParticles(deltaTime: number): void {
    for (const p of this.backgroundParticles) {
      p.mesh.position.addScaledVector(p.velocity, deltaTime);

      const halfBounds = p.bounds;
      if (p.mesh.position.x > halfBounds) {
        p.mesh.position.x = halfBounds;
        p.velocity.x *= -1;
      } else if (p.mesh.position.x < -halfBounds) {
        p.mesh.position.x = -halfBounds;
        p.velocity.x *= -1;
      }

      if (p.mesh.position.y > halfBounds * 0.8) {
        p.mesh.position.y = halfBounds * 0.8;
        p.velocity.y *= -1;
      } else if (p.mesh.position.y < -halfBounds * 0.8) {
        p.mesh.position.y = -halfBounds * 0.8;
        p.velocity.y *= -1;
      }

      if (p.mesh.position.z > halfBounds) {
        p.mesh.position.z = halfBounds;
        p.velocity.z *= -1;
      } else if (p.mesh.position.z < -halfBounds) {
        p.mesh.position.z = -halfBounds;
        p.velocity.z *= -1;
      }
    }
  }

  public dispose(): void {
    this.rendererDomElement.removeEventListener(
      'mousemove',
      this.onMouseMoveBound
    );
    this.rendererDomElement.removeEventListener('click', this.onClickBound);

    for (const coral of this.corals) {
      this.scene.remove(coral.group);
      coral.dispose();
    }
    this.corals.length = 0;

    for (const p of this.clickParticles) {
      this.scene.remove(p.mesh);
      p.material.dispose();
    }
    this.clickParticles.length = 0;
    this.pendingClicks.length = 0;

    for (const p of this.backgroundParticles) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    }
    this.backgroundParticles.length = 0;
  }
}
