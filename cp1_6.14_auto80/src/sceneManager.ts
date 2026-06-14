import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { STLExporter } from 'three/addons/exporters/STLExporter.js';
import type {
  EventBus,
  VoxelGrid,
  VoxelsUpdatedData,
  CameraChangedData,
  ExportSTLReadyData,
} from './eventBus';
import { GRID_SIZE, MATERIALS, getMaterialById } from './voxelEngine';

interface DeletingVoxel {
  mesh: THREE.Mesh;
  start: number;
  duration: number;
}

interface ActiveVoxel {
  x: number;
  y: number;
  z: number;
  matId: number;
  distance: number;
  lodLevel: 0 | 1 | 2;
}

const LOD_THRESHOLD = 2000;
const LOD_NEAR = 10;
const LOD_MID = 20;

const LOD0_FULL = 0;
const LOD1_THREE_FACES = 1;
const LOD2_SIMPLE = 2;

export class SceneManager {
  private container: HTMLElement;
  private bus: EventBus;

  public renderer: THREE.WebGLRenderer;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public controls: OrbitControls;

  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private downPos = new THREE.Vector2();
  private isPointerDown = false;
  private isDragging = false;
  private pointerDownButton = 0;
  private pointerMoveThreshold = 4;

  private gridGroup = new THREE.Group();
  private ghostGroup = new THREE.Group();
  private voxelGroup = new THREE.Group();
  private deletingGroup = new THREE.Group();
  private edgesGroup = new THREE.Group();

  private baseGridHelpers: THREE.GridHelper[] = [];
  private boundingBoxLines?: THREE.LineSegments;

  private instancedMeshes: Map<number, THREE.InstancedMesh> = new Map();
  private instancedEdges: Map<number, THREE.LineSegments> = new Map();
  private positionIndex: Map<string, { matId: number; idx: number }> = new Map();

  private lodEnabled: boolean = false;
  private activeVoxels: ActiveVoxel[] = [];
  private lodUpdateInterval: number = 250;
  private lastLodUpdateTime: number = 0;
  private lodMeshesByLevel: Map<number, Map<number, THREE.InstancedMesh>> = new Map();
  private lodEdgesByLevel: Map<number, Map<number, THREE.LineSegments>> = new Map();

  private geometryCache: {
    box: THREE.BoxGeometry;
    boxSmall: THREE.BoxGeometry;
    edges: THREE.EdgesGeometry;
    edgesSmall: THREE.EdgesGeometry;
    threeFaceBox: THREE.BoxGeometry;
    simpleBox: THREE.BoxGeometry;
    simpleEdges: THREE.EdgesGeometry;
  };

  private deletingVoxels: DeletingVoxel[] = [];

  private lastCameraEmitTime = 0;
  private cameraEmitInterval = 100;

  private _matrix = new THREE.Matrix4();
  private _dummy = new THREE.Object3D();
  private _color = new THREE.Color();

  private gridCenterOffset = (GRID_SIZE - 1) / 2;

  constructor(container: HTMLElement, bus: EventBus) {
    this.container = container;
    this.bus = bus;

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x20202e, 1);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x20202e);

    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.1, 200);
    this.camera.position.set(15, 12, 15);
    this.camera.lookAt(this.gridCenterOffset, this.gridCenterOffset, this.gridCenterOffset);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.target.set(this.gridCenterOffset, this.gridCenterOffset, this.gridCenterOffset);
    this.controls.minDistance = 5;
    this.controls.maxDistance = 30;
    this.controls.minPolarAngle = (5 * Math.PI) / 180;
    this.controls.maxPolarAngle = (175 * Math.PI) / 180;
    this.controls.mouseButtons = {
      LEFT: THREE.MOUSE.ROTATE,
      MIDDLE: THREE.MOUSE.DOLLY,
      RIGHT: THREE.MOUSE.PAN,
    };
    this.controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN,
    };
    this.controls.panSpeed = 0.8;
    this.controls.rotateSpeed = 0.9;

    this.geometryCache = {
      box: new THREE.BoxGeometry(1, 1, 1),
      boxSmall: new THREE.BoxGeometry(0.98, 0.98, 0.98),
      edges: new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
      edgesSmall: new THREE.EdgesGeometry(new THREE.BoxGeometry(0.98, 0.98, 0.98)),
      threeFaceBox: this.createThreeFaceBox(),
      simpleBox: new THREE.BoxGeometry(1, 1, 1),
      simpleEdges: new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1)),
    };

    this.buildLights();
    this.buildGrid();
    this.buildGhostGrid();

    this.scene.add(this.gridGroup);
    this.scene.add(this.ghostGroup);
    this.scene.add(this.voxelGroup);
    this.scene.add(this.edgesGroup);
    this.scene.add(this.deletingGroup);

    this.attachEvents();

    this.renderer.setSize(width, height);
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.touchAction = 'none';
    this.renderer.domElement.tabIndex = 0;

    this.bus.on('voxelsUpdated', this.handleVoxelsUpdated.bind(this));
    this.bus.on('exportSTL:request', this.handleExportSTL.bind(this));

    requestAnimationFrame(() => {
      this.emitCameraAngles(0);
    });
  }

  private buildLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambient);

    const dir = new THREE.DirectionalLight(0xffffff, 0.85);
    dir.position.set(15, 25, 12);
    dir.castShadow = true;
    dir.shadow.mapSize.set(1024, 1024);
    dir.shadow.camera.near = 0.5;
    dir.shadow.camera.far = 80;
    dir.shadow.camera.left = -20;
    dir.shadow.camera.right = 20;
    dir.shadow.camera.top = 20;
    dir.shadow.camera.bottom = -20;
    this.scene.add(dir);

    const dir2 = new THREE.DirectionalLight(0x88aaff, 0.2);
    dir2.position.set(-10, 10, -10);
    this.scene.add(dir2);
  }

  private buildGrid(): void {
    const gridColor = 0x444466;
    const gridLineSize = 10;
    const gridDivisions = 10;

    const bottomGrid = new THREE.GridHelper(gridLineSize, gridDivisions, gridColor, gridColor);
    bottomGrid.position.set(this.gridCenterOffset, -0.001, this.gridCenterOffset);
    (bottomGrid.material as THREE.Material).transparent = true;
    (bottomGrid.material as THREE.Material).opacity = 0.7;
    this.baseGridHelpers.push(bottomGrid);
    this.gridGroup.add(bottomGrid);

    for (let layer = 1; layer <= 10; layer++) {
      const g = new THREE.GridHelper(gridLineSize, gridDivisions, gridColor, gridColor);
      g.position.set(this.gridCenterOffset, layer, this.gridCenterOffset);
      (g.material as THREE.Material).transparent = true;
      (g.material as THREE.Material).opacity = layer === 10 ? 0.55 : 0.12;
      this.gridGroup.add(g);
    }

    const edgeGeo = new THREE.EdgesGeometry(
      new THREE.BoxGeometry(GRID_SIZE, GRID_SIZE, GRID_SIZE)
    );
    const edgeMat = new THREE.LineBasicMaterial({ color: 0x4a90d9, transparent: true, opacity: 0.45 });
    this.boundingBoxLines = new THREE.LineSegments(edgeGeo, edgeMat);
    this.boundingBoxLines.position.set(this.gridCenterOffset, this.gridCenterOffset, this.gridCenterOffset);
    this.gridGroup.add(this.boundingBoxLines);
  }

  private buildGhostGrid(): void {
    const mat = new THREE.MeshBasicMaterial({
      color: 0x4a90d9,
      transparent: true,
      opacity: 0.12,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const geom = new THREE.BoxGeometry(0.995, 0.995, 0.995);
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let z = 0; z < GRID_SIZE; z++) {
          const mesh = new THREE.Mesh(geom, mat);
          mesh.position.set(x, y, z);
          mesh.userData = { gridX: x, gridY: y, gridZ: z, isGhost: true };
          this.ghostGroup.add(mesh);
        }
      }
    }
  }

  private createThreeFaceBox(): THREE.BoxGeometry {
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const groups = [];
    for (let i = 0; i < 6; i++) {
      if (i === 0 || i === 2 || i === 4) {
        groups.push({ start: i * 6, count: 6, materialIndex: 0 });
      } else {
        groups.push({ start: i * 6, count: 6, materialIndex: 1 });
      }
    }
    for (const g of groups) geo.addGroup(g.start, g.count, g.materialIndex);
    return geo;
  }

  private attachEvents(): void {
    const dom = this.renderer.domElement;

    const resizeHandler = () => this.onResize();
    window.addEventListener('resize', resizeHandler);

    dom.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    dom.addEventListener('pointermove', (e) => this.onPointerMove(e));
    dom.addEventListener('pointerup', (e) => this.onPointerUp(e));
    dom.addEventListener('pointercancel', (e) => this.onPointerUp(e));
    dom.addEventListener('pointerleave', (e) => this.onPointerUp(e));
    dom.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  private onResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.renderer.setSize(width, height);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  }

  private onPointerDown(e: PointerEvent): void {
    if (e.button !== 0 && e.button !== 2) return;
    this.isPointerDown = true;
    this.isDragging = false;
    this.pointerDownButton = e.button;
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.downPos.set(e.clientX - rect.left, e.clientY - rect.top);
    this.renderer.domElement.setPointerCapture?.(e.pointerId);
  }

  private onPointerMove(e: PointerEvent): void {
    if (!this.isPointerDown) return;
    const rect = this.renderer.domElement.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (
      Math.abs(x - this.downPos.x) > this.pointerMoveThreshold ||
      Math.abs(y - this.downPos.y) > this.pointerMoveThreshold
    ) {
      this.isDragging = true;
    }
  }

  private onPointerUp(e: PointerEvent): void {
    if (!this.isPointerDown) return;
    const wasDragging = this.isDragging;
    const button = this.pointerDownButton;
    this.isPointerDown = false;
    this.isDragging = false;
    if (wasDragging) return;
    if (button !== 0) return;
    this.handleClick(e);
    try {
      this.renderer.domElement.releasePointerCapture?.(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  private handleClick(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    let targetMeshes: THREE.Object3D[] = [];
    if (!this.lodEnabled) {
      targetMeshes = Array.from(this.instancedMeshes.values());
    } else {
      for (const [level, meshes] of this.lodMeshesByLevel) {
        for (const mesh of meshes.values()) {
          if (mesh.visible) targetMeshes.push(mesh);
        }
      }
    }
    const voxelHits = this.raycaster.intersectObjects(targetMeshes, false);
    if (voxelHits.length > 0) {
      const hit = voxelHits[0];
      const instMesh = hit.object as THREE.InstancedMesh;
      if (hit.instanceId == null) return;
      const matId = this.findMaterialIdByInstancedMesh(instMesh);
      if (matId === -1) return;
      const pos = this.findPositionByInstance(matId, hit.instanceId);
      if (!pos) return;
      const { x, y, z } = pos;
      this.sendGridInteraction(x, y, z, true, e.shiftKey);
      return;
    }

    const ghostHits = this.raycaster.intersectObjects(this.ghostGroup.children, false);
    if (ghostHits.length > 0) {
      const hit = ghostHits[0];
      const { gridX, gridY, gridZ } = hit.object.userData as { gridX: number; gridY: number; gridZ: number };
      this.sendGridInteraction(gridX, gridY, gridZ, false, e.shiftKey);
    }
  }

  private sendGridInteraction(
    x: number, y: number, z: number, hitExisting: boolean, shift: boolean
  ): void {
    const event = new CustomEvent('voxelcraft:interact', {
      detail: { x, y, z, hitExisting, shift },
    });
    this.renderer.domElement.dispatchEvent(event);
  }

  public getInteractionElement(): HTMLElement {
    return this.renderer.domElement;
  }

  private findMaterialIdByInstancedMesh(mesh: THREE.InstancedMesh): number {
    for (const [id, m] of this.instancedMeshes) {
      if (m === mesh) return id;
    }
    for (const [level, meshes] of this.lodMeshesByLevel) {
      for (const [id, m] of meshes) {
        if (m === mesh) return id;
      }
    }
    return -1;
  }

  private findPositionByInstance(
    matId: number, idx: number
  ): { x: number; y: number; z: number } | null {
    for (const [key, value] of this.positionIndex) {
      if (value.matId === matId && value.idx === idx) {
        const parts = key.split(',').map(Number);
        return { x: parts[0], y: parts[1], z: parts[2] };
      }
    }
    if (this.activeVoxels.length > 0) {
      const voxel = this.activeVoxels.find((v) => v.matId === matId);
      if (voxel) return { x: voxel.x, y: voxel.y, z: voxel.z };
    }
    return null;
  }

  private handleVoxelsUpdated(data: VoxelsUpdatedData): void {
    this.rebuildVoxelMeshes(data.grid);
  }

  private clearVoxelMeshes(): void {
    for (const mesh of this.instancedMeshes.values()) {
      mesh.geometry.dispose();
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach((m) => m.dispose());
      } else {
        mesh.material.dispose();
      }
      this.voxelGroup.remove(mesh);
    }
    this.instancedMeshes.clear();

    for (const edges of this.instancedEdges.values()) {
      edges.geometry.dispose();
      if (Array.isArray(edges.material)) {
        edges.material.forEach((m) => m.dispose());
      } else {
        edges.material.dispose();
      }
      this.edgesGroup.remove(edges);
    }
    this.instancedEdges.clear();
    this.positionIndex.clear();
  }

  private rebuildVoxelMeshes(grid: VoxelGrid): void {
    const positionsByMat: Map<number, { x: number; y: number; z: number }[]> = new Map();

    for (const entry of this.deletingVoxels) {
      entry.start = performance.now();
    }

    this.activeVoxels = [];
    let totalCount = 0;
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let z = 0; z < GRID_SIZE; z++) {
          const matId = grid[x][y][z];
          if (matId === -1) continue;
          if (!positionsByMat.has(matId)) positionsByMat.set(matId, []);
          positionsByMat.get(matId)!.push({ x, y, z });
          this.activeVoxels.push({ x, y, z, matId, distance: 0, lodLevel: LOD0_FULL });
          totalCount++;
        }
      }
    }

    this.clearVoxelMeshes();
    this.clearLodMeshes();

    if (totalCount === 0) return;

    this.lodEnabled = totalCount > LOD_THRESHOLD;

    if (!this.lodEnabled) {
      for (const [matId, positions] of positionsByMat) {
        const matDef = getMaterialById(matId);
        if (!matDef) continue;

        const material = new THREE.MeshLambertMaterial({
          color: matDef.hex,
          transparent: !!matDef.transparent,
          opacity: matDef.transparent && matDef.opacity != null ? matDef.opacity : 1.0,
          side: THREE.FrontSide,
        });

        const inst = new THREE.InstancedMesh(
          this.geometryCache.boxSmall,
          material,
          positions.length
        );
        inst.castShadow = true;
        inst.receiveShadow = true;
        inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

        const edgeMat = new THREE.LineBasicMaterial({ color: 0x1a1a2e, transparent: true, opacity: 0.9 });
        const edges = new THREE.LineSegments(this.geometryCache.edgesSmall, edgeMat);
        edges.instanceMatrix = new THREE.InstancedBufferAttribute(new Float32Array(positions.length * 16), 16);
        edges.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        (edges as any).count = positions.length;
        (edges as any).isInstancedMesh = true;

        for (let i = 0; i < positions.length; i++) {
          const p = positions[i];
          this._dummy.position.set(p.x, p.y, p.z);
          this._dummy.rotation.set(0, 0, 0);
          this._dummy.scale.set(1, 1, 1);
          this._dummy.updateMatrix();
          inst.setMatrixAt(i, this._dummy.matrix);
          edges.instanceMatrix.set(i, this._dummy.matrix.elements);
          this.positionIndex.set(`${p.x},${p.y},${p.z}`, { matId, idx: i });
        }
        inst.instanceMatrix.needsUpdate = true;
        edges.instanceMatrix.needsUpdate = true;
        inst.computeBoundingSphere();

        this.instancedMeshes.set(matId, inst);
        this.instancedEdges.set(matId, edges);
        this.voxelGroup.add(inst);
        this.edgesGroup.add(edges);
      }
      this.ghostGroup.visible = true;
      this.voxelGroup.visible = true;
      this.edgesGroup.visible = true;
      for (const m of this.lodMeshesByLevel.values()) {
        for (const mesh of m.values()) mesh.visible = false;
      }
      for (const m of this.lodEdgesByLevel.values()) {
        for (const edges of m.values()) edges.visible = false;
      }
    } else {
      this.buildLodMeshes(positionsByMat);
      this.ghostGroup.visible = false;
      this.voxelGroup.visible = false;
      this.edgesGroup.visible = false;
      this.updateLOD(performance.now());
    }
  }

  private clearLodMeshes(): void {
    for (const [level, meshes] of this.lodMeshesByLevel) {
      for (const mesh of meshes.values()) {
        mesh.geometry.dispose();
        if (Array.isArray(mesh.material)) mesh.material.forEach((m) => m.dispose());
        else mesh.material.dispose();
        this.scene.remove(mesh);
      }
      meshes.clear();
    }
    for (const [level, edges] of this.lodEdgesByLevel) {
      for (const e of edges.values()) {
        e.geometry.dispose();
        if (Array.isArray(e.material)) e.material.forEach((m) => m.dispose());
        else e.material.dispose();
        this.scene.remove(e);
      }
      edges.clear();
    }
    this.lodMeshesByLevel.clear();
    this.lodEdgesByLevel.clear();
  }

  private buildLodMeshes(positionsByMat: Map<number, { x: number; y: number; z: number }[]>): void {
    for (const [matId, positions] of positionsByMat) {
      const matDef = getMaterialById(matId);
      if (!matDef) continue;

      const mat0 = new THREE.MeshLambertMaterial({
        color: matDef.hex,
        transparent: !!matDef.transparent,
        opacity: matDef.transparent && matDef.opacity != null ? matDef.opacity : 1.0,
      });

      const mat1Arr = [
        new THREE.MeshLambertMaterial({ color: matDef.hex }),
        new THREE.MeshLambertMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
      ];

      const mat2 = new THREE.MeshLambertMaterial({ color: matDef.hex, flatShading: true });

      const edgeMat0 = new THREE.LineBasicMaterial({ color: 0x1a1a2e, transparent: true, opacity: 0.9 });
      const edgeMat2 = new THREE.LineBasicMaterial({ color: 0x1a1a2e, transparent: true, opacity: 0.3 });

      const lod0Mesh = new THREE.InstancedMesh(this.geometryCache.boxSmall, mat0, positions.length);
      const lod0Edges = new THREE.LineSegments(this.geometryCache.edgesSmall, edgeMat0);
      const lod1Mesh = new THREE.InstancedMesh(this.geometryCache.threeFaceBox, mat1Arr, positions.length);
      const lod2Mesh = new THREE.InstancedMesh(this.geometryCache.simpleBox, mat2, positions.length);
      const lod2Edges = new THREE.LineSegments(this.geometryCache.simpleEdges, edgeMat2);

      [lod0Mesh, lod1Mesh, lod2Mesh].forEach((m) => {
        m.castShadow = true;
        m.receiveShadow = true;
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        m.visible = false;
      });
      [lod0Edges, lod2Edges].forEach((e) => {
        e.instanceMatrix = new THREE.InstancedBufferAttribute(new Float32Array(positions.length * 16), 16);
        e.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        (e as any).count = positions.length;
        (e as any).isInstancedMesh = true;
        e.visible = false;
      });
      lod1Mesh.visible = false;

      for (let i = 0; i < positions.length; i++) {
        const p = positions[i];
        this._dummy.position.set(p.x, p.y, p.z);
        this._dummy.rotation.set(0, 0, 0);
        this._dummy.scale.set(1, 1, 1);
        this._dummy.updateMatrix();
        lod0Mesh.setMatrixAt(i, this._dummy.matrix);
        lod0Edges.instanceMatrix.set(i, this._dummy.matrix.elements);
        lod1Mesh.setMatrixAt(i, this._dummy.matrix);
        lod2Mesh.setMatrixAt(i, this._dummy.matrix);
        lod2Edges.instanceMatrix.set(i, this._dummy.matrix.elements);
        this.positionIndex.set(`${p.x},${p.y},${p.z}`, { matId, idx: i });
      }

      [lod0Mesh, lod1Mesh, lod2Mesh].forEach((m) => {
        m.instanceMatrix.needsUpdate = true;
        m.computeBoundingSphere();
      });
      [lod0Edges, lod2Edges].forEach((e) => {
        e.instanceMatrix.needsUpdate = true;
      });

      if (!this.lodMeshesByLevel.has(LOD0_FULL)) this.lodMeshesByLevel.set(LOD0_FULL, new Map());
      if (!this.lodMeshesByLevel.has(LOD1_THREE_FACES)) this.lodMeshesByLevel.set(LOD1_THREE_FACES, new Map());
      if (!this.lodMeshesByLevel.has(LOD2_SIMPLE)) this.lodMeshesByLevel.set(LOD2_SIMPLE, new Map());
      if (!this.lodEdgesByLevel.has(LOD0_FULL)) this.lodEdgesByLevel.set(LOD0_FULL, new Map());
      if (!this.lodEdgesByLevel.has(LOD2_SIMPLE)) this.lodEdgesByLevel.set(LOD2_SIMPLE, new Map());

      this.lodMeshesByLevel.get(LOD0_FULL)!.set(matId, lod0Mesh);
      this.lodMeshesByLevel.get(LOD1_THREE_FACES)!.set(matId, lod1Mesh);
      this.lodMeshesByLevel.get(LOD2_SIMPLE)!.set(matId, lod2Mesh);
      this.lodEdgesByLevel.get(LOD0_FULL)!.set(matId, lod0Edges);
      this.lodEdgesByLevel.get(LOD2_SIMPLE)!.set(matId, lod2Edges);

      this.scene.add(lod0Mesh);
      this.scene.add(lod1Mesh);
      this.scene.add(lod2Mesh);
      this.scene.add(lod0Edges);
      this.scene.add(lod2Edges);
    }
  }

  private updateLOD(now: number): void {
    if (!this.lodEnabled || this.activeVoxels.length === 0) return;
    if (now - this.lastLodUpdateTime < this.lodUpdateInterval) return;
    this.lastLodUpdateTime = now;

    const camPos = this.camera.position;
    const center = this.gridCenterOffset;
    const countsByLevel = { [LOD0_FULL]: new Map<number, number>(), [LOD1_THREE_FACES]: new Map<number, number>(), [LOD2_SIMPLE]: new Map<number, number>() };

    for (const v of this.activeVoxels) {
      const dx = v.x + 0.5 - camPos.x;
      const dy = v.y + 0.5 - camPos.y;
      const dz = v.z + 0.5 - camPos.z;
      v.distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
      if (v.distance < LOD_NEAR) v.lodLevel = LOD0_FULL;
      else if (v.distance < LOD_MID) v.lodLevel = LOD1_THREE_FACES;
      else v.lodLevel = LOD2_SIMPLE;
      const map = countsByLevel[v.lodLevel];
      map.set(v.matId, (map.get(v.matId) ?? 0) + 1);
    }

    for (const [level, meshes] of this.lodMeshesByLevel) {
      for (const [matId, mesh] of meshes) {
        const positions = this.activeVoxels.filter((v) => v.lodLevel === level && v.matId === matId);
        let idx = 0;
        for (const v of positions) {
          this._dummy.position.set(v.x, v.y, v.z);
          this._dummy.rotation.set(0, 0, 0);
          this._dummy.scale.set(1, 1, 1);
          this._dummy.updateMatrix();
          mesh.setMatrixAt(idx, this._dummy.matrix);
          const edgesMap = this.lodEdgesByLevel.get(level);
          if (edgesMap) {
            const edges = edgesMap.get(matId);
            if (edges) edges.instanceMatrix.set(idx, this._dummy.matrix.elements);
          }
          idx++;
        }
        mesh.count = positions.length;
        mesh.instanceMatrix.needsUpdate = true;
        mesh.visible = positions.length > 0;
        const edgesMap = this.lodEdgesByLevel.get(level);
        if (edgesMap) {
          const edges = edgesMap.get(matId);
          if (edges) {
            edges.count = positions.length;
            edges.instanceMatrix.needsUpdate = true;
            edges.visible = positions.length > 0;
          }
        }
      }
    }
  }

  public spawnDeleteAnimation(x: number, y: number, z: number, matId: number): void {
    const matDef = getMaterialById(matId);
    const color = matDef?.hex ?? 0x888888;
    const mat = new THREE.MeshLambertMaterial({ color });
    const geom = new THREE.BoxGeometry(0.98, 0.98, 0.98);
    const mesh = new THREE.Mesh(geom, mat);
    mesh.position.set(x, y, z);
    this.deletingGroup.add(mesh);
    this.deletingVoxels.push({
      mesh,
      start: performance.now(),
      duration: 200,
    });
  }

  private updateDeletingAnimations(now: number): void {
    const remaining: DeletingVoxel[] = [];
    for (const entry of this.deletingVoxels) {
      const t = (now - entry.start) / entry.duration;
      if (t >= 1) {
        this.deletingGroup.remove(entry.mesh);
        (entry.mesh.geometry as THREE.BufferGeometry).dispose();
        if (Array.isArray(entry.mesh.material)) {
          entry.mesh.material.forEach((m) => m.dispose());
        } else {
          entry.mesh.material.dispose();
        }
        continue;
      }
      const eased = 1 - Math.pow(1 - t, 3);
      const s = 1 - eased;
      entry.mesh.scale.setScalar(s);
      (entry.mesh.material as THREE.Material).opacity = Math.max(0, 1 - t);
      (entry.mesh.material as THREE.Material).transparent = true;
      remaining.push(entry);
    }
    this.deletingVoxels = remaining;
  }

  private emitCameraAngles(now: number): void {
    if (now - this.lastCameraEmitTime < this.cameraEmitInterval) return;
    this.lastCameraEmitTime = now;
    const target = this.controls.target;
    const pos = this.camera.position;
    const dx = pos.x - target.x;
    const dy = pos.y - target.y;
    const dz = pos.z - target.z;
    const azimuth = ((Math.atan2(dx, dz) * 180) / Math.PI + 360) % 360;
    const horiz = Math.sqrt(dx * dx + dz * dz);
    const pitch = (Math.atan2(dy, horiz) * 180) / Math.PI;
    const data: CameraChangedData = {
      azimuth: Math.round(azimuth * 10) / 10,
      pitch: Math.max(-90, Math.min(90, Math.round(pitch * 10) / 10)),
    };
    this.bus.emit('cameraChanged', data);
  }

  private handleExportSTL(): void {
    requestAnimationFrame(() => {
      try {
        const exporter = new STLExporter();
        const exportGroup = new THREE.Group();
        const offset = -this.gridCenterOffset;
        for (let x = 0; x < GRID_SIZE; x++) {
          for (let y = 0; y < GRID_SIZE; y++) {
            for (let z = 0; z < GRID_SIZE; z++) {
              const info = this.positionIndex.get(`${x},${y},${z}`);
              if (!info) continue;
              const matDef = getMaterialById(info.matId);
              if (!matDef) continue;
              const geo = new THREE.BoxGeometry(1, 1, 1);
              const mat = new THREE.MeshLambertMaterial({ color: matDef.hex });
              const mesh = new THREE.Mesh(geo, mat);
              mesh.position.set(x + offset, y + offset, z + offset);
              mesh.updateMatrix();
              exportGroup.add(mesh);
            }
          }
        }
        const result = exporter.parse(exportGroup, { binary: false });
        let blob: Blob;
        if (typeof result === 'string') {
          blob = new Blob([result], { type: 'model/stl' });
        } else {
          blob = new Blob([result as ArrayBuffer], { type: 'model/stl' });
        }
        const ts = Date.now();
        const filename = `voxelcraft-${ts}.stl`;
        const data: ExportSTLReadyData = { blob, filename };
        this.bus.emit('exportSTL:ready', data);
        exportGroup.traverse((obj) => {
          const mesh = obj as THREE.Mesh;
          if (mesh.geometry) mesh.geometry.dispose?.();
          if (mesh.material) {
            const m = mesh.material as THREE.Material | THREE.Material[];
            if (Array.isArray(m)) m.forEach((x) => x.dispose());
            else m.dispose();
          }
        });
      } catch (err) {
        console.error('[SceneManager] Export failed:', err);
      }
    });
  }

  public animate = (): void => {
    const now = performance.now();
    this.controls.update();
    this.updateDeletingAnimations(now);
    this.emitCameraAngles(now);
    if (this.lodEnabled) this.updateLOD(now);
    this.renderer.render(this.scene, this.camera);
    requestAnimationFrame(this.animate);
  };

  public dispose(): void {
    this.clearVoxelMeshes();
    this.clearLodMeshes();
    this.geometryCache.box.dispose();
    this.geometryCache.boxSmall.dispose();
    this.geometryCache.edges.dispose();
    this.geometryCache.edgesSmall.dispose();
    this.geometryCache.threeFaceBox.dispose();
    this.geometryCache.simpleBox.dispose();
    this.geometryCache.simpleEdges.dispose();
    this.controls.dispose();
    this.renderer.dispose();
  }
}
