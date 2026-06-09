import * as THREE from 'three';
import { MazeGenerator, CELL_SIZE } from './mazeGenerator';
import { ShadowEntity } from './shadows';

export interface PlayerState {
  position: THREE.Vector3;
  cameraRotation: { yaw: number; pitch: number };
  currentCell: { x: number; z: number };
  velocity: THREE.Vector3;
  isMoving: boolean;
  isBoosting: boolean;
  boostRemaining: number;
  boostCooldown: number;
  fragmentsCollected: number;
  totalFragments: number;
  onReform: (cellX: number, cellZ: number) => void;
  onFragmentCollected: (cellX: number, cellZ: number) => void;
  onReachExit: () => void;
  onShadowCaught: () => void;
}

export class PlayerController {
  private camera: THREE.PerspectiveCamera;
  private mazeGenerator: MazeGenerator;
  private shadowEntity: ShadowEntity;
  private position: THREE.Vector3;
  private velocity: THREE.Vector3;
  private yaw: number = 0;
  private pitch: number = 0;
  private currentCellX: number = 0;
  private currentCellZ: number = 0;
  private lastCellX: number = 0;
  private lastCellZ: number = 0;

  private keys: Record<string, boolean> = {};
  private isDragging: boolean = false;
  private lastMouseX: number = 0;
  private lastMouseY: number = 0;

  private readonly baseSpeed: number = 5;
  private readonly boostMultiplier: number = 2;
  private readonly boostDuration: number = 2;
  private readonly boostCooldownTime: number = 3;
  private boostRemaining: number = this.boostDuration;
  private boostCooldown: number = 0;
  private isBoosting: boolean = false;

  private readonly mouseSensitivity: number = 0.3;
  private readonly dampingFactor: number = 0.08;
  private readonly playerRadius: number = 0.4;
  private readonly playerHeight: number = 1.6;

  private fragmentsCollected: number = 0;
  private totalFragments: number = 3;
  private reformCooldown: number = 0;
  private readonly reformCooldownTime: number = 0.3;

  private canvas: HTMLCanvasElement;
  private listenersAttached: boolean = false;

  private onReformCallback: ((cellX: number, cellZ: number) => void) | null = null;
  private onFragmentCollectedCallback: ((cellX: number, cellZ: number) => void) | null = null;
  private onReachExitCallback: (() => void) | null = null;
  private onShadowCaughtCallback: (() => void) | null = null;

  private smoothPosition: THREE.Vector3;

  constructor(
    camera: THREE.PerspectiveCamera,
    mazeGenerator: MazeGenerator,
    shadowEntity: ShadowEntity,
    canvas: HTMLCanvasElement
  ) {
    this.camera = camera;
    this.mazeGenerator = mazeGenerator;
    this.shadowEntity = shadowEntity;
    this.canvas = canvas;

    this.position = new THREE.Vector3(0, this.playerHeight, 0);
    this.velocity = new THREE.Vector3();
    this.smoothPosition = this.position.clone();

    this.currentCellX = 0;
    this.currentCellZ = 0;
    this.lastCellX = 0;
    this.lastCellZ = 0;

    this.updateCameraPosition();
  }

  attachEventListeners(): void {
    if (this.listenersAttached) return;

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mouseup', this.handleMouseUp);
    window.addEventListener('mousemove', this.handleMouseMove);

    this.listenersAttached = true;
  }

  detachEventListeners(): void {
    if (!this.listenersAttached) return;

    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.canvas.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mouseup', this.handleMouseUp);
    window.removeEventListener('mousemove', this.handleMouseMove);

    this.listenersAttached = false;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.keys[e.code] = true;

    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      if (this.boostCooldown <= 0 && this.boostRemaining > 0) {
        this.isBoosting = true;
      }
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys[e.code] = false;

    if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') {
      this.isBoosting = false;
    }
  };

  private handleMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.isDragging = true;
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
    }
  };

  private handleMouseUp = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.isDragging = false;
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;

    this.yaw -= deltaX * this.mouseSensitivity * 0.01;
    this.pitch -= deltaY * this.mouseSensitivity * 0.01;

    const maxPitch = Math.PI / 2 - 0.1;
    this.pitch = Math.max(-maxPitch, Math.min(maxPitch, this.pitch));

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };

  update(deltaTime: number): void {
    if (this.boostCooldown > 0) {
      this.boostCooldown -= deltaTime;
    }

    if (this.isBoosting) {
      this.boostRemaining -= deltaTime;
      if (this.boostRemaining <= 0) {
        this.boostRemaining = 0;
        this.isBoosting = false;
        this.boostCooldown = this.boostCooldownTime;
      }
    } else if (this.boostRemaining < this.boostDuration && this.boostCooldown <= 0) {
      this.boostRemaining = Math.min(this.boostDuration, this.boostRemaining + deltaTime * 0.5);
    }

    if (this.reformCooldown > 0) {
      this.reformCooldown -= deltaTime;
    }

    const inputDir = this.getInputDirection();
    let speed = this.baseSpeed;
    if (this.isBoosting) {
      speed *= this.boostMultiplier;
    }

    const targetVelocity = new THREE.Vector3(
      inputDir.x * speed,
      0,
      inputDir.z * speed
    );

    this.velocity.lerp(targetVelocity, this.dampingFactor * 10);

    let newX = this.position.x + this.velocity.x * deltaTime;
    let newZ = this.position.z + this.velocity.z * deltaTime;

    const collision = this.mazeGenerator.checkWallCollision(newX, newZ, this.playerRadius);
    newX = collision.x;
    newZ = collision.z;

    const mazeSize = this.mazeGenerator.getSize() * CELL_SIZE;
    const halfCell = CELL_SIZE / 2;
    newX = Math.max(halfCell, Math.min(mazeSize - halfCell, newX));
    newZ = Math.max(halfCell, Math.min(mazeSize - halfCell, newZ));

    this.position.x = newX;
    this.position.z = newZ;

    this.smoothPosition.lerp(this.position, 1 - this.dampingFactor);

    this.currentCellX = Math.round(this.position.x / CELL_SIZE);
    this.currentCellZ = Math.round(this.position.z / CELL_SIZE);

    if ((this.currentCellX !== this.lastCellX || this.currentCellZ !== this.lastCellZ)
        && this.reformCooldown <= 0) {
      this.lastCellX = this.currentCellX;
      this.lastCellZ = this.currentCellZ;
      this.reformCooldown = this.reformCooldownTime;

      if (this.onReformCallback) {
        this.onReformCallback(this.currentCellX, this.currentCellZ);
      }
    }

    this.checkFragmentCollection();
    this.checkExit();
    this.checkShadowCollision();
    this.updateCameraPosition();
  }

  private getInputDirection(): THREE.Vector3 {
    const dir = new THREE.Vector3();

    const forward = new THREE.Vector3(
      -Math.sin(this.yaw),
      0,
      -Math.cos(this.yaw)
    );
    const right = new THREE.Vector3(
      Math.cos(this.yaw),
      0,
      -Math.sin(this.yaw)
    );

    if (this.keys['KeyW']) dir.add(forward);
    if (this.keys['KeyS']) dir.sub(forward);
    if (this.keys['KeyD']) dir.add(right);
    if (this.keys['KeyA']) dir.sub(right);

    if (dir.lengthSq() > 0) {
      dir.normalize();
    }

    return dir;
  }

  private checkFragmentCollection(): void {
    const collected = this.mazeGenerator.collectFragment(this.currentCellX, this.currentCellZ);
    if (collected) {
      this.fragmentsCollected++;
      if (this.onFragmentCollectedCallback) {
        this.onFragmentCollectedCallback(this.currentCellX, this.currentCellZ);
      }
    }
  }

  private checkExit(): void {
    if (this.mazeGenerator.isExitAt(this.currentCellX, this.currentCellZ)
        && this.mazeGenerator.isExitUnlocked()) {
      if (this.onReachExitCallback) {
        this.onReachExitCallback();
      }
    }
  }

  private checkShadowCollision(): void {
    if (this.shadowEntity.checkPlayerCollision(this.position)) {
      if (this.onShadowCaughtCallback) {
        this.onShadowCaughtCallback();
      }
    }
  }

  private updateCameraPosition(): void {
    this.camera.position.copy(this.smoothPosition);

    const lookDir = new THREE.Vector3(
      -Math.sin(this.yaw) * Math.cos(this.pitch),
      Math.sin(this.pitch),
      -Math.cos(this.yaw) * Math.cos(this.pitch)
    );

    const target = new THREE.Vector3().copy(this.smoothPosition).add(lookDir);
    this.camera.lookAt(target);
  }

  reset(): void {
    this.position.set(0, this.playerHeight, 0);
    this.smoothPosition.copy(this.position);
    this.velocity.set(0, 0, 0);
    this.yaw = 0;
    this.pitch = 0;
    this.currentCellX = 0;
    this.currentCellZ = 0;
    this.lastCellX = 0;
    this.lastCellZ = 0;
    this.fragmentsCollected = 0;
    this.boostRemaining = this.boostDuration;
    this.boostCooldown = 0;
    this.isBoosting = false;
    this.reformCooldown = 0;
    this.keys = {};
    this.updateCameraPosition();
  }

  getState(): PlayerState {
    return {
      position: this.position.clone(),
      cameraRotation: { yaw: this.yaw, pitch: this.pitch },
      currentCell: { x: this.currentCellX, z: this.currentCellZ },
      velocity: this.velocity.clone(),
      isMoving: this.velocity.lengthSq() > 0.1,
      isBoosting: this.isBoosting,
      boostRemaining: this.boostRemaining,
      boostCooldown: this.boostCooldown,
      fragmentsCollected: this.fragmentsCollected,
      totalFragments: this.totalFragments,
      onReform: () => {},
      onFragmentCollected: () => {},
      onReachExit: () => {},
      onShadowCaught: () => {}
    };
  }

  getPosition(): THREE.Vector3 {
    return this.position.clone();
  }

  getBoostInfo(): { remaining: number; max: number; cooldown: number; isActive: boolean } {
    return {
      remaining: this.boostRemaining,
      max: this.boostDuration,
      cooldown: this.boostCooldown,
      isActive: this.isBoosting
    };
  }

  setOnReform(callback: (cellX: number, cellZ: number) => void): void {
    this.onReformCallback = callback;
  }

  setOnFragmentCollected(callback: (cellX: number, cellZ: number) => void): void {
    this.onFragmentCollectedCallback = callback;
  }

  setOnReachExit(callback: () => void): void {
    this.onReachExitCallback = callback;
  }

  setOnShadowCaught(callback: () => void): void {
    this.onShadowCaughtCallback = callback;
  }

  getFragmentsCollected(): number {
    return this.fragmentsCollected;
  }

  getTotalFragments(): number {
    return this.totalFragments;
  }
}
