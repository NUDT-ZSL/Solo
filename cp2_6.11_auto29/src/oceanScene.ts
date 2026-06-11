import * as THREE from 'three';

export class OceanScene {
  public scene: THREE.Scene;
  public terrain!: THREE.Mesh;
  public plankton!: THREE.Points;
  public seaSurface!: THREE.Mesh;
  public fog: THREE.FogExp2;
  
  private terrainSize = 400;
  private terrainSegments = 64;
  private planktonCount = 200;
  private planktonData: { velocity: THREE.Vector3; originalY: number }[] = [];
  private time = 0;
  private noiseOffset = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.fog = new THREE.FogExp2(0x051D2D, 0.012);
    this.scene.fog = this.fog;
    
    this.createTerrain();
    this.createPlankton();
    this.createSeaSurface();
    this.setupLighting();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x6BB3E0, 0.7);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0x4A90D9, 1.2);
    directionalLight.position.set(50, 100, 50);
    this.scene.add(directionalLight);

    const pointLight = new THREE.PointLight(0x7EC8E3, 0.8, 300);
    pointLight.position.set(0, 60, 0);
    this.scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0xFFD93D, 0.3, 150);
    pointLight2.position.set(-50, 30, -50);
    this.scene.add(pointLight2);
  }

  private noise2D(x: number, y: number, seed: number = 0): number {
    const n = Math.sin(x * 12.9898 + y * 78.233 + seed) * 43758.5453;
    return n - Math.floor(n);
  }

  private smoothNoise(x: number, y: number, scale: number, seed: number = 0): number {
    const sx = x / scale;
    const sy = y / scale;
    const x0 = Math.floor(sx);
    const y0 = Math.floor(sy);
    const fx = sx - x0;
    const fy = sy - y0;

    const v00 = this.noise2D(x0, y0, seed);
    const v10 = this.noise2D(x0 + 1, y0, seed);
    const v01 = this.noise2D(x0, y0 + 1, seed);
    const v11 = this.noise2D(x0 + 1, y0 + 1, seed);

    const sx2 = fx * fx * (3 - 2 * fx);
    const sy2 = fy * fy * (3 - 2 * fy);

    const v0 = v00 + (v10 - v00) * sx2;
    const v1 = v01 + (v11 - v01) * sx2;

    return v0 + (v1 - v0) * sy2;
  }

  private fbm(x: number, y: number, seed: number = 0): number {
    let value = 0;
    let amplitude = 1;
    let frequency = 1;
    let maxValue = 0;

    for (let i = 0; i < 5; i++) {
      value += this.smoothNoise(x * frequency, y * frequency, 20 + seed * 10, seed) * amplitude;
      maxValue += amplitude;
      amplitude *= 0.5;
      frequency *= 2;
    }

    return value / maxValue;
  }

  private createTerrain(): void {
    const geometry = new THREE.PlaneGeometry(
      this.terrainSize,
      this.terrainSize,
      this.terrainSegments,
      this.terrainSegments
    );
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);

    const colorTop = new THREE.Color(0x1E5A8A);
    const colorBottom = new THREE.Color(0x0A2D4D);

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      const height = this.fbm(x, z) * 25 - 8;
      positions.setY(i, height);

      const t = (height + 8) / 25;
      const color = colorTop.clone().lerp(colorBottom, 1 - t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      flatShading: false,
      side: THREE.DoubleSide
    });

    this.terrain = new THREE.Mesh(geometry, material);
    this.scene.add(this.terrain);
  }

  private createPlankton(): void {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.planktonCount * 3);
    const colors = new Float32Array(this.planktonCount * 3);
    const sizes = new Float32Array(this.planktonCount);

    const colorStart = new THREE.Color(0x6B9EC2);
    const colorEnd = new THREE.Color(0xA8D5E2);

    for (let i = 0; i < this.planktonCount; i++) {
      const x = (Math.random() - 0.5) * this.terrainSize * 0.9;
      const y = Math.random() * 80 + 5;
      const z = (Math.random() - 0.5) * this.terrainSize * 0.9;

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      const t = Math.random();
      const color = colorStart.clone().lerp(colorEnd, t);
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      sizes[i] = Math.random() * 1.5 + 0.5;

      const speed = 0.1 + Math.random() * 0.2;
      const angle = Math.random() * Math.PI * 2;
      this.planktonData.push({
        velocity: new THREE.Vector3(
          Math.cos(angle) * speed,
          (Math.random() - 0.5) * 0.05,
          Math.sin(angle) * speed
        ),
        originalY: y
      });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 2.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    this.plankton = new THREE.Points(geometry, material);
    this.scene.add(this.plankton);
  }

  private createSeaSurface(): void {
    const geometry = new THREE.PlaneGeometry(
      this.terrainSize * 1.5,
      this.terrainSize * 1.5,
      50,
      50
    );
    geometry.rotateX(-Math.PI / 2);

    const positions = geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const wave = Math.sin(x * 0.05) * Math.cos(z * 0.05) * 2;
      positions.setY(i, 80 + wave);
    }
    geometry.computeVertexNormals();

    const material = new THREE.MeshPhongMaterial({
      color: 0x4A90D9,
      transparent: true,
      opacity: 0.1,
      side: THREE.DoubleSide,
      shininess: 100
    });

    this.seaSurface = new THREE.Mesh(geometry, material);
    this.scene.add(this.seaSurface);
  }

  public update(delta: number): void {
    this.time += delta;
    this.noiseOffset += delta * 0.5;

    this.updateTerrain();
    this.updatePlankton(delta);
    this.updateSeaSurface(delta);
    this.updateFog();
  }

  private updateTerrain(): void {
    const positions = this.terrain.geometry.attributes.position;
    const colors = this.terrain.geometry.attributes.color as THREE.BufferAttribute;

    const colorTop = new THREE.Color(0x1E5A8A);
    const colorBottom = new THREE.Color(0x0A2D4D);

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);

      const height = this.fbm(x + this.noiseOffset, z + this.noiseOffset * 0.7) * 15 - 5;
      positions.setY(i, height);

      const t = (height + 8) / 25;
      const color = colorTop.clone().lerp(colorBottom, 1 - t);
      colors.setXYZ(i, color.r, color.g, color.b);
    }

    positions.needsUpdate = true;
    colors.needsUpdate = true;
    this.terrain.geometry.computeVertexNormals();
  }

  private updatePlankton(delta: number): void {
    const positions = this.plankton.geometry.attributes.position;
    const halfSize = this.terrainSize * 0.45;

    for (let i = 0; i < this.planktonCount; i++) {
      let x = positions.getX(i);
      let y = positions.getY(i);
      let z = positions.getZ(i);

      const vel = this.planktonData[i].velocity;
      x += vel.x * delta * 60;
      y += vel.y * delta * 60 + Math.sin(this.time * 2 + i) * 0.02;
      z += vel.z * delta * 60;

      if (x > halfSize) x = -halfSize;
      if (x < -halfSize) x = halfSize;
      if (z > halfSize) z = -halfSize;
      if (z < -halfSize) z = halfSize;

      const data = this.planktonData[i];
      const yOffset = Math.sin(this.time + i * 0.5) * 2;
      y = Math.max(5, Math.min(85, data.originalY + yOffset));

      positions.setXYZ(i, x, y, z);
    }

    positions.needsUpdate = true;
  }

  private updateSeaSurface(delta: number): void {
    const positions = this.seaSurface.geometry.attributes.position;

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const wave = Math.sin(x * 0.05 + this.time) * Math.cos(z * 0.05 + this.time * 0.8) * 3;
      positions.setY(i, 80 + wave);
    }

    positions.needsUpdate = true;
    this.seaSurface.geometry.computeVertexNormals();
  }

  private updateFog(): void {
    const fogMin = 0.01;
    const fogMax = 0.03;
    const fogSpeed = 0.5;
    this.fog.density = fogMin + (Math.sin(this.time * fogSpeed) + 1) * 0.5 * (fogMax - fogMin);
  }

  public getTerrainHeight(x: number, z: number): number {
    return this.fbm(x + this.noiseOffset, z + this.noiseOffset * 0.7) * 25 - 8;
  }
}
