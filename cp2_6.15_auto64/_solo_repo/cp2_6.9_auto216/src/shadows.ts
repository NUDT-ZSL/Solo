import * as THREE from 'three';
import { MazeGenerator, CELL_SIZE } from './mazeGenerator';

export interface ShadowState {
  position: THREE.Vector3;
  speed: number;
  active: boolean;
}

export class ShadowEntity {
  private scene: THREE.Scene;
  private mesh: THREE.Group;
  private position: THREE.Vector3;
  private targetPosition: THREE.Vector3;
  private speed: number;
  private baseSpeed: number;
  private maxSpeedMultiplier: number = 1.3;
  private active: boolean = false;
  private mazeGenerator: MazeGenerator;
  private mazeSize: number;
  private reformCount: number = 0;
  private playerRadius: number = 0.4;
  private shadowRadius: number = 0.5;

  constructor(scene: THREE.Scene, mazeGenerator: MazeGenerator) {
    this.scene = scene;
    this.mazeGenerator = mazeGenerator;
    this.mazeSize = mazeGenerator.getSize();

    this.baseSpeed = 5 * 0.7;
    this.speed = this.baseSpeed;

    this.position = new THREE.Vector3(
      (this.mazeSize - 1) * CELL_SIZE,
      1.0,
      (this.mazeSize - 1) * CELL_SIZE
    );
    this.targetPosition = this.position.clone();

    this.mesh = this.createShadowMesh();
    this.mesh.position.copy(this.position);
    this.scene.add(this.mesh);
  }

  private createShadowMesh(): THREE.Group {
    const group = new THREE.Group();

    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x000000,
      transparent: true,
      opacity: 0.6,
      roughness: 0.9,
      metalness: 0.1
    });

    const bodyGeo = new THREE.CapsuleGeometry(0.35, 0.8, 4, 8);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.9;
    group.add(body);

    const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.y = 1.7;
    group.add(head);

    const eyeMat = new THREE.MeshBasicMaterial({
      color: 0xFF0000,
      transparent: true,
      opacity: 0.8
    });
    const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat);
    leftEye.position.set(-0.1, 1.75, 0.25);
    group.add(leftEye);

    const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), eyeMat);
    rightEye.position.set(0.1, 1.75, 0.25);
    group.add(rightEye);

    const haloLight = new THREE.PointLight(0x4A0000, 0.5, 3);
    haloLight.position.set(0, 1.5, 0);
    group.add(haloLight);

    (group as any).pulseTime = 0;
    return group;
  }

  activate(): void {
    this.active = true;
  }

  deactivate(): void {
    this.active = false;
  }

  reset(startX: number = 0, startZ: number = 0): void {
    const mirrorX = (this.mazeSize - 1) - startX;
    const mirrorZ = (this.mazeSize - 1) - startZ;
    this.position.set(
      mirrorX * CELL_SIZE,
      1.0,
      mirrorZ * CELL_SIZE
    );
    this.targetPosition.copy(this.position);
    this.mesh.position.copy(this.position);
    this.speed = this.baseSpeed;
    this.reformCount = 0;
    this.active = false;
  }

  notifyReform(): void {
    this.reformCount++;
    const multiplier = Math.min(
      0.7 + this.reformCount * 0.1,
      this.maxSpeedMultiplier
    );
    this.speed = 5 * multiplier;
  }

  update(deltaTime: number, playerPosition: THREE.Vector3, elapsedTime: number): void {
    if (!this.active) {
      this.updateIdleAnimation(elapsedTime);
      return;
    }

    const playerCellX = Math.round(playerPosition.x / CELL_SIZE);
    const playerCellZ = Math.round(playerPosition.z / CELL_SIZE);
    const shadowCellX = Math.round(this.position.x / CELL_SIZE);
    const shadowCellZ = Math.round(this.position.z / CELL_SIZE);

    if (Math.abs(this.position.x - this.targetPosition.x) < 0.1 &&
        Math.abs(this.position.z - this.targetPosition.z) < 0.1) {
      const nextPos = this.findNextStep(shadowCellX, shadowCellZ, playerCellX, playerCellZ);
      if (nextPos) {
        this.targetPosition.set(
          nextPos.x * CELL_SIZE,
          1.0,
          nextPos.z * CELL_SIZE
        );
      }
    }

    const dir = new THREE.Vector3()
      .subVectors(this.targetPosition, this.position);
    dir.y = 0;

    if (dir.length() > 0.01) {
      dir.normalize();
      const moveDistance = this.speed * deltaTime;
      this.position.x += dir.x * moveDistance;
      this.position.z += dir.z * moveDistance;

      const collision = this.mazeGenerator.checkWallCollision(
        this.position.x,
        this.position.z,
        this.shadowRadius
      );
      this.position.x = collision.x;
      this.position.z = collision.z;

      const targetAngle = Math.atan2(dir.x, dir.z);
      this.mesh.rotation.y = this.lerpAngle(
        this.mesh.rotation.y,
        targetAngle,
        deltaTime * 5
      );
    }

    this.mesh.position.copy(this.position);
    this.updateIdleAnimation(elapsedTime);
  }

  private updateIdleAnimation(elapsedTime: number): void {
    const data = this.mesh as any;
    data.pulseTime = elapsedTime;

    this.mesh.traverse((obj) => {
      if (obj instanceof THREE.PointLight) {
        obj.intensity = 0.3 + 0.3 * Math.sin(elapsedTime * 4);
      }
    });

    if (this.mesh.children[0] instanceof THREE.Mesh) {
      this.mesh.children[0].scale.y = 1 + Math.sin(elapsedTime * 3) * 0.05;
    }
  }

  private findNextStep(fromX: number, fromZ: number, toX: number, toZ: number): { x: number; z: number } | null {
    if (fromX === toX && fromZ === toZ) {
      return null;
    }

    const path = this.bfs(fromX, fromZ, toX, toZ);
    if (path && path.length > 1) {
      return path[1];
    }

    return null;
  }

  private bfs(startX: number, startZ: number, endX: number, endZ: number): { x: number; z: number }[] | null {
    const visited: boolean[][] = [];
    const parent: ({ x: number; z: number } | null)[][] = [];

    for (let x = 0; x < this.mazeSize; x++) {
      visited[x] = [];
      parent[x] = [];
      for (let z = 0; z < this.mazeSize; z++) {
        visited[x][z] = false;
        parent[x][z] = null;
      }
    }

    const queue: { x: number; z: number }[] = [{ x: startX, z: startZ }];
    visited[startX][startZ] = true;

    const directions = [
      { dx: 1, dz: 0 },
      { dx: -1, dz: 0 },
      { dx: 0, dz: 1 },
      { dx: 0, dz: -1 }
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current.x === endX && current.z === endZ) {
        const path: { x: number; z: number }[] = [];
        let node: { x: number; z: number } | null = current;
        while (node) {
          path.unshift(node);
          node = parent[node.x][node.z];
        }
        return path;
      }

      for (const dir of directions) {
        const nx = current.x + dir.dx;
        const nz = current.z + dir.dz;

        if (nx >= 0 && nx < this.mazeSize && nz >= 0 && nz < this.mazeSize &&
            !visited[nx][nz] &&
            this.mazeGenerator.canMove(current.x, current.z, nx, nz)) {
          visited[nx][nz] = true;
          parent[nx][nz] = current;
          queue.push({ x: nx, z: nz });
        }
      }
    }

    return null;
  }

  private lerpAngle(a: number, b: number, t: number): number {
    const diff = b - a;
    const adjusted = ((diff + Math.PI) % (Math.PI * 2)) - Math.PI;
    return a + adjusted * Math.min(t, 1);
  }

  checkPlayerCollision(playerPosition: THREE.Vector3): boolean {
    const dist = Math.sqrt(
      Math.pow(this.position.x - playerPosition.x, 2) +
      Math.pow(this.position.z - playerPosition.z, 2)
    );
    return dist < 1.5;
  }

  getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  getState(): ShadowState {
    return {
      position: this.position.clone(),
      speed: this.speed,
      active: this.active
    };
  }

  getMesh(): THREE.Group {
    return this.mesh;
  }

  dispose(): void {
    this.scene.remove(this.mesh);
    this.mesh.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
      }
    });
  }
}
