import * as THREE from 'three';
import { OrigamiModel, createModelByName, OrigamiState } from './origamiModel';
import { UIManager } from './ui';

class OrigamiApp {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  container: HTMLElement;
  model: OrigamiModel;
  ui: UIManager;
  raycaster: THREE.Raycaster;
  pointer: THREE.Vector2;
  isDraggingCamera = false;
  isDraggingCrease = false;
  isPanning = false;
  lastPointer = { x: 0, y: 0 };
  cameraDistance = 8;
  cameraTheta = Math.PI * 0.25;
  cameraPhi = Math.PI * 0.35;
  cameraTarget = new THREE.Vector3(0, 0.5, 0);
  selectedCreaseIndex = -1;
  creaseStartAngle = 0;
  dragStartPointer = { x: 0, y: 0 };
  batchMode = false;
  normalHelperGroup: THREE.Group | null = null;
  frameCount = 0;
  lastFpsUpdate = performance.now();
  fps = 60;

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.scene = new THREE.Scene();
    this.scene.background = this.createGradientBackground();
    this.camera = new THREE.PerspectiveCamera(
      45,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.updateCameraPosition();
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.container.appendChild(this.renderer.domElement);
    this.setupLights();
    this.setupGround();
    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    this.model = createModelByName('crane');
    this.model.saveState();
    this.scene.add(this.model.group);
    this.ui = new UIManager({
      onUnfold: () => this.handleUnfold(),
      onRestore: () => this.handleRestore(),
      onSave: () => this.handleSave(),
      onModelChange: (name) => this.handleModelChange(name)
    });
    this.bindEvents();
    this.updateUIStatus();
    this.animate();
  }

  createGradientBackground(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#2a2a2a');
    gradient.addColorStop(1, '#1a1a1a');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  setupLights(): void {
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(ambient);
    const dir1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dir1.position.set(Math.cos(Math.PI / 4) * 8, 8, Math.sin(Math.PI / 4) * 8);
    dir1.castShadow = true;
    dir1.shadow.mapSize.set(2048, 2048);
    dir1.shadow.camera.near = 0.5;
    dir1.shadow.camera.far = 30;
    dir1.shadow.camera.left = -8;
    dir1.shadow.camera.right = 8;
    dir1.shadow.camera.top = 8;
    dir1.shadow.camera.bottom = -8;
    dir1.shadow.bias = -0.0005;
    this.scene.add(dir1);
    const dir2 = new THREE.DirectionalLight(0xfff5e6, 0.5);
    dir2.position.set(Math.cos((3 * Math.PI) / 4) * 8, 6, Math.sin((3 * Math.PI) / 4) * 8);
    this.scene.add(dir2);
    const fill = new THREE.DirectionalLight(0x88aaff, 0.25);
    fill.position.set(0, -3, 5);
    this.scene.add(fill);
  }

  setupGround(): void {
    const groundGeo = new THREE.CircleGeometry(12, 64);
    const groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -1.8;
    ground.receiveShadow = true;
    this.scene.add(ground);
    const grid = new THREE.GridHelper(12, 24, 0x3a3a3a, 0x252525);
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.3;
    grid.position.y = -1.79;
    this.scene.add(grid);
  }

  updateCameraPosition(): void {
    const x = this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    const y = this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    this.camera.position.set(
      this.cameraTarget.x + x,
      this.cameraTarget.y + y,
      this.cameraTarget.z + z
    );
    this.camera.lookAt(this.cameraTarget);
  }

  bindEvents(): void {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', (e) => this.onPointerDown(e));
    canvas.addEventListener('pointermove', (e) => this.onPointerMove(e));
    canvas.addEventListener('pointerup', (e) => this.onPointerUp(e));
    canvas.addEventListener('pointerleave', () => {
      this.isDraggingCamera = false;
      this.isDraggingCrease = false;
      this.isPanning = false;
    });
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('resize', () => this.onResize());
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Shift') this.batchMode = true;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (!this.model.isAnimating) {
          if (this.model.undo()) {
            this.updateUIStatus();
          }
        }
      }
    });
    document.addEventListener('keyup', (e) => {
      if (e.key === 'Shift') this.batchMode = false;
    });
  }

  onPointerDown(e: PointerEvent): void {
    if (this.model.isAnimating) return;
    const canvas = this.renderer.domElement;
    canvas.setPointerCapture(e.pointerId);
    this.lastPointer = { x: e.clientX, y: e.clientY };
    this.dragStartPointer = { x: e.clientX, y: e.clientY };
    this.updatePointer(e);
    this.raycaster.setFromCamera(this.pointer, this.camera);
    if (e.button === 2) {
      this.isPanning = true;
      return;
    }
    const creaseHit = this.raycastCrease();
    if (creaseHit >= 0) {
      this.isDraggingCrease = true;
      this.selectedCreaseIndex = creaseHit;
      this.creaseStartAngle = this.model.creases[creaseHit].angle;
      this.model.pushHistory();
      const c = this.model.creases[creaseHit];
      this.ui.showCreaseInfo(creaseHit, c.angle, c.groupId);
      return;
    }
    const faceHit = this.raycastFace();
    if (faceHit >= 0) {
      this.handleFaceClick(faceHit);
      if (e.button === 0) {
        this.isDraggingCamera = true;
      }
      return;
    }
    if (e.button === 0) {
      this.isDraggingCamera = true;
      this.model.highlightFace(-1);
      this.hideNormalHelper();
    }
  }

  onPointerMove(e: PointerEvent): void {
    const dx = e.clientX - this.lastPointer.x;
    const dy = e.clientY - this.lastPointer.y;
    this.lastPointer = { x: e.clientX, y: e.clientY };
    if (this.isDraggingCrease && this.selectedCreaseIndex >= 0) {
      const totalDragX = e.clientX - this.dragStartPointer.x;
      const deltaAngle = totalDragX * 0.6;
      let newAngle = THREE.MathUtils.clamp(this.creaseStartAngle + deltaAngle, 0, 180);
      const c = this.model.creases[this.selectedCreaseIndex];
      if (this.batchMode && c.groupId > 0) {
        this.model.setCreaseAngleBatch(c.groupId, newAngle);
      } else {
        for (let i = 0; i < this.model.creases.length; i++) {
          const cc = this.model.creases[i];
          cc.angle = cc.targetAngle;
        }
        c.targetAngle = newAngle;
        c.angle = newAngle;
        this.model.reconstructFromBase();
      }
      this.ui.showCreaseInfo(this.selectedCreaseIndex, c.angle, c.groupId);
      this.updateUIStatus();
      return;
    }
    if (this.isDraggingCamera) {
      this.cameraTheta -= dx * 0.005;
      this.cameraPhi = THREE.MathUtils.clamp(
        this.cameraPhi - dy * 0.005,
        0.05,
        Math.PI - 0.05
      );
      this.updateCameraPosition();
      return;
    }
    if (this.isPanning) {
      const panScale = this.cameraDistance * 0.0015;
      const right = new THREE.Vector3();
      const up = new THREE.Vector3(0, 1, 0);
      this.camera.getWorldDirection(right);
      right.cross(up).normalize();
      this.cameraTarget.addScaledVector(right, -dx * panScale);
      this.cameraTarget.y += dy * panScale;
      this.updateCameraPosition();
      return;
    }
    this.updatePointer(e);
    this.hoverHighlight();
  }

  onPointerUp(e: PointerEvent): void {
    const canvas = this.renderer.domElement;
    try { canvas.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    const totalMoved =
      Math.abs(e.clientX - this.dragStartPointer.x) +
      Math.abs(e.clientY - this.dragStartPointer.y);
    if (this.isDraggingCrease && totalMoved > 2) {
      this.isDraggingCrease = false;
      this.selectedCreaseIndex = -1;
      this.updateUIStatus();
      return;
    }
    this.isDraggingCamera = false;
    this.isDraggingCrease = false;
    this.isPanning = false;
    this.selectedCreaseIndex = -1;
  }

  onWheel(e: WheelEvent): void {
    e.preventDefault();
    const scale = Math.exp(e.deltaY * 0.001);
    this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance * scale, 2.5, 25);
    this.updateCameraPosition();
  }

  onResize(): void {
    this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
  }

  updatePointer(e: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  raycastCrease(): number {
    const creaseLines = this.model.creaseLines;
    const hits = this.raycaster.intersectObject(creaseLines, false);
    if (hits.length > 0 && hits[0].distance < 12) {
      const hit = hits[0];
      const point = hit.point.clone();
      this.model.group.worldToLocal(point);
      const closest = this.model.getClosestCrease(point, 0.3);
      if (closest) return closest.index;
    }
    return -1;
  }

  raycastFace(): number {
    const mesh = this.model.mesh;
    const hits = this.raycaster.intersectObject(mesh, false);
    if (hits.length > 0 && hits[0].face) {
      const faceIdx = Math.floor(hits[0].faceIndex! / 3);
      if (faceIdx >= 0 && faceIdx < this.model.faces.length) {
        return faceIdx;
      }
    }
    return -1;
  }

  hoverHighlight(): void {
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const creaseIdx = this.raycastCrease();
    if (creaseIdx >= 0) {
      const c = this.model.creases[creaseIdx];
      this.ui.showCreaseInfo(creaseIdx, c.angle, c.groupId);
      this.renderer.domElement.style.cursor = 'ew-resize';
      return;
    }
    const faceIdx = this.raycastFace();
    if (faceIdx >= 0) {
      this.renderer.domElement.style.cursor = 'pointer';
      return;
    }
    this.renderer.domElement.style.cursor = this.isDraggingCamera ? 'grabbing' : 'grab';
  }

  handleFaceClick(faceIndex: number): void {
    this.model.highlightFace(faceIndex);
    const info = this.model.getFaceInfo(faceIndex);
    if (info) {
      this.ui.showFaceInfo(faceIndex, info.normal, info.adjacentFaces, info.area);
      this.showNormalHelper(faceIndex);
    }
  }

  showNormalHelper(faceIndex: number): void {
    this.hideNormalHelper();
    this.normalHelperGroup = new THREE.Group();
    const f = this.model.faces[faceIndex];
    const va = this.model.vertices[f.indices[0]].position;
    const vb = this.model.vertices[f.indices[1]].position;
    const vc = this.model.vertices[f.indices[2]].position;
    const center = new THREE.Vector3().add(va).add(vb).add(vc).divideScalar(3);
    const arrow = new THREE.ArrowHelper(
      f.normal.clone().normalize(),
      center.clone(),
      1.0,
      0x00ff88,
      0.25,
      0.12
    );
    this.normalHelperGroup.add(arrow);
    const dotGeo = new THREE.SphereGeometry(0.04, 16, 16);
    const dotMat = new THREE.MeshBasicMaterial({ color: 0xffeb99 });
    const dot = new THREE.Mesh(dotGeo, dotMat);
    dot.position.copy(center);
    this.normalHelperGroup.add(dot);
    this.model.group.add(this.normalHelperGroup);
  }

  hideNormalHelper(): void {
    if (this.normalHelperGroup) {
      this.model.group.remove(this.normalHelperGroup);
      this.normalHelperGroup = null;
    }
    this.ui.hideFaceInfo();
  }

  handleUnfold(): void {
    if (this.model.isAnimating) return;
    this.model.pushHistory();
    this.model.unfold(1000);
    this.updateUIStatus();
  }

  handleRestore(): void {
    if (this.model.isAnimating) return;
    this.model.restore(300);
    this.updateUIStatus();
  }

  handleSave(): void {
    const state = this.model.saveState();
    try {
      localStorage.setItem('origami_save_' + this.model.name, JSON.stringify(state));
    } catch { /* ignore */ }
    const blob = new Blob([this.model.exportJSON()], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `origami_${this.model.name}_${new Date().toISOString().slice(0, 10)}.json`;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    }, 100);
    this.updateUIStatus();
  }

  handleModelChange(name: string): void {
    if (this.model.name === name) return;
    this.scene.remove(this.model.group);
    this.hideNormalHelper();
    this.model = createModelByName(name);
    this.model.saveState();
    try {
      const saved = localStorage.getItem('origami_save_' + name);
      if (saved) {
        const state = JSON.parse(saved) as OrigamiState;
        this.model.savedState = state;
      }
    } catch { /* ignore */ }
    this.scene.add(this.model.group);
    this.model.highlightFace(-1);
    this.updateUIStatus();
  }

  updateUIStatus(): void {
    this.ui.updateStatus(this.model.getActiveCreaseCount(), this.model.getUndoCount());
  }

  animate = (): void => {
    requestAnimationFrame(this.animate);
    this.frameCount++;
    const now = performance.now();
    if (now - this.lastFpsUpdate > 500) {
      this.fps = Math.round((this.frameCount * 1000) / (now - this.lastFpsUpdate));
      this.frameCount = 0;
      this.lastFpsUpdate = now;
    }
    if (this.model.isAnimating) {
      const still = this.model.updateAnimation();
      if (!still) this.updateUIStatus();
    }
    if (this.normalHelperGroup) {
      this.normalHelperGroup.updateMatrixWorld(true);
    }
    this.renderer.render(this.scene, this.camera);
  };
}

window.addEventListener('DOMContentLoaded', () => {
  new OrigamiApp();
});
