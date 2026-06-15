import { EmotionType, Plant } from './plant';
import { EmotionButton } from './renderer';

export interface UIHandlers {
  onEmotionClick: (emotion: EmotionType, buttonIndex: number) => void;
  onPlantClick: (plant: Plant) => void;
  onPlantRightClick: (plant: Plant, screenX: number, screenY: number) => void;
  onPruneConfirm: (plant: Plant) => void;
  onPruneCancel: () => void;
}

interface ContextMenu {
  visible: boolean;
  x: number;
  y: number;
  plant: Plant | null;
}

export class UIManager {
  private canvas: HTMLCanvasElement;
  private buttons: EmotionButton[] = [];
  private handlers: UIHandlers;
  private plants: Plant[] = [];

  private contextMenu: ContextMenu = {
    visible: false,
    x: 0,
    y: 0,
    plant: null,
  };
  private menuElement: HTMLDivElement | null = null;

  private pressTimers: Map<number, number> = new Map();

  constructor(canvas: HTMLCanvasElement, handlers: UIHandlers) {
    this.canvas = canvas;
    this.handlers = handlers;
    this.createContextMenu();
    this.bindEvents();
  }

  updateButtons(buttons: EmotionButton[]) {
    this.buttons = buttons;
  }

  updatePlants(plants: Plant[]) {
    this.plants = plants;
  }

  private createContextMenu() {
    this.menuElement = document.createElement('div');
    this.menuElement.style.cssText = `
      position: fixed;
      background: rgba(40, 44, 52, 0.95);
      color: #fff;
      border-radius: 8px;
      padding: 4px 0;
      font-family: sans-serif;
      font-size: 13px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      z-index: 1000;
      display: none;
      backdrop-filter: blur(8px);
      border: 1px solid rgba(255,255,255,0.1);
    `;

    const confirmBtn = document.createElement('div');
    confirmBtn.textContent = '✂️ 确认剪枝';
    confirmBtn.style.cssText = `
      padding: 8px 20px;
      cursor: pointer;
      user-select: none;
      transition: background 0.15s;
    `;
    confirmBtn.onmouseenter = () => (confirmBtn.style.background = 'rgba(255,255,255,0.1)');
    confirmBtn.onmouseleave = () => (confirmBtn.style.background = 'transparent');
    confirmBtn.onclick = () => {
      if (this.contextMenu.plant) {
        this.handlers.onPruneConfirm(this.contextMenu.plant);
      }
      this.hideContextMenu();
    };

    const cancelBtn = document.createElement('div');
    cancelBtn.textContent = '取消';
    cancelBtn.style.cssText = `
      padding: 8px 20px;
      cursor: pointer;
      user-select: none;
      color: #aaa;
      transition: background 0.15s;
    `;
    cancelBtn.onmouseenter = () => (cancelBtn.style.background = 'rgba(255,255,255,0.1)');
    cancelBtn.onmouseleave = () => (cancelBtn.style.background = 'transparent');
    cancelBtn.onclick = () => {
      this.handlers.onPruneCancel();
      this.hideContextMenu();
    };

    this.menuElement.appendChild(confirmBtn);
    this.menuElement.appendChild(cancelBtn);
    document.body.appendChild(this.menuElement);
  }

  showContextMenu(x: number, y: number, plant: Plant) {
    this.contextMenu = { visible: true, x, y, plant };
    if (this.menuElement) {
      this.menuElement.style.display = 'block';
      const menuW = 120;
      const menuH = 70;
      const screenX = Math.min(x, window.innerWidth - menuW - 10);
      const screenY = Math.min(y, window.innerHeight - menuH - 10);
      this.menuElement.style.left = screenX + 'px';
      this.menuElement.style.top = screenY + 'px';
    }
  }

  hideContextMenu() {
    this.contextMenu.visible = false;
    this.contextMenu.plant = null;
    if (this.menuElement) {
      this.menuElement.style.display = 'none';
    }
  }

  private bindEvents() {
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('contextmenu', (e) => this.handleRightClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    document.addEventListener('click', (e) => {
      if (this.contextMenu.visible && !(e.target as HTMLElement).closest('[data-menu]')) {
        if (this.menuElement && !this.menuElement.contains(e.target as Node)) {
          this.hideContextMenu();
        }
      }
    });
  }

  private getCanvasCoords(clientX: number, clientY: number): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  private handleClick(e: MouseEvent) {
    const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);

    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      const dx = x - btn.x;
      const dy = y - btn.y;
      if (dx * dx + dy * dy <= btn.radius * btn.radius * 1.2) {
        return;
      }
    }

    for (let i = this.plants.length - 1; i >= 0; i--) {
      const plant = this.plants[i];
      if (plant.containsPoint(x, y)) {
        this.handlers.onPlantClick(plant);
        return;
      }
    }
  }

  private handleRightClick(e: MouseEvent) {
    e.preventDefault();
    const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);

    for (let i = this.plants.length - 1; i >= 0; i--) {
      const plant = this.plants[i];
      if (plant.containsPoint(x, y)) {
        this.handlers.onPlantRightClick(plant, e.clientX, e.clientY);
        return;
      }
    }

    this.hideContextMenu();
  }

  private handleMouseMove(e: MouseEvent) {
    const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);

    let hovering = false;
    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      const dx = x - btn.x;
      const dy = y - btn.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= btn.radius * 1.1) {
        if (!btn.hover) {
          btn.hover = true;
          this.canvas.style.cursor = 'pointer';
        }
        hovering = true;
      } else {
        btn.hover = false;
      }
    }

    if (!hovering) {
      for (const plant of this.plants) {
        if (plant.containsPoint(x, y)) {
          this.canvas.style.cursor = 'pointer';
          hovering = true;
          break;
        }
      }
    }

    if (!hovering) {
      this.canvas.style.cursor = 'default';
    }
  }

  private handleMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;

    const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);

    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      const dx = x - btn.x;
      const dy = y - btn.y;
      if (dx * dx + dy * dy <= btn.radius * btn.radius * 1.2) {
        btn.scale = 0.92;
        const id = Date.now() + i;
        this.pressTimers.set(i, id);
        return;
      }
    }
  }

  private handleMouseUp(e: MouseEvent) {
    if (e.button !== 0) return;

    const { x, y } = this.getCanvasCoords(e.clientX, e.clientY);

    for (let i = 0; i < this.buttons.length; i++) {
      const btn = this.buttons[i];
      const dx = x - btn.x;
      const dy = y - btn.y;
      const isClick = dx * dx + dy * dy <= btn.radius * btn.radius * 1.4;

      if (this.pressTimers.has(i) && isClick) {
        this.handlers.onEmotionClick(btn.emotion, i);
        btn.scale = 1.15;
        setTimeout(() => {
          btn.scale = 1;
        }, 200);
      } else {
        btn.scale = 1;
      }
      this.pressTimers.delete(i);
    }
  }

  destroy() {
    this.hideContextMenu();
    if (this.menuElement) {
      this.menuElement.remove();
      this.menuElement = null;
    }
  }
}
