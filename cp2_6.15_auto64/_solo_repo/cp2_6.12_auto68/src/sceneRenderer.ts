import * as THREE from 'three';
import { getAtomColor, getAtomRadius, easeOutCubic, clamp } from './utils';
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
    element: string;
    glowIntensity: number;
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

interface LoadingAtomState {
  atom: AtomMesh;
  startTime: number;
  delay: number;
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
  private loadingAtoms: LoadingAtomState[] = [];
  private bondsFadeStartTime = 0;

  private callbacks: SceneRendererCallbacks;
  private currentMolecule: MoleculeData | null = null;

  private glowTargets: AtomMesh[] = [];
  private envTexture: THREE.Texture | null = null;

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
    this.setupEnvironment();
    this.setupLighting();
    this.setupCamera();
    this.setupRenderer();
    this.setupEventListeners();
    this.animate();
    this.handleResize();
  }

  private setupEnvironment(): void {
    this.scene.add(this.moleculeGroup);
    this.scene.fog = new THREE.FogExp2(0x0a0a2e, 0.035);

    const envCanvas = document.createElement('canvas');
    envCanvas.width = 2048;
    envCanvas.height = 1024;
    const ctx = envCanvas.getContext('2d')!;

    const gradient = ctx.createLinearGradient(0, 0, 0, envCanvas.height);
    gradient.addColorStop(0, '#1a1a5e');
    gradient.addColorStop(0.3, '#0f0f3a');
    gradient.addColorStop(0.5, '#0a0a2e');
    gradient.addColorStop(0.7, '#0f0f3a');
    gradient.addColorStop(1, '#1a1a5e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, envCanvas.width, envCanvas.height);

    for (let i = 0; i < 500; i++) {
      const x = Math.random() * envCanvas.width;
      const y = Math.random() * envCanvas.height;
      const size = Math.random() * 1.5 + 0.3;
      const brightness = Math.random() * 0.6 + 0.4;

      ctx.beginPath();
      ctx.arc(x, y, size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${brightness})`;
      ctx.fill();
    }

    const nebulaColors = [
      { x: 0.2, y: 0.3, color: 'rgba(123, 47, 247, 0.15)', radius: 200 },
      { x: 0.7, y: 0.6, color: 'rgba(0, 212, 255, 0.12)', radius: 250 },
      { x: 0.5, y: 0.8, color: 'rgba(255, 100, 200, 0.08)', radius: 180 },
    ];

    nebulaColors.forEach(nebula => {
      const nebulaGradient = ctx.createRadialGradient(
        nebula.x * envCanvas.width,
        nebula.y * envCanvas.height,
        0,
        nebula.x * envCanvas.width,
        nebula.y * envCanvas.height,
        nebula.radius
      );
      nebulaGradient.addColorStop(0, nebula.color);
      nebulaGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = nebulaGradient;
      ctx.fillRect(0, 0, envCanvas.width, envCanvas.height);
    });

    const envMap = new THREE.CanvasTexture(envCanvas);
    envMap.mapping = THREE.EquirectangularReflectionMapping;
    envMap.colorSpace = THREE.SRGBColorSpace;
    this.scene.environment = envMap;
    this.envTexture = envMap;

    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = 1920;
    bgCanvas.height = 1080;
    const bgCtx = bgCanvas.getContext('2d')!;

    const bgGradient = bgCtx.createRadialGradient(
      bgCanvas.width / 2, bgCanvas.height / 2, 0,
      bgCanvas.width / 2, bgCanvas.height / 2, Math.max(bgCanvas.width, bgCanvas.height) * 0.7
    );
    bgGradient.addColorStop(0, '#0f0f3a');
    bgGradient.addColorStop(0.4, '#0a0a2e');
    bgGradient.addColorStop(1, '#000005');
    bgCtx.fillStyle = bgGradient;
    bgCtx.fillRect(0, 0, bgCanvas.width, bgCanvas.height);

    for (let i = 0; i < 300; i++) {
      const x = Math.random() * bgCanvas.width;
      const y = Math.random() * bgCanvas.height;
      const size = Math.random() * 1.2 + 0.3;
      const brightness = Math.random() * 0.7 + 0.3;

      bgCtx.beginPath();
      bgCtx.arc(x, y, size, 0, Math.PI * 2);
      bgCtx.fillStyle = `rgba(255, 255, 255, ${brightness * 0.6})`;
      bgCtx.fill();
    }

    const bgTexture = new THREE.CanvasTexture(bgCanvas);
    bgTexture.colorSpace = THREE.SRGBColorSpace;
    this.scene.background = bgTexture;
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x6060a0, 0.5);
    this.scene.add(ambientLight);

    const hemisphereLight = new THREE.HemisphereLight(0x00d4ff, 0x7b2ff7, 0.4);
    this.scene.add(hemisphereLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1.5);
    mainLight.position.set(5, 5, 5);
    this.scene.add(mainLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.6);
    fillLight.position.set(-4, 2, 3);
    this.scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xff88ff, 0.4);
    rimLight.position.set(0, -3, -5);
    this.scene.add(rimLight);

    const pointLight1 = new THREE.PointLight(0x00d4ff, 0.6, 20, 2);
    pointLight1.position.set(3, 2, 3);
    this.scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x7b2ff7, 0.6, 20, 2);
    pointLight2.position.set(-3, -2, -3);
    this.scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0xff88cc, 0.3, 15, 2);
    pointLight3.position.set(0, 3, -2);
    this.scene.add(pointLight3);
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

        this.loadingAtoms.push({
          atom: atomMesh,
          startTime: performance.now(),
          delay: index * 40,
          fadeDuration: 500,
          spreadDuration: 500,
          bounceDuration: 400,
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

    if (animated) {
      this.bondsFadeStartTime = performance.now() + 300;
      this.targetZoom = 0.6;
      this.currentZoom = 0.6;
      setTimeout(() => {
        this.targetZoom = 1;
      }, 50);
    } else {
      this.targetZoom = 1;
      this.currentZoom = 1;
    }

    this.targetRotation = { x: 0.3, y: 0.5 };
    this.currentRotation = { x: 0.3, y: 0.5 };

    if (this.callbacks.onInfoUpdate) {
      this.callbacks.onInfoUpdate({
        name: molecule.name,
        formula: molecule.formula,
        atomCount: molecule.atoms.length,
        bondCount: molecule.bonds.length,
        molecularWeight: calculateMolecularWeight(molecule)
      });
    }
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

    const geometry = new THREE.SphereGeometry(radius, 64, 64);
    const material = new THREE.MeshStandardMaterial({
      color: color,
      metalness: 0.9,
      roughness: 0.1,
      emissive: color,
      emissiveIntensity: 0.05,
      envMapIntensity: 1.5
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

    const bondRadius = 0.06;
    const geometry = new THREE.CylinderGeometry(bondRadius, bondRadius, length, 32);
    const material = new THREE.MeshStandardMaterial({
      color: 0xd0d0d0,
      metalness: 0.95,
      roughness: 0.08,
      envMapIntensity: 2
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

    this.loadingAtoms = [];
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

    this.loadingAtoms = this.loadingAtoms.filter(state => {
      const effectiveStart = state.startTime + state.delay;
      const elapsed = now - effectiveStart;

      if (elapsed < 0) return true;

      const totalDuration = state.spreadDuration + state.bounceDuration;

      if (elapsed >= totalDuration) {
        state.atom.position.copy(state.atom.userData.targetPosition);
        const material = state.atom.material as THREE.MeshStandardMaterial;
        material.opacity = 1;
        material.transparent = false;
        return false;
      }

      if (elapsed < state.spreadDuration) {
        const t = elapsed / state.spreadDuration;
        const spreadT = easeOutCubic(t);

        state.atom.position.lerpVectors(
          state.startPos,
          state.atom.userData.targetPosition,
          spreadT
        );

        const material = state.atom.material as THREE.MeshStandardMaterial;
        material.opacity = Math.min(t * 1.5, 1);
      } else {
        const bounceElapsed = elapsed - state.spreadDuration;
        const bounceT = bounceElapsed / state.bounceDuration;

        const bounceOffset = this.calculateBounce(bounceT, 0.12);

        const direction = new THREE.Vector3()
          .subVectors(state.atom.userData.targetPosition, state.startPos)
          .normalize();

        state.atom.position.copy(state.atom.userData.targetPosition);
        state.atom.position.add(direction.multiplyScalar(bounceOffset));

        const material = state.atom.material as THREE.MeshStandardMaterial;
        material.opacity = 1;
      }

      return true;
    });

    if (this.bondsFadeStartTime > 0 && now > this.bondsFadeStartTime) {
      const bondsElapsed = now - this.bondsFadeStartTime;
      const bondsDuration = 400;
      const bondsT = Math.min(bondsElapsed / bondsDuration, 1);
      const bondsFadeT = easeOutCubic(bondsT);

      this.bonds.forEach(bond => {
        const material = bond.material as THREE.MeshStandardMaterial;
        if (material.transparent) {
          material.opacity = bondsFadeT;
          if (bondsFadeT >= 1) {
            material.transparent = false;
          }
        }
      });

      if (bondsT >= 1) {
        this.bondsFadeStartTime = 0;
      }
    }
  }

  private calculateBounce(t: number, amplitude: number): number {
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

      this.targetRotation.y += 0.0015;
    }

    const lerpFactor = 0.06;
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
      p.velocity.multiplyScalar(0.95);

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
      material.emissiveIntensity = 0.05 + atom.userData.glowIntensity;
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

  public createSparkParticles(position: THREE.Vector3, count: number = 20): void {
    for (let i = 0; i < count; i++) {
      const size = 0.02 + Math.random() * 0.04;
      const geometry = new THREE.SphereGeometry(size, 6, 6);

      const colors = [0x00d4ff, 0x7b2ff7, 0xffffff, 0xffff88, 0xff8844];
      const color = colors[Math.floor(Math.random() * colors.length)];

      const material = new THREE.MeshBasicMaterial({
        color: color,
        transparent: true,
        opacity: 1
      });

      const mesh = new THREE.Mesh(geometry, material);
      mesh.position.copy(position);

      const speed = 2 + Math.random() * 5;
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * speed,
        (Math.random() - 0.5) * speed,
        (Math.random() - 0.5) * speed
      );

      const life = 0.3 + Math.random() * 0.4;

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
