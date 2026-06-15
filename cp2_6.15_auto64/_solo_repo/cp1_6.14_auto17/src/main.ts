import * as THREE from 'three';
import { DataLoader, Artifact } from './dataLoader';
import { SceneManager } from './sceneManager';
import { TimelineModule } from './timelineModule';
import { SearchModule } from './searchModule';

class DeepStratifyApp {
  private dataLoader: DataLoader;
  private sceneManager: SceneManager;
  private timelineModule: TimelineModule;
  private searchModule: SearchModule;

  private artifactCard: HTMLElement;
  private cardName: HTMLElement;
  private cardMeta: HTMLElement;
  private cardDescription: HTMLElement;
  private cardTTS: HTMLButtonElement;
  private cardClose: HTMLButtonElement;
  private stratumSlider: HTMLInputElement;
  private filterSelect: HTMLSelectElement;
  private hamburgerBtn: HTMLElement;
  private leftPanel: HTMLElement;
  private loadingOverlay: HTMLElement;

  private currentArtifact: Artifact | null = null;
  private currentCategory: string = 'all';
  private currentYearRange: [number, number] = [0, 2000];

  constructor() {
    this.dataLoader = new DataLoader();

    const canvasContainer = document.getElementById('canvas-container')!;
    this.sceneManager = new SceneManager(canvasContainer, this.dataLoader);

    const timelineSvg = document.getElementById('timeline-svg') as unknown as SVGSVGElement;
    this.timelineModule = new TimelineModule(timelineSvg, this.dataLoader);

    const searchInput = document.getElementById('search-input') as HTMLInputElement;
    const micBtn = document.getElementById('mic-btn') as HTMLButtonElement;
    const searchDropdown = document.getElementById('search-dropdown') as HTMLDivElement;
    this.searchModule = new SearchModule(searchInput, micBtn, searchDropdown, this.dataLoader);

    this.artifactCard = document.getElementById('artifact-card')!;
    this.cardName = document.getElementById('card-name')!;
    this.cardMeta = document.getElementById('card-meta')!;
    this.cardDescription = document.getElementById('card-description')!;
    this.cardTTS = document.getElementById('card-tts') as HTMLButtonElement;
    this.cardClose = document.getElementById('card-close') as HTMLButtonElement;
    this.stratumSlider = document.getElementById('stratum-slider') as HTMLInputElement;
    this.filterSelect = document.getElementById('filter-select') as HTMLSelectElement;
    this.hamburgerBtn = document.getElementById('hamburger-btn')!;
    this.leftPanel = document.getElementById('left-panel')!;
    this.loadingOverlay = document.getElementById('loading-overlay')!;

    this.wireUpEvents();
    this.hideLoading();
    this.setupResponsive();
  }

  private wireUpEvents(): void {
    this.sceneManager.setOnArtifactSelect((artifact: Artifact) => {
      this.showArtifactCard(artifact);
    });

    this.timelineModule.setOnYearRangeChange((minYear: number, maxYear: number) => {
      this.currentYearRange = [minYear, maxYear];
      this.sceneManager.filterArtifactsByYearRange(minYear, maxYear);
    });

    this.searchModule.setOnArtifactFocus((artifactId: string) => {
      this.sceneManager.flyToArtifact(artifactId);
      const artifact = this.dataLoader.getArtifactById(artifactId);
      if (artifact) this.showArtifactCard(artifact);
    });

    this.stratumSlider.addEventListener('input', () => {
      const value = parseFloat(this.stratumSlider.value);
      this.sceneManager.setClippingDepth(value);
    });

    this.filterSelect.addEventListener('change', () => {
      this.currentCategory = this.filterSelect.value;
      this.sceneManager.filterArtifactsByCategory(this.currentCategory);
    });

    this.cardClose.addEventListener('click', () => {
      this.hideArtifactCard();
    });

    this.cardTTS.addEventListener('click', () => {
      if (this.currentArtifact) {
        const text = `${this.currentArtifact.name}。${this.currentArtifact.description}`;
        this.searchModule.speakText(text);
        this.cardTTS.textContent = '⏹ 停止朗读';
        setTimeout(() => {
          this.cardTTS.textContent = '🔊 朗读描述';
        }, 5000);
      }
    });

    document.getElementById('zoom-in')!.addEventListener('click', () => {
      this.timelineModule.zoomIn();
    });

    document.getElementById('zoom-out')!.addEventListener('click', () => {
      this.timelineModule.zoomOut();
    });

    this.hamburgerBtn.addEventListener('click', () => {
      this.leftPanel.classList.toggle('open');
    });

    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        this.hideArtifactCard();
        this.leftPanel.classList.remove('open');
      }
    });

    document.addEventListener('click', (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (this.leftPanel.classList.contains('open') &&
          !this.leftPanel.contains(target) &&
          target !== this.hamburgerBtn) {
        this.leftPanel.classList.remove('open');
      }
    });
  }

  private showArtifactCard(artifact: Artifact): void {
    this.currentArtifact = artifact;
    this.cardName.textContent = artifact.name;
    this.cardMeta.innerHTML = `
      <span>距今${artifact.year}年</span>
      <span>${artifact.material}</span>
      <span>${artifact.category}</span>
    `;
    this.cardDescription.textContent = artifact.description;
    this.cardTTS.textContent = '🔊 朗读描述';

    const stratum = this.dataLoader.getStrata().find(s => s.id === artifact.stratumId);
    const pos = this.dataLoader.getArtifactWorldPosition(artifact);

    const screenPos = this.worldToScreen(pos);
    if (screenPos) {
      const cardWidth = 320;
      const cardHeight = 280;
      let left = screenPos.x + 20;
      let top = screenPos.y - cardHeight / 2;

      if (left + cardWidth > window.innerWidth - 20) {
        left = screenPos.x - cardWidth - 20;
      }
      top = Math.max(20, Math.min(top, window.innerHeight - cardHeight - 20));
      this.artifactCard.style.left = `${left}px`;
      this.artifactCard.style.top = `${top}px`;
    }

    this.artifactCard.classList.add('visible');
  }

  private hideArtifactCard(): void {
    this.artifactCard.classList.remove('visible');
    this.currentArtifact = null;
  }

  private worldToScreen(worldPos: { x: number; y: number; z: number }): { x: number; y: number } | null {
    const camera = this.sceneManager.getCamera();
    const renderer = this.sceneManager.getRenderer();
    const vec = new THREE.Vector3(worldPos.x, worldPos.y, worldPos.z);
    vec.project(camera);

    if (vec.z > 1) return null;

    const widthHalf = renderer.domElement.clientWidth / 2;
    const heightHalf = renderer.domElement.clientHeight / 2;

    return {
      x: vec.x * widthHalf + widthHalf,
      y: -(vec.y * heightHalf) + heightHalf
    };
  }

  private hideLoading(): void {
    setTimeout(() => {
      this.loadingOverlay.classList.add('hidden');
      setTimeout(() => {
        this.loadingOverlay.style.display = 'none';
      }, 500);
    }, 800);
  }

  private setupResponsive(): void {
    const mq = window.matchMedia('(max-width: 768px)');
    const handleMQ = (e: MediaQueryListEvent | MediaQueryList) => {
      if (e.matches) {
        document.body.classList.add('mobile');
      } else {
        document.body.classList.remove('mobile');
        this.leftPanel.classList.remove('open');
      }
    };
    mq.addEventListener('change', handleMQ);
    handleMQ(mq);
  }
}

export default DeepStratifyApp;

new DeepStratifyApp();
