import * as THREE from 'three';

export interface MeasureRecord {
  id: string;
  distance: number;
  point1: THREE.Vector3;
  point2: THREE.Vector3;
  timestamp: number;
}

interface HistoryVisual {
  id: string;
  line: THREE.Line;
  pointA: THREE.Mesh;
  pointB: THREE.Mesh;
  highlightScale: number;
}

type DragTarget = 'marker1' | 'marker2' | null;

export class MeasureTool {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private getTerrainHeight: (x: number, z: number) => number;

  private group: THREE.Group;
  private historyGroup: THREE.Group;
  private marker1: THREE.Mesh | null = null;
  private marker2: THREE.Mesh | null = null;
  private marker1Glow: THREE.Mesh | null = null;
  private marker2Glow: THREE.Mesh | null = null;
  private dashedLine: THREE.Line | null = null;
  private labelSprite: THREE.Sprite | null = null;

  private point1: THREE.Vector3 | null = null;
  private point2: THREE.Vector3 | null = null;

  private isActive: boolean = false;
  private placeCount: number = 0;

  private records: MeasureRecord[] = [];
  private historyVisuals: Map<string, HistoryVisual> = new Map();
  private highlightedRecordId: string | null = null;
  private maxRecords: number = 50;
  private onRecordUpdateCallback: ((records: MeasureRecord[]) => void) | null = null;
  private onHighlightCallback: ((id: string | null) => void) | null = null;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private terrainMesh: THREE.Object3D | null = null;

  private isDragging: boolean = false;
  private dragTarget: DragTarget = null;
  private dragPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private dragOffset: THREE.Vector3 = new THREE.Vector3();
  private lastLabelUpdate: number = 0;
  private readonly LABEL_UPDATE_INTERVAL: number = 30;

  private readonly GLOW_BASE_SCALE: number = 1;
  private readonly GLOW_PULSE_SPEED: number = 2;
  private readonly GLOW_HIGHLIGHT_SCALE: number = 1.6;
  private pulseTime: number = 0;

  constructor(
    scene: THREE.Scene,
    camera: THREE.PerspectiveCamera,
    getTerrainHeight: (x: number, z: number) => number
  ) {
    this.scene = scene;
    this.camera = camera;
    this.getTerrainHeight = getTerrainHeight;
    this.group = new THREE.Group();
    this.group.name = 'measureTool';
    this.scene.add(this.group);

    this.historyGroup = new THREE.Group();
    this.historyGroup.name = 'measureHistory';
    this.scene.add(this.historyGroup);
  }

  public setTerrainMesh(mesh: THREE.Object3D): void {
    this.terrainMesh = mesh;
  }

  public activate(): void {
    this.isActive = true;
    this.placeCount = 0;
    this.clearMarkers();
  }

  public deactivate(): void {
    this.isActive = false;
    this.placeCount = 0;
    this.isDragging = false;
    this.dragTarget = null;
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  public setOnRecordUpdate(callback: (records: MeasureRecord[]) => void): void {
    this.onRecordUpdateCallback = callback;
  }

  public setOnHighlight(callback: (id: string | null) => void): void {
    this.onHighlightCallback = callback;
  }

  public getRecords(): MeasureRecord[] {
    return [...this.records];
  }

  public highlightRecord(id: string | null): void {
    if (this.highlightedRecordId === id) {
      if (id !== null) {
        this.highlightedRecordId = null;
        this.applyHighlight(null);
        this.onHighlightCallback?.(null);
      }
      return;
    }

    this.highlightedRecordId = id;
    this.applyHighlight(id);
    this.onHighlightCallback?.(id);
  }

  public getHighlightedRecordId(): string | null {
    return this.highlightedRecordId;
  }

  private applyHighlight(id: string | null): void {
    this.historyVisuals.forEach((visual, visualId) => {
      const isHighlighted = id === visualId;
      visual.highlightScale = isHighlighted ? this.GLOW_HIGHLIGHT_SCALE : 1;
      
      const lineMat = visual.line.material as THREE.LineBasicMaterial;
      lineMat.color.setHex(isHighlighted ? 0x00FF88 : 0x3B82F6);
      lineMat.linewidth = isHighlighted ? 2 : 1;
      lineMat.opacity = isHighlighted ? 1.0 : 0.5;

      this.updateHistoryVisualScale(visual);
    });
  }

  private updateHistoryVisualScale(visual: HistoryVisual): void {
    const baseScale = 1;
    const pulseScale = 1 + Math.sin(this.pulseTime * this.GLOW_PULSE_SPEED) * 0.08;
    const scale = baseScale * pulseScale * visual.highlightScale;

    if (visual.pointA) {
      visual.pointA.scale.setScalar(scale);
      const glowA = visual.pointA.userData.glow as THREE.Mesh | undefined;
      if (glowA) glowA.scale.setScalar(scale * 1.8);
    }
    if (visual.pointB) {
      visual.pointB.scale.setScalar(scale);
      const glowB = visual.pointB.userData.glow as THREE.Mesh | undefined;
      if (glowB) glowB.scale.setScalar(scale * 1.8);
    }
  }

  public deleteRecord(id: string): void {
    const idx = this.records.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.records.splice(idx, 1);
      this.removeHistoryVisual(id);
      if (this.highlightedRecordId === id) {
        this.highlightedRecordId = null;
        this.onHighlightCallback?.(null);
      }
      this.onRecordUpdateCallback?.(this.records);
    }
  }

  public clearAllRecords(): void {
    this.records = [];
    this.clearAllHistoryVisuals();
    this.highlightedRecordId = null;
    this.onHighlightCallback?.(null);
    this.onRecordUpdateCallback?.(this.records);
  }

  private removeHistoryVisual(id: string): void {
    const visual = this.historyVisuals.get(id);
    if (visual) {
      this.historyGroup.remove(visual.line);
      this.historyGroup.remove(visual.pointA);
      this.historyGroup.remove(visual.pointB);
      
      [visual.line, visual.pointA, visual.pointB].forEach((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry?.dispose();
          const glow = m.userData.glow as THREE.Mesh | undefined;
          if (glow) {
            glow.geometry?.dispose();
            (glow.material as THREE.Material)?.dispose();
          }
          const mat = m.material;
          if (Array.isArray(mat)) mat.forEach((mm) => mm.dispose());
          else mat?.dispose();
        } else if ((obj as THREE.Line).isLine) {
          (obj as THREE.Line).geometry?.dispose();
          ((obj as THREE.Line).material as THREE.Material)?.dispose();
        }
      });

      this.historyVisuals.delete(id);
    }
  }

  private clearAllHistoryVisuals(): void {
    this.historyVisuals.forEach((_, id) => this.removeHistoryVisual(id));
    this.historyVisuals.clear();
  }

  public clearMarkers(): void {
    if (this.marker1) {
      this.group.remove(this.marker1);
      this.marker1.geometry.dispose();
      (this.marker1.material as THREE.Material).dispose();
      this.marker1 = null;
    }
    if (this.marker1Glow) {
      this.group.remove(this.marker1Glow);
      this.marker1Glow.geometry.dispose();
      (this.marker1Glow.material as THREE.Material).dispose();
      this.marker1Glow = null;
    }
    if (this.marker2) {
      this.group.remove(this.marker2);
      this.marker2.geometry.dispose();
      (this.marker2.material as THREE.Material).dispose();
      this.marker2 = null;
    }
    if (this.marker2Glow) {
      this.group.remove(this.marker2Glow);
      this.marker2Glow.geometry.dispose();
      (this.marker2Glow.material as THREE.Material).dispose();
      this.marker2Glow = null;
    }
    if (this.dashedLine) {
      this.group.remove(this.dashedLine);
      this.dashedLine.geometry.dispose();
      (this.dashedLine.material as THREE.Material).dispose();
      this.dashedLine = null;
    }
    if (this.labelSprite) {
      this.group.remove(this.labelSprite);
      (this.labelSprite.material as THREE.SpriteMaterial).map?.dispose();
      (this.labelSprite.material as THREE.Material).dispose();
      this.labelSprite = null;
    }
    this.point1 = null;
    this.point2 = null;
    this.isDragging = false;
    this.dragTarget = null;
  }

  public handleMouseDown(event: MouseEvent, canvas: HTMLCanvasElement): boolean {
    if (!this.isActive) return false;
    if (this.placeCount !== 2) return false;

    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    const targets: THREE.Mesh[] = [];
    if (this.marker1) targets.push(this.marker1);
    if (this.marker2) targets.push(this.marker2);
    if (this.marker1Glow) targets.push(this.marker1Glow);
    if (this.marker2Glow) targets.push(this.marker2Glow);

    const intersects = this.raycaster.intersectObjects(targets, true);
    if (intersects.length > 0) {
      const hitObj = intersects[0].object;
      let target: THREE.Object3D | null = hitObj;
      while (target && !target.userData?.measureMarker) {
        target = target.parent;
      }
      if (target) {
        this.isDragging = true;
        this.dragTarget = target.userData.measureMarker as DragTarget;
        
        const hitPoint = intersects[0].point.clone();
        const markerPos = (this.dragTarget === 'marker1' ? this.point1 : this.point2)?.clone();
        if (markerPos) {
          this.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -hitPoint.y);
          this.raycaster.ray.intersectPlane(this.dragPlane, this.dragOffset);
          this.dragOffset.sub(markerPos);
        }
        document.body.style.cursor = 'grabbing';
        return true;
      }
    }
    return false;
  }

  public handleMouseMove(event: MouseEvent, canvas: HTMLCanvasElement): boolean {
    if (!this.isActive) return false;

    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    if (this.isDragging && this.dragTarget) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      
      const intersectPoint = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(this.dragPlane, intersectPoint)) {
        const newPos = intersectPoint.sub(this.dragOffset);
        const terrainSize = 16;
        const halfSize = terrainSize / 2;
        newPos.x = Math.max(-halfSize, Math.min(halfSize, newPos.x));
        newPos.z = Math.max(-halfSize, Math.min(halfSize, newPos.z));
        newPos.y = this.getTerrainHeight(newPos.x, newPos.z) + 0.05;

        if (this.dragTarget === 'marker1') {
          this.point1 = newPos;
          if (this.marker1) {
            this.marker1.position.copy(newPos);
          }
          if (this.marker1Glow) {
            this.marker1Glow.position.copy(newPos);
          }
        } else if (this.dragTarget === 'marker2') {
          this.point2 = newPos;
          if (this.marker2) {
            this.marker2.position.copy(newPos);
          }
          if (this.marker2Glow) {
            this.marker2Glow.position.copy(newPos);
          }
        }

        this.updateDashedLine();
        this.throttledUpdateLabel();
      }
      return true;
    }

    if (this.placeCount === 2) {
      this.raycaster.setFromCamera(this.mouse, this.camera);
      const targets: THREE.Mesh[] = [];
      if (this.marker1) targets.push(this.marker1);
      if (this.marker2) targets.push(this.marker2);
      if (this.marker1Glow) targets.push(this.marker1Glow);
      if (this.marker2Glow) targets.push(this.marker2Glow);
      const intersects = this.raycaster.intersectObjects(targets, true);
      document.body.style.cursor = intersects.length > 0 ? 'grab' : 'crosshair';
    }

    return false;
  }

  public handleMouseUp(): boolean {
    if (this.isDragging) {
      this.isDragging = false;
      this.dragTarget = null;
      document.body.style.cursor = 'crosshair';
      return true;
    }
    return false;
  }

  private throttledUpdateLabel(): void {
    const now = performance.now();
    if (now - this.lastLabelUpdate >= this.LABEL_UPDATE_INTERVAL) {
      this.updateLabel();
      this.lastLabelUpdate = now;
    }
  }

  public handleClick(event: MouseEvent, canvas: HTMLCanvasElement): boolean {
    if (!this.isActive) return false;
    if (this.isDragging) return false;

    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);

    let hitPoint: THREE.Vector3 | null = null;
    const terrainSize = 16;
    const halfSize = terrainSize / 2;

    if (this.terrainMesh) {
      const intersects = this.raycaster.intersectObject(this.terrainMesh, true);
      if (intersects.length > 0) {
        hitPoint = intersects[0].point.clone();
      }
    }

    if (!hitPoint) {
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      hitPoint = new THREE.Vector3();
      if (!this.raycaster.ray.intersectPlane(plane, hitPoint)) {
        return false;
      }
    }

    if (hitPoint.x > halfSize) hitPoint.x = halfSize;
    if (hitPoint.x < -halfSize) hitPoint.x = -halfSize;
    if (hitPoint.z > halfSize) hitPoint.z = halfSize;
    if (hitPoint.z < -halfSize) hitPoint.z = -halfSize;

    const terrainY = this.getTerrainHeight(hitPoint.x, hitPoint.z);
    hitPoint.y = terrainY + 0.05;

    return this.placeMarker(hitPoint);
  }

  private placeMarker(position: THREE.Vector3): boolean {
    if (this.placeCount === 0) {
      this.placeCount = 1;
      this.point1 = position.clone();
      const { marker, glow } = this.createMarker(position, '#FF4500', 'marker1');
      this.marker1 = marker;
      this.marker1Glow = glow;
      this.group.add(this.marker1);
      this.group.add(this.marker1Glow);
      return true;
    } else if (this.placeCount === 1) {
      this.placeCount = 2;
      this.point2 = position.clone();
      const { marker, glow } = this.createMarker(position, '#3B82F6', 'marker2');
      this.marker2 = marker;
      this.marker2Glow = glow;
      this.group.add(this.marker2);
      this.group.add(this.marker2Glow);
      this.createDashedLine();
      this.createLabel();
      return true;
    }
    return false;
  }

  private createMarker(position: THREE.Vector3, color: string, markerId: string): { marker: THREE.Mesh; glow: THREE.Mesh } {
    const sphereGeom = new THREE.SphereGeometry(0.15, 24, 24);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.85,
      emissive: new THREE.Color(color).multiplyScalar(0.6),
      shininess: 100,
      specular: new THREE.Color(0xffffff)
    });
    const marker = new THREE.Mesh(sphereGeom, sphereMat);
    marker.position.copy(position);
    marker.userData.measureMarker = markerId;

    const glowGeom = new THREE.SphereGeometry(0.28, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.25,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const glow = new THREE.Mesh(glowGeom, glowMat);
    glow.position.copy(position);
    glow.userData.measureMarker = markerId;
    marker.userData.glow = glow;

    return { marker, glow };
  }

  private createHistoryVisual(record: MeasureRecord): void {
    if (this.records.length > this.maxRecords) {
      const oldest = this.records[0];
      this.removeHistoryVisual(oldest.id);
    }

    const lineGeom = new THREE.BufferGeometry().setFromPoints([record.point1, record.point2]);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x3B82F6,
      transparent: true,
      opacity: 0.5,
      linewidth: 1
    });
    const line = new THREE.Line(lineGeom, lineMat);

    const createPoint = (pos: THREE.Vector3, colorHex: number): THREE.Mesh => {
      const geom = new THREE.SphereGeometry(0.08, 16, 16);
      const mat = new THREE.MeshPhongMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.9,
        emissive: new THREE.Color(colorHex).multiplyScalar(0.5),
        shininess: 80
      });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos);

      const glowGeom = new THREE.SphereGeometry(0.14, 24, 24);
      const glowMat = new THREE.MeshBasicMaterial({
        color: colorHex,
        transparent: true,
        opacity: 0.3,
        side: THREE.BackSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const glow = new THREE.Mesh(glowGeom, glowMat);
      glow.position.copy(pos);
      mesh.userData.glow = glow;
      mesh.add(glow);

      return mesh;
    };

    const pointA = createPoint(record.point1, 0xFF4500);
    const pointB = createPoint(record.point2, 0x3B82F6);

    this.historyGroup.add(line);
    this.historyGroup.add(pointA);
    this.historyGroup.add(pointB);

    this.historyVisuals.set(record.id, {
      id: record.id,
      line,
      pointA,
      pointB,
      highlightScale: 1
    });
  }

  private createDashedLine(): void {
    if (!this.point1 || !this.point2) return;

    const geometry = new THREE.BufferGeometry().setFromPoints([this.point1, this.point2]);
    const material = new THREE.LineDashedMaterial({
      color: new THREE.Color('#FFD700'),
      linewidth: 2,
      scale: 1,
      dashSize: 0.15,
      gapSize: 0.08,
      transparent: true,
      opacity: 0.95
    });
    this.dashedLine = new THREE.Line(geometry, material);
    this.dashedLine.computeLineDistances();
    this.group.add(this.dashedLine);
  }

  private updateDashedLine(): void {
    if (!this.dashedLine || !this.point1 || !this.point2) return;

    const positions = this.dashedLine.geometry.attributes.position;
    positions.setXYZ(0, this.point1.x, this.point1.y, this.point1.z);
    positions.setXYZ(1, this.point2.x, this.point2.y, this.point2.z);
    positions.needsUpdate = true;
    this.dashedLine.computeLineDistances();
    (this.dashedLine.geometry as any).attributes.lineDistance.needsUpdate = true;
  }

  private createLabel(): void {
    if (!this.point1 || !this.point2) return;

    const distance = this.point1.distanceTo(this.point2);
    const text = `${distance.toFixed(2)} 单位`;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const fontSize = 16;
    const fontFamily = "'JetBrains Mono', 'Fira Code', monospace";
    const padding = 8;

    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    const textWidth = ctx.measureText(text).width;
    canvas.width = textWidth + padding * 2;
    canvas.height = fontSize + padding * 2;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    this.roundRect(ctx, 0, 0, canvas.width, canvas.height, 4);
    ctx.fill();

    ctx.strokeStyle = '#3B82F6';
    ctx.lineWidth = 1;
    this.roundRect(ctx, 0.5, 0.5, canvas.width - 1, canvas.height - 1, 4);
    ctx.stroke();

    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    ctx.fillStyle = '#FFFFFF';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    texture.minFilter = THREE.LinearFilter;

    const material = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      depthTest: false
    });

    this.labelSprite = new THREE.Sprite(material);
    const midPoint = new THREE.Vector3().addVectors(this.point1, this.point2).multiplyScalar(0.5);
    this.labelSprite.position.copy(midPoint);
    this.labelSprite.position.y += 0.6;

    const aspect = canvas.width / canvas.height;
    const spriteHeight = 0.5;
    this.labelSprite.scale.set(spriteHeight * aspect, spriteHeight, 1);

    this.group.add(this.labelSprite);
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  public updateLabel(): void {
    if (!this.point1 || !this.point2) return;

    if (this.labelSprite) {
      this.group.remove(this.labelSprite);
      (this.labelSprite.material as THREE.SpriteMaterial).map?.dispose();
      (this.labelSprite.material as THREE.Material).dispose();
      this.labelSprite = null;
    }
    this.createLabel();
  }

  public recordMeasurement(): boolean {
    if (!this.point1 || !this.point2) return false;
    if (this.placeCount !== 2) return false;

    const distance = this.point1.distanceTo(this.point2);
    const record: MeasureRecord = {
      id: `measure_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      distance,
      point1: this.point1.clone(),
      point2: this.point2.clone(),
      timestamp: Date.now()
    };

    if (this.records.length >= this.maxRecords) {
      const oldest = this.records.shift();
      if (oldest) this.removeHistoryVisual(oldest.id);
    }
    this.records.push(record);
    this.createHistoryVisual(record);
    this.onRecordUpdateCallback?.(this.records);

    this.clearMarkers();
    this.placeCount = 0;
    document.body.style.cursor = '';
    return true;
  }

  public update(deltaTime?: number): void {
    this.pulseTime += deltaTime ?? 0.016;

    if (this.labelSprite && this.point1 && this.point2) {
      const midPoint = new THREE.Vector3().addVectors(this.point1, this.point2).multiplyScalar(0.5);
      this.labelSprite.position.x = midPoint.x;
      this.labelSprite.position.z = midPoint.z;
    }

    if (this.marker1Glow && this.marker1) {
      this.marker1Glow.position.copy(this.marker1.position);
      const pulse = 1 + Math.sin(this.pulseTime * 3) * 0.15;
      this.marker1Glow.scale.setScalar(pulse);
      const glowMat = this.marker1Glow.material as THREE.MeshBasicMaterial;
      glowMat.opacity = 0.2 + Math.sin(this.pulseTime * 3) * 0.1;
    }
    if (this.marker2Glow && this.marker2) {
      this.marker2Glow.position.copy(this.marker2.position);
      const pulse = 1 + Math.sin(this.pulseTime * 3 + Math.PI) * 0.15;
      this.marker2Glow.scale.setScalar(pulse);
      const glowMat = this.marker2Glow.material as THREE.MeshBasicMaterial;
      glowMat.opacity = 0.2 + Math.sin(this.pulseTime * 3 + Math.PI) * 0.1;
    }

    this.historyVisuals.forEach((visual) => {
      this.updateHistoryVisualScale(visual);
    });
  }

  public getPlaceCount(): number {
    return this.placeCount;
  }

  public getIsDragging(): boolean {
    return this.isDragging;
  }

  public dispose(): void {
    this.clearMarkers();
    this.clearAllRecords();
    this.scene.remove(this.group);
    this.scene.remove(this.historyGroup);
  }
}
