import * as THREE from 'three';
import { Molecule, generateSampleMolecule } from './molecule';
import { Atom } from './atom';
import { UI } from './ui';

class MoleculeViewer {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private molecule: Molecule;
  private ui: UI;

  private isDragging: boolean = false;
  private previousMouse: { x: number; y: number } = { x: 0, y: 0 };
  private rotationVelocity: { x: number; y: number } = { x: 0, y: 0 };
  private rotationSpeedMultiplier: number = 1;
  private autoRotate: boolean = false;
  private autoRotateSpeed: number = 0.005;

  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;
  private hoveredAtom: Atom | null = null;

  private animationFrameId: number | null = null;
  private container: HTMLElement;

  private targetCameraPosition: THREE.Vector3;
  private currentCameraPosition: THREE.Vector3;

  constructor() {
    this.container = document.getElementById('app')!;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = this.createScene();
    this.camera = this.createCamera();
    this.renderer = this.createRenderer();
    this.setupLights();

    this.targetCameraPosition = new THREE.Vector3(0, 8, 25);
    this.currentCameraPosition = this.targetCameraPosition.clone();
    this.camera.position.copy(this.currentCameraPosition);
    this.camera.lookAt(0, 0, 0);

    const moleculeData = generateSampleMolecule();
    console.log(`加载分子: ${moleculeData.atoms.length} 个原子, ${moleculeData.bonds.length} 个键`);
    this.molecule = Molecule.parse(moleculeData);
    this.centerMolecule();
    this.scene.add(this.molecule.group);

    this.ui = new UI({
      onRotationSpeedChange: (speed) => this.setRotationSpeed(speed),
      onReset: () => this.resetView(),
      onToggleLabels: (show) => this.molecule.setLabelsVisible(show),
      onToggleBondColor: (byElement) => this.molecule.setBondColorMode(byElement),
      onToggleAutoRotate: (enabled) => this.setAutoRotate(enabled)
    });

    this.setupEventListeners();
    this.startAnimationLoop();
  }

  private createScene(): THREE.Scene {
    const scene = new THREE.Scene();
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createLinearGradient(0, 0, 0, 512);
    gradient.addColorStop(0, '#0a0a2e');
    gradient.addColorStop(1, '#1a1a3e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 512);
    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    scene.background = texture;
    scene.fog = new THREE.Fog(0x0a0a2e, 40, 100);
    return scene;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    return camera;
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    this.container.appendChild(renderer.domElement);
    return renderer;
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xa78bfa, 0.8);
    keyLight.position.set(10, 15, 10);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    this.scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0x60a5fa, 0.5);
    fillLight.position.set(-10, 5, -10);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.4);
    rimLight.position.set(0, -5, -15);
    this.scene.add(rimLight);

    const pointLight1 = new THREE.PointLight(0x8b5cf6, 0.6, 50);
    pointLight1.position.set(-8, 8, 8);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x3b82f6, 0.6, 50);
    pointLight2.position.set(8, -5, -8);
    this.scene.add(pointLight2);
  }

  private centerMolecule(): void {
    const box = new THREE.Box3().setFromObject(this.molecule.group);
    const center = new THREE.Vector3();
    box.getCenter(center);
    this.molecule.group.position.sub(center);
  }

  private setupEventListeners(): void {
    const canvas = this.renderer.domElement;

    canvas.addEventListener('mousedown', (e) => this.onMouseDown(e));
    window.addEventListener('mousemove', (e) => this.onMouseMove(e));
    window.addEventListener('mouseup', () => this.onMouseUp());
    canvas.addEventListener('wheel', (e) => this.onWheel(e), { passive: false });
    window.addEventListener('resize', () => this.onResize());
    window.addEventListener('beforeunload', () => this.dispose());
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.target !== this.renderer.domElement) return;
    this.isDragging = true;
    this.previousMouse = { x: e.clientX, y: e.clientY };
    this.rotationVelocity = { x: 0, y: 0 };
  }

  private onMouseMove(e: MouseEvent): void {
    this.updateMousePosition(e);

    if (this.isDragging) {
      const deltaX = e.clientX - this.previousMouse.x;
      const deltaY = e.clientY - this.previousMouse.y;

      const rotationSpeed = 0.005 * this.rotationSpeedMultiplier;
      this.rotationVelocity.x = deltaY * rotationSpeed;
      this.rotationVelocity.y = deltaX * rotationSpeed;

      this.molecule.group.rotation.x += this.rotationVelocity.x;
      this.molecule.group.rotation.y += this.rotationVelocity.y;

      this.previousMouse = { x: e.clientX, y: e.clientY };
    }

    this.checkHover();
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const zoomSpeed = 0.001;
    const direction = new THREE.Vector3();
    this.camera.getWorldDirection(direction);

    const delta = e.deltaY * zoomSpeed;
    const forward = direction.clone().multiplyScalar(delta * 10);
    this.targetCameraPosition.add(forward);

    const minDistance = 8;
    const maxDistance = 80;
    const dist = this.targetCameraPosition.length();
    if (dist < minDistance) {
      this.targetCameraPosition.normalize().multiplyScalar(minDistance);
    } else if (dist > maxDistance) {
      this.targetCameraPosition.normalize().multiplyScalar(maxDistance);
    }
  }

  private onResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateMousePosition(e: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private checkHover(): void {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const atomMeshes = this.molecule.getAtomMeshes();
    const intersects = this.raycaster.intersectObjects(atomMeshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as THREE.Mesh;
      const atom = mesh.userData.atom as Atom;

      if (this.hoveredAtom !== atom) {
        if (this.hoveredAtom) {
          this.hoveredAtom.setHovered(false);
        }
        this.hoveredAtom = atom;
        this.hoveredAtom.setHovered(true);
        this.renderer.domElement.style.cursor = 'pointer';
      }

      const worldPos = atom.getWorldPosition();
      this.ui.showAtomInfo(
        atom.data.element,
        atom.data.id,
        worldPos.x,
        worldPos.y,
        worldPos.z
      );
    } else {
      if (this.hoveredAtom) {
        this.hoveredAtom.setHovered(false);
        this.hoveredAtom = null;
        this.ui.hideAtomInfo();
        this.renderer.domElement.style.cursor = 'default';
      }
    }
  }

  private setRotationSpeed(speed: number): void {
    this.rotationSpeedMultiplier = speed;
  }

  private setAutoRotate(enabled: boolean): void {
    this.autoRotate = enabled;
  }

  private resetView(): void {
    this.molecule.resetTransform();
    this.targetCameraPosition = new THREE.Vector3(0, 8, 25);
    this.rotationVelocity = { x: 0, y: 0 };
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    if (!this.isDragging) {
      this.rotationVelocity.x *= 0.95;
      this.rotationVelocity.y *= 0.95;
      this.molecule.group.rotation.x += this.rotationVelocity.x * this.rotationSpeedMultiplier;
      this.molecule.group.rotation.y += this.rotationVelocity.y * this.rotationSpeedMultiplier;
    }

    if (this.autoRotate) {
      this.molecule.group.rotation.y += this.autoRotateSpeed * this.rotationSpeedMultiplier;
    }

    this.currentCameraPosition.lerp(this.targetCameraPosition, 0.08);
    this.camera.position.copy(this.currentCameraPosition);
    this.camera.lookAt(0, 0, 0);

    this.molecule.atoms.forEach((atom) => {
      atom.lod.update(this.camera);
    });

    this.molecule.update();

    this.renderer.render(this.scene, this.camera);
  };

  private startAnimationLoop(): void {
    this.animate();
  }

  public dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }

    this.molecule.dispose();
    this.ui.dispose();

    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (Array.isArray(obj.material)) {
          obj.material.forEach((m) => m.dispose());
        } else {
          obj.material.dispose();
        }
      }
    });

    this.renderer.dispose();
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
    }
  }
}

new MoleculeViewer();
