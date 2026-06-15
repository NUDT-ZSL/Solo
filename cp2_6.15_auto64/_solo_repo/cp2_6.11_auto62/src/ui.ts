import * as THREE from 'three';
import { CreatureType, CreatureManager, CREATURE_NAMES } from './creature';
import { PaperSheet, SnapDetector, CompoundStructure } from './paper';

export type GameMode = 'fold' | 'snap';

export class UIManager {
  private sceneContainer: HTMLElement;
  private mode: GameMode = 'fold';
  private creatureManager: CreatureManager;
  private papers: PaperSheet[];
  private compounds: CompoundStructure[] = [];

  private btnFold: HTMLButtonElement;
  private btnSnap: HTMLButtonElement;
  private btnAddPaper: HTMLButtonElement;
  private btnReset: HTMLButtonElement;
  private progressFill: HTMLElement;
  private progressText: HTMLElement;
  private creatureGrid: HTMLElement;
  private modeHint: HTMLElement;
  private flashOverlay: HTMLElement;

  private thumbnailRenderers: Map<CreatureType, { renderer: THREE.WebGLRenderer; scene: THREE.Scene; camera: THREE.PerspectiveCamera; model: THREE.Group }> = new Map();
  private thumbnailAnimFrames: Map<CreatureType, number> = new Map();

  onModeChange: ((mode: GameMode) => void) | null = null;
  onAddPaper: (() => void) | null = null;
  onReset: (() => void) | null = null;
  onFoldLineClick: ((paper: PaperSheet, lineIndex: number) => void) | null = null;
  onPaperDragStart: ((paper: PaperSheet, event: MouseEvent) => void) | null = null;
  onPaperDrag: ((event: MouseEvent) => void) | null = null;
  onPaperDragEnd: (() => void) | null = null;

  private selectedPaper: PaperSheet | null = null;
  private draggedPaper: PaperSheet | null = null;
  private raycaster: THREE.Raycaster = new THREE.Raycaster();
  private mouse: THREE.Vector2 = new THREE.Vector2();
  private mainCamera: THREE.PerspectiveCamera | null = null;

  constructor(
    container: HTMLElement,
    sceneContainer: HTMLElement,
    creatureManager: CreatureManager,
    snapDetector: SnapDetector,
    papers: PaperSheet[]
  ) {
    void container;
    void snapDetector;
    this.sceneContainer = sceneContainer;
    this.creatureManager = creatureManager;
    this.papers = papers;

    this.btnFold = document.getElementById('btn-fold') as HTMLButtonElement;
    this.btnSnap = document.getElementById('btn-snap') as HTMLButtonElement;
    this.btnAddPaper = document.getElementById('btn-add-paper') as HTMLButtonElement;
    this.btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
    this.progressFill = document.getElementById('progress-fill') as HTMLElement;
    this.progressText = document.getElementById('progress-text') as HTMLElement;
    this.creatureGrid = document.getElementById('creature-grid') as HTMLElement;
    this.modeHint = document.getElementById('mode-hint') as HTMLElement;
    this.flashOverlay = document.getElementById('flash-overlay') as HTMLElement;

    this.setupButtons();
    this.setupCreatureGrid();
    this.setupSceneInteraction();
    this.updateProgress();

    creatureManager.onCreatureUnlocked = (creature) => {
      this.triggerFlash();
      this.updateProgress();
      this.updateCreatureGrid();
      this.createThumbnail(creature.type);
    };
  }

  setMainCamera(camera: THREE.PerspectiveCamera): void {
    this.mainCamera = camera;
  }

  private setupButtons(): void {
    this.btnFold.addEventListener('click', () => {
      this.setMode('fold');
    });

    this.btnSnap.addEventListener('click', () => {
      this.setMode('snap');
    });

    this.btnAddPaper.addEventListener('click', () => {
      if (this.onAddPaper) this.onAddPaper();
    });

    this.btnReset.addEventListener('click', () => {
      if (this.onReset) this.onReset();
    });
  }

  setMode(mode: GameMode): void {
    this.mode = mode;
    this.btnFold.classList.toggle('active', mode === 'fold');
    this.btnSnap.classList.toggle('active', mode === 'snap');

    if (mode === 'fold') {
      this.modeHint.textContent = '点击纸片上的折叠线进行折叠';
      if (this.selectedPaper) {
        this.selectedPaper.setSelected(true);
      }
    } else {
      this.modeHint.textContent = '拖拽纸片靠近进行拼接';
      if (this.selectedPaper) {
        this.selectedPaper.setSelected(false);
      }
    }

    if (this.onModeChange) this.onModeChange(mode);
  }

  private setupSceneInteraction(): void {
    this.sceneContainer.addEventListener('mousedown', (e) => this.onMouseDown(e));
    this.sceneContainer.addEventListener('mousemove', (e) => this.onMouseMove(e));
    this.sceneContainer.addEventListener('mouseup', () => this.onMouseUp());
    this.sceneContainer.addEventListener('touchstart', (e) => {
      const touch = e.touches[0];
      this.onMouseDown(touch as any);
    });
    this.sceneContainer.addEventListener('touchmove', (e) => {
      const touch = e.touches[0];
      this.onMouseMove(touch as any);
    });
    this.sceneContainer.addEventListener('touchend', () => this.onMouseUp());
  }

  private updateMouseCoords(event: MouseEvent): void {
    if (!this.mainCamera) return;
    const rect = this.sceneContainer.getBoundingClientRect();
    this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private onMouseDown(event: MouseEvent): void {
    if (!this.mainCamera) return;
    this.updateMouseCoords(event);
    this.raycaster.setFromCamera(this.mouse, this.mainCamera);

    if (this.mode === 'fold') {
      this.handleFoldClick();
    } else {
      this.handleSnapDragStart(event);
    }
  }

  private onMouseMove(event: MouseEvent): void {
    if (this.mode === 'snap' && this.draggedPaper) {
      if (this.onPaperDrag) this.onPaperDrag(event);
    }
  }

  private onMouseUp(): void {
    if (this.draggedPaper) {
      this.draggedPaper.isDragging = false;
      this.draggedPaper = null;
      if (this.onPaperDragEnd) this.onPaperDragEnd();
    }
  }

  private handleFoldClick(): void {
    const paperObjects = this.papers
      .filter(p => p.compoundId === null)
      .flatMap(p => p.mesh.children);
    const intersects = this.raycaster.intersectObjects(paperObjects, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const paperMesh = this.findParentPaper(hit.object);
      if (!paperMesh) return;

      const paper = this.papers.find(p => p.id === paperMesh.userData.paperId);
      if (!paper) return;

      if (!paper.isFoldable()) return;

      const foldLineIntersects = this.raycaster.intersectObjects(
        paper.foldLines.filter(fl => fl.mesh !== null).map(fl => fl.mesh!),
        true
      );

      if (foldLineIntersects.length > 0) {
        const lineIndex = foldLineIntersects[0].object.userData.foldLineIndex;
        if (lineIndex !== undefined) {
          paper.flashFoldLine(lineIndex);
          if (this.onFoldLineClick) this.onFoldLineClick(paper, lineIndex);
        }
      } else {
        if (this.selectedPaper && this.selectedPaper !== paper) {
          this.selectedPaper.setSelected(false);
        }
        paper.setSelected(true);
        this.selectedPaper = paper;
      }
    }
  }

  private handleSnapDragStart(event: MouseEvent): void {
    const paperObjects = this.papers
      .filter(p => p.compoundId === null)
      .flatMap(p => p.mesh.children);
    const intersects = this.raycaster.intersectObjects(paperObjects, true);

    if (intersects.length > 0) {
      const hit = intersects[0];
      const paperMesh = this.findParentPaper(hit.object);
      if (!paperMesh) return;

      const paper = this.papers.find(p => p.id === paperMesh.userData.paperId);
      if (!paper) return;

      this.draggedPaper = paper;
      paper.isDragging = true;

      if (this.onPaperDragStart) this.onPaperDragStart(paper, event);
    }
  }

  private findParentPaper(obj: THREE.Object3D): THREE.Object3D | null {
    let current = obj;
    while (current) {
      if (current.userData && current.userData.paperId) {
        return current;
      }
      current = current.parent!;
    }
    return null;
  }

  private setupCreatureGrid(): void {
    this.creatureGrid.innerHTML = '';
    const types = this.creatureManager.getAllCreatureTypes();

    for (const type of types) {
      const card = document.createElement('div');
      card.className = 'creature-card';
      card.dataset.creatureType = type;

      const nameEl = document.createElement('div');
      nameEl.className = 'creature-name';
      nameEl.textContent = this.isUnlocked(type) ? (CREATURE_NAMES.get(type) || type) : '???';
      card.appendChild(nameEl);

      if (this.isUnlocked(type)) {
        card.classList.add('unlocked');
        card.addEventListener('click', () => {
          const creature = this.creatureManager.getCreature(type);
          if (creature) creature.playAction();
        });
      } else {
        card.classList.add('locked');
      }

      this.creatureGrid.appendChild(card);
    }
  }

  private updateCreatureGrid(): void {
    const types = this.creatureManager.getAllCreatureTypes();
    for (const type of types) {
      const card = this.creatureGrid.querySelector(`[data-creature-type="${type}"]`);
      if (!card) continue;

      const isUnlocked = this.creatureManager.isUnlocked(type);
      if (isUnlocked) {
        card.classList.remove('locked');
        card.classList.add('unlocked');
        const nameEl = card.querySelector('.creature-name');
        if (nameEl) nameEl.textContent = CREATURE_NAMES.get(type) || type;

        card.addEventListener('click', () => {
          const creature = this.creatureManager.getCreature(type);
          if (creature) creature.playAction();
        });
      }
    }
  }

  private createThumbnail(type: CreatureType): void {
    const card = this.creatureGrid.querySelector(`[data-creature-type="${type}"]`);
    if (!card) return;

    const canvas = document.createElement('canvas');
    canvas.width = 120;
    canvas.height = 120;
    canvas.style.width = '80%';
    canvas.style.height = '80%';
    card.insertBefore(canvas, card.firstChild);

    const thumbnailScene = new THREE.Scene();
    const thumbnailCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    thumbnailCamera.position.set(2, 1.5, 2);
    thumbnailCamera.lookAt(0, 0, 0);

    const ambLight = new THREE.AmbientLight(0x404040, 2);
    thumbnailScene.add(ambLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(2, 3, 2);
    thumbnailScene.add(dirLight);

    const creature = this.creatureManager.getCreature(type);
    if (!creature) return;

    const modelClone = creature.mesh.clone();
    modelClone.position.set(0, 0, 0);
    modelClone.scale.set(1, 1, 1);
    thumbnailScene.add(modelClone);

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setSize(120, 120);
    renderer.setClearColor(0x000000, 0);

    const rotationSpeed = (2 * Math.PI) / (4 * 60);

    const animate = () => {
      modelClone.rotation.y += rotationSpeed;
      renderer.render(thumbnailScene, thumbnailCamera);
      const frameId = requestAnimationFrame(animate);
      this.thumbnailAnimFrames.set(type, frameId);
    };

    this.thumbnailRenderers.set(type, { renderer, scene: thumbnailScene, camera: thumbnailCamera, model: modelClone });
    animate();
  }

  private isUnlocked(type: CreatureType): boolean {
    return this.creatureManager.isUnlocked(type);
  }

  private updateProgress(): void {
    const unlocked = this.creatureManager.getUnlockedCount();
    const total = this.creatureManager.totalCreatures;
    const pct = (unlocked / total) * 100;
    this.progressFill.style.width = `${pct}%`;
    this.progressText.textContent = `${unlocked} / ${total} 已解锁`;
  }

  triggerFlash(): void {
    this.flashOverlay.classList.add('active');
    setTimeout(() => {
      this.flashOverlay.classList.remove('active');
    }, 300);
  }

  addPaper(paper: PaperSheet): void {
    this.papers.push(paper);
  }

  removePaper(paperId: string): void {
    const idx = this.papers.findIndex(p => p.id === paperId);
    if (idx >= 0) this.papers.splice(idx, 1);
  }

  addCompound(compound: CompoundStructure): void {
    this.compounds.push(compound);
  }

  clearPapers(): void {
    this.papers.length = 0;
    this.selectedPaper = null;
    this.draggedPaper = null;
  }

  clearCompounds(): void {
    this.compounds.length = 0;
  }

  getMode(): GameMode {
    return this.mode;
  }

  getSelectedPaper(): PaperSheet | null {
    return this.selectedPaper;
  }

  getDraggedPaper(): PaperSheet | null {
    return this.draggedPaper;
  }

  dispose(): void {
    for (const [, frameId] of this.thumbnailAnimFrames) {
      cancelAnimationFrame(frameId);
    }
    for (const [, data] of this.thumbnailRenderers) {
      data.renderer.dispose();
    }
  }
}
