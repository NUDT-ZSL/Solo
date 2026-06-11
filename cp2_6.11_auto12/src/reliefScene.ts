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
const BUMP_SEGMENTS = 24;
const RING_SPACING = 0.38;
const RING_WIDTH = 0.06;
const RING_SEGMENTS = 48;
const BG_STAR_SPHERE_RADIUS = 80;

const SPECULAR_HEX = 0xE0F0FF;
const AMBIENT_HEX = 0x4A0066;
const SHININESS = 140;
const EMISSIVE_BASE = 0.3;
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
  return tex;
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
  private bumpHeights: Float32Array;
  private bumpBaseY: Float32Array;
  private starNormDist: Float32Array;

  private glowProtoGeo: THREE.SphereGeometry;
  private glowInstanced: THREE.InstancedMesh;
  private glowDummyObj: THREE.Object3D | null = null;

  private rippleProtoGeos: THREE.RingGeometry[] = [];
  private rippleInstanced: THREE.InstancedMesh[] = [];
  private rippleDummy = new THREE.Object3D();

  private backgroundPoints: THREE.Points | null = null;

  private starData: StarData[] = [];
  private starPlaneX: Float32Array;
  private starPlaneZ: Float32Array;
  private starNormMag: Float32Array;

  private raycaster: THREE.Raycaster;
  private params: ReliefParams;

  private transition: {
    active: boolean;
    startTime: number;
    fromBumpScale: number;
    toBumpScale: number;
    fromTempShift: number;
    toTempShift: number;
    fromCurvature: number;
    toCurvature: number;
  } | null = null;
  private highlightedIndex: number | null = null;

  private container: HTMLElement;
  private ambientLight: THREE.AmbientLight;

  constructor(container: HTMLElement) {
    this.container = container;
    this.params = { ...DEFAULT_PARAMS };
    this.raycaster = new THREE.Raycaster();
    this.bumpHeights = new Float32Array(0);
    this.bumpBaseY = new Float32Array(0);
    this.starNormDist = new Float32Array(0);
    this.starPlaneX = new Float32Array(0);
    this.starPlaneZ = new Float32Array(0);
    this.starNormMag = new Float32Array(0);

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
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 60;
    this.controls.maxPolarAngle = Math.PI * 0.85;
    this.controls.minPolarAngle = 0.1;

    this.reliefGroup = new THREE.Group();
    this.scene.add(this.reliefGroup);

    this.ambientLight = this.setupLighting();
    this.createBaseSurface();

    this.bumpProtoGeo = new THREE.SphereGeometry(BUMP_RADIUS, BUMP_SEGMENTS, BUMP_SEGMENTS / 2);
    this.glowProtoGeo = new THREE.SphereGeometry(BUMP_RADIUS * 1.7, 12, 6);
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

  private setupLighting(): THREE.AmbientLight {
    const ambient = new THREE.AmbientLight(AMBIENT_HEX, 1.1);
    this.scene.add(ambient);

    const keyLight = new THREE.DirectionalLight(0xE0F0FF, 1.4);
    keyLight.position.set(10, 18, 10);
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x8866FF, 0.5);
    fillLight.position.set(-12, 6, -8);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xFF66AA, 0.4);
    rimLight.position.set(0, 4, -14);
    this.scene.add(rimLight);

    const topPoint = new THREE.PointLight(0xCC88FF, 0.6, 40);
    topPoint.position.set(0, 15, 0);
    this.scene.add(topPoint);

    return ambient;
  }

  private createPhongMaterial(): THREE.MeshPhongMaterial {
    return new THREE.MeshPhongMaterial({
      color: 0xFFFFFF,
      specular: SPECULAR_HEX,
      shininess: SHININESS,
      emissive: 0x000000,
      emissiveIntensity: EMISSIVE_BASE,
      vertexColors: true,
      flatShading: false,
    });
  }

  private createEmptyInstancedMesh(
    geo: THREE.BufferGeometry,
    count: number,
    isPhong: boolean,
  ): THREE.InstancedMesh {
    const mat = isPhong
      ? this.createPhongMaterial()
      : new THREE.MeshBasicMaterial({
          color: 0xFFFFFF,
          transparent: true,
          opacity: 0.09,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          vertexColors: true,
        });
    const capacity = Math.max(count, 1);
    const mesh = new THREE.InstancedMesh(geo, mat, capacity);
    mesh.count = count;
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const ic = new THREE.InstancedBufferAttribute(new Float32Array(capacity * 3), 3);
    ic.setUsage(THREE.DynamicDrawUsage);
    mesh.instanceColor = ic;
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
      opacity: 0.78,
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
      opacity: 0.55,
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
      pos.setY(i, curvature * 4 * Math.max(0, 1 - distSq));
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
      colors[i * 3] = b * (0.75 + Math.random() * 0.25);
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
    this.bumpHeights = new Float32Array(count);
    this.bumpBaseY = new Float32Array(count);
    this.starNormDist = new Float32Array(count);
    this.starPlaneX = new Float32Array(count);
    this.starPlaneZ = new Float32Array(count);
    this.starNormMag = new Float32Array(count);

    this.rebuildBumpBuffers(count);
    this.rebuildRippleBuffers(count);

    const normMags = new Float32Array(count);
    let maxDist = 0;
    for (let i = 0; i < count; i++) {
      const s = stars[i];
      const x = ((s.ra - centerRA) / halfRangeRA) * SURFACE_HALF * 0.82;
      const z = ((s.dec - centerDec) / halfRangeDec) * SURFACE_HALF * 0.82;
      this.starPlaneX[i] = x;
      this.starPlaneZ[i] = z;
      const nm = (maxMag - s.magnitude) / magRange;
      normMags[i] = nm;
      this.starNormMag[i] = nm;
      const d = Math.sqrt(x * x + z * z);
      if (d > maxDist) maxDist = d;
    }
    const invMax = 1 / Math.max(maxDist, 0.001);
    for (let i = 0; i < count; i++) {
      const x = this.starPlaneX[i];
      const z = this.starPlaneZ[i];
      this.starNormDist[i] = Math.sqrt(x * x + z * z) * invMax;
    }

    for (let i = 0; i < count; i++) {
      const x = this.starPlaneX[i];
      const z = this.starPlaneZ[i];
      const baseY = this.getCurvatureY(x, z, this.params.baseCurvature);
      const height = this.params.bumpScale * (0.3 + normMags[i] * 1.2);
      this.bumpHeights[i] = height;
      this.bumpBaseY[i] = baseY;

      const color = spectralTypeToColor(stars[i].spectralType, this.params.colorTempShift);
      this.writeStarInstance(i, x, baseY, z, height, color, 1.0);
    }

    this.bumpInstanced.instanceMatrix.needsUpdate = true;
    (this.bumpInstanced.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
    this.glowInstanced.instanceMatrix.needsUpdate = true;
    (this.glowInstanced.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
    for (let r = 0; r < MAX_RIPPLES; r++) {
      this.rippleInstanced[r].instanceMatrix.needsUpdate = true;
      (this.rippleInstanced[r].instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
    }
  }

  private writeStarInstance(
    i: number,
    x: number,
    baseY: number,
    z: number,
    height: number,
    color: { r: number; g: number; b: number },
    brightnessMul: number,
  ) {
    const topY = baseY + height;
    const sy = height / BUMP_RADIUS;

    this.bumpDummy.position.set(x, topY, z);
    this.bumpDummy.scale.set(1, sy, 1);
    this.bumpDummy.rotation.set(0, 0, 0);
    this.bumpDummy.updateMatrix();
    this.bumpInstanced.setMatrixAt(i, this.bumpDummy.matrix);
    this.bumpInstanced.setColorAt(
      i,
      new THREE.Color(
        Math.min(1, color.r * brightnessMul),
        Math.min(1, color.g * brightnessMul * 0.99),
        Math.min(1, color.b * brightnessMul * 0.97),
      ),
    );

    const gd = this.glowDummy();
    gd.position.set(x, topY, z);
    gd.scale.set(1, sy, 1);
    gd.rotation.set(0, 0, 0);
    gd.updateMatrix();
    this.glowInstanced.setMatrixAt(i, gd.matrix);
    this.glowInstanced.setColorAt(
      i,
      new THREE.Color(
        color.r * brightnessMul,
        color.g * brightnessMul,
        color.b * brightnessMul,
      ),
    );

    for (let r = 0; r < MAX_RIPPLES; r++) {
      this.rippleDummy.position.set(x, baseY + 0.05, z);
      this.rippleDummy.scale.set(1, 1, 1);
      this.rippleDummy.rotation.set(0, 0, 0);
      this.rippleDummy.updateMatrix();
      this.rippleInstanced[r].setMatrixAt(i, this.rippleDummy.matrix);
      const opacity = Math.max(0, 0.5 - r * 0.04) * brightnessMul;
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
    this.bumpCount = 0;
    this.transition = null;
    this.highlightedIndex = null;
    this._mmCache = null;
  }

  updateParams(params: Partial<ReliefParams>) {
    const old = { ...this.params };
    Object.assign(this.params, params);

    if (old.rippleWaves !== this.params.rippleWaves) {
      for (let r = 0; r < MAX_RIPPLES; r++) {
        this.rippleInstanced[r].visible = r < this.params.rippleWaves;
      }
    }

    if (old.backgroundStarDensity !== this.params.backgroundStarDensity) {
      this.updateBackgroundStars(this.params.backgroundStarDensity);
    }

    const needsTransition =
      old.bumpScale !== this.params.bumpScale ||
      old.colorTempShift !== this.params.colorTempShift ||
      old.baseCurvature !== this.params.baseCurvature;

    if (needsTransition && this.starData.length > 0) {
      this.transition = {
        active: true,
        startTime: performance.now(),
        fromBumpScale: old.bumpScale,
        toBumpScale: this.params.bumpScale,
        fromTempShift: old.colorTempShift,
        toTempShift: this.params.colorTempShift,
        fromCurvature: old.baseCurvature,
        toCurvature: this.params.baseCurvature,
      };
    } else if (old.baseCurvature !== this.params.baseCurvature) {
      this.applyCurvature(this.params.baseCurvature);
    }
  }

  private updateTransition() {
    if (!this.transition || !this.transition.active) return;
    const t = this.transition;
    const elapsed = performance.now() - t.startTime;
    const ended = elapsed >= TRANSITION_TOTAL_MS + TRANSITION_PROPAGATE_MS;

    if (ended) {
      this.applyCurvature(t.toCurvature);
      this.refreshAllInstances(t.toBumpScale, t.toTempShift, t.toCurvature);
      this.transition = null;
      return;
    }

    const curvatureProgress = easeOutCubic(Math.min(1, elapsed / TRANSITION_TOTAL_MS));
    const currentCurvature = t.fromCurvature + (t.toCurvature - t.fromCurvature) * curvatureProgress;
    this.applyCurvature(currentCurvature);

    const count = this.starData.length;
    const stars = this.starData;
    const px = this.starPlaneX;
    const pz = this.starPlaneZ;
    const normD = this.starNormDist;
    const fromScale = t.fromBumpScale;
    const toScale = t.toBumpScale;
    const fromShift = t.fromTempShift;
    const toShift = t.toTempShift;
    const hi = this.highlightedIndex;

    const highlightBoost = 1.3;
    const normBoost = 1.0;

    for (let i = 0; i < count; i++) {
      const localStart = normD[i] * TRANSITION_PROPAGATE_MS;
      const localElapsed = Math.max(0, elapsed - localStart);
      const progress = easeOutCubic(Math.min(1, localElapsed / TRANSITION_TOTAL_MS));

      const scale = fromScale + (toScale - fromScale) * progress;
      const cshift = fromShift + (toShift - fromShift) * progress;

      const s = stars[i];
      const nm = this.starNormMag[i];

      const x = px[i];
      const z = pz[i];
      const baseY = this.getCurvatureY(x, z, currentCurvature);
      const height = scale * (0.3 + nm * 1.2);
      const color = spectralTypeToColor(s.spectralType, cshift);
      const br = hi === i ? highlightBoost : normBoost;

      this.bumpDummy.position.set(x, baseY + height, z);
      this.bumpDummy.scale.set(1, height / BUMP_RADIUS, 1);
      this.bumpDummy.updateMatrix();
      this.bumpInstanced.setMatrixAt(i, this.bumpDummy.matrix);
      this.bumpInstanced.setColorAt(
        i,
        new THREE.Color(
          Math.min(1, color.r * br),
          Math.min(1, color.g * br * 0.99),
          Math.min(1, color.b * br * 0.97),
        ),
      );

      const gd = this.glowDummy();
      gd.position.set(x, baseY + height, z);
      gd.scale.set(1, height / BUMP_RADIUS, 1);
      gd.updateMatrix();
      this.glowInstanced.setMatrixAt(i, gd.matrix);
      this.glowInstanced.setColorAt(i, new THREE.Color(color.r * br, color.g * br, color.b * br));

      for (let r = 0; r < MAX_RIPPLES; r++) {
        this.rippleDummy.position.set(x, baseY + 0.05, z);
        this.rippleDummy.updateMatrix();
        this.rippleInstanced[r].setMatrixAt(i, this.rippleDummy.matrix);
        const opacity = Math.max(0, 0.5 - r * 0.04) * br;
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
    (this.bumpInstanced.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
    this.glowInstanced.instanceMatrix.needsUpdate = true;
    (this.glowInstanced.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
    for (let r = 0; r < MAX_RIPPLES; r++) {
      this.rippleInstanced[r].instanceMatrix.needsUpdate = true;
      (this.rippleInstanced[r].instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
    }
  }

  private _mmCache: { min: number; max: number } | null = null;
  private getMagMinMax(): { min: number; max: number } {
    if (this._mmCache) return this._mmCache;
    let min = Infinity, max = -Infinity;
    for (const s of this.starData) {
      if (s.magnitude < min) min = s.magnitude;
      if (s.magnitude > max) max = s.magnitude;
    }
    this._mmCache = { min, max };
    return this._mmCache;
  }

  private refreshAllInstances(scale: number, tempShift: number, curvature: number) {
    const count = this.starData.length;
    const hi = this.highlightedIndex;
    const boost = hi !== null ? 1.3 : 1.0;

    for (let i = 0; i < count; i++) {
      const s = this.starData[i];
      const nm = this.starNormMag[i];
      const x = this.starPlaneX[i];
      const z = this.starPlaneZ[i];
      const baseY = this.getCurvatureY(x, z, curvature);
      const height = scale * (0.3 + nm * 1.2);
      this.bumpHeights[i] = height;
      this.bumpBaseY[i] = baseY;
      const color = spectralTypeToColor(s.spectralType, tempShift);
      const br = hi === i ? boost : 1.0;
      this.writeStarInstance(i, x, baseY, z, height, color, br);
    }

    this.bumpInstanced.instanceMatrix.needsUpdate = true;
    (this.bumpInstanced.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
    this.glowInstanced.instanceMatrix.needsUpdate = true;
    (this.glowInstanced.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
    for (let r = 0; r < MAX_RIPPLES; r++) {
      this.rippleInstanced[r].instanceMatrix.needsUpdate = true;
      (this.rippleInstanced[r].instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
    }
  }

  highlightStar(index: number | null) {
    if (this.highlightedIndex === index) return;
    if (this.transition && this.transition.active) {
      this.highlightedIndex = index;
      return;
    }

    const prev = this.highlightedIndex;
    this.highlightedIndex = index;
    const count = this.starData.length;
    const toUpdate: number[] = [];
    if (prev !== null && prev >= 0 && prev < count) toUpdate.push(prev);
    if (index !== null && index >= 0 && index < count) toUpdate.push(index);
    if (toUpdate.length === 0) return;

    for (const i of toUpdate) {
      const s = this.starData[i];
      const nm = this.starNormMag[i];
      const x = this.starPlaneX[i];
      const z = this.starPlaneZ[i];
      const baseY = this.bumpBaseY[i];
      const height = this.params.bumpScale * (0.3 + nm * 1.2);
      const color = spectralTypeToColor(s.spectralType, this.params.colorTempShift);
      const br = index === i ? 1.3 : 1.0;
      this.writeStarInstance(i, x, baseY, z, height, color, br);
    }

    (this.bumpInstanced.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
    (this.glowInstanced.instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
    for (let r = 0; r < MAX_RIPPLES; r++) {
      (this.rippleInstanced[r].instanceColor as THREE.InstancedBufferAttribute).needsUpdate = true;
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

  update(deltaTime: number) {
    if (this.params.autoRotate) {
      const speed = this.params.rotationSpeed * ((2 * Math.PI) / 30);
      this.reliefGroup.rotation.y += speed * deltaTime;
    }

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
