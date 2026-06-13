import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GridController, Voxel } from './GridController';
import { ToolManager } from './ToolManager';
import { UIPanel } from './UIPanel';

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

  private materialCache: Map<string, THREE.MeshLambertMaterial> = new Map();
  private sharedGeometry: THREE.BoxGeometry;

  constructor() {
    this.clock = new THREE.Clock();
    this.gridController = new GridController();
    this.sharedGeometry = new THREE.BoxGeometry(0.96, 0.96, 0.96);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1b26);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(GRID_SIZE * 0.9, GRID_SIZE * 0.85, GRID_SIZE * 1.1);

    this.canvas = document.createElement('canvas');
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
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
    this.controls.maxDistance = GRID_SIZE * 2.5;
    this.controls.target.set(GRID_SIZE / 2, GRID_SIZE / 2, GRID_SIZE / 2);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.75);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.55);
    dirLight.position.set(20, 40, 30);
    this.scene.add(dirLight);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.25);
    dirLight2.position.set(-20, 10, -20);
    this.scene.add(dirLight2);

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
    const color = new THREE.Color(0x333344);
    const vertices: number[] = [];
    const colors: number[] = [];

    for (let i = 0; i <= size; i++) {
      vertices.push(0, 0, i); vertices.push(size, 0, i);
      colors.push(color.r, color.g, color.b); colors.push(color.r, color.g, color.b);
      vertices.push(0, i, 0); vertices.push(size, i, 0);
      colors.push(color.r, color.g, color.b); colors.push(color.r, color.g, color.b);
      vertices.push(i, 0, 0); vertices.push(i, size, 0);
      colors.push(color.r, color.g, color.b); colors.push(color.r, color.g, color.b);

      vertices.push(0, size, i); vertices.push(size, size, i);
      colors.push(color.r, color.g, color.b); colors.push(color.r, color.g, color.b);
      vertices.push(0, i, size); vertices.push(size, i, size);
      colors.push(color.r, color.g, color.b); colors.push(color.r, color.g, color.b);
      vertices.push(i, 0, size); vertices.push(i, size, size);
      colors.push(color.r, color.g, color.b); colors.push(color.r, color.g, color.b);

      vertices.push(0, i, 0); vertices.push(0, i, size);
      colors.push(color.r, color.g, color.b); colors.push(color.r, color.g, color.b);
      vertices.push(size, i, 0); vertices.push(size, i, size);
      colors.push(color.r, color.g, color.b); colors.push(color.r, color.g, color.b);
      vertices.push(i, 0, 0); vertices.push(i, 0, size);
      colors.push(color.r, color.g, color.b); colors.push(color.r, color.g, color.b);

      vertices.push(0, i, size); vertices.push(0, i, 0);
      colors.push(color.r, color.g, color.b); colors.push(color.r, color.g, color.b);
      vertices.push(size, i, size); vertices.push(size, i, 0);
      colors.push(color.r, color.g, color.b); colors.push(color.r, color.g, color.b);
      vertices.push(i, size, 0); vertices.push(i, size, size);
      colors.push(color.r, color.g, color.b); colors.push(color.r, color.g, color.b);
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.25
    });

    return new THREE.LineSegments(geometry, material);
  }

  private getOrCreateMaterial(colorHex: string): THREE.MeshLambertMaterial {
    if (!this.materialCache.has(colorHex)) {
      this.materialCache.set(colorHex, new THREE.MeshLambertMaterial({ color: new THREE.Color(colorHex) }));
    }
    return this.materialCache.get(colorHex)!;
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
      if (e.key.toLowerCase() === 'e') this.toolManager.setTool('eraser');
    });
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

  private animateUndoRedo(toRemove: Voxel[], toAdd: Voxel[], _isRedo: boolean): void {
    const now = performance.now();

    for (const v of toRemove) {
      const key = `${v.x},${v.y},${v.z}`;
      const mesh = this.voxelMeshes.get(key);
      if (mesh) {
        mesh.scale.set(1, 1, 1);
        this.animatingVoxels.push({
          mesh,
          startScale: 1,
          endScale: 0,
          startTime: now,
          fadingIn: false
        });
      }
    }

    for (const v of toAdd) {
      const key = `${v.x},${v.y},${v.z}`;
      let mesh = this.voxelMeshes.get(key);
      if (!mesh) {
        mesh = this.createVoxelMesh(v.x, v.y, v.z, v.color);
        this.voxelGroup.add(mesh);
        this.voxelMeshes.set(key, mesh);
      }
      mesh.scale.set(0, 0, 0);
      mesh.visible = true;
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
    }, ANIM_DURATION * 1000 + 50);
  }

  private handleExport(): void {
    const objContent = this.gridController.exportOBJ();
    const blob = new Blob([objContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voxelflow_${Date.now()}.obj`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private createVoxelMesh(x: number, y: number, z: number, color: string): THREE.Mesh {
    const material = this.getOrCreateMaterial(color);
    const mesh = new THREE.Mesh(this.sharedGeometry, material);
    mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
    return mesh;
  }

  private rebuildVoxelMeshes(): void {
    this.animatingVoxels = [];
    this.voxelMeshes.clear();

    while (this.voxelGroup.children.length > 0) {
      this.voxelGroup.remove(this.voxelGroup.children[0]);
    }

    const voxels = this.gridController.getAllVoxels();

    for (const v of voxels) {
      const key = `${v.x},${v.y},${v.z}`;
      const mesh = this.createVoxelMesh(v.x, v.y, v.z, v.color);
      this.voxelGroup.add(mesh);
      this.voxelMeshes.set(key, mesh);
    }
  }

  private clearPreview(): void {
    while (this.previewGroup.children.length > 0) {
      const child = this.previewGroup.children[0];
      this.previewGroup.remove(child);
      if (child instanceof THREE.Mesh) {
        if (child.material instanceof THREE.Material && child.material !== this.sharedGeometry) {
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
    const isErase = this.toolManager.isEraserMode();

    for (const v of previewVoxels) {
      if (!this.gridController.inBounds(v.x, v.y, v.z)) continue;

      const geometry = new THREE.BoxGeometry(0.96, 0.96, 0.96);
      const baseColor = new THREE.Color(v.color);

      const material = new THREE.MeshBasicMaterial({
        color: baseColor,
        transparent: true,
        opacity: isErase ? 0.35 : 0.45,
        depthWrite: false
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.set(v.x + 0.5, v.y + 0.5, v.z + 0.5);
      this.previewGroup.add(mesh);

      const edges = new THREE.LineSegments(
        new THREE.EdgesGeometry(geometry),
        new THREE.LineBasicMaterial({
          color: isErase ? 0xff3333 : 0xffffff,
          transparent: true,
          opacity: 0.7
        })
      );
      edges.position.copy(mesh.position);
      this.previewGroup.add(edges);
    }
  }

  private updateAnimations(): void {
    const now = performance.now();
    const stillAnimating: AnimVoxel[] = [];

    for (const av of this.animatingVoxels) {
      const elapsed = (now - av.startTime) / 1000;
      const t = Math.min(1, elapsed / ANIM_DURATION);
      const eased = 1 - Math.pow(1 - t, 3);
      const scale = av.startScale + (av.endScale - av.startScale) * eased;
      av.mesh.scale.set(scale, scale, scale);

      if (t < 1) {
        stillAnimating.push(av);
      } else {
        if (!av.fadingIn) {
          av.mesh.visible = false;
        }
      }
    }

    this.animatingVoxels = stillAnimating;
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

    this.controls.update();
    this.updateAnimations();
    this.updatePreview();

    this.renderer.render(this.scene, this.camera);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new VoxelFlowApp();
});
