import * as THREE from 'three';
import { v4 as uuidv4 } from 'uuid';
import type { LineData } from './types';
import { PRESET_COLORS, PRESET_LINE_NAMES } from './types';
import { StationManager } from './StationManager';

interface LineObject {
  data: LineData;
  group: THREE.Group;
  tube: THREE.Mesh;
  glow: THREE.Mesh;
  curve: THREE.CatmullRomCurve3;
  stationProgressMap: Map<string, number>;
}

export class LineManager {
  private scene: THREE.Scene;
  private stationManager: StationManager;
  private lines: Map<string, LineObject> = new Map();
  private lineCounter: number = 0;
  private usedColors: Set<string> = new Set();

  public onLineCreated?: (line: LineData) => void;
  public onLineRemoved?: (id: string) => void;
  public onLineUpdated?: (line: LineData) => void;

  constructor(scene: THREE.Scene, stationManager: StationManager) {
    this.scene = scene;
    this.stationManager = stationManager;
  }

  private pickAvailableColor(): string {
    for (const color of PRESET_COLORS) {
      if (!this.usedColors.has(color)) {
        this.usedColors.add(color);
        return color;
      }
    }
    const idx = Math.floor(Math.random() * PRESET_COLORS.length);
    return PRESET_COLORS[idx];
  }

  private buildCurve(stationIds: string[]): THREE.CatmullRomCurve3 | null {
    const points: THREE.Vector3[] = [];
    for (const sid of stationIds) {
      const station = this.stationManager.getStationById(sid);
      const group = this.stationManager.getStationGroup(sid);
      if (!station || !group) return null;
      points.push(group.position.clone());
    }
    if (points.length < 2) return null;
    return new THREE.CatmullRomCurve3(points, false, 'catmullrom', 0.2);
  }

  private computeStationProgress(curve: THREE.CatmullRomCurve3, stationIds: string[]): Map<string, number> {
    const map = new Map<string, number>();
    const totalLen = curve.getLength();
    if (totalLen === 0 || stationIds.length === 0) return map;

    const points: THREE.Vector3[] = [];
    for (const sid of stationIds) {
      const group = this.stationManager.getStationGroup(sid);
      if (group) points.push(group.position.clone());
    }

    const samples = 500;
    let acc = 0;
    let prevPoint = curve.getPointAt(0);
    let stationIdx = 0;

    for (let i = 0; i <= samples && stationIdx < stationIds.length; i++) {
      const t = i / samples;
      const point = curve.getPointAt(t);
      acc += prevPoint.distanceTo(point);
      prevPoint = point;

      if (stationIdx < points.length) {
        const distToStation = point.distanceTo(points[stationIdx]);
        if (distToStation < 0.3 || i === samples) {
          map.set(stationIds[stationIdx], Math.min(1, acc / totalLen));
          stationIdx++;
        }
      }
    }

    if (stationIds.length > 0) {
      map.set(stationIds[0], 0);
      map.set(stationIds[stationIds.length - 1], 1);
    }

    return map;
  }

  addLine(stationIds: string[]): LineData | null {
    if (stationIds.length < 2) return null;
    const curve = this.buildCurve(stationIds);
    if (!curve) return null;

    this.lineCounter++;
    const color = this.pickAvailableColor();
    const lineName = `${this.lineCounter}号线 - ${PRESET_LINE_NAMES[color] ?? '自定义'}`;

    const data: LineData = {
      id: uuidv4(),
      name: lineName,
      color,
      stationIds: [...stationIds],
      opacity: 0.7,
    };

    const lineObj = this.createLineObject(data, curve);
    if (!lineObj) return null;

    this.lines.set(data.id, lineObj);
    this.scene.add(lineObj.group);
    this.onLineCreated?.(data);
    return data;
  }

  private createLineObject(data: LineData, curve: THREE.CatmullRomCurve3): LineObject | null {
    const group = new THREE.Group();
    group.userData.lineId = data.id;

    const tubeGeo = new THREE.TubeGeometry(curve, Math.max(64, data.stationIds.length * 32), 0.12, 12, false);
    const tubeMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(data.color),
      transparent: true,
      opacity: data.opacity,
      emissive: new THREE.Color(data.color),
      emissiveIntensity: 0.5,
      roughness: 0.3,
      metalness: 0.4,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const tube = new THREE.Mesh(tubeGeo, tubeMat);
    tube.userData.lineId = data.id;
    group.add(tube);

    const glowGeo = new THREE.TubeGeometry(curve, Math.max(64, data.stationIds.length * 32), 0.22, 12, false);
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(data.color),
      transparent: true,
      opacity: data.opacity * 0.3,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    group.add(glow);

    const progressMap = this.computeStationProgress(curve, data.stationIds);

    return { data, group, tube, glow, curve, stationProgressMap: progressMap };
  }

  private disposeLineObject(obj: LineObject): void {
    this.scene.remove(obj.group);
    obj.tube.geometry.dispose();
    (obj.tube.material as THREE.Material).dispose();
    obj.glow.geometry.dispose();
    (obj.glow.material as THREE.Material).dispose();
  }

  removeLine(id: string): void {
    const obj = this.lines.get(id);
    if (!obj) return;
    this.usedColors.delete(obj.data.color);
    this.disposeLineObject(obj);
    this.lines.delete(id);
    this.onLineRemoved?.(id);
  }

  updateLineName(id: string, name: string): void {
    const obj = this.lines.get(id);
    if (!obj) return;
    obj.data.name = name;
    this.onLineUpdated?.(obj.data);
  }

  updateLineColor(id: string, color: string): void {
    const obj = this.lines.get(id);
    if (!obj) return;
    const threeColor = new THREE.Color(color);
    (obj.tube.material as THREE.MeshStandardMaterial).color.copy(threeColor);
    (obj.tube.material as THREE.MeshStandardMaterial).emissive.copy(threeColor);
    (obj.glow.material as THREE.MeshBasicMaterial).color.copy(threeColor);
    this.usedColors.delete(obj.data.color);
    obj.data.color = color;
    this.usedColors.add(color);
    this.onLineUpdated?.(obj.data);
  }

  updateLineOpacity(id: string, opacity: number): void {
    const obj = this.lines.get(id);
    if (!obj) return;
    const clamped = Math.max(0.1, Math.min(1, opacity));
    (obj.tube.material as THREE.MeshStandardMaterial).opacity = clamped;
    (obj.glow.material as THREE.MeshBasicMaterial).opacity = clamped * 0.3;
    obj.data.opacity = clamped;
    this.onLineUpdated?.(obj.data);
  }

  regenerateTrack(lineId: string): void {
    const obj = this.lines.get(lineId);
    if (!obj) return;
    const curve = this.buildCurve(obj.data.stationIds);
    if (!curve) return;

    this.disposeLineObject(obj);

    const newObj = this.createLineObject(obj.data, curve);
    if (newObj) {
      this.lines.set(lineId, newObj);
      this.scene.add(newObj.group);
    }
  }

  regenerateAllTracks(): void {
    for (const id of this.lines.keys()) {
      this.regenerateTrack(id);
    }
  }

  getLineById(id: string): LineData | undefined {
    return this.lines.get(id)?.data;
  }

  getAllLines(): LineData[] {
    return Array.from(this.lines.values()).map(l => l.data);
  }

  getCurve(lineId: string): THREE.CatmullRomCurve3 | undefined {
    return this.lines.get(lineId)?.curve;
  }

  getStationProgressMap(lineId: string): Map<string, number> | undefined {
    return this.lines.get(lineId)?.stationProgressMap;
  }

  removeLinesContainingStation(stationId: string): string[] {
    const removedIds: string[] = [];
    for (const [id, line] of this.lines) {
      if (line.data.stationIds.includes(stationId)) {
        this.removeLine(id);
        removedIds.push(id);
      }
    }
    return removedIds;
  }

  clearAll(): void {
    for (const id of Array.from(this.lines.keys())) {
      this.removeLine(id);
    }
    this.lineCounter = 0;
    this.usedColors.clear();
  }

  restoreLineCounter(count: number): void {
    this.lineCounter = Math.max(this.lineCounter, count);
  }

  restoreUsedColors(colors: string[]): void {
    for (const c of colors) this.usedColors.add(c);
  }

  dispose(): void {
    this.clearAll();
  }
}
