import type { Ingredient } from './recipe';
import type { Renderer } from './renderer';

export interface EditorCallbacks {
  onIngredientUpdate: (id: string, updates: Partial<Ingredient>) => void;
  onRecipeChange: () => void;
}

export class Editor {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private callbacks: EditorCallbacks;
  private isDragging = false;
  private hasDragged = false;
  private dragStartPos = { x: 0, y: 0 };
  private dragOffset = { x: 0, y: 0 };
  private lastFrameTime = 0;
  private minFrameInterval = 1000 / 60;
  private dragThreshold = 5;
  private popupElement: HTMLElement | null = null;
  private overlayElement: HTMLElement | null = null;
  private editingIngredient: Ingredient | null = null;
  private selectedColor: string = '';
  private lastClickTime = 0;
  private doubleClickDelay = 500;
  private clickPosition = { x: 0, y: 0 };

  constructor(canvas: HTMLCanvasElement, renderer: Renderer, callbacks: EditorCallbacks) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.callbacks = callbacks;
    this.initEventListeners();
  }

  private initEventListeners(): void {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
  }

  private getCanvasCoordinates(e: MouseEvent | TouchEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    let clientX: number, clientY: number;

    if ('touches' in e) {
      clientX = e.touches[0]?.clientX ?? e.changedTouches[0].clientX;
      clientY = e.touches[0]?.clientY ?? e.changedTouches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }

    return {
      x: (clientX - rect.left) * (this.canvas.width / rect.width),
      y: (clientY - rect.top) * (this.canvas.height / rect.height)
    };
  }

  private handleMouseDown(e: MouseEvent): void {
    const coords = this.getCanvasCoordinates(e);
    const icon = this.renderer.getIconAtPosition(coords.x, coords.y);
    const now = performance.now();

    const timeDiff = now - this.lastClickTime;
    const posDiff = Math.sqrt(
      Math.pow(coords.x - this.clickPosition.x, 2) +
      Math.pow(coords.y - this.clickPosition.y, 2)
    );

    if (timeDiff < this.doubleClickDelay &&
        posDiff < 20 &&
        icon &&
        this.clickPosition.x !== 0 &&
        this.clickPosition.y !== 0) {
      this.lastClickTime = 0;
      this.clickPosition = { x: 0, y: 0 };
      this.isDragging = false;
      this.hasDragged = false;
      this.renderer.setEditState({
        draggingId: null,
        pressedId: null
      });
      this.showEditPopup(icon, e.clientX, e.clientY);
      return;
    }

    this.lastClickTime = now;
    this.clickPosition = { ...coords };

    if (icon) {
      this.isDragging = true;
      this.hasDragged = false;
      this.dragStartPos = { ...coords };
      this.dragOffset = {
        x: coords.x - icon.x,
        y: coords.y - icon.y
      };
      this.renderer.setEditState({
        draggingId: icon.id,
        pressedId: icon.id
      });
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    const now = performance.now();
    if (now - this.lastFrameTime < this.minFrameInterval) return;
    this.lastFrameTime = now;

    const coords = this.getCanvasCoordinates(e);

    if (this.isDragging) {
      if (!this.hasDragged) {
        const moveDistance = Math.sqrt(
          Math.pow(coords.x - this.dragStartPos.x, 2) +
          Math.pow(coords.y - this.dragStartPos.y, 2)
        );
        if (moveDistance > this.dragThreshold) {
          this.hasDragged = true;
          this.canvas.classList.add('dragging');
        }
      }

      if (this.hasDragged) {
        const editState = this.renderer.getEditState();
        if (editState.draggingId) {
          const snapped = this.renderer.snapToGrid(
            coords.x - this.dragOffset.x,
            coords.y - this.dragOffset.y
          );
          this.callbacks.onIngredientUpdate(editState.draggingId, {
            x: Math.max(20, Math.min(this.canvas.width - 20, snapped.x)),
            y: Math.max(40, Math.min(this.canvas.height - 40, snapped.y))
          });
        }
      }
    } else {
      const icon = this.renderer.getIconAtPosition(coords.x, coords.y);
      this.renderer.setEditState({
        hoveredId: icon?.id ?? null
      });
    }
  }

  private handleMouseUp(): void {
    if (this.isDragging) {
      if (this.hasDragged) {
        const editState = this.renderer.getEditState();
        if (editState.draggingId) {
          const recipe = this.renderer.getRecipe();
          if (recipe) {
            const ingredient = recipe.ingredients.find(i => i.id === editState.draggingId);
            if (ingredient) {
              const snapped = this.renderer.snapToGrid(ingredient.x, ingredient.y);
              this.callbacks.onIngredientUpdate(editState.draggingId, {
                x: Math.max(20, Math.min(this.canvas.width - 20, snapped.x)),
                y: Math.max(40, Math.min(this.canvas.height - 40, snapped.y))
              });
            }
          }
        }
        this.callbacks.onRecipeChange();
      }
      this.isDragging = false;
      this.hasDragged = false;
      this.renderer.setEditState({
        draggingId: null,
        pressedId: null
      });
      this.canvas.classList.remove('dragging');
    }
  }

  private handleMouseLeave(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.renderer.setEditState({
        draggingId: null,
        pressedId: null,
        hoveredId: null
      });
      this.canvas.classList.remove('dragging');
    } else {
      this.renderer.setEditState({ hoveredId: null });
    }
  }

  private handleDoubleClick(e: MouseEvent): void {
    e.preventDefault();
    const coords = this.getCanvasCoordinates(e);
    const icon = this.renderer.getIconAtPosition(coords.x, coords.y);
    
    if (icon) {
      this.showEditPopup(icon, e.clientX, e.clientY);
    }
  }

  private handleTouchStart(e: TouchEvent): void {
    e.preventDefault();
    const coords = this.getCanvasCoordinates(e);
    const icon = this.renderer.getIconAtPosition(coords.x, coords.y);
    const now = performance.now();

    if (now - this.lastClickTime < this.doubleClickDelay &&
        Math.abs(coords.x - this.clickPosition.x) < 20 &&
        Math.abs(coords.y - this.clickPosition.y) < 20) {
      this.lastClickTime = 0;
      if (icon) {
        const touch = e.touches[0] ?? e.changedTouches[0];
        this.showEditPopup(icon, touch.clientX, touch.clientY);
      }
      return;
    }

    this.lastClickTime = now;
    this.clickPosition = coords;

    if (icon) {
      this.isDragging = true;
      this.dragOffset = {
        x: coords.x - icon.x,
        y: coords.y - icon.y
      };
      this.renderer.setEditState({
        draggingId: icon.id,
        pressedId: icon.id
      });
    }
  }

  private handleTouchMove(e: TouchEvent): void {
    e.preventDefault();
    const now = performance.now();
    if (now - this.lastFrameTime < this.minFrameInterval) return;
    this.lastFrameTime = now;

    if (this.isDragging) {
      const coords = this.getCanvasCoordinates(e);
      const editState = this.renderer.getEditState();
      if (editState.draggingId) {
        const snapped = this.renderer.snapToGrid(
          coords.x - this.dragOffset.x,
          coords.y - this.dragOffset.y
        );
        this.callbacks.onIngredientUpdate(editState.draggingId, {
          x: Math.max(20, Math.min(this.canvas.width - 20, snapped.x)),
          y: Math.max(40, Math.min(this.canvas.height - 40, snapped.y))
        });
      }
    }
  }

  private handleTouchEnd(e: TouchEvent): void {
    e.preventDefault();
    if (this.isDragging) {
      this.isDragging = false;
      this.renderer.setEditState({
        draggingId: null,
        pressedId: null
      });
      this.callbacks.onRecipeChange();
    }
  }

  public showEditPopup(ingredient: Ingredient, clientX: number, clientY: number): void {
    this.editingIngredient = ingredient;
    this.selectedColor = ingredient.color;

    this.overlayElement = document.createElement('div');
    this.overlayElement.className = 'overlay';
    this.overlayElement.addEventListener('click', () => this.hideEditPopup());
    document.body.appendChild(this.overlayElement);

    this.popupElement = document.createElement('div');
    this.popupElement.className = 'edit-popup';
    
    const palette = this.renderer.getPalette();
    const paletteHtml = palette.map(color => `
      <div class="color-swatch ${color === this.selectedColor ? 'selected' : ''}" 
           style="background-color: ${color};"
           data-color="${color}"></div>
    `).join('');

    this.popupElement.innerHTML = `
      <h4>编辑原料</h4>
      <label>原料名称（最多8字）</label>
      <input type="text" id="ingredientName" value="${ingredient.name}" maxlength="8" />
      <label>选择颜色</label>
      <div class="color-palette">${paletteHtml}</div>
      <div class="popup-buttons">
        <button class="pixel-btn" id="cancelBtn">取消</button>
        <button class="pixel-btn" id="saveBtn">保存</button>
      </div>
    `;

    document.body.appendChild(this.popupElement);

    const nameInput = this.popupElement.querySelector('#ingredientName') as HTMLInputElement;
    nameInput.focus();
    nameInput.select();

    const colorSwatches = this.popupElement.querySelectorAll('.color-swatch');
    colorSwatches.forEach(swatch => {
      swatch.addEventListener('click', (e) => {
        const target = e.currentTarget as HTMLElement;
        const color = target.dataset.color;
        if (color) {
          this.selectedColor = color;
          colorSwatches.forEach(s => s.classList.remove('selected'));
          target.classList.add('selected');
        }
      });
    });

    this.popupElement.querySelector('#cancelBtn')?.addEventListener('click', () => {
      this.hideEditPopup();
    });

    this.popupElement.querySelector('#saveBtn')?.addEventListener('click', () => {
      this.saveEdit();
    });

    nameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this.saveEdit();
      } else if (e.key === 'Escape') {
        this.hideEditPopup();
      }
    });

    this.positionPopup(clientX, clientY);
  }

  private positionPopup(clientX: number, clientY: number): void {
    if (!this.popupElement) return;

    requestAnimationFrame(() => {
      if (!this.popupElement) return;
      
      const popupRect = this.popupElement.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let left = clientX - popupRect.width / 2;
      let top = clientY - popupRect.height / 2;

      left = Math.max(20, Math.min(viewportWidth - popupRect.width - 20, left));
      top = Math.max(20, Math.min(viewportHeight - popupRect.height - 20, top));

      this.popupElement.style.left = `${left + popupRect.width / 2}px`;
      this.popupElement.style.top = `${top + popupRect.height / 2}px`;
    });
  }

  private saveEdit(): void {
    if (!this.editingIngredient || !this.popupElement) return;

    const nameInput = this.popupElement.querySelector('#ingredientName') as HTMLInputElement;
    const name = nameInput.value.trim() || this.editingIngredient.name;

    this.callbacks.onIngredientUpdate(this.editingIngredient.id, {
      name: name.slice(0, 8),
      color: this.selectedColor
    });

    this.hideEditPopup();
    this.callbacks.onRecipeChange();
  }

  public hideEditPopup(): void {
    if (this.popupElement) {
      this.popupElement.remove();
      this.popupElement = null;
    }
    if (this.overlayElement) {
      this.overlayElement.remove();
      this.overlayElement = null;
    }
    this.editingIngredient = null;
  }

  public destroy(): void {
    this.canvas.removeEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.removeEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.removeEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.removeEventListener('mouseleave', this.handleMouseLeave.bind(this));
    this.canvas.removeEventListener('dblclick', this.handleDoubleClick.bind(this));
    
    this.hideEditPopup();
  }
}
