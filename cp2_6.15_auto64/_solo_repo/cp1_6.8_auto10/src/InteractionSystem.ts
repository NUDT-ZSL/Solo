import * as THREE from 'three';
import { EcologyManager, TerrainType } from './EcologyManager';
import { InteractivePoint } from './TerrainEngine';

export interface EchoParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export interface InteractionEvent {
  type: TerrainType;
  label: string;
  position: THREE.Vector3;
  timestamp: number;
}

export type CardData = {
  visible: boolean;
  terrainName: string;
  ecologyIndex: number;
  interactionLog: string[];
  label: string;
  screenX: number;
  screenY: number;
} | null;

export class InteractionSystem {
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private particles: EchoParticle[] = [];
  private particleGroup: THREE.Group;
  private echoRings: THREE.Mesh[] = [];
  private echoGroup: THREE.Group;
  private ecology: EcologyManager;
  private activeCard: CardData = null;
  private cardListeners: Set<(card: CardData) => void> = new Set();

  constructor(ecology: EcologyManager) {
    this.ecology = ecology;
    this.particleGroup = new THREE.Group();
    this.echoGroup = new THREE.Group();
  }

  getParticleGroup(): THREE.Group {
    return this.particleGroup;
  }

  getEchoGroup(): THREE.Group {
    return this.echoGroup;
  }

  subscribeCard(listener: (card: CardData) => void): () => void {
    this.cardListeners.add(listener);
    return () => this.cardListeners.delete(listener);
  }

  getCard(): CardData {
    return this.activeCard;
  }

  handleClick(
    event: MouseEvent,
    camera: THREE.Camera,
    interactivePoints: InteractivePoint[],
    container: HTMLElement
  ): void {
    const rect = container.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, camera);

    const meshes = interactivePoints.map((p) => p.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const point = interactivePoints.find((p) => p.mesh === hitMesh);
      if (point) {
        this.triggerEcho(point, intersects[0].point);
      }
    } else {
      this.dismissCard();
    }
  }

  private triggerEcho(point: InteractivePoint, worldPos: THREE.Vector3): void {
    this.spawnParticles(point.type, worldPos);
    this.spawnEchoRing(point.type, worldPos);
    this.animatePointExpansion(point);
    this.showCard(point, worldPos);
    this.ecology.recordInteraction(point.type, `探索了${point.label}`);
  }

  private spawnParticles(type: TerrainType, position: THREE.Vector3): void {
    const count = 30 + Math.floor(this.ecology.getActiveParticleRatio() * 40);
    const color = this.getParticleColor(type);

    for (let i = 0; i < count; i++) {
      const size = 0.02 + Math.random() * 0.04;
      const geo = new THREE.SphereGeometry(size, 4, 4);
      const mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 1.0,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.copy(position);

      const dir = new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ).normalize();
      const speed = 0.5 + Math.random() * 1.5;
      const velocity = dir.multiplyScalar(speed);

      const maxLife = 1.0 + Math.random() * 1.5;
      this.particles.push({ mesh, velocity, life: maxLife, maxLife });
      this.particleGroup.add(mesh);
    }
  }

  private spawnEchoRing(type: TerrainType, position: THREE.Vector3): void {
    const color = this.getParticleColor(type);
    const ringGeo = new THREE.RingGeometry(0.01, 0.05, 32);
    const ringMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.position.copy(position);
    ring.lookAt(0, 0, 0);
    ring.userData.expandSpeed = 1.5;
    ring.userData.life = 1.5;
    ring.userData.maxLife = 1.5;
    this.echoRings.push(ring);
    this.echoGroup.add(ring);
  }

  private animatePointExpansion(point: InteractivePoint): void {
    const original = point.baseScale;
    point.baseScale = original * 1.8;
    const startTime = performance.now();
    const duration = 600;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      point.baseScale = original + (original * 1.8 - original) * (1 - eased);
      if (t < 1) requestAnimationFrame(animate);
      else point.baseScale = original;
    };
    requestAnimationFrame(animate);
  }

  private showCard(point: InteractivePoint, worldPos: THREE.Vector3): void {
    const data = this.ecology.getTerrainData(point.type);
    this.activeCard = {
      visible: true,
      terrainName: data.name,
      ecologyIndex: Math.round(data.ecologyIndex),
      interactionLog: [...data.interactionLog],
      label: point.label,
      screenX: 0,
      screenY: 0,
    };
    this.cardListeners.forEach((fn) => fn(this.activeCard));
  }

  dismissCard(): void {
    this.activeCard = null;
    this.cardListeners.forEach((fn) => fn(null));
  }

  updateCardPosition(camera: THREE.Camera, container: HTMLElement): void {
    if (!this.activeCard) return;
  }

  private getParticleColor(type: TerrainType): number {
    switch (type) {
      case 'tundra': return 0x00ffaa;
      case 'crystal': return 0xdd66ff;
      case 'lava': return 0xff6600;
    }
  }

  update(delta: number): void {
    this.updateParticles(delta);
    this.updateEchoRings(delta);
  }

  private updateParticles(delta: number): void {
    const toRemove: number[] = [];

    this.particles.forEach((p, i) => {
      p.life -= delta;
      if (p.life <= 0) {
        toRemove.push(i);
        this.particleGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        return;
      }

      const lifeRatio = p.life / p.maxLife;
      p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
      p.velocity.multiplyScalar(0.98);
      (p.mesh.material as THREE.MeshBasicMaterial).opacity = lifeRatio;
      p.mesh.scale.setScalar(lifeRatio);
    });

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.particles.splice(toRemove[i], 1);
    }
  }

  private updateEchoRings(delta: number): void {
    const toRemove: number[] = [];

    this.echoRings.forEach((ring, i) => {
      ring.userData.life -= delta;
      if (ring.userData.life <= 0) {
        toRemove.push(i);
        this.echoGroup.remove(ring);
        ring.geometry.dispose();
        (ring.material as THREE.Material).dispose();
        return;
      }

      const lifeRatio = ring.userData.life / ring.userData.maxLife;
      const expansion = 1 - lifeRatio;
      const scale = 1 + expansion * ring.userData.expandSpeed * 3;
      ring.scale.setScalar(scale);
      (ring.material as THREE.MeshBasicMaterial).opacity = lifeRatio * 0.8;
    });

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.echoRings.splice(toRemove[i], 1);
    }
  }
}

export class AmbientParticleSystem {
  private groups: Record<TerrainType, THREE.Points> = {
    tundra: null!,
    crystal: null!,
    lava: null!,
  };
  private container: THREE.Group;
  private ecology: EcologyManager;

  constructor(ecology: EcologyManager) {
    this.ecology = ecology;
    this.container = new THREE.Group();
    this.createParticles();
  }

  getContainer(): THREE.Group {
    return this.container;
  }

  private createParticles(): void {
    this.groups.tundra = this.createSporParticles();
    this.groups.crystal = this.createCrystalDebris();
    this.groups.lava = this.createHeatParticles();
    this.container.add(this.groups.tundra);
    this.container.add(this.groups.crystal);
    this.container.add(this.groups.lava);
  }

  private createSporParticles(): THREE.Points {
    const count = 200;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 3.1 + Math.random() * 0.8;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      velocities[i * 3] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.userData = { velocities };
    const mat = new THREE.PointsMaterial({
      color: 0x44ffaa,
      size: 0.06,
      transparent: true,
      opacity: 0.6,
      sizeAttenuation: true,
    });
    return new THREE.Points(geo, mat);
  }

  private createCrystalDebris(): THREE.Points {
    const count = 150;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 3.05 + Math.random() * 0.6;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      velocities[i * 3] = (Math.random() - 0.5) * 0.008;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.008;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.008;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.userData = { velocities };
    const mat = new THREE.PointsMaterial({
      color: 0xcc88ff,
      size: 0.04,
      transparent: true,
      opacity: 0.5,
      sizeAttenuation: true,
    });
    return new THREE.Points(geo, mat);
  }

  private createHeatParticles(): THREE.Points {
    const count = 180;
    const positions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 3.08 + Math.random() * 1.0;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi);
      velocities[i * 3] = (Math.random() - 0.5) * 0.015;
      velocities[i * 3 + 1] = Math.random() * 0.02;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.015;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.userData = { velocities };
    const mat = new THREE.PointsMaterial({
      color: 0xff4400,
      size: 0.05,
      transparent: true,
      opacity: 0.4,
      sizeAttenuation: true,
    });
    return new THREE.Points(geo, mat);
  }

  update(time: number): void {
    const density = this.ecology.getActiveParticleRatio();

    Object.values(this.groups).forEach((points) => {
      if (!points) return;
      const pos = points.geometry.attributes.position as THREE.BufferAttribute;
      const velocities = points.geometry.userData.velocities as Float32Array;
      if (!velocities) return;

      const visibleCount = Math.floor(pos.count * density);
      points.geometry.setDrawRange(0, visibleCount);

      for (let i = 0; i < pos.count; i++) {
        let x = pos.getX(i) + velocities[i * 3];
        let y = pos.getY(i) + velocities[i * 3 + 1];
        let z = pos.getZ(i) + velocities[i * 3 + 2];

        const dist = Math.sqrt(x * x + y * y + z * z);
        if (dist > 4.5 || dist < 3.0) {
          velocities[i * 3] *= -1;
          velocities[i * 3 + 1] *= -1;
          velocities[i * 3 + 2] *= -1;
        }

        pos.setXYZ(i, x, y, z);
      }
      pos.needsUpdate = true;

      (points.material as THREE.PointsMaterial).opacity = 0.2 + density * 0.6;
    });
  }
}
