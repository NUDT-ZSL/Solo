import { Renderer } from './renderer';
import { UIController } from './uiController';
import { POTIONS, ALL_PRODUCTS } from './alchemyEngine';
import type { DiscoveredRecipe, Potion, Product } from './types';

function init(): void {
  const canvas = document.getElementById('crucible-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const renderer = new Renderer(canvas);
  const uiController = new UIController(renderer);

  setupPotionShelf(uiController);
  uiController.setupCrucibleDropZone();

  setupProgressDisplay(uiController);
  setupNotebook(uiController);
  setupResetButton(uiController);

  window.addEventListener('resize', () => {
    renderer.resize();
  });

  function animate(now: number): void {
    renderer.update(now);
    requestAnimationFrame(animate);
  }
  requestAnimationFrame(animate);
}

function setupPotionShelf(uiController: UIController): void {
  const shelf = document.getElementById('potion-shelf');
  if (!shelf) return;

  POTIONS.forEach(potion => {
    const slot = uiController.createPotionSlot(potion, shelf);
    shelf.appendChild(slot);
  });
}

function setupProgressDisplay(uiController: UIController): void {
  const progressEl = document.getElementById('progress-display');
  if (!progressEl) return;

  uiController.setProgressCallback((discovered, total) => {
    progressEl.textContent = `已发现：${discovered}/${total}`;
  });
}

function setupNotebook(uiController: UIController): void {
  const toggleBtn = document.getElementById('notebook-toggle');
  const notebookPanel = document.getElementById('notebook-panel');
  const notebookContent = document.getElementById('notebook-content');
  const closeBtn = document.getElementById('notebook-close');

  if (!toggleBtn || !notebookPanel || !notebookContent) return;

  const refreshNotebook = () => {
    const recipes = uiController.getDiscoveredRecipes();
    notebookContent.innerHTML = '';

    if (recipes.length === 0) {
      notebookContent.innerHTML = '<p class="notebook-empty">尚未发现任何配方，开始尝试混合药剂吧…</p>';
      return;
    }

    recipes.forEach(recipe => {
      const entry = createNotebookEntry(recipe);
      notebookContent.appendChild(entry);
    });

    const undiscoveredCount = uiController.getTotalProducts() - recipes.length;
    if (undiscoveredCount > 0) {
      const hint = document.createElement('div');
      hint.className = 'notebook-hint';
      hint.textContent = `还有 ${undiscoveredCount} 种配方等待发现…`;
      notebookContent.appendChild(hint);
    }
  };

  const togglePanel = () => {
    const isOpen = uiController.toggleNotebook();
    notebookPanel.classList.toggle('open', isOpen);
    if (isOpen) refreshNotebook();
  };

  toggleBtn.addEventListener('click', togglePanel);
  closeBtn?.addEventListener('click', togglePanel);

  uiController.setDiscoveryCallback(() => {
    if (notebookPanel.classList.contains('open')) {
      refreshNotebook();
    }
  });

  refreshNotebook();
}

function createNotebookEntry(recipe: DiscoveredRecipe): HTMLElement {
  const entry = document.createElement('div');
  entry.className = 'notebook-entry';

  const formula = document.createElement('div');
  formula.className = 'notebook-formula';
  formula.innerHTML = `
    <span class="formula-potion" style="color:${recipe.potionA.color}">${recipe.potionA.icon} ${recipe.potionA.name}</span>
    <span class="formula-plus">+</span>
    <span class="formula-potion" style="color:${recipe.potionB.color}">${recipe.potionB.icon} ${recipe.potionB.name}</span>
    <span class="formula-equals">=</span>
    <span class="formula-product glow-text" style="color:${recipe.product.color}">${recipe.product.icon} ${recipe.product.name}</span>
  `;

  const details = document.createElement('div');
  details.className = 'notebook-details';
  details.style.display = 'none';
  details.innerHTML = `
    <div class="notebook-details-icon">${recipe.product.icon}</div>
    <div class="notebook-details-info">
      <div class="notebook-details-name glow-text" style="color:${recipe.product.color}">${recipe.product.name}</div>
      <div class="notebook-details-desc">${recipe.product.description}</div>
    </div>
  `;

  entry.appendChild(formula);
  entry.appendChild(details);

  formula.addEventListener('click', () => {
    const isOpen = details.style.display === 'flex';
    details.style.display = isOpen ? 'none' : 'flex';
  });

  return entry;
}

function setupResetButton(uiController: UIController): void {
  const resetBtn = document.getElementById('reset-button');
  if (!resetBtn) return;

  resetBtn.addEventListener('click', () => {
    if (confirm('确定要重置所有炼金进度吗？')) {
      uiController.resetProgress();
      const notebookContent = document.getElementById('notebook-content');
      if (notebookContent) {
        notebookContent.innerHTML = '<p class="notebook-empty">尚未发现任何配方，开始尝试混合药剂吧…</p>';
      }
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
