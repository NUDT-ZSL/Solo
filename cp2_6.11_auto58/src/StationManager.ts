import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';

export interface StationData {
  id: string;
  name: string;
  position: { x: number; y: number; z: number };
  color: string;
  size: number;
}

export class Station {
  public id: string;
  public name: string;
  public group: THREE.Group;
  public cube: THREE.Mesh;
  public halo: THREE.Mesh;
  public projection: THREE.Mesh;
  public position: THREE.Vector3;
  public color: string;
  public size: number;
  public isDragging: boolean = false;

  constructor(position: THREE.Vector3, color: string = '#ffffff', size: number = 1, name?: string) {
    this.id = uuidv4();
    this.name = name || `站点 ${Math.floor(Math.random() * 1000)}`;
    this.position = position.clone();
    this.color = color;
    this.size = size;
    this.group = new THREE.Group();
    this.cube = this.createCube();
    this.halo = this.createHalo();
    this.projection = this.createProjection();
    this.group.add(this.cube, this.halo, this.projection);
    this.group.position.copy(position);
    this.group.userData.station = this;
  }

  private createCube(): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(this.size, this.size, this.size);
    const material = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: 0.5,
      metalness: 0.8,
      roughness: 0.2
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    return mesh;
  }

  private createHalo(): THREE.Mesh {
    const haloGeometry = new THREE.SphereGeometry(this.size * 1.5, 32, 32);
    const haloMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(this.color) },
        size: { value: this.size }
      },
      vertexShader: `
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          vPosition = position;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        uniform float size;
        varying vec3 vNormal;
        varying vec3 vPosition;
        void main() {
          float intensity = pow(0.65 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
          float dist = length(vPosition) / (size * 1.5);
          float alpha = intensity * (1.0 - dist);
          gl_FragColor = vec4(color, alpha * 0.6);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });
    const halo = new THREE.Mesh(haloGeometry, haloMaterial);
    return halo;
  }

  private createProjection(): THREE.Mesh {
    const geometry = new THREE.CircleGeometry(this.size * 0.8, 32);
    const material = new THREE.MeshBasicMaterial({
      color: this.color,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    const projection = new THREE.Mesh(geometry, material);
    projection.rotation.x = -Math.PI / 2;
    projection.position.y = -this.size / 2 + 0.01;
    projection.visible = false;
    return projection;
  }

  public updateColor(color: string): void {
    this.color = color;
    (this.cube.material as THREE.MeshStandardMaterial).color.set(color);
    (this.cube.material as THREE.MeshStandardMaterial).emissive.set(color);
    const haloMat = this.halo.material as THREE.ShaderMaterial;
    haloMat.uniforms.color.value.set(color);
    (this.projection.material as THREE.MeshBasicMaterial).color.set(color);
  }

  public updateSize(size: number): void {
    this.size = size;
    this.cube.scale.set(size, size, size);
    this.halo.scale.set(size, size, size);
    this.projection.scale.set(size, size, size);
    this.projection.position.y = -size / 2 + 0.01;
  }

  public updatePosition(pos: THREE.Vector3): void {
    this.position.copy(pos);
    this.group.position.copy(pos);
  }

  public showProjection(): void {
    this.projection.visible = true;
  }

  public hideProjection(): void {
    this.projection.visible = false;
  }

  public getData(): StationData {
    return {
      id: this.id,
      name: this.name,
      position: { x: this.position.x, y: this.position.y, z: this.position.z },
      color: this.color,
      size: this.size
    };
  }

  public dispose(): void {
    this.cube.geometry.dispose();
    (this.cube.material as THREE.Material).dispose();
    this.halo.geometry.dispose();
    (this.halo.material as THREE.Material).dispose();
    this.projection.geometry.dispose();
    (this.projection.material as THREE.Material).dispose();
  }
}

export class StationManager {
  public stations: Map<string, Station> = new Map();
  private scene: THREE.Scene;
  public onStationAdded?: (station: Station) => void;
  public onStationRemoved?: (station: Station) => void;
  public onStationMoved?: (station: Station) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public addStation(position: THREE.Vector3, color: string = '#ffffff', size: number = 1, name?: string, existingId?: string): Station {
    const station = new Station(position, color, size, name);
    if (existingId) {
      station.id = existingId;
    }
    this.stations.set(station.id, station);
    this.scene.add(station.group);
    this.onStationAdded?.(station);
    return station;
  }

  public removeStation(id: string): boolean {
    const station = this.stations.get(id);
    if (!station) return false;
    this.scene.remove(station.group);
    station.dispose();
    this.stations.delete(id);
    this.onStationRemoved?.(station);
    return true;
  }

  public getStation(id: string): Station | undefined {
    return this.stations.get(id);
  }

  public getAllStations(): Station[] {
    return Array.from(this.stations.values());
  }

  public moveStation(id: string, position: THREE.Vector3): boolean {
    const station = this.stations.get(id);
    if (!station) return false;
    station.updatePosition(position);
    this.onStationMoved?.(station);
    return true;
  }

  public updateStationColor(id: string, color: string): boolean {
    const station = this.stations.get(id);
    if (!station) return false;
    station.updateColor(color);
    return true;
  }

  public updateStationSize(id: string, size: number): boolean {
    const station = this.stations.get(id);
    if (!station) return false;
    station.updateSize(size);
    return true;
  }

  public updateStationName(id: string, name: string): boolean {
    const station = this.stations.get(id);
    if (!station) return false;
    station.name = name;
    return true;
  }

  public findStationByObject(obj: THREE.Object3D): Station | null {
    let current: THREE.Object3D | null = obj;
    while (current) {
      if (current.userData.station) {
        return current.userData.station;
      }
      current = current.parent;
    }
    return null;
  }

  public clearAll(): void {
    for (const station of this.stations.values()) {
      this.scene.remove(station.group);
      station.dispose();
    }
    this.stations.clear();
  }

  public exportData(): StationData[] {
    return this.getAllStations().map(s => s.getData());
  }

  public importData(data: StationData[]): void {
    this.clearAll();
    for (const s of data) {
      this.addStation(
        new THREE.Vector3(s.position.x, s.position.y, s.position.z),
        s.color,
        s.size,
        s.name,
        s.id
      );
    }
  }
}
