import * as THREE from 'three';

const SCENE_SIZE = 400;
const PARTICLE_COUNT = 200;
const COLOR_TOP = new THREE.Color('#0B3D5D');
const COLOR_BOTTOM = new THREE.Color('#051D2D');
const PARTICLE_COLOR_START = new THREE.Color('#6B9EC2');
const PARTICLE_COLOR_END = new THREE.Color('#A8D5E2');

export class OceanScene {
  public group: THREE.Group;
  private terrain!: THREE.Mesh;
  private terrainGeometry!: THREE.PlaneGeometry;
  private particles!: THREE.Points;
  private particleVelocities: THREE.Vector3[] = [];
  private surfaceLight!: THREE.Mesh;
  private fog!: THREE.FogExp2;
  private scene: THREE.Scene;
  private noiseTime = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.createTerrain();
    this.createParticles();
    this.createSurfaceLight();
    this.setupFog();
    this.setupLights();
    scene.add(this.group);
  }

  private createTerrain(): void {
    const segments = 80;
    this.terrainGeometry = new THREE.PlaneGeometry(
      SCENE_SIZE,
      SCENE_SIZE,
      segments,
      segments
    );
    this.terrainGeometry.rotateX(-Math.PI / 2);

    this.updateTerrainHeights(0);

    const colors: number[] = [];
    const positions = this.terrainGeometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const y = positions.getY(i);
      const t = (y + 15) / 30;
      const color = COLOR_TOP.clone().lerp(COLOR_BOTTOM, Math.max(0, Math.min(1, t)));
      colors.push(color.r, color.g, color.b);
    }
    this.terrainGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.MeshStandardMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
      roughness: 0.85,
      metalness: 0.1,
      flatShading: true
    });

    this.terrain = new THREE.Mesh(this.terrainGeometry, material);
    this.terrain.receiveShadow = true;
    this.group.add(this.terrain);
  }

  private updateTerrainHeights(time: number): void {
    const positions = this.terrainGeometry.attributes.position;
    const half = SCENE_SIZE / 2;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      const nx = (x + half) / SCENE_SIZE * 4;
      const nz = (z + half) / SCENE_SIZE * 4;

      const h1 = Math.sin(nx * 1.5 + time * 0.08) * Math.cos(nz * 1.2 + time * 0.06) * 4;
      const h2 = Math.sin(nx * 2.8 - time * 0.04) * Math.cos(nz * 2.3 + time * 0.05) * 2;
      const h3 = Math.sin(nx * 0.8 + nz * 0.6 + time * 0.02) * 5;

      const height = h1 + h2 + h3 - 8;
      positions.setY(i, height);
    }
    positions.needsUpdate = true;
    this.terrainGeometry.computeVertexNormals();
  }

  private createParticles(): void {
    const half = SCENE_SIZE / 2;
    const geometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const colors: number[] = [];
    const sizes: number[] = [];

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const x = (Math.random() - 0.5) * SCENE_SIZE;
      const y = Math.random() * 60 - 5;
      const z = (Math.random() - 0.5) * SCENE_SIZE;
      positions.push(x, y, z);

      const t = Math.random();
      const color = PARTICLE_COLOR_START.clone().lerp(PARTICLE_COLOR_END, t);
      colors.push(color.r, color.g, color.b);

      sizes.push(0.8 + Math.random() * 1.2);

      const speed = 0.1 + Math.random() * 0.2;
      const angle = Math.random() * Math.PI * 2;
      const vy = (Math.random() - 0.5) * 0.15;
      this.particleVelocities.push(new THREE.Vector3(
        Math.cos(angle) * speed,
        vy,
        Math.sin(angle) * speed
      ));
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.Float32BufferAttribute(sizes, 1));

    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(200,230,255,0.6)');
    gradient.addColorStop(1, 'rgba(100,180,230,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    const sprite = new THREE.CanvasTexture(canvas);

    const material = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      map: sprite,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
      depthWrite: false
    });

    this.particles = new THREE.Points(geometry, material);
    this.group.add(this.particles);
  }

  private createSurfaceLight(): void {
    const geometry = new THREE.PlaneGeometry(SCENE_SIZE * 1.2, SCENE_SIZE * 1.2, 1, 1);
    const material = new THREE.MeshBasicMaterial({
      color: 0x4A90D9,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    this.surfaceLight = new THREE.Mesh(geometry, material);
    this.surfaceLight.rotation.x = -Math.PI / 2;
    this.surfaceLight.position.y = 55;
    this.group.add(this.surfaceLight);
  }

  private setupFog(): void {
    this.fog = new THREE.FogExp2(0x051D2D, 0.015);
    this.scene.fog = this.fog;
    this.scene.background = new THREE.Color('#051D2D');
  }

  private setupLights(): void {
    const ambient = new THREE.AmbientLight(0x6B9EC2, 0.5);
    this.group.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xA8D5E2, 0.7);
    dirLight.position.set(60, 100, 40);
    this.group.add(dirLight);

    const pointLight1 = new THREE.PointLight(0x4A90D9, 0.6, 250);
    pointLight1.position.set(0, 40, 0);
    this.group.add(pointLight1);

    const rimLight = new THREE.DirectionalLight(0x0B3D5D, 0.3);
    rimLight.position.set(-50, 30, -50);
    this.group.add(rimLight);
  }

  public getTerrainHeight(x: number, z: number): number {
    const half = SCENE_SIZE / 2;
    const nx = (x + half) / SCENE_SIZE * 4;
    const nz = (z + half) / SCENE_SIZE * 4;

    const time = this.noiseTime;
    const h1 = Math.sin(nx * 1.5 + time * 0.08) * Math.cos(nz * 1.2 + time * 0.06) * 4;
    const h2 = Math.sin(nx * 2.8 - time * 0.04) * Math.cos(nz * 2.3 + time * 0.05) * 2;
    const h3 = Math.sin(nx * 0.8 + nz * 0.6 + time * 0.02) * 5;

    return h1 + h2 + h3 - 8;
  }

  public update(delta: number, elapsed: number): void {
    this.noiseTime += delta * 60;

    this.updateTerrainHeights(this.noiseTime);

    const positions = this.particles.geometry.attributes.position as THREE.BufferAttribute;
    const half = SCENE_SIZE / 2;

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const ix = i * 3;
      let px = positions.array[ix] as number;
      let py = positions.array[ix + 1] as number;
      let pz = positions.array[ix + 2] as number;

      const vel = this.particleVelocities[i];
      px += vel.x * delta * 60;
      py += vel.y * delta * 60;
      pz += vel.z * delta * 60;

      if (px > half) px = -half;
      if (px < -half) px = half;
      if (pz > half) pz = -half;
      if (pz < -half) pz = half;
      if (py > 55) py = -5;
      if (py < -5) py = 55;

      positions.array[ix] = px;
      positions.array[ix + 1] = py;
      positions.array[ix + 2] = pz;
    }
    positions.needsUpdate = true;

    this.fog.density = 0.015 + Math.sin(elapsed * 0.5) * 0.01;

    const mat = this.surfaceLight.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.08 + Math.sin(elapsed * 0.7) * 0.03;
  }

  public dispose(): void {
    this.terrainGeometry.dispose();
    (this.terrain.material as THREE.Material).dispose();
    this.particles.geometry.dispose();
    (this.particles.material as THREE.Material).dispose();
    (this.surfaceLight.material as THREE.Material).dispose();
    this.scene.remove(this.group);
  }
}
