import * as THREE from 'three';
import { getAtomColor, getAtomRadius, lerp, easeOutCubic, easeInOutCubic, easeOutBounce, generateRandomOffset, clamp } from './utils';
import { MoleculeData, AtomData, BondData, calculateMolecularWeight } from './moleculeManager';

export interface SceneRendererCallbacks {
  onInfoUpdate?: (info: MoleculeInfo) => void;
}

export interface MoleculeInfo {
  name: string;
  formula: string;
  atomCount: number;
  bondCount: number;
  molecularWeight: number;
}

interface AtomMesh extends THREE.Mesh {
  userData: {
    targetPosition: THREE.Vector3;
    startPosition: THREE.Vector3;
    element: string;
    glowIntensity: number;
    velocity?: THREE.Vector3;
    trail?: THREE.Points;
    trailPositions?: Float32Array;
  };
}

interface BondMesh extends THREE.Mesh {
  userData: {
    from: number;
    to: number;
    bondOrder: number;
    breakProgress: number;
    visible: boolean;
  };
}

interface Particle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

export class SceneRenderer {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private moleculeGroup: THREE.Group;
  private particles: Particle[] = [];

  private atoms: AtomMesh[] = [];
  private bonds: BondMesh[] = [];

  private isDragging = false;
  private previousMousePosition = { x: 0, y: 0 };
  private rotationVelocity = { x: 0, y: 0 };
  private targetRotation = { x: 0, y: 0 };
  private currentRotation = { x: 0, y: 0 };
  private damping = 0.88;

  private targetZoom = 1;
  private currentZoom = 1;
  private minZoom = 0.5;
  private maxZoom = 5;

  private animationFrameId: number | null = null;
  private loadingAnimations: {
    atom: AtomMesh;
    startTime: number;
    duration: number;
    offset: THREE.Vector3;
  }[] = [];

  private callbacks: SceneRendererCallbacks;
  private currentMolecule: MoleculeData | null = null;

  private reactionMode = false;
  private reactionAtoms: { mesh: AtomMesh; startPos: THREE.Vector3; endPos: THREE.Vector3; phase: string }[] = [];
  private reactionBonds: { mesh: BondMesh; visible: boolean }[] = [];
  private glowTargets: AtomMesh[] = [];

  constructor(containerId: string, canvasId: string, callbacks: SceneRendererCallbacks = {}) {
    this.container = document.getElementById(containerId) || document.body;
    this.canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    this.callbacks = callbacks;
    this.moleculeGroup = new THREE.Group();

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true
    });

    this.init();
  }

  private init(): void {
    this.setupScene();
    this.setupLighting();
    this.setupCamera();
    this.setupRenderer();
    this.setupEventListeners();
    this.animate();
    this.handleResize();
  }

  private setupScene(): void {
    const canvas = this.renderer.domElement;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const gradient = ctx.createRadialGradient(
        canvas.width / 2, canvas.height / 2, 0,
        canvas.width / 2, canvas.height / 2, Math.max(canvas.width, canvas.height) / 2
      );
      gradient.addColorStop(0, '#0a0a2e');
      gradient.addColorStop(1, '#000000');
      this.scene.background = null as any;
    }
    this.scene.add(this.moleculeGroup);
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404080, 0.6);
    this.scene.add(ambientLight);

    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight1.position.set(5, 5, 5);
    this.scene.add(directionalLight1);

    const directionalLight2 = new THREE.DirectionalLight(0x00d4ff, 0.4);
    directionalLight2.position.set(-5, -3, 3);
    this.scene.add(directionalLight2);

    const pointLight1 = new THREE.PointLight(0x7b2ff7, 0.5, 20);
    pointLight1.position.set(3, 2, -3);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x00d4ff, 0.3, 20);
    pointLight2.position.set(-3, -2, 3);
    this.scene.add(pointLight2);
  }

  private setupCamera(): void {
    this.camera.position.z = 8;
    this.camera.position.y = 2;
    this.camera.lookAt(0, 0, 0);
  }

  private setupRenderer(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
  }

  private setupEventListeners(): void {
    const canvas = this.canvas;

    canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    canvas.addEventListener('mousemove', this.onMouseMove.bind(this));
    canvas.addEventListener('mouseup', this.onMouseUp.bind(this));
    canvas.addEventListener('mouseleave', this.onMouseUp.bind(this));
    canvas.addEventListener('wheel', this.onWheel.bind(this), { passive: false });

    canvas.addEventListener('touchstart', this.onTouchStart.bind(this), { passive: false });
    canvas.addEventListener('touchmove', this.onTouchMove.bind(this), { passive: false });
    canvas.addEventListener('touchend', this.onTouchEnd.bind(this));

    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private onMouseDown(e: MouseEvent): void {
    this.isDragging = true;
    this.previousMousePosition = { x: e.clientX, y: e.clientY };
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.previousMousePosition.x;
    const deltaY = e.clientY - this.previousMousePosition.y;

    this.targetRotation.y += deltaX * 0.01;
    this.targetRotation.x += deltaY * 0.01;
    this.targetRotation.x = clamp(this.targetRotation.x, -Math.PI / 2, Math.PI / 2);

    this.previousMousePosition = { x: e.clientX, y: e.clientY };
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    this.targetZoom = clamp(this.targetZoom * delta, this.minZoom, this.maxZoom);
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      e.preventDefault();
      this.isDragging = true;
      this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || e.touches.length !== 1) return;
    e.preventDefault();

    const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
    const deltaY = e.touches[0].clientY - this.previousMousePosition.y;

    this.targetRotation.y += deltaX * 0.01;
    this.targetRotation.x += deltaY * 0.01;
    this.targetRotation.x = clamp(this.targetRotation.x, -Math.PI / 2, Math.PI / 2);

    this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  }

  private onTouchEnd(): void {
    this.isDragging = false;
  }

  private handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(width, height);

    const canvas = this.renderer.domElement;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const bgCanvas = document.createElement('canvas');
      bgCanvas.width = width;
      bgCanvas.height = height;
      const bgCtx = bgCanvas.getContext('2d');
      if (bgCtx) {
        const gradient = bgCtx.createRadialGradient(
          width / 2, height / 2, 0,
          width / 2, height / 2, Math.max(width, height) / 2
        );
        gradient.addColorStop(0, '#0a0a2e');
        gradient.addColorStop(1, '#000000');
        bgCtx.fillStyle = gradient;
        bgCtx.fillRect(0, 0, width, height);
        const texture = new THREE.CanvasTexture(bgCanvas);
        this.scene.background = texture;
      }
    }
  }

  public loadMolecule(molecule: MoleculeData, animated: boolean = true): void {
    this.clearMolecule();
    this.currentMolecule = molecule;
    this.reactionMode = false;

    const centerOffset = this.calculateCenterOffset(molecule.atoms);

    molecule.atoms.forEach((atom, index) => {
      const atomMesh = this.createAtom(atom, centerOffset);
      this.atoms.push(atomMesh);
      this.moleculeGroup.add(atomMesh);

      if (animated) {
        const offset = new THREE.Vector3(
          -centerOffset.x,
          -centerOffset.y,
          -centerOffset.z
        ).multiplyScalar(0.3);
        offset.add(new THREE.Vector3().random().subScalar(0.5).multiplyScalar(0.5));

        this.loadingAnimations.push({
          atom: atomMesh,
          startTime: performance.now() + index * 30,
          duration: 500,
          offset: offset
        });
      }
    });

    molecule.bonds.forEach(bond => {
      if (bond.from < this.atoms.length && bond.to < this.atoms.length) {
        const bondMesh = this.createBond(
          this.atoms[bond.from],
          this.atoms[bond.to],
          bond.order || 1
        );
        bondMesh.userData.from = bond.from;
        bondMesh.userData.to = bond.to;
        bondMesh.userData.bondOrder = bond.order || 1;
        bondMesh.userData.breakProgress = 0;
        bondMesh.userData.visible = true;
        this.bonds.push(bondMesh);
        this.moleculeGroup.add(bondMesh);
      }
    });

    if (this.callbacks.onInfoUpdate) {
      this.callbacks.onInfoUpdate({
        name: molecule.name,
        formula: molecule.formula,
        atomCount: molecule.atoms.length,
        bondCount: molecule.bonds.length,
        molecularWeight: calculateMolecularWeight(molecule)
      });
    }

    this.targetZoom = 1;
    this.currentZoom = 0.5;
    this.targetRotation = { x: 0.3, y: 0.5 };
  }

  private calculateCenterOffset(atoms: AtomData[]): THREE.Vector3 {
    if (atoms.length === 0) return new THREE.Vector3();

    let sumX = 0, sumY = 0, sumZ = 0;
    atoms.forEach(atom => {
      sumX += atom.x;
      sumY += atom.y;
      sumZ += atom.z;
    });

    return new THREE.Vector3(
      sumX / atoms.length,
      sumY / atoms.length,
      sumZ / atoms.length
    );
  }

  private createAtom(atom: AtomData, centerOffset: THREE.Vector3): AtomMesh {
    const radius = getAtomRadius(atom.element);
    const color = getAtomColor(atom.element);

    const geometry = new THREE.SphereGeometry(radius, 32, 32);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.3,
      roughness: 0.2,
      emissive: color,
      emissiveIntensity: 0.1
    });

    const mesh = new THREE.Mesh(geometry, material) as AtomMesh;
    const targetPos = new THREE.Vector3(
      atom.x - centerOffset.x,
      atom.y - centerOffset.y,
      atom.z - centerOffset.z
    );

    mesh.position.copy(targetPos);
    mesh.userData = {
      targetPosition: targetPos,
      startPosition: targetPos.clone(),
      element: atom.element,
      glowIntensity: 0
    };

    return mesh;
  }

  private createBond(fromAtom: AtomMesh, toAtom: AtomMesh, order: number): BondMesh {
    const direction = new THREE.Vector3()
      .subVectors(toAtom.position, fromAtom.position);
    const length = direction.length();
    const midpoint = new THREE.Vector3()
      .addVectors(fromAtom.position, toAtom.position)
      .multiplyScalar(0.5);

    const bondRadius = 0.08;
    const geometry = new THREE.CylinderGeometry(bondRadius, bondRadius, length, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0xaaaaaa,
      metalness: 0.5,
      roughness: 0.3
    });

    const mesh = new THREE.Mesh(geometry, material) as BondMesh;
    mesh.position.copy(midpoint);
    mesh.lookAt(toAtom.position);
    mesh.rotateX(Math.PI / 2);

    return mesh;
  }

  public clearMolecule(): void {
    this.atoms.forEach(atom => {
      this.moleculeGroup.remove(atom);
      atom.geometry.dispose();
      (atom.material as THREE.Material).dispose();
    });
    this.atoms = [];

    this.bonds.forEach(bond => {
      this.moleculeGroup.remove(bond);
      bond.geometry.dispose();
      (bond.material as THREE.Material).dispose();
    });
    this.bonds = [];

    this.particles.forEach(p => {
      this.moleculeGroup.remove(p.mesh);
      p.mesh.geometry.dispose();
      (p.mesh.material as THREE.Material).dispose();
    });
    this.particles = [];

    this.loadingAnimations = [];
    this.glowTargets = [];
    this.reactionAtoms = [];
    this.reactionBonds = [];
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    this.updateLoadingAnimations();
    this.updateRotation();
    this.updateZoom();
    this.updateParticles();
    this.updateGlowEffect();
    this.updateBonds();
    this.updateReactionAnimations();

    this.renderer.render(this.scene, this.camera);
  };

  private updateLoadingAnimations(): void {
    const now = performance.now();

    this.loadingAnimations = this.loadingAnimations.filter(anim => {
      const elapsed = now - anim.startTime;
      if (elapsed < 0) return true;

      const progress = Math.min(elapsed / anim.duration, 1);
      const t = easeOutCubic(progress);

      anim.atom.position.x = lerp(0, anim.atom.userData.targetPosition.x, t);
      anim.atom.position.y = lerp(0, anim.atom.userData.targetPosition.y, t);
      anim.atom.position.z = lerp(0, anim.atom.userData.targetPosition.z, t);

      const material = anim.atom.material as THREE.MeshStandardMaterial;
      material.opacity = t;
      material.transparent = true;

      if (progress >= 1) {
        this.startBounceAnimation(anim.atom);
        return false;
      }
      return true;
    });
  }

  private startBounceAnimation(atom: AtomMesh): void {
    const startTime = performance.now();
    const duration = 300;
    const amplitude = 0.1;
    const targetPos = atom.userData.targetPosition.clone();

    const bounce = () => {
      const elapsed = performance.now() - startTime;
      if (elapsed >= duration) {
        atom.position.copy(targetPos);
        return;
      }

      const t = elapsed / duration;
      const bounceT = easeOutBounce(t);
      const offset = amplitude * (1 - bounceT);

      atom.position.x = targetPos.x;
      atom.position.y = targetPos.y + offset;
      atom.position.z = targetPos.z;

      requestAnimationFrame(bounce);
    };

    bounce();
  }

  private updateRotation(): void {
    if (!this.isDragging) {
      this.targetRotation.y += 0.002;
    }

    this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * 0.1;
    this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * 0.1;

    this.moleculeGroup.rotation.x = this.currentRotation.x;
    this.moleculeGroup.rotation.y = this.currentRotation.y;
  }

  private updateZoom(): void {
    this.currentZoom += (this.targetZoom - this.currentZoom) * 0.1;
    this.camera.position.z = 8 / this.currentZoom;
  }

  private updateParticles(): void {
    const delta = 1 / 60;
    this.particles = this.particles.filter(p => {
      p.life -= delta;
      if (p.life <= 0) {
        this.moleculeGroup.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        return false;
      }

      p.mesh.position.add(p.velocity.clone().multiplyScalar(delta));
      p.velocity.multiplyScalar(0.95);

      const material = p.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = p.life / p.maxLife;

      const scale = p.life / p.maxLife;
      p.mesh.scale.setScalar(scale);

      return true;
    });
  }

  private updateGlowEffect(): void {
    this.glowTargets.forEach(atom => {
      const material = atom.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.1 + atom.userData.glowIntensity * 0.8;
    });
  }

  private updateBonds(): void {
    this.bonds.forEach(bond => {
      if (!bond.userData.visible) {
        bond.visible = false;
        return;
      }
      bond.visible = true;

      const fromAtom = this.atoms[bond.userData.from];
      const toAtom = this.atoms[bond.userData.to];
      if (!fromAtom || !toAtom) return;

      const fromPos = fromAtom.position;
      const toPos = toAtom.position;
      const direction = new THREE.Vector3().subVectors(toPos, fromPos);
      const length = direction.length();
      const midpoint = new THREE.Vector3().addVectors(fromPos, toPos).multiplyScalar(0.5);

      bond.position.copy(midpoint);
      bond.scale.y = length / bond.userData.bondOrder / (bond.geometry as THREE.CylinderGeometry).parameters.height * bond.geometry.parameters.height;

      const originalLength = (bond.geometry as THREE.CylinderGeometry).parameters.height;
      bond.scale.y = length / originalLength;

      bond.lookAt(toPos);
      bond.rotateX(Math.PI / 2);

      if (bond.userData.breakProgress > 0) {
        const material = bond.material as THREE.MeshStandardMaterial;
        material.opacity = 1 - bond.userData.breakProgress;
        material.transparent = true;
      }
    });
  }

  public createSparkParticles(position: THREE.Vector3, count: number = 10): void {
    for (let i = 0; i < count; i++) {
      const geometry = new THREE.SphereGeometry(0.03, 8, 8);
      const material = new THREE.MeshBasicMaterial({
        color: 0x00d4ff,
        transparent: true,
        opacity: 1
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);

      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3
      );

      this.moleculeGroup.add(mesh);
      this.particles.push({
        mesh,
        velocity,
        life: 0.5,
        maxLife: 0.5
      });
    }
  }

  public setAtomGlow(atoms: AtomMesh[], intensity: number): void {
    atoms.forEach(atom => {
      atom.userData.glowIntensity = intensity;
    });
    this.glowTargets = atoms;
  }

  public getAtoms(): AtomMesh[] {
    return this.atoms;
  }

  public getBonds(): BondMesh[] {
    return this.bonds;
  }

  public getMoleculeGroup(): THREE.Group {
    return this.moleculeGroup;
  }

  public getScene(): THREE.Scene {
    return this.scene;
  }

  public resetView(): void {
    this.targetRotation = { x: 0.3, y: 0.5 };
    this.targetZoom = 1;
  }

  private updateReactionAnimations(): void {
  }

  public dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.clearMolecule();
    this.renderer.dispose();
    window.removeEventListener('resize', this.handleResize.bind(this));
  }
}
