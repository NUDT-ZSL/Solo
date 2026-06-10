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
  startPos: THREE.Vector3;
}

export class Player {
  public position: THREE.Vector3;
  public camera: THREE.PerspectiveCamera;
  public group: THREE.Group;
  private speed = 2;
  private playerHeight = 1.6;
  private trailPoints: TrailPoint[] = [];
  private trailDuration = 4;
  private trailSpacing = 0.05;
  private lastTrailTime = 0;
  private maze: Maze;
  private radius = 0.3;

  constructor(camera: THREE.PerspectiveCamera, maze: Maze) {
    this.maze = maze;
    this.camera = camera;
    this.group = new THREE.Group();
    this.position = new THREE.Vector3();
    this.reset(maze);
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

    const isMoving = dir.lengthSq() > 0;

    if (isMoving) {
      dir.normalize();
      const moveDist = this.speed * dt;
      const delta = dir.multiplyScalar(moveDist);

      const newX = this.position.x + delta.x;
      const newZ = this.position.z + delta.z;

      if (!this.maze.isWall(newX, this.position.z, this.radius)) {
        this.position.x = newX;
      }
      if (!this.maze.isWall(this.position.x, newZ, this.radius)) {
        this.position.z = newZ;
      }

      const minX = -this.maze.width / 2 + this.radius;
      const maxX = this.maze.width / 2 - this.radius;
      const minZ = -this.maze.height / 2 + this.radius;
      const maxZ = this.maze.height / 2 - this.radius;

      this.position.x = THREE.MathUtils.clamp(this.position.x, minX, maxX);
      this.position.z = THREE.MathUtils.clamp(this.position.z, minZ, maxZ);

      if (elapsed - this.lastTrailTime > this.trailSpacing) {
        this.addTrailPoint(elapsed);
        this.lastTrailTime = elapsed;
      }
    }

    this.updateTrail(elapsed);
    this.syncCamera();
  }

  private addTrailPoint(elapsed: number): void {
    const geo = new THREE.SphereGeometry(0.07, 12, 12);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x9B30FF,
      transparent: true,
      opacity: 1
    });
    const sphere = new THREE.Mesh(geo, mat);
    sphere.position.set(this.position.x, 0.6, this.position.z);
    this.group.add(sphere);
    this.trailPoints.push({
      mesh: sphere,
      createdAt: elapsed,
      startPos: sphere.position.clone()
    });

    while (this.trailPoints.length > 100) {
      const oldest = this.trailPoints.shift();
      if (oldest) {
        this.group.remove(oldest.mesh);
        oldest.mesh.geometry.dispose();
        (oldest.mesh.material as THREE.Material).dispose();
      }
    }
  }

  private updateTrail(elapsed: number): void {
    for (let i = this.trailPoints.length - 1; i >= 0; i--) {
      const tp = this.trailPoints[i];
      const age = elapsed - tp.createdAt;

      if (age > this.trailDuration) {
        this.group.remove(tp.mesh);
        tp.mesh.geometry.dispose();
        (tp.mesh.material as THREE.Material).dispose();
        this.trailPoints.splice(i, 1);
      } else {
        const alpha = 1 - age / this.trailDuration;
        const easeAlpha = alpha * alpha;
        const mat = tp.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = easeAlpha;
        const s = 0.2 + 0.8 * alpha;
        tp.mesh.scale.setScalar(s);
        mat.color.setHSL(0.75 + 0.05 * (1 - alpha), 1, 0.6 + 0.2 * alpha);
      }
    }
  }

  public reset(maze: Maze): void {
    this.maze = maze;
    const start = maze.getStartPosition();
    this.position.set(start.x, this.playerHeight, start.z);

    for (const tp of this.trailPoints) {
      this.group.remove(tp.mesh);
      tp.mesh.geometry.dispose();
      (tp.mesh.material as THREE.Material).dispose();
    }
    this.trailPoints = [];
    this.lastTrailTime = 0;
    this.syncCamera();
  }
}
