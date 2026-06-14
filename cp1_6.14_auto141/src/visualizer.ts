import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { eventBus, type EarthquakeParams, type TerrainData, type PerformanceReport } from './eventBus';
import { GRID_SIZE, TERRAIN_WIDTH, TERRAIN_HEIGHT, VERTEX_COUNT } from './waveSimulator';

const COLOR_START = new THREE.Color(0xff4500);
const COLOR_END = new THREE.Color(0x1e90ff);
const PARTICLE_LIFETIME = 3000;
const MAX_PARTICLES = 4000;
const MIN_PARTICLES = 2000;
const WAVE_RADIUS_SPEED = 50;
const MAX_WAVE_RADIUS = 300;

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  birthTime: number;
  radius: number;
  angle: number;
  size: number;
}

const particleVertexShader = `
  attribute float aSize;
  attribute float aAlpha;
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    vColor = color;
    vAlpha = aAlpha;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (300.0 / -mvPosition.z);
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const particleFragmentShader = `
  varying vec3 vColor;
  varying float vAlpha;
  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;
    float alpha = smoothstep(0.5, 0.2, dist) * vAlpha;
    gl_FragColor = vec4(vColor, alpha);
  }
`;

export class Visualizer {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private terrainMesh: THREE.Mesh;
  private gridHelper: THREE.GridHelper;
  private terrainGeometry: THREE.PlaneGeometry;
  private particles: Particle[] = [];
  private particleGeometry: THREE.BufferGeometry;
  private particleMaterial: THREE.ShaderMaterial;
  private particleSystem: THREE.Points;
  private particleSizes: Float32Array;
  private particleAlphas: Float32Array;
  private currentParams: EarthquakeParams = { longitude: 0, latitude: 0, magnitude: 5, depth: 10 };
  private waveStartTime: number | null = null;
  private lastParticleSpawn: number = 0;
  private frameCount: number = 0;
  private lastFpsTime: number = performance.now();
  private currentFps: number = 60;
  private animationId: number | null = null;
  private lastTerrainUpdate: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a12);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      2000
    );

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.rotateSpeed = 0.5;
    this.controls.panSpeed = 2;
    this.controls.zoomSpeed = 0.5;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 50;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN
    };

    this.setupLights();
    this.terrainGeometry = this.createTerrainGeometry();
    this.terrainMesh = this.createTerrainMesh();
    this.gridHelper = this.createGridHelper();
    this.scene.add(this.terrainMesh);
    this.scene.add(this.gridHelper);

    const particleSetup = this.createParticleSystem();
    this.particleGeometry = particleSetup.geometry;
    this.particleMaterial = particleSetup.material;
    this.particleSystem = particleSetup.system;
    this.particleSizes = particleSetup.sizes;
    this.particleAlphas = particleSetup.alphas;
    this.scene.add(this.particleSystem);

    this.setCameraPosition();

    eventBus.on('earthquake:trigger', this.handleEarthquake.bind(this));
    eventBus.on('terrain:update', this.handleTerrainUpdate.bind(this));

    window.addEventListener('resize', this.handleResize.bind(this));

    this.animate();
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x404040, 0.6);
    this.scene.add(ambient);

    const directional = new THREE.DirectionalLight(0xffffff, 0.9);
    directional.position.set(100, 150, 100);
    this.scene.add(directional);

    const fillLight = new THREE.DirectionalLight(0x00d4ff, 0.2);
    fillLight.position.set(-100, 50, -100);
    this.scene.add(fillLight);
  }

  private createTerrainGeometry(): THREE.PlaneGeometry {
    const geometry = new THREE.PlaneGeometry(TERRAIN_WIDTH, TERRAIN_HEIGHT, GRID_SIZE, GRID_SIZE);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }

  private createTerrainMesh(): THREE.Mesh {
    const material = new THREE.MeshStandardMaterial({
      color: 0x4a7c59,
      flatShading: false,
      roughness: 0.8,
      metalness: 0.1,
      side: THREE.DoubleSide,
      vertexColors: false
    });
    const mesh = new THREE.Mesh(this.terrainGeometry, material);
    mesh.receiveShadow = true;
    return mesh;
  }

  private createGridHelper(): THREE.GridHelper {
    const grid = new THREE.GridHelper(
      TERRAIN_WIDTH,
      GRID_SIZE,
      0xffffff,
      0xffffff
    );
    const gridMaterial = grid.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.2;
    grid.position.y = 0.01;
    return grid;
  }

  private createParticleSystem(): {
    geometry: THREE.BufferGeometry;
    material: THREE.ShaderMaterial;
    system: THREE.Points;
    sizes: Float32Array;
    alphas: Float32Array;
  } {
    const positions = new Float32Array(MAX_PARTICLES * 3);
    const colors = new Float32Array(MAX_PARTICLES * 3);
    const sizes = new Float32Array(MAX_PARTICLES);
    const alphas = new Float32Array(MAX_PARTICLES);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
    geometry.setDrawRange(0, 0);

    const material = new THREE.ShaderMaterial({
      uniforms: {},
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      vertexColors: true
    });

    const system = new THREE.Points(geometry, material);
    return { geometry, material, system, sizes, alphas };
  }

  private setCameraPosition(): void {
    const epiX = (this.currentParams.longitude / 180) * (TERRAIN_WIDTH / 2);
    const epiZ = (this.currentParams.latitude / 90) * (TERRAIN_HEIGHT / 2);
    const distance = 30;
    const elevationAngle = (30 * Math.PI) / 180;

    this.camera.position.set(
      epiX + distance * Math.cos(elevationAngle),
      distance * Math.sin(elevationAngle) + 10,
      epiZ + distance * Math.cos(elevationAngle)
    );
    this.controls.target.set(epiX, 0, epiZ);
    this.controls.update();
  }

  private handleEarthquake(params: EarthquakeParams): void {
    this.currentParams = { ...params };
    this.waveStartTime = performance.now();
    this.lastParticleSpawn = performance.now();
    this.particles = [];
    this.setCameraPosition();
  }

  private handleTerrainUpdate(data: TerrainData): void {
    const positions = this.terrainGeometry.attributes.position;
    for (let i = 0; i < VERTEX_COUNT; i++) {
      positions.setY(i, data.displacements[i]);
    }
    positions.needsUpdate = true;
    this.terrainGeometry.computeVertexNormals();

    const gridPositions = this.gridHelper.geometry.attributes.position;
    if (gridPositions) {
      for (let i = 0; i < gridPositions.count; i++) {
        const gx = gridPositions.getX(i);
        const gz = gridPositions.getZ(i);
        const gridX = Math.round((gx / TERRAIN_WIDTH + 0.5) * GRID_SIZE);
        const gridZ = Math.round((gz / TERRAIN_HEIGHT + 0.5) * GRID_SIZE);
        const clampedX = Math.max(0, Math.min(GRID_SIZE, gridX));
        const clampedZ = Math.max(0, Math.min(GRID_SIZE, gridZ));
        const idx = clampedZ * (GRID_SIZE + 1) + clampedX;
        if (idx >= 0 && idx < VERTEX_COUNT) {
          gridPositions.setY(i, data.displacements[idx] + 0.01);
        }
      }
      gridPositions.needsUpdate = true;
    }

    this.lastTerrainUpdate = data.timestamp;
  }

  private spawnParticles(now: number): void {
    if (!this.waveStartTime) return;

    const elapsed = now - this.waveStartTime;
    const elapsedSec = elapsed / 1000;
    const waveRadius = Math.min(MAX_WAVE_RADIUS, elapsedSec * WAVE_RADIUS_SPEED);

    if (waveRadius >= MAX_WAVE_RADIUS) return;

    const particleBudget = this.currentFps >= 40 ? MAX_PARTICLES : MIN_PARTICLES;
    const spawnInterval = 33;
    const particlesPerSpawn = Math.max(20, Math.floor(particleBudget / 90));

    if (now - this.lastParticleSpawn >= spawnInterval && this.particles.length < particleBudget) {
      this.lastParticleSpawn = now;
      const epiX = (this.currentParams.longitude / 180) * (TERRAIN_WIDTH / 2);
      const epiZ = (this.currentParams.latitude / 90) * (TERRAIN_HEIGHT / 2);

      for (let i = 0; i < particlesPerSpawn && this.particles.length < particleBudget; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radiusVar = waveRadius + (Math.random() - 0.5) * 10;
        const speed = WAVE_RADIUS_SPEED * (0.8 + Math.random() * 0.4);

        this.particles.push({
          position: new THREE.Vector3(
            epiX + Math.cos(angle) * radiusVar,
            0.5 + Math.random() * 2,
            epiZ + Math.sin(angle) * radiusVar
          ),
          velocity: new THREE.Vector3(
            Math.cos(angle) * speed * 0.1,
            (Math.random() - 0.5) * 0.5,
            Math.sin(angle) * speed * 0.1
          ),
          birthTime: now,
          radius: radiusVar,
          angle,
          size: 0.3 + Math.random() * 0.5
        });
      }
    }
  }

  private updateParticles(now: number): void {
    const alive: Particle[] = [];
    const epiX = (this.currentParams.longitude / 180) * (TERRAIN_WIDTH / 2);
    const epiZ = (this.currentParams.latitude / 90) * (TERRAIN_HEIGHT / 2);

    for (const p of this.particles) {
      const age = now - p.birthTime;
      if (age >= PARTICLE_LIFETIME) continue;

      p.position.addScaledVector(p.velocity, 0.016);
      p.position.y += Math.sin(age * 0.003) * 0.01;

      alive.push(p);
    }
    this.particles = alive;

    const posAttr = this.particleGeometry.attributes.position as THREE.BufferAttribute;
    const colAttr = this.particleGeometry.attributes.color as THREE.BufferAttribute;
    const sizeAttr = this.particleGeometry.attributes.aSize as THREE.BufferAttribute;
    const alphaAttr = this.particleGeometry.attributes.aAlpha as THREE.BufferAttribute;

    for (let i = 0; i < this.particles.length; i++) {
      const p = this.particles[i];
      const age = now - p.birthTime;
      const lifeRatio = age / PARTICLE_LIFETIME;

      posAttr.setXYZ(i, p.position.x, p.position.y, p.position.z);

      const dist = Math.sqrt(
        Math.pow(p.position.x - epiX, 2) + Math.pow(p.position.z - epiZ, 2)
      );
      const distRatio = Math.min(1, dist / MAX_WAVE_RADIUS);

      const color = new THREE.Color().lerpColors(COLOR_START, COLOR_END, distRatio);
      const alpha = 1.0 - 0.8 * lifeRatio;

      colAttr.setXYZ(i, color.r, color.g, color.b);
      sizeAttr.setX(i, p.size);
      alphaAttr.setX(i, alpha);
    }

    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    alphaAttr.needsUpdate = true;
    this.particleGeometry.setDrawRange(0, this.particles.length);

    eventBus.emit('performance:report', {
      fps: Math.round(this.currentFps),
      particleCount: this.particles.length
    });
  }

  private handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate = (): void => {
    this.animationId = requestAnimationFrame(this.animate);

    const now = performance.now();
    this.frameCount++;
    if (now - this.lastFpsTime >= 500) {
      this.currentFps = (this.frameCount * 1000) / (now - this.lastFpsTime);
      this.frameCount = 0;
      this.lastFpsTime = now;
    }

    this.spawnParticles(now);
    this.updateParticles(now);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  };

  public destroy(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.handleResize.bind(this));
    this.terrainGeometry.dispose();
    (this.terrainMesh.material as THREE.Material).dispose();
    this.gridHelper.geometry.dispose();
    (this.gridHelper.material as THREE.Material).dispose();
    this.particleGeometry.dispose();
    this.particleMaterial.dispose();
    this.renderer.dispose();
    this.controls.dispose();
    if (this.renderer.domElement.parentNode === this.container) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}
