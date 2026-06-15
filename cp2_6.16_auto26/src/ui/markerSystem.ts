import * as THREE from 'three';

export interface TerrainPoint {
  x: number;
  z: number;
  elevation: number;
  utmX: number;
  utmY: number;
}

export interface Marker {
  id: string;
  position: TerrainPoint;
  mesh: THREE.Mesh;
  line: THREE.Line;
}

export interface PathNode {
  id: string;
  position: TerrainPoint;
  mesh: THREE.Mesh;
}

export interface PathSegment {
  id: string;
  startNodeId: string;
  endNodeId: string;
  line: THREE.Line;
  length: number;
}

export interface Measurement {
  id: string;
  startPoint: TerrainPoint;
  endPoint: TerrainPoint;
  line: THREE.Line;
  label: HTMLElement;
  distance: number;
}

export interface ExportPathData {
  points: Array<{
    x: number;
    z: number;
    elevation: number;
    utmX: number;
    utmY: number;
  }>;
  totalLength: number;
}

export class MarkerSystem {
  private markers: Map<string, Marker> = new Map();
  private pathNodes: Map<string, PathNode> = new Map();
  private pathSegments: Map<string, PathSegment> = new Map();
  private measurements: Map<string, Measurement> = new Map();
  private lastMarker: Marker | null = null;
  private totalPathLength: number = 0;
  private container: HTMLElement;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.Camera,
    container: HTMLElement
  ) {
    this.container = container;
  }

  addMarker(point: TerrainPoint): Marker {
    const id = Math.random().toString(36).substr(2, 9);

    const geometry = new THREE.SphereGeometry(0.15, 16, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0xff1744,
      emissive: 0xff1744,
      emissiveIntensity: 0.5
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(point.x, point.elevation, point.z);
    this.scene.add(mesh);

    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(point.x, 0, point.z),
      new THREE.Vector3(point.x, point.elevation, point.z)
    ]);
    const lineMaterial = new THREE.LineBasicMaterial({
      color: 0xff1744
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    this.scene.add(line);

    const marker: Marker = { id, position: point, mesh, line };
    this.markers.set(id, marker);
    this.lastMarker = marker;

    return marker;
  }

  addPathNode(point: TerrainPoint): PathNode {
    const id = Math.random().toString(36).substr(2, 9);

    const geometry = new THREE.SphereGeometry(0.1, 16, 16);
    const material = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(point.x, point.elevation, point.z);
    this.scene.add(mesh);

    const node: PathNode = { id, position: point, mesh };
    this.pathNodes.set(id, node);

    const nodesArray = Array.from(this.pathNodes.values());
    if (nodesArray.length > 1) {
      const prevNode = nodesArray[nodesArray.length - 2];
      const segmentId = Math.random().toString(36).substr(2, 9);

      const lineGeometry = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(prevNode.position.x, prevNode.position.elevation, prevNode.position.z),
        new THREE.Vector3(point.x, point.elevation, point.z)
      ]);
      const lineMaterial = new THREE.LineBasicMaterial({
        color: 0x00e676
      });
      const line = new THREE.Line(lineGeometry, lineMaterial);
      this.scene.add(line);

      const dx = point.x - prevNode.position.x;
      const dz = point.z - prevNode.position.z;
      const length = Math.sqrt(dx * dx + dz * dz);

      const segment: PathSegment = {
        id: segmentId,
        startNodeId: prevNode.id,
        endNodeId: id,
        line,
        length
      };
      this.pathSegments.set(segmentId, segment);
      this.totalPathLength += length;
    }

    return node;
  }

  removeSegment(segmentId: string): void {
    const segment = this.pathSegments.get(segmentId);
    if (!segment) return;

    const nodesArray = Array.from(this.pathNodes.values());
    const startIndex = nodesArray.findIndex(n => n.id === segment.startNodeId);
    const endIndex = nodesArray.findIndex(n => n.id === segment.endNodeId);

    for (let i = endIndex; i < nodesArray.length; i++) {
      const node = nodesArray[i];
      this.scene.remove(node.mesh);
      (node.mesh.geometry as THREE.BufferGeometry).dispose();
      (node.mesh.material as THREE.Material).dispose();
      this.pathNodes.delete(node.id);
    }

    for (let i = startIndex + 1; i < nodesArray.length; i++) {
      const seg = Array.from(this.pathSegments.values()).find(
        s => s.startNodeId === nodesArray[i - 1].id && s.endNodeId === nodesArray[i].id
      );
      if (seg) {
        this.scene.remove(seg.line);
        (seg.line.geometry as THREE.BufferGeometry).dispose();
        (seg.line.material as THREE.Material).dispose();
        this.totalPathLength -= seg.length;
        this.pathSegments.delete(seg.id);
      }
    }
  }

  clearAllPaths(): void {
    this.pathNodes.forEach(node => {
      this.scene.remove(node.mesh);
      (node.mesh.geometry as THREE.BufferGeometry).dispose();
      (node.mesh.material as THREE.Material).dispose();
    });
    this.pathNodes.clear();

    this.pathSegments.forEach(segment => {
      this.scene.remove(segment.line);
      (segment.line.geometry as THREE.BufferGeometry).dispose();
      (segment.line.material as THREE.Material).dispose();
    });
    this.pathSegments.clear();

    this.totalPathLength = 0;
  }

  addMeasurement(start: TerrainPoint, end: TerrainPoint): Measurement {
    const id = Math.random().toString(36).substr(2, 9);

    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(start.x, start.elevation, start.z),
      new THREE.Vector3(end.x, end.elevation, end.z)
    ]);
    const lineMaterial = new THREE.LineDashedMaterial({
      color: 0xffeb3b,
      linewidth: 3,
      dashSize: 8,
      gapSize: 8,
      transparent: true,
      opacity: 0.7
    });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    line.computeLineDistances();
    this.scene.add(line);

    const dx = end.x - start.x;
    const dz = end.z - start.z;
    const distance = Math.sqrt(dx * dx + dz * dz);

    const label = document.createElement('div');
    label.style.position = 'absolute';
    label.style.backgroundColor = 'rgba(255,255,255,0.9)';
    label.style.borderRadius = '6px';
    label.style.padding = '4px 8px';
    label.style.color = '#222';
    label.style.fontSize = '14px';
    label.style.pointerEvents = 'none';
    label.style.transform = 'translate(-50%, -50%)';
    label.textContent = `${Math.round(distance)}m`;
    this.container.appendChild(label);

    const measurement: Measurement = {
      id,
      startPoint: start,
      endPoint: end,
      line,
      label,
      distance
    };
    this.measurements.set(id, measurement);

    return measurement;
  }

  clearMeasurements(): void {
    this.measurements.forEach(measurement => {
      this.scene.remove(measurement.line);
      (measurement.line.geometry as THREE.BufferGeometry).dispose();
      (measurement.line.material as THREE.Material).dispose();
      measurement.label.remove();
    });
    this.measurements.clear();
  }

  getLastMarker(): Marker | null {
    return this.lastMarker;
  }

  getTotalPathLength(): number {
    return this.totalPathLength;
  }

  exportPathData(): ExportPathData {
    const points = Array.from(this.pathNodes.values()).map(node => ({
      x: node.position.x,
      z: node.position.z,
      elevation: node.position.elevation,
      utmX: node.position.utmX,
      utmY: node.position.utmY
    }));

    return {
      points,
      totalLength: this.totalPathLength
    };
  }

  updateLabels(): void {
    this.measurements.forEach(measurement => {
      const midX = (measurement.startPoint.x + measurement.endPoint.x) / 2;
      const midY = (measurement.startPoint.elevation + measurement.endPoint.elevation) / 2;
      const midZ = (measurement.startPoint.z + measurement.endPoint.z) / 2;

      const vector = new THREE.Vector3(midX, midY + 0.5, midZ);
      vector.project(this.camera);

      const x = (vector.x * 0.5 + 0.5) * this.container.clientWidth;
      const y = (-vector.y * 0.5 + 0.5) * this.container.clientHeight;

      measurement.label.style.left = `${x}px`;
      measurement.label.style.top = `${y}px`;
    });
  }

  raycastPathSegments(raycaster: THREE.Raycaster): PathSegment | null {
    const lines = Array.from(this.pathSegments.values()).map(s => s.line);
    const intersects = raycaster.intersectObjects(lines, false);

    if (intersects.length > 0) {
      const intersectedLine = intersects[0].object as THREE.Line;
      for (const segment of this.pathSegments.values()) {
        if (segment.line === intersectedLine) {
          return segment;
        }
      }
    }

    return null;
  }

  dispose(): void {
    this.markers.forEach(marker => {
      this.scene.remove(marker.mesh);
      (marker.mesh.geometry as THREE.BufferGeometry).dispose();
      (marker.mesh.material as THREE.Material).dispose();
      this.scene.remove(marker.line);
      (marker.line.geometry as THREE.BufferGeometry).dispose();
      (marker.line.material as THREE.Material).dispose();
    });
    this.markers.clear();

    this.clearAllPaths();
    this.clearMeasurements();

    this.lastMarker = null;
  }
}
