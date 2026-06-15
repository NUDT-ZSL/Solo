declare const THREE: any;
import { BrickType, BRICK_LIBRARY, WARNING_THRESHOLD, MAX_BRICKS } from './types';
import { BrickFactory } from './BrickFactory';
import { BrickManager } from './BrickManager';

export interface UIManagerCallbacks {
  onBrickSelected: (type: BrickType | null) => void;
  onUndoRequested: () => void;
  onClearRequested: () => void;
  onDeleteBrick: (id: string) => void;
}

interface ThumbnailScene {
  scene: any;
  camera: any;
  renderer: any;
  controls: any;
  animateId: number;
}

export class UIManager {
  private factory: BrickFactory;
  private brickManager: BrickManager;
  private callbacks: UIManagerCallbacks;
  private camera: any;
  private domElement: any;
  private controls: any;
  private scene: any;
  private groundPlane: any;

  private selectedBrickType: BrickType | null = null;
  private ghostBrick: any = null;
  private selectedBrickId: string | null = null;
  private selectedWireframe: any = null;
  private raycaster: any;
  private mouse: any;

  private thumbnailScenes: Map<BrickType, ThumbnailScene> = new Map();
  private isPlacing = false;

  private onMouseDownHandler: ((e: MouseEvent) => void) | null = null;
  private onMouseMoveHandler: ((e: MouseEvent) => void) | null = null;
  private onMouseUpHandler: ((e: MouseEvent) => void) | null = null;
  private onKeyDownHandler: ((e: KeyboardEvent) => void) | null = null;
  private onContextMenuHandler: ((e: MouseEvent) => void) | null = null;

  constructor(
    factory: BrickFactory,
    brickManager: BrickManager,
    callbacks: UIManagerCallbacks,
    camera: any,
    domElement: any,
    controls: any,
    scene: any,
    groundPlane: any
  ) {
    this.factory = factory;
    this.brickManager = brickManager;
    this.callbacks = callbacks;
    this.camera = camera;
    this.domElement = domElement;
    this.controls = controls;
    this.scene = scene;
    this.groundPlane = groundPlane;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
  }

  init(): void {
    this.renderBrickLibrary();
    this.bindToolbarEvents();
    this.bindSceneEvents();
    this.updateBrickCount(this.brickManager.getBrickCount(), MAX_BRICKS, WARNING_THRESHOLD);
  }

  private renderBrickLibrary(): void {
    const list = document.getElementById('brick-list');
    if (!list) return;

    list.innerHTML = '';

    BRICK_LIBRARY.forEach((info) => {
      const item = document.createElement('div');
      item.className = 'brick-item';
      item.dataset.brickType = info.type;

      const thumbnail = document.createElement('div');
      thumbnail.className = 'brick-thumbnail';
      thumbnail.id = `thumb-${info.type}`;

      const name = document.createElement('div');
      name.className = 'brick-name';
      name.textContent = info.name;

      item.appendChild(thumbnail);
      item.appendChild(name);

      item.addEventListener('click', () => {
        this.selectBrick(info.type, item);
      });

      list.appendChild(item);
    });

    requestAnimationFrame(() => {
      BRICK_LIBRARY.forEach((info) => {
        const thumbEl = document.getElementById(`thumb-${info.type}`);
        if (thumbEl) {
          this.createThumbnailScene(info.type, thumbEl);
        }
      });
    });
  }

  private createThumbnailScene(type: BrickType, container: HTMLElement): void {
    const scene = new THREE.Scene();
    const width = container.clientWidth || 196;
    const height = container.clientHeight || 120;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(2.5, 2, 2.5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.6);
    dirLight.position.set(3, 5, 3);
    scene.add(dirLight);

    const brick = this.factory.createPreviewBrick(type);
    brick.position.y = 0;
    scene.add(brick);

    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.1;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.minPolarAngle = Math.PI / 6;
    controls.maxPolarAngle = Math.PI / 2.2;
    controls.minAzimuthAngle = -Math.PI;
    controls.maxAzimuthAngle = Math.PI;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 1.5;

    const animate = () => {
      controls.update();
      renderer.render(scene, camera);
    };

    const animateId = this.startThumbnailAnimation(animate);

    this.thumbnailScenes.set(type, { scene, camera, renderer, controls, animateId });

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: w, height: h } = entry.contentRect;
        if (w > 0 && h > 0) {
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        }
      }
    });
    resizeObserver.observe(container);
  }

  private startThumbnailAnimation(fn: () => void): number {
    let id = 0;
    const loop = () => {
      fn();
      id = requestAnimationFrame(loop);
    };
    id = requestAnimationFrame(loop);
    return id;
  }

  private selectBrick(type: BrickType, element: HTMLElement): void {
    document.querySelectorAll('.brick-item').forEach(el => {
      el.classList.remove('selected');
    });
    element.classList.add('selected');

    this.selectedBrickType = type;
    this.deselectBrick();

    if (this.ghostBrick) {
      this.scene.remove(this.ghostBrick);
      this.ghostBrick = null;
    }

    this.ghostBrick = this.factory.createGhostBrick(type);
    this.scene.add(this.ghostBrick);
    this.ghostBrick.visible = false;

    this.callbacks.onBrickSelected(type);
    this.controls.enableRotate = false;
    this.controls.enablePan = false;
  }

  cancelPlacement(): void {
    this.selectedBrickType = null;
    document.querySelectorAll('.brick-item').forEach(el => {
      el.classList.remove('selected');
    });

    if (this.ghostBrick) {
      this.scene.remove(this.ghostBrick);
      this.ghostBrick = null;
    }

    this.controls.enableRotate = true;
    this.controls.enablePan = true;
    this.callbacks.onBrickSelected(null);
  }

  private bindToolbarEvents(): void {
    const undoBtn = document.getElementById('btn-undo');
    const clearBtn = document.getElementById('btn-clear');
    const modalOverlay = document.getElementById('modal-overlay');
    const modalCancel = document.getElementById('modal-cancel');
    const modalConfirm = document.getElementById('modal-confirm');

    if (undoBtn) {
      undoBtn.addEventListener('click', () => {
        this.callbacks.onUndoRequested();
      });
    }

    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        if (modalOverlay) modalOverlay.classList.add('visible');
      });
    }

    if (modalCancel && modalOverlay) {
      modalCancel.addEventListener('click', () => {
        modalOverlay.classList.remove('visible');
      });
    }

    if (modalConfirm && modalOverlay) {
      modalConfirm.addEventListener('click', () => {
        modalOverlay.classList.remove('visible');
        this.callbacks.onClearRequested();
      });
    }
  }

  private bindSceneEvents(): void {
    this.onMouseDownHandler = (e: MouseEvent) => {
      this.onMouseDown(e);
    };
    this.onMouseMoveHandler = (e: MouseEvent) => {
      this.onMouseMove(e);
    };
    this.onMouseUpHandler = (e: MouseEvent) => {
      this.onMouseUp(e);
    };
    this.onKeyDownHandler = (e: KeyboardEvent) => {
      this.onKeyDown(e);
    };
    this.onContextMenuHandler = (e: MouseEvent) => {
      e.preventDefault();
    };

    this.domElement.addEventListener('mousedown', this.onMouseDownHandler);
    this.domElement.addEventListener('mousemove', this.onMouseMoveHandler);
    this.domElement.addEventListener('mouseup', this.onMouseUpHandler);
    this.domElement.addEventListener('contextmenu', this.onContextMenuHandler);
    window.addEventListener('keydown', this.onKeyDownHandler);
  }

  private downPos: { x: number; y: number } | null = null;
  private wasDragging = false;

  private onMouseDown(e: MouseEvent): void {
    this.downPos = { x: e.clientX, y: e.clientY };
    this.wasDragging = false;
  }

  private onMouseMove(e: MouseEvent): void {
    if (this.downPos) {
      const dx = Math.abs(e.clientX - this.downPos.x);
      const dy = Math.abs(e.clientY - this.downPos.y);
      if (dx > 3 || dy > 3) {
        this.wasDragging = true;
      }
    }

    if (!this.selectedBrickType || !this.ghostBrick) return;

    this.updateMouse(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const targets: any[] = [this.groundPlane, ...this.brickManager.getPlacedMeshes()];
    const intersects = this.raycaster.intersectObjects(targets, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      this.ghostBrick.visible = true;

      let pos: any;
      if (hit.object === this.groundPlane) {
        pos = hit.point.clone();
        pos.y = 0.5;
      } else {
        pos = this.snapToTop(hit);
      }

      pos = this.snapToGrid(pos);
      this.ghostBrick.position.copy(pos);

      const collides = this.brickManager.checkCollision(this.selectedBrickType, pos);
      this.setGhostCollisionState(collides);
    } else {
      this.ghostBrick.visible = false;
    }
  }

  private onMouseUp(e: MouseEvent): void {
    if (this.downPos) {
      const dx = Math.abs(e.clientX - this.downPos.x);
      const dy = Math.abs(e.clientY - this.downPos.y);
      if (dx > 3 || dy > 3) {
        this.wasDragging = true;
      }
    }

    if (e.button === 2) {
      if (this.selectedBrickType) {
        this.cancelPlacement();
      }
      this.downPos = null;
      return;
    }

    if (this.wasDragging) {
      this.downPos = null;
      return;
    }

    if (this.selectedBrickType) {
      this.tryPlaceBrick(e);
    } else {
      this.trySelectBrick(e);
    }

    this.downPos = null;
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.key === 'z' || e.key === 'Z') {
      e.preventDefault();
      this.callbacks.onUndoRequested();
    } else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (this.selectedBrickId) {
        e.preventDefault();
        const id = this.selectedBrickId;
        this.deselectBrick();
        this.callbacks.onDeleteBrick(id);
      }
    } else if (e.key === 'Escape') {
      if (this.selectedBrickType) {
        this.cancelPlacement();
      }
      this.deselectBrick();
    }
  }

  private tryPlaceBrick(e: MouseEvent): void {
    if (!this.selectedBrickType) return;

    this.updateMouse(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const targets: any[] = [this.groundPlane, ...this.brickManager.getPlacedMeshes()];
    const intersects = this.raycaster.intersectObjects(targets, true);

    if (intersects.length === 0) return;

    const hit = intersects[0];
    let pos: any;

    if (hit.object === this.groundPlane) {
      pos = hit.point.clone();
      pos.y = 0.5;
    } else {
      pos = this.snapToTop(hit);
    }

    pos = this.snapToGrid(pos);
    const result = this.brickManager.addBrick(this.selectedBrickType, pos);

    if (result.success && result.mesh) {
      this.brickManager.animatePlaceIn(result.mesh);
    }
  }

  private trySelectBrick(e: MouseEvent): void {
    this.updateMouse(e);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    const meshes = this.brickManager.getPlacedMeshes();
    const intersects = this.raycaster.intersectObjects(meshes, true);

    if (intersects.length > 0) {
      let target = intersects[0].object;
      while (target && !target.userData?.brickId) {
        target = target.parent;
      }
      if (target && target.userData?.brickId) {
        this.selectBrickById(target.userData.brickId, target);
      }
    } else {
      this.deselectBrick();
    }
  }

  private selectBrickById(id: string, mesh: any): void {
    this.deselectBrick();
    this.selectedBrickId = id;

    this.selectedWireframe = this.factory.createWireframe(mesh);
    mesh.add(this.selectedWireframe);

    if (mesh.material) {
      mesh.userData.originalEmissive = mesh.material.emissive?.getHex?.() || 0;
      if (mesh.material.emissive) {
        mesh.material.emissive.setHex(0x333333);
      }
    }
  }

  deselectBrick(): void {
    if (this.selectedBrickId) {
      const mesh = this.brickManager.getBrickById(this.selectedBrickId);
      if (mesh && this.selectedWireframe) {
        mesh.remove(this.selectedWireframe);
      }
      if (mesh && mesh.material && mesh.userData.originalEmissive !== undefined) {
        if (mesh.material.emissive) {
          mesh.material.emissive.setHex(mesh.userData.originalEmissive);
        }
      }
      this.selectedWireframe = null;
      this.selectedBrickId = null;
    }
  }

  private snapToGrid(pos: any): any {
    return new THREE.Vector3(
      Math.round(pos.x),
      Math.round(pos.y * 2) / 2,
      Math.round(pos.z)
    );
  }

  private snapToTop(hit: any): any {
    let object = hit.object;
    while (object && !object.userData?.brickId) {
      object = object.parent;
    }
    if (!object) return hit.point.clone();

    const box = this.factory.getBoundingBoxWorld(object);
    const pos = hit.point.clone();
    pos.y = box.max.y + 0.5;
    return pos;
  }

  private setGhostCollisionState(collides: boolean): void {
    if (!this.ghostBrick) return;

    const material = this.ghostBrick.material;
    const wireframe = this.ghostBrick.children[0];

    if (collides) {
      if (material) {
        material.color.setHex(0xe74c3c);
        material.opacity = 0.4;
      }
      if (wireframe?.material) {
        wireframe.material.color.setHex(0xe74c3c);
      }
    } else {
      this.ghostBrick.material.color.setHex(this.getBrickColorHex(this.selectedBrickType!));
      material.opacity = 0.5;
      if (wireframe?.material) {
        wireframe.material.color.setHex(0xffffff);
      }
    }
  }

  private getBrickColorHex(type: BrickType): number {
    const info = BRICK_LIBRARY.find(b => b.type === type);
    if (!info) return 0xffffff;
    return new THREE.Color(info.color).getHex();
  }

  private updateMouse(e: MouseEvent): void {
    const rect = this.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  updateBrickCount(count: number, max: number, threshold: number): void {
    const warningBar = document.getElementById('warning-bar');
    if (warningBar) {
      if (count >= threshold) {
        warningBar.classList.add('visible');
        warningBar.textContent = `积木数量: ${count}/${max}，接近上限，请注意控制`;
      } else {
        warningBar.classList.remove('visible');
      }
    }
  }

  updateUndoButton(canUndo: boolean): void {
    const undoBtn = document.getElementById('btn-undo') as HTMLButtonElement;
    if (undoBtn) {
      undoBtn.disabled = !canUndo;
    }
  }

  destroy(): void {
    if (this.onMouseDownHandler) {
      this.domElement.removeEventListener('mousedown', this.onMouseDownHandler);
    }
    if (this.onMouseMoveHandler) {
      this.domElement.removeEventListener('mousemove', this.onMouseMoveHandler);
    }
    if (this.onMouseUpHandler) {
      this.domElement.removeEventListener('mouseup', this.onMouseUpHandler);
    }
    if (this.onKeyDownHandler) {
      window.removeEventListener('keydown', this.onKeyDownHandler);
    }
    if (this.onContextMenuHandler) {
      this.domElement.removeEventListener('contextmenu', this.onContextMenuHandler);
    }

    this.thumbnailScenes.forEach((scene) => {
      cancelAnimationFrame(scene.animateId);
      scene.controls.dispose();
      scene.renderer.dispose();
    });
    this.thumbnailScenes.clear();
  }
}
