import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import gsap from 'gsap';
import { Molecule, CAFFEINE_DATA, ELEMENT_PROPERTIES, Atom } from './molecule';
import { MoleculeRenderer } from './renderer';

class MoleculeApp {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private molecule: Molecule;
  private moleculeRenderer: MoleculeRenderer;
  private container: HTMLElement;
  private raycaster: THREE.Raycaster;
  private mouse: THREE.Vector2;

  private selectedAtomId: string | null = null;
  private isDragging: boolean = false;
  private dragPlane: THREE.Plane = new THREE.Plane();
  private dragOffset: THREE.Vector3 = new THREE.Vector3();
  private dragStartPosition: THREE.Vector3 = new THREE.Vector3();
  private starfield: THREE.Points;

  private initialCameraPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 8);
  private initialCameraTarget: THREE.Vector3 = new THREE.Vector3(0, 0, 0);

  constructor() {
    this.container = document.getElementById('canvas-container')!;
    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a1a);

    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.copy(this.initialCameraPosition);

    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 2;
    this.controls.maxDistance = 20;
    this.controls.target.copy(this.initialCameraTarget);

    this.setupLights();
    this.setupStarfield();

    this.molecule = new Molecule();
    this.molecule.loadFromJSON(CAFFEINE_DATA);

    this.moleculeRenderer = new MoleculeRenderer(this.scene, this.molecule);
    this.moleculeRenderer.render();

    this.setupEventListeners();
    this.centerCameraOnMolecule();

    this.animate();
  }

  private setupLights(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    this.scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.0);
    dirLight1.position.set(5, 5, 5);
    dirLight1.castShadow = true;
    dirLight1.shadow.mapSize.width = 2048;
    dirLight1.shadow.mapSize.height = 2048;
    this.scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x6496ff, 0.4);
    dirLight2.position.set(-5, -3, -5);
    this.scene.add(dirLight2);

    const pointLight = new THREE.PointLight(0xa78bfa, 0.6, 20);
    pointLight.position.set(0, 3, 5);
    this.scene.add(pointLight);

    const rimLight = new THREE.DirectionalLight(0xff6b9d, 0.3);
    rimLight.position.set(0, -5, -3);
    this.scene.add(rimLight);
  }

  private setupStarfield(): void {
    const starsGeometry = new THREE.BufferGeometry();
    const starCount = 300;
    const positions = new Float32Array(starCount * 3);

    for (let i = 0; i < starCount; i++) {
      const radius = 15 + Math.random() * 20;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI;
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }

    starsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const starsMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.05,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true
    });

    this.starfield = new THREE.Points(starsGeometry, starsMaterial);
    this.scene.add(this.starfield);
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', this.onWindowResize.bind(this));

    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.onPointerDown.bind(this));
    canvas.addEventListener('pointermove', this.onPointerMove.bind(this));
    canvas.addEventListener('pointerup', this.onPointerUp.bind(this));
    canvas.addEventListener('pointerleave', this.onPointerUp.bind(this));

    document.getElementById('btn-add-atom')!.addEventListener('click', this.addCarbonAtom.bind(this));
    document.getElementById('btn-undo')!.addEventListener('click', this.undoLastMove.bind(this));
    document.getElementById('btn-reset-view')!.addEventListener('click', this.resetCameraView.bind(this));
  }

  private onWindowResize(): void {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  private updateMouse(event: PointerEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private pickAtom(): string | null {
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const meshes = this.moleculeRenderer.getAtomMeshes();
    const intersects = this.raycaster.intersectObjects(meshes, false);

    if (intersects.length > 0) {
      const mesh = intersects[0].object as any;
      if (mesh.userData && mesh.userData.atomId) {
        return mesh.userData.atomId;
      }
    }
    return null;
  }

  private onPointerDown(event: PointerEvent): void {
    this.updateMouse(event);
    const pickedAtomId = this.pickAtom();

    if (pickedAtomId) {
      this.selectAtom(pickedAtomId);
      this.isDragging = true;
      this.controls.enabled = false;

      const atom = this.molecule.getAtom(pickedAtomId);
      if (atom) {
        this.dragStartPosition.copy(atom.position);
        this.molecule.beginAtomMove(pickedAtomId);

        this.dragPlane.setFromNormalAndCoplanarPoint(
          this.camera.getWorldDirection(new THREE.Vector3()).negate(),
          atom.position
        );

        const intersection = new THREE.Vector3();
        this.raycaster.setFromCamera(this.mouse, this.camera);
        this.raycaster.ray.intersectPlane(this.dragPlane, intersection);
        this.dragOffset.copy(atom.position).sub(intersection);
      }
    }
  }

  private onPointerMove(event: PointerEvent): void {
    this.updateMouse(event);

    if (this.isDragging && this.selectedAtomId) {
      const intersection = new THREE.Vector3();
      this.raycaster.setFromCamera(this.mouse, this.camera);
      if (this.raycaster.ray.intersectPlane(this.dragPlane, intersection)) {
        const newPosition = intersection.add(this.dragOffset);
        this.molecule.updateAtomPosition(this.selectedAtomId, newPosition);
        this.moleculeRenderer.updateAtomPosition(this.selectedAtomId);
        this.updateInfoPanel();
      }
    }
  }

  private onPointerUp(event: PointerEvent): void {
    if (this.isDragging && this.selectedAtomId) {
      this.molecule.endAtomMove(this.selectedAtomId);
    }

    if (!this.isDragging) {
      this.updateMouse(event);
      const pickedAtomId = this.pickAtom();
      if (!pickedAtomId) {
        this.deselectAtom();
      }
    }

    this.isDragging = false;
    this.controls.enabled = true;
  }

  private selectAtom(atomId: string): void {
    if (this.selectedAtomId && this.selectedAtomId !== atomId) {
      this.moleculeRenderer.unhighlightAtom(this.selectedAtomId);
    }
    this.selectedAtomId = atomId;
    this.moleculeRenderer.highlightAtom(atomId);
    this.updateInfoPanel();
  }

  private deselectAtom(): void {
    if (this.selectedAtomId) {
      this.moleculeRenderer.unhighlightAtom(this.selectedAtomId);
      this.selectedAtomId = null;
      this.updateInfoPanel();
    }
  }

  private updateInfoPanel(): void {
    const infoPanel = document.getElementById('info-panel')!;
    const infoContent = document.getElementById('info-content')!;

    if (!this.selectedAtomId) {
      infoPanel.classList.add('hidden');
      infoContent.innerHTML = '<div class="empty-state">请点击选中一个原子</div>';
      return;
    }

    const atom = this.molecule.getAtom(this.selectedAtomId);
    if (!atom) return;

    const props = ELEMENT_PROPERTIES[atom.element];
    const bondCount = this.molecule.getBondCountForAtom(this.selectedAtomId);

    infoPanel.classList.remove('hidden');
    const colorHex = '#' + props.color.toString(16).padStart(6, '0');
    infoContent.innerHTML = `
      <div class="info-row">
        <span class="info-label">元素</span>
        <span class="info-value">
          <span class="element-dot" style="background-color: ${colorHex}"></span>${atom.element} - ${props.name}
        </span>
      </div>
      <div class="info-row">
        <span class="info-label">坐标 X</span>
        <span class="info-value">${atom.position.x.toFixed(3)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">坐标 Y</span>
        <span class="info-value">${atom.position.y.toFixed(3)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">坐标 Z</span>
        <span class="info-value">${atom.position.z.toFixed(3)}</span>
      </div>
      <div class="info-row">
        <span class="info-label">相邻键数</span>
        <span class="info-value">${bondCount}</span>
      </div>
    `;
  }

  private addCarbonAtom(): void {
    const center = new THREE.Vector3(0, 0, 0);
    const newAtom = this.molecule.addAtom('C', center);
    this.moleculeRenderer.addAtom(newAtom);
    this.selectAtom(newAtom.id);
  }

  private undoLastMove(): void {
    if (this.molecule.canUndo()) {
      this.molecule.undo();
      for (const atom of this.molecule.getAtoms()) {
        this.moleculeRenderer.updateAtomPosition(atom.id);
      }
      this.updateInfoPanel();
    }
  }

  private resetCameraView(): void {
    const center = this.molecule.getCenter();

    gsap.to(this.camera.position, {
      x: center.x + this.initialCameraPosition.x,
      y: center.y + this.initialCameraPosition.y,
      z: center.z + this.initialCameraPosition.z,
      duration: 0.5,
      ease: 'power2.inOut'
    });

    gsap.to(this.controls.target, {
      x: center.x,
      y: center.y,
      z: center.z,
      duration: 0.5,
      ease: 'power2.inOut',
      onUpdate: () => {
        this.controls.update();
      }
    });
  }

  private centerCameraOnMolecule(): void {
    const center = this.molecule.getCenter();
    this.camera.position.add(center);
    this.controls.target.copy(center);
    this.initialCameraPosition.add(center);
    this.initialCameraTarget.copy(center);
  }

  private animate(): void {
    requestAnimationFrame(this.animate.bind(this));

    this.starfield.rotation.y += 0.0002;
    this.starfield.rotation.x += 0.0001;

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  public dispose(): void {
    this.moleculeRenderer.dispose();
    this.renderer.dispose();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new MoleculeApp();
});
