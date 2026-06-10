import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { InkAnalysis, WeatherType } from './ink-engine';

const TERRAIN_SIZE = 20;
const TERRAIN_SEGMENTS = 96;
const MAX_PARTICLES = 3000;
const CLOUD_COUNT = 100;
const TERRAIN_HEIGHT_MAX = 3;
const FRAME_TIME_BUDGET = 8;

interface ParticleData {
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  active: boolean;
}

interface LightningData {
  line: THREE.Line;
  opacity: number;
  fadeSpeed: number;
}

interface UpdateTask {
  type: 'terrain' | 'clouds' | 'particles';
  progress: number;
  total: number;
  data: InkAnalysis | null;
}

export class WeatherScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private animationId: number | null = null;
  private isDestroyed: boolean = false;

  private terrain: THREE.Mesh | null = null;
  private terrainGeometry: THREE.PlaneGeometry | null = null;
  private terrainPositions: Float32Array | null = null;
  private terrainTargetHeights: Float32Array | null = null;
  private terrainTransitionProgress: number = 1;

  private clouds: THREE.Points | null = null;
  private cloudPositions: Float32Array | null = null;
  private cloudSizes: Float32Array | null = null;
  private cloudAlphas: Float32Array | null = null;
  private cloudNeedsUpdate: boolean = false;

  private particles: THREE.Points | null = null;
  private particlePositions: Float32Array | null = null;
  private particleColors: Float32Array | null = null;
  private particleAlphas: Float32Array | null = null;
  private particleData: ParticleData[] = [];

  private lightningPool: LightningData[] = [];

  private currentAnalysis: InkAnalysis | null = null;
  private clock: THREE.Clock = new THREE.Clock();
  private targetParticleCount: number = 0;
  private weatherType: WeatherType = 'ink';
  private weatherColor: THREE.Color = new THREE.Color(0x2c2c2c);

  private updateQueue: UpdateTask[] = [];
  private isProcessingUpdate: boolean = false;

  constructor(container: HTMLElement, canvas: HTMLCanvasElement) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.Fog(0x1a1a2e, 25, 50);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    this.camera.position.set(15, 15, 15);

    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
      powerPreference: 'high-performance'
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = false;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 40;
    this.controls.target.set(0, 2, 0);
    this.controls.enablePan = false;
    this.controls.rotateSpeed = 0.8;
    this.controls.zoomSpeed = 0.8;

    this.setupLighting();
    this.createTerrain();
    this.createClouds();
    this.createParticles();
    this.createLightningPool();

    window.addEventListener('resize', this.handleResize);
    this.startAnimationLoop();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x505070, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 18, 8);
    this.scene.add(directionalLight);

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x2d4a3d, 0.3);
    this.scene.add(hemiLight);
  }

  private createTerrain(): void {
    const segX = TERRAIN_SEGMENTS;
    const segZ = Math.floor(TERRAIN_SEGMENTS * 0.75);

    const geometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE * 0.75, segX, segZ);
    geometry.rotateX(-Math.PI / 2);

    const posAttr = geometry.attributes.position;
    const count = posAttr.count;
    this.terrainPositions = new Float32Array(posAttr.array);
    this.terrainTargetHeights = new Float32Array(count);

    for (let i = 0; i < count; i++) {
      this.terrainTargetHeights[i] = 0;
      posAttr.setY(i, 0);
    }
    posAttr.needsUpdate = true;
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x4a6b4a,
      flatShading: false,
      side: THREE.DoubleSide,
      roughness: 0.95,
      metalness: 0.05
    });

    this.terrain = new THREE.Mesh(geometry, material);
    this.terrain.receiveShadow = false;
    this.terrain.position.y = -0.5;
    this.scene.add(this.terrain);
    this.terrainGeometry = geometry;
  }

  private createClouds(): void {
    const positions = new Float32Array(CLOUD_COUNT * 3);
    const sizes = new Float32Array(CLOUD_COUNT);
    const alphas = new Float32Array(CLOUD_COUNT);

    for (let i = 0; i < CLOUD_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * TERRAIN_SIZE * 0.8;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * TERRAIN_SIZE * 0.6;
      sizes[i] = 0;
      alphas[i] = 0;
    }

    this.cloudPositions = positions;
    this.cloudSizes = sizes;
    this.cloudAlphas = alphas;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.7)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 128, 128);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        color: { value: new THREE.Color(0xffffff) }
      },
      vertexShader: `
        attribute float size;
        attribute float alpha;
        varying float vAlpha;
        void main() {
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * 250.0 / -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        uniform vec3 color;
        varying float vAlpha;
        void main() {
          vec4 texColor = texture2D(map, gl_PointCoord);
          gl_FragColor = vec4(color, texColor.a * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    this.clouds = new THREE.Points(geometry, material);
    this.scene.add(this.clouds);
  }

  private createParticles(): void {
    const positions = new Float32Array(MAX_PARTICLES * 3);
    const colors = new Float32Array(MAX_PARTICLES * 3);
    const alphas = new Float32Array(MAX_PARTICLES);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      positions[i * 3 + 1] = -100;
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;
      alphas[i] = 0;
    }

    this.particlePositions = positions;
    this.particleColors = colors;
    this.particleAlphas = alphas;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const canvas = document.createElement('canvas');
    canvas.width = 32;
    canvas.height = 32;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 32, 32);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        uSize: { value: 0.12 }
      },
      vertexShader: `
        attribute vec3 color;
        attribute float alpha;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float uSize;
        void main() {
          vColor = color;
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = uSize * 200.0 / -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D map;
        varying vec3 vColor;
        varying float vAlpha;
        void main() {
          vec4 texColor = texture2D(map, gl_PointCoord);
          gl_FragColor = vec4(vColor, texColor.a * vAlpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.particleData.push({
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        active: false
      });
    }
  }

  private createLightningPool(): void {
    for (let i = 0; i < 8; i++) {
      const geometry = new THREE.BufferGeometry();
      const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0
      });
      const line = new THREE.Line(geometry, material);
      line.visible = false;
      this.scene.add(line);
      this.lightningPool.push({ line, opacity: 0, fadeSpeed: 0 });
    }
  }

  updateWeather(analysis: InkAnalysis): void {
    this.currentAnalysis = analysis;
    this.weatherType = analysis.weatherType;
    this.weatherColor = new THREE.Color(analysis.dominantColor);

    this.updateQueue = [];

    this.updateQueue.push({
      type: 'terrain',
      progress: 0,
      total: 1,
      data: analysis
    });

    this.updateQueue.push({
      type: 'clouds',
      progress: 0,
      total: 1,
      data: analysis
    });

    this.updateQueue.push({
      type: 'particles',
      progress: 0,
      total: 1,
      data: analysis
    });

    this.isProcessingUpdate = true;
  }

  private processUpdateQueue(): void {
    if (!this.isProcessingUpdate || this.updateQueue.length === 0) return;

    const startTime = performance.now();
    let timeLeft = FRAME_TIME_BUDGET;

    while (this.updateQueue.length > 0 && timeLeft > 2) {
      const task = this.updateQueue[0];
      const elapsed = performance.now() - startTime;
      timeLeft = FRAME_TIME_BUDGET - elapsed;

      if (timeLeft <= 1) break;

      switch (task.type) {
        case 'terrain':
          if (task.progress === 0) {
            this.prepareTerrainTarget(task.data!);
            this.saveCurrentTerrainPositions();
            task.progress = 1;
          }
          this.updateQueue.shift();
          this.terrainTransitionProgress = 0;
          break;

        case 'clouds':
          this.prepareCloudUpdate(task.data!);
          this.updateQueue.shift();
          break;

        case 'particles':
          this.updateParticleSystem(task.data!);
          this.updateQueue.shift();
          break;
      }
    }

    if (this.updateQueue.length === 0) {
      this.isProcessingUpdate = false;
    }
  }

  private saveCurrentTerrainPositions(): void {
    if (!this.terrainGeometry || !this.terrainPositions) return;
    const positions = this.terrainGeometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      this.terrainPositions[i * 3 + 1] = positions.getY(i);
    }
  }

  private prepareTerrainTarget(analysis: InkAnalysis): void {
    if (!this.terrainGeometry || !this.terrainTargetHeights) return;

    const positions = this.terrainGeometry.attributes.position;
    const width = analysis.mapWidth;
    const height = analysis.mapHeight;
    const count = positions.count;
    const targetHeights = this.terrainTargetHeights;

    for (let i = 0; i < count; i++) {
      const x = this.terrainPositions![i * 3];
      const z = this.terrainPositions![i * 3 + 2];

      const u = (x + TERRAIN_SIZE / 2) / TERRAIN_SIZE;
      const v = (z + TERRAIN_SIZE * 0.375) / (TERRAIN_SIZE * 0.75);

      const mapX = Math.floor(u * (width - 1));
      const mapY = Math.floor(v * (height - 1));
      const clampedX = Math.max(0, Math.min(width - 1, mapX));
      const clampedY = Math.max(0, Math.min(height - 1, mapY));

      const heightValue = analysis.terrainHeightMap[clampedY * width + clampedX];
      targetHeights[i] = heightValue * TERRAIN_HEIGHT_MAX;
    }
  }

  private prepareCloudUpdate(analysis: InkAnalysis): void {
    if (!this.cloudPositions || !this.cloudSizes || !this.cloudAlphas) return;

    const width = analysis.mapWidth;
    const height = analysis.mapHeight;

    for (let i = 0; i < CLOUD_COUNT; i++) {
      const x = (Math.random() - 0.5) * TERRAIN_SIZE * 0.85;
      const z = (Math.random() - 0.5) * TERRAIN_SIZE * 0.65;

      const u = (x + TERRAIN_SIZE / 2) / TERRAIN_SIZE;
      const v = (z + TERRAIN_SIZE * 0.375) / (TERRAIN_SIZE * 0.75);

      const mapX = Math.floor(u * (width - 1));
      const mapY = Math.floor(v * (height - 1));
      const clampedX = Math.max(0, Math.min(width - 1, mapX));
      const clampedY = Math.max(0, Math.min(height - 1, mapY));

      const density = analysis.cloudDensityMap[clampedY * width + clampedX];

      const idx = i * 3;
      if (density > 0.08) {
        this.cloudPositions[idx] = x;
        this.cloudPositions[idx + 1] = 4 + density * 5 + Math.random() * 2;
        this.cloudPositions[idx + 2] = z;
        this.cloudSizes[i] = 0.5 + density * 1.8 + Math.random() * 0.5;
        this.cloudAlphas[i] = density * 0.55 + Math.random() * 0.15;
      } else {
        this.cloudAlphas[i] = 0;
        this.cloudSizes[i] = 0;
      }
    }

    this.cloudNeedsUpdate = true;
  }

  private updateParticleSystem(analysis: InkAnalysis): void {
    let totalDensity = 0;
    const len = analysis.cloudDensityMap.length;
    for (let i = 0; i < len; i++) {
      totalDensity += analysis.cloudDensityMap[i];
    }
    const avgDensity = totalDensity / len;
    this.targetParticleCount = Math.min(MAX_PARTICLES, Math.floor(avgDensity * MAX_PARTICLES * 2.5));
  }

  private updateTerrainColor(): void {
    if (!this.terrain) return;
    const baseColor = this.weatherColor.clone();
    baseColor.multiplyScalar(0.45);
    baseColor.offsetHSL(0, -0.4, 0.15);
    const material = this.terrain.material as THREE.MeshStandardMaterial;
    material.color.lerp(baseColor, 0.03);
  }

  private updateFogColor(weatherType: WeatherType): void {
    const fogColors: Record<WeatherType, number> = {
      rain: 0x2a3a4a,
      heat: 0x4a2020,
      thunder: 0x151535,
      sand: 0x4a3a20,
      ink: 0x1a1a2e
    };

    const targetColor = new THREE.Color(fogColors[weatherType] ?? 0x1a1a2e);
    if (this.scene.fog) {
      (this.scene.fog as THREE.Fog).color.lerp(targetColor, 0.03);
    }
    this.scene.background = (this.scene.fog as THREE.Fog).color.clone();
  }

  private spawnParticle(index: number): void {
    if (!this.particlePositions || !this.particleColors || !this.particleAlphas || !this.currentAnalysis) return;

    const analysis = this.currentAnalysis;
    const data = this.particleData[index];

    const x = (Math.random() - 0.5) * TERRAIN_SIZE * 0.8;
    const z = (Math.random() - 0.5) * TERRAIN_SIZE * 0.6;

    const u = (x + TERRAIN_SIZE / 2) / TERRAIN_SIZE;
    const v = (z + TERRAIN_SIZE * 0.375) / (TERRAIN_SIZE * 0.75);
    const mapX = Math.max(0, Math.min(analysis.mapWidth - 1, Math.floor(u * analysis.mapWidth)));
    const mapY = Math.max(0, Math.min(analysis.mapHeight - 1, Math.floor(v * analysis.mapHeight)));
    const density = analysis.cloudDensityMap[mapY * analysis.mapWidth + mapX];

    if (density < 0.05) return;

    const startHeight = 5 + Math.random() * 5;
    const idx = index * 3;

    this.particlePositions[idx] = x;
    this.particlePositions[idx + 1] = startHeight;
    this.particlePositions[idx + 2] = z;

    this.particleColors[idx] = this.weatherColor.r;
    this.particleColors[idx + 1] = this.weatherColor.g;
    this.particleColors[idx + 2] = this.weatherColor.b;

    this.particleAlphas[index] = density * 0.8;

    data.active = true;
    data.maxLife = 4 + Math.random() * 4;
    data.life = data.maxLife;

    switch (this.weatherType) {
      case 'rain':
        data.velocity.set((Math.random() - 0.5) * 0.3, -10 - Math.random() * 5, (Math.random() - 0.5) * 0.3);
        break;
      case 'heat':
        data.velocity.set((Math.random() - 0.5) * 0.2, 2.5 + Math.random() * 2, (Math.random() - 0.5) * 0.2);
        break;
      case 'thunder':
        data.velocity.set((Math.random() - 0.5) * 0.8, -8 - Math.random() * 4, (Math.random() - 0.5) * 0.8);
        break;
      case 'sand':
        data.velocity.set(3 + Math.random() * 2, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 0.8);
        break;
      default:
        data.velocity.set(0, 0.8 + Math.random() * 1.2, 0);
    }
  }

  private updateParticles(delta: number): void {
    if (!this.particlePositions || !this.particleAlphas) return;

    const positions = this.particlePositions;
    const alphas = this.particleAlphas;
    const targetCount = this.targetParticleCount;
    const spawnRate = targetCount / 3;
    let spawned = 0;
    const maxSpawn = Math.ceil(spawnRate * delta);
    let activeCount = 0;
    let needsUpdate = false;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const data = this.particleData[i];

      if (data.active && data.life > 0) {
        data.life -= delta;
        activeCount++;

        const idx = i * 3;
        positions[idx] += data.velocity.x * delta;
        positions[idx + 1] += data.velocity.y * delta;
        positions[idx + 2] += data.velocity.z * delta;

        const lifeRatio = data.life / data.maxLife;
        let fadeAlpha: number;
        if (lifeRatio < 0.15) {
          fadeAlpha = lifeRatio / 0.15;
        } else if (lifeRatio > 0.85) {
          fadeAlpha = (1 - lifeRatio) / 0.15;
        } else {
          fadeAlpha = 1;
        }
        alphas[i] = Math.max(0, Math.min(1, fadeAlpha * 0.75));

        const y = positions[idx + 1];
        const x = positions[idx];
        if (y < -1 || y > 14 || x < -TERRAIN_SIZE * 0.6 || x > TERRAIN_SIZE * 0.6) {
          data.life = 0;
          data.active = false;
          alphas[i] = 0;
          positions[idx + 1] = -100;
        }
        needsUpdate = true;
      }

      if (!data.active && spawned < maxSpawn && activeCount < targetCount) {
        this.spawnParticle(i);
        if (data.active) {
          spawned++;
          activeCount++;
          needsUpdate = true;
        }
      }
    }

    if (needsUpdate && this.particles) {
      const posAttr = this.particles.geometry.attributes.position as THREE.BufferAttribute;
      const alphaAttr = this.particles.geometry.attributes.alpha as THREE.BufferAttribute;
      const colorAttr = this.particles.geometry.attributes.color as THREE.BufferAttribute;
      posAttr.needsUpdate = true;
      alphaAttr.needsUpdate = true;
      colorAttr.needsUpdate = true;
    }
  }

  private updateTerrainTransition(delta: number): boolean {
    if (!this.terrainGeometry || !this.terrainPositions || !this.terrainTargetHeights) return false;
    if (this.terrainTransitionProgress >= 1) return false;

    const positions = this.terrainGeometry.attributes.position;
    const count = positions.count;
    const speed = 2.0;
    const newProgress = Math.min(1, this.terrainTransitionProgress + delta * speed);
    const t = newProgress;
    const easeT = t * t * (3 - 2 * t);

    const startTime = performance.now();

    for (let i = 0; i < count; i++) {
      const currentY = this.terrainPositions[i * 3 + 1];
      const targetY = this.terrainTargetHeights[i];
      const newY = currentY + (targetY - currentY) * easeT;
      positions.setY(i, newY);
    }

    this.terrainTransitionProgress = newProgress;
    (positions as THREE.BufferAttribute).needsUpdate = true;
    this.terrainGeometry.computeVertexNormals();

    const elapsed = performance.now() - startTime;
    if (elapsed > FRAME_TIME_BUDGET) {
      console.warn(`Terrain update took ${elapsed.toFixed(1)}ms`);
    }

    return true;
  }

  private updateCloudsAnimation(delta: number): void {
    if (!this.clouds || !this.cloudPositions) return;

    const positions = this.cloudPositions;
    const time = this.clock.elapsedTime;
    let needsPosUpdate = false;

    for (let i = 0; i < CLOUD_COUNT; i++) {
      const idx = i * 3;
      const y = positions[idx + 1];

      if (y > 0) {
        positions[idx] += delta * 0.25;
        positions[idx + 1] += Math.sin(time * 0.4 + i * 0.5) * delta * 0.1;

        if (positions[idx] > TERRAIN_SIZE * 0.5) {
          positions[idx] = -TERRAIN_SIZE * 0.5;
        }
        needsPosUpdate = true;
      }
    }

    if (this.cloudNeedsUpdate) {
      const posAttr = this.clouds.geometry.attributes.position as THREE.BufferAttribute;
      const sizeAttr = this.clouds.geometry.attributes.size as THREE.BufferAttribute;
      const alphaAttr = this.clouds.geometry.attributes.alpha as THREE.BufferAttribute;
      posAttr.needsUpdate = true;
      sizeAttr.needsUpdate = true;
      alphaAttr.needsUpdate = true;
      this.cloudNeedsUpdate = false;
    } else if (needsPosUpdate) {
      (this.clouds.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    }

    const cloudColor = this.weatherColor.clone();
    cloudColor.lerp(new THREE.Color(0xffffff), 0.65);
    const material = this.clouds.material as THREE.ShaderMaterial;
    material.uniforms.color.value.lerp(cloudColor, 0.02);
  }

  private triggerLightning(): void {
    if (this.weatherType !== 'thunder') return;
    if (Math.random() > 0.015) return;

    const available = this.lightningPool.find(l => !l.line.visible);
    if (!available) return;

    const startX = (Math.random() - 0.5) * TERRAIN_SIZE * 0.6;
    const startZ = (Math.random() - 0.5) * TERRAIN_SIZE * 0.5;
    const startY = 11;
    const endY = 0;

    const points: THREE.Vector3[] = [];
    const segments = 12;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const wobble = (1 - t * 0.6) * 2.5;
      const x = startX + (Math.random() - 0.5) * wobble;
      const y = startY + (endY - startY) * t;
      const z = startZ + (Math.random() - 0.5) * wobble;
      points.push(new THREE.Vector3(x, y, z));
    }

    available.line.geometry.dispose();
    available.line.geometry = new THREE.BufferGeometry().setFromPoints(points);
    available.line.visible = true;
    available.opacity = 1;
    available.fadeSpeed = 3 + Math.random() * 3;

    (available.line.material as THREE.LineBasicMaterial).opacity = 1;
    (available.line.material as THREE.LineBasicMaterial).color.copy(this.weatherColor).lerp(new THREE.Color(0xffffff), 0.7);
  }

  private updateLightnings(delta: number): void {
    for (const lightning of this.lightningPool) {
      if (!lightning.line.visible) continue;

      lightning.opacity -= lightning.fadeSpeed * delta;
      if (lightning.opacity <= 0) {
        lightning.opacity = 0;
        lightning.line.visible = false;
      }
      (lightning.line.material as THREE.LineBasicMaterial).opacity = Math.max(0, lightning.opacity);
    }
  }

  private handleResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  };

  private startAnimationLoop(): void {
    let lastTime = performance.now();

    const animate = (): void => {
      if (this.isDestroyed) return;
      this.animationId = requestAnimationFrame(animate);

      const now = performance.now();
      let delta = (now - lastTime) / 1000;
      lastTime = now;
      delta = Math.min(delta, 0.1);

      this.clock.getDelta();

      this.controls.update();

      this.processUpdateQueue();

      this.updateTerrainTransition(delta);
      this.updateParticles(delta);
      this.updateCloudsAnimation(delta);
      this.updateLightnings(delta);
      this.triggerLightning();
      this.updateTerrainColor();
      this.updateFogColor(this.weatherType);

      this.renderer.render(this.scene, this.camera);
    };

    this.animationId = requestAnimationFrame(animate);
  }

  getControls(): OrbitControls {
    return this.controls;
  }

  getParticleCount(): number {
    return this.targetParticleCount;
  }

  getActiveParticleCount(): number {
    let count = 0;
    for (const p of this.particleData) {
      if (p.active && p.life > 0) count++;
    }
    return count;
  }

  destroy(): void {
    this.isDestroyed = true;

    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    window.removeEventListener('resize', this.handleResize);
    this.controls.dispose();
    this.renderer.dispose();

    this.terrainGeometry?.dispose();
    if (this.terrain?.material) {
      (this.terrain.material as THREE.Material).dispose();
    }

    this.clouds?.geometry.dispose();
    if (this.clouds?.material) {
      (this.clouds.material as THREE.Material).dispose();
    }

    this.particles?.geometry.dispose();
    if (this.particles?.material) {
      (this.particles.material as THREE.Material).dispose();
    }

    for (const lightning of this.lightningPool) {
      lightning.line.geometry.dispose();
      (lightning.line.material as THREE.Material).dispose();
    }
    this.lightningPool = [];

    this.particleData = [];
    this.updateQueue = [];
  }
}
