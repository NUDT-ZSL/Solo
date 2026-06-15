import * as THREE from 'three';
import { MoleculeBuilder, MoleculeData } from './MoleculeBuilder';
import { GUIHandler } from './GUIHandler';

const PRESET_COLORS = [
  '#FF3333',
  '#3366FF',
  '#33CC33',
  '#FFCC00',
  '#9933FF',
  '#FF6600',
  '#888888',
  '#FFFFFF',
];

class App {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private moleculeBuilder: MoleculeBuilder;
  private guiHandler: GUIHandler;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private clock: THREE.Clock;

  private isRotating = false;
  private isPanning = false;
  private isDraggingAtom = false;
  private draggedAtomId: number | null = null;
  private previousMouse = new THREE.Vector2();
  private selectedAtomId: number | null = null;
  private firstSelectedAtom: number | null = null;

  private cameraDistance = 5;
  private cameraTheta = Math.PI / 4;
  private cameraPhi = Math.PI / 4;
  private cameraTarget = new THREE.Vector3(0, 0, 0);

  private addAtomMode = false;
  private pendingAtomColor = PRESET_COLORS[0];
  private pendingAtomRadius = 0.6;
  private pendingAtomPosition: THREE.Vector3 | null = null;

  private hintTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.clock = new THREE.Clock();
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();

    this.setupLights();
    this.setupGroundPlane();

    this.moleculeBuilder = new MoleculeBuilder(this.scene, this.camera);
    this.guiHandler = new GUIHandler(this.moleculeBuilder, this.camera, this.renderer);

    this.loadDefaultWaterMolecule();
    this.setupEventListeners();
    this.setupColorPicker();
    this.setupToolbar();
    this.setupControlBar();

    this.animate();
    window.addEventListener('resize', () => this.onWindowResize());
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#0B0E1A');
    scene.fog = new THREE.FogExp2('#0B0E1A', 0.02);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    const x = this.cameraTarget.x + this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    const y = this.cameraTarget.y + this.cameraDistance * Math.cos(this.cameraPhi);
    const z = this.cameraTarget.z + this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    camera.position.set(x, y, z);
    camera.lookAt(this.cameraTarget);
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const container = document.getElementById('canvas-container')!;
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
    return renderer;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight.position.set(5, 8, 5);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -10;
    dirLight.shadow.camera.right = 10;
    dirLight.shadow.camera.top = 10;
    dirLight.shadow.camera.bottom = -10;
    dirLight.shadow.bias = -0.0001;
    this.scene.add(dirLight);

    const fillLight = new THREE.DirectionalLight(0x6699ff, 0.3);
    fillLight.position.set(-5, 3, -5);
    this.scene.add(fillLight);

    const rimLight = new THREE.PointLight(0xff6699, 0.4, 20);
    rimLight.position.set(-3, 5, -3);
    this.scene.add(rimLight);
  }

  private setupGroundPlane(): void {
    const gridHelper = new THREE.GridHelper(20, 20, 0x222244, 0x111133);
    gridHelper.position.y = -3;
    gridHelper.material.opacity = 0.3;
    gridHelper.material.transparent = true;
    this.scene.add(gridHelper);
  }

  private loadDefaultWaterMolecule(): void {
    const oxygenId = this.moleculeBuilder.addAtom(
      new THREE.Vector3(0, 0, 0),
      0.6,
      '#FF3333',
      'O'
    );

    const bondLength = 1.0;
    const angleRad = (104.5 * Math.PI) / 180;
    const halfAngle = angleRad / 2;

    const h1Pos = new THREE.Vector3(
      bondLength * Math.sin(halfAngle),
      bondLength * Math.cos(halfAngle),
      0
    );
    const h2Pos = new THREE.Vector3(
      -bondLength * Math.sin(halfAngle),
      bondLength * Math.cos(halfAngle),
      0
    );

    const h1Id = this.moleculeBuilder.addAtom(h1Pos, 0.4, '#FFFFFF', 'H');
    const h2Id = this.moleculeBuilder.addAtom(h2Pos, 0.4, '#FFFFFF', 'H');

    this.moleculeBuilder.addBond(oxygenId, h1Id);
    this.moleculeBuilder.addBond(oxygenId, h2Id);

    this.guiHandler.resetView();
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
    canvas.addEventListener('mouseup', (e) => this.onMouseUp(e));
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.cancelAddAtomMode();
        this.clearSelection();
      }
      if (e.key === 'Delete' && this.selectedAtomId !== null) {
        this.moleculeBuilder.removeAtom(this.selectedAtomId);
        this.selectedAtomId = null;
      }
    });
  }

  private onMouseDown(event: MouseEvent): void {
    this.updateMouse(event);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    if (this.addAtomMode) {
      const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const intersectPoint = new THREE.Vector3();
      if (this.raycaster.ray.intersectPlane(plane, intersectPoint)) {
        this.pendingAtomPosition = intersectPoint;
        this.openAtomModal();
      }
      return;
    }

    const atomMeshes = Array.from(this.moleculeBuilder.atoms.values()).map((a) => a.mesh);
    const bondMeshes = Array.from(this.moleculeBuilder.bonds.values()).map((b) => b.mesh);

    const atomIntersects = this.raycaster.intersectObjects(atomMeshes);
    const bondIntersects = this.raycaster.intersectObjects(bondMeshes);

    if (event.ctrlKey && bondIntersects.length > 0) {
      const bondId = bondIntersects[0].object.userData.bondId as number;
      this.moleculeBuilder.removeBond(bondId);
      this.showHint('化学键已删除');
      return;
    }

    if (atomIntersects.length > 0 && event.button === 0) {
      const atomId = atomIntersects[0].object.userData.atomId as number;

      if (this.firstSelectedAtom === null) {
        this.firstSelectedAtom = atomId;
        this.selectedAtomId = atomId;
        this.highlightAtom(atomId, true);
        this.showHint('已选择第一个原子，点击第二个原子创建化学键');
      } else if (this.firstSelectedAtom !== atomId) {
        const bondId = this.moleculeBuilder.addBond(this.firstSelectedAtom, atomId);
        if (bondId !== null) {
          this.showHint('化学键创建成功');
        } else {
          this.showHint('化学键已存在或无效');
        }
        this.highlightAtom(this.firstSelectedAtom, false);
        this.firstSelectedAtom = null;
        this.selectedAtomId = atomId;
        this.highlightAtom(atomId, true);
      } else {
        this.isDraggingAtom = true;
        this.draggedAtomId = atomId;
        this.selectedAtomId = atomId;
        this.showCoordsDisplay(true);
      }
      this.previousMouse.copy(this.mouse);
      return;
    }

    if (event.button === 0) {
      this.isRotating = true;
      this.clearSelection();
    } else if (event.button === 2) {
      this.isPanning = true;
    }
    this.previousMouse.copy(this.mouse);
  }

  private onMouseMove(event: MouseEvent): void {
    this.updateMouse(event);

    if (this.isDraggingAtom && this.draggedAtomId !== null) {
      const atom = this.moleculeBuilder.atoms.get(this.draggedAtomId);
      if (atom) {
        const planeNormal = new THREE.Vector3();
        this.camera.getWorldDirection(planeNormal);
        planeNormal.negate();
        const plane = new THREE.Plane(planeNormal, -atom.mesh.position.dot(planeNormal));
        const intersectPoint = new THREE.Vector3();

        if (this.raycaster.ray.intersectPlane(plane, intersectPoint)) {
          this.moleculeBuilder.updateAtomPosition(this.draggedAtomId, intersectPoint);
          this.updateCoordsDisplay(intersectPoint);
        }
      }
      return;
    }

    const deltaX = this.mouse.x - this.previousMouse.x;
    const deltaY = this.mouse.y - this.previousMouse.y;

    if (this.isRotating) {
      this.cameraTheta -= deltaX * Math.PI * 0.5;
      this.cameraPhi = Math.max(
        0.01,
        Math.min(Math.PI - 0.01, this.cameraPhi - deltaY * Math.PI * 0.5)
      );
      this.updateCameraPosition();
    } else if (this.isPanning) {
      const panSpeed = this.cameraDistance * 0.002;
      const right = new THREE.Vector3();
      const up = new THREE.Vector3();
      this.camera.getWorldDirection(right);
      right.cross(this.camera.up).normalize();
      up.copy(this.camera.up);

      this.cameraTarget.addScaledVector(right, -deltaX * window.innerWidth * panSpeed);
      this.cameraTarget.addScaledVector(up, deltaY * window.innerHeight * panSpeed);
      this.updateCameraPosition();
    }

    this.previousMouse.copy(this.mouse);
  }

  private onMouseUp(_event: MouseEvent): void {
    this.isRotating = false;
    this.isPanning = false;
    if (this.isDraggingAtom) {
      this.isDraggingAtom = false;
      this.draggedAtomId = null;
      this.showCoordsDisplay(false);
    }
  }

  private onWheel(event: WheelEvent): void {
    event.preventDefault();
    this.cameraDistance *= 1 + event.deltaY * 0.001;
    this.cameraDistance = Math.max(1, Math.min(50, this.cameraDistance));
    this.updateCameraPosition();
  }

  private updateMouse(event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private updateCameraPosition(): void {
    const x =
      this.cameraTarget.x +
      this.cameraDistance * Math.sin(this.cameraPhi) * Math.sin(this.cameraTheta);
    const y = this.cameraTarget.y + this.cameraDistance * Math.cos(this.cameraPhi);
    const z =
      this.cameraTarget.z +
      this.cameraDistance * Math.sin(this.cameraPhi) * Math.cos(this.cameraTheta);
    this.camera.position.set(x, y, z);
    this.camera.lookAt(this.cameraTarget);
  }

  private highlightAtom(atomId: number, highlight: boolean): void {
    const atom = this.moleculeBuilder.atoms.get(atomId);
    if (!atom) return;
    const mat = atom.mesh.material as THREE.MeshStandardMaterial;
    if (highlight) {
      mat.emissiveIntensity = 0.5;
    } else {
      mat.emissiveIntensity = 0.1;
    }
  }

  private clearSelection(): void {
    if (this.firstSelectedAtom !== null) {
      this.highlightAtom(this.firstSelectedAtom, false);
      this.firstSelectedAtom = null;
    }
    if (this.selectedAtomId !== null) {
      this.highlightAtom(this.selectedAtomId, false);
      this.selectedAtomId = null;
    }
  }

  private setupColorPicker(): void {
    const container = document.getElementById('color-picker')!;
    PRESET_COLORS.forEach((color, idx) => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch' + (idx === 0 ? ' selected' : '');
      swatch.style.backgroundColor = color;
      swatch.dataset.color = color;
      swatch.addEventListener('click', () => {
        container.querySelectorAll('.color-swatch').forEach((el) => {
          el.classList.remove('selected');
        });
        swatch.classList.add('selected');
        this.pendingAtomColor = color;
      });
      container.appendChild(swatch);
    });

    const radiusSlider = document.getElementById('atom-radius') as HTMLInputElement;
    const radiusValue = document.getElementById('radius-value')!;
    radiusSlider.addEventListener('input', () => {
      this.pendingAtomRadius = parseFloat(radiusSlider.value);
      radiusValue.textContent = this.pendingAtomRadius.toFixed(2);
    });

    document.getElementById('btn-confirm-atom')!.addEventListener('click', () => {
      if (this.pendingAtomPosition) {
        this.moleculeBuilder.addAtom(
          this.pendingAtomPosition,
          this.pendingAtomRadius,
          this.pendingAtomColor
        );
      }
      this.closeAtomModal();
      this.cancelAddAtomMode();
    });

    document.getElementById('btn-cancel-atom')!.addEventListener('click', () => {
      this.closeAtomModal();
      this.cancelAddAtomMode();
    });
  }

  private setupToolbar(): void {
    const addBtn = document.getElementById('btn-add-atom')!;
    addBtn.addEventListener('click', () => {
      this.addAtomMode = !this.addAtomMode;
      addBtn.classList.toggle('active', this.addAtomMode);
      if (this.addAtomMode) {
        this.showHint('点击场景中的任意位置添加原子');
      } else {
        this.hideHint();
      }
    });

    document.getElementById('btn-delete')!.addEventListener('click', () => {
      if (this.selectedAtomId !== null) {
        this.moleculeBuilder.removeAtom(this.selectedAtomId);
        this.selectedAtomId = null;
        this.showHint('原子已删除');
      } else {
        this.showHint('请先选择一个原子');
      }
    });

    document.getElementById('btn-clear')!.addEventListener('click', () => {
      if (confirm('确定要清空所有原子和化学键吗？')) {
        this.moleculeBuilder.clearAll();
        this.showHint('已清空');
      }
    });
  }

  private setupControlBar(): void {
    const speedSlider = document.getElementById('rotation-speed') as HTMLInputElement;
    const speedValue = document.getElementById('speed-value')!;
    speedSlider.addEventListener('input', () => {
      const speed = parseFloat(speedSlider.value);
      speedValue.textContent = speed.toFixed(1);
      this.guiHandler.setRotationSpeed(speed);
    });

    document.getElementById('btn-reset-view')!.addEventListener('click', () => {
      this.cameraTheta = Math.PI / 4;
      this.cameraPhi = Math.PI / 4;
      this.cameraDistance = 5;
      this.cameraTarget.set(0, 0, 0);
      this.guiHandler.resetView();
      const box = this.moleculeBuilder.getBoundingBox();
      if (!box.isEmpty()) {
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        this.cameraTarget.copy(center);
        this.cameraDistance = maxDim * 2.5;
      }
      this.updateCameraPosition();
    });

    const autoRotateBtn = document.getElementById('btn-auto-rotate')!;
    autoRotateBtn.addEventListener('click', () => {
      const newState = !this.guiHandler.params.autoRotate;
      this.guiHandler.setAutoRotate(newState);
      autoRotateBtn.innerHTML = newState
        ? '<span>⏸</span> 暂停自转'
        : '<span>🔄</span> 开启自转';
    });

    document.getElementById('btn-export')!.addEventListener('click', () => {
      this.exportJSON();
    });

    document.getElementById('btn-import')!.addEventListener('click', () => {
      document.getElementById('file-input')!.click();
    });

    const fileInput = document.getElementById('file-input') as HTMLInputElement;
    fileInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        this.importJSON(file);
      }
      fileInput.value = '';
    });
  }

  private openAtomModal(): void {
    document.getElementById('atom-modal')!.classList.add('visible');
  }

  private closeAtomModal(): void {
    document.getElementById('atom-modal')!.classList.remove('visible');
  }

  private cancelAddAtomMode(): void {
    this.addAtomMode = false;
    this.pendingAtomPosition = null;
    document.getElementById('btn-add-atom')!.classList.remove('active');
    this.hideHint();
  }

  private showHint(message: string): void {
    const hint = document.getElementById('hint')!;
    hint.textContent = message;
    hint.classList.add('visible');
    if (this.hintTimer) clearTimeout(this.hintTimer);
    this.hintTimer = setTimeout(() => {
      this.hideHint();
    }, 3000);
  }

  private hideHint(): void {
    document.getElementById('hint')!.classList.remove('visible');
  }

  private showCoordsDisplay(show: boolean): void {
    document.getElementById('coords-display')!.classList.toggle('visible', show);
  }

  private updateCoordsDisplay(pos: THREE.Vector3): void {
    document.getElementById('coord-x')!.textContent = pos.x.toFixed(2);
    document.getElementById('coord-y')!.textContent = pos.y.toFixed(2);
    document.getElementById('coord-z')!.textContent = pos.z.toFixed(2);
  }

  private exportJSON(): void {
    const data = this.moleculeBuilder.toJSON();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `molecule_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showHint('分子结构已导出');
  }

  private importJSON(file: File): void {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as MoleculeData;
        this.moleculeBuilder.fromJSON(data);

        this.guiHandler.resetView();
        const box = this.moleculeBuilder.getBoundingBox();
        if (!box.isEmpty()) {
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          this.cameraTarget.copy(center);
          this.cameraDistance = maxDim * 2.5;
          this.updateCameraPosition();
        }
        this.showHint('分子结构已导入');
      } catch {
        this.showHint('导入失败：无效的JSON文件');
      }
    };
    reader.readAsText(file);
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    if (this.guiHandler.params.autoRotate) {
      this.moleculeBuilder.atomGroup.rotation.y +=
        this.guiHandler.params.rotationSpeed * delta;
      this.moleculeBuilder.bondGroup.rotation.y +=
        this.guiHandler.params.rotationSpeed * delta;
      this.moleculeBuilder.particleGroup.rotation.y +=
        this.guiHandler.params.rotationSpeed * delta;
    }

    const time = this.clock.getElapsedTime();
    this.moleculeBuilder.atoms.forEach((atom) => {
      const mat = atom.mesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.1 + Math.sin(time * 2 + atom.data.id) * 0.03;
    });

    this.moleculeBuilder.updateLabels();

    this.renderer.render(this.scene, this.camera);
  }
}

new App();
