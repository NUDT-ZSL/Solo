import * as THREE from 'three';
import { DuneParticles, DuneParams } from './DuneParticles';
import { TotemPillar, TotemInfo } from './TotemPillar';

export class DesertScene {
  readonly scene: THREE.Scene;
  private duneParticles: DuneParticles;
  private totemPillars: TotemPillar[] = [];
  private duneMesh: THREE.Mesh;
  private params: DuneParams;
  private clock: THREE.Clock;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private onTotemClick: ((info: TotemInfo, worldPos: THREE.Vector3) => void) | null = null;

  constructor(params: DuneParams) {
    this.params = params;
    this.scene = new THREE.Scene();
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.setupBackground();
    this.setupLighting();
    this.duneMesh = this.createDuneTerrain();
    this.duneParticles = new DuneParticles(params);
    this.scene.add(this.duneParticles.points);
    this.createTotems();

    const fog = new THREE.FogExp2(0x3d2b1f, 0.012);
    this.scene.fog = fog;
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const grad = ctx.createLinearGradient(0, 0, 0, 512);
    grad.addColorStop(0, '#1a0e05');
    grad.addColorStop(0.3, '#3d2b1f');
    grad.addColorStop(0.6, '#8b6914');
    grad.addColorStop(1, '#cd853f');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2, 512);

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    this.scene.background = texture;
  }

  private setupLighting(): void {
    const ambient = new THREE.AmbientLight(0x8b6914, 0.6);
    this.scene.add(ambient);

    const sun = new THREE.DirectionalLight(0xffd700, 1.2);
    sun.position.set(20, 30, 10);
    sun.castShadow = false;
    this.scene.add(sun);

    const fill = new THREE.DirectionalLight(0xcd853f, 0.4);
    fill.position.set(-15, 10, -20);
    this.scene.add(fill);
  }

  private createDuneTerrain(): THREE.Mesh {
    const size = 60;
    const segments = 128;
    const geo = new THREE.PlaneGeometry(size, size, segments, segments);
    geo.rotateX(-Math.PI / 2);

    const positions = geo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const y = this.terrainHeight(x, z);
      positions.setY(i, y);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
      color: 0xc4a35a,
      roughness: 0.95,
      metalness: 0.0,
      flatShading: false,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.y = -2;
    this.scene.add(mesh);
    return mesh;
  }

  private terrainHeight(x: number, z: number): number {
    return (
      Math.sin(x * 0.15) * Math.cos(z * 0.12) * 2.5 +
      Math.sin(x * 0.3 + z * 0.2) * 1.2 +
      Math.sin(x * 0.8) * Math.cos(z * 0.6) * 0.3 - 1.0
    );
  }

  private createTotems(): void {
    const positions: THREE.Vector3[] = [
      new THREE.Vector3(8, -1, 8),
      new THREE.Vector3(-10, -1, 6),
      new THREE.Vector3(4, -1, -12),
      new THREE.Vector3(-8, -1, -8),
      new THREE.Vector3(0, -1, 2),
    ];

    for (let i = 0; i < positions.length; i++) {
      const totem = new TotemPillar(positions[i], i, this.scene);
      totem.setOnResonate((pillar) => {
        this.duneParticles.triggerSandstorm(pillar.getPosition(), 8);
        if (this.onTotemClick) {
          this.onTotemClick(pillar.info, pillar.getPosition());
        }
      });
      this.totemPillars.push(totem);
    }
  }

  setOnTotemClick(cb: (info: TotemInfo, worldPos: THREE.Vector3) => void): void {
    this.onTotemClick = cb;
  }

  handleClick(mouseNDC: THREE.Vector2, camera: THREE.Camera): boolean {
    this.raycaster.setFromCamera(mouseNDC, camera);
    const meshes = this.totemPillars.map((t) => t.mesh);
    const intersects = this.raycaster.intersectObjects(meshes, false);
    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      for (const pillar of this.totemPillars) {
        if (pillar.mesh === hitMesh) {
          pillar.triggerResonance();
          return true;
        }
      }
    }
    return false;
  }

  updateParams(params: DuneParams): void {
    this.params = params;
    this.duneParticles.updateParams(params);
  }

  reset(): void {
    this.duneParticles.reset();
  }

  update(): void {
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.duneParticles.update(dt);
    for (const pillar of this.totemPillars) {
      pillar.update(dt);
    }

    const positions = this.duneMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const time = this.clock.elapsedTime;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const z = positions.getZ(i);
      const y =
        Math.sin(x * 0.15 + time * 0.1 * this.params.windSpeed) *
        Math.cos(z * 0.12 + time * 0.07 * this.params.windSpeed) * 2.5 +
        Math.sin(x * 0.3 + z * 0.2 + time * 0.15 * this.params.windSpeed) * 1.2 +
        Math.sin(x * 0.8 + time * 0.3 * this.params.windSpeed) *
        Math.cos(z * 0.6 + time * 0.2 * this.params.windSpeed) * 0.3 * (1 - this.params.erosionStrength * 0.5) - 1.0;
      positions.setY(i, y);
    }
    positions.needsUpdate = true;
    this.duneMesh.geometry.computeVertexNormals();
  }

  dispose(): void {
    this.duneParticles.dispose();
    for (const pillar of this.totemPillars) {
      pillar.dispose();
    }
    this.duneMesh.geometry.dispose();
    (this.duneMesh.material as THREE.Material).dispose();
  }
}
