import * as THREE from 'three';
import { Maze } from './maze';

export interface PlayerState {
  position: THREE.Vector3;
  yaw: number;
  pitch: number;
  isMoving: boolean;
}

export class Player {
  private camera: THREE.PerspectiveCamera;
  private maze: Maze;
  private moveSpeed: number = 4;
  private mouseSensitivity: number = 0.002;
  private yaw: number = Math.PI / 4;
  private pitch: number = 0;
  private pitchMin: number = -Math.PI / 6;
  private pitchMax: number = Math.PI / 3;
  private collisionRadius: number = 0.4;
  private keys: { [key: string]: boolean } = {};
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;
  private isMoving: boolean = false;
  private bobTime: number = 0;
  private bobAmplitude: number = 0.005;
  private bobFrequency: number = Math.PI * 5;
  private baseCameraY: number = 1.6;
  private lastPosition: THREE.Vector3;
  private bounceBackCooldown: number = 0;
  private canvas: HTMLCanvasElement;
  public orbThrowRequested: boolean = false;

  constructor(camera: THREE.PerspectiveCamera, maze: Maze, canvas: HTMLCanvasElement) {
    this.camera = camera;
    this.maze = maze;
    this.canvas = canvas;
    this.lastPosition = new THREE.Vector3();
    this.setupEventListeners();
    this.setStartPosition();
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'Space') {
        this.orbThrowRequested = true;
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys[e.code] = false;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 0) {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
      }
    });

    window.addEventListener('mouseup', (e) => {
      if (e.button === 0) {
        this.isDragging = false;
      }
    });

    window.addEventListener('mousemove', (e) => {
      if (this.isDragging) {
        const dx = e.clientX - this.lastMouseX;
        const dy = e.clientY - this.lastMouseY;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.rotate(dx, dy);
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private setStartPosition(): void {
    const startCell = this.maze.cellToWorld(0, 0);
    this.camera.position.set(startCell.x, this.baseCameraY, startCell.z);
    this.lastPosition.copy(this.camera.position);
    this.yaw = Math.PI / 4;
    this.pitch = 0;
  }

  private rotate(dx: number, dy: number): void {
    this.yaw -= dx * this.mouseSensitivity;
    this.pitch -= dy * this.mouseSensitivity;
    this.pitch = Math.max(this.pitchMin, Math.min(this.pitchMax, this.pitch));
  }

  update(deltaTime: number, paused: boolean): void {
    if (paused) return;

    if (this.bounceBackCooldown > 0) {
      this.bounceBackCooldown -= deltaTime;
    }

    this.updateMovement(deltaTime);
    this.updateCameraRotation();
    this.updateHeadBob(deltaTime);
  }

  private updateMovement(deltaTime: number): void {
    const forward = new THREE.Vector3(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    const right = new THREE.Vector3(Math.cos(this.yaw), 0, -Math.sin(this.yaw));

    const moveDir = new THREE.Vector3();
    if (this.keys['KeyW']) moveDir.add(forward);
    if (this.keys['KeyS']) moveDir.sub(forward);
    if (this.keys['KeyD']) moveDir.add(right);
    if (this.keys['KeyA']) moveDir.sub(right);

    this.isMoving = moveDir.length() > 0;

    if (this.isMoving) {
      moveDir.normalize();
      const velocity = moveDir.multiplyScalar(this.moveSpeed * deltaTime);
      this.tryMove(velocity);
    }
  }

  private tryMove(velocity: THREE.Vector3): void {
    const newPos = this.camera.position.clone();
    const testPos = newPos.clone();

    testPos.x += velocity.x;
    if (!this.maze.checkCollision(testPos.x, this.camera.position.z, this.collisionRadius)) {
      this.lastPosition.copy(newPos);
      newPos.x = testPos.x;
    }

    testPos.copy(newPos);
    testPos.z += velocity.z;
    if (!this.maze.checkCollision(newPos.x, testPos.z, this.collisionRadius)) {
      this.lastPosition.copy(newPos);
      newPos.z = testPos.z;
    }

    this.camera.position.copy(newPos);
  }

  private updateCameraRotation(): void {
    const lookDir = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    );

    const target = this.camera.position.clone().add(lookDir);
    this.camera.lookAt(target);
  }

  private updateHeadBob(deltaTime: number): void {
    if (this.isMoving) {
      this.bobTime += deltaTime * this.bobFrequency;
      const bobY = Math.sin(this.bobTime) * this.bobAmplitude;
      const tiltX = Math.sin(this.bobTime * 0.5) * 0.005;
      this.camera.position.y = this.baseCameraY + bobY;
      this.camera.rotation.z = tiltX;
    } else {
      this.bobTime = 0;
      this.camera.position.y = THREE.MathUtils.lerp(
        this.camera.position.y,
        this.baseCameraY,
        deltaTime * 10
      );
      this.camera.rotation.z = THREE.MathUtils.lerp(
        this.camera.rotation.z,
        0,
        deltaTime * 10
      );
    }
  }

  getPosition(): THREE.Vector3 {
    return this.camera.position.clone();
  }

  getForwardDirection(): THREE.Vector3 {
    return new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    );
  }

  getState(): PlayerState {
    return {
      position: this.getPosition(),
      yaw: this.yaw,
      pitch: this.pitch,
      isMoving: this.isMoving,
    };
  }

  bounceBack(): void {
    if (this.bounceBackCooldown > 0) return;
    this.camera.position.copy(this.lastPosition);
    this.bounceBackCooldown = 0.5;
  }

  checkNearWall(): number {
    const pos = this.camera.position;
    const r = this.collisionRadius * 1.8;
    let minDist = Infinity;

    const checks = [
      { x: pos.x + r, z: pos.z },
      { x: pos.x - r, z: pos.z },
      { x: pos.x, z: pos.z + r },
      { x: pos.x, z: pos.z - r },
    ];

    for (const check of checks) {
      const cell = this.maze.worldToCell(check.x, check.z);
      const mazeCell = this.maze.getCell(cell.x, cell.y);
      if (!mazeCell) {
        minDist = 0;
        continue;
      }
      const localX = check.x - cell.x * this.maze.cellSize;
      const localZ = check.z - cell.y * this.maze.cellSize;
      const cs = this.maze.cellSize;

      if (mazeCell.walls.left && localX < r) minDist = Math.min(minDist, localX);
      if (mazeCell.walls.right && localX > cs - r) minDist = Math.min(minDist, cs - localX);
      if (mazeCell.walls.top && localZ < r) minDist = Math.min(minDist, localZ);
      if (mazeCell.walls.bottom && localZ > cs - r) minDist = Math.min(minDist, cs - localZ);
    }

    if (minDist === Infinity) return 0;
    const proximity = 1 - Math.min(minDist / r, 1);
    return proximity * proximity;
  }

  reset(): void {
    this.setStartPosition();
    this.keys = {};
    this.isDragging = false;
    this.isMoving = false;
    this.bobTime = 0;
    this.bounceBackCooldown = 0;
  }

  consumeOrbThrowRequest(): boolean {
    const req = this.orbThrowRequested;
    this.orbThrowRequested = false;
    return req;
  }
}
