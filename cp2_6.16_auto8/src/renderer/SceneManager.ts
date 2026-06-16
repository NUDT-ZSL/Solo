import * as THREE from 'three';
import {
  CUBE_SIZE,
  GRID_SPACING,
  GRID_CELL_THRESHOLD,
  MeshUpdateData,
  MaterialType,
  MATERIALS
} from '../types';

interface WindParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface DebrisParticle {
  mesh: THREE.Mesh;
  startPos: THREE.Vector3;
  velocity: THREE.Vector3;
  arcHeight: number;
  life: number;
  maxLife: number;
}

export class SceneManager {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private materialMesh: THREE.Mesh | null = null;
  private gridHelper: THREE.Group | null = null;
  private windParticles: WindParticle[] = [];
  private debrisParticles: DebrisParticle[] = [];
  private container: HTMLElement;
  private windDirection: number = 0;
  private windSpeed: number = 5;
  private materialType: MaterialType = 'sand';
  private animationId: number = 0;
  private gridCellErosionRatio: Map<string, number> = new Map();
  private gridLines: Map<string, THREE.Line> = new Map();
  private readonly MAX_WIND_PARTICLES = 1000;
  private readonly PARTICLES_PER_FRAME = 100;
  private readonly PARTICLE_LIFETIME = 1.2;
  private readonly WIND_STREAM_LENGTH = 12;
  private readonly SURFACE_PROXIMITY = 0.5;
  private readonly MAX_DEFLECTION = (15 * Math.PI) / 180;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    container.appendChild(this.renderer.domElement);

    this.setupScene();
    this.setupResizeListener();
  }

  private setupScene() {
    this.createSkybox();
    this.createGround();
    this.createGridHelper();
    this.setupLights();

    const isMobile = window.innerWidth < 768;
    this.camera.position.set(8, isMobile ? 18 : 12, 8);
    this.camera.lookAt(0, 0, 0);
  }

  private createSkybox() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#1a0a2e');
    gradient.addColorStop(1, '#e09f3e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;
  }

  private createGround() {
    const groundSize = 50;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#d4a373';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 2000; i++) {
      ctx.fillStyle = `rgba(${0xb8 + Math.random() * 30}, ${0x86 + Math.random() * 30}, ${0x5a + Math.random() * 30}, 0.6)`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 1, 1);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(20, 20);

    const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize);
    const groundMat = new THREE.MeshStandardMaterial({
      map: texture,
      roughness: 0.9,
      metalness: 0
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -CUBE_SIZE / 2 - 0.01;
    this.scene.add(ground);
  }

  private createGridHelper()