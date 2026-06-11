import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import type { StationData } from './types';

interface StationObject {
  data: StationData;
  group: THREE.Group;
  cube: THREE.Mesh;
  glow: THREE.Sprite;
  projection: THREE.Mesh;
  pointLight: THREE.PointLight;
}

export class StationManager {
  private scene: THREE.Scene;
  private groundPlane: THREE.Mesh;
  private stations: Map<string, StationObject> = new Map();
  private stationCounter: number = 0;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private hoveredStationId: string | null = null;

  public onStationCreated?: (data: StationData) => void;
  public onStationRemoved?: (id: string) => void;
  public onStationMoved?: (id: string, position: THREE.Vector3) => void;
  public onStationClicked?: (id: string) => void;

  constructor(scene: THREE.Scene, groundPlane: THREE.Mesh) {
    this.scene = scene;
    this.groundPlane = groundPlane;
  }

  private createGlowTexture(size: number = 256): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    gradient.addColorStop(0.6, 'rgba(255,255,255,0.2)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }

  addStation(position: THREE.Vector3, opts?: Partial<StationData>): StationData {
    this.stationCounter++;
    const id = opts?.id ?? uuidv4();
    const size = opts?.size ?? 0.8;
    const color = opts?.color ?? '#ffffff';
    const name = opts?.name ?? `站点${this.stationCounter}`;

    const data: StationData = {
      id,
      position: { x: position.x, y: position.y, z: position.z },
      size,
      color,
      name,
    };

    const group = new THREE.Group();
    group.position.set(position.x, size / 2, position.z);
    group.userData.stationId = id;

    const cubeGeo = new THREE.BoxGeometry(size, size, size);
    const cubeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.6,
      roughness: 0.2,
      metalness: 0.5,
      transparent: true,
      opacity: 0.95,
    });
    const cube = new THREE.Mesh(cubeGeo, cubeMat);
    cube.castShadow = true;
    cube.receiveShadow = true;
    cube.userData.stationId = id;
    cube.userData.isStation = true;
    group.add(cube);

    const glowTex = this.createGlowTexture();
    const glowGeo = new THREE.SphereGeometry(size * 0.9, 32, 32);
    const glowMat = new THREE.SpriteMaterial({
      map: glowTex,
      color: new THREE.Color(color),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glow = new THREE.Sprite(glowMat);
    glow.scale.set(size * 2.5, size * 2.5, size * 2.5);
    group.add(glow);

    const projGeo = new THREE.CircleGeometry(size * 0.7, 32);
    const projMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.25,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const projection = new THREE.Mesh(projGeo, projMat);
    projection.rotation.x = -Math.PI / 2;
    projection.position.y = -size / 2 + 0.01;
    group.add(projection);

    const pointLight = new THREE.PointLight(new THREE.Color(color), 1.2, size * 6, 2);
    pointLight.position.set(0, 0, 0);
    group.add(pointLight);

    this.scene.add(group);
    this.stations.set(id, { data, group, cube, glow, projection, pointLight });

    this.onStationCreated?.(data);
    return data;
  }

  removeStation(id: string): void {
    const obj = this.stations.get(id);
    if (!obj) return;

    this.scene.remove(obj.group);
    obj.cube.geometry.dispose();
    (obj.cube.material as THREE.Material).dispose();
    (obj.glow.material as THREE.Material).dispose();
    obj.projection.geometry.dispose();
    (obj.projection.material as THREE.Material).dispose();

    this.stations.delete(id);
    if (this.hoveredStationId === id) this.hoveredStationId = null;
    this.onStationRemoved?.(id);
  }

  moveStation(id: string, position: THREE.Vector3): void {
    const obj = this.stations.get(id);
    if (!obj) return;
    const clampedY = Math.max(0, position.y);
    obj.group.position.set(position.x, clampedY + obj.data.size / 2, position.z);
    obj.data.position = { x: position.x, y: clampedY, z: position.z };
    this.onStationMoved?.(id, new THREE.Vector3(position.x, clampedY, position.z));
  }

  updateStationSize(id: string, size: number): void {
    const obj = this.stations.get(id);
    if (!obj) return;

    obj.cube.geometry.dispose();
    obj.cube.geometry = new THREE.BoxGeometry(size, size, size);
    obj.glow.scale.set(size * 2.5, size * 2.5, size * 2.5);
    obj.projection.geometry.dispose();
    obj.projection.geometry = new THREE.CircleGeometry(size * 0.7, 32);
    obj.projection.position.y = -size / 2 + 0.01;
    obj.group.position.y = obj.data.position.y + size / 2;
    obj.pointLight.distance = size * 6;
    obj.data.size = size;
  }

  updateStationColor(id: string, color: string): void {
    const obj = this.stations.get(id);
    if (!obj) return;

    const threeColor = new THREE.Color(color);
    (obj.cube.material as THREE.MeshStandardMaterial).color.copy(threeColor);
    (obj.cube.material as THREE.MeshStandardMaterial).emissive.copy(threeColor);
    (obj.glow.material as THREE.SpriteMaterial).color.copy(threeColor);
    (obj.projection.material as THREE.MeshBasicMaterial).color.copy(threeColor);
    obj.pointLight.color.copy(threeColor);
    obj.data.color = color;
  }

  getStationById(id: string): StationData | undefined {
    return this.stations.get(id)?.data;
  }

  getAllStations(): StationData[] {
    return Array.from(this.stations.values()).map(s => s.data);
  }

  getStationGroup(id: string): THREE.Group | undefined {
    return this.stations.get(id)?.group;
  }

  raycastStations(raycaster: THREE.Raycaster): { id: string; intersection: THREE.Intersection }[] {
    const cubes = Array.from(this.stations.values()).map(s => s.cube);
    const hits = raycaster.intersectObjects(cubes, false);
    return hits.map(h => ({
      id: (h.object.userData.stationId as string),
      intersection: h,
    })).filter(r => r.id);
  }

  raycastGround(raycaster: THREE.Raycaster): THREE.Vector3 | null {
    const hits = raycaster.intersectObject(this.groundPlane, false);
    if (hits.length > 0) {
      return hits[0].point.clone();
    }
    return null;
  }

  setHovered(id: string | null): void {
    if (this.hoveredStationId === id) return;
    if (this.hoveredStationId) {
      const prev = this.stations.get(this.hoveredStationId);
      if (prev) {
        prev.cube.scale.set(1, 1, 1);
        (prev.projection.material as THREE.MeshBasicMaterial).opacity = 0.25;
      }
    }
    this.hoveredStationId = id;
    if (id) {
      const curr = this.stations.get(id);
      if (curr) {
        curr.cube.scale.set(1.15, 1.15, 1.15);
        (curr.projection.material as THREE.MeshBasicMaterial).opacity = 0.5;
      }
    }
  }

  clearAll(): void {
    for (const id of Array.from(this.stations.keys())) {
      this.removeStation(id);
    }
    this.stationCounter = 0;
  }

  restoreStationCounter(count: number): void {
    this.stationCounter = Math.max(this.stationCounter, count);
  }

  dispose(): void {
    this.clearAll();
  }
}
