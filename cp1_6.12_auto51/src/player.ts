import * as THREE from 'three';
import { TerrainData } from './scene';

export interface PlayerDisplayData {
  position: THREE.Vector3;
  direction: number;
  depth: number;
  speed: number;
  cooldown: number;
  cooldownMax: number;
}

const MOVE_SPEED = 6.0;
const FLOAT_AMPLITUDE = 0.15;
const FLOAT_FREQUENCY = 2.0;
const FOAM_EMIT_RATE = 0.02;
const FOAM_LIFETIME = 1.5;
const MAX_FOAM_PARTICLES = 200;

export class Player {
  private scene: THREE.Scene;
  private terrainData: TerrainData;
  private submarine: THREE.Group;
  private directionIndicator: THREE.ArrowHelper | null = null;
  private position: THREE.Vector3;
  private direction: number = 0;
  private floatPhase: number = 0;
  private foamParticles: {
    mesh: THREE.Mesh;
    velocity: THREE.Vector3;
    age: number;
    maxAge: number;
  }[] = [];
  private foamTimer: number = 0;
  private targetDirection: number = 0;
  private isMoving: boolean = false;
  private currentSpeed: number = 0;

  constructor(scene: THREE.Scene, terrainData: TerrainData) {
    this.scene = scene;
    this.terrainData = terrainData;
    this.position = new THREE.Vector3(0, 0, 0);
    this.position.y = terrainData.getHeight(0, 0) + 3;
    this.submarine = this.createSubmarine();
    this.submarine.position.copy(this.position);
    scene.add(this.submarine);
  }

  private createSubmarine(): THREE.Group {
    const group = new THREE.Group();

    const bodyGeo = new THREE.CapsuleGeometry(0.4, 2.0, 8, 16);
    const bodyMat = new THREE.MeshPhongMaterial({
      color: 0x556677,
      shininess: 40,
      specular: 0x334455,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.z = Math.PI / 2;
    group.add(body);

    const towerGeo = new THREE.CylinderGeometry(0.2, 0.25, 0.6, 8);
    const towerMat = new THREE.MeshPhongMaterial({ color: 0x445566, shininess: 30 });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(0, 0.5, -0.2);
    group.add(tower);

    const periscopeGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 6);
    const periscopeMat = new THREE.MeshPhongMaterial({ color: 0x667788 });
    const periscope = new THREE.Mesh(periscopeGeo, periscopeMat);
    periscope.position.set(0, 1.0, -0.2);
    group.add(periscope);

    const propGeo = new THREE.TorusGeometry(0.25, 0.05, 6, 8);
    const propMat = new THREE.MeshPhongMaterial({ color: 0x445566 });
    const prop = new THREE.Mesh(propGeo, propMat);
    prop.position.set(-1.4, 0, 0);
    prop.rotation.y = Math.PI / 2;
    group.add(prop);

    const lightGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xccddff });
    const light = new THREE.Mesh(lightGeo, lightMat);
    light.position.set(1.2, 0, 0);
    group.add(light);

    const spotLight = new THREE.SpotLight(0x88aacc, 2, 20, Math.PI / 6, 0.5);
    spotLight.position.set(1.2, 0, 0);
    spotLight.target.position.set(5, -1, 0);
    group.add(spotLight);
    group.add(spotLight.target);

    return group;
  }

  setDirectionIndicator(mouseWorld: THREE.Vector3): void {
    const dx = mouseWorld.x - this.position.x;
    const dz = mouseWorld.z - this.position.z;
    this.targetDirection = Math.atan2(dx, dz);

    if (this.directionIndicator) {
      this.scene.remove(this.directionIndicator);
    }

    const dir = new THREE.Vector3(Math.sin(this.targetDirection), 0, Math.cos(this.targetDirection));
    const origin = this.position.clone().add(new THREE.Vector3(0, 0.5, 0));
    this.directionIndicator = new THREE.ArrowHelper(dir, origin, 2.5, 0x00ccff, 0.4, 0.2);
    this.scene.add(this.directionIndicator);
  }

  update(delta: number, mouseWorld: THREE.Vector3 | null, mouseDown: boolean): void {
    if (mouseWorld) {
      this.setDirectionIndicator(mouseWorld);
    }

    const angleDiff = this.targetDirection - this.direction;
    let normalizedDiff = angleDiff;
    while (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2;
    while (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2;
    this.direction += normalizedDiff * Math.min(1, delta * 5);

    this.isMoving = mouseDown;
    if (this.isMoving) {
      this.currentSpeed = MOVE_SPEED;
      const moveX = Math.sin(this.direction) * MOVE_SPEED * delta;
      const moveZ = Math.cos(this.direction) * MOVE_SPEED * delta;
      this.position.x += moveX;
      this.position.z += moveZ;

      const halfSize = this.terrainData.width / 2 - 2;
      this.position.x = Math.max(-halfSize, Math.min(halfSize, this.position.x));
      this.position.z = Math.max(-halfSize, Math.min(halfSize, this.position.z));
    } else {
      this.currentSpeed = 0;
    }

    const terrainH = this.terrainData.getHeight(this.position.x, this.position.z);
    const targetY = terrainH + 3;
    this.position.y += (targetY - this.position.y) * Math.min(1, delta * 3);

    this.floatPhase += delta * FLOAT_FREQUENCY;
    const floatOffset = Math.sin(this.floatPhase) * FLOAT_AMPLITUDE;

    this.submarine.position.set(
      this.position.x,
      this.position.y + floatOffset,
      this.position.z
    );
    this.submarine.rotation.y = this.direction;

    const bankAngle = -normalizedDiff * 0.3;
    this.submarine.rotation.z += (bankAngle - this.submarine.rotation.z) * Math.min(1, delta * 5);

    if (this.directionIndicator) {
      const dir = new THREE.Vector3(Math.sin(this.targetDirection), 0, Math.cos(this.targetDirection));
      const origin = this.submarine.position.clone().add(new THREE.Vector3(0, 0.5, 0));
      this.directionIndicator.position.copy(origin);
      this.directionIndicator.setDirection(dir);
    }

    this.updateFoam(delta);
  }

  private updateFoam(delta: number): void {
    if (this.isMoving) {
      this.foamTimer += delta;
      while (this.foamTimer >= FOAM_EMIT_RATE && this.foamParticles.length < MAX_FOAM_PARTICLES) {
        this.foamTimer -= FOAM_EMIT_RATE;
        this.emitFoam();
      }
    } else {
      this.foamTimer = 0;
    }

    for (let i = this.foamParticles.length - 1; i >= 0; i--) {
      const p = this.foamParticles[i];
      p.age += delta;
      if (p.age >= p.maxAge) {
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.foamParticles.splice(i, 1);
        continue;
      }

      p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
      p.velocity.multiplyScalar(0.98);

      const lifeRatio = p.age / p.maxAge;
      const scale = 1.0 - lifeRatio * 0.5;
      p.mesh.scale.setScalar(scale);

      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - lifeRatio) * 0.6;
    }
  }

  private emitFoam(): void {
    const geo = new THREE.SphereGeometry(0.08, 4, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xddeeff,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);

    const tailOffset = -1.4;
    const sideOffset = (Math.random() - 0.5) * 0.4;
    mesh.position.set(
      this.position.x + Math.sin(this.direction + Math.PI) * tailOffset + Math.cos(this.direction) * sideOffset,
      this.position.y + Math.random() * 0.3,
      this.position.z + Math.cos(this.direction + Math.PI) * tailOffset - Math.sin(this.direction) * sideOffset
    );

    const velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.5,
      (Math.random() - 0.5) * 0.2,
      (Math.random() - 0.5) * 0.5
    );

    this.scene.add(mesh);
    this.foamParticles.push({
      mesh,
      velocity,
      age: 0,
      maxAge: FOAM_LIFETIME * (0.7 + Math.random() * 0.6),
    });
  }

  getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  getDirection(): number {
    return this.direction;
  }

  getDisplayData(cooldown: number, cooldownMax: number): PlayerDisplayData {
    return {
      position: this.position.clone(),
      direction: this.direction,
      depth: this.position.y,
      speed: this.currentSpeed,
      cooldown,
      cooldownMax,
    };
  }

  getSubmarine(): THREE.Group {
    return this.submarine;
  }
}
