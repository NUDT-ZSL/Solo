import * as THREE from 'three';
import { BrickType, BrickData, BrickMeshObject, createBrick, updateBrickMeshPosition, getTemplate, UNIT_SIZE } from './BrickFactory';
import { checkStability, findStablePosition, StabilityResult, getBuildSuggestion, checkPlacementValid } from './StabilityChecker';

export interface SceneCallbacks {
  onStabilityUpdate?: (result: StabilityResult) => void;
  onSelectionChange?: (brickId: string | null) => void;
  onBricksChange?: (count: number) => void;
}

export class SceneManager {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  bricks: Map<string, BrickMeshObject> = new Map();
  selectedBrickId: string | null = null;
  highlightMeshes: Map<string, THREE.Mesh> = new Map();
  unstableOverlayMeshes: Map<string, THREE.Mesh> = new Map();
  ghostMesh: THREE.Group | null = null;
  suggestionMesh: THREE.Group | null = null;

  cameraAngleX: number = Math.PI / 4;
  cameraAngleY: number = Math.PI / 4;
  cameraDistance: number = 20;
  cameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  isDraggingView: boolean = false;
  lastMouseX: number = 0;
  lastMouseY: number = 0;
  raycaster: THREE.Raycaster = new THREE.Raycaster();
  mouse: THREE.Vector2 = new THREE.Vector2();

  callbacks: SceneCallbacks;
  gridHelper: THREE.GridHelper | null = null;
  groundPlane: THREE.Mesh | null = null;
  private animationFrame: number | null = null;
  private unstableTimers: Map<string, number> = new Map();

  constructor(canvas: HTMLCanvasElement, container: HTMLElement, callbacks: SceneCallbacks = {}) {
    this.canvas = canvas;
    this.container = container;
    this.callbacks = callbacks;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1E1E2E);
    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this._setupLights();
    this._setupGrid();
    this._setupGround();
    this._setupEventListeners();
    this.updateCamera();
    this.resize();
    this.start();
  }

  private _setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.55);
    this.scene.add(ambient);
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.75);
    dirLight.position.set(10, 15, 8);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 60;
    dirLight.shadow.camera.left = -25;
    dirLight.shadow.camera.right = 25;
    dirLight.shadow.camera.top = 25;
    dirLight.shadow.camera.bottom = -25;
    this.scene.add(dirLight);
    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.2);
    fillLight.position.set(-8, 6, -5);
    this.scene.add(fillLight);
  }

  private _setupGrid(): void {
    const size = 30;
    const divisions = 30;
    const gridHelper = new THREE.GridHelper(size, divisions, 0x555577, 0x3A3A52);
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.55;
    this.gridHelper = gridHelper;
    this.scene.add(gridHelper);
  }

  private _setupGround(): void {
    const geo = new THREE.PlaneGeometry(60, 60);
    const mat = new THREE.MeshBasicMaterial({ color: 0x1E1E2E, transparent: true, opacity: 0 });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.001;
    ground.name = 'ground';
    this.groundPlane = ground;
    this.scene.add(ground);
  }

  private _setupEventListeners(): void {
    window.addEventListener('resize', this.resize);
    this.canvas.addEventListener('mousedown', this._onMouseDown);
    this.canvas.addEventListener('mousemove', this._onMouseMove);
    this.canvas.addEventListener('mouseup', this._onMouseUp);
    this.canvas.addEventListener('mouseleave', this._onMouseUp);
    this.canvas.addEventListener('wheel', this._onWheel, { passive: false });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  resize = (): void => {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.renderer.setSize(width, height, false);
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
  };

  updateCamera(): void {
    const x = this.cameraDistance * Math.sin(this.cameraAngleY) * Math.cos(this.cameraAngleX);
    const y = this.cameraDistance * Math.sin(this.cameraAngleX);
    const z = this.cameraDistance * Math.cos(this.cameraAngleY) * Math.cos(this.cameraAngleX);
    this.camera.position.set(
      this.cameraTarget.x + x,
      this.cameraTarget.y + y,
      this.cameraTarget.z + z
    );
    this.camera.lookAt(this.cameraTarget);
  }

  private _onMouseDown = (e: MouseEvent): void => {
    if (e.button !== 0 && e.button !== 2) return;
    this.isDraggingView = true;
    this.lastMouseX = e.clientX;
    this.lastMouseY = e.clientY;
  };

  private _onMouseMove = (e: MouseEvent): void => {
    if (this.isDraggingView) {
      const dx = e.clientX - this.lastMouseX;
      const dy = e.clientY - this.lastMouseY;
      this.cameraAngleY -= dx * 0.008;
      this.cameraAngleX += dy * 0.006;
      const minX = THREE.MathUtils.degToRad(-30);
      const maxX = THREE.MathUtils.degToRad(60);
      this.cameraAngleX = Math.max(minX, Math.min(maxX, this.cameraAngleX));
      this.lastMouseX = e.clientX;
      this.lastMouseY = e.clientY;
      this.updateCamera();
    }
  };

  private _onMouseUp = (_e: MouseEvent): void => {
    this.isDraggingView = false;
  };

  private _onWheel = (e: WheelEvent): void => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.12 : 0.88;
    this.cameraDistance = Math.max(6, Math.min(60, this.cameraDistance * factor));
    this.updateCamera();
  };

  private _updateMouse(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  getGroundIntersection(e: MouseEvent): { x: number; y: number; z: number } | null {
    this._updateMouse(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    if (!this.groundPlane) return null;
    const hits = this.raycaster.intersectObject(this.groundPlane);
    if (hits.length > 0) {
      const p = hits[0].point;
      return { x: p.x, y: 0, z: p.z };
    }
    return null;
  }

  getBrickAtPoint(e: MouseEvent): BrickMeshObject | null {
    this._updateMouse(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const brickMeshes: THREE.Object3D[] = [];
    for (const obj of this.bricks.values()) {
      brickMeshes.push(obj.mesh);
    }
    const hits = this.raycaster.intersectObjects(brickMeshes, true);
    for (const hit of hits) {
      let obj: THREE.Object3D | null = hit.object;
      while (obj) {
        if (obj.userData && obj.userData.brickId) {
          return this.bricks.get(obj.userData.brickId) || null;
        }
        obj = obj.parent;
      }
    }
    return null;
  }

  snapToGrid(pos: { x: number; y: number; z: number }): { x: number; y: number; z: number } {
    return {
      x: Math.round(pos.x / UNIT_SIZE) * UNIT_SIZE / UNIT_SIZE,
      y: Math.max(0, Math.round(pos.y / UNIT_SIZE) * UNIT_SIZE / UNIT_SIZE),
      z: Math.round(pos.z / UNIT_SIZE) * UNIT_SIZE / UNIT_SIZE,
    };
  }

  addBrick(type: BrickType, color: string, position: { x: number; y: number; z: number }, rotation: number = 0): BrickMeshObject | null {
    if (this.bricks.size >= 200) return null;
    const snapped = this.snapToGrid(position);
    const template = getTemplate(type);
    if (!template) return null;
    const testData: BrickData = {
      id: '__test__',
      type, color,
      position: snapped,
      rotation,
      width: template.width,
      depth: template.depth,
      height: template.height,
      isStable: true,
    };
    const allData = Array.from(this.bricks.values()).map(b => b.data);
    if (!checkPlacementValid(testData, allData)) {
      return null;
    }
    const obj = createBrick(type, color, snapped, rotation);
    this.bricks.set(obj.data.id, obj);
    this.scene.add(obj.mesh);
    obj.mesh.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    this._triggerStability();
    this.callbacks.onBricksChange?.(this.bricks.size);
    return obj;
  }

  removeBrick(id: string): boolean {
    const obj = this.bricks.get(id);
    if (!obj) return false;
    this.scene.remove(obj.mesh);
    this.bricks.delete(id);
    this._removeHighlight(id);
    this._removeUnstableOverlay(id);
    if (this.unstableTimers.has(id)) {
      window.clearTimeout(this.unstableTimers.get(id));
      this.unstableTimers.delete(id);
    }
    if (this.selectedBrickId === id) {
      this.selectBrick(null);
    }
    this._triggerStability();
    this.callbacks.onBricksChange?.(this.bricks.size);
    return true;
  }

  moveBrick(id: string, delta: { x?: number; y?: number; z?: number }): boolean {
    const obj = this.bricks.get(id);
    if (!obj) return false;
    const newPos = {
      x: obj.data.position.x + (delta.x || 0),
      y: obj.data.position.y + (delta.y || 0),
      z: obj.data.position.z + (delta.z || 0),
    };
    if (newPos.y < 0) return false;
    const testData: BrickData = { ...obj.data, position: newPos };
    const others = Array.from(this.bricks.values()).filter(b => b.data.id !== id).map(b => b.data);
    if (!checkPlacementValid(testData, others)) return false;
    obj.data.position = newPos;
    updateBrickMeshPosition(obj);
    this._updateHighlight(id);
    this._updateUnstableOverlay(id);
    this._triggerStability();
    return true;
  }

  rotateBrick(id: string): boolean {
    const obj = this.bricks.get(id);
    if (!obj) return false;
    const newRot = (obj.data.rotation + 90) % 360;
    const testData: BrickData = { ...obj.data, rotation: newRot };
    const others = Array.from(this.bricks.values()).filter(b => b.data.id !== id).map(b => b.data);
    if (!checkPlacementValid(testData, others)) return false;
    obj.data.rotation = newRot;
    updateBrickMeshPosition(obj);
    this._updateHighlight(id);
    this._updateUnstableOverlay(id);
    this._triggerStability();
    return true;
  }

  selectBrick(id: string | null): void {
    if (this.selectedBrickId && this.selectedBrickId !== id) {
      this._removeHighlight(this.selectedBrickId);
    }
    this.selectedBrickId = id;
    if (id) {
      this._addHighlight(id);
    }
    this.callbacks.onSelectionChange?.(id);
  }

  clearScene(): void {
    for (const id of Array.from(this.bricks.keys())) {
      this.removeBrick(id);
    }
  }

  private _addHighlight(id: string): void {
    const obj = this.bricks.get(id);
    if (!obj) return;
    this._removeHighlight(id);
    const fp = this._getBrickWorldSize(obj.data);
    const geo = new THREE.BoxGeometry(fp.w + 0.04, fp.h + 0.04, fp.d + 0.04);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xFFD700,
      transparent: true,
      opacity: 0,
      side: THREE.BackSide,
    });
    const highlight = new THREE.Mesh(geo, mat);
    highlight.position.copy(obj.mesh.position);
    highlight.position.y += fp.h / 2;
    highlight.rotation.y = obj.mesh.rotation.y;
    this.scene.add(highlight);
    this.highlightMeshes.set(id, highlight);
    this._animateHighlight(id);
  }

  private _animateHighlight(id: string): void {
    const mesh = this.highlightMeshes.get(id);
    if (!mesh) return;
    const start = performance.now();
    const duration = 200;
    const animate = () => {
      const elapsed = performance.now() - start;
      const t = Math.min(1, elapsed / duration);
      (mesh.material as THREE.MeshBasicMaterial).opacity = 0.35 * t;
      mesh.scale.setScalar(1 + 0.05 * (1 - t));
      if (t < 1 && this.highlightMeshes.has(id)) {
        requestAnimationFrame(animate);
      }
    };
    animate();
  }

  private _updateHighlight(id: string): void {
    const obj = this.bricks.get(id);
    const hl = this.highlightMeshes.get(id);
    if (!obj || !hl) return;
    const fp = this._getBrickWorldSize(obj.data);
    hl.position.copy(obj.mesh.position);
    hl.position.y += fp.h / 2;
    hl.rotation.y = obj.mesh.rotation.y;
  }

  private _removeHighlight(id: string): void {
    const mesh = this.highlightMeshes.get(id);
    if (mesh) {
      this.scene.remove(mesh);
      (mesh.geometry as THREE.BufferGeometry).dispose();
      (mesh.material as THREE.Material).dispose();
      this.highlightMeshes.delete(id);
    }
  }

  private _getBrickWorldSize(data: BrickData): { w: number; h: number; d: number } {
    const rot = ((data.rotation % 360) + 360) % 360;
    const w = (rot === 90 || rot === 270) ? data.depth : data.width;
    const d = (rot === 90 || rot === 270) ? data.width : data.depth;
    return { w: w * UNIT_SIZE, h: data.height * UNIT_SIZE, d: d * UNIT_SIZE };
  }

  private _triggerStability(): void {
    const data = Array.from(this.bricks.values()).map(b => b.data);
    const result = checkStability(data);
    this._applyStabilityResult(result);
    this.callbacks.onStabilityUpdate?.(result);
  }

  private _applyStabilityResult(result: StabilityResult): void {
    const unstableSet = new Set(result.unstableBrickIds);
    for (const id of this.bricks.keys()) {
      if (unstableSet.has(id)) {
        this._addUnstableOverlay(id);
        if (!this.unstableTimers.has(id)) {
          const timer = window.setTimeout(() => {
            this._handleUnstableBrick(id);
            this.unstableTimers.delete(id);
          }, 3000);
          this.unstableTimers.set(id, timer);
        }
      } else {
        this._removeUnstableOverlay(id);
        if (this.unstableTimers.has(id)) {
          window.clearTimeout(this.unstableTimers.get(id));
          this.unstableTimers.delete(id);
        }
      }
    }
  }

  private _handleUnstableBrick(id: string): void {
    const obj = this.bricks.get(id);
    if (!obj) return;
    const others = Array.from(this.bricks.values()).filter(b => b.data.id !== id).map(b => b.data);
    const stablePos = findStablePosition(obj.data, others);
    if (stablePos) {
      obj.data.position = stablePos;
      updateBrickMeshPosition(obj);
      this._updateHighlight(id);
      this._updateUnstableOverlay(id);
      this._triggerStability();
    } else {
      this._showToast('积木位置不稳定，请手动调整');
    }
  }

  private _showToast(msg: string): void {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  private _addUnstableOverlay(id: string): void {
    const obj = this.bricks.get(id);
    if (!obj) return;
    if (this.unstableOverlayMeshes.has(id)) return;
    const fp = this._getBrickWorldSize(obj.data);
    const geo = new THREE.BoxGeometry(fp.w + 0.02, fp.h + 0.02, fp.d + 0.02);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xE53935,
      transparent: true,
      opacity: 0.4,
      side: THREE.BackSide,
    });
    const overlay = new THREE.Mesh(geo, mat);
    overlay.position.copy(obj.mesh.position);
    overlay.position.y += fp.h / 2;
    overlay.rotation.y = obj.mesh.rotation.y;
    overlay.userData.blinkStart = performance.now();
    this.scene.add(overlay);
    this.unstableOverlayMeshes.set(id, overlay);
  }

  private _updateUnstableOverlay(id: string): void {
    const obj = this.bricks.get(id);
    const overlay = this.unstableOverlayMeshes.get(id);
    if (!obj || !overlay) return;
    const fp = this._getBrickWorldSize(obj.data);
    overlay.position.copy(obj.mesh.position);
    overlay.position.y += fp.h / 2;
    overlay.rotation.y = obj.mesh.rotation.y;
  }

  private _removeUnstableOverlay(id: string): void {
    const mesh = this.unstableOverlayMeshes.get(id);
    if (mesh) {
      this.scene.remove(mesh);
      (mesh.geometry as THREE.BufferGeometry).dispose();
      (mesh.material as THREE.Material).dispose();
      this.unstableOverlayMeshes.delete(id);
    }
  }

  setGhostBrick(type: BrickType, color: string, visible: boolean, position?: { x: number; y: number; z: number }, rotation: number = 0): void {
    if (this.ghostMesh) {
      this.scene.remove(this.ghostMesh);
      this.ghostMesh.traverse((c) => {
        if ((c as THREE.Mesh).geometry) ((c as THREE.Mesh).geometry as THREE.BufferGeometry).dispose();
        if ((c as THREE.Mesh).material) {
          const mats = (c as THREE.Mesh).material as THREE.Material | THREE.Material[];
          if (Array.isArray(mats)) mats.forEach(m => m.dispose());
          else mats.dispose();
        }
      });
      this.ghostMesh = null;
    }
    if (!visible) return;
    const pos = position || { x: 0, y: 0, z: 0 };
    const obj = createBrick(type, color, pos, rotation);
    obj.mesh.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.transparent = true;
        mat.opacity = 0.45;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      }
    });
    this.ghostMesh = obj.mesh;
    this.scene.add(this.ghostMesh);
  }

  updateGhostPosition(position: { x: number; y: number; z: number }): void {
    if (!this.ghostMesh) return;
    this.ghostMesh.position.set(position.x * UNIT_SIZE, position.y * UNIT_SIZE, position.z * UNIT_SIZE);
  }

  showSuggestion(type: BrickType, position: { x: number; y: number; z: number }, rotation: number = 0): void {
    this.hideSuggestion();
    const obj = createBrick(type, '#00FFFF', position, rotation);
    obj.mesh.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        mat.transparent = true;
        mat.opacity = 0.4;
        mat.emissive = new THREE.Color(0x00FFFF);
        mat.emissiveIntensity = 0.3;
        mesh.castShadow = false;
        mesh.receiveShadow = false;
      }
    });
    this.suggestionMesh = obj.mesh;
    this.scene.add(this.suggestionMesh);
  }

  hideSuggestion(): void {
    if (this.suggestionMesh) {
      this.scene.remove(this.suggestionMesh);
      this.suggestionMesh.traverse((c) => {
        if ((c as THREE.Mesh).geometry) ((c as THREE.Mesh).geometry as THREE.BufferGeometry).dispose();
        if ((c as THREE.Mesh).material) {
          const mats = (c as THREE.Mesh).material as THREE.Material | THREE.Material[];
          if (Array.isArray(mats)) mats.forEach(m => m.dispose());
          else mats.dispose();
        }
      });
      this.suggestionMesh = null;
    }
  }

  getBuildSuggestion(): { type: string; position: { x: number; y: number; z: number }; rotation: number } | null {
    const data = Array.from(this.bricks.values()).map(b => b.data);
    return getBuildSuggestion(data);
  }

  private _animate = (): void => {
    this.animationFrame = requestAnimationFrame(this._animate);
    const now = performance.now();
    for (const [, overlay] of this.unstableOverlayMeshes.entries()) {
      const t = (now % 1000) / 1000;
      const blink = 0.2 + 0.3 * Math.abs(Math.sin(t * Math.PI * 4));
      (overlay.material as THREE.MeshBasicMaterial).opacity = blink;
    }
    this.renderer.render(this.scene, this.camera);
  };

  start(): void {
    if (this.animationFrame == null) {
      this._animate();
    }
  }

  stop(): void {
    if (this.animationFrame != null) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
  }

  getBricksSnapshot(): BrickData[] {
    return Array.from(this.bricks.values()).map(b => JSON.parse(JSON.stringify(b.data)));
  }

  restoreBricksSnapshot(snapshot: BrickData[]): void {
    this.clearScene();
    for (const data of snapshot) {
      const obj = createBrick(data.type, data.color, data.position, data.rotation);
      obj.data.id = data.id;
      this.bricks.set(obj.data.id, obj);
      this.scene.add(obj.mesh);
      obj.mesh.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
      });
    }
    this._triggerStability();
    this.callbacks.onBricksChange?.(this.bricks.size);
  }

  dispose(): void {
    this.stop();
    window.removeEventListener('resize', this.resize);
    this.canvas.removeEventListener('mousedown', this._onMouseDown);
    this.canvas.removeEventListener('mousemove', this._onMouseMove);
    this.canvas.removeEventListener('mouseup', this._onMouseUp);
    this.canvas.removeEventListener('mouseleave', this._onMouseUp);
    this.canvas.removeEventListener('wheel', this._onWheel);
    for (const id of Array.from(this.bricks.keys())) this.removeBrick(id);
    this.renderer.dispose();
  }
}
