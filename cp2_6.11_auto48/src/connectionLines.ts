import * as THREE from 'three';
import type { ClusterData, ConnectionData } from './types';

const MAX_CONNECTIONS = 500;

export class ConnectionLines {
  private scene: THREE.Scene;
  private connections: ConnectionData[] = [];
  private geometry!: THREE.BufferGeometry;
  private material!: THREE.LineBasicMaterial;
  private lines!: THREE.LineSegments;
  private positions!: Float32Array;
  private colors!: Float32Array;

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
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });

    this.lines = new THREE.LineSegments(this.geometry, this.material);
    this.scene.add(this.lines);
  }

  public createFromClusters(clusters: ClusterData[]): ConnectionData[] {
    this.connections = [];
    
    if (clusters.length < 2) {
      this.updateGeometry();
      return [];
    }

    const maxConnections = Math.min(MAX_CONNECTIONS, clusters.length * 2);
    let connectionCount = 0;

    for (let i = 0; i < clusters.length && connectionCount < maxConnections; i++) {
      const clusterA = clusters[i];
      
      for (let j = i + 1; j < clusters.length && connectionCount < maxConnections; j++) {
        const clusterB = clusters[j];
        
        const distance = this.getDistance(clusterA.position, clusterB.position);
        
        const proximityStrength = Math.max(0, 1 - distance / 100);
        const adjacencyStrength = Math.abs(clusterA.index - clusterB.index) <= 2 ? 0.5 : 0;
        const sameEmotionStrength = clusterA.emotion === clusterB.emotion ? 0.2 : 0;
        
        const strength = proximityStrength + adjacencyStrength + sameEmotionStrength;
        
        if (strength > 0.2) {
          const connection: ConnectionData = {
            id: `conn-${i}-${j}`,
            fromClusterId: clusterA.id,
            toClusterId: clusterB.id,
            strength,
            opacity: strength * 0.5,
            targetOpacity: strength * 0.5,
            lineWidth: 1,
            targetLineWidth: 1
          };
          
          this.connections.push(connection);
          connectionCount++;
        }
      }
    }

    this.updateGeometry();
    return this.connections;
  }

  private getDistance(a: { x: number; y: number; z: number }, b: { x: number; y: number; z: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  public update(clusters: ClusterData[], _deltaTime: number): void {
    for (const conn of this.connections) {
      if (Math.abs(conn.opacity - conn.targetOpacity) > 0.01) {
        conn.opacity += (conn.targetOpacity - conn.opacity) * 0.1;
      }
      if (Math.abs(conn.lineWidth - conn.targetLineWidth) > 0.1) {
        conn.lineWidth += (conn.targetLineWidth - conn.lineWidth) * 0.1;
      }
    }

    this.updateGeometryWithClusters(clusters);
  }

  private updateGeometryWithClusters(clusters: ClusterData[]): void {
    const clusterMap = new Map<string, ClusterData>();
    for (const cluster of clusters) {
      clusterMap.set(cluster.id, cluster);
    }

    const count = this.connections.length;
    const maxLines = Math.min(count, MAX_CONNECTIONS);

    for (let i = 0; i < maxLines; i++) {
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

        const r = 200 / 255;
        const g = 200 / 255;
        const b = 255 / 255;
        const opacity = conn.opacity;

        this.colors[i6] = r * opacity;
        this.colors[i6 + 1] = g * opacity;
        this.colors[i6 + 2] = b * opacity;
        this.colors[i6 + 3] = r * opacity;
        this.colors[i6 + 4] = g * opacity;
        this.colors[i6 + 5] = b * opacity;
      }
    }

    this.geometry.setDrawRange(0, maxLines * 2);
    (this.geometry.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geometry.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }

  private updateGeometry(): void {
    // Placeholder - geometry is updated in updateGeometryWithClusters
  }

  public highlightConnection(fromClusterId: string, toClusterId: string, highlight: boolean): void {
    for (const conn of this.connections) {
      if (
        (conn.fromClusterId === fromClusterId && conn.toClusterId === toClusterId) ||
        (conn.fromClusterId === toClusterId && conn.toClusterId === fromClusterId)
      ) {
        if (highlight) {
          conn.targetOpacity = 1;
          conn.targetLineWidth = 3;
        } else {
          conn.targetOpacity = conn.strength * 0.5;
          conn.targetLineWidth = 1;
        }
      }
    }
  }

  public highlightConnectionsForCluster(clusterId: string, highlight: boolean): void {
    for (const conn of this.connections) {
      if (conn.fromClusterId === clusterId || conn.toClusterId === clusterId) {
        if (highlight) {
          conn.targetOpacity = Math.min(1, conn.strength * 1.5);
          conn.targetLineWidth = 2;
        } else {
          conn.targetOpacity = conn.strength * 0.5;
          conn.targetLineWidth = 1;
        }
      }
    }
  }

  public getConnectionsForCluster(clusterId: string): ConnectionData[] {
    return this.connections.filter(
      c => c.fromClusterId === clusterId || c.toClusterId === clusterId
    );
  }

  public getConnections(): ConnectionData[] {
    return this.connections;
  }

  public setConnections(connections: ConnectionData[]): void {
    this.connections = connections;
  }

  public clear(): void {
    this.connections = [];
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
}
