import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GridController, Voxel } from './GridController';
import { ToolManager } from './ToolManager';
import { UIPanel, PRESET_COLORS } from './UIPanel';

const GRID_SIZE = 32;
const ANIM_DURATION = 0.15;

interface AnimVoxel {
  mesh: THREE.Mesh;
  startScale: number;
  endScale: number;
  startTime: number;
  fadingIn: boolean;
}

class VoxelFlowApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private canvas: HTMLCanvasElement;

  private gridController: GridController;
  private toolManager: ToolManager;
  private uiPanel: UIPanel;

  private voxelGroup: THREE.Group;
  private voxelMeshes: Map<string, THREE.Mesh> = new Map();
  private previewGroup: THREE.Group;
  private gridHelper: THREE.LineSegments;

  private animatingVoxels: AnimVoxel[] = [];
  private clock: THREE.Clock;

  private mouseX: number = 0;
  private mouseY: number = 0;
  private mouseInCanvas: boolean = false;

  constructor() {
    this.clock = new THREE.Clock();
    this.gridController = new GridController();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1b26);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(GRID_SIZE * 0.8, GRID_SIZE * 0.7, GRID_SIZE * 1.0);

    this.canvas = document.createElement('canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = false;
    document.body.appendChild(this.canvas);
    this.canvas.style.display = 'block';
    this.canvas.style.position = 'absolute';
    this.canvas.style.top = '0';
    this.canvas.style.left = '0';

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.rotateSpeed = 0.5;
    this.controls.zoomSpeed = 1.0;
    this.controls.panSpeed = 1.0;
    this.controls.mouseButtons = {
      LEFT: null as any,
      MIDDLE: THREE.MOUSE.ROTATE,
      RIGHT: THREE.MOUSE.PAN
    };
    this.controls.touches = {
      ONE: null as any,
      TWO: THREE.TOUCH.ROTATE
    };
    this.controls.minDistance = GRID_SIZE * 0.3;
    this.controls.maxDistance = GRID_SIZE * 2.0;
    this.controls.target.set(GRID_SIZE / 2, GRID_SIZE / 2, GRID_SIZE / 2);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(10, 20, 10);
    this.scene.add(dirLight);

    this.gridHelper = this.createGridHelper();
    this.scene.add(this.gridHelper);

    this.voxelGroup = new THREE.Group();
    this.scene.add(this.voxelGroup);

    this.previewGroup = new THREE.Group();
    this.scene.add(this.previewGroup);

    this.uiPanel = new UIPanel({
      onColorChange: (color) => this.toolManager.setColor(color),
      onToolChange: (tool) => this.toolManager.setTool(tool),
      onUndo: () => this.handleUndo(),
      onRedo: () => this.handleRedo(),
      onExport: () => this.handleExport(),
      onBrushSizeChange: (size) => this.toolManager.setBrushSize(size)
    });

    this.toolManager = new ToolManager(
      this.gridController,
      this.camera,
      this.canvas,
      this.voxelGroup,
      {
        onGridChanged: () => this.rebuildVoxelMeshes(),
        onBrushHint: () => this.uiPanel.showBrushHint()
      }
    );

    this.bindEvents();
    this.rebuildVoxelMeshes();
    this.animate();
  }

  private createGridHelper(): THREE.LineSegments {
    const size = GRID_SIZE;
    const half = size / 2;
    const color = new THREE.Color(0x333344);
    const vertices: number[] = [];
    const colors: number[] = [];

    for (let i = 0; i <= size; i++) {
      vertices.push(-half, -half, i - half);
      vertices.push(half, -half, i - half);
      colors.push(color.r, color.g, color.b);
      colors.push(color.r, color.g, color.b);

      vertices.push(-half, i - half, -half);
      vertices.push(half, i - half, -half);
      colors.push(color.r, color.g, color.b);
      colors.push(color.r, color.g, color.b);

      vertices.push(i - half, -half, -half);
      vertices.push(i - half, half, -half);
      colors.push(color.r, color.g, color.b);
      colors.push(color.r, color.g, color.b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.3
    });

    const lines = new THREE.LineSegments(geometry, material);
    lines.position.set(half, half, half);
    lines.name = 'gridHelper';

    return lines;
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.onResize());

    this.canvas.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
      this.mouseInCanvas = true;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.mouseInCanvas = false;
      this.clearPreview();
    });

    this.canvas.addEventListener('mouseenter', () => {
      this.mouseInCanvas = true;
    });

    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.handleUndo();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        this.handleRedo();
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        this.handleRedo();
      }
      if (e.key === '1') this.toolManager.setTool('single');
      if (e.key === '2') this.toolManager.setTool('sphere');
      if (e.key === '3') this.toolManager.setTool('fill');
    });

    this.canvas.addEventListener('wheel', (e) => {
      if (!e.ctrlKey && !e.metaKey) {
        e.stopPropagation();
      }
    }, { passive: true });
  }

  private handleUndo(): void {
    const state = this.gridController.undo();
    if (state) {
      this.animateUndoRedo(state.added, state.removed, false);
    }
  }

  private handleRedo(): void {
    const state = this.gridController.redo();
    if (state) {
      this.animateUndoRedo(state.removed, state.added, true);
    }
  }

  private animateUndoRedo(removed: Voxel[], added: Voxel[], isRedo: boolean): void {
    const now = performance.now();

    for (const v of removed) {
      const key = `${v.x},${v.y},${v.z}`;
      const mesh = this.voxelMeshes.get(key);
      if (mesh) {
        this.animatingVoxels.push({
          mesh,
          startScale: 1,
          endScale: 0,
          startTime: now,
          fadingIn: false
        });
      }
    }

    for (const v of added) {
      const mesh = this.createVoxelMesh(v.x, v.y, v.z, v.color);
      mesh.scale.set(0, 0, 0);
      this.voxelGroup.add(mesh);
      const key = `${v.x},${v.y},${v.z}`;
      this.voxelMeshes.set(key, mesh);
      this.animatingVoxels.push({
        mesh,
        startScale: 0,
        endScale: 1,
        startTime: now,
        fadingIn: true
      });
    }

    setTimeout(() => {
      this.rebuildVoxelMeshes();
    }, ANIM_DURATION * 1000 + 20);
  }

  private handleExport(): void {
    const objContent = this.gridController.exportOBJ();
    const blob = new Blob([objContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'voxelflow_export.obj';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private createVoxelMesh(x: number, y: number, z: number, color: string): THREE.Mesh {
    const geometry = new THREE.BoxGeometry(0.98, 0.98, 0.98);
    const matColor = new THREE.Color(color);
    const material = new THREE.MeshLambertMaterial({ color: matColor });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    return mesh;
  }

  private rebuildVoxelMeshes(): void {
    while (this.voxelGroup.children.length > 0) {
      const child = this.voxelGroup.children[0];
      this.voxelGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    }
    this.voxelMeshes.clear();
    this.animatingVoxels = [];

    const voxels = this.gridController.getAllVoxels();
    if (voxels.length === 0) return;

    const colorGroups: Map<string, { positions: number[]; normals: number[]; indices: number[] }> = new Map();

    const cornerOffsets = [
      [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
      [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]
    ];

    const faceIndices = [
      [0, 1, 2, 3],
      [5, 4, 7, 6],
      [4, 0, 3, 7],
      [1, 5, 6, 2],
      [4, 5, 1, 0],
      [3, 2, 6, 7]
    ];

    const faceNormals = [
      [0, 0, -1],
      [0, 0, 1],
      [-1, 0, 0],
      [1, 0, 0],
      [0, -1, 0],
      [0, 1, 0]
    ];

    const isExposed = (x: number, y: number, z: number, dx: number, dy: number, dz: number): boolean => {
      return !this.gridController.inBounds(x + dx, y + dy, z + dz) ||
        !this.gridController.getVoxel(x + dx, y + dy, z + dz);
    };

    for (const voxel of voxels) {
      const { x, y, z, color } = voxel;
      const key = color;

      if (!colorGroups.has(key)) {
        colorGroups.set(key, { positions: [], normals: [], indices: [] });
      }
      const group = colorGroups.get(key)!;

      for (let fi = 0; fi < 6; fi++) {
        const [fdx, fdy, fdz] = faceNormals[fi];
        if (!isExposed(x, y, z, fdx, fdy, fdz)) continue;

        const [nx, ny, nz] = faceNormals[fi];
        const baseIdx = group.positions.length / 3;

        for (const vi of faceIndices[fi]) {
          const [ox, oy, oz] = cornerOffsets[vi];
          group.positions.push(x + ox, y + oy, z + oz);
          group.normals.push(nx, ny, nz);
        }

        group.indices.push(baseIdx, baseIdx + 1, baseIdx + 2);
        group.indices.push(baseIdx, baseIdx + 2, baseIdx + 3);
      }
    }

    for (const [color, data] of colorGroups) {
      if (data.positions.length === 0) continue;

      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.Float32BufferAttribute(data.positions, 3));
      geometry.setAttribute('normal', new THREE.Float32BufferAttribute(data.normals, 3));
      geometry.setIndex(data.indices);

      const matColor = new THREE.Color(color);
      const material = new THREE.MeshLambertMaterial({ color: matColor });
      const mesh = new THREE.Mesh(geometry, material);
      this.voxelGroup.add(mesh);
    }
  }

  private clearPreview(): void {
    while (this.previewGroup.children.length > 0) {
      const child = this.previewGroup.children[0];
      this.previewGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (child.material instanceof THREE.Material) {
          child.material.dispose();
        }
      }
    }
  }

  private updatePreview(): void {
    if (!this.mouseInCanvas) {
      this.clearPreview();
      return;
    }

    this.clearPreview();

    const hit = this.toolManager.raycastVoxel(this.mouseX, this.mouseY);
    if (!hit.hit) return;

    const previewVoxels = this.toolManager.getBrushPreviewVoxels(hit);

    for (const v of previewVoxels) {
      if (!this.gridController.inBounds(v.x, v.y, v.z)) continue;

      const geometry = new THREE.BoxGeometry(0.98, 0.98, 0.98);
      let material: THREE.Material;

      if (v.color.startsWith('rgba') || v.color.includes('rgba')) {
        const match = v.color.match(/rgba?\(([^)]+)\)/);
        if (match) {
          const parts = match[1].split(',').map(s => s.trim());
          const r = parseInt(parts[0]) / 255;
          const g = parseInt(parts[1]) / 255;
          const b = parseInt(parts[2]) / 255;
          const a = parts.length > 3 ? parseFloat(parts[3]) : 0.4;
          material = new THREE.MeshBasicMaterial({
            color: new THREE.Color(r, g, b),
            transparent: true,
            opacity: a,
            wireframe: false
          });
        } else {
          material = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.3 });
        }
      } else {
        material = new THREE.MeshBasicMaterial({
          color: new THREE.Color(v.color),
          transparent: true,
          opacity: 0.4,
          wireframe: false
        });
      }

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(v.x + 0.5, v.y + 0.5, v.z + 0.5);
      this.previewGroup.add(mesh);
    }
  }

  private updateAnimations(dt: number): void {
    const now = performance.now();
    const toRemove: number[] = [];

    for (let i = 0; i < this.animatingVoxels.length; i++) {
      const av = this.animatingVoxels[i];
      const elapsed = (now - av.startTime) / 1000;
      const t = Math.min(1, elapsed / ANIM_DURATION);

      const scale = av.startScale + (av.endScale - av.startScale) * t;
      av.mesh.scale.set(scale, scale, scale);

      if (t >= 1) {
        toRemove.push(i);
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      const idx = toRemove[i];
      const av = this.animatingVoxels[idx];
      if (!av.fadingIn) {
        av.mesh.visible = false;
      }
      this.animatingVoxels.splice(idx, 1);
    }
  }

  private onResize(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const dt = this.clock.getDelta();

    this.controls.update();
    this.updateAnimations(dt);
    this.updatePreview();

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new VoxelFlowApp();
});
