import * as THREE from 'three';
import { createId } from 'cuid';
import { IngredientSystem, DessertProperties, INGREDIENTS, IngredientType } from './ingredients';
import { BakingSystem, BakingState } from './baking';
import { DecorationSystem } from './decorate';

enum AppState {
  MIXING = 'mixing',
  BAKING = 'baking',
  DECORATING = 'decorating',
  SHARING = 'sharing'
}

interface StarParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
}

class StardustBakeryApp {
  private state: AppState = AppState.MIXING;
  private ingredientSystem: IngredientSystem;
  private bakingSystem: BakingSystem | null = null;
  private decorationSystem: DecorationSystem | null = null;
  
  private mainRenderer: THREE.WebGLRenderer;
  private mainScene: THREE.Scene;
  private mainCamera: THREE.PerspectiveCamera;
  
  private previewRenderer: THREE.WebGLRenderer;
  private previewScene: THREE.Scene;
  private previewCamera: THREE.PerspectiveCamera;
  private previewMesh: THREE.Mesh | null = null;
  private previewMaterial: THREE.MeshStandardMaterial | null = null;
  
  private ovenRenderer: THREE.WebGLRenderer;
  private ovenScene: THREE.Scene;
  private ovenCamera: THREE.PerspectiveCamera;
  
  private decorateRenderer: THREE.WebGLRenderer;
  private decorateScene: THREE.Scene;
  private decorateCamera: THREE.PerspectiveCamera;
  
  private starCanvas: HTMLCanvasElement;
  private starCtx: CanvasRenderingContext2D;
  private starParticles: StarParticle[] = [];
  private maxStarParticles = 150;
  
  private currentProperties: DessertProperties;
  private animationFrameId: number | null = null;
  private clock: THREE.Clock = new THREE.Clock();

  constructor() {
    this.ingredientSystem = new IngredientSystem();
    
    this.currentProperties = {
      sweetness: 0,
      fluffiness: 0,
      glowIntensity: 0,
      ingredients: {
        [IngredientType.GLOWING_BERRY]: 0,
        [IngredientType.STARDUST_FLOUR]: 0,
        [IngredientType.MOONLIGHT_CREAM]: 0,
        [IngredientType.COMET_FROSTING]: 0
      },
      totalIngredients: 0
    };

    this.mainRenderer = this.createRenderer('main-canvas');
    this.mainScene = new THREE.Scene();
    this.mainCamera = this.createCamera();

    this.previewRenderer = this.createRenderer('preview-canvas');
    this.previewScene = new THREE.Scene();
    this.previewCamera = this.createCamera();

    this.ovenRenderer = this.createRenderer('oven-canvas');
    this.ovenScene = new THREE.Scene();
    this.ovenCamera = this.createCamera();

    this.decorateRenderer = this.createRenderer('decorate-canvas');
    this.decorateScene = new THREE.Scene();
    this.decorateCamera = this.createCamera();

    this.starCanvas = document.getElementById('star-particles') as HTMLCanvasElement;
    this.starCtx = this.starCanvas.getContext('2d')!;

    this.init();
  }

  private createRenderer(canvasId: string): THREE.WebGLRenderer {
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    const rect = canvas.getBoundingClientRect();
    
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: true,
      preserveDrawingBuffer: true
    });
    
    renderer.setSize(rect.width, rect.height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    return renderer;
  }

  private createCamera(): THREE.PerspectiveCamera {
    const camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 1, 5);
    camera.lookAt(0, 0, 0);
    return camera;
  }

  private init(): void {
    this.setupMainScene();
    this.setupPreviewScene();
    this.setupIngredientSystem();
    this.setupStarParticles();
    this.setupEventListeners();
    this.startAnimation();
  }

  private setupMainScene(): void {
    const ambientLight = new THREE.AmbientLight(0x404040, 0.5);
    this.mainScene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(5, 5, 5);
    this.mainScene.add(mainLight);

    const rimLight = new THREE.PointLight(0x87ceeb, 0.4, 10);
    rimLight.position.set(-3, 2, -3);
    this.mainScene.add(rimLight);
  }

  private setupPreviewScene(): void {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.previewScene.add(ambientLight);

    const mainLight = new THREE.DirectionalLight(0xffffff, 1);
    mainLight.position.set(3, 3, 3);
    this.previewScene.add(mainLight);

    const fillLight = new THREE.PointLight(0xff69b4, 0.3, 10);
    fillLight.position.set(-2, 1, -2);
    this.previewScene.add(fillLight);

    this.createPreviewDessert();
  }

  private createPreviewDessert(): void {
    const geometry = new THREE.SphereGeometry(0.8, 32, 32);
    
    this.previewMaterial = new THREE.MeshStandardMaterial({
      color: 0xcccccc,
      metalness: 0.1,
      roughness: 0.5,
      emissive: 0xcccccc,
      emissiveIntensity: 0.1
    });

    this.previewMesh = new THREE.Mesh(geometry, this.previewMaterial);
    this.previewScene.add(this.previewMesh);
  }

  private setupIngredientSystem(): void {
    const ingredientCanvases = document.querySelectorAll('.ingredient-particle-canvas') as NodeListOf<HTMLCanvasElement>;
    const bowlCanvas = document.getElementById('bowl-particles') as HTMLCanvasElement;
    const ratioCanvas = document.getElementById('ratio-canvas') as HTMLCanvasElement;

    this.ingredientSystem.init(
      ingredientCanvases,
      bowlCanvas,
      ratioCanvas,
      (properties: DessertProperties) => {
        this.currentProperties = properties;
        this.updatePreviewDessert();
        this.updatePropertyBars();
      }
    );
  }

  private setupStarParticles(): void {
    const rect = this.starCanvas.getBoundingClientRect();
    this.starCanvas.width = rect.width * window.devicePixelRatio;
    this.starCanvas.height = rect.height * window.devicePixelRatio;
    this.starCtx.scale(window.devicePixelRatio, window.devicePixelRatio);

    for (let i = 0; i < this.maxStarParticles; i++) {
      this.spawnStarParticle(true);
    }
  }

  private spawnStarParticle(randomY: boolean = false): void {
    const rect = this.starCanvas.getBoundingClientRect();
    const colors = ['#FFFFFF', '#E0E0FF', '#C0C0FF', '#A0B0FF', '#8090FF'];
    
    this.starParticles.push({
      x: Math.random() * rect.width,
      y: randomY ? Math.random() * rect.height : rect.height + 10,
      vx: (Math.random() - 0.5) * 0.3,
      vy: -0.5 - Math.random() * 0.5,
      size: 1 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      alpha: 0.3 + Math.random() * 0.7
    });
  }

  private setupEventListeners(): void {
    const bakeButton = document.getElementById('bake-button') as HTMLButtonElement;
    bakeButton.addEventListener('click', () => this.startBaking());

    const resetButton = document.getElementById('reset-button') as HTMLButtonElement;
    resetButton.addEventListener('click', () => this.reset());

    const backButton = document.getElementById('back-button') as HTMLButtonElement;
    backButton.addEventListener('click', () => this.backToMixing());

    const shareButton = document.getElementById('share-button') as HTMLButtonElement;
    shareButton.addEventListener('click', () => this.generateShareCard());

    const copyLinkButton = document.getElementById('copy-link-button') as HTMLButtonElement;
    copyLinkButton.addEventListener('click', () => this.copyShareLink());

    const downloadButton = document.getElementById('download-button') as HTMLButtonElement;
    downloadButton.addEventListener('click', () => this.downloadCardImage());

    const restartButton = document.getElementById('restart-button') as HTMLButtonElement;
    restartButton.addEventListener('click', () => this.reset());

    window.addEventListener('resize', () => this.onResize());
  }

  private updatePreviewDessert(): void {
    if (!this.previewMesh || !this.previewMaterial) return;

    const mixedColor = this.ingredientSystem.getMixedColor();
    this.previewMaterial.color.copy(mixedColor);
    this.previewMaterial.emissive.copy(mixedColor);
    this.previewMaterial.emissiveIntensity = 0.1 + (this.currentProperties.glowIntensity / 100) * 0.5;

    const scale = 0.8 + (this.currentProperties.fluffiness / 100) * 0.4;
    this.previewMesh.scale.setScalar(scale);
  }

  private updatePropertyBars(): void {
    const sweetnessValue = document.getElementById('sweetness-value');
    const sweetnessFill = document.getElementById('sweetness-fill');
    const fluffinessValue = document.getElementById('fluffiness-value');
    const fluffinessFill = document.getElementById('fluffiness-fill');
    const glowValue = document.getElementById('glow-value');
    const glowFill = document.getElementById('glow-fill');

    if (sweetnessValue) sweetnessValue.textContent = this.currentProperties.sweetness.toString();
    if (sweetnessFill) sweetnessFill.style.width = `${this.currentProperties.sweetness}%`;
    
    if (fluffinessValue) fluffinessValue.textContent = this.currentProperties.fluffiness.toString();
    if (fluffinessFill) fluffinessFill.style.width = `${this.currentProperties.fluffiness}%`;
    
    if (glowValue) glowValue.textContent = this.currentProperties.glowIntensity.toString();
    if (glowFill) glowFill.style.width = `${this.currentProperties.glowIntensity}%`;
  }

  private startBaking(): void {
    if (this.currentProperties.totalIngredients === 0) return;

    this.state = AppState.BAKING;

    const ovenView = document.getElementById('oven-view');
    if (ovenView) {
      ovenView.style.display = 'block';
    }

    this.bakingSystem = new BakingSystem(
      this.ovenScene,
      this.ovenCamera,
      this.ovenRenderer
    );

    const initialColor = this.ingredientSystem.getMixedColor();
    this.bakingSystem.init(this.currentProperties, initialColor);

    this.bakingSystem.startBaking(() => {
      this.showDecorationPanel();
    });
  }

  private showDecorationPanel(): void {
    if (!this.bakingSystem) return;

    this.state = AppState.DECORATING;

    const ovenView = document.getElementById('oven-view');
    const decoratePanel = document.getElementById('decorate-panel');

    if (ovenView) {
      ovenView.style.display = 'none';
    }
    if (decoratePanel) {
      decoratePanel.style.display = 'block';
    }

    const dessertMesh = this.bakingSystem.getDessertMesh();
    if (!dessertMesh) return;

    this.bakingSystem.reset();
    this.bakingSystem = null;

    this.decorationSystem = new DecorationSystem(
      this.decorateScene,
      this.decorateCamera,
      this.decorateRenderer,
      dessertMesh,
      this.currentProperties
    );

    setTimeout(() => {
      this.onResize();
    }, 100);
  }

  private async generateShareCard(): Promise<void> {
    if (!this.decorationSystem) return;

    this.state = AppState.SHARING;

    const cardData = await this.decorationSystem.generateShareCard();
    
    const cardModal = document.getElementById('card-modal');
    const cardScreenshot = document.getElementById('card-screenshot') as HTMLImageElement;
    const cardDescription = document.getElementById('card-description');
    const shareLink = document.getElementById('share-link');
    const cardSweetness = document.getElementById('card-sweetness');
    const cardFluffiness = document.getElementById('card-fluffiness');
    const cardGlow = document.getElementById('card-glow');

    if (cardScreenshot) cardScreenshot.src = cardData.imageData;
    if (cardDescription) cardDescription.textContent = cardData.description;
    if (shareLink) shareLink.textContent = cardData.shareLink;
    
    if (cardSweetness) cardSweetness.textContent = this.decorationSystem.getStarRating(this.currentProperties.sweetness);
    if (cardFluffiness) cardFluffiness.textContent = this.decorationSystem.getStarRating(this.currentProperties.fluffiness);
    if (cardGlow) cardGlow.textContent = this.decorationSystem.getStarRating(this.currentProperties.glowIntensity);

    if (cardModal) {
      cardModal.style.display = 'flex';
    }

    (window as any).currentCardData = cardData;
  }

  private async copyShareLink(): Promise<void> {
    const shareLink = document.getElementById('share-link');
    if (!shareLink || !this.decorationSystem) return;

    const link = shareLink.textContent || '';
    const success = await this.decorationSystem.copyToClipboard(link);
    
    if (success) {
      const copyButton = document.getElementById('copy-link-button');
      if (copyButton) {
        const originalText = copyButton.textContent;
        copyButton.textContent = '已复制!';
        setTimeout(() => {
          copyButton.textContent = originalText;
        }, 2000);
      }
    }
  }

  private downloadCardImage(): void {
    if (!this.decorationSystem) return;
    
    const cardData = (window as any).currentCardData;
    if (cardData?.imageData) {
      const id = createId();
      this.decorationSystem.downloadImage(cardData.imageData, `stardust-dessert-${id}.png`);
    }
  }

  private backToMixing(): void {
    this.state = AppState.MIXING;

    const decoratePanel = document.getElementById('decorate-panel');
    if (decoratePanel) {
      decoratePanel.style.display = 'none';
    }

    if (this.decorationSystem) {
      this.decorationSystem.reset();
      this.decorationSystem = null;
    }

    this.decorateScene.clear();
  }

  private reset(): void {
    this.state = AppState.MIXING;

    const ovenView = document.getElementById('oven-view');
    const decoratePanel = document.getElementById('decorate-panel');
    const cardModal = document.getElementById('card-modal');

    if (ovenView) ovenView.style.display = 'none';
    if (decoratePanel) decoratePanel.style.display = 'none';
    if (cardModal) cardModal.style.display = 'none';

    if (this.bakingSystem) {
      this.bakingSystem.reset();
      this.bakingSystem = null;
    }

    if (this.decorationSystem) {
      this.decorationSystem.reset();
      this.decorationSystem = null;
    }

    this.ingredientSystem.reset();
    
    this.ovenScene.clear();
    this.decorateScene.clear();

    this.currentProperties = {
      sweetness: 0,
      fluffiness: 0,
      glowIntensity: 0,
      ingredients: {
        [IngredientType.GLOWING_BERRY]: 0,
        [IngredientType.STARDUST_FLOUR]: 0,
        [IngredientType.MOONLIGHT_CREAM]: 0,
        [IngredientType.COMET_FROSTING]: 0
      },
      totalIngredients: 0
    };

    this.updatePropertyBars();
    this.updatePreviewDessert();
  }

  private startAnimation(): void {
    const animate = () => {
      const delta = this.clock.getDelta();
      
      this.update(delta);
      this.render();

      this.animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  private update(delta: number): void {
    if (this.previewMesh && this.state === AppState.MIXING) {
      this.previewMesh.rotation.y += delta * 0.5;
      this.previewMesh.position.y = Math.sin(performance.now() * 0.001) * 0.05;
    }

    this.updateStarParticles(delta);
  }

  private updateStarParticles(delta: number): void {
    const rect = this.starCanvas.getBoundingClientRect();
    const speed = 20 * delta;

    this.starCtx.clearRect(0, 0, rect.width, rect.height);

    this.starParticles = this.starParticles.filter(p => {
      p.x += p.vx * speed;
      p.y += p.vy * speed;

      if (p.y < -10 || p.x < -10 || p.x > rect.width + 10) {
        return false;
      }

      const gradient = this.starCtx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 3);
      gradient.addColorStop(0, p.color + Math.floor(p.alpha * 255).toString(16).padStart(2, '0'));
      gradient.addColorStop(0.5, p.color + Math.floor(p.alpha * 150).toString(16).padStart(2, '0'));
      gradient.addColorStop(1, 'transparent');

      this.starCtx.fillStyle = gradient;
      this.starCtx.beginPath();
      this.starCtx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      this.starCtx.fill();

      return true;
    });

    while (this.starParticles.length < this.maxStarParticles) {
      this.spawnStarParticle(false);
    }
  }

  private render(): void {
    if (this.state === AppState.MIXING) {
      this.mainRenderer.render(this.mainScene, this.mainCamera);
      this.previewRenderer.render(this.previewScene, this.previewCamera);
    }
  }

  private onResize(): void {
    const updateRendererSize = (renderer: THREE.WebGLRenderer, canvasId: string) => {
      const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      renderer.setSize(rect.width, rect.height, false);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    };

    updateRendererSize(this.mainRenderer, 'main-canvas');
    updateRendererSize(this.previewRenderer, 'preview-canvas');
    updateRendererSize(this.ovenRenderer, 'oven-canvas');
    updateRendererSize(this.decorateRenderer, 'decorate-canvas');

    const updateCameraAspect = (camera: THREE.PerspectiveCamera, canvasId: string) => {
      const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
      const rect = canvas.getBoundingClientRect();
      camera.aspect = rect.width / rect.height;
      camera.updateProjectionMatrix();
    };

    updateCameraAspect(this.mainCamera, 'main-canvas');
    updateCameraAspect(this.previewCamera, 'preview-canvas');
    updateCameraAspect(this.ovenCamera, 'oven-canvas');
    updateCameraAspect(this.decorateCamera, 'decorate-canvas');

    const rect = this.starCanvas.getBoundingClientRect();
    this.starCanvas.width = rect.width * window.devicePixelRatio;
    this.starCanvas.height = rect.height * window.devicePixelRatio;
    this.starCtx.scale(window.devicePixelRatio, window.devicePixelRatio);
  }

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.ingredientSystem.destroy();
    
    if (this.bakingSystem) {
      this.bakingSystem.reset();
    }
    
    if (this.decorationSystem) {
      this.decorationSystem.reset();
    }

    this.mainRenderer.dispose();
    this.previewRenderer.dispose();
    this.ovenRenderer.dispose();
    this.decorateRenderer.dispose();
  }
}

let app: StardustBakeryApp | null = null;

document.addEventListener('DOMContentLoaded', () => {
  app = new StardustBakeryApp();
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.destroy();
  }
});
