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
const RING_WIDTH = 0.1;
const RING_SEGMENTS = 48;
const BG_STAR_SPHERE_RADIUS = 80;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function createGradientTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(256, 256, 0, 256, 256, 360);
  grad.addColorStop(0, '#000000');
  grad.addColorStop(0.6, '#0D001A');
  grad.addColorStop(1, '#1A0033');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);
  const tex = new THREE.CanvasTexture(canvas);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  return tex;
}

export class ReliefScene {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private reliefGroup: THREE.Group;
  private baseMesh: THREE.Mesh | null = null;
  private baseGeometry: THREE.PlaneGeometry | null = null;
  private bumpMeshes: THREE.Mesh[] = [];
  private glowMeshes: THREE.Mesh[] = [];
  private rippleGroups: THREE.Mesh[][] = [];
  private backgroundPoints: THREE.Points | null = null;
  private starData: StarData[] = [];
  private starPositions: THREE.Vector3[] = [];
  private maxDist = 1;
  private raycaster: THREE.Raycaster;
  private params: ReliefParams;
  private prevParams: ReliefParams;
  private transitionActive = false;
  private transitionStart = 0;
  private highlightedIndex: number | null = null;
  private container: HTMLElement;

  constructor(container: HTMLElement) {
    this.container = container;
    this.params = { ...DEFAULT_PARAMS };
    this.prevParams = { ...DEFAULT_PARAMS };
    this.raycaster = new THREE.Raycaster();

    this.scene = new THREE.Scene();
    this.scene.background = createGradientTexture();

    this.camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 500);
    this.camera.position.set(0, 14, 22);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
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

    this.createLighting();
    this.createBaseSurface();
    this.updateBackgroundStars(this.params.backgroundStarDensity);
  }

  private createLighting() {
    const ambient = new THREE.AmbientLight(0x4A0066, 0.6);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xE0F0FF, 1.0);
    dir.position.set(10, 20, 8);
    this.scene.add(dir);

    const point = new THREE.PointLight(0xCC88FF, 0.8, 50);
    point.position.set(-5, 8, -5);
    this.scene.add(point);

    const point2 = new THREE.PointLight(0xFF66AA, 0.3, 40);
    point2.position.set(8, 6, 10);
    this.scene.add(point2);
  }

  private createBaseSurface() {
    const geo = new THREE.PlaneGeometry(SURFACE_SIZE, SURFACE_SIZE, BASE_SEGMENTS, BASE_SEGMENTS);
    geo.rotateX(-Math.PI / 2);
    this.baseGeometry = geo;

    const mat = new THREE.MeshPhongMaterial({
      color: 0x1A0033,
      specular: 0x8822AA,
      shininess: 30,
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide,
      emissive: 0x0D001A,
      emissiveIntensity: 0.3,
    });

    this.baseMesh = new THREE.Mesh(geo, mat);
    this.reliefGroup.add(this.baseMesh);
    this.applyCurvature(this.params.baseCurvature);

    const edgeGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(SURFACE_SIZE, SURFACE_SIZE));
    edgeGeo.rotateX(-Math.PI / 2);
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x8822AA, transparent: true, opacity: 0.4 });
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

  private updateBackgroundStars(density: number) {
    if (this.backgroundPoints) {
      this.reliefGroup.remove(this.backgroundPoints);
      this.backgroundPoints.geometry.dispose();
      (this.backgroundPoints.material as THREE.PointsMaterial).dispose();
    }
    if (density <= 0) {
      this.backgroundPoints = null;
      return;
    }
    const count = Math.round(density);
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = BG_STAR_SPHERE_RADIUS + Math.random() * 20;
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.4;
      positions[i * 3 + 2] = r * Math.cos(phi);
      const brightness = 0.3 + Math.random() * 0.7;
      colors[i * 3] = brightness * (0.7 + Math.random() * 0.3);
      colors[i * 3 + 1] = brightness * (0.6 + Math.random() * 0.3);
      colors[i * 3 + 2] = brightness;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
    });
    this.backgroundPoints = new THREE.Points(geo, mat);
    this.reliefGroup.add(this.backgroundPoints);
  }

  loadStars(stars: StarData[]) {
    this.clearStars();
    this.starData = stars;
    this.starPositions = [];

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

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      const x = ((s.ra - centerRA) / halfRangeRA) * SURFACE_HALF * 0.8;
      const z = ((s.dec - centerDec) / halfRangeDec) * SURFACE_HALF * 0.8;
      const baseY = this.getCurvatureY(x, z, this.params.baseCurvature);
      const normalizedMag = (maxMag - s.magnitude) / magRange;
      const height = this.params.bumpScale * (0.3 + normalizedMag * 1.2);
      const color = spectralTypeToColor(s.spectralType, this.params.colorTempShift);
      const pos = new THREE.Vector3(x, baseY + height * 0.5, z);
      this.starPositions.push(pos);

      this.createBump(x, baseY, z, height, color, i);
      this.createRipples(x, baseY, z, color, i);
    }

    this.maxDist = 1;
    for (const p of this.starPositions) {
      const d = Math.sqrt(p.x * p.x + p.z * p.z);
      if (d > this.maxDist) this.maxDist = d;
    }
    this.maxDist = Math.max(this.maxDist, 1);
  }

  private getCurvatureY(x: number, z: number, curvature: number): number {
    const distSq = (x * x + z * z) / (SURFACE_HALF * SURFACE_HALF);
    return curvature * 4 * Math.max(0, 1 - distSq);
  }

  private clearStars() {
    for (const m of this.bumpMeshes) {
      this.reliefGroup.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    for (const m of this.glowMeshes) {
      this.reliefGroup.remove(m);
      m.geometry.dispose();
      (m.material as THREE.Material).dispose();
    }
    for (const group of this.rippleGroups) {
      for (const r of group) {
        this.reliefGroup.remove(r);
        r.geometry.dispose();
        (r.material as THREE.Material).dispose();
      }
    }
    this.bumpMeshes = [];
    this.glowMeshes = [];
    this.rippleGroups = [];
    this.starData = [];
    this.starPositions = [];
  }

  private createBump(x: number, baseY: number, z: number, height: number, color: { r: number; g: number; b: number }, _index: number) {
    const geo = new THREE.SphereGeometry(BUMP_RADIUS, BUMP_SEGMENTS, BUMP_SEGMENTS / 2);
    const mat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(color.r, color.g, color.b),
      specular: 0xE0F0FF,
      shininess: 80,
      emissive: new THREE.Color(color.r * 0.2, color.g * 0.15, color.b * 0.25),
      emissiveIntensity: 0.5,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, baseY + height, z);
    mesh.scale.set(1, height / BUMP_RADIUS, 1);
    mesh.userData.starIndex = this.bumpMeshes.length;
    this.reliefGroup.add(mesh);
    this.bumpMeshes.push(mesh);

    const glowGeo = new THREE.SphereGeometry(BUMP_RADIUS * 1.5, 16, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color.r, color.g, color.b),
      transparent: true,
      opacity: 0.08,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.set(x, baseY + height, z);
    glowMesh.scale.set(1, height / BUMP_RADIUS, 1);
    this.reliefGroup.add(glowMesh);
    this.glowMeshes.push(glowMesh);
  }

  private createRipples(x: number, baseY: number, z: number, color: { r: number; g: number; b: number }, _starIndex: number) {
    const rings: THREE.Mesh[] = [];
    for (let i = 0; i < MAX_RIPPLES; i++) {
      const innerR = BUMP_RADIUS + 0.15 + i * RING_SPACING;
      const outerR = innerR + RING_WIDTH;
      const geo = new THREE.RingGeometry(innerR, outerR, RING_SEGMENTS);
      geo.rotateX(-Math.PI / 2);
      const opacity = Math.max(0, 0.5 - i * 0.04);
      const mat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(color.r * 0.8, color.g * 0.8, color.b * 0.8),
        specular: 0xE0F0FF,
        shininess: 60,
        transparent: true,
        opacity,
        side: THREE.DoubleSide,
        emissive: new THREE.Color(color.r * 0.1, color.g * 0.1, color.b * 0.15),
        emissiveIntensity: 0.3,
        depthWrite: false,
      });
      const ring = new THREE.Mesh(geo, mat);
      ring.position.set(x, baseY + 0.05, z);
      ring.visible = i < this.params.rippleWaves;
      this.reliefGroup.add(ring);
      rings.push(ring);
    }
    this.rippleGroups.push(rings);
  }

  updateParams(params: Partial<ReliefParams>) {
    const oldParams = { ...this.params };
    Object.assign(this.params, params);

    const needsTransition =
      oldParams.bumpScale !== this.params.bumpScale ||
      oldParams.colorTempShift !== this.params.colorTempShift ||
      oldParams.rippleWaves !== this.params.rippleWaves ||
      oldParams.baseCurvature !== this.params.baseCurvature;

    if (needsTransition) {
      this.prevParams = oldParams;
      this.transitionActive = true;
      this.transitionStart = performance.now();
    }

    if (oldParams.backgroundStarDensity !== this.params.backgroundStarDensity) {
      this.updateBackgroundStars(this.params.backgroundStarDensity);
    }

    if (oldParams.rippleWaves !== this.params.rippleWaves) {
      for (const rings of this.rippleGroups) {
        for (let i = 0; i < rings.length; i++) {
          rings[i].visible = i < this.params.rippleWaves;
        }
      }
    }

    if (oldParams.baseCurvature !== this.params.baseCurvature && !needsTransition) {
      this.applyCurvature(this.params.baseCurvature);
      this.repositionStars();
    }
  }

  private repositionStars() {
    for (let i = 0; i < this.starData.length; i++) {
      const pos = this.starPositions[i];
      const baseY = this.getCurvatureY(pos.x, pos.z, this.params.baseCurvature);
      const normalizedMag = this.getNormalizedMag(i);
      const height = this.params.bumpScale * (0.3 + normalizedMag * 1.2);

      pos.y = baseY + height * 0.5;

      if (this.bumpMeshes[i]) {
        this.bumpMeshes[i].position.y = baseY + height;
        this.bumpMeshes[i].scale.y = height / BUMP_RADIUS;
      }
      if (this.glowMeshes[i]) {
        this.glowMeshes[i].position.y = baseY + height;
        this.glowMeshes[i].scale.y = height / BUMP_RADIUS;
      }
      for (const ring of this.rippleGroups[i] || []) {
        ring.position.y = baseY + 0.05;
      }
    }
  }

  private getNormalizedMag(index: number): number {
    if (this.starData.length === 0) return 0.5;
    let minMag = Infinity, maxMag = -Infinity;
    for (const s of this.starData) {
      if (s.magnitude < minMag) minMag = s.magnitude;
      if (s.magnitude > maxMag) maxMag = s.magnitude;
    }
    const range = maxMag - minMag || 1;
    return (maxMag - this.starData[index].magnitude) / range;
  }

  private updateTransition() {
    if (!this.transitionActive) return;

    const elapsed = (performance.now() - this.transitionStart) / 1000;
    const totalDuration = 0.3;
    const propagationTime = 0.15;

    for (let i = 0; i < this.starData.length; i++) {
      const pos = this.starPositions[i];
      const dist = Math.sqrt(pos.x * pos.x + pos.z * pos.z);
      const normDist = dist / this.maxDist;
      const delay = normDist * propagationTime;
      const localElapsed = elapsed - delay;
      const progress = Math.max(0, Math.min(1, localElapsed / propagationTime));
      const eased = easeOutCubic(progress);

      const normMag = this.getNormalizedMag(i);
      const fromScale = this.prevParams.bumpScale;
      const toScale = this.params.bumpScale;
      const currentScale = fromScale + (toScale - fromScale) * eased;

      const fromShift = this.prevParams.colorTempShift;
      const toShift = this.params.colorTempShift;
      const currentShift = fromShift + (toShift - fromShift) * eased;

      const height = currentScale * (0.3 + normMag * 1.2);
      const baseY = this.getCurvatureY(pos.x, pos.z, this.params.baseCurvature);

      if (this.bumpMeshes[i]) {
        const color = spectralTypeToColor(this.starData[i].spectralType, currentShift);
        const mat = this.bumpMeshes[i].material as THREE.MeshPhongMaterial;
        mat.color.setRGB(color.r, color.g, color.b);
        mat.emissive.setRGB(color.r * 0.2, color.g * 0.15, color.b * 0.25);
        this.bumpMeshes[i].position.y = baseY + height;
        this.bumpMeshes[i].scale.y = height / BUMP_RADIUS;
      }

      if (this.glowMeshes[i]) {
        const color = spectralTypeToColor(this.starData[i].spectralType, currentShift);
        const gMat = this.glowMeshes[i].material as THREE.MeshBasicMaterial;
        gMat.color.setRGB(color.r, color.g, color.b);
        this.glowMeshes[i].position.y = baseY + height;
        this.glowMeshes[i].scale.y = height / BUMP_RADIUS;
      }

      for (let r = 0; r < (this.rippleGroups[i] || []).length; r++) {
        const ring = this.rippleGroups[i][r];
        const color = spectralTypeToColor(this.starData[i].spectralType, currentShift);
        const rMat = ring.material as THREE.MeshPhongMaterial;
        rMat.color.setRGB(color.r * 0.8, color.g * 0.8, color.b * 0.8);
        rMat.emissive.setRGB(color.r * 0.1, color.g * 0.1, color.b * 0.15);
        ring.position.y = baseY + 0.05;
      }
    }

    if (this.prevParams.baseCurvature !== this.params.baseCurvature) {
      const fromC = this.prevParams.baseCurvature;
      const toC = this.params.baseCurvature;
      const globalProgress = easeOutCubic(Math.min(1, elapsed / totalDuration));
      const currentC = fromC + (toC - fromC) * globalProgress;
      this.applyCurvature(currentC);
    }

    if (elapsed >= totalDuration + propagationTime) {
      this.transitionActive = false;
      this.applyCurvature(this.params.baseCurvature);
      this.repositionStars();
    }
  }

  highlightStar(index: number | null) {
    if (this.highlightedIndex !== null && this.highlightedIndex < this.bumpMeshes.length) {
      const prevMat = this.bumpMeshes[this.highlightedIndex].material as THREE.MeshPhongMaterial;
      prevMat.emissiveIntensity = 0.5;
      const prevGlow = this.glowMeshes[this.highlightedIndex].material as THREE.MeshBasicMaterial;
      prevGlow.opacity = 0.08;
    }
    this.highlightedIndex = index;
    if (index !== null && index < this.bumpMeshes.length) {
      const mat = this.bumpMeshes[index].material as THREE.MeshPhongMaterial;
      mat.emissiveIntensity = 0.8;
      const glow = this.glowMeshes[index].material as THREE.MeshBasicMaterial;
      glow.opacity = 0.2;
    }
  }

  raycast(mouseNDC: THREE.Vector2): { index: number; point: THREE.Vector3 } | null {
    this.raycaster.setFromCamera(mouseNDC, this.camera);
    const intersects = this.raycaster.intersectObjects(this.bumpMeshes, false);
    if (intersects.length > 0) {
      const hit = intersects[0];
      const idx = hit.object.userData.starIndex as number;
      return { index: idx, point: hit.point.clone() };
    }
    return null;
  }

  getStarWorldPosition(index: number): THREE.Vector3 {
    if (index < 0 || index >= this.bumpMeshes.length) return new THREE.Vector3();
    const v = new THREE.Vector3();
    this.bumpMeshes[index].getWorldPosition(v);
    return v;
  }

  getStarData(index: number): StarData | null {
    if (index < 0 || index >= this.starData.length) return null;
    return this.starData[index];
  }

  update(deltaTime: number) {
    this.updateTransition();

    if (this.params.autoRotate) {
      const speed = this.params.rotationSpeed * (2 * Math.PI / 30);
      this.reliefGroup.rotation.y += speed * deltaTime;
    }

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
