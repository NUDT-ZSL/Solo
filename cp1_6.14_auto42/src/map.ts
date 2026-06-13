import * as THREE from 'three';
import type { GlacierRegion } from './data';
import { MAX_VOLUME, MAX_BAR_HEIGHT } from './data';

const SPHERE_RADIUS = 5;
const BAR_RADIUS = 0.3;
const COLOR_LOW = '#0044cc';
const COLOR_HIGH = '#ff6633';

interface BarMesh {
  mesh: THREE.Mesh;
  region: GlacierRegion;
  targetHeight: number;
  currentHeight: number;
  startHeight: number;
  animT: number;
  glowWireframe: THREE.LineSegments;
  glowTargetOpacity: number;
  glowCurrentOpacity: number;
  glowTargetScale: number;
  glowCurrentScale: number;
  unitBarPositions: Float32Array;
  unitGlowPositions: Float32Array;
  label: THREE.Sprite | null;
}

export function easeOutElastic(t: number): number {
  const c4 = (2 * Math.PI) / 3;
  return t === 0
    ? 0
    : t === 1
    ? 1
    : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

export class GlacierMap {
  private scene: THREE.Scene;
  private bars: BarMesh[] = [];
  private sphere: THREE.Mesh;
  private gridGroup: THREE.Group;
  private particleSystem: THREE.Points;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private hoveredBar: BarMesh | null = null;
  private onBarClick: ((region: GlacierRegion) => void) | null = null;
  private onBarHover: ((region: GlacierRegion | null) => void) | null = null;
  private glowTexture: THREE.Texture;
  private bottomColor: THREE.Color;
  private topColor: THREE.Color;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.glowTexture = this.createGlowTexture();
    this.bottomColor = new THREE.Color(COLOR_LOW);
    this.topColor = new THREE.Color(COLOR_HIGH);
    this.sphere = this.createSphere();
    this.gridGroup = this.createGridLines();
    this.particleSystem = this.createParticles();
    this.scene.add(this.sphere);
    this.scene.add(this.gridGroup);
    this.scene.add(this.particleSystem);
  }

  private createGlowTexture(): THREE.Texture {
    const size = 128;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,102,51,1)');
    gradient.addColorStop(0.3, 'rgba(255,102,51,0.5)');
    gradient.addColorStop(1, 'rgba(255,102,51,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  private createSphere(): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 64, 64);
    const material = new THREE.MeshPhongMaterial({
      color: 0x1a1a2e,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    return new THREE.Mesh(geometry, material);
  }

  private createGridLines(): THREE.Group {
    const group = new THREE.Group();
    const material = new THREE.LineBasicMaterial({
      color: 0x333355,
      transparent: true,
      opacity: 0.4,
    });

    const latLines = 12;
    for (let i = 1; i < latLines; i++) {
      const phi = (i / latLines) * Math.PI;
      const radius = SPHERE_RADIUS * Math.sin(phi) * 1.002;
      const y = SPHERE_RADIUS * Math.cos(phi) * 1.002;
      const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, Math.PI * 2, false, 0);
      const points2D = curve.getPoints(64);
      const points3D = points2D.map(p => new THREE.Vector3(p.x, y, p.y));
      const geometry = new THREE.BufferGeometry().setFromPoints(points3D);
      group.add(new THREE.Line(geometry, material));
    }

    const lonLines = 24;
    for (let i = 0; i < lonLines; i++) {
      const theta = (i / lonLines) * Math.PI * 2;
      const points: THREE.Vector3[] = [];
      for (let j = 0; j <= 64; j++) {
        const phi = (j / 64) * Math.PI;
        const r = SPHERE_RADIUS * 1.002;
        points.push(new THREE.Vector3(
          r * Math.sin(phi) * Math.cos(theta),
          r * Math.cos(phi),
          r * Math.sin(phi) * Math.sin(theta),
        ));
      }
      const geometry = new THREE.BufferGeometry().setFromPoints(points);
      group.add(new THREE.Line(geometry, material));
    }

    return group;
  }

  private createParticles(): THREE.Points {
    const count = 2000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const phi = Math.acos(2 * Math.random() - 1);
      const theta = Math.random() * Math.PI * 2;
      const r = SPHERE_RADIUS * (1.05 + Math.random() * 0.3);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.cos(phi);
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
      const c = new THREE.Color(0x3366cc);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.06,
      transparent: true,
      opacity: 0.3,
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      map: this.glowTexture,
    });

    return new THREE.Points(geometry, material);
  }

  private latLonToPosition(lat: number, lon: number): THREE.Vector3 {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -SPHERE_RADIUS * Math.sin(phi) * Math.cos(theta),
      SPHERE_RADIUS * Math.cos(phi),
      SPHERE_RADIUS * Math.sin(phi) * Math.sin(theta),
    );
  }

  private applyVertexColors(bar: BarMesh): void {
    const geometry = bar.mesh.geometry;
    const posAttr = geometry.attributes.position as THREE.BufferAttribute;
    let colorAttr = geometry.attributes.color as THREE.BufferAttribute | undefined;
    if (!colorAttr) {
      colorAttr = new THREE.BufferAttribute(new Float32Array(posAttr.count * 3), 3);
      geometry.setAttribute('color', colorAttr);
    }
    const h = Math.max(0.01, bar.currentHeight);
    for (let i = 0; i < posAttr.count; i++) {
      const y = posAttr.getY(i);
      const t = Math.max(0, Math.min(1, y / h));
      const c = this.bottomColor.clone().lerp(this.topColor, t);
      colorAttr.setXYZ(i, c.r, c.g, c.b);
    }
    colorAttr.needsUpdate = true;
  }

  private createBar(region: GlacierRegion, year: number): BarMesh {
    const pos = this.latLonToPosition(region.latitude, region.longitude);
    const direction = pos.clone().normalize();
    const yearData = region.yearlyData.find(d => d.year === year);
    const volume = yearData ? yearData.cumulativeVolume : 0;
    const height = (volume / MAX_VOLUME) * MAX_BAR_HEIGHT;
    const safeHeight = Math.max(0.01, height);

    const unitGeometry = new THREE.CylinderGeometry(BAR_RADIUS, BAR_RADIUS, 1, 16, 1, false);
    unitGeometry.translate(0, 0.5, 0);
    const unitBarPositions = new Float32Array(unitGeometry.attributes.position.array);

    const geometry = unitGeometry.clone();
    geometry.scale(1, safeHeight, 1);

    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.92,
      shininess: 80,
      flatShading: false,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(pos);

    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
    mesh.quaternion.copy(quaternion);

    mesh.userData = { regionName: region.name };

    this.scene.add(mesh);

    const glowUnitGeo = new THREE.CylinderGeometry(BAR_RADIUS * 1.5, BAR_RADIUS * 1.5, 1, 16, 1, false);
    glowUnitGeo.translate(0, 0.5, 0);
    const unitGlowPositions = new Float32Array(glowUnitGeo.attributes.position.array);

    const glowGeo = glowUnitGeo.clone();
    glowGeo.scale(1, safeHeight, 1);
    const edges = new THREE.EdgesGeometry(glowGeo, 25);
    const glowMat = new THREE.LineBasicMaterial({
      color: 0xff6633,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glowWireframe = new THREE.LineSegments(edges, glowMat);
    glowWireframe.position.copy(pos);
    glowWireframe.quaternion.copy(quaternion);
    this.scene.add(glowWireframe);

    unitGeometry.dispose();
    glowUnitGeo.dispose();
    glowGeo.dispose();

    const bar: BarMesh = {
      mesh,
      region,
      targetHeight: safeHeight,
      currentHeight: safeHeight,
      startHeight: safeHeight,
      animT: 1,
      glowWireframe,
      glowTargetOpacity: 0,
      glowCurrentOpacity: 0,
      glowTargetScale: 1,
      glowCurrentScale: 1,
      unitBarPositions,
      unitGlowPositions,
      label: null,
    };

    this.applyVertexColors(bar);

    return bar;
  }

  loadRegions(regions: GlacierRegion[], year: number): void {
    this.bars.forEach(bar => {
      this.scene.remove(bar.mesh);
      this.scene.remove(bar.glowWireframe);
      if (bar.label) this.scene.remove(bar.label);
      bar.mesh.geometry.dispose();
      (bar.mesh.material as THREE.Material).dispose();
      bar.glowWireframe.geometry.dispose();
      (bar.glowWireframe.material as THREE.Material).dispose();
    });
    this.bars = [];

    regions.forEach(region => {
      const bar = this.createBar(region, year);
      this.bars.push(bar);
    });
  }

  updateYear(year: number): void {
    this.bars.forEach(bar => {
      const yearData = bar.region.yearlyData.find(d => d.year === year);
      const volume = yearData ? yearData.cumulativeVolume : 0;
      bar.targetHeight = Math.max(0.01, (volume / MAX_VOLUME) * MAX_BAR_HEIGHT);
      bar.elasticVelocity = 0;
    });
  }

  private updateBarGeometry(bar: BarMesh): void {
    const h = Math.max(0.01, bar.currentHeight);

    const posAttr = bar.mesh.geometry.attributes.position as THREE.BufferAttribute;
    const positions = posAttr.array as Float32Array;
    const unitPos = bar.unitBarPositions;
    for (let i = 0; i < unitPos.length; i += 3) {
      positions[i] = unitPos[i];
      positions[i + 1] = unitPos[i + 1] * h;
      positions[i + 2] = unitPos[i + 2];
    }
    posAttr.needsUpdate = true;
    posAttr.updatedRanges = [{ offset: 0, count: Infinity }];
    (bar.mesh.geometry as THREE.BufferGeometry).computeVertexNormals();

    const glowPosAttr = bar.glowWireframe.geometry.attributes.position as THREE.BufferAttribute;
    const glowPos = glowPosAttr.array as Float32Array;
    const unitGlow = bar.unitGlowPositions;
    for (let i = 0; i < unitGlow.length; i += 3) {
      glowPos[i] = unitGlow[i];
      glowPos[i + 1] = unitGlow[i + 1] * h;
      glowPos[i + 2] = unitGlow[i + 2];
    }
    glowPosAttr.needsUpdate = true;
    glowPosAttr.updatedRanges = [{ offset: 0, count: Infinity }];

    this.applyVertexColors(bar);
  }

  updateAnimation(delta: number): void {
    const lerpSpeed = 1 - Math.pow(0.001, delta);

    this.bars.forEach(bar => {
      const disp = bar.targetHeight - bar.elasticHeight;
      bar.elasticVelocity += disp * 80 * delta;
      bar.elasticVelocity *= Math.pow(0.001, delta);
      bar.elasticHeight += bar.elasticVelocity * delta;

      const elasticT = easeOutElastic(
        Math.max(0, Math.min(1, Math.abs(bar.targetHeight - bar.currentHeight) / Math.max(0.01, Math.abs(bar.targetHeight - (bar.targetHeight - (bar.elasticHeight - bar.currentHeight))) + 0.001)))
      );

      bar.currentHeight += (bar.elasticHeight - bar.currentHeight) * (1 - Math.pow(0.001, delta / 0.1));

      if (Math.abs(bar.currentHeight - (Number((bar as any)._lastRenderedH || 0))) > 0.003) {
        (bar as any)._lastRenderedH = bar.currentHeight;
        this.updateBarGeometry(bar);
      }

      bar.glowTargetOpacity = bar === this.hoveredBar ? 1 : 0;
      bar.glowCurrentOpacity += (bar.glowTargetOpacity - bar.glowCurrentOpacity) * (1 - Math.pow(0.001, delta / 0.3));
      (bar.glowWireframe.material as THREE.LineBasicMaterial).opacity = bar.glowCurrentOpacity;

      bar.glowTargetScale = bar === this.hoveredBar ? 1.15 : 1;
      bar.glowCurrentScale += (bar.glowTargetScale - bar.glowCurrentScale) * (1 - Math.pow(0.001, delta / 0.3));
      bar.glowWireframe.scale.set(bar.glowCurrentScale, bar.glowCurrentScale, bar.glowCurrentScale);
    });

    const time = performance.now() * 0.0001;
    const positions = this.particleSystem.geometry.attributes.position;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z = positions.getZ(i);
      const offset = i * 0.01;
      positions.setY(i, y + Math.sin(time + offset) * 0.002);
      positions.setX(i, x + Math.cos(time + offset * 1.3) * 0.001);
    }
    positions.needsUpdate = true;
  }

  handleMouseMove(event: MouseEvent, camera: THREE.Camera): void {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);
    const meshes = this.bars.map(b => b.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const bar = this.bars.find(b => b.mesh === hitMesh);
      if (bar && bar !== this.hoveredBar) {
        this.hoveredBar = bar;
        if (this.onBarHover) this.onBarHover(bar.region);
      }
    } else {
      if (this.hoveredBar) {
        this.hoveredBar = null;
        if (this.onBarHover) this.onBarHover(null);
      }
    }
  }

  handleClick(event: MouseEvent, camera: THREE.Camera): GlacierRegion | null {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, camera);
    const meshes = this.bars.map(b => b.mesh);
    const intersects = this.raycaster.intersectObjects(meshes);

    if (intersects.length > 0) {
      const hitMesh = intersects[0].object as THREE.Mesh;
      const bar = this.bars.find(b => b.mesh === hitMesh);
      if (bar) {
        if (this.onBarClick) this.onBarClick(bar.region);
        return bar.region;
      }
    }
    return null;
  }

  setOnBarClick(callback: (region: GlacierRegion) => void): void {
    this.onBarClick = callback;
  }

  setOnBarHover(callback: (region: GlacierRegion | null) => void): void {
    this.onBarHover = callback;
  }

  getBars(): BarMesh[] {
    return this.bars;
  }

  getTotalVolume(year: number): number {
    let total = 0;
    this.bars.forEach(bar => {
      const yearData = bar.region.yearlyData.find(d => d.year === year);
      if (yearData) total += yearData.cumulativeVolume;
    });
    return Math.round(total * 100) / 100;
  }
}
