import * as THREE from 'three';
import { MazeGenerator } from './maze';
import { Player, getStepColor } from './player';

const CAMERA_DISTANCE = 5;
const PITCH_MIN = 15 * Math.PI / 180;
const PITCH_MAX = 75 * Math.PI / 180;
const TRANSITION_DURATION = 2;

class Game {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private maze: MazeGenerator;
  private player: Player;
  private clock: THREE.Clock;

  private cameraYaw = Math.PI / 4;
  private cameraPitch = 45 * Math.PI / 180;
  private isDragging = false;
  private lastMouseX = 0;
  private lastMouseY = 0;

  private elapsedTime = 0;
  private mazeSize = 10;

  private isTransitioning = false;
  private transitionTimer = 0;
  private transitionPhase: 'fadeOut' | 'fadeIn' = 'fadeOut';
  private pendingSize: number | null = null;

  private groundGlow: THREE.Mesh;
  private directionalLight: THREE.DirectionalLight;
  private bottomLight: THREE.DirectionalLight;
  private ambientLight: THREE.AmbientLight;

  private timeElement: HTMLElement;
  private stepsElement: HTMLElement;
  private resetButton: HTMLButtonElement;
  private difficultySelect: HTMLSelectElement;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x050508);
    this.scene.fog = new THREE.Fog(0x050508, 8, 25);

    const container = document.getElementById('canvas-container')!;
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    this.directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1.2);
    this.directionalLight.position.set(1, 2, 3).normalize();
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 0.5;
    this.directionalLight.shadow.camera.far = 50;
    this.directionalLight.shadow.camera.left = -15;
    this.directionalLight.shadow.camera.right = 15;
    this.directionalLight.shadow.camera.top = 15;
    this.directionalLight.shadow.camera.bottom = -15;
    this.scene.add(this.directionalLight);

    this.bottomLight = new THREE.DirectionalLight(0x4488FF, 0.3);
    this.bottomLight.position.set(0, -1, 0).normalize();
    this.scene.add(this.bottomLight);

    this.ambientLight = new THREE.AmbientLight(0x404060, 0.4);
    this.scene.add(this.ambientLight);

    const glowTexture = this.createGlowTexture();
    const glowMaterial = new THREE.MeshBasicMaterial({
      map: glowTexture,
      transparent: true,
      opacity: 0.15,
      color: 0x00BBFF,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const glowGeometry = new THREE.PlaneGeometry(16, 16);
    this.groundGlow = new THREE.Mesh(glowGeometry, glowMaterial);
    this.groundGlow.rotation.x = -Math.PI / 2;
    this.groundGlow.position.y = 0.01;
    this.scene.add(this.groundGlow);

    const floorGeometry = new THREE.PlaneGeometry(30, 30);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x0A0A12,
      roughness: 0.9,
      metalness: 0.1
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0;
    floor.receiveShadow = true;
    this.scene.add(floor);

    this.maze = new MazeGenerator(this.scene, this.mazeSize);
    this.maze.generate();

    this.player = new Player(this.scene, this.maze);

    this.clock = new THREE.Clock();

    this.timeElement = document.getElementById('time-value')!;
    this.stepsElement = document.getElementById('steps-value')!;
    this.resetButton = document.getElementById('reset-btn') as HTMLButtonElement;
    this.difficultySelect = document.getElementById('difficulty-select') as HTMLSelectElement;

    this.setupEventListeners();
    this.updateCameraPosition();
  }

  private createGlowTexture(): THREE.Texture {
    const size = 512;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.6)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.2)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', () => this.onResize());

    const canvas = this.renderer.domElement;
    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());

    canvas.addEventListener('touchstart', (e) => this.onTouchStart(e), { passive: false });
    canvas.addEventListener('touchmove', (e) => this.onTouchMove(e), { passive: false });
    canvas.addEventListener('touchend', () => this.onTouchEnd());

    this.resetButton.addEventListener('click', () => this.resetGame());
    this.difficultySelect.addEventListener('change', (e) => {
      const size = parseInt((e.target as HTMLSelectElement).value, 10);
      this.changeDifficulty(size);
    });
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.lastMouseX;
    const deltaY = e.clientY - this.lastMouseY;

    this.cameraYaw -= deltaX * 0.005;
    this.cameraPitch -= deltaY * 0.005;

    this.cameraPitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, this.cameraPitch));

    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      this.isDragging = true;
      this.lastMouseX = e.touches[0].clientX;
      this.lastMouseY = e.touches[0].clientY;
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.isDragging || e.touches.length !== 1) return;

    const deltaX = e.touches[0].clientX - this.lastMouseX;
    const deltaY = e.touches[0].clientY - this.lastMouseY;

    this.cameraYaw -= deltaX * 0.005;
    this.cameraPitch -= deltaY * 0.005;

    this.cameraPitch = Math.max(PITCH_MIN, Math.min(PITCH_MAX, this.cameraPitch));

    this.lastMouseX = e.touches[0].clientX;
    this.lastMouseY = e.touches[0].clientY;
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  private updateCameraPosition(): void {
    const offset = new THREE.Vector3(
      CAMERA_DISTANCE * Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch),
      CAMERA_DISTANCE * Math.sin(this.cameraPitch),
      CAMERA_DISTANCE * Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch)
    );

    this.camera.position.copy(this.player.position).add(offset);
    this.camera.lookAt(this.player.position);
  }

  private getCameraDirection(): THREE.Vector3 {
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);
    return direction;
  }

  private resetGame(): void {
    if (this.isTransitioning) return;

    this.startTransition(this.mazeSize);
  }

  private changeDifficulty(size: number): void {
    if (this.isTransitioning || size === this.mazeSize) return;

    this.startTransition(size);
  }

  private startTransition(newSize: number): void {
    this.isTransitioning = true;
    this.transitionTimer = 0;
    this.transitionPhase = 'fadeOut';
    this.pendingSize = newSize;
  }

  private updateTransition(delta: number): void {
    if (!this.isTransitioning) return;

    this.transitionTimer += delta;
    const progress = Math.min(this.transitionTimer / TRANSITION_DURATION, 1);

    if (this.transitionPhase === 'fadeOut') {
      this.maze.fadeTransition(progress, true);

      if (progress >= 1) {
        this.maze.dispose();
        this.mazeSize = this.pendingSize!;
        this.maze = new MazeGenerator(this.scene, this.mazeSize);
        this.maze.generate();
        this.player.setMaze(this.maze);
        this.elapsedTime = 0;

        this.transitionTimer = 0;
        this.transitionPhase = 'fadeIn';
      }
    } else {
      this.maze.fadeTransition(progress, false);

      if (progress >= 1) {
        this.isTransitioning = false;
        this.pendingSize = null;
      }
    }
  }

  private updateUI(): void {
    const minutes = Math.floor(this.elapsedTime / 60);
    const seconds = Math.floor(this.elapsedTime % 60);
    this.timeElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    this.stepsElement.textContent = `${this.player.steps}`;
    this.stepsElement.style.color = getStepColor(this.player.steps);
  }

  public update(): void {
    const delta = this.clock.getDelta();

    if (!this.isTransitioning) {
      this.elapsedTime += delta;

      this.player.update(delta, this.getCameraDirection());
      this.maze.updateWallColors(this.player.position);
      this.maze.updateToggles(delta);

      const distToEnd = this.player.position.distanceTo(this.maze.endPos);
      if (distToEnd < 0.6) {
        this.resetGame();
      }
    } else {
      this.updateTransition(delta);
    }

    this.updateCameraPosition();

    this.groundGlow.rotation.z += 0.1 * delta;

    this.updateUI();

    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.player.dispose();
    this.maze.dispose();
    this.renderer.dispose();
  }
}

let game: Game;

function init(): void {
  game = new Game();
  animate();
}

function animate(): void {
  requestAnimationFrame(animate);
  game.update();
}

window.addEventListener('DOMContentLoaded', init);
