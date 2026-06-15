import './style.css';
import { Renderer } from './renderer';
import { Editor } from './editor';
import {
  getRecipeByName,
  getAllRecipes,
  calculateLayout,
  getCanvasDimensions,
  type Recipe,
  type Ingredient
} from './recipe';

class PixelRecipeApp {
  private canvas: HTMLCanvasElement;
  public renderer: Renderer;
  public editor: Editor;
  public currentRecipe: Recipe | null = null;
  private allRecipes: Recipe[] = [];
  private searchInput: HTMLInputElement;
  private recipeList: HTMLElement;
  private exportBtn: HTMLButtonElement;
  private canvasWrapper: HTMLElement;
  private isTransitioning = false;
  private frameCount = 0;
  private lastFpsUpdate = 0;
  private currentFps = 0;

  constructor() {
    this.canvas = document.getElementById('recipeCanvas') as HTMLCanvasElement;
    this.searchInput = document.getElementById('recipeSearch') as HTMLInputElement;
    this.recipeList = document.getElementById('recipeList') as HTMLElement;
    this.exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
    this.canvasWrapper = document.getElementById('canvasWrapper') as HTMLElement;

    if (!this.canvas || !this.searchInput || !this.recipeList || !this.exportBtn || !this.canvasWrapper) {
      throw new Error('Required DOM elements not found');
    }

    this.renderer = new Renderer(this.canvas);
    this.editor = new Editor(this.canvas, this.renderer, {
      onIngredientUpdate: this.handleIngredientUpdate.bind(this),
      onRecipeChange: this.handleRecipeChange.bind(this)
    });

    this.init();
  }

  private init(): void {
    this.allRecipes = getAllRecipes();
    this.renderRecipeList();

    const defaultRecipe = this.allRecipes[0];
    if (defaultRecipe) {
      this.loadRecipe(defaultRecipe.name);
    }

    this.bindEvents();
    this.renderer.startAnimation();
    this.hideLoading();

    this.renderer.setOnUpdate(() => {
      this.updateFpsCounter();
    });
  }

  private hideLoading(): void {
    const loading = document.getElementById('loading');
    const app = document.getElementById('app');
    if (loading) loading.style.display = 'none';
    if (app) app.style.display = 'block';
  }

  private bindEvents(): void {
    this.searchInput.addEventListener('input', this.handleSearch.bind(this));
    this.searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.handleSearch();
      }
    });

    this.exportBtn.addEventListener('click', this.handleExport.bind(this));

    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleSearch(): void {
    const query = this.searchInput.value.trim();
    if (!query) return;

    const recipe = getRecipeByName(query);
    if (recipe) {
      this.loadRecipe(recipe.name);
    } else {
      this.searchInput.style.animation = 'none';
      this.searchInput.offsetHeight;
      this.searchInput.style.animation = 'shake 0.3s ease-out';
    }
  }

  private loadRecipe(recipeName: string): void {
    if (this.isTransitioning) return;

    const recipe = getRecipeByName(recipeName);
    if (!recipe) return;

    this.isTransitioning = true;
    this.canvas.classList.add('fading');

    setTimeout(() => {
      const viewportWidth = this.canvasWrapper.clientWidth - 32;
      const layoutRecipe = calculateLayout(recipe, viewportWidth);
      const dimensions = getCanvasDimensions(layoutRecipe, viewportWidth);

      this.renderer.resizeCanvas(dimensions.width, dimensions.height);
      this.renderer.setRecipe(layoutRecipe);
      this.currentRecipe = layoutRecipe;

      this.updateActiveRecipeItem(recipeName);

      requestAnimationFrame(() => {
        this.canvas.classList.remove('fading');
        this.isTransitioning = false;
      });
    }, 300);
  }

  private renderRecipeList(): void {
    const header = this.recipeList.querySelector('h3');
    this.recipeList.innerHTML = '';
    if (header) this.recipeList.appendChild(header);

    this.allRecipes.forEach((recipe) => {
      const item = document.createElement('div');
      item.className = 'recipe-item';
      item.dataset.recipeName = recipe.name;
      item.textContent = recipe.name;
      item.addEventListener('click', () => this.loadRecipe(recipe.name));
      this.recipeList.appendChild(item);
    });
  }

  private updateActiveRecipeItem(recipeName: string): void {
    const items = this.recipeList.querySelectorAll('.recipe-item');
    items.forEach((item) => {
      if (item.textContent === recipeName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  private handleIngredientUpdate(id: string, updates: Partial<Ingredient>): void {
    this.renderer.updateIngredient(id, updates);
  }

  private handleRecipeChange(): void {
    this.currentRecipe = this.renderer.getRecipe();
  }

  private async handleExport(): Promise<void> {
    if (!this.currentRecipe || this.isTransitioning) return;

    this.exportBtn.disabled = true;
    const originalText = this.exportBtn.textContent;
    this.exportBtn.textContent = '导出中...';

    try {
      const startTime = performance.now();
      const dataUrl = await this.renderer.exportPNG();
      const elapsed = performance.now() - startTime;

      if (elapsed > 800) {
        console.warn(`PNG export took ${elapsed.toFixed(0)}ms, exceeding 800ms target`);
      }

      const link = document.createElement('a');
      link.download = `${this.currentRecipe.name}-像素食谱.png`;
      link.href = dataUrl;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setTimeout(() => {
        URL.revokeObjectURL(dataUrl);
      }, 1000);
    } catch (error) {
      console.error('Export failed:', error);
      alert('导出失败，请重试');
    } finally {
      this.exportBtn.disabled = false;
      this.exportBtn.textContent = originalText;
    }
  }

  private handleResize(): void {
    if (!this.currentRecipe) return;

    const viewportWidth = this.canvasWrapper.clientWidth - 32;
    const dimensions = getCanvasDimensions(this.currentRecipe, viewportWidth);
    this.renderer.resizeCanvas(dimensions.width, dimensions.height);
  }

  private updateFpsCounter(): void {
    this.frameCount++;
    const now = performance.now();
    
    if (now - this.lastFpsUpdate >= 1000) {
      this.currentFps = this.frameCount;
      this.frameCount = 0;
      this.lastFpsUpdate = now;

      if (this.currentFps < 45) {
        console.warn(`Low FPS: ${this.currentFps} (target: 45+)`);
      }
    }
  }

  public getCurrentFps(): number {
    return this.currentFps;
  }

  public destroy(): void {
    this.renderer.stopAnimation();
    this.editor.destroy();
  }
}

const style = document.createElement('style');
style.textContent = `
  @keyframes shake {
    0%, 100% { transform: translateX(0); }
    25% { transform: translateX(-5px); }
    75% { transform: translateX(5px); }
  }
`;
document.head.appendChild(style);

let app: PixelRecipeApp | null = null;

document.addEventListener('DOMContentLoaded', () => {
  try {
    app = new PixelRecipeApp();
    (window as any).pixelRecipeApp = app;
    (window as any).pixelRecipeEditor = (app as any).editor;
    (window as any).pixelRecipeRenderer = (app as any).renderer;
    console.log('像素食谱应用已启动');
  } catch (error) {
    console.error('应用启动失败:', error);
    const loading = document.getElementById('loading');
    if (loading) {
      loading.innerHTML = '<div style="color: #FF6B6B;">应用启动失败</div>';
    }
  }
});

window.addEventListener('beforeunload', () => {
  if (app) {
    app.destroy();
  }
});

export default PixelRecipeApp;
