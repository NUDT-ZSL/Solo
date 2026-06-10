import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { InkAnalysis, WeatherType } from './ink-engine';

const TERRAIN_SIZE = 20;
const TERRAIN_SEGMENTS = 128;
const MAX_PARTICLES = 3000;
const CLOUD_COUNT = 100;

interface ParticleData {
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class WeatherScene {
  private container: HTMLElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private animationId: number | null = null;

  private terrain: THREE.Mesh | null = null;
  private terrainGeometry: THREE.PlaneGeometry | null = null;
  private clouds: THREE.Points | null = null;
  private particles: THREE.Points | null = null;
  private particleData: ParticleData[] = [];
  private lightnings: THREE.Line[] = [];

  private currentAnalysis: InkAnalysis | null = null;
  private clock: THREE.Clock = new THREE.Clock();
  private targetParticleCount: number = 0;

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
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxPolarAngle = Math.PI / 2.1;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 40;
    this.controls.target.set(0, 2, 0);

    this.setupLighting();
    this.createTerrain();
    this.createClouds();
    this.createParticles();
    this.createLightnings();

    window.addEventListener('resize', this.handleResize);
    this.startAnimation();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 50;
    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;
    this.scene.add(directionalLight);

    const hemiLight = new THREE.HemisphereLight(0x87ceeb, 0x3d5c5c, 0.3);
    this.scene.add(hemiLight);
  }

  private createTerrain(): void {
    const geometry = new THREE.PlaneGeometry(
      TERRAIN_SIZE,
      TERRAIN_SIZE * 0.75,
      TERRAIN_SEGMENTS,
      Math.floor(TERRAIN_SEGMENTS * 0.75)
    );
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      positions.setY(i, 0);
    }
    positions.needsUpdate = true;
    geometry.computeVertexNormals();

    const material = new THREE.MeshStandardMaterial({
      color: 0x5d8a5d,
      flatShading: false,
      side: THREE.DoubleSide
    });

    this.terrain = new THREE.Mesh(geometry, material);
    this.terrain.receiveShadow = true;
    this.terrain.position.y = -0.5;
    this.scene.add(this.terrain);
    this.terrainGeometry = geometry;
  }

  private createClouds(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(CLOUD_COUNT * 3);
    const sizes = new Float32Array(CLOUD_COUNT);
    const alphas = new Float32Array(CLOUD_COUNT);

    for (let i = 0; i < CLOUD_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * TERRAIN_SIZE * 0.8;
      positions[i * 3 + 1] = 5 + Math.random() * 5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * TERRAIN_SIZE * 0.6;
      sizes[i] = 0.5 + Math.random() * 1.5;
      alphas[i] = 0.3 + Math.random() * 0.4;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
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
          gl_PointSize = size * 300.0 / -mvPosition.z;
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
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(MAX_PARTICLES * 3);
    const colors = new Float32Array(MAX_PARTICLES * 3);
    const alphas = new Float32Array(MAX_PARTICLES);

    for (let i = 0; i < MAX_PARTICLES; i++) {
      positions[i * 3] = 0;
      positions[i * 3 + 1] = -100;
      positions[i * 3 + 2] = 0;
      colors[i * 3] = 1;
      colors[i * 3 + 1] = 1;
      colors[i * 3 + 2] = 1;
      alphas[i] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1));

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);

    const texture = new THREE.CanvasTexture(canvas);

    const material = new THREE.ShaderMaterial({
      uniforms: {
        map: { value: texture },
        size: { value: 0.1 }
      },
      vertexShader: `
        attribute vec3 color;
        attribute float alpha;
        varying vec3 vColor;
        varying float vAlpha;
        uniform float size;
        void main() {
          vColor = color;
          vAlpha = alpha;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * 200.0 / -mvPosition.z;
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
        maxLife: 1
      });
    }
  }

  private createLightnings(): void {
    for (let i = 0; i < 5; i++) {
      const points: THREE.Vector3[] = [];
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      const material = new THREE.LineBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0
      });
      const lightning = new THREE.Line(geometry, material);
      lightning.visible = false;
      this.scene.add(lightning);
      this.lightnings.push(lightning);
    }
  }

  updateWeather(analysis: InkAnalysis): void {
    this.currentAnalysis = analysis;
    this.updateTerrain(analysis);
    this.updateClouds(analysis);
    this.updateParticleSystem(analysis);
    this.updateFogColor(analysis.weatherType);
  }

  private updateTerrain(analysis: InkAnalysis): void {
    if (!this.terrainGeometry) return;

    const positions = this.terrainGeometry.attributes.position;
    const width = analysis.mapWidth;
    const height = analysis.mapHeight;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      const u = (x + TERRAIN_SIZE / 2) / TERRAIN_SIZE;
      const v = (z + TERRAIN_SIZE * 0.375) / (TERRAIN_SIZE * 0.75);

      const mapX = Math.floor(u * (width - 1));
      const mapY = Math.floor(v * (height - 1));
      const clampedX = Math.max(0, Math.min(width - 1, mapX));
      const clampedY = Math.max(0, Math.min(height - 1, mapY));

      const heightValue = analysis.terrainHeightMap[clampedY * width + clampedX];
      positions.setY(i, heightValue * 3);
    }

    positions.needsUpdate = true;
    this.terrainGeometry.computeVertexNormals();

    const color = new THREE.Color(analysis.dominantColor);
    const terrainColor = color.multiplyScalar(0.5).offsetHSL(0, -0.3, 0.1);
    if (this.terrain) {
      (this.terrain.material as THREE.MeshStandardMaterial).color.lerp(terrainColor, 0.3);
    }
  }

  private updateClouds(analysis: InkAnalysis): void {
    if (!this.clouds) return;

    const positions = this.clouds.geometry.attributes.position as THREE.BufferAttribute;
    const sizes = this.clouds.geometry.attributes.size as THREE.BufferAttribute;
    const alphas = this.clouds.geometry.attributes.alpha as THREE.BufferAttribute;
    const width = analysis.mapWidth;
    const height = analysis.mapHeight;

    for (let i = 0; i < CLOUD_COUNT; i++) {
      const x = (Math.random() - 0.5) * TERRAIN_SIZE * 0.8;
      const z = (Math.random() - 0.5) * TERRAIN_SIZE * 0.6;

      const u = (x + TERRAIN_SIZE / 2) / TERRAIN_SIZE;
      const v = (z + TERRAIN_SIZE * 0.375) / (TERRAIN_SIZE * 0.75);

      const mapX = Math.floor(u * (width - 1));
      const mapY = Math.floor(v * (height - 1));
      const clampedX = Math.max(0, Math.min(width - 1, mapX));
      const clampedY = Math.max(0, Math.min(height - 1, mapY));

      const density = analysis.cloudDensityMap[clampedY * width + clampedX];

      if (density > 0.1) {
        positions.setXYZ(i, x, 4 + density * 5 + Math.random() * 2, z);
        sizes.setX(i, 0.5 + density * 1.5 + Math.random() * 0.5);
        alphas.setX(i, density * 0.6 + Math.random() * 0.2);
      } else {
        alphas.setX(i, 0);
      }
    }

    positions.needsUpdate = true;
    sizes.needsUpdate = true;
    alphas.needsUpdate = true;

    const cloudColor = new THREE.Color(analysis.dominantColor);
    cloudColor.lerp(new THREE.Color(0xffffff), 0.6);
    const material = this.clouds.material as THREE.ShaderMaterial;
    material.uniforms.color.value.lerp(cloudColor, 0.5);
  }

  private updateParticleSystem(analysis: InkAnalysis): void {
    let totalDensity = 0;
    for (let i = 0; i < analysis.cloudDensityMap.length; i++) {
      totalDensity += analysis.cloudDensityMap[i];
    }
    const avgDensity = totalDensity / analysis.cloudDensityMap.length;
    this.targetParticleCount = Math.min(MAX_PARTICLES, Math.floor(avgDensity * MAX_PARTICLES * 3));
  }

  private updateFogColor(weatherType: WeatherType): void {
    const fogColors: Record<WeatherType, number> = {
      rain: 0x2a3a4a,
      heat: 0x4a2020,
      thunder: 0x1a1a3a,
      sand: 0x4a3a20,
      ink: 0x1a1a2e
    };

    const targetColor = new THREE.Color(fogColors[weatherType] ?? 0x1a1a2e);
    if (this.scene.fog) {
      (this.scene.fog as THREE.Fog).color.lerp(targetColor, 0.1);
    }
    this.scene.background = (this.scene.fog as THREE.Fog).color.clone();
  }

  private spawnParticle(index: number): void {
    if (!this.particles || !this.currentAnalysis) return;

    const analysis = this.currentAnalysis;
    const positions = this.particles.geometry.attributes.position as THREE.BufferAttribute;
    const colors = this.particles.geometry.attributes.color as THREE.BufferAttribute;
    const alphas = this.particles.geometry.attributes.alpha as THREE.BufferAttribute;

    const x = (Math.random() - 0.5) * TERRAIN_SIZE * 0.8;
    const z = (Math.random() - 0.5) * TERRAIN_SIZE * 0.6;

    const u = (x + TERRAIN_SIZE / 2) / TERRAIN_SIZE;
    const v = (z + TERRAIN_SIZE * 0.375) / (TERRAIN_SIZE * 0.75);
    const mapX = Math.max(0, Math.min(analysis.mapWidth - 1, Math.floor(u * analysis.mapWidth)));
    const mapY = Math.max(0, Math.min(analysis.mapHeight - 1, Math.floor(v * analysis.mapHeight)));
    const density = analysis.cloudDensityMap[mapY * analysis.mapWidth + mapX];

    const color = new THREE.Color(analysis.dominantColor);
    const height = 5 + Math.random() * 5;

    positions.setXYZ(index, x, height, z);
    colors.setXYZ(index, color.r, color.g, color.b);
    alphas.setX(index, density);

    const data = this.particleData[index];
    data.maxLife = 4 + Math.random() * 4;
    data.life = data.maxLife;

    switch (analysis.weatherType) {
      case 'rain':
        data.velocity.set((Math.random() - 0.5) * 0.5, -8 - Math.random() * 4, (Math.random() - 0.5) * 0.5);
        break;
      case 'heat':
        data.velocity.set((Math.random() - 0.5) * 0.3, 2 + Math.random() * 2, (Math.random() - 0.5) * 0.3);
        break;
      case 'thunder':
        data.velocity.set((Math.random() - 0.5) * 1, -6 - Math.random() * 3, (Math.random() - 0.5) * 1);
        break;
      case 'sand':
        data.velocity.set(2 + Math.random() * 2, (Math.random() - 0.5) * 1, (Math.random() - 0.5) * 1);
        break;
      default:
        data.velocity.set(0, 0.5 + Math.random(), 0);
    }
  }

  private updateParticles(delta: number): void {
    if (!this.particles) return;

    const positions = this.particles.geometry.attributes.position as THREE.BufferAttribute;
    const alphas = this.particles.geometry.attributes.alpha as THREE.BufferAttribute;

    const activeCount = Math.min(this.targetParticleCount, MAX_PARTICLES);
    const spawnRate = activeCount / 4;
    let spawnIndex = -1;

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const data = this.particleData[i];

      if (data.life > 0) {
        data.life -= delta;

        const x = positions.getX(i) + data.velocity.x * delta;
        const y = positions.getY(i) + data.velocity.y * delta;
        const z = positions.getZ(i) + data.velocity.z * delta;

        positions.setXYZ(i, x, y, z);

        const lifeRatio = data.life / data.maxLife;
        const fadeAlpha = lifeRatio < 0.2 ? lifeRatio * 5 : lifeRatio > 0.8 ? (1 - lifeRatio) * 5 : 1;
        alphas.setX(i, Math.max(0, Math.min(1, fadeAlpha * 0.8)));

        if (y < -2 || y > 15 || x < -TERRAIN_SIZE / 2 || x > TERRAIN_SIZE / 2) {
          data.life = 0;
          alphas.setX(i, 0);
        }
      }

      if (data.life <= 0 && spawnIndex < 0 && Math.random() < spawnRate * delta / MAX_PARTICLES) {
        spawnIndex = i;
      }
    }

    if (spawnIndex >= 0 && activeCount > 0) {
      this.spawnParticle(spawnIndex);
    }

    positions.needsUpdate = true;
    alphas.needsUpdate = true;
  }

  private updateCloudsAnimation(delta: number): void {
    if (!this.clouds) return;

    const positions = this.clouds.geometry.attributes.position as THREE.BufferAttribute;
    const time = this.clock.elapsedTime;

    for (let i = 0; i < CLOUD_COUNT; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);

      if (y > 0) {
        positions.setX(i, x + delta * 0.2);
        positions.setY(i, y + Math.sin(time * 0.5 + i) * 0.01);

        if (x > TERRAIN_SIZE / 2) {
          positions.setX(i, -TERRAIN_SIZE / 2);
        }
      }
    }

    positions.needsUpdate = true;
  }

  private triggerLightning(): void {
    if (!this.currentAnalysis || this.currentAnalysis.weatherType !== 'thunder') return;
    if (Math.random() > 0.02) return;

    const lightning = this.lightnings.find(l => !l.visible);
    if (!lightning) return;

    const startX = (Math.random() - 0.5) * TERRAIN_SIZE * 0.6;
    const startZ = (Math.random() - 0.5) * TERRAIN_SIZE * 0.5;
    const startY = 10;
    const endY = 0;

    const points: THREE.Vector3[] = [];
    const segments = 10;

    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = startX + (Math.random() - 0.5) * 2 * (1 - t * 0.5);
      const y = startY + (endY - startY) * t;
      const z = startZ + (Math.random() - 0.5) * 2 * (1 - t * 0.5);
      points.push(new THREE.Vector3(x, y, z));
    }

    lightning.geometry.dispose();
    lightning.geometry = new THREE.BufferGeometry().setFromPoints(points);
    lightning.visible = true;

    const material = lightning.material as THREE.LineBasicMaterial;
    material.opacity = 1;

    setTimeout(() => {
      const fadeOut = () => {
        if (material.opacity > 0) {
          material.opacity -= 0.1;
          requestAnimationFrame(fadeOut);
        } else {
          lightning.visible = false;
        }
      };
      fadeOut();
    }, 100);
  }

  private handleResize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);
  };

  private startAnimation(): void {
    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      const delta = Math.min(this.clock.getDelta(), 0.1);

      this.controls.update();
      this.updateParticles(delta);
      this.updateCloudsAnimation(delta);
      this.triggerLightning();

      this.renderer.render(this.scene, this.camera);
    };
    animate();
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    window.removeEventListener('resize', this.handleResize);
    this.controls.dispose();
    this.renderer.dispose();
  }
}
