import * as THREE from 'three';

export interface NodeData {
  id: number;
  position: THREE.Vector3;
  basePosition: THREE.Vector3;
  color: THREE.Color;
  baseColor: THREE.Color;
  connections: number[];
  pulsePeriod: number;
  pulsePhase: number;
  baseScale: number;
  brightnessBoost: number;
  hueShift: number;
  targetRadius: number;
  currentRadius: number;
}

export interface RippleParticle {
  edgeIndex: number;
  progress: number;
  speed: number;
  startNode: number;
  endNode: number;
  color: THREE.Color;
}

export interface PulseHalo {
  nodeId: number;
  time: number;
  duration: number;
  mesh: THREE.Mesh;
}

export interface FlashEffect {
  nodeId: number;
  time: number;
  duration: number;
}

class PerlinNoise3D {
  private permutation: number[] = [];

  constructor(seed: number = 12345) {
    const p: number[] = [];
    for (let i = 0; i < 256; i++) p[i] = i;
    let n: number;
    let q: number;
    for (let i = 255; i > 0; i--) {
      seed = (seed * 16807) % 2147483647;
      n = seed % (i + 1);
      q = p[i];
      p[i] = p[n];
      p[n] = q;
    }
    for (let i = 0; i < 512; i++) this.permutation[i] = p[i & 255];
  }

  private fade(t: number): number {
    return t * t * t * (t * (t * 6 - 15) + 10);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + t * (b - a);
  }

  private grad(hash: number, x: number, y: number, z: number): number {
    const h = hash & 15;
    const u = h < 8 ? x : y;
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z;
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v);
  }

  noise(x: number, y: number, z: number): number {
    const X = Math.floor(x) & 255;
    const Y = Math.floor(y) & 255;
    const Z = Math.floor(z) & 255;
    x -= Math.floor(x);
    y -= Math.floor(y);
    z -= Math.floor(z);
    const u = this.fade(x);
    const v = this.fade(y);
    const w = this.fade(z);
    const A = this.permutation[X] + Y;
    const AA = this.permutation[A] + Z;
    const AB = this.permutation[A + 1] + Z;
    const B = this.permutation[X + 1] + Y;
    const BA = this.permutation[B] + Z;
    const BB = this.permutation[B + 1] + Z;
    return this.lerp(
      this.lerp(
        this.lerp(this.grad(this.permutation[AA], x, y, z), this.grad(this.permutation[BA], x - 1, y, z), u),
        this.lerp(this.grad(this.permutation[AB], x, y - 1, z), this.grad(this.permutation[BB], x - 1, y - 1, z), u),
        v
      ),
      this.lerp(
        this.lerp(this.grad(this.permutation[AA + 1], x, y, z - 1), this.grad(this.permutation[BA + 1], x - 1, y, z - 1), u),
        this.lerp(this.grad(this.permutation[AB + 1], x, y - 1, z - 1), this.grad(this.permutation[BB + 1], x - 1, y - 1, z - 1), u),
        v
      ),
      w
    );
  }
}

export class NetworkSystem {
  public nodes: NodeData[] = [];
  public edges: { start: number; end: number; startPos: THREE.Vector3; endPos: THREE.Vector3 }[] = [];
  public nodeMesh!: THREE.InstancedMesh;
  public edgeMesh!: THREE.LineSegments;
  public haloMeshes: PulseHalo[] = [];
  public flashEffects: FlashEffect[] = [];
  public rippleParticles: RippleParticle[] = [];
  public rippleMesh!: THREE.Points;
  public group: THREE.Group = new THREE.Group();

  private NODE_RADIUS = 0.3;
  private GRID_SIZE = 20;
  private SPACING = 2;
  private MAX_DISTANCE = 2.5;
  private noise: PerlinNoise3D;
  private dummy: THREE.Object3D = new THREE.Object3D();
  private edgeColors!: Float32Array;
  private edgePositions!: Float32Array;
  private ripplePositions!: Float32Array;
  private rippleColors!: Float32Array;
  private maxRippleParticles = 2000;
  private activeRippleCount = 0;

  constructor() {
    this.noise = new PerlinNoise3D(42);
  }

  generate(scene: THREE.Scene): void {
    this.createNodes();
    this.createEdges();
    this.createNodeMesh();
    this.createEdgeMesh();
    this.createRippleMesh();
    scene.add(this.group);
  }

  private createNodes(): void {
    const halfSize = this.GRID_SIZE / 2;
    const countPerSide = Math.ceil(this.GRID_SIZE / this.SPACING) + 1;
    const nodes: { pos: THREE.Vector3; idx: number }[] = [];
    let idCounter = 0;

    for (let xi = 0; xi < countPerSide; xi++) {
      for (let yi = 0; yi < countPerSide; yi++) {
        for (let zi = 0; zi < countPerSide; zi++) {
          const bx = -halfSize + xi * this.SPACING;
          const by = -halfSize + yi * this.SPACING;
          const bz = -halfSize + zi * this.SPACING;

          const nx = this.noise.noise(bx * 0.3, by * 0.3, bz * 0.3) * 0.5;
          const ny = this.noise.noise(bx * 0.3 + 100, by * 0.3 + 100, bz * 0.3 + 100) * 0.5;
          const nz = this.noise.noise(bx * 0.3 + 200, by * 0.3 + 200, bz * 0.3 + 200) * 0.5;

          const basePos = new THREE.Vector3(bx, by, bz);
          const pos = new THREE.Vector3(bx + nx, by + ny, bz + nz);

          const hue = ((pos.x + halfSize) / this.GRID_SIZE) * 360;
          const sat = 60 + ((pos.y + halfSize) / this.GRID_SIZE) * 40;
          const light = 40 + ((pos.z + halfSize) / this.GRID_SIZE) * 40;

          const color = new THREE.Color().setHSL(hue / 360, sat / 100, light / 100);

          this.nodes.push({
            id: idCounter,
            position: pos,
            basePosition: basePos,
            color: color.clone(),
            baseColor: color.clone(),
            connections: [],
            pulsePeriod: 0.8 + Math.random() * 0.4,
            pulsePhase: (idCounter * 0.137) % (Math.PI * 2),
            baseScale: 1,
            brightnessBoost: 0,
            hueShift: 0,
            targetRadius: this.NODE_RADIUS,
            currentRadius: this.NODE_RADIUS
          });

          nodes.push({ pos, idx: idCounter });
          idCounter++;
        }
      }
    }
  }

  private createEdges(): void {
    for (let i = 0; i < this.nodes.length; i++) {
      for (let j = i + 1; j < this.nodes.length; j++) {
        const dx = this.nodes[i].position.x - this.nodes[j].position.x;
        const dy = this.nodes[i].position.y - this.nodes[j].position.y;
        const dz = this.nodes[i].position.z - this.nodes[j].position.z;
        const distSq = dx * dx + dy * dy + dz * dz;

        if (distSq <= this.MAX_DISTANCE * this.MAX_DISTANCE) {
          this.edges.push({
            start: i,
            end: j,
            startPos: this.nodes[i].position,
            endPos: this.nodes[j].position
          });
          this.nodes[i].connections.push(j);
          this.nodes[j].connections.push(i);
        }
      }
    }
  }

  private createNodeMesh(): void {
    const geometry = new THREE.SphereGeometry(1, 16, 12);
    const material = new THREE.MeshBasicMaterial({
      vertexColors: false
    });

    this.nodeMesh = new THREE.InstancedMesh(geometry, material, this.nodes.length);
    this.nodeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const colors = new Float32Array(this.nodes.length * 3);
    for (let i = 0; i < this.nodes.length; i++) {
      colors[i * 3] = this.nodes[i].color.r;
      colors[i * 3 + 1] = this.nodes[i].color.g;
      colors[i * 3 + 2] = this.nodes[i].color.b;
    }
    this.nodeMesh.instanceColor = new THREE.InstancedBufferAttribute(colors, 3);
    this.nodeMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);

    this.group.add(this.nodeMesh);
  }

  private createEdgeMesh(): void {
    const vertexCount = this.edges.length * 2;
    this.edgePositions = new Float32Array(vertexCount * 3);
    this.edgeColors = new Float32Array(vertexCount * 3);

    for (let i = 0; i < this.edges.length; i++) {
      const edge = this.edges[i];
      const s = this.nodes[edge.start].position;
      const e = this.nodes[edge.end].position;

      this.edgePositions[i * 6] = s.x;
      this.edgePositions[i * 6 + 1] = s.y;
      this.edgePositions[i * 6 + 2] = s.z;
      this.edgePositions[i * 6 + 3] = e.x;
      this.edgePositions[i * 6 + 4] = e.y;
      this.edgePositions[i * 6 + 5] = e.z;

      const sc = this.nodes[edge.start].baseColor;
      const ec = this.nodes[edge.end].baseColor;
      this.edgeColors[i * 6] = sc.r;
      this.edgeColors[i * 6 + 1] = sc.g;
      this.edgeColors[i * 6 + 2] = sc.b;
      this.edgeColors[i * 6 + 3] = ec.r;
      this.edgeColors[i * 6 + 4] = ec.g;
      this.edgeColors[i * 6 + 5] = ec.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.edgePositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.edgeColors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending
    });

    this.edgeMesh = new THREE.LineSegments(geometry, material);
    this.group.add(this.edgeMesh);
  }

  private createRippleMesh(): void {
    this.ripplePositions = new Float32Array(this.maxRippleParticles * 3);
    this.rippleColors = new Float32Array(this.maxRippleParticles * 3);

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.ripplePositions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(this.rippleColors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.4,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.rippleMesh = new THREE.Points(geometry, material);
    this.rippleMesh.geometry.setDrawRange(0, 0);
    this.group.add(this.rippleMesh);
  }

  public createPulseHalo(nodeId: number, scene: THREE.Scene): void {
    const node = this.nodes[nodeId];
    const geometry = new THREE.SphereGeometry(this.NODE_RADIUS * 2, 24, 16);
    const material = new THREE.MeshBasicMaterial({
      color: node.baseColor.clone().offsetHSL(0, 0, 0.2),
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(node.position);
    scene.add(mesh);

    this.haloMeshes.push({
      nodeId,
      time: 0,
      duration: 0.5,
      mesh
    });
  }

  public triggerRipple(startNodeId: number, scene: THREE.Scene): void {
    this.createPulseHalo(startNodeId, scene);
    const visited = new Set<number>();
    visited.add(startNodeId);

    let currentLevel: { nodeId: number; depth: number }[] = [{ nodeId: startNodeId, depth: 0 }];

    while (currentLevel.length > 0) {
      const nextLevel: { nodeId: number; depth: number }[] = [];

      for (const { nodeId, depth } of currentLevel) {
        if (depth >= 3) continue;

        const node = this.nodes[nodeId];
        for (const neighborId of node.connections) {
          if (!visited.has(neighborId)) {
            visited.add(neighborId);

            const edgeIndex = this.findEdgeIndex(nodeId, neighborId);
            if (edgeIndex >= 0) {
              this.addRippleParticle(edgeIndex, nodeId, neighborId, depth);
            }

            nextLevel.push({ nodeId: neighborId, depth: depth + 1 });
          }
        }
      }

      currentLevel = nextLevel;
    }
  }

  private findEdgeIndex(a: number, b: number): number {
    for (let i = 0; i < this.edges.length; i++) {
      if ((this.edges[i].start === a && this.edges[i].end === b) ||
          (this.edges[i].start === b && this.edges[i].end === a)) {
        return i;
      }
    }
    return -1;
  }

  private addRippleParticle(edgeIndex: number, startNode: number, endNode: number, depth: number): void {
    if (this.activeRippleCount >= this.maxRippleParticles) return;

    const edge = this.edges[edgeIndex];
    const distance = edge.startPos.distanceTo(edge.endPos);
    const speed = 30 / distance;

    const startColor = this.nodes[startNode].baseColor;
    const color = startColor.clone().offsetHSL(0.3, 0.2, 0.2);

    this.rippleParticles.push({
      edgeIndex,
      progress: 0,
      speed,
      startNode,
      endNode,
      color
    });

    this.activeRippleCount++;
  }

  public flashNode(nodeId: number): void {
    this.flashEffects.push({
      nodeId,
      time: 0,
      duration: 0.3
    });
    this.nodes[nodeId].brightnessBoost = 1.5;
    this.nodes[nodeId].hueShift = 30;
  }

  public update(deltaTime: number, elapsedTime: number): void {
    this.updateNodeInstancing(elapsedTime, deltaTime);
    this.updateHalos(deltaTime);
    this.updateFlashes(deltaTime);
    this.updateRippleParticles(deltaTime);
  }

  private updateNodeInstancing(elapsedTime: number, deltaTime: number): void {
    const colors = this.nodeMesh.instanceColor as THREE.InstancedBufferAttribute;
    const colorArray = colors.array as Float32Array;

    for (let i = 0; i < this.nodes.length; i++) {
      const node = this.nodes[i];

      const pulse = Math.sin(elapsedTime / node.pulsePeriod * Math.PI * 2 + node.pulsePhase);
      const pulseScale = 1 + pulse * 0.1;

      const radiusDiff = node.targetRadius - node.currentRadius;
      node.currentRadius += radiusDiff * Math.min(1, deltaTime * 5);

      const scale = (node.currentRadius / this.NODE_RADIUS) * pulseScale;

      this.dummy.position.copy(node.position);
      this.dummy.scale.setScalar(scale);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.updateMatrix();
      this.nodeMesh.setMatrixAt(i, this.dummy.matrix);

      const boost = 1 + node.brightnessBoost;
      const hsl = { h: 0, s: 0, l: 0 };
      node.baseColor.getHSL(hsl);
      const newHue = (hsl.h * 360 + node.hueShift) / 360;
      const newLight = Math.min(1, hsl.l * boost);
      node.color.setHSL(newHue % 1, hsl.s, newLight);

      colorArray[i * 3] = node.color.r;
      colorArray[i * 3 + 1] = node.color.g;
      colorArray[i * 3 + 2] = node.color.b;
    }

    this.nodeMesh.instanceMatrix.needsUpdate = true;
    colors.needsUpdate = true;
  }

  private updateHalos(deltaTime: number): void {
    for (let i = this.haloMeshes.length - 1; i >= 0; i--) {
      const halo = this.haloMeshes[i];
      halo.time += deltaTime;

      const t = halo.time / halo.duration;
      if (t >= 1) {
        halo.mesh.geometry.dispose();
        (halo.mesh.material as THREE.Material).dispose();
        halo.mesh.removeFromParent();
        this.haloMeshes.splice(i, 1);
      } else {
        const scale = 1 + t * 3;
        halo.mesh.scale.setScalar(scale);
        (halo.mesh.material as THREE.MeshBasicMaterial).opacity = 0.8 * (1 - t);
      }
    }
  }

  private updateFlashes(deltaTime: number): void {
    for (let i = this.flashEffects.length - 1; i >= 0; i--) {
      const flash = this.flashEffects[i];
      flash.time += deltaTime;

      if (flash.time >= flash.duration) {
        this.nodes[flash.nodeId].brightnessBoost = 0;
        this.nodes[flash.nodeId].hueShift = 0;
        this.flashEffects.splice(i, 1);
      } else {
        const t = flash.time / flash.duration;
        const fade = 1 - t;
        this.nodes[flash.nodeId].brightnessBoost = 1.5 * fade;
        this.nodes[flash.nodeId].hueShift = 30 * fade;
      }
    }
  }

  private updateRippleParticles(deltaTime: number): void {
    const posAttr = this.rippleMesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    const colAttr = this.rippleMesh.geometry.getAttribute('color') as THREE.BufferAttribute;
    const posArray = posAttr.array as Float32Array;
    const colArray = colAttr.array as Float32Array;

    const flashedThisFrame = new Set<number>();

    for (let i = this.rippleParticles.length - 1; i >= 0; i--) {
      const p = this.rippleParticles[i];
      p.progress += p.speed * deltaTime;

      if (p.progress >= 1) {
        if (!flashedThisFrame.has(p.endNode)) {
          this.flashNode(p.endNode);
          flashedThisFrame.add(p.endNode);
        }
        this.rippleParticles.splice(i, 1);
        this.activeRippleCount--;
      } else {
        const edge = this.edges[p.edgeIndex];
        const s = edge.startPos;
        const e = edge.endPos;
        const actualStart = (p.startNode === edge.start) ? s : e;
        const actualEnd = (p.startNode === edge.start) ? e : s;

        const idx = this.rippleParticles.indexOf(p);
        posArray[idx * 3] = actualStart.x + (actualEnd.x - actualStart.x) * p.progress;
        posArray[idx * 3 + 1] = actualStart.y + (actualEnd.y - actualStart.y) * p.progress;
        posArray[idx * 3 + 2] = actualStart.z + (actualEnd.z - actualStart.z) * p.progress;

        const fadeFactor = 1 - p.progress * 0.3;
        colArray[idx * 3] = p.color.r * fadeFactor;
        colArray[idx * 3 + 1] = p.color.g * fadeFactor;
        colArray[idx * 3 + 2] = p.color.b * fadeFactor;
      }
    }

    for (let i = this.rippleParticles.length; i < this.maxRippleParticles; i++) {
      posArray[i * 3] = 0;
      posArray[i * 3 + 1] = -9999;
      posArray[i * 3 + 2] = 0;
    }

    this.rippleMesh.geometry.setDrawRange(0, this.rippleParticles.length);
    posAttr.needsUpdate = true;
    colAttr.needsUpdate = true;
  }

  public setNodeHover(nodeId: number | null, hover: boolean): void {
    for (const node of this.nodes) {
      if (hover && node.id === nodeId) {
        node.targetRadius = 0.5;
        node.brightnessBoost = Math.max(node.brightnessBoost, 0.5);
      } else if (!hover && node.id === nodeId) {
        node.targetRadius = this.NODE_RADIUS;
        if (!this.flashEffects.find(f => f.nodeId === nodeId)) {
          node.brightnessBoost = 0;
          node.hueShift = 0;
        }
      }
    }
  }

  public getNodeByInstanceId(id: number): NodeData | null {
    return this.nodes[id] || null;
  }

  public getNodeCount(): number {
    return this.nodes.length;
  }

  public getEdgeCount(): number {
    return this.edges.length;
  }
}
