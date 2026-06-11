import * as THREE from 'three';
import { PaperSheet, SnapDetector, CompoundStructure } from './paper';
import { CreatureManager } from './creature';
import { UIManager } from './ui';

class QuantumOrigami {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private uiManager: UIManager;
  private creatureManager: CreatureManager;
  private snapDetector: SnapDetector;
  private papers: PaperSheet[] = [];
  private compounds: CompoundStructure[] = [];
  private clock: THREE.Clock;
  private paperIdCounter: number = 0;
  private isAnimating: boolean = false;
  private snapParticleSystems: { particles: THREE.Points; startTime: number }[] = [];
  private dragPlane: THREE.Plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private dragOffset: THREE.Vector3 = new THREE.Vector3();
  private intersection: THREE.Vector3 = new THREE.Vector3();

  constructor() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
    this.camera.position.set(0, 8, 8);
    this.camera.lookAt(0, 0, 0);

    const container = document.getElementById('scene-container')!;
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.shadowMap.enabled = false;
    container.appendChild(this.renderer.domElement);

    this.clock = new THREE.Clock();

    this.setupLighting();
    this.setupBackground();

    this.creatureManager = new CreatureManager(this.scene);
    this.snapDetector = new SnapDetector();
    this.uiManager = new UIManager(
      document.getElementById('ui-panel')!,
      container,
      this.creatureManager,
      this.snapDetector,
      this.papers
    );
    this.uiManager.setMainCamera(this.camera);

    this.setupUICallbacks();
    this.setupResize();
    this.onResize();

    this.addInitialPapers();

    this.hideLoadingScreen();

    this.animate();
  }

  private setupLighting(): void {
    const ambientLight = new THREE.AmbientLight(0x404060, 1.5);
    this.scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
    directionalLight.position.set(5, 10, 5);
    this.scene.add(directionalLight);

    const fillLight = new THREE.DirectionalLight(0x8888ff, 0.4);
    fillLight.position.set(-5, 5, -5);
    this.scene.add(fillLight);
  }

  private setupBackground(): void {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 360);
    gradient.addColorStop(0, '#16213e');
    gradient.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 512);

    const texture = new THREE.CanvasTexture(canvas);
    this.scene.background = texture;

    const gridHelper = new THREE.GridHelper(20, 20, 0x333355, 0x222244);
    gridHelper.position.y = -0.01;
    (gridHelper.material as THREE.Material).transparent = true;
    (gridHelper.material as THREE.Material).opacity = 0.3;
    this.scene.add(gridHelper);
  }

  private setupUICallbacks(): void {
    this.uiManager.onAddPaper = () => {
      this.addNewPaper();
    };

    this.uiManager.onReset = () => {
      this.resetScene();
    };

    this.uiManager.onFoldLineClick = (paper, lineIndex) => {
      this.performFold(paper, lineIndex);
    };

    this.uiManager.onPaperDragStart = (paper, event) => {
      this.startDrag(paper, event);
    };

    this.uiManager.onPaperDrag = (event) => {
      this.continueDrag(event);
    };

    this.uiManager.onPaperDragEnd = () => {
      this.endDrag();
    };
  }

  private generatePaperId(): string {
    this.paperIdCounter++;
    return `paper_${this.paperIdCounter}`;
  }

  private addInitialPapers(): void {
    const paper1 = new PaperSheet(this.scene, new THREE.Vector3(-2, 0, 0), this.generatePaperId());
    const paper2 = new PaperSheet(this.scene, new THREE.Vector3(2, 0, 0), this.generatePaperId());
    this.scene.add(paper1.mesh);
    this.scene.add(paper2.mesh);
    this.papers.push(paper1, paper2);
    this.uiManager.addPaper(paper1);
    this.uiManager.addPaper(paper2);
  }

  private addNewPaper(): void {
    const offset = this.papers.length * 1.5;
    const x = (offset % 6) - 3;
    const z = Math.floor(offset / 6) * 2;
    const paper = new PaperSheet(this.scene, new THREE.Vector3(x, 0, z), this.generatePaperId());
    this.scene.add(paper.mesh);
    this.papers.push(paper);
    this.uiManager.addPaper(paper);
  }

  private resetScene(): void {
    for (const paper of this.papers) {
      this.scene.remove(paper.mesh);
      paper.dispose();
    }
    for (const compound of this.compounds) {
      compound.dispose(this.scene);
    }
    this.papers.length = 0;
    this.compounds.length = 0;
    this.uiManager.clearPapers();
    this.uiManager.clearCompounds();
    this.paperIdCounter = 0;
    this.isAnimating = false;
    this.addInitialPapers();
  }

  private performFold(paper: PaperSheet, lineIndex: number): void {
    if (this.isAnimating) return;
    if (!paper.isFoldable()) return;

    this.isAnimating = true;
    paper.fold(lineIndex, () => {
      this.isAnimating = false;
    });
  }

  private startDrag(paper: PaperSheet, event: MouseEvent): void {
    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const planeIntersect = new THREE.Vector3();
    raycaster.ray.intersectPlane(this.dragPlane, planeIntersect);

    if (planeIntersect) {
      this.dragOffset.copy(paper.mesh.position).sub(planeIntersect);
    }
  }

  private continueDrag(event: MouseEvent): void {
    const paper = this.uiManager.getDraggedPaper();
    if (!paper) return;

    const rect = this.renderer.domElement.getBoundingClientRect();
    const mouse = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, this.camera);

    const planeIntersect = new THREE.Vector3();
    raycaster.ray.intersectPlane(this.dragPlane, planeIntersect);

    if (planeIntersect) {
      paper.mesh.position.copy(planeIntersect.add(this.dragOffset));
    }
  }

  private endDrag(): void {
    const freePapers = this.papers.filter(p => p.compoundId === null);
    const pair = this.snapDetector.findClosestPair(freePapers);

    if (pair) {
      this.performSnap(pair[0], pair[1]);
    }
  }

  private performSnap(paperA: PaperSheet, paperB: PaperSheet): void {
    this.isAnimating = true;

    const midPos = new THREE.Vector3().addVectors(paperA.mesh.position, paperB.mesh.position).multiplyScalar(0.5);
    midPos.y = 0;

    this.createSnapParticles(midPos);

    const duration = 1000;
    const startTime = performance.now();

    const startA = paperA.mesh.position.clone();
    const startB = paperB.mesh.position.clone();

    const animateSnap = () => {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

      paperA.mesh.position.lerpVectors(startA, midPos, eased);
      paperB.mesh.position.lerpVectors(startB, midPos, eased);

      if (t < 1) {
        requestAnimationFrame(animateSnap);
      } else {
        this.scene.remove(paperA.mesh);
        this.scene.remove(paperB.mesh);

        this.uiManager.removePaper(paperA.id);
        this.uiManager.removePaper(paperB.id);

        const idxA = this.papers.indexOf(paperA);
        if (idxA >= 0) this.papers.splice(idxA, 1);
        const idxB = this.papers.indexOf(paperB);
        if (idxB >= 0) this.papers.splice(idxB, 1);

        const compoundId = `compound_${Date.now()}`;
        const compound = new CompoundStructure(compoundId, [paperA, paperB], this.scene);
        compound.mesh.position.copy(midPos);

        this.compounds.push(compound);
        this.uiManager.addCompound(compound);

        const creature = this.creatureManager.tryUnlock(compound);
        if (creature) {
          this.uiManager.triggerFlash();
        }

        this.isAnimating = false;
      }
    };

    requestAnimationFrame(animateSnap);
  }

  private createSnapParticles(position: THREE.Vector3): void {
    const particleCount = 50;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      const idx = i * 3;
      const angle = Math.random() * Math.PI * 2;
      const radius = Math.random() * 0.5;
      positions[idx] = position.x + Math.cos(angle) * radius;
      positions[idx + 1] = position.y + 0.2 + Math.random() * 0.3;
      positions[idx + 2] = position.z + Math.sin(angle) * radius;

      const goldenColor = new THREE.Color('#FFD700');
      const lerpT = Math.random();
      colors[idx] = goldenColor.r * (1 - lerpT * 0.3);
      colors[idx + 1] = goldenColor.g * (1 - lerpT * 0.5);
      colors[idx + 2] = 0;

      sizes[i] = 3 + Math.random() * 5;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 0.1,
      vertexColors: true,
      transparent: true,
      opacity: 1,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const points = new THREE.Points(geometry, material);
    this.scene.add(points);

    this.snapParticleSystems.push({
      particles: points,
      startTime: performance.now(),
    });
  }

  private updateSnapParticles(): void {
    const now = performance.now();

    this.snapParticleSystems = this.snapParticleSystems.filter((system) => {
      const elapsed = now - system.startTime;
      const duration = 1000;

      if (elapsed > duration) {
        this.scene.remove(system.particles);
        system.particles.geometry.dispose();
        (system.particles.material as THREE.Material).dispose();
        return false;
      }

      const t = elapsed / duration;
      const positions = system.particles.geometry.attributes.position as THREE.BufferAttribute;

      for (let i = 0; i < positions.count; i++) {
        const idx = i * 3;
        const x = positions.getX(i);
        const y = positions.getY(i);
        const z = positions.getZ(i);

        const angle = Math.atan2(z, x);
        const dist = Math.sqrt(x * x + z * z);
        const newDist = dist + 0.02;

        positions.setXYZ(i,
          Math.cos(angle) * newDist,
          y + 0.01,
          Math.sin(angle) * newDist
        );
      }

      positions.needsUpdate = true;

      (system.particles.material as THREE.PointsMaterial).opacity = 1 - t;

      return true;
    });
  }

  private setupResize(): void {
    window.addEventListener('resize', () => this.onResize());
  }

  private onResize(): void {
    const container = document.getElementById('scene-container')!;
    const width = container.clientWidth;
    const height = container.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  private hideLoadingScreen(): void {
    setTimeout(() => {
      const loadingScreen = document.getElementById('loading-screen');
      if (loadingScreen) {
        loadingScreen.classList.add('hidden');
        setTimeout(() => loadingScreen.remove(), 500);
      }
    }, 800);
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate());

    const deltaMs = this.clock.getDelta() * 1000;

    this.creatureManager.update(deltaMs);
    this.updateSnapParticles();

    this.renderer.render(this.scene, this.camera);
  }
}

new QuantumOrigami();
