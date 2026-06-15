import * as THREE from 'three';
import {
  ProcessedImageData,
  SceneConfig,
  DEFAULT_SCENE_CONFIG,
  Node,
  Connection,
  MineralDeposit,
  DangerZone,
  Vector3,
} from './SharedTypes';

export interface SceneBuilderResult {
  scene: THREE.Scene;
  start: () => void;
  stop: () => void;
  update: (data: ProcessedImageData) => void;
  getDepthRange: () => { min: number; max: number };
}

export class SceneBuilder {
  private scene: THREE.Scene;
  private config: SceneConfig;
  private animationId: number | null = null;
  private clock: THREE.Clock;
  private mineralMeshes: THREE.Mesh[] = [];
  private mineralLights: THREE.PointLight[] = [];
  private dangerCones: THREE.Group[] = [];
  private tubeGroup: THREE.Group;
  private nodeGroup: THREE.Group;
  private mineralGroup: THREE.Group;
  private dangerGroup: THREE.Group;
  private groundGrid: THREE.GridHelper | null = null;
  private depthMin: number = 0;
  private depthMax: number = 1;
  private onAnimationFrame?: () => void;

  constructor(config?: Partial<SceneConfig>) {
    this.config = { ...DEFAULT_SCENE_CONFIG, ...config };
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0f172a);
    this.clock = new THREE.Clock();

    this.tubeGroup = new THREE.Group();
    this.tubeGroup.name = 'tubes';
    this.nodeGroup = new THREE.Group();
    this.nodeGroup.name = 'nodes';
    this.mineralGroup = new THREE.Group();
    this.mineralGroup.name = 'minerals';
    this.dangerGroup = new THREE.Group();
    this.dangerGroup.name = 'dangers';

    this.scene.add(this.tubeGroup);
    this.scene.add(this.nodeGroup);
    this.scene.add(this.mineralGroup);
    this.scene.add(this.dangerGroup);

    this.setupLighting();
    this.setupGround();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x334155, 0.6);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 5);
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x60a5fa, 0.4);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);
  }

  private setupGround(): void {
    this.groundGrid = new THREE.GridHelper(10, 20, 0x334155, 0x1e293b);
    this.groundGrid.position.y = -0.5;
    this.scene.add(this.groundGrid);

    const groundGeometry = new THREE.PlaneGeometry(10, 10);
    const groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      transparent: true,
      opacity: 0.8,
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.51;
    this.scene.add(ground);
  }

  private clearGroup(group: THREE.Group): void {
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  }

  public build(data: ProcessedImageData): SceneBuilderResult {
    this.depthMin = data.bounds.minDepth;
    this.depthMax = data.bounds.maxDepth;

    this.clearGroup(this.tubeGroup);
    this.clearGroup(this.nodeGroup);
    this.clearGroup(this.mineralGroup);
    this.clearGroup(this.dangerGroup);

    this.mineralMeshes = [];
    this.mineralLights = [];
    this.dangerCones = [];

    const useInstancing =
      this.config.useInstancing &&
      data.nodes.length > this.config.instancingThreshold;

    this.createTubes(data.connections, data.nodes);
    this.createNodes(data.nodes, useInstancing);
    this.createMinerals(data.minerals);
    this.createDangerZones(data.dangers);

    return {
      scene: this.scene,
      start: () => this.start(),
      stop: () => this.stop(),
      update: (newData: ProcessedImageData) => this.build(newData),
      getDepthRange: () => ({ min: this.depthMin, max: this.depthMax }),
    };
  }

  private createTubes(connections: Connection[], nodes: Node[]): void {
    const nodeMap = new Map<string, Node>();
    for (const node of nodes) {
      nodeMap.set(node.id, node);
    }

    for (const conn of connections) {
      const fromNode = nodeMap.get(conn.from);
      const toNode = nodeMap.get(conn.to);

      if (!fromNode || !toNode) continue;

      let pathPoints: Vector3[];
      if (conn.pathPoints && conn.pathPoints.length >= 2) {
        pathPoints = conn.pathPoints;
      } else {
        pathPoints = [fromNode.position, toNode.position];
      }

      const curve = this.createCurveFromPoints(pathPoints);
      const tubeGeometry = new THREE.TubeGeometry(
        curve,
        Math.max(20, Math.floor(curve.getLength() * 50)),
        this.config.tubeRadius,
        this.config.tubeSegments,
        false
      );

      const depthRatio = Math.min(
        1,
        Math.max(
          0,
          (conn.depth - this.depthMin) /
            Math.max(0.001, this.depthMax - this.depthMin)
        )
      );

      const color = this.getDepthColor(depthRatio);

      const tubeMaterial = new THREE.MeshStandardMaterial({
        color,
        transparent: true,
        opacity: 0.7,
        roughness: 0.4,
        metalness: 0.6,
        side: THREE.DoubleSide,
      });

      const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
      this.tubeGroup.add(tube);

      const wireGeometry = new THREE.TubeGeometry(
        curve,
        Math.max(20, Math.floor(curve.getLength() * 50)),
        this.config.tubeRadius * 1.05,
        this.config.tubeSegments,
        false
      );
      const wireMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.3,
        wireframe: true,
      });
      const wireTube = new THREE.Mesh(wireGeometry, wireMaterial);
      this.tubeGroup.add(wireTube);
    }
  }

  private createCurveFromPoints(points: Vector3[]): THREE.CatmullRomCurve3 {
    const threePoints = points.map(
      (p) => new THREE.Vector3(p.x, p.z, p.y)
    );
    return new THREE.CatmullRomCurve3(threePoints, false, 'catmullrom', 0.5);
  }

  private getDepthColor(ratio: number): THREE.Color {
    const minColor = new THREE.Color(this.config.depthColorMin);
    const maxColor = new THREE.Color(this.config.depthColorMax);

    return minColor.clone().lerp(maxColor, ratio);
  }

  private createNodes(nodes: Node[], useInstancing: boolean): void {
    if (useInstancing) {
      this.createInstancedNodes(nodes);
    } else {
      this.createIndividualNodes(nodes);
    }
  }

  private createIndividualNodes(nodes: Node[]): void {
    const nodeColor = new THREE.Color(this.config.nodeColor);

    for (const node of nodes) {
      const geometry = new THREE.SphereGeometry(
        this.config.nodeRadius,
        16,
        16
      );
      const material = new THREE.MeshStandardMaterial({
        color: nodeColor,
        emissive: nodeColor,
        emissiveIntensity: 0.3,
        roughness: 0.3,
        metalness: 0.8,
      });

      const sphere = new THREE.Mesh(geometry, material);
      sphere.position.set(node.position.x, node.position.z, node.position.y);
      this.nodeGroup.add(sphere);

      const glowGeometry = new THREE.SphereGeometry(
        this.config.nodeRadius * 1.5,
        16,
        16
      );
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: nodeColor,
        transparent: true,
        opacity: 0.2,
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.position.copy(sphere.position);
      this.nodeGroup.add(glow);
    }
  }

  private createInstancedNodes(nodes: Node[]): void {
    const nodeColor = new THREE.Color(this.config.nodeColor);
    const geometry = new THREE.SphereGeometry(
      this.config.nodeRadius,
      16,
      16
    );
    const material = new THREE.MeshStandardMaterial({
      color: nodeColor,
      emissive: nodeColor,
      emissiveIntensity: 0.3,
      roughness: 0.3,
      metalness: 0.8,
    });

    const instancedMesh = new THREE.InstancedMesh(
      geometry,
      material,
      nodes.length
    );

    const dummy = new THREE.Object3D();
    for (let i = 0; i < nodes.length; i++) {
      dummy.position.set(
        nodes[i].position.x,
        nodes[i].position.z,
        nodes[i].position.y
      );
      dummy.updateMatrix();
      instancedMesh.setMatrixAt(i, dummy.matrix);
    }
    instancedMesh.instanceMatrix.needsUpdate = true;

    this.nodeGroup.add(instancedMesh);
  }

  private createMinerals(minerals: MineralDeposit[]): void {
    for (const mineral of minerals) {
      const size = mineral.size * this.config.mineralSize;

      const mineralColor = this.getMineralColor(mineral.type);

      const geometry = new THREE.BoxGeometry(size, size, size);
      const material = new THREE.MeshStandardMaterial({
        color: mineralColor,
        emissive: mineralColor,
        emissiveIntensity: 0.5,
        roughness: 0.2,
        metalness: 0.9,
      });

      const cube = new THREE.Mesh(geometry, material);
      cube.position.set(
        mineral.position.x,
        mineral.position.z,
        mineral.position.y
      );
      cube.rotation.set(Math.random(), Math.random(), Math.random());
      this.mineralGroup.add(cube);
      this.mineralMeshes.push(cube);

      const haloGeometry = new THREE.BoxGeometry(size * 1.8, size * 1.8, size * 1.8);
      const haloMaterial = new THREE.MeshBasicMaterial({
        color: mineralColor,
        transparent: true,
        opacity: 0.15,
      });
      const halo = new THREE.Mesh(haloGeometry, haloMaterial);
      halo.position.copy(cube.position);
      halo.rotation.copy(cube.rotation);
      this.mineralGroup.add(halo);

      const pointLight = new THREE.PointLight(mineralColor, 0.5, size * 5);
      pointLight.position.copy(cube.position);
      this.mineralGroup.add(pointLight);
      this.mineralLights.push(pointLight);
    }
  }

  private getMineralColor(type: string): THREE.Color {
    const colors: Record<string, number> = {
      gold: 0xfbbf24,
      copper: 0xf97316,
      iron: 0x64748b,
      rare_earth: 0xa78bfa,
      unknown: 0x22d3ee,
    };
    return new THREE.Color(colors[type] || colors.unknown);
  }

  private createDangerZones(dangers: DangerZone[]): void {
    for (const danger of dangers) {
      const group = new THREE.Group();

      const coneGeometry = new THREE.ConeGeometry(
        this.config.dangerConeRadius,
        this.config.dangerConeHeight,
        16
      );
      const coneMaterial = new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        emissive: 0xdc2626,
        emissiveIntensity: 0.3,
        roughness: 0.5,
        metalness: 0.3,
      });

      const cone = new THREE.Mesh(coneGeometry, coneMaterial);
      cone.position.y = this.config.dangerConeHeight / 2;
      group.add(cone);

      const baseGeometry = new THREE.CylinderGeometry(
        this.config.dangerConeRadius * 1.2,
        this.config.dangerConeRadius * 1.2,
        0.05,
        16
      );
      const baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x7f1d1d,
        roughness: 0.8,
      });
      const base = new THREE.Mesh(baseGeometry, baseMaterial);
      base.position.y = 0.025;
      group.add(base);

      const warningGeometry = new THREE.RingGeometry(
        this.config.dangerConeRadius * 1.5,
        this.config.dangerConeRadius * 2,
        32
      );
      const warningMaterial = new THREE.MeshBasicMaterial({
        color: 0xfbbf24,
        transparent: true,
        opacity: 0.5,
        side: THREE.DoubleSide,
      });
      const warning = new THREE.Mesh(warningGeometry, warningMaterial);
      warning.rotation.x = -Math.PI / 2;
      warning.position.y = 0.1;
      group.add(warning);

      group.position.set(
        danger.position.x,
        danger.position.z,
        danger.position.y
      );

      this.dangerGroup.add(group);
      this.dangerCones.push(group);
    }
  }

  private animate = (): void => {
    const delta = this.clock.getDelta();
    const elapsed = this.clock.getElapsedTime();

    for (let i = 0; i < this.mineralMeshes.length; i++) {
      const mesh = this.mineralMeshes[i];
      const pulse = Math.sin(elapsed * (2 * Math.PI) / this.config.mineralPulsePeriod + i * 0.5) * 0.5 + 0.5;
      const scale = 1 + pulse * 0.3;
      mesh.scale.set(scale, scale, scale);
      mesh.rotation.y += delta * 0.5;
      mesh.rotation.x += delta * 0.3;

      if (this.mineralLights[i]) {
        this.mineralLights[i].intensity = 0.3 + pulse * 0.7;
      }

      if (i * 2 + 1 < this.mineralGroup.children.length) {
        const haloIdx = i * 2 + 1;
        const halo = this.mineralGroup.children[haloIdx] as THREE.Mesh;
        if (halo && halo.material instanceof THREE.MeshBasicMaterial) {
          halo.material.opacity = 0.1 + pulse * 0.2;
          halo.scale.set(scale * 1.5, scale * 1.5, scale * 1.5);
        }
      }
    }

    for (const cone of this.dangerCones) {
      cone.rotation.y += delta * this.config.dangerRotationSpeed;

      const warningRing = cone.children[2] as THREE.Mesh;
      if (warningRing && warningRing.material instanceof THREE.MeshBasicMaterial) {
        const pulse = Math.sin(elapsed * 3) * 0.5 + 0.5;
        warningRing.material.opacity = 0.3 + pulse * 0.4;
        const ringScale = 1 + pulse * 0.2;
        warningRing.scale.set(ringScale, ringScale, ringScale);
      }
    }

    const nodeCount = this.nodeGroup.children.length;
    for (let i = 0; i < nodeCount; i += 2) {
      const node = this.nodeGroup.children[i];
      if (node instanceof THREE.Mesh && node.material instanceof THREE.MeshStandardMaterial) {
        const pulse = Math.sin(elapsed * 1.5 + i * 0.1) * 0.5 + 0.5;
        node.material.emissiveIntensity = 0.2 + pulse * 0.3;
      }
    }

    if (this.onAnimationFrame) {
      this.onAnimationFrame();
    }

    this.animationId = requestAnimationFrame(this.animate);
  };

  public start(): void {
    if (this.animationId !== null) return;
    this.clock.start();
    this.animate();
  }

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    this.clock.stop();
  }

  public setAnimationFrameCallback(callback: () => void): void {
    this.onAnimationFrame = callback;
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public getDepthRange(): { min: number; max: number } {
    return { min: this.depthMin, max: this.depthMax };
  }

  public dispose(): void {
    this.stop();

    const disposeGroup = (group: THREE.Group) => {
      group.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material.dispose();
          }
        }
        if (obj instanceof THREE.PointLight) {
          // lights don't need disposal
        }
      });
    };

    disposeGroup(this.tubeGroup);
    disposeGroup(this.nodeGroup);
    disposeGroup(this.mineralGroup);
    disposeGroup(this.dangerGroup);

    if (this.groundGrid) {
      this.scene.remove(this.groundGrid);
    }
  }
}
