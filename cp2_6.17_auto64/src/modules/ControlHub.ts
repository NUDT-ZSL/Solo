import * as THREE from 'three';
import { TrafficDataPoint } from './dataFetcher';
import { DataManager } from './DataManager';

interface HeatColumn {
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  baseMesh: THREE.Mesh;
  intersectionId: string;
  targetHeight: number;
  currentHeight: number;
  animStartTime: number;
  isAnimating: boolean;
}

interface ParticleSystem {
  points: THREE.Points;
  velocities: Float32Array;
  lifetimes: Float32Array;
  ages: Float32Array;
  intersectionId: string;
  particleCount: number;
  directions: { dir: THREE.Vector3; count: number }[];
}

interface InfoPopup {
  group: THREE.Group;
  sprite: THREE.Sprite;
  backgroundMesh: THREE.Mesh;
  intersectionId: string;
  trendCanvas: HTMLCanvasElement;
}

type ViewMode = 'perspective' | 'free' | 'topdown';

export class ControlHub {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private dataManager: DataManager;
  private heatColumns: Map<string, HeatColumn> = new Map();
  private particleSystems: Map<string, ParticleSystem> = new Map();
  private infoPopup: InfoPopup | null = null;
  private viewMode: ViewMode = 'perspective';
  private currentTime: number = 12;
  private minCongestion: number = 0;
  private region: string = 'all';
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private gridHelper: THREE.GridHelper | null = null;
  private popupScene: THREE.Scene | null = null;
  private popupCamera: THREE.OrthographicCamera | null = null;
  private popupRenderTarget: THREE.WebGLRenderTarget | null = null;
  private popupSprite: THREE.Sprite | null = null;

  constructor(scene: THREE.Scene, camera: THREE.PerspectiveCamera, dataManager: DataManager) {
    this.scene = scene;
    this.camera = camera;
    this.dataManager = dataManager;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.createGrid();
  }

  private createGrid(): void {
    const gridSize = 200;
    const divisions = 20;
    const grid = new THREE.GridHelper(gridSize, divisions, 0xffffff, 0xffffff);
    const mat = grid.material as THREE.Material;
    mat.opacity = 0.1;
    mat.transparent = true;
    this.gridHelper = grid;
    this.scene.add(grid);
  }

  private getCongestionColor(congestionIndex: number): THREE.Color {
    if (congestionIndex <= 5) {
      const t = congestionIndex / 5;
      const green = new THREE.Color(0x00e676);
      const yellow = new THREE.Color(0xffeb3b);
      return green.clone().lerp(yellow, t);
    } else {
      const t = (congestionIndex - 5) / 5;
      const yellow = new THREE.Color(0xffeb3b);
      const red = new THREE.Color(0xe53935);
      return yellow.clone().lerp(red, t);
    }
  }

  private getSpeedColor(avgSpeed: number): THREE.Color {
    const minSpeed = 10;
    const maxSpeed = 80;
    const t = Math.max(0, Math.min(1, (avgSpeed - minSpeed) / (maxSpeed - minSpeed)));
    const slow = new THREE.Color(0x42a5f5);
    const fast = new THREE.Color(0xff7043);
    return slow.clone().lerp(fast, t);
  }

  private createBaseMesh(x: number, y: number): THREE.Mesh {
    const geo = new THREE.CylinderGeometry(1.2, 1.2, 0.3, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x90caf9,
      transparent: true,
      opacity: 0.3,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, 0.15, y);
    mesh.userData.isBase = true;
    return mesh;
  }

  private createHeatColumn(data: TrafficDataPoint, baseY: number): HeatColumn {
    const height = Math.max(0.01, (data.vehicleCount / 800) * 15);
    const color = this.getCongestionColor(data.congestionIndex);

    const geo = new THREE.CylinderGeometry(1, 1, height, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.85,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(data.x, baseY + height / 2, data.y);
    mesh.userData = { intersectionId: data.intersectionId, isHeatColumn: true };

    const glowGeo = new THREE.CylinderGeometry(1.2, 1.2, height, 16);
    const glowMat = new THREE.MeshBasicMaterial({
      color: color,
      transparent: true,
      opacity: 0.2,
    });
    const glowMesh = new THREE.Mesh(glowGeo, glowMat);
    glowMesh.position.copy(mesh.position);

    const baseMesh = this.createBaseMesh(data.x, data.y);

    const column: HeatColumn = {
      mesh,
      glowMesh,
      baseMesh,
      intersectionId: data.intersectionId,
      targetHeight: height,
      currentHeight: 0.01,
      animStartTime: performance.now(),
      isAnimating: true,
    };

    mesh.scale.y = 0.001;
    glowMesh.scale.y = 0.001;
    mesh.position.y = baseY + 0.005;
    glowMesh.position.y = baseY + 0.005;

    return column;
  }

  private createParticleSystem(data: TrafficDataPoint): ParticleSystem | null {
    const directions: { dir: THREE.Vector3; count: number }[] = [];
    const dirMap = [
      { key: 'east' as const, vec: new THREE.Vector3(1, 0, 0) },
      { key: 'south' as const, vec: new THREE.Vector3(0, 0, 1) },
      { key: 'west' as const, vec: new THREE.Vector3(-1, 0, 0) },
      { key: 'north' as const, vec: new THREE.Vector3(0, 0, -1) },
    ];

    for (const d of dirMap) {
      const count = data.directions[d.key];
      if (count > 0) {
        directions.push({ dir: d.vec, count });
      }
    }

    if (directions.length === 0) return null;

    const totalParticles = Math.max(1, Math.floor(data.vehicleCount / 10));
    const positions = new Float32Array(totalParticles * 3);
    const colors = new Float32Array(totalParticles * 3);
    const sizes = new Float32Array(totalParticles);
    const velocities = new Float32Array(totalParticles * 3);
    const lifetimes = new Float32Array(totalParticles);
    const ages = new Float32Array(totalParticles);

    const speedColor = this.getSpeedColor(data.avgSpeed);
    let idx = 0;

    for (const dirObj of directions) {
      const dirParticleCount = Math.max(1, Math.floor(totalParticles * dirObj.count / data.vehicleCount));
      for (let i = 0; i < dirParticleCount && idx < totalParticles; i++, idx++) {
        positions[idx * 3] = data.x;
        positions[idx * 3 + 1] = 1;
        positions[idx * 3 + 2] = data.y;

        const speed = 0.5 + Math.random() * 1.5;
        velocities[idx * 3] = dirObj.dir.x * speed;
        velocities[idx * 3 + 1] = 0;
        velocities[idx * 3 + 2] = dirObj.dir.z * speed;

        colors[idx * 3] = speedColor.r;
        colors[idx * 3 + 1] = speedColor.g;
        colors[idx * 3 + 2] = speedColor.b;

        sizes[idx] = 1.5;
        lifetimes[idx] = 2.0;
        ages[idx] = Math.random() * 2.0;
      }
    }

    for (; idx < totalParticles; idx++) {
      positions[idx * 3] = data.x;
      positions[idx * 3 + 1] = 1;
      positions[idx * 3 + 2] = data.y;
      velocities[idx * 3] = 0;
      velocities[idx * 3 + 1] = 0;
      velocities[idx * 3 + 2] = 0;
      colors[idx * 3] = speedColor.r;
      colors[idx * 3 + 1] = speedColor.g;
      colors[idx * 3 + 2] = speedColor.b;
      sizes[idx] = 1.5;
      lifetimes[idx] = 2.0;
      ages[idx] = 0;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 1.5,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      sizeAttenuation: true,
    });

    const points = new THREE.Points(geometry, material);
    points.userData = { intersectionId: data.intersectionId, isParticle: true };

    return {
      points,
      velocities,
      lifetimes,
      ages,
      intersectionId: data.intersectionId,
      particleCount: totalParticles,
      directions,
    };
  }

  updateScene(data: TrafficDataPoint[]): void {
    this.clearScene();

    const grouped = new Map<string, TrafficDataPoint>();
    for (const d of data) {
      grouped.set(d.intersectionId, d);
    }

    for (const [id, d] of grouped) {
      const column = this.createHeatColumn(d, 0.3);
      this.heatColumns.set(id, column);
      this.scene.add(column.mesh);
      this.scene.add(column.glowMesh);
      this.scene.add(column.baseMesh);

      const ps = this.createParticleSystem(d);
      if (ps) {
        this.particleSystems.set(id, ps);
        this.scene.add(ps.points);
      }
    }
  }

  updateForTime(hour: number): void {
    this.currentTime = hour;
    this.applyFilters();
  }

  updateCongestionFilter(level: number): void {
    this.minCongestion = level;
    this.applyFilters();
  }

  updateRegionFilter(region: string): void {
    this.region = region;
    this.applyFilters();
  }

  private applyFilters(): void {
    const data = this.dataManager.getFilteredData(this.currentTime, this.minCongestion, this.region);
    const grouped = new Map<string, TrafficDataPoint>();
    for (const d of data) {
      grouped.set(d.intersectionId, d);
    }

    const allData = this.dataManager.getAllData();
    const allIntersections = new Map<string, TrafficDataPoint[]>();
    for (const d of allData) {
      if (!allIntersections.has(d.intersectionId)) {
        allIntersections.set(d.intersectionId, []);
      }
      allIntersections.get(d.intersectionId)!.push(d);
    }

    for (const [id, info] of allIntersections) {
      const representative = info[0];
      const isActive = grouped.has(id);

      if (isActive) {
        const d = grouped.get(id)!;
        if (this.heatColumns.has(id)) {
          this.updateHeatColumnData(id, d);
          this.updateParticleSystemData(id, d);
        } else {
          const column = this.createHeatColumn(d, 0.3);
          this.heatColumns.set(id, column);
          this.scene.add(column.mesh);
          this.scene.add(column.glowMesh);
          this.scene.add(column.baseMesh);

          const ps = this.createParticleSystem(d);
          if (ps) {
            this.particleSystems.set(id, ps);
            this.scene.add(ps.points);
          }
        }

        const col = this.heatColumns.get(id)!;
        col.mesh.visible = true;
        col.glowMesh.visible = true;
        col.baseMesh.visible = true;

        if (this.minCongestion === 10) {
          (col.mesh.material as THREE.MeshBasicMaterial).opacity = 0.3;
          (col.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.1;
          (col.baseMesh.material as THREE.MeshBasicMaterial).color.set(0x9e9e9e);
          const ps = this.particleSystems.get(id);
          if (ps) ps.points.visible = false;
        } else {
          (col.mesh.material as THREE.MeshBasicMaterial).opacity = 0.85;
          (col.glowMesh.material as THREE.MeshBasicMaterial).opacity = 0.2;
          (col.baseMesh.material as THREE.MeshBasicMaterial).color.set(0x90caf9);
          const ps = this.particleSystems.get(id);
          if (ps) ps.points.visible = true;
        }
      } else {
        if (!this.heatColumns.has(id)) {
          const column = this.createHeatColumn(representative, 0.3);
          column.mesh.visible = false;
          column.glowMesh.visible = false;
          this.heatColumns.set(id, column);
          this.scene.add(column.mesh);
          this.scene.add(column.glowMesh);
          this.scene.add(column.baseMesh);

          (col2 => {
            (col2.baseMesh.material as THREE.MeshBasicMaterial).color.set(0x9e9e9e);
            (col2.baseMesh.material as THREE.MeshBasicMaterial).opacity = 0.1;
          })(column);
        }

        const col = this.heatColumns.get(id)!;
        col.mesh.visible = false;
        col.glowMesh.visible = false;
        col.baseMesh.visible = true;
        (col.baseMesh.material as THREE.MeshBasicMaterial).color.set(0x9e9e9e);
        (col.baseMesh.material as THREE.MeshBasicMaterial).opacity = 0.1;

        const ps = this.particleSystems.get(id);
        if (ps) ps.points.visible = false;
      }
    }
  }

  private updateHeatColumnData(id: string, data: TrafficDataPoint): void {
    const col = this.heatColumns.get(id);
    if (!col) return;

    const newHeight = Math.max(0.01, (data.vehicleCount / 800) * 15);
    const color = this.getCongestionColor(data.congestionIndex);

    col.targetHeight = newHeight;
    col.animStartTime = performance.now();
    col.isAnimating = true;

    (col.mesh.material as THREE.MeshBasicMaterial).color.copy(color);
    (col.glowMesh.material as THREE.MeshBasicMaterial).color.copy(color);
  }

  private updateParticleSystemData(id: string, data: TrafficDataPoint): void {
    let ps = this.particleSystems.get(id);
    if (ps) {
      this.scene.remove(ps.points);
      ps.points.geometry.dispose();
      (ps.points.material as THREE.Material).dispose();
    }

    const newPs = this.createParticleSystem(data);
    if (newPs) {
      this.particleSystems.set(id, newPs);
      this.scene.add(newPs.points);
    } else if (ps) {
      this.particleSystems.delete(id);
    }
  }

  animateColumns(delta: number): void {
    const now = performance.now();
    for (const [, col] of this.heatColumns) {
      if (col.isAnimating) {
        const elapsed = (now - col.animStartTime) / 1000;
        const duration = 0.8;
        const t = Math.min(1, elapsed / duration);
        const eased = 1 - Math.pow(1 - t, 3);

        const currentH = col.targetHeight * eased;
        const scaleXZ = 1;

        col.mesh.scale.set(scaleXZ, Math.max(0.001, eased), scaleXZ);
        col.glowMesh.scale.set(scaleXZ, Math.max(0.001, eased), scaleXZ);

        col.mesh.position.y = 0.3 + currentH / 2;
        col.glowMesh.position.y = 0.3 + currentH / 2;

        col.currentHeight = currentH;

        if (t >= 1) {
          col.isAnimating = false;
        }
      }
    }
  }

  animateParticles(delta: number): void {
    for (const [, ps] of this.particleSystems) {
      if (!ps.points.visible) continue;

      const positions = ps.points.geometry.attributes.position as THREE.BufferAttribute;
      const posArr = positions.array as Float32Array;

      for (let i = 0; i < ps.particleCount; i++) {
        ps.ages[i] += delta;

        if (ps.ages[i] >= ps.lifetimes[i]) {
          const dirIdx = Math.floor(Math.random() * ps.directions.length);
          const dir = ps.directions[dirIdx].dir;
          const speed = 0.5 + Math.random() * 1.5;

          posArr[i * 3] = ps.points.position.x;
          posArr[i * 3 + 1] = 1;
          posArr[i * 3 + 2] = ps.points.position.z;

          ps.velocities[i * 3] = dir.x * speed;
          ps.velocities[i * 3 + 1] = 0;
          ps.velocities[i * 3 + 2] = dir.z * speed;

          ps.ages[i] = 0;
        } else {
          posArr[i * 3] += ps.velocities[i * 3] * delta;
          posArr[i * 3 + 1] += ps.velocities[i * 3 + 1] * delta;
          posArr[i * 3 + 2] += ps.velocities[i * 3 + 2] * delta;
        }
      }

      positions.needsUpdate = true;

      const fadeRatio = Math.max(0, 1 - 0.3);
      (ps.points.material as THREE.PointsMaterial).opacity = 0.8 * fadeRatio;
    }
  }

  handleClick(event: MouseEvent, renderer: THREE.WebGLRenderer, container: HTMLElement): void {
    const rect = container.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const targets: THREE.Object3D[] = [];
    for (const [, col] of this.heatColumns) {
      if (col.mesh.visible) targets.push(col.mesh);
    }
    for (const [, ps] of this.particleSystems) {
      if (ps.points.visible) targets.push(ps.points);
    }

    const intersects = this.raycaster.intersectObjects(targets, false);
    if (intersects.length > 0) {
      const hit = intersects[0].object;
      const intersectionId = hit.userData.intersectionId;
      if (intersectionId) {
        this.showInfoPopup(intersectionId);
      }
    } else {
      this.hideInfoPopup();
    }
  }

  private showInfoPopup(intersectionId: string): void {
    this.hideInfoPopup();

    const allData = this.dataManager.getAllData();
    const point = allData.find(d => d.intersectionId === intersectionId);
    if (!point) return;

    const currentData = this.dataManager.getFilteredData(this.currentTime, 0, 'all')
      .find(d => d.intersectionId === intersectionId);

    const trend = this.dataManager.getHourlyTrend(intersectionId, this.currentTime);

    const canvas = document.createElement('canvas');
    canvas.width = 240;
    canvas.height = 100;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = 'rgba(30, 30, 30, 0.9)';
    ctx.beginPath();
    ctx.roundRect(0, 0, 240, 100, 16);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = '12px sans-serif';
    ctx.fillText(`路口: ${intersectionId.slice(0, 8)}`, 10, 18);
    ctx.fillText(`坐标: (${point.x.toFixed(1)}, ${point.y.toFixed(1)})`, 10, 33);

    if (currentData) {
      ctx.fillText(`车流量: ${currentData.vehicleCount}`, 10, 48);
      ctx.fillText(`平均车速: ${currentData.avgSpeed} km/h`, 10, 63);

      const stars = Math.ceil(currentData.congestionIndex / 2);
      ctx.fillStyle = '#ffd700';
      ctx.fillText('★'.repeat(stars) + '☆'.repeat(5 - stars), 100, 78);
      ctx.fillStyle = '#ffffff';
      ctx.fillText(`拥堵: `, 10, 78);
    }

    if (trend.congestions.length > 1) {
      const chartX = 10;
      const chartY = 82;
      const chartW = 120;
      const chartH = 12;
      const maxVal = Math.max(...trend.congestions, 1);

      ctx.strokeStyle = '#42a5f5';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      for (let i = 0; i < trend.congestions.length; i++) {
        const x = chartX + (i / (trend.congestions.length - 1)) * chartW;
        const y = chartY - (trend.congestions[i] / maxVal) * chartH;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false,
    });

    const sprite = new THREE.Sprite(material);
    sprite.scale.set(12, 5, 1);
    sprite.position.set(point.x, point.y + 12, 0);

    this.scene.add(sprite);
    this.infoPopup = {
      group: new THREE.Group(),
      sprite,
      backgroundMesh: new THREE.Mesh(),
      intersectionId,
      trendCanvas: canvas,
    };
  }

  private hideInfoPopup(): void {
    if (this.infoPopup) {
      this.scene.remove(this.infoPopup.sprite);
      this.infoPopup.sprite.material.map?.dispose();
      this.infoPopup.sprite.material.dispose();
      this.infoPopup.trendCanvas.remove();
      this.infoPopup = null;
    }
  }

  updateInfoPopup(): void {
    if (this.infoPopup) {
      this.infoPopup.sprite.quaternion.copy(this.camera.quaternion);
    }
  }

  setViewMode(mode: ViewMode, controls: any): void {
    this.viewMode = mode;
    switch (mode) {
      case 'perspective':
        this.animateCamera(new THREE.Vector3(0, 40, 40), new THREE.Vector3(0, 0, 0), 1200);
        controls.enabled = true;
        break;
      case 'free':
        controls.enabled = true;
        break;
      case 'topdown':
        this.animateCamera(new THREE.Vector3(0, 50, 0.01), new THREE.Vector3(0, 0, 0), 1200);
        controls.enabled = true;
        break;
    }
  }

  private cameraAnimation: {
    startPos: THREE.Vector3;
    endPos: THREE.Vector3;
    startTarget: THREE.Vector3;
    endTarget: THREE.Vector3;
    startTime: number;
    duration: number;
  } | null = null;

  private animateCamera(targetPos: THREE.Vector3, targetLookAt: THREE.Vector3, duration: number): void {
    this.cameraAnimation = {
      startPos: this.camera.position.clone(),
      endPos: targetPos.clone(),
      startTarget: new THREE.Vector3(0, 0, 0),
      endTarget: targetLookAt.clone(),
      startTime: performance.now(),
      duration,
    };
  }

  updateCameraAnimation(): void {
    if (!this.cameraAnimation) return;
    const elapsed = performance.now() - this.cameraAnimation.startTime;
    const t = Math.min(1, elapsed / this.cameraAnimation.duration);
    const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

    this.camera.position.lerpVectors(this.cameraAnimation.startPos, this.cameraAnimation.endPos, eased);
    const lookAt = new THREE.Vector3().lerpVectors(this.cameraAnimation.startTarget, this.cameraAnimation.endTarget, eased);
    this.camera.lookAt(lookAt);

    if (t >= 1) {
      this.cameraAnimation = null;
    }
  }

  getViewMode(): ViewMode {
    return this.viewMode;
  }

  resetView(controls: any): void {
    this.setViewMode('perspective', controls);
    this.minCongestion = 0;
    this.region = 'all';
    this.currentTime = 12;
  }

  clearScene(): void {
    for (const [, col] of this.heatColumns) {
      this.scene.remove(col.mesh);
      this.scene.remove(col.glowMesh);
      this.scene.remove(col.baseMesh);
      col.mesh.geometry.dispose();
      (col.mesh.material as THREE.Material).dispose();
      col.glowMesh.geometry.dispose();
      (col.glowMesh.material as THREE.Material).dispose();
      col.baseMesh.geometry.dispose();
      (col.baseMesh.material as THREE.Material).dispose();
    }
    this.heatColumns.clear();

    for (const [, ps] of this.particleSystems) {
      this.scene.remove(ps.points);
      ps.points.geometry.dispose();
      (ps.points.material as THREE.Material).dispose();
    }
    this.particleSystems.clear();

    this.hideInfoPopup();
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  getMinCongestion(): number {
    return this.minCongestion;
  }

  getRegion(): string {
    return this.region;
  }
}
