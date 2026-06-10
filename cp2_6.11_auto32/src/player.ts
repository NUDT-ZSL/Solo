import * as THREE from 'three';
import { Maze } from './maze';

export interface PlayerInput {
  forward: boolean;
  backward: boolean;
  left: boolean;
  right: boolean;
}

interface TrailPoint {
  mesh: THREE.Mesh;
  createdAt: number;
}

export class Player {
  public position: THREE.Vector3;
  public camera: THREE.PerspectiveCamera;
  public group: THREE.Group;
  public yaw = 0;
  private speed = 2;
  private playerHeight = 1.6;
  private trailPoints: TrailPoint[] = [];
  private trailLength = 8;
  private lastTrailTime = 0;
  private trailInterval = 0.06;
  private isMoving = false;
  private maze: Maze;

  constructor(camera: THREE.PerspectiveCamera, maze: Maze) {
    this.maze = maze;
    this.camera = camera;
    this.group = new THREE.Group();
    this.position = new THREE.Vector3(
      -maze.width / 2 + 0.5,
      this.playerHeight,
      -maze.height / 2 + 0.5
    );
    this.syncCamera();
  }

  private syncCamera(): void {
    this.camera.position.copy(this.position);
  }

  public update(dt: number, input: PlayerInput, elapsed: number): void {
    const dir = new THREE.Vector3();
    const forward = new THREE.Vector3(0, 0, -1);
    const right = new THREE.Vector3(1, 0, 0);

    if (input.forward) dir.add(forward);
    if (input.backward) dir.sub(forward);
    if (input.right) dir.add(right);
    if (input.left) dir.sub(right);

    this.isMoving = dir.lengthSq() > 0;

    if (this.isMoving) {
      dir.normalize();
      const delta = dir.multiplyScalar(this.speed * dt);

      const newX = this.position.x + delta.x;
      const newZ = this.position.z + delta.z;

      const radius = 0.25;
      if (!this.maze.isWall(newX, this.position.z, radius)) {
        this.position.x = newX;
      }
      if (!this.maze.isWall(this.position.x, newZ, radius)) {
        this.position.z = newZ;
      }

      this.position.x = THREE.MathUtils.clamp(this.position.x, -this.maze.width / 2 + radius, this.maze.width / 2 - radius);
      this.position.z = THREE.MathUtils.clamp(this.position.z, -this.maze.height / 2 + radius, this.maze.height / 2 - radius);

      if (elapsed - this.lastTrailTime > this.trailInterval) {
        this.addTrailPoint(elapsed);
        this.lastTrailTime = elapsed;
      }
    }

    this.updateTrail(elapsed);
    this.syncCamera();
  }

  private addTrailPoint(elapsed: number): void {
    const geo = new THREE.SphereGeometry(0.08, 8, 8);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x8E2DE2,
      transparent: true,
      opacity: 1
    });
    const sphere = new THREE.Mesh(geo, mat);
    sphere.position.set(this.position.x, 0.5, this.position.z);
    this.group.add(sphere);
    this.trailPoints.push({ mesh: sphere, createdAt: elapsed });

    while (this.trailPoints.length > 60) {
      const oldest = this.trailPoints.shift();
      if (oldest) {
        this.group.remove(oldest.mesh);
        oldest.mesh.geometry.dispose();
        (oldest.mesh.material as THREE.Material).dispose();
      }
    }
  }

  private updateTrail(elapsed: number): void {
    const fadeDuration = 2;
    const maxTrailTime = this.trailLength / this.speed;
    const effectiveDuration = Math.max(fadeDuration, maxTrailTime);

    for (let i = this.trailPoints.length - 1; i >= 0; i--) {
      const tp = this.trailPoints[i];
      const age = elapsed - tp.createdAt;
      if (age > effectiveDuration) {
        this.group.remove(tp.mesh);
        tp.mesh.geometry.dispose();
        (tp.mesh.material as THREE.Material).dispose();
        this.trailPoints.splice(i, 1);
      } else {
        const alpha = 1 - age / effectiveDuration;
        (tp.mesh.material as THREE.MeshBasicMaterial).opacity = alpha * alpha;
        const scale = Math.max(0.2, alpha);
        tp.mesh.scale.setScalar(scale);
      }
    }
  }

  public reset(maze: Maze): void {
    this.maze = maze;
    this.position.set(
      -maze.width / 2 + 0.5,
      this.playerHeight,
      -maze.height / 2 + 0.5
    );
    for (const tp of this.trailPoints) {
      this.group.remove(tp.mesh);
      tp.mesh.geometry.dispose();
      (tp.mesh.material as THREE.Material).dispose();
    }
    this.trailPoints = [];
    this.syncCamera();
  }
}
