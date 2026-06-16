import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface SegmentData {
  start: THREE.Vector3;
  end: THREE.Vector3;
  createdAt: number;
  tipColorUntil?: number;
  tipColor?: string;
  isMainRoot: boolean;
}

export interface ParticleData {
  id: number;
  position: THREE.Vector3;
  type: 'nutrient' | 'water';
  alive: boolean;
  flashUntil?: number;
}

interface GridCell {
  particles: number[];
}

const MAX_SEGMENTS = 5000;
const SEGMENT_RADIUS = 0.05;
const NUTRIENT_COUNT = 50;
const WATER_COUNT = 80;
const PROFILE_ANIM_DURATION = 0.3;
const GRID_CELL_SIZE = 0.5;
const SOIL_MIN = new THREE.Vector3(-3, -3, -3);
const SOIL_MAX = new THREE.Vector3(3, 0, 3);

export class SceneRenderer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private container: HTMLElement;

  private soil!: THREE.Mesh;
  private nutrientPoints!: THREE.Points;
  private waterPoints!: THREE.Points;
  private rootMesh!: THREE.InstancedMesh;
  private flashMesh!: THREE.InstancedMesh;

  private rootGeometry!: THREE.CylinderGeometry;
  private rootMaterial!: THREE.MeshPhongMaterial;
  private dummy: THREE.Object3D;
  private flashDummy: THREE.Object3D;

  private clipPlane!: THREE.Plane;
  private profileMode = false;
  private profileAnimStart = -1;
  private profileStartY = 0;
  private profileTargetY = 0;
  private profileAnimProgress = 0;

  private segmentCount = 0;
  private segments: SegmentData[] = [];
  private particles: ParticleData[] = [];
  private flashes: { pos: THREE.Vector3; until: number }[] = [];

  private defaultCameraPos = new THREE.Vector3(4, 3, 6);
  private defaultTarget = new THREE.Vector3(0, -1, 0);

  private nutrientBasePositions: Float32Array;
  private waterBasePositions: Float32Array;

  private onResize: () => void;

  private gridCells: Map<string, GridCell> = new Map();

  private maxFlashCount = 50;

  constructor(container: HTMLElement) {
    this.container = container;
    this.dummy = new THREE.Object3D();
    this.flashDummy = new THREE.Object3D();

    this.scene = new THREE.Scene();

    const topColor = new THREE.Color(0x87ceeb);
    const bottomColor = new THREE.Color(0x90ee90);
    this.createGradientBackground(topColor, bottomColor);

    this.camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    );
    this.camera.position.copy(this.defaultCameraPos);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.localClippingEnabled = true;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(this.defaultTarget);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 20;
    this.controls.update();

    this.nutrientBasePositions = new Float32Array(NUTRIENT_COUNT * 3);
    this.waterBasePositions = new Float32Array(WATER_COUNT * 3);

    this.setupLighting();
    this.setupSoil();
    this.setupParticles();
    this.setupRootMesh();
    this.setupFlashMesh();

    this.onResize = () => this.handleResize();
    window.addEventListener('resize', this.onResize);
  }

  private createGradientBackground(top: THREE.Color, bottom: THREE.Color) {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#' + top.getHexString());
    gradient.addColorStop(1, '#' + bottom.getHexString());
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    this.scene.background = texture;
  }

  private setupLighting() {
    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambient);

    const light1 = new THREE.DirectionalLight(0xffffff, 0.8);
    light1.position.set(5, 8, 3);
    this.scene.add(light1);

    const light2 = new THREE.DirectionalLight(0xffffff, 0.6);
    light2.position.set(-5, 6, -5);
    this.scene.add(light2);
  }

  private setupSoil() {
    const geometry = new THREE.BoxGeometry(6, 3, 6);
    const material = new THREE.MeshPhongMaterial({
      color: 0x6b4226,
      transparent: true,
      opacity: 0.4,
      side: THREE.DoubleSide,
    });
    this.soil = new THREE.Mesh(geometry, material);
    this.soil.position.set(0, -1.5, 0);
    this.scene.add(this.soil);

    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 10);
    (this.soil.material as THREE.MeshPhongMaterial).clippingPlanes = [];
  }

  private getGridKey(x: number, y: number, z: number): string {
    return `${x}_${y}_${z}`;
  }

  private getGridCoords(pos: THREE.Vector3): [number, number, number] {
    return [
      Math.floor((pos.x - SOIL_MIN.x) / GRID_CELL_SIZE),
      Math.floor((pos.y - SOIL_MIN.y) / GRID_CELL_SIZE),
      Math.floor((pos.z - SOIL_MIN.z) / GRID_CELL_SIZE),
    ];
  }

  private addParticleToGrid(particleIndex: number) {
    const p = this.particles[particleIndex];
    const [gx, gy, gz] = this.getGridCoords(p.position);
    const key = this.getGridKey(gx, gy, gz);
    let cell = this.gridCells.get(key);
    if (!cell) {
      cell = { particles: [] };
      this.gridCells.set(key, cell);
    }
    if (!cell.particles.includes(particleIndex)) {
      cell.particles.push(particleIndex);
    }
  }

  private removeParticleFromGrid(particleIndex: number) {
    const p = this.particles[particleIndex];
    const [gx, gy, gz] = this.getGridCoords(p.position);
    const key = this.getGridKey(gx, gy, gz);
    const cell = this.gridCells.get(key);
    if (cell) {
      const idx = cell.particles.indexOf(particleIndex);
      if (idx !== -1) {
        cell.particles.splice(idx, 1);
      }
    }
  }

  private rebuildGrid() {
    this.gridCells.clear();
    for (let i = 0; i < this.particles.length; i++) {
      if (this.particles[i].alive) {
        this.addParticleToGrid(i);
      }
    }
  }

  getNearbyParticles(tipPos: THREE.Vector3): number[] {
    const result: number[] = [];
    const [gx, gy, gz] = this.getGridCoords(tipPos);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = this.getGridKey(gx + dx, gy + dy, gz + dz);
          const cell = this.gridCells.get(key);
          if (cell) {
            for (const pidx of cell.particles) {
              if (this.particles[pidx].alive && !result.includes(pidx)) {
                result.push(pidx);
              }
            }
          }
        }
      }
    }
    return result;
  }

  private setupParticles() {
    this.particles = [];

    const nutrientGeo = new THREE.BufferGeometry();
    const nutrientPositions = new Float32Array(NUTRIENT_COUNT * 3);
    const nutrientColors = new Float32Array(NUTRIENT_COUNT * 3);
    const nutrientSizes = new Float32Array(NUTRIENT_COUNT);

    for (let i = 0; i < NUTRIENT_COUNT; i++) {
      const x = (Math.random() - 0.5) * 5.5;
      const y = -Math.random() * 2.8 - 0.1;
      const z = (Math.random() - 0.5) * 5.5;
      nutrientPositions[i * 3] = x;
      nutrientPositions[i * 3 + 1] = y;
      nutrientPositions[i * 3 + 2] = z;
      this.nutrientBasePositions[i * 3] = x;
      this.nutrientBasePositions[i * 3 + 1] = y;
      this.nutrientBasePositions[i * 3 + 2] = z;

      nutrientColors[i * 3] = 1;
      nutrientColors[i * 3 + 1] = 0.843;
      nutrientColors[i * 3 + 2] = 0;
      nutrientSizes[i] = 0.02;

      this.particles.push({
        id: i,
        position: new THREE.Vector3(x, y, z),
        type: 'nutrient',
        alive: true,
      });
    }

    nutrientGeo.setAttribute('position', new THREE.BufferAttribute(nutrientPositions, 3));
    nutrientGeo.setAttribute('color', new THREE.BufferAttribute(nutrientColors, 3));
    nutrientGeo.setAttribute('size', new THREE.BufferAttribute(nutrientSizes, 1));

    const nutrientMat = new THREE.PointsMaterial({
      size: 0.06,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      sizeAttenuation: true,
    });
    this.nutrientPoints = new THREE.Points(nutrientGeo, nutrientMat);
    this.scene.add(this.nutrientPoints);

    const waterGeo = new THREE.BufferGeometry();
    const waterPositions = new Float32Array(WATER_COUNT * 3);
    const waterColors = new Float32Array(WATER_COUNT * 3);
    const waterSizes = new Float32Array(WATER_COUNT);

    for (let i = 0; i < WATER_COUNT; i++) {
      const x = (Math.random() - 0.5) * 5.5;
      const y = -Math.random() * 2.8 - 0.1;
      const z = (Math.random() - 0.5) * 5.5;
      waterPositions[i * 3] = x;
      waterPositions[i * 3 + 1] = y;
      waterPositions[i * 3 + 2] = z;
      this.waterBasePositions[i * 3] = x;
      this.waterBasePositions[i * 3 + 1] = y;
      this.waterBasePositions[i * 3 + 2] = z;

      waterColors[i * 3] = 0;
      waterColors[i * 3 + 1] = 0.749;
      waterColors[i * 3 + 2] = 1;
      waterSizes[i] = 0.015;

      this.particles.push({
        id: NUTRIENT_COUNT + i,
        position: new THREE.Vector3(x, y, z),
        type: 'water',
        alive: true,
      });
    }

    waterGeo.setAttribute('position', new THREE.BufferAttribute(waterPositions, 3));
    waterGeo.setAttribute('color', new THREE.BufferAttribute(waterColors, 3));
    waterGeo.setAttribute('size', new THREE.BufferAttribute(waterSizes, 1));

    const waterMat = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.95,
      sizeAttenuation: true,
    });
    this.waterPoints = new THREE.Points(waterGeo, waterMat);
    this.scene.add(this.waterPoints);

    this.rebuildGrid();
  }

  private setupRootMesh() {
    this.rootGeometry = new THREE.CylinderGeometry(
      SEGMENT_RADIUS,
      SEGMENT_RADIUS,
      1,
      8,
      1,
      false
    );
    this.rootGeometry.translate(0, 0.5, 0);

    this.rootMaterial = new THREE.MeshPhongMaterial({
      color: 0x8b4513,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
    });

    this.rootMesh = new THREE.InstancedMesh(
      this.rootGeometry,
      this.rootMaterial,
      MAX_SEGMENTS
    );
    this.rootMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.rootMesh.count = 0;

    this.rootMesh.instanceColor = new THREE.InstancedBufferAttribute(
      new Float32Array(MAX_SEGMENTS * 3),
      3
    );
    const defaultColor = new THREE.Color(0x8b4513);
    for (let i = 0; i < MAX_SEGMENTS; i++) {
      this.rootMesh.setColorAt(i, defaultColor);
    }
    (this.rootMesh.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;

    this.scene.add(this.rootMesh);
  }

  private setupFlashMesh() {
    const flashGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
    });
    this.flashMesh = new THREE.InstancedMesh(flashGeo, flashMat, this.maxFlashCount);
    this.flashMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.flashMesh.count = 0;
    this.scene.add(this.flashMesh);
  }

  addSegment(
    start: THREE.Vector3,
    end: THREE.Vector3,
    now: number,
    isMainRoot: boolean
  ): boolean {
    if (this.segmentCount >= MAX_SEGMENTS) {
      return false;
    }
    const seg: SegmentData = {
      start: start.clone(),
      end: end.clone(),
      createdAt: now,
      isMainRoot,
    };
    this.segments.push(seg);
    this.segmentCount++;
    this.rootMesh.count = this.segmentCount;
    this.updateSegmentInstance(this.segmentCount - 1, seg, now);
    return true;
  }

  canAddSegment(): boolean {
    return this.segmentCount < MAX_SEGMENTS;
  }

  private updateSegmentInstance(index: number, seg: SegmentData, now: number) {
    const direction = new THREE.Vector3().subVectors(seg.end, seg.start);
    const length = direction.length();
    if (length < 0.0001) return;

    this.dummy.position.copy(seg.start);
    this.dummy.lookAt(seg.end);
    this.dummy.rotateX(Math.PI / 2);
    this.dummy.scale.set(1, length, 1);
    this.dummy.updateMatrix();
    this.rootMesh.setMatrixAt(index, this.dummy.matrix);

    const age = (now - seg.createdAt) / 1000;
    let opacity = Math.min(1, age / 0.2) * 0.7;
    if (age < 0.2) {
      opacity = (age / 0.2) * 0.7;
    }
    this.rootMaterial.opacity = 0.7;

    let color = new THREE.Color(0x8b4513);
    if (seg.tipColorUntil && now < seg.tipColorUntil && seg.tipColor) {
      color = new THREE.Color(seg.tipColor);
    }
    this.rootMesh.setColorAt(index, color);

    this.rootMesh.instanceMatrix.needsUpdate = true;
    (this.rootMesh.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
  }

  setLastSegmentTipColor(color: string, until: number) {
    if (this.segments.length === 0) return;
    const last = this.segments[this.segments.length - 1];
    last.tipColor = color;
    last.tipColorUntil = until;
    this.updateSegmentInstance(this.segments.length - 1, last, performance.now());
  }

  addFlash(pos: THREE.Vector3, until: number) {
    this.flashes.push({ pos: pos.clone(), until });
  }

  getParticleCount(type: 'nutrient' | 'water'): number {
    if (type === 'nutrient') return NUTRIENT_COUNT;
    return WATER_COUNT;
  }

  getAbsorbedParticleCount(type: 'nutrient' | 'water'): number {
    let count = 0;
    for (const p of this.particles) {
      if (p.type === type && !p.alive) count++;
    }
    return count;
  }

  getAllParticles(): ParticleData[] {
    return this.particles;
  }

  absorbParticle(index: number, now: number) {
    const p = this.particles[index];
    if (!p.alive) return;
    p.alive = false;
    p.flashUntil = now + 100;
    this.addFlash(p.position, now + 100);
    this.removeParticleFromGrid(index);

    if (p.type === 'nutrient') {
      const attr = this.nutrientPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      const localIdx = p.id;
      arr[localIdx * 3] = 9999;
      arr[localIdx * 3 + 1] = 9999;
      arr[localIdx * 3 + 2] = 9999;
      attr.needsUpdate = true;
    } else {
      const attr = this.waterPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
      const arr = attr.array as Float32Array;
      const localIdx = p.id - NUTRIENT_COUNT;
      arr[localIdx * 3] = 9999;
      arr[localIdx * 3 + 1] = 9999;
      arr[localIdx * 3 + 2] = 9999;
      attr.needsUpdate = true;
    }
  }

  removeAllSegments() {
    this.segments = [];
    this.segmentCount = 0;
    this.rootMesh.count = 0;
    this.rootMesh.instanceMatrix.needsUpdate = true;
  }

  resetParticles() {
    this.nutrientPoints.geometry.dispose();
    this.waterPoints.geometry.dispose();
    this.scene.remove(this.nutrientPoints);
    this.scene.remove(this.waterPoints);
    this.setupParticles();
    this.flashes = [];
  }

  toggleProfile() {
    this.profileMode = !this.profileMode;
    this.profileAnimStart = performance.now() / 1000;
    this.profileStartY = this.profileMode ? 0 : 3;
    this.profileTargetY = this.profileMode ? 3 : 0;
    this.profileAnimProgress = 0;
    this.applyClipping();
  }

  private applyClipping() {
    let currentClipY: number;
    if (this.profileAnimStart >= 0) {
      const now = performance.now() / 1000;
      const elapsed = now - this.profileAnimStart;
      const t = Math.min(1, elapsed / PROFILE_ANIM_DURATION);
      this.profileAnimProgress = t;
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
      currentClipY = this.profileStartY + (this.profileTargetY - this.profileStartY) * ease;
      if (t >= 1) {
        this.profileAnimStart = -1;
      }
    } else {
      currentClipY = this.profileMode ? 3 : 0;
    }

    this.clipPlane.constant = -currentClipY;

    const soilMat = this.soil.material as THREE.MeshPhongMaterial;
    const rootMat = this.rootMaterial;
    const nutMat = this.nutrientPoints.material as THREE.PointsMaterial;
    const watMat = this.waterPoints.material as THREE.PointsMaterial;

    if (this.profileMode || this.profileAnimStart >= 0) {
      soilMat.clippingPlanes = [this.clipPlane];
      rootMat.clippingPlanes = [this.clipPlane];
      nutMat.clippingPlanes = [this.clipPlane];
      watMat.clippingPlanes = [this.clipPlane];
    } else {
      soilMat.clippingPlanes = [];
      rootMat.clippingPlanes = [];
      nutMat.clippingPlanes = [];
      watMat.clippingPlanes = [];
    }
    soilMat.needsUpdate = true;
    rootMat.needsUpdate = true;
  }

  isProfileMode(): boolean {
    return this.profileMode;
  }

  resetCamera() {
    this.camera.position.copy(this.defaultCameraPos);
    this.controls.target.copy(this.defaultTarget);
    this.controls.update();
  }

  private handleResize() {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  render(time: number, deltaTime: number) {
    const now = performance.now();

    this.applyClipping();

    const nutrientPosAttr = this.nutrientPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    const nutrientArr = nutrientPosAttr.array as Float32Array;
    for (let i = 0; i < NUTRIENT_COUNT; i++) {
      if (this.particles[i].alive) {
        const pulse = 1 + 0.15 * Math.sin((now / 1000) * Math.PI + i * 0.5);
        nutrientArr[i * 3] = this.nutrientBasePositions[i * 3];
        nutrientArr[i * 3 + 1] = this.nutrientBasePositions[i * 3 + 1];
        nutrientArr[i * 3 + 2] = this.nutrientBasePositions[i * 3 + 2];
      }
    }
    nutrientPosAttr.needsUpdate = true;

    const waterPosAttr = this.waterPoints.geometry.getAttribute('position') as THREE.BufferAttribute;
    const waterArr = waterPosAttr.array as Float32Array;
    for (let i = 0; i < WATER_COUNT; i++) {
      const pIdx = NUTRIENT_COUNT + i;
      if (this.particles[pIdx] && this.particles[pIdx].alive) {
        const offset = 0.05 * Math.sin((now / 1000) * 0.8 + i * 0.7);
        waterArr[i * 3] = this.waterBasePositions[i * 3];
        waterArr[i * 3 + 1] = this.waterBasePositions[i * 3 + 1] + offset;
        waterArr[i * 3 + 2] = this.waterBasePositions[i * 3 + 2];
        this.particles[pIdx].position.y = this.waterBasePositions[i * 3 + 1] + offset;
      }
    }
    waterPosAttr.needsUpdate = true;
    this.rebuildGrid();

    for (let i = 0; i < this.segments.length; i++) {
      this.updateSegmentInstance(i, this.segments[i], now);
    }

    const activeFlashes = this.flashes.filter(f => f.until > now);
    this.flashes = activeFlashes;
    this.flashMesh.count = Math.min(activeFlashes.length, this.maxFlashCount);
    for (let i = 0; i < this.flashMesh.count; i++) {
      const f = activeFlashes[i];
      this.flashDummy.position.copy(f.pos);
      this.flashDummy.scale.setScalar(1);
      this.flashDummy.updateMatrix();
      this.flashMesh.setMatrixAt(i, this.flashDummy.matrix);
    }
    this.flashMesh.instanceMatrix.needsUpdate = true;

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  getSegmentCount(): number {
    return this.segmentCount;
  }

  getSegments(): SegmentData[] {
    return this.segments;
  }

  dispose() {
    window.removeEventListener('resize', this.onResize);
    this.renderer.dispose();
    this.controls.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}
