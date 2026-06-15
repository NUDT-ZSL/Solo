import * as THREE from 'three';

export interface FiberData {
  curve: THREE.CatmullRomCurve3;
  mesh: THREE.Mesh;
  glowMesh: THREE.Mesh;
  baseColor: THREE.Color;
  tipColor: THREE.Color;
  flowOffset: number;
  pulseIntensity: number;
  pulseDecay: number;
  neighbors: number[];
  bendOffset: THREE.Vector3;
  bendDecay: number;
}

export class TreeFiber {
  fibers: FiberData[] = [];
  group: THREE.Group;
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    scene.add(this.group);
    this.generateTree();
  }

  private generateTree() {
    const trunkCount = 5;
    for (let i = 0; i < trunkCount; i++) {
      this.generateTrunkFiber(i, trunkCount);
    }
    const branchCount = 35;
    for (let i = 0; i < branchCount; i++) {
      this.generateBranchFiber(i, branchCount);
    }
    const twigCount = 60;
    for (let i = 0; i < twigCount; i++) {
      this.generateTwigFiber(i, twigCount);
    }
    this.computeNeighbors();
  }

  private generateTrunkFiber(index: number, total: number) {
    const angle = (index / total) * Math.PI * 2;
    const points: THREE.Vector3[] = [];
    const segments = 20;
    const height = 12 + Math.random() * 3;

    for (let j = 0; j <= segments; j++) {
      const t = j / segments;
      const y = t * height;
      const spiralAngle = angle + t * Math.PI * 3;
      const radius = 0.4 + Math.sin(t * Math.PI) * 0.3;
      const x = Math.cos(spiralAngle) * radius;
      const z = Math.sin(spiralAngle) * radius;
      points.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const fiber = this.createFiberFromCurve(curve, 0.06, 0.03);
    fiber.neighbors = [];
    this.fibers.push(fiber);
    this.group.add(fiber.mesh);
    this.group.add(fiber.glowMesh);
  }

  private generateBranchFiber(index: number, total: number) {
    const startHeight = 3 + Math.random() * 6;
    const startAngle = Math.random() * Math.PI * 2;
    const startRadius = 0.5 + Math.random() * 0.5;
    const points: THREE.Vector3[] = [];
    const segments = 15;
    const length = 3 + Math.random() * 4;

    const startX = Math.cos(startAngle) * startRadius;
    const startZ = Math.sin(startAngle) * startRadius;
    points.push(new THREE.Vector3(startX, startHeight, startZ));

    const outAngle = startAngle + (Math.random() - 0.5) * 1.5;
    const upAngle = Math.random() * 0.6 + 0.2;

    for (let j = 1; j <= segments; j++) {
      const t = j / segments;
      const dist = t * length;
      const droop = t * t * 0.8;
      const x = startX + Math.cos(outAngle) * dist * 0.6;
      const y = startHeight + dist * upAngle - droop;
      const z = startZ + Math.sin(outAngle) * dist * 0.6;
      points.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const fiber = this.createFiberFromCurve(curve, 0.035, 0.02);
    fiber.neighbors = [];
    this.fibers.push(fiber);
    this.group.add(fiber.mesh);
    this.group.add(fiber.glowMesh);
  }

  private generateTwigFiber(index: number, total: number) {
    const startHeight = 5 + Math.random() * 8;
    const startAngle = Math.random() * Math.PI * 2;
    const startDist = 1.5 + Math.random() * 2.5;
    const points: THREE.Vector3[] = [];
    const segments = 10;
    const length = 1 + Math.random() * 2.5;

    const startX = Math.cos(startAngle) * startDist;
    const startZ = Math.sin(startAngle) * startDist;
    points.push(new THREE.Vector3(startX, startHeight, startZ));

    const outAngle = startAngle + (Math.random() - 0.5) * 2;
    const upAngle = Math.random() * 0.4 - 0.1;

    for (let j = 1; j <= segments; j++) {
      const t = j / segments;
      const dist = t * length;
      const droop = t * t * 1.2;
      const wiggle = Math.sin(t * Math.PI * 2) * 0.15;
      const x = startX + Math.cos(outAngle) * dist * 0.5 + wiggle;
      const y = startHeight + dist * upAngle - droop;
      const z = startZ + Math.sin(outAngle) * dist * 0.5 + wiggle;
      points.push(new THREE.Vector3(x, y, z));
    }

    const curve = new THREE.CatmullRomCurve3(points);
    const fiber = this.createFiberFromCurve(curve, 0.02, 0.012);
    fiber.neighbors = [];
    this.fibers.push(fiber);
    this.group.add(fiber.mesh);
    this.group.add(fiber.glowMesh);
  }

  private createFiberFromCurve(
    curve: THREE.CatmullRomCurve3,
    tubeRadius: number,
    glowRadius: number
  ): FiberData {
    const tubeGeo = new THREE.TubeGeometry(curve, 40, tubeRadius, 8, false);
    const startT = 0;
    const endT = 1;
    const startPt = curve.getPoint(startT);
    const endPt = curve.getPoint(endT);
    const maxH = 14;

    const baseColor = new THREE.Color().setHSL(0.1, 0.9, 0.55);
    const tipColor = new THREE.Color().setHSL(0.6, 0.85, 0.6);

    const colors = new Float32Array(tubeGeo.attributes.position.count * 3);
    for (let i = 0; i < tubeGeo.attributes.position.count; i++) {
      const y = tubeGeo.attributes.position.getY(i);
      const t = THREE.MathUtils.clamp(y / maxH, 0, 1);
      const c = baseColor.clone().lerp(tipColor, t);
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }
    tubeGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const tubeMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.75,
    });

    const mesh = new THREE.Mesh(tubeGeo, tubeMat);

    const glowGeo = new THREE.TubeGeometry(curve, 40, glowRadius, 8, false);
    const glowColors = new Float32Array(glowGeo.attributes.position.count * 3);
    for (let i = 0; i < glowGeo.attributes.position.count; i++) {
      const y = glowGeo.attributes.position.getY(i);
      const t = THREE.MathUtils.clamp(y / maxH, 0, 1);
      const c = baseColor.clone().lerp(tipColor, t);
      glowColors[i * 3] = c.r;
      glowColors[i * 3 + 1] = c.g;
      glowColors[i * 3 + 2] = c.b;
    }
    glowGeo.setAttribute('color', new THREE.BufferAttribute(glowColors, 3));

    const glowMat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.15,
      side: THREE.BackSide,
      depthWrite: false,
    });

    const glowMesh = new THREE.Mesh(glowGeo, glowMat);

    return {
      curve,
      mesh,
      glowMesh,
      baseColor,
      tipColor,
      flowOffset: Math.random() * 100,
      pulseIntensity: 0,
      pulseDecay: 0.95,
      neighbors: [],
      bendOffset: new THREE.Vector3(),
      bendDecay: 0,
    };
  }

  private computeNeighbors() {
    const midpoints = this.fibers.map((f) => f.curve.getPoint(0.5));
    const maxDist = 3.5;
    for (let i = 0; i < this.fibers.length; i++) {
      for (let j = i + 1; j < this.fibers.length; j++) {
        const d = midpoints[i].distanceTo(midpoints[j]);
        if (d < maxDist) {
          this.fibers[i].neighbors.push(j);
          this.fibers[j].neighbors.push(i);
        }
      }
    }
  }

  pulseFiber(index: number) {
    if (index < 0 || index >= this.fibers.length) return;
    const fiber = this.fibers[index];
    fiber.pulseIntensity = 1.0;
    for (const ni of fiber.neighbors) {
      this.fibers[ni].pulseIntensity = 0.6;
    }
  }

  shockwave(center: THREE.Vector3, radius: number) {
    for (const fiber of this.fibers) {
      const mid = fiber.curve.getPoint(0.5);
      const dist = mid.distanceTo(center);
      if (dist < radius) {
        const dir = mid.clone().sub(center).normalize();
        const strength = (1 - dist / radius) * 0.8;
        fiber.bendOffset.copy(dir.multiplyScalar(strength));
        fiber.bendDecay = 1.0;
      }
    }
  }

  update(time: number, flowSpeed: number, showConnections: boolean) {
    for (let i = 0; i < this.fibers.length; i++) {
      const fiber = this.fibers[i];
      if (fiber.pulseIntensity > 0.01) {
        fiber.pulseIntensity *= fiber.pulseDecay;
        const mat = fiber.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.75 + fiber.pulseIntensity * 0.25;
        const glowMat = fiber.glowMesh.material as THREE.MeshBasicMaterial;
        glowMat.opacity = 0.15 + fiber.pulseIntensity * 0.5;
      } else {
        const mat = fiber.mesh.material as THREE.MeshBasicMaterial;
        mat.opacity = 0.75;
        const glowMat = fiber.glowMesh.material as THREE.MeshBasicMaterial;
        glowMat.opacity = 0.15;
      }

      if (fiber.bendDecay > 0.01) {
        fiber.bendDecay *= 0.96;
        fiber.mesh.position.copy(fiber.bendOffset.clone().multiplyScalar(fiber.bendDecay));
        fiber.glowMesh.position.copy(fiber.mesh.position);
      } else {
        fiber.mesh.position.set(0, 0, 0);
        fiber.glowMesh.position.set(0, 0, 0);
        fiber.bendDecay = 0;
      }
    }
  }

  getFiberMidpoints(): THREE.Vector3[] {
    return this.fibers.map((f) => f.curve.getPoint(0.5));
  }
}
