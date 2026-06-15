import { POTIONS, ALL_PRODUCTS, mixPotions, getPotionById } from './alchemyEngine';
import type { Potion, Product, DiscoveredRecipe, DragState } from './types';
import type { Renderer } from './renderer';

const STORAGE_KEY = 'alchemy_discovered_recipes';

export class UIController {
  private renderer: Renderer;
  private crucibleEl: HTMLElement;
  private canvasEl: HTMLCanvasElement;
  private dragState: DragState = { active: false };
  private pendingPotion: Potion | null = null;
  private discoveredRecipes: DiscoveredRecipe[] = [];
  private audioContext: AudioContext | null = null;
  private notebookOpen = false;
  private victoryShown = false;
  private onProgressChange?: (discovered: number, total: number) => void;
  private onNewDiscovery?: (recipe: DiscoveredRecipe) => void;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    this.canvasEl = renderer['canvas'];
    this.crucibleEl = this.canvasEl;

    this.loadDiscoveredRecipes();
    this.initAudio();
  }

  setProgressCallback(cb: (discovered: number, total: number) => void): void {
    this.onProgressChange = cb;
    this.emitProgress();
  }

  setDiscoveryCallback(cb: (recipe: DiscoveredRecipe) => void): void {
    this.onNewDiscovery = cb;
  }

  getDiscoveredRecipes(): DiscoveredRecipe[] {
    return this.discoveredRecipes;
  }

  getTotalProducts(): number {
    return ALL_PRODUCTS.length;
  }

  getDiscoveredCount(): number {
    return this.discoveredRecipes.length;
  }

  createPotionSlot(potion: Potion, container: HTMLElement): HTMLElement {
    const slot = document.createElement('div');
    slot.className = 'potion-slot';
    slot.dataset.potionId = potion.id;
    slot.draggable = true;

    const base = document.createElement('div');
    base.className = 'potion-base';

    const bottle = document.createElement('div');
    bottle.className = 'potion-bottle';
    bottle.style.backgroundColor = potion.color;
    bottle.style.boxShadow = `0 0 15px ${potion.color}80, inset 0 -10px 20px rgba(0,0,0,0.3)`;

    const icon = document.createElement('span');
    icon.className = 'potion-icon';
    icon.textContent = potion.icon;

    const tooltip = document.createElement('div');
    tooltip.className = 'potion-tooltip';
    tooltip.innerHTML = `<strong>${potion.name}</strong><br><span>${potion.description}</span>`;

    bottle.appendChild(icon);
    slot.appendChild(base);
    slot.appendChild(bottle);
    slot.appendChild(tooltip);

    slot.addEventListener('dragstart', (e) => this.handleDragStart(e, potion));
    slot.addEventListener('dragend', () => this.handleDragEnd());
    slot.addEventListener('touchstart', (e) => this.handleTouchStart(e, potion), { passive: false });
    slot.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
    slot.addEventListener('touchend', (e) => this.handleTouchEnd(e));

    return slot;
  }

  setupCrucibleDropZone(): void {
    this.crucibleEl.addEventListener('dragover', (e) => this.handleDragOver(e));
    this.crucibleEl.addEventListener('dragenter', () => this.handleDragEnter());
    this.crucibleEl.addEventListener('dragleave', () => this.handleDragLeave());
    this.crucibleEl.addEventListener('drop', (e) => this.handleDrop(e));
  }

  private handleDragStart(e: DragEvent, potion: Potion): void {
    if (!e.dataTransfer) return;
    e.dataTransfer.setData('text/plain', potion.id);
    e.dataTransfer.effectAllowed = 'copy';

    this.dragState = { active: true, potion, x: 0, y: 0 };
    this.createDragGhost(potion);
  }

  private handleDragEnd(): void {
    this.dragState = { active: false };
    this.renderer.setCrucibleHighlight(false);
    this.removeDragGhost();
  }

  private handleDragOver(e: DragEvent): void {
    e.preventDefault();
    if (e.dataTransfer) {
      e.dataTransfer.dropEffect = 'copy';
    }
  }

  private handleDragEnter(): void {
    this.renderer.setCrucibleHighlight(true);
  }

  private handleDragLeave(): void {
    this.renderer.setCrucibleHighlight(false);
  }

  private handleDrop(e: DragEvent): void {
    e.preventDefault();
    this.renderer.setCrucibleHighlight(false);
    const potionId = e.dataTransfer?.getData('text/plain');
    if (!potionId) return;

    const potion = getPotionById(potionId);
    if (potion) {
      this.processPotionDrop(potion);
    }
  }

  private touchPotion: Potion | null = null;
  private touchGhost: HTMLElement | null = null;

  private handleTouchStart(e: TouchEvent, potion: Potion): void {
    e.preventDefault();
    this.touchPotion = potion;
    const touch = e.touches[0];
    this.createDragGhost(potion);
    this.updateGhostPosition(touch.clientX, touch.clientY);
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (!this.touchPotion) return;
    const touch = e.touches[0];
    this.updateGhostPosition(touch.clientX, touch.clientY);

    const crucibleRect = this.crucibleEl.getBoundingClientRect();
    const overCrucible =
      touch.clientX >= crucibleRect.left &&
      touch.clientX <= crucibleRect.right &&
      touch.clientY >= crucibleRect.top &&
      touch.clientY <= crucibleRect.bottom;

    this.renderer.setCrucibleHighlight(overCrucible);
  }

  private handleTouchEnd(e: TouchEvent): void {
    if (!this.touchPotion) return;

    const touch = e.changedTouches[0];
    const crucibleRect = this.crucibleEl.getBoundingClientRect();
    const overCrucible =
      touch.clientX >= crucibleRect.left &&
      touch.clientX <= crucibleRect.right &&
      touch.clientY >= crucibleRect.top &&
      touch.clientY <= crucibleRect.bottom;

    this.renderer.setCrucibleHighlight(false);
    this.removeDragGhost();

    if (overCrucible) {
      this.processPotionDrop(this.touchPotion);
    }

    this.touchPotion = null;
  }

  private createDragGhost(potion: Potion): void {
    this.removeDragGhost();
    const ghost = document.createElement('div');
    ghost.id = 'drag-ghost';
    ghost.className = 'drag-ghost';
    ghost.innerHTML = `<span style="color:${potion.color};font-size:32px;">${potion.icon}</span>`;
    document.body.appendChild(ghost);
    this.touchGhost = ghost;
  }

  private removeDragGhost(): void {
    const ghost = document.getElementById('drag-ghost');
    if (ghost) ghost.remove();
    this.touchGhost = null;
  }

  private updateGhostPosition(x: number, y: number): void {
    if (this.touchGhost) {
      this.touchGhost.style.left = `${x - 20}px`;
      this.touchGhost.style.top = `${y - 20}px`;
    }
  }

  private processPotionDrop(potion: Potion): void {
    if (!this.pendingPotion) {
      this.pendingPotion = potion;
      this.flashCrucible();
      return;
    }

    if (this.pendingPotion.id === potion.id) {
      this.pendingPotion = null;
      return;
    }

    const result = mixPotions(this.pendingPotion, potion);
    this.renderer.triggerReaction(result);

    if (result.success && result.product) {
      this.addDiscoveredRecipe(this.pendingPotion, potion, result.product);
    } else {
      this.playErrorSound();
    }

    this.pendingPotion = null;
  }

  private flashCrucible(): void {
    this.renderer.setCrucibleHighlight(true);
    setTimeout(() => this.renderer.setCrucibleHighlight(false), 300);
  }

  private addDiscoveredRecipe(potionA: Potion, potionB: Potion, product: Product): void {
    const exists = this.discoveredRecipes.some(r => r.product.id === product.id);
    if (exists) return;

    const recipe: DiscoveredRecipe = {
      potionA,
      potionB,
      product,
      discoveredAt: Date.now()
    };

    this.discoveredRecipes.push(recipe);
    this.saveDiscoveredRecipes();
    this.emitProgress();

    if (this.onNewDiscovery) {
      this.onNewDiscovery(recipe);
    }

    if (this.discoveredRecipes.length >= ALL_PRODUCTS.length && !this.victoryShown) {
      this.victoryShown = true;
      setTimeout(() => this.triggerVictory(), 1500);
    }
  }

  private triggerVictory(): void {
    this.renderer.spawnVictoryParticles(() => {
      this.showVictoryModal();
    });
  }

  private showVictoryModal(): void {
    const overlay = document.createElement('div');
    overlay.className = 'victory-overlay';
    overlay.innerHTML = `
      <div class="victory-modal">
        <h1 class="victory-title">伟大炼金术师！</h1>
        <p class="victory-subtitle">你已发现所有的炼金配方</p>
        <button class="victory-close">继续探索</button>
      </div>
    `;
    document.body.appendChild(overlay);

    const closeBtn = overlay.querySelector('.victory-close');
    const closeHandler = () => {
      overlay.style.opacity = '0';
      setTimeout(() => overlay.remove(), 300);
    };
    closeBtn?.addEventListener('click', closeHandler);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeHandler();
    });

    requestAnimationFrame(() => {
      overlay.style.opacity = '1';
    });
  }

  private initAudio(): void {
    try {
      this.audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    } catch {
      this.audioContext = null;
    }
  }

  private playErrorSound(): void {
    if (!this.audioContext) return;

    try {
      if (this.audioContext.state === 'suspended') {
        this.audioContext.resume();
      }

      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(150, this.audioContext.currentTime);
      osc.frequency.exponentialRampToValueAtTime(80, this.audioContext.currentTime + 0.2);

      gain.gain.setValueAtTime(0.15, this.audioContext.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioContext.currentTime + 0.25);

      osc.connect(gain);
      gain.connect(this.audioContext.destination);

      osc.start();
      osc.stop(this.audioContext.currentTime + 0.25);
    } catch {
      // Silently fail if audio doesn't work
    }
  }

  private loadDiscoveredRecipes(): void {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data = JSON.parse(saved) as Array<{ potionAId: string; potionBId: string; productId: string; discoveredAt: number }>;
        this.discoveredRecipes = data
          .map(r => {
            const potionA = getPotionById(r.potionAId);
            const potionB = getPotionById(r.potionBId);
            const product = ALL_PRODUCTS.find(p => p.id === r.productId);
            if (potionA && potionB && product) {
              return { potionA, potionB, product, discoveredAt: r.discoveredAt };
            }
            return null;
          })
          .filter((r): r is DiscoveredRecipe => r !== null);
      }
    } catch {
      this.discoveredRecipes = [];
    }
  }

  private saveDiscoveredRecipes(): void {
    try {
      const data = this.discoveredRecipes.map(r => ({
        potionAId: r.potionA.id,
        potionBId: r.potionB.id,
        productId: r.product.id,
        discoveredAt: r.discoveredAt
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Ignore storage errors
    }
  }

  private emitProgress(): void {
    if (this.onProgressChange) {
      this.onProgressChange(this.discoveredRecipes.length, ALL_PRODUCTS.length);
    }
  }

  toggleNotebook(): boolean {
    this.notebookOpen = !this.notebookOpen;
    return this.notebookOpen;
  }

  resetProgress(): void {
    this.discoveredRecipes = [];
    this.victoryShown = false;
    localStorage.removeItem(STORAGE_KEY);
    this.renderer.setLiquidColor('#1A0F0A');
    this.emitProgress();
  }
}
