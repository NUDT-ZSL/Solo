import {
  createInitialState,
  collectFragment,
  closeActiveCard,
  resetState,
  reshuffleFragmentPositions,
  updateEndingProgress,
  type StoryState,
} from './story';
import {
  createSceneData,
  renderScene,
  updateScene,
  getHitFragment,
  isNextButtonHit,
  updateHoverState,
  triggerMistDisturbance,
  type SceneData,
} from './scene';

const CANVAS_W = 900;
const CANVAS_H = 650;

class App {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: StoryState;
  private scene: SceneData;
  private collectedCountEl: HTMLElement;
  private totalCountEl: HTMLElement;
  private resetBtn: HTMLElement;
  private running: boolean = true;

  constructor() {
    const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
    if (!canvas) throw new Error('Canvas not found');
    this.canvas = canvas;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Could not get canvas context');
    this.ctx = ctx;

    const collectedCountEl = document.getElementById('collectedCount');
    const totalCountEl = document.getElementById('totalCount');
    const resetBtn = document.getElementById('resetBtn');
    if (!collectedCountEl || !totalCountEl || !resetBtn) {
      throw new Error('UI elements not found');
    }
    this.collectedCountEl = collectedCountEl;
    this.totalCountEl = totalCountEl;
    this.resetBtn = resetBtn;

    this.state = createInitialState(CANVAS_W, CANVAS_H);
    this.scene = createSceneData();

    this.updateStatusIndicator();
    this.bindEvents();
    this.loop();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('click', this.handleClick.bind(this));
    this.resetBtn.addEventListener('click', this.handleReset.bind(this));
  }

  private handleMouseMove(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const hoverChanged = updateHoverState(this.state, x, y);

    if (this.state.activeCard) {
      const btnHovered = isNextButtonHit(x, y);
      this.canvas.style.cursor = btnHovered ? 'pointer' : 'default';
    } else {
      const hasHovered = this.state.fragments.some(f => f.hovered && !f.collected);
      this.canvas.style.cursor = hasHovered ? 'pointer' : 'default';
    }

    if (hoverChanged) {
      this.render();
    }
  }

  private handleClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (this.state.activeCard) {
      if (isNextButtonHit(x, y)) {
        closeActiveCard(this.state);
        reshuffleFragmentPositions(this.state, CANVAS_W, CANVAS_H);
        this.render();
      }
      return;
    }

    const fragmentId = getHitFragment(this.state, x, y);
    if (fragmentId !== null) {
      const now = performance.now();
      const collected = collectFragment(this.state, fragmentId, now);
      if (collected) {
        triggerMistDisturbance(this.scene);
        this.animateCountChange();
        this.render();
      }
    }
  }

  private handleReset(): void {
    this.state = resetState(this.state, CANVAS_W, CANVAS_H);
    this.scene = createSceneData();
    this.updateStatusIndicator();
    this.render();
  }

  private animateCountChange(): void {
    this.collectedCountEl.style.transform = 'scale(1.1)';
    this.collectedCountEl.textContent = String(this.state.collectedCount);

    setTimeout(() => {
      this.collectedCountEl.style.transform = 'scale(1)';
    }, 200);
  }

  private updateStatusIndicator(): void {
    this.collectedCountEl.textContent = String(this.state.collectedCount);
    this.totalCountEl.textContent = String(this.state.totalCount);
  }

  private loop(): void {
    if (!this.running) return;

    const now = performance.now();
    updateScene(this.scene, now);
    updateEndingProgress(this.state, now);
    this.render();

    requestAnimationFrame(this.loop.bind(this));
  }

  private render(): void {
    renderScene(this.ctx, this.state, this.scene, performance.now());
  }
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    new App();
  } catch (e) {
    console.error('Failed to initialize app:', e);
  }
});
