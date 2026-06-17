import * as THREE from 'three';

export interface MeasureRecord {
  id: string;
  distance: number;
  point1: THREE.Vector3;
  point2: THREE.Vector3;
  timestamp: number;
}

export class MeasureTool {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private getTerrainHeight: (x: number, z: number) => number;

  private group: THREE.Group;
  private marker1: THREE.Mesh | null = null;
  private marker2: THREE.Mesh | null = null;
  private dashedLine: THREE.Line | null = null;
  private labelSprite: THREE.Sprite | null = null;

  private point1: THREE.Vector3 | null = null;
  private point2: THREE.Vector3 | null = null;

  private isActive: boolean = false;
  private placeCount: number = 0;

  private records: MeasureRecord[] = [];
  private maxRecords: number = 50;
  private onRecordUpdateCallback: ((records: MeasureRecord[]) => void) | null = null;

  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private terrainMesh: THREE.Object3D | null = null;

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
  }

  public getIsActive(): boolean {
    return this.isActive;
  }

  public setOnRecordUpdate(callback: (records: MeasureRecord[]) => void): void {
    this.onRecordUpdateCallback = callback;
  }

  public getRecords(): MeasureRecord[] {
    return [...this.records];
  }

  public deleteRecord(id: string): void {
    const idx = this.records.findIndex((r) => r.id === id);
    if (idx !== -1) {
      this.records.splice(idx, 1);
      this.onRecordUpdateCallback?.(this.records);
    }
  }

  public clearAllRecords(): void {
    this.records = [];
    this.onRecordUpdateCallback?.(this.records);
  }

  public clearMarkers(): void {
    if (this.marker1) {
      this.group.remove(this.marker1);
      this.marker1.geometry.dispose();
      (this.marker1.material as THREE.Material).dispose();
      this.marker1 = null;
    }
    if (this.marker2) {
      this.group.remove(this.marker2);
      this.marker2.geometry.dispose();
      (this.marker2.material as THREE.Material).dispose();
      this.marker2 = null;
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
  }

  public handleClick(event: MouseEvent, canvas: HTMLCanvasElement): boolean {
    if (!this.isActive) return false;

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
      this.marker1 = this.createMarker(position, '#FF4500');
      this.group.add(this.marker1);
      return true;
    } else if (this.placeCount === 1) {
      this.placeCount = 2;
      this.point2 = position.clone();
      this.marker2 = this.createMarker(position, '#3B82F6');
      this.group.add(this.marker2);
      this.createDashedLine();
      this.createLabel();
      return true;
    }
    return false;
  }

  private createMarker(position: THREE.Vector3, color: string): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.15, 24, 24);
    const material = new THREE.MeshPhongMaterial({
      color: new THREE.Color(color),
      emissive: new THREE.Color(color).multiplyScalar(0.4),
      shininess: 80
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);

    const ringGeom = new THREE.RingGeometry(0.18, 0.22, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.7,
      side: THREE.DoubleSide
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -position.y + 0.02;
    mesh.add(ring);

    return mesh;
  }

  private createDashedLine(): void {
    if (!this.point1 || !this.point2) return;

    const geometry = new THREE.BufferGeometry().setFromPoints([this.point1, this.point2]);
    const material = new THREE.LineDashedMaterial({
      color: new THREE.Color('#FFD700'),
      linewidth: 1,
      scale: 1,
      dashSize: 0.15,
      gapSize: 0.08,
      transparent: true,
      opacity: 0.9
    });
    this.dashedLine = new THREE.Line(geometry, material);
    this.dashedLine.computeLineDistances();
    this.group.add(this.dashedLine);
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
      this.records.shift();
    }
    this.records.push(record);
    this.onRecordUpdateCallback?.(this.records);

    this.clearMarkers();
    this.placeCount = 0;
    return true;
  }

  public update(): void {
    if (this.labelSprite && this.point1 && this.point2) {
      const midPoint = new THREE.Vector3().addVectors(this.point1, this.point2).multiplyScalar(0.5);
      this.labelSprite.position.x = midPoint.x;
      this.labelSprite.position.z = midPoint.z;
    }
  }

  public getPlaceCount(): number {
    return this.placeCount;
  }

  public dispose(): void {
    this.clearMarkers();
    this.clearAllRecords();
    this.scene.remove(this.group);
  }
}
