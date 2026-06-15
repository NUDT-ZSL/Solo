import * as THREE from 'three';
import { CrystalData } from './CrystalSystem';

interface LineConnection {
  line: THREE.Line;
  material: THREE.LineBasicMaterial;
  pulsePhase: number;
  pulseDuration: number;
  boostTime: number;
  fromId: number;
  toId: number;
}

interface RippleEffect {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  life: number;
  maxLife: number;
  origin: THREE.Vector3;
  color: THREE.Color;
}

export class NetworkSystem {
  private scene: THREE.Scene;
  private connections: Map<string, LineConnection> = new Map();
  private connectionDistance: number;
  private ripples: RippleEffect[] = [];
  private lineGeometryCache: Map<number, THREE.BufferGeometry> = new Map();
  private baseOpacity: number = 0.5;
  private minLineWidth: number = 0.5;
  private maxLineWidth: number = 2.0;

  constructor(scene: THREE.Scene, connectionDistance: number = 2.5) {
    this.scene = scene;
    this.connectionDistance = connectionDistance;
  }

  private connectionKey(a: number, b: number): string {
    return a < b ? `${a}-${b}` : `${b}-${a}`;
  }

  public update(crystals: CrystalData[], deltaTime: number, elapsedTime: number): void {
    const activeConnections: Set<string> = new Set();
    const crystalCount = crystals.length;

    for (let i = 0; i < crystalCount; i++) {
      const crystalA = crystals[i];
      for (let j = i + 1; j < crystalCount; j++) {
        const crystalB = crystals[j];
        const distance = crystalA.position.distanceTo(crystalB.position);

        if (distance < this.connectionDistance) {
          const key = this.connectionKey(crystalA.id, crystalB.id);
          activeConnections.add(key);

          if (!this.connections.has(key)) {
            this.createConnection(crystalA, crystalB, distance);
          }

          this.updateConnection(key, crystalA, crystalB, distance, elapsedTime, deltaTime);
        }
      }
    }

    for (const [key, connection] of this.connections) {
      if (!activeConnections.has(key)) {
        this.removeConnection(key, connection);
      }
    }

    this.updateRipples(deltaTime);
  }

  private createConnection(a: CrystalData, b: CrystalData, distance: number): void {
    const key = this.connectionKey(a.id, b.id);

    const mixedColor = a.color.clone().lerp(b.color, 0.5);
    const brightness = 1.2;
    mixedColor.multiplyScalar(brightness);
    mixedColor.r = Math.min(mixedColor.r, 1);
    mixedColor.g = Math.min(mixedColor.g, 1);
    mixedColor.b = Math.min(mixedColor.b, 1);

    const positions = new Float32Array([
      a.position.x, a.position.y, a.position.z,
      b.position.x, b.position.y, b.position.z
    ]);
    const colors = new Float32Array([
      a.color.r, a.color.g, a.color.b,
      0, 0, 0
    ]);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: this.baseOpacity,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });

    const line = new THREE.Line(geometry, material);
    line.frustumCulled = false;
    this.scene.add(line);

    const connection: LineConnection = {
      line,
      material,
      pulsePhase: Math.random() * Math.PI * 2,
      pulseDuration: 1.5 + Math.random() * 1.0,
      boostTime: 0,
      fromId: a.id,
      toId: b.id
    };

    this.connections.set(key, connection);
  }

  private updateConnection(
    key: string,
    a: CrystalData,
    b: CrystalData,
    distance: number,
    elapsedTime: number,
    deltaTime: number
  ): void {
    const connection = this.connections.get(key);
    if (!connection) return;

    const geometry = connection.line.geometry;
    const positionAttr = geometry.getAttribute('position') as THREE.BufferAttribute;
    const positions = positionAttr.array as Float32Array;

    positions[0] = a.position.x;
    positions[1] = a.position.y;
    positions[2] = a.position.z;
    positions[3] = b.position.x;
    positions[4] = b.position.y;
    positions[5] = b.position.z;
    positionAttr.needsUpdate = true;

    const colorAttr = geometry.getAttribute('color') as THREE.BufferAttribute;
    const colors = colorAttr.array as Float32Array;
    const pulse = (Math.sin(elapsedTime * (Math.PI * 2 / connection.pulseDuration) + connection.pulsePhase) + 1) / 2;

    const distanceFactor = 1 - (distance / this.connectionDistance);
    let lineOpacity = this.baseOpacity * (0.5 + pulse * 0.5) * (0.4 + distanceFactor * 0.6);

    if (connection.boostTime > 0) {
      connection.boostTime -= deltaTime;
      const boost = Math.max(0, connection.boostTime / 2);
      lineOpacity = Math.min(1.0, lineOpacity + boost * 0.5);
    }

    connection.material.opacity = lineOpacity;

    const fadeColor = new THREE.Color().setHSL(
      (a.color.getHSL({ h: 0, s: 0, l: 0 }).h + b.color.getHSL({ h: 0, s: 0, l: 0 }).h) / 2,
      (a.color.getHSL({ h: 0, s: 0, l: 0 }).s + b.color.getHSL({ h: 0, s: 0, l: 0 }).s) / 2,
      0
    );

    const pulseColorA = a.color.clone().multiplyScalar(0.8 + pulse * 0.4);
    const pulseColorB = fadeColor;

    colors[0] = pulseColorA.r;
    colors[1] = pulseColorA.g;
    colors[2] = pulseColorA.b;
    colors[3] = pulseColorB.r;
    colors[4] = pulseColorB.g;
    colors[5] = pulseColorB.b;
    colorAttr.needsUpdate = true;

    const lineWidthScale = this.minLineWidth + (this.maxLineWidth - this.minLineWidth) * distanceFactor;
    (connection.material as any).linewidth = lineWidthScale;
  }

  private removeConnection(key: string, connection: LineConnection): void {
    this.scene.remove(connection.line);
    connection.line.geometry.dispose();
    connection.material.dispose();
    this.connections.delete(key);
  }

  public createRipple(origin: THREE.Vector3, baseColor: THREE.Color): void {
    const rippleColor = baseColor.clone().offsetHSL(
      (Math.random() - 0.5) * 0.1,
      0.2,
      0.1
    );

    const geometry = new THREE.RingGeometry(0.1, 0.15, 64);
    const material = new THREE.MeshBasicMaterial({
      color: rippleColor,
      transparent: true,
      opacity: 0.9,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(origin);
    mesh.lookAt(new THREE.Vector3(0, 0, 0));
    this.scene.add(mesh);

    this.ripples.push({
      mesh,
      material,
      life: 0.5,
      maxLife: 0.5,
      origin: origin.clone(),
      color: rippleColor
    });
  }

  private updateRipples(deltaTime: number): void {
    const maxRadius = 3;

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      ripple.life -= deltaTime;

      if (ripple.life <= 0) {
        this.scene.remove(ripple.mesh);
        ripple.mesh.geometry.dispose();
        ripple.material.dispose();
        this.ripples.splice(i, 1);
      } else {
        const t = 1 - (ripple.life / ripple.maxLife);
        const eased = this.easeOutCubic(t);

        const currentRadius = 0.1 + eased * maxRadius;
        const innerRadius = Math.max(0.01, currentRadius * 0.7);
        const outerRadius = currentRadius;

        ripple.mesh.geometry.dispose();
        ripple.mesh.geometry = new THREE.RingGeometry(innerRadius, outerRadius, 64);
        ripple.mesh.lookAt(new THREE.Vector3(0, 0, 0));

        ripple.material.opacity = (1 - t) * 0.9;
        ripple.material.color.copy(ripple.color).multiplyScalar(1 + t * 0.3);
      }
    }
  }

  public boostConnectionsForCrystal(crystalId: number): void {
    for (const [key, connection] of this.connections) {
      if (connection.fromId === crystalId || connection.toId === crystalId) {
        connection.boostTime = 2;
      }
    }
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  public setConnectionDistance(distance: number): void {
    this.connectionDistance = distance;
  }

  public getConnectionDistance(): number {
    return this.connectionDistance;
  }

  public dispose(): void {
    for (const [key, connection] of this.connections) {
      this.scene.remove(connection.line);
      connection.line.geometry.dispose();
      connection.material.dispose();
    }
    this.connections.clear();

    for (const ripple of this.ripples) {
      this.scene.remove(ripple.mesh);
      ripple.mesh.geometry.dispose();
      ripple.material.dispose();
    }
    this.ripples = [];

    this.lineGeometryCache.forEach(g => g.dispose());
    this.lineGeometryCache.clear();
  }
}
