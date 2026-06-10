import * as THREE from 'three';
import type { ClusterData, ConnectionData, Vector3 } from './types';

const MAX_CONNECTIONS = 800;
const SAME_SEGMENT_OPACITY = 0.6;
const ADJACENT_OPACITY = 0.3;
const PROXIMITY_OPACITY = 0.15;

export class ConnectionLines {
  private scene: THREE.Scene;
  private connections: ConnectionData[] = [];
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.LineBasicMaterial;
  private lines!: THREE.LineSegments;
  private positions!: Float32Array;
  private colors!: Float32Array;
  private hoveredConnectionId: string | null = null;
  private hoverStartTime: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.init();
  }

  private init(): void {
    this.geometry = new THREE.BufferGeometry();

    this.positions = new Float32Array(MAX_CONNECTIONS * 2 * 3);
    this.colors = new Float32Array(MAX_CONNECTIONS * 2 * 3);

    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setDrawRange(0, 0);

    this.material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      linewidth: 1
    });

    this.lines = new THREE.LineSegments(this.geometry, this.material);
    this.scene.add(this.lines);
  }

  public createFromClusters(clusters: ClusterData[]): ConnectionData[] {
    this.connections = [];
    this.hoveredConnectionId = null;

    if (clusters.length < 2) {
      this.updateGeometry(clusters);
      return [];
    }

    const sameSegmentConnections: ConnectionData[] = [];
    const adjacentConnections: ConnectionData[] = [];
    const proximityConnections: ConnectionData[] = [];

    const segmentMap = new Map<number, ClusterData[]>();
    for (const cluster of clusters) {
      if (!segmentMap.has(cluster.segmentIndex)) {
        segmentMap.set(cluster.segmentIndex, []);
      }
      segmentMap.get(cluster.segmentIndex)!.push(cluster);
    }

    for (const [, segmentClusters] of segmentMap) {
      for (let i = 0; i < segmentClusters.length; i++) {
        for (let j = i + 1; j < segmentClusters.length; j++) {
          const clusterA = segmentClusters[i];
          const clusterB = segmentClusters[j];
          const distance = this.getDistance(clusterA.position, clusterB.position);
          const strength = Math.max(0.3, 1 - distance / 150);

          const midPoint: Vector3 = {
            x: (clusterA.position.x + clusterB.position.x) / 2,
            y: (clusterA.position.y + clusterB.position.y) / 2,
            z: (clusterA.position.z + clusterB.position.z) / 2
          };

          const baseOpacity = SAME_SEGMENT_OPACITY * strength;

          sameSegmentConnections.push({
            id: `conn-same-${clusterA.id}-${clusterB.id}`,
            fromClusterId: clusterA.id,
            toClusterId: clusterB.id,
            fromWord: clusterA.word,
            toWord: clusterB.word,
            strength,
            connectionType: 'same-segment',
            opacity: baseOpacity,
            targetOpacity: baseOpacity,
            lineWidth: 1,
            targetLineWidth: 1,
            midPoint
          });
        }
      }
    }

    for (let i = 0; i < clusters.length - 1; i++) {
      const clusterA = clusters[i];
      const clusterB = clusters[i + 1];

      if (clusterA.segmentIndex !== clusterB.segmentIndex) {
        const distance = this.getDistance(clusterA.position, clusterB.position);
        const strength = Math.max(0.2, 1 - distance / 120);

        const midPoint: Vector3 = {
          x: (clusterA.position.x + clusterB.position.x) / 2,
          y: (clusterA.position.y + clusterB.position.y) / 2,
          z: (clusterA.position.z + clusterB.position.z) / 2
        };

        const alreadyExists = sameSegmentConnections.some(
          c => (c.fromClusterId === clusterA.id && c.toClusterId === clusterB.id) ||
               (c.fromClusterId === clusterB.id && c.toClusterId === clusterA.id)
        );

        if (!alreadyExists) {
          const baseOpacity = ADJACENT_OPACITY * strength;

          adjacentConnections.push({
            id: `conn-adj-${clusterA.id}-${clusterB.id}`,
            fromClusterId: clusterA.id,
            toClusterId: clusterB.id,
            fromWord: clusterA.word,
            toWord: clusterB.word,
            strength,
            connectionType: 'adjacent',
            opacity: baseOpacity,
            targetOpacity: baseOpacity,
            lineWidth: 1,
            targetLineWidth: 1,
            midPoint
          });
        }
      }
    }

    const maxProximityConnections = Math.min(
      50,
      MAX_CONNECTIONS - sameSegmentConnections.length - adjacentConnections.length
    );
    let proximityCount = 0;

    const sortedByDistance: { a: ClusterData; b: ClusterData; dist: number }[] = [];
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const dist = this.getDistance(clusters[i].position, clusters[j].position);
        sortedByDistance.push({ a: clusters[i], b: clusters[j], dist });
      }
    }
    sortedByDistance.sort((a, b) => a.dist - b.dist);

    for (const pair of sortedByDistance) {
      if (proximityCount >= maxProximityConnections) break;

      const alreadyExists =
        sameSegmentConnections.some(
          c => (c.fromClusterId === pair.a.id && c.toClusterId === pair.b.id) ||
               (c.fromClusterId === pair.b.id && c.toClusterId === pair.a.id)
        ) ||
        adjacentConnections.some(
          c => (c.fromClusterId === pair.a.id && c.toClusterId === pair.b.id) ||
               (c.fromClusterId === pair.b.id && c.toClusterId === pair.a.id)
        );

      if (!alreadyExists && pair.dist < 80) {
        const strength = Math.max(0.1, 1 - pair.dist / 80);

        const midPoint: Vector3 = {
          x: (pair.a.position.x + pair.b.position.x) / 2,
          y: (pair.a.position.y + pair.b.position.y) / 2,
          z: (pair.a.position.z + pair.b.position.z) / 2
        };

        const baseOpacity = PROXIMITY_OPACITY * strength;

        proximityConnections.push({
          id: `conn-prox-${pair.a.id}-${pair.b.id}`,
          fromClusterId: pair.a.id,
          toClusterId: pair.b.id,
          fromWord: pair.a.word,
          toWord: pair.b.word,
          strength,
          connectionType: 'proximity',
          opacity: baseOpacity,
          targetOpacity: baseOpacity,
          lineWidth: 1,
          targetLineWidth: 1,
          midPoint
        });
        proximityCount++;
      }
    }

    this.connections = [
      ...sameSegmentConnections,
      ...adjacentConnections,
      ...proximityConnections
    ].slice(0, MAX_CONNECTIONS);

    this.updateGeometry(clusters);
    return this.connections;
  }

  private getDistance(a: Vector3, b: Vector3): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  public update(clusters: ClusterData[], _deltaTime: number): void {
    const transitionSpeed = 0.12;

    for (const conn of this.connections) {
      if (Math.abs(conn.opacity - conn.targetOpacity) > 0.005) {
        conn.opacity += (conn.targetOpacity - conn.opacity) * transitionSpeed;
      }
      if (Math.abs(conn.lineWidth - conn.targetLineWidth) > 0.05) {
        conn.lineWidth += (conn.targetLineWidth - conn.lineWidth) * transitionSpeed;
      }

      const fromCluster = clusters.find(c => c.id === conn.fromClusterId);
      const toCluster = clusters.find(c => c.id === conn.toClusterId);
      if (fromCluster && toCluster) {
        conn.midPoint = {
          x: (fromCluster.position.x + toCluster.position.x) / 2,
          y: (fromCluster.position.y + toCluster.position.y) / 2,
          z: (fromCluster.position.z + toCluster.position.z) / 2
        };
      }
    }

    this.updateGeometry(clusters);
  }

  private updateGeometry(clusters: ClusterData[]): void {
    const clusterMap = new Map<string, ClusterData>();
    for (const cluster of clusters) {
      clusterMap.set(cluster.id, cluster);
    }

    const count = Math.min(this.connections.length, MAX_CONNECTIONS);

    for (let i = 0; i < count; i++) {
      const conn = this.connections[i];
      const fromCluster = clusterMap.get(conn.fromClusterId);
      const toCluster = clusterMap.get(conn.toClusterId);

      if (fromCluster && toCluster) {
        const i6 = i * 6;

        this.positions[i6] = fromCluster.position.x;
        this.positions[i6 + 1] = fromCluster.position.y;
        this.positions[i6 + 2] = fromCluster.position.z;

        this.positions[i6 + 3] = toCluster.position.x;
        this.positions[i6 + 4] = toCluster.position.y;
        this.positions[i6 + 5] = toCluster.position.z;

        const baseColor = this.getConnectionColor(conn);
        const opacity = conn.opacity;

        this.colors[i6] = baseColor.r * opacity;
        this.colors[i6 + 1] = baseColor.g * opacity;
        this.colors[i6 + 2] = baseColor.b * opacity;
        this.colors[i6 + 3] = baseColor.r * opacity;
        this.colors[i6 + 4] = baseColor.g * opacity;
        this.colors[i6 + 5] = baseColor.b * opacity;
      }
    }

    this.geometry.setDrawRange(0, count * 2);
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  private getConnectionColor(conn: ConnectionData): { r: number; g: number; b: number } {
    switch (conn.connectionType) {
      case 'same-segment':
        return { r: 200 / 255, g: 210 / 255, b: 255 / 255 };
      case 'adjacent':
        return { r: 170 / 255, g: 190 / 255, b: 240 / 255 };
      case 'proximity':
      default:
        return { r: 140 / 255, g: 160 / 255, b: 220 / 255 };
    }
  }

  public highlightConnection(fromClusterId: string, toClusterId: string, highlight: boolean): void {
    for (const conn of this.connections) {
      if (
        (conn.fromClusterId === fromClusterId && conn.toClusterId === toClusterId) ||
        (conn.fromClusterId === toClusterId && conn.toClusterId === fromClusterId)
      ) {
        if (highlight) {
          conn.targetOpacity = Math.min(1, conn.strength * 2);
          conn.targetLineWidth = 3;
          this.hoveredConnectionId = conn.id;
          this.hoverStartTime = performance.now();
        } else {
          this.resetConnectionOpacity(conn);
          if (this.hoveredConnectionId === conn.id) {
            this.hoveredConnectionId = null;
          }
        }
      }
    }
  }

  public highlightConnectionsForCluster(clusterId: string, highlight: boolean): void {
    for (const conn of this.connections) {
      if (conn.fromClusterId === clusterId || conn.toClusterId === clusterId) {
        if (highlight) {
          conn.targetOpacity = Math.min(1, conn.strength * 1.8);
          conn.targetLineWidth = 2;
        } else {
          this.resetConnectionOpacity(conn);
        }
      }
    }
  }

  private resetConnectionOpacity(conn: ConnectionData): void {
    switch (conn.connectionType) {
      case 'same-segment':
        conn.targetOpacity = SAME_SEGMENT_OPACITY * conn.strength;
        break;
      case 'adjacent':
        conn.targetOpacity = ADJACENT_OPACITY * conn.strength;
        break;
      case 'proximity':
      default:
        conn.targetOpacity = PROXIMITY_OPACITY * conn.strength;
        break;
    }
    conn.targetLineWidth = 1;
  }

  public getConnectionsForCluster(clusterId: string): ConnectionData[] {
    return this.connections.filter(
      c => c.fromClusterId === clusterId || c.toClusterId === clusterId
    );
  }

  public getConnectionAtScreenPosition(
    screenX: number,
    screenY: number,
    camera: THREE.Camera,
    containerWidth: number,
    containerHeight: number
  ): ConnectionData | null {
    let closestConnection: ConnectionData | null = null;
    let closestDistance = 15;

    for (const conn of this.connections) {
      if (conn.opacity < 0.1) continue;

      const midPoint = conn.midPoint;
      const screenPos = this.worldToScreen(midPoint, camera, containerWidth, containerHeight);

      if (screenPos) {
        const dx = screenPos.x - screenX;
        const dy = screenPos.y - screenY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < closestDistance) {
          closestDistance = dist;
          closestConnection = conn;
        }
      }
    }

    return closestConnection;
  }

  private worldToScreen(
    point: Vector3,
    camera: THREE.Camera,
    width: number,
    height: number
  ): { x: number; y: number } | null {
    const vector = new THREE.Vector3(point.x, point.y, point.z);
    vector.project(camera);

    if (vector.z > 1 || vector.z < -1) return null;

    return {
      x: (vector.x + 1) / 2 * width,
      y: (-vector.y + 1) / 2 * height
    };
  }

  public getConnectionMidpointScreenPosition(
    conn: ConnectionData,
    camera: THREE.Camera,
    containerWidth: number,
    containerHeight: number
  ): { x: number; y: number } | null {
    return this.worldToScreen(conn.midPoint, camera, containerWidth, containerHeight);
  }

  public getConnections(): ConnectionData[] {
    return this.connections;
  }

  public setConnections(connections: ConnectionData[]): void {
    this.connections = connections;
  }

  public clear(): void {
    this.connections = [];
    this.hoveredConnectionId = null;
    this.geometry.setDrawRange(0, 0);
  }

  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.scene.remove(this.lines);
  }

  public getLines(): THREE.LineSegments {
    return this.lines;
  }

  public getHoveredConnectionId(): string | null {
    return this.hoveredConnectionId;
  }

  public getHoveredConnection(): ConnectionData | null {
    if (!this.hoveredConnectionId) return null;
    return this.connections.find(c => c.id === this.hoveredConnectionId) || null;
  }
}
