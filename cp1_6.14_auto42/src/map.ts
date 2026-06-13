import * as THREE from 'three';
import * as d3 from 'd3';
import type { GlacierRegion } from './data';
import { MAX_VOLUME, MAX_BAR_HEIGHT } from './data';

const SPHERE_RADIUS = 5;
const BAR_RADIUS = 0.3;
const COLOR_LOW = '#0044cc';
const COLOR_HIGH = '#ff6633';

const colorScale = d3.scaleLinear<string>()
  .domain([0, MAX_VOLUME])
  .range([COLOR_LOW, COLOR_HIGH])
  .interpolate(d3.interpolateRgb);

interface BarMesh {
  mesh: THREE.Mesh;
  region: GlacierRegion;
  targetHeight: number;
  currentHeight: number;
  glowMesh: THREE.Mesh;
  label: THREE.Sprite | null;
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

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.glowTexture = this.createGlowTexture();
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

  private createBar(region: GlacierRegion, year: number): BarMesh {
    const pos = this.latLonToPosition(region.latitude, region.longitude);
    const direction = pos.clone().normalize();
    const yearData = region.yearlyData.find(d => d.year === year);
    const volume = yearData ? yearData.cumulativeVolume : 0;
    const height = (volume / MAX_VOLUME) * MAX_BAR_HEIGHT;
    const safeHeight = Math.max(0.01, height);

    const geometry = new THREE.CylinderGeometry(BAR_RADIUS, BAR_RADIUS, safeHeight, 16);
    geometry.translate(0, safeHeight / 2, 0);

    const bottomColor = new THREE.Color(COLOR_LOW);
    const topColor = new THREE.Color(colorScale(volume));
    const vertexColors = new Float32Array(geometry.attributes.position.count * 3);
    const posAttr = geometry.attributes.position;

    for (let i = 0; i < posAttr.count; i++) {
      const y = posAttr.getY(i);
      const t = Math.max(0, Math.min(1, y / Math.max(safeHeight, 0.01)));
      const c = bottomColor.clone().lerp(topColor, t);
      vertexColors[i * 3] = c.r;
      vertexColors[i * 3 + 1] = c.g;
      vertexColors[i * 3 + 2] = c.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3));

    const material = new THREE.MeshPhongMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      shininess: 60,
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(pos);

    const up = new THREE.Vector3(0, 1, 0);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(up, direction);
    mesh.quaternion.copy(quaternion);

    mesh.userData = { regionName: region.name };

    this.scene.add(mesh);

    const glowGeometry = new THREE.CylinderGeometry(BAR_RADIUS * 2.5, BAR_RADIUS * 2.5, safeHeight, 16);
    glowGeometry.translate(0, safeHeight / 2, 0);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0xff6633,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const glowMesh = new THREE.Mesh(glowGeometry, glowMaterial);
    glowMesh.position.copy(pos);
    glowMesh.quaternion.copy(quaternion);
    this.scene.add(glowMesh);

    return {
      mesh,
      region,
      targetHeight: safeHeight,
      currentHeight: safeHeight,
      glowMesh,
      label: null,
    };
  }

  loadRegions(regions: GlacierRegion[], year: number): void {
    this.bars.forEach(bar => {
      this.scene.remove(bar.mesh);
      this.scene.remove(bar.glowMesh);
      if (bar.label) this.scene.remove(bar.label);
      bar.mesh.geometry.dispose();
      (bar.mesh.material as THREE.Material).dispose();
      bar.glowMesh.geometry.dispose();
      (bar.glowMesh.material as THREE.Material).dispose();
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
    });
  }

  updateAnimation(delta: number): void {
    const lerpSpeed = 1 - Math.pow(0.001, delta);

    this.bars.forEach(bar => {
      if (Math.abs(bar.currentHeight - bar.targetHeight) > 0.001) {
        bar.currentHeight += (bar.targetHeight - bar.currentHeight) * lerpSpeed;

        this.rebuildBarGeometry(bar);

        const volume = (bar.currentHeight / MAX_BAR_HEIGHT) * MAX_VOLUME;
        const topColorHex = colorScale(volume);
        const bottomColor = new THREE.Color(COLOR_LOW);
        const topColor = new THREE.Color(topColorHex);
        const posAttr = bar.mesh.geometry.attributes.position;
        const colorAttr = bar.mesh.geometry.attributes.color as THREE.BufferAttribute;
        if (colorAttr) {
          for (let i = 0; i < posAttr.count; i++) {
            const y = posAttr.getY(i);
            const t = Math.max(0, Math.min(1, y / Math.max(bar.currentHeight, 0.01)));
            const c = bottomColor.clone().lerp(topColor, t);
            colorAttr.setXYZ(i, c.r, c.g, c.b);
          }
          colorAttr.needsUpdate = true;
        }
      }

      const isHovered = bar === this.hoveredBar;
      const targetGlowOpacity = isHovered ? 0.35 : 0;
      const glowMat = bar.glowMesh.material as THREE.MeshBasicMaterial;
      glowMat.opacity += (targetGlowOpacity - glowMat.opacity) * lerpSpeed;
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

  private rebuildBarGeometry(bar: BarMesh): void {
    const h = Math.max(0.01, bar.currentHeight);
    const geo = bar.mesh.geometry as THREE.CylinderGeometry;
    const posAttr = geo.attributes.position;
    const origGeo = new THREE.CylinderGeometry(BAR_RADIUS, BAR_RADIUS, h, 16);
    origGeo.translate(0, h / 2, 0);
    const origPos = origGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      posAttr.setXYZ(i, origPos.getX(i), origPos.getY(i), origPos.getZ(i));
    }
    posAttr.needsUpdate = true;
    origGeo.dispose();

    const glowGeo = bar.glowMesh.geometry as THREE.CylinderGeometry;
    const glowOrigGeo = new THREE.CylinderGeometry(BAR_RADIUS * 2.5, BAR_RADIUS * 2.5, h, 16);
    glowOrigGeo.translate(0, h / 2, 0);
    const glowPos = glowGeo.attributes.position;
    const glowOrigPos = glowOrigGeo.attributes.position;
    for (let i = 0; i < glowPos.count; i++) {
      glowPos.setXYZ(i, glowOrigPos.getX(i), glowOrigPos.getY(i), glowOrigPos.getZ(i));
    }
    glowPos.needsUpdate = true;
    glowOrigGeo.dispose();
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
