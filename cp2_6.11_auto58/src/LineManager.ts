import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import { Station, StationManager } from './StationManager';

export const PRESET_COLORS = [
  '#ff6b6b',
  '#4ecdc4',
  '#45b7d1',
  '#96ceb4',
  '#ffeaa7',
  '#dfe6e9',
  '#fd79a8',
  '#a29bfe'
];

export const COLOR_NAMES: Record<string, string> = {
  '#ff6b6b': '红线',
  '#4ecdc4': '青线',
  '#45b7d1': '蓝线',
  '#96ceb4': '绿线',
  '#ffeaa7': '黄线',
  '#dfe6e9': '灰线',
  '#fd79a8': '粉线',
  '#a29bfe': '紫线'
};

export interface LineData {
  id: string;
  name: string;
  color: string;
  stationIds: string[];
  opacity: number;
}

export class MetroLine {
  public id: string;
  public name: string;
  public color: string;
  public opacity: number = 0.7;
  public stationIds: string[] = [];
  public group: THREE.Group;
  public tubeMeshes: THREE.Mesh[] = [];
  public curve: THREE.CatmullRomCurve3 | null = null;

  constructor(name: string, color: string) {
    this.id = uuidv4();
    this.name = name;
    this.color = color;
    this.group = new THREE.Group();
    this.group.userData.line = this;
  }

  public updateColor(color: string): void {
    this.color = color;
    for (const mesh of this.tubeMeshes) {
      (mesh.material as THREE.MeshStandardMaterial).color.set(color);
      (mesh.material as THREE.MeshStandardMaterial).emissive.set(color);
    }
  }

  public updateOpacity(opacity: number): void {
    this.opacity = opacity;
    for (const mesh of this.tubeMeshes) {
      (mesh.material as THREE.MeshStandardMaterial).opacity = opacity;
    }
  }

  public clearTubes(): void {
    for (const mesh of this.tubeMeshes) {
      this.group.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.Material).dispose();
    }
    this.tubeMeshes = [];
    this.curve = null;
  }

  public buildTrack(stations: Station[], tubeRadius: number = 0.15): void {
    this.clearTubes();

    if (stations.length < 2) return;

    const points = stations.map(s => new THREE.Vector3(
      s.position.x,
      s.position.y,
      s.position.z
    ));

    this.curve = new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.5);

    const tubeGeometry = new THREE.TubeGeometry(this.curve, Math.max(64, stations.length * 32), tubeRadius, 16, false);
    const tubeMaterial = new THREE.MeshStandardMaterial({
      color: this.color,
      emissive: this.color,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: this.opacity,
      metalness: 0.6,
      roughness: 0.3
    });

    const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
    tube.castShadow = true;
    tube.receiveShadow = true;
    this.tubeMeshes.push(tube);
    this.group.add(tube);

    const haloGeometry = new THREE.TubeGeometry(this.curve, Math.max(64, stations.length * 32), tubeRadius * 1.8, 12, false);
    const haloMaterial = new THREE.ShaderMaterial({
      uniforms: {
        color: { value: new THREE.Color(this.color) }
      },
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform vec3 color;
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.7 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.5);
          gl_FragColor = vec4(color, intensity * 0.4);
        }
      `,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
      depthWrite: false
    });

    const haloTube = new THREE.Mesh(haloGeometry, haloMaterial);
    this.tubeMeshes.push(haloTube);
    this.group.add(haloTube);
  }

  public getPointAt(t: number): THREE.Vector3 | null {
    if (!this.curve) return null;
    return this.curve.getPointAt(t);
  }

  public getTotalLength(): number {
    if (!this.curve) return 0;
    return this.curve.getLength();
  }

  public getData(): LineData {
    return {
      id: this.id,
      name: this.name,
      color: this.color,
      stationIds: [...this.stationIds],
      opacity: this.opacity
    };
  }

  public dispose(): void {
    this.clearTubes();
  }
}

export class LineManager {
  public lines: Map<string, MetroLine> = new Map();
  private scene: THREE.Scene;
  private stationManager: StationManager;
  private lineCounter: number = 0;
  public onLineAdded?: (line: MetroLine) => void;
  public onLineRemoved?: (line: MetroLine) => void;
  public onLineUpdated?: (line: MetroLine) => void;

  constructor(scene: THREE.Scene, stationManager: StationManager) {
    this.scene = scene;
    this.stationManager = stationManager;
  }

  private getNextLineName(color: string): string {
    this.lineCounter++;
    const colorName = COLOR_NAMES[color] || '线路';
    return `${this.lineCounter}号线 - ${colorName}`;
  }

  private getAvailableColor(): string {
    const usedColors = new Set(Array.from(this.lines.values()).map(l => l.color));
    for (const color of PRESET_COLORS) {
      if (!usedColors.has(color)) return color;
    }
    return PRESET_COLORS[Math.floor(Math.random() * PRESET_COLORS.length)];
  }

  public createLine(stationIds: string[], color?: string, name?: string, existingId?: string): MetroLine | null {
    if (stationIds.length < 2) return null;

    const stations: Station[] = [];
    for (const id of stationIds) {
      const station = this.stationManager.getStation(id);
      if (!station) return null;
      stations.push(station);
    }

    const lineColor = color || this.getAvailableColor();
    const line = new MetroLine(name || this.getNextLineName(lineColor), lineColor);
    if (existingId) {
      line.id = existingId;
    }
    line.stationIds = [...stationIds];
    line.buildTrack(stations);

    this.lines.set(line.id, line);
    this.scene.add(line.group);
    this.onLineAdded?.(line);
    return line;
  }

  public removeLine(id: string): boolean {
    const line = this.lines.get(id);
    if (!line) return false;
    this.scene.remove(line.group);
    line.dispose();
    this.lines.delete(id);
    this.onLineRemoved?.(line);
    return true;
  }

  public getLine(id: string): MetroLine | undefined {
    return this.lines.get(id);
  }

  public getAllLines(): MetroLine[] {
    return Array.from(this.lines.values());
  }

  public updateLineColor(id: string, color: string): boolean {
    const line = this.lines.get(id);
    if (!line) return false;
    line.updateColor(color);
    this.onLineUpdated?.(line);
    return true;
  }

  public updateLineOpacity(id: string, opacity: number): boolean {
    const line = this.lines.get(id);
    if (!line) return false;
    line.updateOpacity(opacity);
    this.onLineUpdated?.(line);
    return true;
  }

  public updateLineName(id: string, name: string): boolean {
    const line = this.lines.get(id);
    if (!line) return false;
    line.name = name;
    this.onLineUpdated?.(line);
    return true;
  }

  public addStationToLine(lineId: string, stationId: string): boolean {
    const line = this.lines.get(lineId);
    if (!line) return false;
    const station = this.stationManager.getStation(stationId);
    if (!station) return false;
    if (line.stationIds.includes(stationId)) return false;

    line.stationIds.push(stationId);
    this.rebuildLine(lineId);
    return true;
  }

  public removeStationFromLine(lineId: string, stationId: string): boolean {
    const line = this.lines.get(lineId);
    if (!line) return false;
    const idx = line.stationIds.indexOf(stationId);
    if (idx === -1) return false;
    line.stationIds.splice(idx, 1);

    if (line.stationIds.length < 2) {
      this.removeLine(lineId);
    } else {
      this.rebuildLine(lineId);
    }
    return true;
  }

  public rebuildLine(id: string): boolean {
    const line = this.lines.get(id);
    if (!line) return false;
    const stations: Station[] = [];
    for (const sid of line.stationIds) {
      const s = this.stationManager.getStation(sid);
      if (s) stations.push(s);
    }
    if (stations.length < 2) {
      line.clearTubes();
    } else {
      line.buildTrack(stations);
    }
    this.onLineUpdated?.(line);
    return true;
  }

  public rebuildAllLines(): void {
    for (const line of this.lines.values()) {
      this.rebuildLine(line.id);
    }
  }

  public findLineByObject(obj: THREE.Object3D): MetroLine | null {
    let current: THREE.Object3D | null = obj;
    while (current) {
      if (current.userData.line) {
        return current.userData.line;
      }
      current = current.parent;
    }
    return null;
  }

  public clearAll(): void {
    for (const line of this.lines.values()) {
      this.scene.remove(line.group);
      line.dispose();
    }
    this.lines.clear();
    this.lineCounter = 0;
  }

  public exportData(): LineData[] {
    return this.getAllLines().map(l => l.getData());
  }

  public importData(data: LineData[]): void {
    this.clearAll();
    for (const l of data) {
      const line = this.createLine(l.stationIds, l.color, l.name, l.id);
      if (line) {
        line.updateOpacity(l.opacity);
      }
    }
  }
}
