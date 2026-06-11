import * as THREE from 'three';
import { IngredientsSystem, ingredients } from './ingredients';
import { BakingSystem, BakeResult } from './baking';
import { DecorationSystem, CardData } from './decorate';

class StarlightBakery {
  private ingredientsSystem: IngredientsSystem;
  private bakingSystem: BakingSystem;
  private decorationSystem: DecorationSystem;
  private previewScene: THREE.Scene | null = null;
  private previewCamera: THREE.PerspectiveCamera | null = null;
  private previewRenderer: THREE.WebGLRenderer | null = null;
  private previewMesh: THREE.Mesh | null = null;
  private previewMaterial: THREE.MeshStandardMaterial | null = null;
  private starfieldCanvas: HTMLCanvasElement | null = null;
  private starfieldCtx: CanvasRenderingContext2D | null = null;
  private stars: { x: number; y: number; size: number; speed: number; opacity: number }[] = [];
  private animationId: number = 0;
  private previewAnimationId: number = 0;
  private currentMix: Record<string, number> = {
    berry: 0,
    flour: 0,
    cream: 0,
    sugar: 0
  };

  constructor() {
    this.ingredientsSystem = new IngredientsSystem();
    this.bakingSystem = new BakingSystem();
    this.decorationSystem = new DecorationSystem();
  }

  init() {
    this.initStarfield();
    this.initPreview();
    this.ingredientsSystem.init();
    this.ingredientsSystem.setOnMixChange((amounts) => this.onMixChange(amounts));
    this.bakingSystem.init('ovenScene');
    this.bakingSystem.setOnProgress((progress) => this.onBakeProgress(progress));
    this.bakingSystem.setOnComplete((result) => this.onBakeComplete(result));
    this.decorationSystem.init('decorateCanvasArea');
    this.decorationSystem.setOnShare((card) => this.onShareCard(card));
    this.setupEventListeners();
    this.animate();
  }

  private initStarfield() {
    this.starfieldCanvas = document.getElementById('starfield') as HTMLCanvasElement;
    if (!this.starfieldCanvas) return;
    this.starfieldCtx = this.starfieldCanvas.getContext('2d');
    this.resizeStarfield();
    this.generateStars();
    window.addEventListener('resize', () => {
      this.resizeStarfield();
      this.generateStars();
    });
  }

  private resizeStarfield() {
    if (!this.starfieldCanvas) return;
    const dpr = window.devicePixelRatio || 1;
    this.starfieldCanvas.width = window.innerWidth * dpr;
    this.starfieldCanvas.height = window.innerHeight * dpr;
    this.starfieldCanvas.style.width = window.innerWidth + 'px';
    this.starfieldCanvas.style.height = window.innerHeight + 'px';
    if (this.starfieldCtx) {
      this.starfieldCtx.scale(dpr, dpr);
    }
  }

  private generateStars() {
    this.stars = [];
    const count = 150;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        size: Math.random() * 3 + 1,
        speed: Math.random() * 20 + 5,
        opacity: Math.random() * 0.5 + 0.3
      });
    }
  }

  private initPreview() {
    const canvas = document.getElementById('previewCanvas') as HTMLCanvasElement;
    if (!canvas) return;

    this.previewScene = new THREE.Scene();
    this.previewScene.background = new THREE.Color(0x0b0b2a);

    this.previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    this.previewRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    const container = canvas.parentElement;
    if (container) {
      const rect = container.getBoundingClientRect();
      this.previewRenderer.setSize(rect.width, rect.height, false);
      this.previewCamera = new THREE.PerspectiveCamera(45, rect.width / rect.height, 0.1, 100);
    } else {
      this.previewCamera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    }
    this.previewCamera.position.set(0, 0, 3.5);
    this.previewCamera.lookAt(0, 0, 0);

    const ambient = new THREE.AmbientLight(0xffffff, 0.5);
    this.previewScene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(2, 2, 2);
    this.previewScene.add(dirLight);

    const pointLight = new THREE.PointLight(0x8888ff, 0.5, 10);
    pointLight.position.set(-1, 1, 1);
    this.previewScene.add(pointLight);

    const geometry = new THREE.SphereGeometry(0.8, 32, 32);
    this.previewMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
      roughness: 0.6,
      metalness: 0.1,
      transparent: true,
      opacity: 0.3
    });
    this.previewMesh = new THREE.Mesh(geometry, this.previewMaterial);
    this.previewScene.add(this.previewMesh);

    window.addEventListener('resize', () => {
      if (!this.previewRenderer || !this.previewCamera || !canvas.parentElement) return;
      const rect = canvas.parentElement.getBoundingClientRect();
      this.previewRenderer.setSize(rect.width, rect.height, false);
      this.previewCamera.aspect = rect.width / rect.height;
      this.previewCamera.updateProjectionMatrix();
    });
  }

  private setupEventListeners() {
    const bakeBtn = document.getElementById('bakeBtn') as HTMLButtonElement;
    if (bakeBtn) {
      bakeBtn.addEventListener('click', () => this.startBaking());
    }

    const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
    if (resetBtn) {
      resetBtn.addEventListener('click', () => this.resetAll());
    }

    const closeDecorateBtn = document.getElementById('closeDecorateBtn');
    if (closeDecorateBtn) {
      closeDecorateBtn.addEventListener('click', () => this.closeDecoration());
    }

    const clearDecorBtn = document.getElementById('clearDecorBtn');
    if (clearDecorBtn) {
      clearDecorBtn.addEventListener('click', () => this.decorationSystem.clearDecorations());
    }

    const shareBtn = document.getElementById('shareBtn');
    if (shareBtn) {
      shareBtn.addEventListener('click', () => this.generateCard());
    }

    const closeCardBtn = document.getElementById('closeCardBtn');
    if (closeCardBtn) {
      closeCardBtn.addEventListener('click', () => this.closeCard());
    }

    const copyLinkBtn = document.getElementById('copyLinkBtn');
    if (copyLinkBtn) {
      copyLinkBtn.addEventListener('click', () => this.copyShareLink());
    }
  }

  private onMixChange(amounts: Record<string, number>) {
    this.currentMix = { ...amounts };
    this.updatePreview();
    this.updateStats();
    this.updateBakeButton();
  }

  private updatePreview() {
    if (!this.previewMesh || !this.previewMaterial) return;

    const total = Object.values(this.currentMix).reduce((a, b) => a + b, 0);
    if (total === 0) {
      this.previewMaterial.color.setHex(0x888888);
      this.previewMaterial.opacity = 0.3;
      return;
    }

    this.previewMaterial.opacity = 1;

    let r = 0, g = 0, b = 0;
    for (const [id, amount] of Object.entries(this.currentMix)) {
      const ing = ingredients[id];
      if (ing) {
        const color = new THREE.Color(ing.color);
        r += color.r * amount;
        g += color.g * amount;
        b += color.b * amount;
      }
    }

    const baseColor = new THREE.Color(0xd4a574);
    const mixColor = new THREE.Color(r / total, g / total, b / total);
    const finalColor = new THREE.Color().lerpColors(baseColor, mixColor, 0.4);

    this.previewMaterial.color.copy(finalColor);

    const stats = this.bakingSystem.calculateStats(this.currentMix);
    const glowIntensity = stats.glow / 5 * 0.3;
    this.previewMaterial.emissive = finalColor;
    this.previewMaterial.emissiveIntensity = glowIntensity;

    const scale = 0.6 + (stats.fluffiness / 5) * 0.4;
    this.previewMesh.scale.set(scale, scale, scale);
  }

  private updateStats() {
    const stats = this.bakingSystem.calculateStats(this.currentMix);

    const sweetnessBar = document.getElementById('stat-sweetness');
    const fluffinessBar = document.getElementById('stat-fluffiness');
    const glowBar = document.getElementById('stat-glow');

    if (sweetnessBar) sweetnessBar.style.width = `${(stats.sweetness / 5) * 100}%`;
    if (fluffinessBar) fluffinessBar.style.width = `${(stats.fluffiness / 5) * 100}%`;
    if (glowBar) glowBar.style.width = `${(stats.glow / 5) * 100}%`;

    const sweetnessStars = document.getElementById('stat-sweetness-stars');
    const fluffinessStars = document.getElementById('stat-fluffiness-stars');
    const glowStars = document.getElementById('stat-glow-stars');

    if (sweetnessStars) sweetnessStars.textContent = this.getStars(stats.sweetness);
    if (fluffinessStars) fluffinessStars.textContent = this.getStars(stats.fluffiness);
    if (glowStars) glowStars.textContent = this.getStars(stats.glow);
  }

  private getStars(value: number): string {
    const full = Math.floor(value / 5 * 3);
    return '★'.repeat(Math.max(0, full)) + '☆'.repeat(Math.max(0, 3 - full));
  }

  private updateBakeButton() {
    const bakeBtn = document.getElementById('bakeBtn') as HTMLButtonElement;
    if (!bakeBtn) return;
    const total = Object.values(this.currentMix).reduce((a, b) => a + b, 0);
    bakeBtn.disabled = total === 0;
  }

  private startBaking() {
    const total = Object.values(this.currentMix).reduce((a, b) => a + b, 0);
    if (total === 0) return;

    const ovenScene = document.getElementById('ovenScene');
    if (ovenScene) {
      ovenScene.classList.add('active');
    }

    setTimeout(() => {
      this.bakingSystem.startBaking(this.currentMix);
    }, 300);
  }

  private onBakeProgress(progress: number) {
    const progressFill = document.getElementById('ovenProgress');
    const ovenText = document.getElementById('ovenText');

    if (progressFill) {
      progressFill.style.width = `${progress * 100}%`;
    }

    if (ovenText) {
      if (progress < 0.2) {
        ovenText.textContent = '🔥 预热中...';
      } else if (progress < 0.6) {
        ovenText.textContent = '🍰 烘焙中...';
      } else {
        ovenText.textContent = '✨ 即将完成...';
      }
    }
  }

  private onBakeComplete(result: BakeResult) {
    setTimeout(() => {
      const ovenScene = document.getElementById('ovenScene');
      if (ovenScene) {
        ovenScene.classList.remove('active');
      }

      this.decorationSystem.setCakeFromBakeResult(result);
      this.decorationSystem.show();
    }, 500);
  }

  private closeDecoration() {
    this.decorationSystem.hide();
  }

  private generateCard() {
    const cardData = this.decorationSystem.generateCardData();
    if (!cardData) return;

    this.showCard(cardData);
  }

  private showCard(card: CardData) {
    const overlay = document.getElementById('cardOverlay');
    const cardImage = document.getElementById('cardImage') as HTMLImageElement;
    const cardTitle = document.getElementById('cardTitle');
    const cardSweetness = document.getElementById('cardSweetness');
    const cardFluffiness = document.getElementById('cardFluffiness');
    const cardGlow = document.getElementById('cardGlow');
    const cardDesc = document.getElementById('cardDesc');
    const shareLink = document.getElementById('shareLink') as HTMLInputElement;

    if (cardImage) cardImage.src = card.imageData;
    if (cardTitle) cardTitle.textContent = card.title;
    if (cardSweetness) cardSweetness.textContent = this.getStars(card.stats.sweetness);
    if (cardFluffiness) cardFluffiness.textContent = this.getStars(card.stats.fluffiness);
    if (cardGlow) cardGlow.textContent = this.getStars(card.stats.glow);
    if (cardDesc) cardDesc.textContent = card.description;
    if (shareLink) shareLink.value = card.shareLink;

    if (overlay) {
      overlay.classList.add('active');
    }
  }

  private closeCard() {
    const overlay = document.getElementById('cardOverlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  }

  private copyShareLink() {
    const shareLink = document.getElementById('shareLink') as HTMLInputElement;
    if (!shareLink) return;

    shareLink.select();
    document.execCommand('copy');

    const copyBtn = document.getElementById('copyLinkBtn') as HTMLButtonElement;
    if (copyBtn) {
      const originalText = copyBtn.textContent;
      copyBtn.textContent = '已复制!';
      setTimeout(() => {
        copyBtn.textContent = originalText;
      }, 1500);
    }
  }

  private onShareCard(card: CardData) {
    this.showCard(card);
  }

  private resetAll() {
    this.ingredientsSystem.reset();
    this.bakingSystem.reset();
    this.currentMix = { berry: 0, flour: 0, cream: 0, sugar: 0 };
    this.updatePreview();
    this.updateStats();
    this.updateBakeButton();
  }

  private animate = () => {
    this.updateStarfield();
    this.animatePreview();
    this.animationId = requestAnimationFrame(this.animate);
  };

  private updateStarfield() {
    if (!this.starfieldCtx || !this.starfieldCanvas) return;
    const ctx = this.starfieldCtx;
    const width = window.innerWidth;
    const height = window.innerHeight;

    ctx.clearRect(0, 0, width, height);

    this.stars.forEach((star) => {
      star.x += star.speed * 0.01 * (Math.sin(Date.now() * 0.001 + star.y) * 0.5 + 0.5);
      star.y += star.speed * 0.005;

      if (star.x > width + 10) star.x = -10;
      if (star.y > height + 10) {
        star.y = -10;
        star.x = Math.random() * width;
      }

      const twinkle = 0.7 + Math.sin(Date.now() * 0.003 + star.x) * 0.3;
      
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      const gradient = ctx.createRadialGradient(star.x, star.y, 0, star.x, star.y, star.size * 2);
      gradient.addColorStop(0, `rgba(255, 255, 255, ${star.opacity * twinkle})`);
      gradient.addColorStop(1, 'rgba(200, 220, 255, 0)');
      ctx.fillStyle = gradient;
      ctx.fill();
    });
  }

  private animatePreview() {
    if (!this.previewMesh || !this.previewRenderer || !this.previewScene || !this.previewCamera) return;
    this.previewMesh.rotation.y += 0.01;
    this.previewRenderer.render(this.previewScene, this.previewCamera);
  }

  destroy() {
    cancelAnimationFrame(this.animationId);
    cancelAnimationFrame(this.previewAnimationId);
    this.ingredientsSystem.destroy();
    this.bakingSystem.destroy();
    this.decorationSystem.destroy();
  }
}

const app = new StarlightBakery();
app.init();
