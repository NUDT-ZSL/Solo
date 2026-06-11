import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { StarData } from './starData';
import { spectralTypeToColor } from './starData';
import type { ReliefParams } from './uiControls';
import { DEFAULT_PARAMS } from './uiControls';

const MAX_RIPPLES = 12;
const SURFACE_SIZE = 20;
const SURFACE_HALF = SURFACE_SIZE / 2;
const BASE_SEGMENTS = 64;
const BUMP_RADIUS = 0.3;
const BUMP_SEGMENTS = 20;
const RING_SPACING = 0.38;
const RING_WIDTH = 0.06;
const RING_SEGMENTS = 48;
const BG_STAR_SPHERE_RADIUS = 80;

const SPECULAR_COLOR = new THREE.Color(0xE0F0FF);
const AMBIENT_COLOR_HEX = 0x4A0066;
const SPECULAR_STRENGTH = 1.25;
const SHININESS = 120;
const EMISSIVE_BASE = 0.35;
const TRANSITION_TOTAL_MS = 300;
const TRANSITION_PROPAGATE_MS = 150;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function createRadialGradientTexture(inner: string, outer: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 1024;
  const ctx = canvas.getContext('2d')!;
  const cx = canvas.width / 2;
  const cy = canvas.height / 2;
  const r = Math.max(canvas.width, canvas.height) * 0.72;
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
  grad.addColorStop(0, inner);
  grad.addColorStop(0.55, '#0A0020');
  grad.addColorStop(1, outer);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.needsUpdate = true;
  return tex;
}

interface TransitionState {
  active: boolean;
  startTime: number;
  fromParams: ReliefParams;
  toParams: ReliefParams;
  fromColors: THREE.Color[];
  toColors: THREE.Color[];
  fromHeights: number[];
  toHeights: number[];
  starDistances: number[];
  maxDist: number;
  fromCurvature: number;
  toCurvature: number;
}

export class ReliefScene {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  controls: OrbitControls;
  reliefGroup: THREE.Group;

  private baseMesh: THREE.Mesh | null = null;
  private baseGeometry: THREE.PlaneGeometry | null = null;

  private bumpProtoGeo: THREE.SphereGeometry;
  private bumpInstanced: THREE.InstancedMesh;
  private bumpDummy = new THREE.Object3D();
  private bumpCount = 0;
  private bumpHeights: number[] = [];
  private bumpBaseY: number[] = [];

  private glowProtoGeo: THREE.SphereGeometry;
  private glowInstanced: THREE.InstancedMesh;

  private rippleProtoGeos: THREE.RingGeometry[] = [];
  private rippleInstanced: THREE.InstancedMesh[] = [];
  private rippleDummy = new THREE.Object3D();
  private rippleCount = 0;

  private backgroundPoints: THREE.Points | null = null;

  private starData: StarData[] = [];
  private starPlanePos = new Map<number, { x: number; z: number }>();

  private raycaster: THREE.Raycaster;
  private params: ReliefParams;
  private prevParams: ReliefParams;

  private transition: TransitionState | null = null;
  private highlightedIndex: number | null = null;

  private container: HTMLElement;
  private directionalLight: THREE.DirectionalLight;
  private viewLightVector = new THREE.Vector3();

  constructor(container: HTMLElement) {
    this.container = container;
    this.params = { ...DEFAULT_PARAMS };
    this.prevParams = { ...DEFAULT_PARAMS };
    this.raycaster = new THREE.Raycaster();

    this.scene = new THREE.Scene();
    this.scene.background = createRadialGradientTexture('#000000', '#1A0033');

    this.camera = new THREE.PerspectiveCamera(
      45,
      container.clientWidth / container.clientHeight,
      0.1,
      500,
    );
    this.camera.position.set(0, 14, 22);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 60;
    this.controls.maxPolarAngle = Math.PI * 0.85;
    this.controls.minPolarAngle = 0.1;
    this.controls.target.set(0, 0, 0);

    this.reliefGroup = new THREE.Group();
    this.scene.add(this.reliefGroup);

    this.directionalLight = this.createLighting();
    this.createBaseSurface();

    this.bumpProtoGeo = new THREE.SphereGeometry(BUMP_RADIUS, BUMP_SEGMENTS, BUMP_SEGMENTS / 2);
    this.glowProtoGeo = new THREE.SphereGeometry(BUMP_RADIUS * 1.6, 12, 6);

    this.bumpInstanced = this.createEmptyInstancedMesh(this.bumpProtoGeo, 0, true);
    this.glowInstanced = this.createEmptyInstancedMesh(this.glowProtoGeo, 0, false);

    this.reliefGroup.add(this.bumpInstanced);
    this.reliefGroup.add(this.glowInstanced);

    for (let i = 0; i < MAX_RIPPLES; i++) {
      const innerR = BUMP_RADIUS + 0.15 + i * RING_SPACING;
      const outerR = innerR + RING_WIDTH;
      const geo = new THREE.RingGeometry(innerR, outerR, RING_SEGMENTS);
      geo.rotateX(-Math.PI / 2);
      this.rippleProtoGeos.push(geo);
      const mesh = this.createEmptyInstancedMesh(geo, 0, true);
      mesh.visible = i < this.params.rippleWaves;
      this.rippleInstanced.push(mesh);
      this.reliefGroup.add(mesh);
    }

    this.updateBackgroundStars(this.params.backgroundStarDensity);
  }

  private createLighting(): THREE.DirectionalLight {
    const ambient = new THREE.AmbientLight(AMBIENT_COLOR_HEX, 1.0);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(SPECULAR_COLOR, SPECULAR_STRENGTH);
    dir.position.set(10, 20, 8);
    this.scene.add(dir);

    const p1 = new THREE.PointLight(0xCC88FF, 0.7, 50);
    p1.position.set(-8, 6, -6);
    this.scene.add(p1);

    const p2 = new THREE.PointLight(0x8888FF, 0.45, 60);
    p2.position.set(10, 8, 12);
    this.scene.add(p2);

    const rim = new THREE.DirectionalLight(0x6622AA, 0.3);
    rim.position.set(-4, 2, -10);
    this.scene.add(rim);

    return dir;
  }

  private createBumpMaterial(instanced: boolean): THREE.MeshPhongMaterial {
    const mat = new THREE.MeshPhongMaterial({
      color: 0xFFFFFF,
      specular: SPECULAR_COLOR,
      shininess: SHININESS,
      emissive: 0x000000,
      emissiveIntensity: EMISSIVE_BASE,
      flatShading: false,
    });
    return mat;
  }

  private createEmptyInstancedMesh(
    geo: THREE.BufferGeometry,
    count: number,
    isPhong: boolean,
  ): THREE.InstancedMesh {
    const mat = isPhong ? this.createBumpMaterial(true) : new THREE.MeshBasicMaterial({
      color: 0xFFFFFF,
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, Math.max(count, 1));
    mesh.count = count;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    if (isPhong) {
      const ic = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(count, 1) * 3), 3);
      ic.setUsage(THREE.DynamicDrawUsage);
      mesh.instanceColor = ic;
      (mesh.material as THREE.MeshPhongMaterial).vertexColors = true;
    } else {
      const ic = new THREE.InstancedBufferAttribute(new Float32Array(Math.max(count, 1) * 3), 3);
      ic.setUsage(THREE.DynamicDrawUsage);
      mesh.instanceColor = ic;
      (mesh.material as THREE.MeshBasicMaterial).vertexColors = true;
    }
    mesh.frustumCulled = false;
    return mesh;
  }

  private createBaseSurface() {
    const geo = new THREE.PlaneGeometry(SURFACE_SIZE, SURFACE_SIZE, BASE_SEGMENTS, BASE_SEGMENTS);
    geo.rotateX(-Math.PI / 2);
    this.baseGeometry = geo;

    const mat = new THREE.MeshPhongMaterial({
      color: 0x120028,
      specular: new THREE.Color(0x8822AA),
      shininess: 35,
      transparent: true,
      opacity: 0.75,
      side: THREE.DoubleSide,
      emissive: new THREE.Color(0x0D001A),
      emissiveIntensity: 0.45,
    });

    this.baseMesh = new THREE.Mesh(geo, mat);
    this.reliefGroup.add(this.baseMesh);
    this.applyCurvature(this.params.baseCurvature);

    const edgeGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(SURFACE_SIZE, SURFACE_SIZE));
    edgeGeo.rotateX(-Math.PI / 2);
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x8822AA,
      transparent: true,
      opacity: 0.5,
    });
    const edgeLine = new THREE.LineSegments(edgeGeo, edgeMat);
    edgeLine.position.y = 0.01;
    this.reliefGroup.add(edgeLine);
  }

  private applyCurvature(curvature: number) {
    if (!this.baseGeometry) return;
    const pos = this.baseGeometry.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const distSq = (x * x + z * z) / (SURFACE_HALF * SURFACE_HALF);
      const y = curvature * 4 * Math.max(0, 1 - distSq);
      pos.setY(i, y);
    }
    pos.needsUpdate = true;
    this.baseGeometry.computeVertexNormals();
  }

  private getCurvatureY(x: number, z: number, curvature: number): number {
    const distSq = (x * x + z * z) / (SURFACE_HALF * SURFACE_HALF);
    return curvature * 4 * Math.max(0, 1 - distSq);
  }

  private updateBackgroundStars(density: number) {
    if (this.backgroundPoints) {
      this.reliefGroup.remove(this.backgroundPoints);
      this.backgroundPoints.geometry.dispose();
      (this.backgroundPoints.material as THREE.PointsMaterial).dispose();
      this.backgroundPoints = null;
    }
    if (density <= 0) return;

    const count = Math.round(density);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = BG_STAR_SPHERE_RADIUS + Math.random() * 25;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.45;
      positions[i * 3 + 2] = r * Math.cos(phi);
      const b = 0.25 + Math.random() * 0.75;
      const tint = 0.75 + Math.random() * 0.25;
      colors[i * 3] = b * tint;
      colors[i * 3 + 1] = b * (0.7 + Math.random() * 0.3);
      colors[i * 3 + 2] = b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.45,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      sizeAttenuation: true,
    });
    this.backgroundPoints = new THREE.Points(geo, mat);
    this.reliefGroup.add(this.backgroundPoints);
  }

  loadStars(stars: StarData[]) {
    this.clearStars();
    this.starData = stars;
    this.starPlanePos.clear();
    if (stars.length === 0) return;

    let minRA = Infinity, maxRA = -Infinity, minDec = Infinity, maxDec = -Infinity;
    let minMag = Infinity, maxMag = -Infinity;
    for (const s of stars) {
      if (s.ra < minRA) minRA = s.ra;
      if (s.ra > maxRA) maxRA = s.ra;
      if (s.dec < minDec) minDec = s.dec;
      if (s.dec > maxDec) maxDec = s.dec;
      if (s.magnitude < minMag) minMag = s.magnitude;
      if (s.magnitude > maxMag) maxMag = s.magnitude;
    }
    const centerRA = (minRA + maxRA) / 2;
    const centerDec = (minDec + maxDec) / 2;
    const halfRangeRA = Math.max((maxRA - minRA) / 2, 1);
    const halfRangeDec = Math.max((maxDec - minDec) / 2, 1);
    const magRange = maxMag - minMag || 1;

    const count = stars.length;
    this.bumpCount = count;
    this.rippleCount = count;

    this.rebuildBumpBuffers(count);
    this.rebuildRippleBuffers(count);

    const bumpColor = (this.bumpInstanced.material as THREE.MeshPhongMaterial).color;
    const glowColor = new THREE.Color(0xFFFFFF);

    const normMags: number[] = [];
    const positions: { x: number; z: number; norm: number }[] = [];
    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const x = ((s.ra - centerRA) / halfRangeRA) * SURFACE_HALF * 0.82;
      const z = ((s.dec - centerDec) / halfRangeDec) * SURFACE_HALF * 0.82;
      const normMag = (maxMag - s.magnitude) / magRange;
      positions.push({ x, z, norm: normMag });
      this.starPlanePos.set(i, { x, z });
      normMags.push(normMag);
    }

    for (let i = 0; i < count; i++) {
      const { x, z, norm } = positions[i];
      const baseY = this.getCurvatureY(x, z, this.params.baseCurvature);
      const height = this.params.bumpScale * (0.3 + norm * 1.2);
      this.bumpHeights[i] = height;
      this.bumpBaseY[i] = baseY;

      const color = spectralTypeToColor(stars[i].spectralType, this.params.colorTempShift);

      this.bumpDummy.position.set(x, baseY + height, z);
      this.bumpDummy.scale.set(1, height / BUMP_RADIUS, 1);
      this.bumpDummy.rotation.set(0, 0, 0);
      this.bumpDummy.updateMatrix();
      this.bumpInstanced.setMatrixAt(i, this.bumpDummy.matrix);
      this.bumpInstanced.setColorAt(i, new THREE.Color(color.r, color.g, color.b));

      this.glowDummy().position.set(x, baseY + height, z);
      this.glowDummy().scale.set(1, height / BUMP_RADIUS, 1);
      this.glowDummy().updateMatrix();
      this.glowInstanced.setMatrixAt(i, this.glowDummy().matrix);
      this.glowInstanced.setColorAt(i, new THREE.Color(color.r, color.g, color.b));

      for (let r = 0; r < MAX_RIPPLES; r++) {
        this.rippleDummy.position.set(x, baseY + 0.05, z);
        this.rippleDummy.scale.set(1, 1, 1);
        this.rippleDummy.rotation.set(0, 0, 0);
        this.rippleDummy.updateMatrix();
        this.rippleInstanced[r].setMatrixAt(i, this.rippleDummy.matrix);
        const opacity = Math.max(0, 0.5 - r * 0.04);
        this.rippleInstanced[r].setColorAt(
          i,
          new THREE.Color(
            color.r * 0.8 * opacity * 2,
            color.g * 0.8 * opacity * 2,
            color.b * 0.8 * opacity * 2,
          ),
        );
      }
    }

    this.bumpInstanced.instanceMatrix.needsUpdate = true;
    if (this.bumpInstanced.instanceColor) this.bumpInstanced.instanceColor.needsUpdate = true;
    this.glowInstanced.instanceMatrix.needsUpdate = true;
    if (this.glowInstanced.instanceColor) this.glowInstanced.instanceColor.needsUpdate = true;
    for (let r = 0; r < MAX_RIPPLES; r++) {
      this.rippleInstanced[r].instanceMatrix.needsUpdate = true;
      if (this.rippleInstanced[r].instanceColor) this.rippleInstanced[r].instanceColor.needsUpdate = true;
    }
  }

  private glowDummyObj: THREE.Object3D | null = null;
  private glowDummy(): THREE.Object3D {
    if (!this.glowDummyObj) this.glowDummyObj = new THREE.Object3D();
    return this.glowDummyObj;
  }

  private rebuildBumpBuffers(count: number) {
    this.reliefGroup.remove(this.bumpInstanced);
    this.reliefGroup.remove(this.glowInstanced);
    this.bumpInstanced.geometry.dispose();
    (this.bumpInstanced.material as THREE.Material).dispose();
    this.glowInstanced.geometry.dispose();
    (this.glowInstanced.material as THREE.Material).dispose();

    this.bumpInstanced = this.createEmptyInstancedMesh(this.bumpProtoGeo, count, true);
    this.glowInstanced = this.createEmptyInstancedMesh(this.glowProtoGeo, count, false);

    this.reliefGroup.add(this.bumpInstanced);
    this.reliefGroup.add(this.glowInstanced);

    this.bumpHeights = new Array(count).fill(0);
    this.bumpBaseY = new Array(count).fill(0);
  }

  private rebuildRippleBuffers(count: number) {
    for (let r = 0; r < MAX_RIPPLES; r++) {
      const old = this.rippleInstanced[r];
      this.reliefGroup.remove(old);
      old.geometry.dispose();
      (old.material as THREE.Material).dispose();

      const mesh = this.createEmptyInstancedMesh(this.rippleProtoGeos[r], count, true);
      mesh.visible = r < this.params.rippleWaves;
      this.rippleInstanced[r] = mesh;
      this.reliefGroup.add(mesh);
    }
  }

  private clearStars() {
    this.starData = [];
    this.starPlanePos.clear();
    this.bumpCount = 0;
    this.rippleCount = 0;
    this.transition = null;
    this.highlightedIndex = null;
  }

  updateParams(params: Partial<ReliefParams>) {
    const old = { ...this.params };
    Object.assign(this.params, params);

    const needsTransition =
      old.bumpScale !== this.params.bumpScale ||
      old.colorTempShift !== this.params.colorTempShift ||
      old.baseCurvature !== this.params.baseCurvature;

    const changedKey = Object.keys(params)[0] as keyof ReliefParams;

    if (old.rippleWaves !== this.params.rippleWaves) {
      for (let r = 0; r < MAX_RIPPLES; r++) {
        this.rippleInstanced[r].visible = r < this.params.rippleWaves;
      }
    }

    if (old.backgroundStarDensity !== this.params.backgroundStarDensity) {
      this.updateBackgroundStars(this.params.backgroundStarDensity);
    }

    if (needsTransition && this.starData.length > 0) {
      this.initTransition(old, this.params);
    } else if (old.baseCurvature !== this.params.baseCurvature) {
      this.applyCurvature(this.params.baseCurvature);
    }
  }

  private initTransition(fromP: ReliefParams, toP: ReliefParams) {
    const count = this.starData.length;
    const fromColors: THREE.Color[] = [];
    const toColors: THREE.Color[] = [];
    const fromHeights: number[] = [];
    const toHeights: number[] = [];
    const starDistances: number[] = [];

    let minMag = Infinity, maxMag = -Infinity;
    for (const s of this.starData) {
      if (s.magnitude < minMag) minMag = s.magnitude;
      if (s.magnitude > maxMag) maxMag = s.magnitude;
    }
    const magRange = maxMag - minMag || 1;

    let maxDist = 0;
    for (let i = 0; i < count; i++) {
      const pos = this.starPlanePos.get(i)!;
      const d = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
      starDistances[i] = d;
      if (d > maxDist) maxDist = d;

      const normMag = (maxMag - this.starData[i].magnitude) / magRange;
      fromHeights[i] = fromP.bumpScale * (0.3 + normMag * 1.2);
      toHeights[i] = toP.bumpScale * (0.3 + normMag * 1.2);

      const fc = spectralTypeToColor(this.starData[i].spectralType, fromP.colorTempShift);
      const tc = spectralTypeToColor(this.starData[i].spectralType, toP.colorTempShift);
      fromColors[i] = new THREE.Color(fc.r, fc.g, fc.b);
      toColors[i] = new THREE.Color(tc.r, tc.g, tc.b);
    }

    this.transition = {
      active: true,
      startTime: performance.now(),
      fromParams: fromP,
      toParams: toP,
      fromColors,
      toColors,
      fromHeights,
      toHeights,
      starDistances,
      maxDist: Math.max(maxDist, 1),
      fromCurvature: fromP.baseCurvature,
      toCurvature: toP.baseCurvature,
    };
  }

  private updateTransition() {
    if (!this.transition) return;
    const t = this.transition;
    const elapsed = performance.now() - t.startTime;
    if (elapsed > TRANSITION_TOTAL_MS + TRANSITION_PROPAGATE_MS + 20) {
      this.finalizeTransition();
      return;
    }

    const curvatureProgress = easeOutCubic(Math.min(1, elapsed / TRANSITION_TOTAL_MS));
    const currentCurvature = t.fromCurvature + (t.toCurvature - t.fromCurvature) * curvatureProgress;
    this.applyCurvature(currentCurvature);

    for (let i = 0; i < this.starData.length; i++) {
      const normDist = t.starDistances[i] / t.maxDist;
      const localStart = normDist * TRANSITION_PROPAGATE_MS;
      const localElapsed = Math.max(0, elapsed - localStart);
      const progress = easeOutCubic(Math.min(1, localElapsed / TRANSITION_TOTAL_MS));

      const currentHeight = t.fromHeights[i] + (t.toHeights[i] - t.fromHeights[i]) * progress;
      const currentColor = t.fromColors[i].clone().lerp(t.toColors[i], progress);

      const pos = this.starPlanePos.get(i)!;
      const baseY = this.getCurvatureY(pos.x, pos.z, currentCurvature);

      this.bumpDummy.position.set(pos.x, baseY + currentHeight, pos.z);
      this.bumpDummy.scale.set(1, currentHeight / BUMP_RADIUS, 1);
      this.bumpDummy.rotation.set(0, 0, 0);
      this.bumpDummy.updateMatrix();
      this.bumpInstanced.setMatrixAt(i, this.bumpDummy.matrix);
      this.bumpInstanced.setColorAt(i, currentColor);

      const gd = this.glowDummy();
      gd.position.set(pos.x, baseY + currentHeight, pos.z);
      gd.scale.set(1, currentHeight / BUMP_RADIUS, 1);
      gd.updateMatrix();
      this.glowInstanced.setMatrixAt(i, gd.matrix);
      this.glowInstanced.setColorAt(i, currentColor);

      const highlight = this.highlightedIndex === i ? 1.3 : 1.0;
      for (let r = 0; r < MAX_RIPPLES; r++) {
        this.rippleDummy.position.set(pos.x, baseY + 0.05, pos.z);
        this.rippleDummy.scale.set(1, 1, 1);
        this.rippleDummy.rotation.set(0, 0, 0);
        this.rippleDummy.updateMatrix();
        this.rippleInstanced[r].setMatrixAt(i, this.rippleDummy.matrix);
        const opacity = Math.max(0, 0.5 - r * 0.04) * highlight;
        this.rippleInstanced[r].setColorAt(
          i,
          new THREE.Color(
            currentColor.r * 0.8 * opacity * 2,
            currentColor.g * 0.8 * opacity * 2,
            currentColor.b * 0.8 * opacity * 2,
          ),
        );
      }
    }

    this.bumpInstanced.instanceMatrix.needsUpdate = true;
    if (this.bumpInstanced.instanceColor) this.bumpInstanced.instanceColor.needsUpdate = true;
    this.glowInstanced.instanceMatrix.needsUpdate = true;
    if (this.glowInstanced.instanceColor) this.glowInstanced.instanceColor.needsUpdate = true;
    for (let r = 0; r < MAX_RIPPLES; r++) {
      this.rippleInstanced[r].instanceMatrix.needsUpdate = true;
      if (this.rippleInstanced[r].instanceColor) this.rippleInstanced[r].instanceColor.needsUpdate = true;
    }
  }

  private finalizeTransition() {
    if (!this.transition) return;
    const t = this.transition;
    this.applyCurvature(t.toCurvature);
    for (let i = 0; i < this.starData.length; i++) {
      const pos = this.starPlanePos.get(i)!;
      const baseY = this.getCurvatureY(pos.x, pos.z, t.toCurvature);
      const h = t.toHeights[i];
      const c = t.toColors[i];
      this.bumpHeights[i] = h;
      this.bumpBaseY[i] = baseY;

      this.bumpDummy.position.set(pos.x, baseY + h, pos.z);
      this.bumpDummy.scale.set(1, h / BUMP_RADIUS, 1);
      this.bumpDummy.updateMatrix();
      this.bumpInstanced.setMatrixAt(i, this.bumpDummy.matrix);
      this.bumpInstanced.setColorAt(i, c);

      const gd = this.glowDummy();
      gd.position.set(pos.x, baseY + h, pos.z);
      gd.scale.set(1, h / BUMP_RADIUS, 1);
      gd.updateMatrix();
      this.glowInstanced.setMatrixAt(i, gd.matrix);
      this.glowInstanced.setColorAt(i, c);

      const highlight = this.highlightedIndex === i ? 1.3 : 1.0;
      for (let r = 0; r < MAX_RIPPLES; r++) {
        this.rippleDummy.position.set(pos.x, baseY + 0.05, pos.z);
        this.rippleDummy.scale.set(1, 1, 1);
        this.rippleDummy.updateMatrix();
        this.rippleInstanced[r].setMatrixAt(i, this.rippleDummy.matrix);
        const opacity = Math.max(0, 0.5 - r * 0.04) * highlight;
        this.rippleInstanced[r].setColorAt(
          i,
          new THREE.Color(
            c.r * 0.8 * opacity * 2,
            c.g * 0.8 * opacity * 2,
            c.b * 0.8 * opacity * 2,
          ),
        );
      }
    }
    this.bumpInstanced.instanceMatrix.needsUpdate = true;
    if (this.bumpInstanced.instanceColor) this.bumpInstanced.instanceColor.needsUpdate = true;
    this.glowInstanced.instanceMatrix.needsUpdate = true;
    if (this.glowInstanced.instanceColor) this.glowInstanced.instanceColor.needsUpdate = true;
    for (let r = 0; r < MAX_RIPPLES; r++) {
      this.rippleInstanced[r].instanceMatrix.needsUpdate = true;
      if (this.rippleInstanced[r].instanceColor) this.rippleInstanced[r].instanceColor.needsUpdate = true;
    }
    this.transition = null;
  }

  highlightStar(index: number | null) {
    if (this.highlightedIndex === index) return;
    const prev = this.highlightedIndex;
    this.highlightedIndex = index;

    if (this.transition) return;

    const count = this.starData.length;
    for (let i = 0; i < count; i++) {
      const isTarget = i === index;
      const isPrev = i === prev;
      if (!isTarget && !isPrev) continue;

      const bumpColor = new THREE.Color();
      this.bumpInstanced.getColorAt(i, bumpColor);

      const emissiveMat = this.bumpInstanced.material as THREE.MeshPhongMaterial;
      // We'll do highlight by recoloring (emissive boost approximation)
      const c = spectralTypeToColor(
        this.starData[i].spectralType,
        this.params.colorTempShift,
      );
      const boost = isTarget ? 1.3 : 1.0;
      const finalColor = new THREE.Color(
        Math.min(1, c.r * boost),
        Math.min(1, c.g * boost * 0.98),
        Math.min(1, c.b * boost * 0.95),
      );
      this.bumpInstanced.setColorAt(i, finalColor);

      const glowBoost = isTarget ? 2.4 : 1.0;
      this.glowInstanced.setColorAt(
        i,
        new THREE.Color(c.r * glowBoost, c.g * glowBoost, c.b * glowBoost),
      );

      const pos = this.starPlanePos.get(i)!;
      const baseY = this.bumpBaseY[i];
      for (let r = 0; r < MAX_RIPPLES; r++) {
        const opacity = Math.max(0, 0.5 - r * 0.04) * (isTarget ? 1.3 : 1.0);
        this.rippleInstanced[r].setColorAt(
          i,
          new THREE.Color(
            c.r * 0.8 * opacity * 2,
            c.g * 0.8 * opacity * 2,
            c.b * 0.8 * opacity * 2,
          ),
        );
      }
    }

    if (this.bumpInstanced.instanceColor) this.bumpInstanced.instanceColor.needsUpdate = true;
    if (this.glowInstanced.instanceColor) this.glowInstanced.instanceColor.needsUpdate = true;
    for (let r = 0; r < MAX_RIPPLES; r++) {
      if (this.rippleInstanced[r].instanceColor) this.rippleInstanced[r].instanceColor.needsUpdate = true;
    }
  }

  raycast(mouseNDC: THREE.Vector2): { index: number; point: THREE.Vector3 } | null {
    if (this.bumpCount === 0) return null;
    this.raycaster.setFromCamera(mouseNDC, this.camera);
    const intersects = this.raycaster.intersectObject(this.bumpInstanced, false);
    if (intersects.length > 0) {
      const hit = intersects[0];
      const idx = hit.instanceId ?? -1;
      if (idx >= 0 && idx < this.starData.length) {
        return { index: idx, point: hit.point.clone() };
      }
    }
    return null;
  }

  getStarWorldPosition(index: number): THREE.Vector3 {
    if (index < 0 || index >= this.bumpCount) return new THREE.Vector3();
    const m = new THREE.Matrix4();
    this.bumpInstanced.getMatrixAt(index, m);
    const v = new THREE.Vector3().setFromMatrixPosition(m);
    v.applyMatrix4(this.reliefGroup.matrixWorld);
    return v;
  }

  getStarData(index: number): StarData | null {
    if (index < 0 || index >= this.starData.length) return null;
    return this.starData[index];
  }

  private updateDirectionalLightFromView() {
    this.camera.getWorldDirection(this.viewLightVector);
    this.viewLightVector.negate();
    this.viewLightVector.multiplyScalar(20);
    this.viewLightVector.add(this.camera.position);
    this.directionalLight.position.copy(this.viewLightVector);
    this.directionalLight.position.y = Math.max(4, this.directionalLight.position.y + 5);
  }

  update(deltaTime: number) {
    if (this.params.autoRotate) {
      const speed = this.params.rotationSpeed * ((2 * Math.PI) / 30);
      this.reliefGroup.rotation.y += speed * deltaTime;
    }

    this.updateDirectionalLightFromView();
    this.updateTransition();
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number) {
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  getParams(): ReliefParams {
    return { ...this.params };
  }

  getStarCount(): number {
    return this.starData.length;
  }

  dispose() {
    this.clearStars();
    this.bumpProtoGeo.dispose();
    this.glowProtoGeo.dispose();
    for (const g of this.rippleProtoGeos) g.dispose();
    if (this.baseMesh) {
      this.baseMesh.geometry.dispose();
      (this.baseMesh.material as THREE.Material).dispose();
    }
    if (this.backgroundPoints) {
      this.backgroundPoints.geometry.dispose();
      (this.backgroundPoints.material as THREE.Material).dispose();
    }
    this.renderer.dispose();
    this.controls.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
