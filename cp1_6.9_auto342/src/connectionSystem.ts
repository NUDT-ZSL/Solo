import * as THREE from 'three';
import { BubbleSystem } from './bubbleSystem';

const CONNECTION_DISTANCE = 50;
const MIN_OPACITY = 0.05;
const MAX_OPACITY = 0.3;
const FADE_OUT_DURATION = 2;
const LIGHT_POINT_SPEED = 0.3;
const LINE_WIDTH = 0.5;
const FOCUS_LINE_WIDTH = 2;
const FOCUS_OPACITY = 0.8;
const NON_FOCUS_OPACITY = 0.2;
const GRID_CELL_SIZE = CONNECTION_DISTANCE;

interface Connection {
  id: string;
  bubbleA: number;
  bubbleB: number;
  opacity: number;
  targetOpacity: number;
  fadeState: 'active' | 'fadingOut';
  fadeTimer: number;
  isFocused: boolean;
}

interface LightPoint {
  connectionId: string;
  progress: number;
  direction: 1 | -1;
  mesh: THREE.Mesh;
}

export class ConnectionSystem {
  public group: THREE.Group = new THREE.Group();
  private connections: Map<string, Connection> = new Map();
  private lightPoints: LightPoint[] = [];
  private lineSegments: THREE.LineSegments;
  private lineGeometry: THREE.BufferGeometry;
  private lineMaterial: THREE.LineBasicMaterial;
  private lightPointMesh: THREE.InstancedMesh;
  private lightPointDummy: THREE.Object3D = new THREE.Object3D();
  private gridMap: Map<string, number[]> = new Map();
  private bubbleSystem: BubbleSystem;
  private maxConnections: number;
  private maxLightPoints: number;

  private positionAttr: THREE.BufferAttribute;
  private colorAttr: THREE.BufferAttribute;

  constructor(bubbleSystem: BubbleSystem, estimatedConnections = 3000, estimatedLightPoints = 1500) {
    this.bubbleSystem = bubbleSystem;
    this.maxConnections = estimatedConnections;
    this.maxLightPoints = estimatedLightPoints;

    this.lineGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.maxConnections * 2 * 3);
    const colors = new Float32Array(this.maxConnections * 2 * 3);
    this.positionAttr = new THREE.BufferAttribute(positions, 3);
    this.colorAttr = new THREE.BufferAttribute(colors, 3);
    this.lineGeometry.setAttribute('position', this.positionAttr);
    this.lineGeometry.setAttribute('color', this.colorAttr);

    this.lineMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      linewidth: LINE_WIDTH
    });

    this.lineSegments = new THREE.LineSegments(this.lineGeometry, this.lineMaterial);
    this.group.add(this.lineSegments);

    const lightPointGeo = new THREE.SphereGeometry(0.5, 8, 6);
    const lightPointMat = new THREE.MeshBasicMaterial({
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      opacity: 0.9
    });
    this.lightPointMesh = new THREE.InstancedMesh(lightPointGeo, lightPointMat, this.maxLightPoints);
    this.lightPointMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.lightPointMesh.count = 0;
    this.group.add(this.lightPointMesh);

    this.buildGrid();
  }

  private buildGrid(): void {
    this.gridMap.clear();
    for (const b of this.bubbleSystem.bubbles) {
      const key = this.getGridKey(b.position);
      if (!this.gridMap.has(key)) {
        this.gridMap.set(key, []);
      }
      this.gridMap.get(key)!.push(b.id);
    }
  }

  private getGridKey(pos: THREE.Vector3): string {
    const gx = Math.floor(pos.x / GRID_CELL_SIZE);
    const gy = Math.floor(pos.y / GRID_CELL_SIZE);
    const gz = Math.floor(pos.z / GRID_CELL_SIZE);
    return `${gx},${gy},${gz}`;
  }

  private getNeighborKeys(pos: THREE.Vector3): string[] {
    const keys: string[] = [];
    const gx = Math.floor(pos.x / GRID_CELL_SIZE);
    const gy = Math.floor(pos.y / GRID_CELL_SIZE);
    const gz = Math.floor(pos.z / GRID_CELL_SIZE);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          keys.push(`${gx + dx},${gy + dy},${gz + dz}`);
        }
      }
    }
    return keys;
  }

  private connectionId(a: number, b: number): string {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
  }

  private updateConnections(): void {
    const positions = this.bubbleSystem.getBubblePositions();
    const colors = this.bubbleSystem.getBubbleColors();
    const bubbles = this.bubbleSystem.bubbles;

    this.buildGrid();

    const newConnectionIds = new Set<string>();

    for (const bubble of bubbles) {
      const neighborKeys = this.getNeighborKeys(bubble.position);
      for (const key of neighborKeys) {
        const neighborBubbles = this.gridMap.get(key);
        if (!neighborBubbles) continue;

        for (const neighborId of neighborBubbles) {
          if (neighborId <= bubble.id) continue;

          const neighbor = bubbles[neighborId];
          const dx = bubble.position.x - neighbor.position.x;
          const dy = bubble.position.y - neighbor.position.y;
          const dz = bubble.position.z - neighbor.position.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < CONNECTION_DISTANCE) {
            const id = this.connectionId(bubble.id, neighborId);
            newConnectionIds.add(id);

            if (!this.connections.has(id)) {
              this.connections.set(id, {
                id,
                bubbleA: Math.min(bubble.id, neighborId),
                bubbleB: Math.max(bubble.id, neighborId),
                opacity: 0,
                targetOpacity: this.calcOpacityByDistance(dist),
                fadeState: 'active',
                fadeTimer: 0,
                isFocused: false
              });
            } else {
              const conn = this.connections.get(id)!;
              if (conn.fadeState === 'fadingOut') {
                conn.fadeState = 'active';
                conn.fadeTimer = 0;
              }
              conn.targetOpacity = this.calcOpacityByDistance(dist);
            }
          }
        }
      }
    }

    for (const [id, conn] of this.connections) {
      if (!newConnectionIds.has(id) && conn.fadeState === 'active') {
        conn.fadeState = 'fadingOut';
        conn.fadeTimer = FADE_OUT_DURATION;
      }
    }
  }

  private calcOpacityByDistance(dist: number): number {
    const t = dist / CONNECTION_DISTANCE;
    return MAX_OPACITY - t * (MAX_OPACITY - MIN_OPACITY);
  }

  private updateLineGeometry(): void {
    const bubbles = this.bubbleSystem.bubbles;
    let lineIndex = 0;
    const positions = this.positionAttr.array as Float32Array;
    const colors = this.colorAttr.array as Float32Array;

    for (const [, conn] of this.connections) {
      if (lineIndex >= this.maxConnections) break;

      const a = bubbles[conn.bubbleA];
      const b = bubbles[conn.bubbleB];

      let opacity = conn.opacity;
      let lineWidthMul = 1;

      if (conn.isFocused) {
        opacity = FOCUS_OPACITY;
        lineWidthMul = FOCUS_LINE_WIDTH / LINE_WIDTH;
      }

      if (opacity < 0.01) continue;

      const posIdx = lineIndex * 6;
      positions[posIdx] = a.position.x;
      positions[posIdx + 1] = a.position.y;
      positions[posIdx + 2] = a.position.z;
      positions[posIdx + 3] = b.position.x;
      positions[posIdx + 4] = b.position.y;
      positions[posIdx + 5] = b.position.z;

      const colIdx = lineIndex * 6;
      colors[colIdx] = a.color.r * opacity;
      colors[colIdx + 1] = a.color.g * opacity;
      colors[colIdx + 2] = a.color.b * opacity;
      colors[colIdx + 3] = b.color.r * opacity;
      colors[colIdx + 4] = b.color.g * opacity;
      colors[colIdx + 5] = b.color.b * opacity;

      lineIndex++;
    }

    this.positionAttr.needsUpdate = true;
    this.colorAttr.needsUpdate = true;
    this.lineGeometry.setDrawRange(0, lineIndex * 2);
  }

  private updateLightPoints(deltaTime: number): void {
    const bubbles = this.bubbleSystem.bubbles;
    const activeConnections = Array.from(this.connections.values()).filter(c => c.opacity > 0.05);

    while (this.lightPoints.length < this.maxLightPoints && activeConnections.length > 0) {
      const conn = activeConnections[Math.floor(Math.random() * activeConnections.length)];
      const direction: 1 | -1 = Math.random() > 0.5 ? 1 : -1;
      this.lightPoints.push({
        connectionId: conn.id,
        progress: Math.random(),
        direction,
        mesh: this.lightPointMesh as unknown as THREE.Mesh
      });
    }

    for (let i = this.lightPoints.length - 1; i >= 0; i--) {
      const lp = this.lightPoints[i];
      const conn = this.connections.get(lp.connectionId);

      if (!conn || conn.opacity < 0.02) {
        this.lightPoints.splice(i, 1);
        continue;
      }

      const a = bubbles[conn.bubbleA];
      const b = bubbles[conn.bubbleB];
      const dist = a.position.distanceTo(b.position);
      const deltaProgress = (LIGHT_POINT_SPEED * deltaTime) / Math.max(dist, 1);

      lp.progress += deltaProgress * lp.direction;

      if (lp.progress < 0 || lp.progress > 1) {
        if (activeConnections.length > 0) {
          const newConn = activeConnections[Math.floor(Math.random() * activeConnections.length)];
          lp.connectionId = newConn.id;
          lp.direction = Math.random() > 0.5 ? 1 : -1;
          lp.progress = lp.direction === 1 ? 0 : 1;
        } else {
          this.lightPoints.splice(i, 1);
        }
      }
    }

    this.lightPointMesh.count = Math.min(this.lightPoints.length, this.maxLightPoints);

    for (let i = 0; i < this.lightPointMesh.count; i++) {
      const lp = this.lightPoints[i];
      const conn = this.connections.get(lp.connectionId)!;
      const a = bubbles[conn.bubbleA];
      const b = bubbles[conn.bubbleB];

      this.lightPointDummy.position.lerpVectors(a.position, b.position, lp.progress);

      let opacity = Math.min(conn.opacity * 3, 1);
      if (conn.isFocused) opacity = FOCUS_OPACITY;

      this.lightPointDummy.scale.setScalar(1 + (conn.isFocused ? 1 : 0));
      this.lightPointDummy.updateMatrix();
      this.lightPointMesh.setMatrixAt(i, this.lightPointDummy.matrix);

      const color = a.color.clone().lerp(b.color, lp.progress);
      this.lightPointMesh.setColorAt(i, color.multiplyScalar(opacity));
    }

    this.lightPointMesh.instanceMatrix.needsUpdate = true;
    if (this.lightPointMesh.instanceColor) {
      this.lightPointMesh.instanceColor.needsUpdate = true;
    }
  }

  public setFocusConnections(focusedBubbleId: number | null): void {
    const connectedIds = new Set<number>();

    for (const conn of this.connections.values()) {
      conn.isFocused = false;
    }

    if (focusedBubbleId !== null) {
      for (const [, conn] of this.connections) {
        if (conn.bubbleA === focusedBubbleId || conn.bubbleB === focusedBubbleId) {
          conn.isFocused = true;
          connectedIds.add(conn.bubbleA);
          connectedIds.add(conn.bubbleB);
        }
      }

      for (const [, conn] of this.connections) {
        if (!conn.isFocused) {
          conn.targetOpacity = Math.min(conn.targetOpacity, NON_FOCUS_OPACITY);
        }
      }
    }

    this.bubbleSystem.setFocusedBubbles(connectedIds);
  }

  public clearFocus(): void {
    this.bubbleSystem.clearFocus();
    const bubbles = this.bubbleSystem.bubbles;
    for (const [, conn] of this.connections) {
      conn.isFocused = false;
      const a = bubbles[conn.bubbleA];
      const b = bubbles[conn.bubbleB];
      const dist = a.position.distanceTo(b.position);
      conn.targetOpacity = this.calcOpacityByDistance(dist);
    }
  }

  public update(deltaTime: number): void {
    this.updateConnections();

    for (const [id, conn] of this.connections) {
      if (conn.fadeState === 'fadingOut') {
        conn.fadeTimer -= deltaTime;
        if (conn.fadeTimer <= 0) {
          this.connections.delete(id);
          continue;
        }
        const fadeProgress = 1 - (conn.fadeTimer / FADE_OUT_DURATION);
        conn.opacity = conn.targetOpacity * (1 - fadeProgress);
      } else {
        const lerpFactor = 1 - Math.exp(-deltaTime * 4);
        conn.opacity += (conn.targetOpacity - conn.opacity) * lerpFactor;
      }
    }

    this.updateLineGeometry();
    this.updateLightPoints(deltaTime);
  }

  public getConnectedBubbleIds(bubbleId: number): number[] {
    const ids: number[] = [bubbleId];
    for (const [, conn] of this.connections) {
      if (conn.bubbleA === bubbleId) ids.push(conn.bubbleB);
      else if (conn.bubbleB === bubbleId) ids.push(conn.bubbleA);
    }
    return ids;
  }
}
