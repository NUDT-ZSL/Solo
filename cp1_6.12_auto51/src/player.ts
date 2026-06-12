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

const MOVE_SPEED = 8.0;
const FLOAT_AMPLITUDE = 0.2;
const FLOAT_FREQUENCY = 1.5;
const FOAM_EMIT_RATE = 0.015;
const FOAM_LIFETIME = 1.8;
const MAX_FOAM_PARTICLES = 300;

export class Player {
  private scene: THREE.Scene;
  private terrainData: TerrainData;
  private submarine: THREE.Group;
  private directionArrow: THREE.ArrowHelper | null = null;
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

  private propeller: THREE.Mesh | null = null;
  private propellerSpeed: number = 0;

  constructor(scene: THREE.Scene, terrainData: TerrainData) {
    this.scene = scene;
    this.terrainData = terrainData;
    this.position = new THREE.Vector3(0, 0, 0);
    this.position.y = terrainData.getHeight(0, 0) + 4;
    this.submarine = this.createSubmarine();
    this.submarine.position.copy(this.position);
    scene.add(this.submarine);

    this.createDirectionArrow();
  }

  private createSubmarine(): THREE.Group {
    const group = new THREE.Group();

    const bodyGeo = new THREE.CapsuleGeometry(0.5, 2.5, 8, 16);
    const bodyMat = new THREE.MeshPhongMaterial({
      color: 0x667788,
      shininess: 60,
      specular: 0x445566,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.rotation.z = Math.PI / 2;
    group.add(body);

    const towerGeo = new THREE.BoxGeometry(0.8, 0.5, 0.6);
    const towerMat = new THREE.MeshPhongMaterial({ color: 0x556677, shininess: 40 });
    const tower = new THREE.Mesh(towerGeo, towerMat);
    tower.position.set(0, 0.65, -0.1);
    group.add(tower);

    const periscopeGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.9, 8);
    const periscopeMat = new THREE.MeshPhongMaterial({ color: 0x778899 });
    const periscope = new THREE.Mesh(periscopeGeo, periscopeMat);
    periscope.position.set(0, 1.35, -0.1);
    group.add(periscope);

    const headGeo = new THREE.SphereGeometry(0.12, 8, 8);
    const headMat = new THREE.MeshPhongMaterial({ color: 0x667788 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.set(0, 1.8, -0.1);
    group.add(head);

    const propGeo = new THREE.TorusGeometry(0.3, 0.06, 6, 8);
    const propMat = new THREE.MeshPhongMaterial({ color: 0x556677 });
    const prop = new THREE.Mesh(propGeo, propMat);
    prop.position.set(-1.8, 0, 0);
    prop.rotation.y = Math.PI / 2;
    group.add(prop);
    this.propeller = prop;

    const bladeGeo = new THREE.BoxGeometry(0.02, 0.5, 0.06);
    const bladeMat = new THREE.MeshPhongMaterial({ color: 0x445566 });
    for (let i = 0; i < 4; i++) {
      const blade = new THREE.Mesh(bladeGeo, bladeMat);
      blade.position.set(-1.8, 0, 0);
      blade.rotation.x = (i * Math.PI) / 4;
      group.add(blade);
    }

    const frontLightGeo = new THREE.SphereGeometry(0.15, 8, 8);
    const frontLightMat = new THREE.MeshBasicMaterial({ color: 0xaaddff });
    const frontLight = new THREE.Mesh(frontLightGeo, frontLightMat);
    frontLight.position.set(1.5, 0, 0);
    group.add(frontLight);

    const spotLight = new THREE.SpotLight(0x88bbff, 1.5, 25, Math.PI / 5, 0.4);
    spotLight.position.set(1.5, 0, 0);
    spotLight.target.position.set(6, 0, 0);
    group.add(spotLight);
    group.add(spotLight.target);

    const windowGeo = new THREE.CircleGeometry(0.18, 12);
    const windowMat = new THREE.MeshBasicMaterial({ color: 0x88ccff, side: THREE.DoubleSide });
    for (let i = 0; i < 3; i++) {
      const window1 = new THREE.Mesh(windowGeo, windowMat);
      window1.position.set(-0.5 + i * 0.5, 0.2, 0.51);
      group.add(window1);
      const window2 = new THREE.Mesh(windowGeo, windowMat);
      window2.position.set(-0.5 + i * 0.5, 0.2, -0.51);
      group.add(window2);
    }

    return group;
  }

  private createDirectionArrow(): void {
    const dir = new THREE.Vector3(0, 0, 1);
    const origin = this.position.clone().add(new THREE.Vector3(0, 0.8, 0));
    this.directionArrow = new THREE.ArrowHelper(
      dir,
      origin,
      3,
      0x00ddff,
      0.6,
      0.25
    );
    this.scene.add(this.directionArrow);
  }

  setTargetDirection(mouseWorld: THREE.Vector3): void {
    const dx = mouseWorld.x - this.position.x;
    const dz = mouseWorld.z - this.position.z;
    this.targetDirection = Math.atan2(dx, dz);
  }

  update(delta: number, mouseWorld: THREE.Vector3 | null, mouseDown: boolean): void {
    if (mouseWorld) {
      this.setTargetDirection(mouseWorld);
    }

    const angleDiff = this.targetDirection - this.direction;
    let normalizedDiff = angleDiff;
    while (normalizedDiff > Math.PI) normalizedDiff -= Math.PI * 2;
    while (normalizedDiff < -Math.PI) normalizedDiff += Math.PI * 2;
    this.direction += normalizedDiff * Math.min(1, delta * 6);

    this.isMoving = mouseDown;
    if (this.isMoving) {
      this.currentSpeed = MOVE_SPEED;
      this.propellerSpeed = 15;

      const moveX = Math.sin(this.direction) * MOVE_SPEED * delta;
      const moveZ = Math.cos(this.direction) * MOVE_SPEED * delta;
      this.position.x += moveX;
      this.position.z += moveZ;

      const halfSize = this.terrainData.width / 2 - 3;
      this.position.x = Math.max(-halfSize, Math.min(halfSize, this.position.x));
      this.position.z = Math.max(-halfSize, Math.min(halfSize, this.position.z));
    } else {
      this.currentSpeed *= 0.95;
      this.propellerSpeed *= 0.92;
    }

    const terrainH = this.terrainData.getHeight(this.position.x, this.position.z);
    const targetY = terrainH + 4;
    this.position.y += (targetY - this.position.y) * Math.min(1, delta * 2);

    this.floatPhase += delta * FLOAT_FREQUENCY;
    const floatOffset = Math.sin(this.floatPhase) * FLOAT_AMPLITUDE;
    const floatRoll = Math.sin(this.floatPhase * 0.7) * 0.03;

    this.submarine.position.set(
      this.position.x,
      this.position.y + floatOffset,
      this.position.z
    );
    this.submarine.rotation.y = this.direction - Math.PI / 2;

    const bankAngle = -normalizedDiff * 0.2;
    this.submarine.rotation.z += (bankAngle + floatRoll - this.submarine.rotation.z) * Math.min(1, delta * 4);

    if (this.directionArrow) {
      const dir = new THREE.Vector3(Math.sin(this.targetDirection), 0, Math.cos(this.targetDirection));
      const origin = this.submarine.position.clone().add(new THREE.Vector3(0, 0.8, 0));
      this.directionArrow.position.copy(origin);
      this.directionArrow.setDirection(dir);
      this.directionArrow.setLength(3, 0.6, 0.25);
    }

    if (this.propeller) {
      this.propeller.rotation.x += this.propellerSpeed * delta;
      this.submarine.children.forEach((child, idx) => {
        if (idx >= 4 && idx <= 7) {
          child.rotation.x += this.propellerSpeed * delta;
        }
      });
    }

    this.updateFoam(delta);
  }

  private updateFoam(delta: number): void {
    if (this.isMoving && this.currentSpeed > 1) {
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
      p.velocity.multiplyScalar(0.96);
      p.velocity.y += delta * 0.3;

      const lifeRatio = p.age / p.maxAge;
      const scale = 0.5 + lifeRatio * 1.5;
      p.mesh.scale.setScalar(scale);

      const mat = p.mesh.material as THREE.MeshBasicMaterial;
      mat.opacity = (1 - lifeRatio) * 0.7;
    }
  }

  private emitFoam(): void {
    const size = 0.06 + Math.random() * 0.08;
    const geo = new THREE.SphereGeometry(size, 4, 4);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xe8f4ff,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geo, mat);

    const tailDist = 2.0;
    const sideOffset = (Math.random() - 0.5) * 0.6;
    const upOffset = (Math.random() - 0.5) * 0.3;

    const baseX = this.position.x - Math.sin(this.direction) * tailDist;
    const baseZ = this.position.z - Math.cos(this.direction) * tailDist;
    const sideX = Math.cos(this.direction) * sideOffset;
    const sideZ = -Math.sin(this.direction) * sideOffset;

    mesh.position.set(
      baseX + sideX,
      this.position.y + upOffset,
      baseZ + sideZ
    );

    const spread = 1.5;
    const velocity = new THREE.Vector3(
      -Math.sin(this.direction) * spread + (Math.random() - 0.5) * 0.8,
      Math.random() * 0.5,
      -Math.cos(this.direction) * spread + (Math.random() - 0.5) * 0.8
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
