import * as THREE from 'three';
import { getAtomColor, getAtomRadius, lerp, easeOutCubic, easeOutBounce, clamp } from './utils';
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

export interface AtomMesh extends THREE.Mesh {
  userData: {
    targetPosition: THREE.Vector3;
    startPosition: THREE.Vector3;
    element: string;
    glowIntensity: number;
    velocity?: THREE.Vector3;
    trail?: THREE.Points;
    trailPositions?: Float32Array;
    bouncePhase?: 'idle' | 'bouncing';
  };
}

export interface BondMesh extends THREE.Mesh {
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

interface LoadingAnimation {
  atom: AtomMesh;
  startTime: number;
  fadeDuration: number;
  spreadDuration: number;
  bounceDuration: number;
  startPos: THREE.Vector3;
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
  private targetRotation = { x: 0.3, y: 0.5 };
  private currentRotation = { x: 0.3, y: 0.5 };
  private damping = 0.88;
  private rotationVelocity = { x: 0, y: 0 };

  private targetZoom = 1;
  private currentZoom = 1;
  private minZoom = 0.5;
  private maxZoom = 5;

  private animationFrameId: number | null = null;
  private loadingAnimations: LoadingAnimation[] = [];

  private callbacks: SceneRendererCallbacks;
  private currentMolecule: MoleculeData | null = null;

  private glowTargets: AtomMesh[] = [];
  private envMap: THREE.CubeTexture | null = null;

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
    this.setupEnvironment();
    this.setupLighting();
    this.setupCamera();
    this.setupRenderer();
    this.setupEventListeners();
    this.animate();
    this.handleResize();
  }

  private setupScene(): void {
    this.scene.add(this.moleculeGroup);
    this.scene.fog = new THREE.FogExp2(0x0a0a2e, 0.05);
  }

  private setupEnvironment(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(
      512, 512, 0,
      512, 512, 512
    );
    gradient.addColorStop(0, '#1a1a4e');
    gradient.addColorStop(0.5, '#0a0a2e');
    gradient.addColorStop(1, '#050515');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 1024, 1024);

    for (let i = 0; i < 200; i++) {
      const x = Math.random() * 1024;
      const y = Math.random() * 1024;
      const size = Math.random() * 2 + 0.5;
      const brightness = Math.random() * 0.5 + 0.5;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.8})`;
      ctx.fill();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.mapping = THREE.EquirectangularReflectionMapping;
    this.scene.environment = texture;

    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = window.innerWidth;
    bgCanvas.height = window.innerHeight;
    const bgCtx = bgCanvas.getContext('2d')!;
    const bgGradient = bgCtx.createRadialGradient(
      bgCanvas.width / 2, bgCanvas.height / 2, 0,
      bgCanvas.width / 2, bgCanvas.height / 2, Math.max(bgCanvas.width, bgCanvas.height) / 2
    );
    bgGradient.addColorStop(0, '#0f0f3a');
    bgGradient.addColorStop(0.5, '#0a0a2e');
    bgGradient.addColorStop(1, '#000000');
    bgCtx.fillStyle = bgGradient;
    bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

    const bgTexture = new THREE.CanvasTexture(bgCanvas);
    this.scene.background = bgTexture;
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404080, 0.4);
    this.scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0x00d4ff, 0x7b2ff7, 0.3);
    this.scene.add(hemisphereLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.2);
    mainLight.position.set(5, 5, 5);
    mainLight.castShadow = true;
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x00d4ff, 0.5);
    fillLight.position.set(-5, 2, 3);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0x7b2ff7, 0.4);
    rimLight.position.set(0, -3, -5);
    this.scene.add(rimLight);

    const pointLight1 = new THREE.PointLight(0x00d4ff, 0.5, 15);
    pointLight1.position.set(3, 2, 3);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x7b2ff7, 0.5, 15);
    pointLight2.position.set(-3, -2, -3);
    this.scene.add(pointLight2);
  }

  private setupCamera(): void {
    this.camera.position.z = 8;
    this.camera.position.y = 1;
    this.camera.lookAt(0, 0, 0);
  }

  private setupRenderer(): void {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
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
    this.rotationVelocity = { x: 0, y: 0 };
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.isDragging) return;

    const deltaX = e.clientX - this.previousMousePosition.x;
    const deltaY = e.clientY - this.previousMousePosition.y;

    this.rotationVelocity.y = deltaX * 0.01;
    this.rotationVelocity.x = deltaY * 0.01;

    this.targetRotation.y += this.rotationVelocity.y;
    this.targetRotation.x += this.rotationVelocity.x;
    this.targetRotation.x = clamp(this.targetRotation.x, -Math.PI / 2, Math.PI / 2);

    this.previousMousePosition = { x: e.clientX, y: e.clientY };
  }

  private onMouseUp(): void {
    this.isDragging = false;
  }

  private onWheel(e: WheelEvent): void {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.92 : 1.08;
    this.targetZoom = clamp(this.targetZoom * delta, this.minZoom, this.maxZoom);
  }

  private onTouchStart(e: TouchEvent): void {
    if (e.touches.length === 1) {
      e.preventDefault();
      this.isDragging = true;
      this.previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
      this.rotationVelocity = { x: 0, y: 0 };
    }
  }

  private onTouchMove(e: TouchEvent): void {
    if (!this.isDragging || e.touches.length !== 1) return;
    e.preventDefault();

    const deltaX = e.touches[0].clientX - this.previousMousePosition.x;
    const deltaY = e.touches[0].clientY - this.previousMousePosition.y;

    this.rotationVelocity.y = deltaX * 0.01;
    this.rotationVelocity.x = deltaY * 0.01;

    this.targetRotation.y += this.rotationVelocity.y;
    this.targetRotation.x += this.rotationVelocity.x;
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

    if (this.scene.background instanceof THREE.CanvasTexture) {
      const bgCanvas = this.scene.background.image as HTMLCanvasElement;
      if (bgCanvas) {
        bgCanvas.width = width;
        bgCanvas.height = height;
        const ctx = bgCanvas.getContext('2d')!;
        const gradient = ctx.createRadialGradient(
          width / 2, height / 2, 0,
          width / 2, height / 2, Math.max(width, height) / 2
        );
        gradient.addColorStop(0, '#0f0f3a');
        gradient.addColorStop(0.5, '#0a0a2e');
        gradient.addColorStop(1, '#000000');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
        this.scene.background.needsUpdate = true;
      }
    }
  }

  public loadMolecule(molecule: MoleculeData, animated: boolean = true): void {
    this.clearMolecule();
    this.currentMolecule = molecule;

    const centerOffset = this.calculateCenterOffset(molecule.atoms);

    molecule.atoms.forEach((atom, index) => {
      const atomMesh = this.createAtom(atom, centerOffset);
      this.atoms.push(atomMesh);
      this.moleculeGroup.add(atomMesh);

      if (animated) {
        const startPos = new THREE.Vector3(0, 0, 0);

        this.loadingAnimations.push({
          atom: atomMesh,
          startTime: performance.now() + index * 40,
          fadeDuration: 500,
          spreadDuration: 500,
          bounceDuration: 300,
          startPos: startPos
        });

        atomMesh.position.copy(startPos);
        const material = atomMesh.material as THREE.MeshStandardMaterial;
        material.opacity = 0;
        material.transparent = true;
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

        if (animated) {
          const material = bondMesh.material as THREE.MeshStandardMaterial;
          material.opacity = 0;
          material.transparent = true;
        }

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

    if (animated) {
      this.targetZoom = 0.5;
      this.currentZoom = 0.5;
      setTimeout(() => {
        this.targetZoom = 1;
      }, 100);
    } else {
      this.targetZoom = 1;
      this.currentZoom = 1;
    }

    this.targetRotation = { x: 0.3, y: 0.5 };
    this.currentRotation = { x: 0.3, y: 0.5 };
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

    const geometry = new THREE.SphereGeometry(radius, 48, 48);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.85,
      roughness: 0.15,
      emissive: color,
      emissiveIntensity: 0.05,
      envMapIntensity: 1.2
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
      glowIntensity: 0,
      bouncePhase: 'idle'
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

    const bondRadius = 0.07;
    const geometry = new THREE.CylinderGeometry(bondRadius, bondRadius, length, 24);
    const material = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.9,
      roughness: 0.1,
      envMapIntensity: 1.5
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
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    this.updateLoadingAnimations();
    this.updateRotation();
    this.updateZoom();
    this.updateParticles();
    this.updateGlowEffect();
    this.updateBonds();

    this.renderer.render(this.scene, this.camera);
  };

  private updateLoadingAnimations(): void {
    const now = performance.now();

    this.loadingAnimations = this.loadingAnimations.filter(anim => {
      const elapsed = now - anim.startTime;
      if (elapsed < 0) return true;

      const totalDuration = anim.fadeDuration + anim.bounceDuration;

      if (elapsed >= totalDuration) {
        anim.atom.position.copy(anim.atom.userData.targetPosition);
        const material = anim.atom.material as THREE.MeshStandardMaterial;
        material.opacity = 1;
        material.transparent = false;
        return false;
      }

      if (elapsed < anim.fadeDuration) {
        const t = elapsed / anim.fadeDuration;
        const spreadT = easeOutCubic(t);

        anim.atom.position.lerpVectors(
          anim.startPos,
          anim.atom.userData.targetPosition,
          spreadT
        );

        const material = anim.atom.material as THREE.MeshStandardMaterial;
        material.opacity = t;
      } else {
        const bounceElapsed = elapsed - anim.fadeDuration;
        const bounceT = bounceElapsed / anim.bounceDuration;

        const bounceOffset = this.calculateBounceOffset(bounceT, 0.1);

        const direction = new THREE.Vector3()
          .subVectors(anim.atom.userData.targetPosition, anim.startPos)
          .normalize();

        anim.atom.position.copy(anim.atom.userData.targetPosition);
        anim.atom.position.add(direction.multiplyScalar(bounceOffset));

        const material = anim.atom.material as THREE.MeshStandardMaterial;
        material.opacity = 1;
      }

      return true;
    });

    const maxAnimEndTime = Math.max(...this.loadingAnimations.map(a => a.startTime + a.fadeDuration + a.bounceDuration), 0);
    const bondsFadeProgress = clamp((now - (performance.now() - 200)) / 500, 0, 1);

    this.bonds.forEach(bond => {
      const material = bond.material as THREE.MeshStandardMaterial;
      if (material.transparent) {
        material.opacity = Math.min(material.opacity + 0.03, 1);
        if (material.opacity >= 1) {
          material.transparent = false;
        }
      }
    });
  }

  private calculateBounceOffset(t: number, amplitude: number): number {
    const n1 = 7.5625;
    const d1 = 2.75;

    let bounceValue: number;
    if (t < 1 / d1) {
      bounceValue = n1 * t * t;
    } else if (t < 2 / d1) {
      bounceValue = n1 * (t -= 1.5 / d1) * t + 0.75;
    } else if (t < 2.5 / d1) {
      bounceValue = n1 * (t -= 2.25 / d1) * t + 0.9375;
    } else {
      bounceValue = n1 * (t -= 2.625 / d1) * t + 0.984375;
    }

    return amplitude * (1 - bounceValue);
  }

  private updateRotation(): void {
    if (!this.isDragging) {
      this.rotationVelocity.x *= this.damping;
      this.rotationVelocity.y *= this.damping;

      this.targetRotation.y += this.rotationVelocity.y;
      this.targetRotation.x += this.rotationVelocity.x;
      this.targetRotation.x = clamp(this.targetRotation.x, -Math.PI / 2, Math.PI / 2);

      this.targetRotation.y += 0.002;
    }

    const lerpFactor = 0.08;
    this.currentRotation.x += (this.targetRotation.x - this.currentRotation.x) * lerpFactor;
    this.currentRotation.y += (this.targetRotation.y - this.currentRotation.y) * lerpFactor;

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
      p.velocity.multiplyScalar(0.96);
      p.velocity.y -= 2 * delta;

      const material = p.mesh.material as THREE.MeshBasicMaterial;
      material.opacity = p.life / p.maxLife;

      const scale = p.life / p.maxLife;
      p.mesh.scale.setScalar(Math.max(scale, 0.1));

      return true;
    });
  }

  private updateGlowEffect(): void {
    this.glowTargets.forEach(atom => {
      const material = atom.material as THREE.MeshStandardMaterial;
      material.emissiveIntensity = 0.05 + atom.userData.glowIntensity * 0.95;
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

      const originalLength = (bond.geometry as THREE.CylinderGeometry).parameters.height;
      if (originalLength > 0) {
        bond.scale.y = length / originalLength;
      }

      bond.lookAt(toPos);
      bond.rotateX(Math.PI / 2);

      if (bond.userData.breakProgress > 0) {
        const material = bond.material as THREE.MeshStandardMaterial;
        material.opacity = 1 - bond.userData.breakProgress;
        material.transparent = true;
      }
    });
  }

  public createSparkParticles(position: THREE.Vector3, count: number = 15): void {
    for (let i = 0; i < count; i++) {
      const size = 0.02 + Math.random() * 0.03;
      const geometry = new THREE.SphereGeometry(size, 8, 8);

      const colors = [0x00d4ff, 0x7b2ff7, 0xffffff, 0xffff88];
      const color = colors[Math.floor(Math.random() * colors.length)];

      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);

      const speed = 2 + Math.random() * 4;
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * speed,
        (Math.random() - 0.5) * speed,
        (Math.random() - 0.5) * speed
      );

      const life = 0.4 + Math.random() * 0.3;

      this.moleculeGroup.add(mesh);
      this.particles.push({
        mesh,
        velocity,
        life,
        maxLife: life
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

  public dispose(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.clearMolecule();
    this.renderer.dispose();
  }
}
