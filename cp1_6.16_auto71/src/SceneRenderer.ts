import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export interface SegmentData {
  start: THREE.Vector3;
  end: THREE.Vector3;
  createdAt: number;
  tipColorUntil?: number;
  tipColor?: string;
}

export interface ParticleData {
  id: number;
  position: THREE.Vector3;
  type: 'nutrient' | 'water';
  alive: boolean;
  flashUntil?: number;
}

const MAX_SEGMENTS = 5000;
const SEGMENT_RADIUS = 0.05;
const NUTRIENT_COUNT = 50;
const WATER_COUNT = 30;
const PROFILE_ANIM_DURATION = 0.3;

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

  private segmentCount = 0;
  private segments: SegmentData[] = [];
  private particles: ParticleData[] = [];
  private flashes: { pos: THREE.Vector3; until: number }[] = [];

  private defaultCameraPos = new THREE.Vector3(4, 3, 6);
  private defaultTarget = new THREE.Vector3(0, -1, 0);

  private nutrientBasePositions: Float32Array;
  private waterBasePositions: Float32Array;

  private onResize: () => void;

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
    material.clippingPlanes = [];
  }

  private setupParticles() {
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
      clippingPlanes: [],
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
      clippingPlanes: [],
    });
    this.waterPoints = new THREE.Points(waterGeo, waterMat);
    this.scene.add(this.waterPoints);
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
      clippingPlanes: [],
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
    for (let i = 0; i < MAX_SEGMENTS; i++) {
      this.rootMesh.setColorAt(i, new THREE.Color(0x8b4513));
    }

    this.scene.add(this.rootMesh);
  }

  private setupFlashMesh() {
    const flashGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const flashMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,