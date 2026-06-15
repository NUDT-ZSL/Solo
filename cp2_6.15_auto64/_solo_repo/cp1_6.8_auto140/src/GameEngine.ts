import * as THREE from 'three';
import { MazeBuilder, BlockType, createLevelConfigs, LevelConfig, MazeBlock } from './MazeBuilder';
import { CameraController } from './CameraController';

const BLOCK_SIZE = 1;
const BLOCK_GAP = 0.05;
const SPACING = BLOCK_SIZE + BLOCK_GAP;

export interface GameState {
  currentLevel: number;
  totalLevels: number;
  levelName: string;
  steps: number;
  isCompleted: boolean;
  isLevelComplete: boolean;
  playerGridPos: { x: number; y: number; z: number };
}

type StateChangeListener = (state: GameState) => void;

export class GameEngine {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private cameraController: CameraController;
  private mazeBuilder: MazeBuilder;
  private raycaster: THREE.Raycaster;

  private levels: LevelConfig[];
  private currentLevelIndex: number = 0;

  private playerPosition: THREE.Vector3 = new THREE.Vector3();
  private playerGridPos: { x: number; y: number; z: number } = { x: 0, y: 0, z: 0 };
  private playerTargetPosition: THREE.Vector3 = new THREE.Vector3();
  private isMoving: boolean = false;
  private moveSpeed: number = 5;

  private steps: number = 0;
  private isCompleted: boolean = false;
  private isLevelComplete: boolean = false;

  private playerMesh: THREE.Mesh;
  private playerGlow: THREE.PointLight;

  private animationId: number = 0;
  private lastTime: number = 0;
  private listeners: StateChangeListener[] = [];

  private doubleClickTimer: number = 0;
  private lastClickBlock: MazeBlock | null = null;

  private groundMirror: THREE.Mesh | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setClearColor(0x1a1a2e);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.02);

    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);

    this.cameraController = new CameraController(this.camera, canvas, new THREE.Vector3());
    this.mazeBuilder = new MazeBuilder(this.scene);
    this.raycaster = new THREE.Raycaster();

    this.levels = createLevelConfigs();

    const playerGeo = new THREE.SphereGeometry(0.3, 16, 16);
    const playerMat = new THREE.MeshStandardMaterial({
      color: 0x00ffcc,
      emissive: 0x00ffcc,
      emissiveIntensity: 1.0,
      roughness: 0.2,
      metalness: 0.8,
    });
    this.playerMesh = new THREE.Mesh(playerGeo, playerMat);
    this.scene.add(this.playerMesh);

    this.playerGlow = new THREE.PointLight(0x00ffcc, 2, 8);
    this.scene.add(this.playerGlow);

    this.setupLighting();
    this.setupGround();

    window.addEventListener('resize', this.onResize.bind(this));
    canvas.addEventListener('click', this.onClick.bind(this));
    canvas.addEventListener('dblclick', this.onDoubleClick.bind(this));
    window.addEventListener('keydown', this.onKeyDown.bind(this));
  }

  start(): void {
    this.loadLevel(0);
    this.lastTime = performance.now();
    this.loop();
  }

  onStateChange(listener: StateChangeListener): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  getState(): GameState {
    const level = this.levels[this.currentLevelIndex];
    return {
      currentLevel: this.currentLevelIndex + 1,
      totalLevels: this.levels.length,
      levelName: level?.name ?? '',
      steps: this.steps,
      isCompleted: this.isCompleted,
      isLevelComplete: this.isLevelComplete,
      playerGridPos: { ...this.playerGridPos },
    };
  }

  resetLevel(): void {
    this.loadLevel(this.currentLevelIndex);
  }

  nextLevel(): void {
    if (this.currentLevelIndex < this.levels.length - 1) {
      this.loadLevel(this.currentLevelIndex + 1);
    }
  }

  dispose(): void {
    cancelAnimationFrame(this.animationId);
    this.cameraController.dispose();
    this.mazeBuilder.clear();
    this.renderer.dispose();
  }

  private loadLevel(index: number): void {
    this.currentLevelIndex = index;
    const config = this.levels[index];

    this.mazeBuilder.clear();
    this.mazeBuilder.buildLevel(config);

    this.playerGridPos = { ...config.startPosition };
    this.playerPosition.set(
      config.startPosition.x * SPACING,
      config.startPosition.y * SPACING + 0.5,
      config.startPosition.z * SPACING
    );
    this.playerTargetPosition.copy(this.playerPosition);
    this.playerMesh.position.copy(this.playerPosition);
    this.playerGlow.position.copy(this.playerPosition);
    this.isMoving = false;

    this.steps = 0;
    this.isLevelComplete = false;
    this.isCompleted = false;

    this.cameraController.setTarget(this.playerPosition.clone());
    this.cameraController.reset(Math.PI / 4, Math.PI / 4, config.gridSize.x * 1.5);

    this.emitState();
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0x222244, 0.5);
    this.scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0x8888ff, 0.4);
    dirLight.position.set(5, 10, 5);
    this.scene.add(dirLight);

    const dirLight2 = new THREE.DirectionalLight(0xff44aa, 0.2);
    dirLight2.position.set(-5, 8, -5);
    this.scene.add(dirLight2);
  }

  private setupGround(): void {
    const groundGeo = new THREE.PlaneGeometry(60, 60);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x111122,
      roughness: 0.2,
      metalness: 0.9,
      transparent: true,
      opacity: 0.6,
    });
    this.groundMirror = new THREE.Mesh(groundGeo, groundMat);
    this.groundMirror.rotation.x = -Math.PI / 2;
    this.groundMirror.position.y = -0.5;
    this.scene.add(this.groundMirror);
  }

  private loop = (): void => {
    this.animationId = requestAnimationFrame(this.loop);

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.updateMovement(dt);
    this.mazeBuilder.update(this.playerPosition);
    this.cameraController.setTarget(this.playerPosition);
    this.cameraController.update();
    this.renderer.render(this.scene, this.camera);
  };

  private updateMovement(dt: number): void {
    if (!this.isMoving) return;

    const dir = new THREE.Vector3().subVectors(this.playerTargetPosition, this.playerPosition);
    const dist = dir.length();

    if (dist < 0.05) {
      this.playerPosition.copy(this.playerTargetPosition);
      this.isMoving = false;
      this.checkLevelComplete();
    } else {
      const step = Math.min(this.moveSpeed * dt, dist);
      dir.normalize().multiplyScalar(step);
      this.playerPosition.add(dir);
    }

    this.playerMesh.position.copy(this.playerPosition);
    this.playerGlow.position.copy(this.playerPosition);
  }

  private tryMove(dx: number, dy: number, dz: number): void {
    if (this.isMoving || this.isLevelComplete) return;

    const nx = this.playerGridPos.x + dx;
    const ny = this.playerGridPos.y + dy;
    const nz = this.playerGridPos.z + dz;

    if (!this.mazeBuilder.isWalkable(nx, ny, nz)) return;

    this.playerGridPos = { x: nx, y: ny, z: nz };
    this.playerTargetPosition.set(nx * SPACING, ny * SPACING + 0.5, nz * SPACING);
    this.isMoving = true;
    this.steps++;
    this.emitState();
  }

  private checkLevelComplete(): void {
    const level = this.levels[this.currentLevelIndex];
    if (!level) return;

    const exitPos = level.exitPosition;
    if (
      this.playerGridPos.x === exitPos.x &&
      this.playerGridPos.y === exitPos.y &&
      this.playerGridPos.z === exitPos.z
    ) {
      this.isLevelComplete = true;
      if (this.currentLevelIndex >= this.levels.length - 1) {
        this.isCompleted = true;
      }
      this.emitState();
    }
  }

  private onClick(e: MouseEvent): void {
    if (this.isLevelComplete) return;

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.camera);
    const blocks = this.mazeBuilder.getBlocks().map((b) => b.mesh);
    const intersects = this.raycaster.intersectObjects(blocks);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const gx = hit.userData.gridX;
      const gy = hit.userData.gridY;
      const gz = hit.userData.gridZ;

      const dx = gx - this.playerGridPos.x;
      const dy = gy - this.playerGridPos.y;
      const dz = gz - this.playerGridPos.z;
      const adx = Math.abs(dx);
      const ady = Math.abs(dy);
      const adz = Math.abs(dz);

      if (adx + ady + adz === 1) {
        this.tryMove(dx, dy, dz);
      } else if (adx + ady + adz > 1) {
        this.moveTowards(gx, gy, gz);
      }
    }
  }

  private onDoubleClick(e: MouseEvent): void {
    if (this.isLevelComplete) return;

    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((e.clientX - rect.left) / rect.width) * 2 - 1,
      -((e.clientY - rect.top) / rect.height) * 2 + 1
    );

    this.raycaster.setFromCamera(mouse, this.camera);
    const blocks = this.mazeBuilder.getBlocks();
    const meshes = blocks.map((b) => b.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const block = blocks.find(
        (b) =>
          b.config.x === hit.userData.gridX &&
          b.config.y === hit.userData.gridY &&
          b.config.z === hit.userData.gridZ
      );
      if (block && block.config.needsDoubleTap) {
        this.mazeBuilder.solidifyBlock(block);
      }
    }
  }

  private moveTowards(targetX: number, targetY: number, targetZ: number): void {
    const dx = targetX - this.playerGridPos.x;
    const dy = targetY - this.playerGridPos.y;
    const dz = targetZ - this.playerGridPos.z;

    const moveX = dx !== 0 ? Math.sign(dx) : 0;
    const moveY = dy !== 0 ? Math.sign(dy) : 0;
    const moveZ = dz !== 0 ? Math.sign(dz) : 0;

    if (moveX !== 0 && moveY === 0 && moveZ === 0) {
      this.tryMove(moveX, 0, 0);
    } else if (moveZ !== 0 && moveX === 0 && moveY === 0) {
      this.tryMove(0, 0, moveZ);
    } else if (moveY !== 0 && moveX === 0 && moveZ === 0) {
      this.tryMove(0, moveY, 0);
    } else {
      if (Math.abs(dx) >= Math.abs(dz)) {
        this.tryMove(moveX, 0, 0);
      } else {
        this.tryMove(0, 0, moveZ);
      }
    }
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (this.isLevelComplete || this.isMoving) return;

    switch (e.key) {
      case 'ArrowUp':
      case 'w':
      case 'W':
        this.tryMove(0, 0, -1);
        break;
      case 'ArrowDown':
      case 's':
      case 'S':
        this.tryMove(0, 0, 1);
        break;
      case 'ArrowLeft':
      case 'a':
      case 'A':
        this.tryMove(-1, 0, 0);
        break;
      case 'ArrowRight':
      case 'd':
      case 'D':
        this.tryMove(1, 0, 0);
        break;
      case 'q':
      case 'Q':
        this.tryMove(0, 1, 0);
        break;
      case 'e':
      case 'E':
        this.tryMove(0, -1, 0);
        break;
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private emitState(): void {
    const state = this.getState();
    for (const listener of this.listeners) {
      listener(state);
    }
  }
}
