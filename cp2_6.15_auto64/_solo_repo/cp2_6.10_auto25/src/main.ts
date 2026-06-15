import { NodeManager } from './nodeManager';
import { CanvasManager } from './canvas';
import { BroadcastManager } from './broadcast';
import type { MindMapNode, Priority } from './nodeManager';

class MindMapApp {
  private nodeManager: NodeManager;
  private broadcast: BroadcastManager;
  private canvasManager: CanvasManager;

  private canvas: HTMLCanvasElement;
  private container: HTMLElement;
  private nodePanel: HTMLElement;
  private bgColorsContainer: HTMLElement;
  private textColorsContainer: HTMLElement;
  private borderSlider: HTMLInputElement;
  private borderValue: HTMLElement;
  private priorityButtons: NodeListOf<HTMLButtonElement>;

  constructor() {
    this.nodeManager = new NodeManager();
    this.broadcast = new BroadcastManager('mindmap-collab');

    this.canvas = document.getElementById('canvas') as HTMLCanvasElement;
    this.container = document.getElementById('canvas-container') as HTMLElement;
    this.nodePanel = document.getElementById('node-panel') as HTMLElement;
    this.bgColorsContainer = document.getElementById('bg-colors') as HTMLElement;
    this.textColorsContainer = document.getElementById('text-colors') as HTMLElement;
    this.borderSlider = document.getElementById('border-slider') as HTMLInputElement;
    this.borderValue = document.getElementById('border-value') as HTMLElement;
    this.priorityButtons = document.querySelectorAll('.priority-btn') as NodeListOf<HTMLButtonElement>;

    this.canvasManager = new CanvasManager(this.canvas, this.container, this.nodeManager, this.broadcast);
    this.canvasManager.setOnNodeSelect((node) => this.onNodeSelect(node));

    this.initColorPalettes();
    this.bindToolbarEvents();
    this.bindPanelEvents();
    this.bindKeyboardShortcuts();
    this.updateUndoRedoButtons();

    this.nodeManager.subscribe(() => {
      this.updateUndoRedoButtons();
      this.updatePanelState();
    });

    setTimeout(() => {
      this.broadcast.requestSync();
    }, 100);

    if (this.nodeManager.getNodes().length === 0) {
      const rect = this.canvas.getBoundingClientRect();
      this.nodeManager.addNode(rect.width / 2, rect.height / 2, '中心主题', null, {
        bgColor: '#e8f4fd'
      });
    }
  }

  private initColorPalettes(): void {
    const bgColors = this.nodeManager.getColorPalette();
    const textColors = this.nodeManager.getTextColors();

    bgColors.forEach(color => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = color;
      swatch.dataset.color = color;
      swatch.addEventListener('click', () => {
        this.canvasManager.updateSelectedNodeStyle({ bgColor: color });
      });
      this.bgColorsContainer.appendChild(swatch);
    });

    textColors.forEach(color => {
      const swatch = document.createElement('div');
      swatch.className = 'color-swatch';
      swatch.style.backgroundColor = color;
      swatch.dataset.color = color;
      swatch.addEventListener('click', () => {
        this.canvasManager.updateSelectedNodeStyle({ textColor: color });
      });
      this.textColorsContainer.appendChild(swatch);
    });
  }

  private bindToolbarEvents(): void {
    const btnUndo = document.getElementById('btn-undo');
    const btnRedo = document.getElementById('btn-redo');
    const btnAdd = document.getElementById('btn-add-node');
    const btnDelete = document.getElementById('btn-delete-node');
    const btnExport = document.getElementById('btn-export');
    const btnClear = document.getElementById('btn-clear');

    btnUndo?.addEventListener('click', () => {
      this.canvasManager.undo();
    });

    btnRedo?.addEventListener('click', () => {
      this.canvasManager.redo();
    });

    btnAdd?.addEventListener('click', () => {
      this.canvasManager.addNodeAtCenter();
    });

    btnDelete?.addEventListener('click', () => {
      this.canvasManager.deleteSelectedNode();
    });

    btnExport?.addEventListener('click', () => {
      this.canvasManager.exportToPNG();
    });

    btnClear?.addEventListener('click', () => {
      this.canvasManager.clearCanvas();
    });
  }

  private bindPanelEvents(): void {
    this.borderSlider.addEventListener('input', () => {
      const value = parseInt(this.borderSlider.value, 10);
      this.borderValue.textContent = value.toString();
      this.canvasManager.updateSelectedNodeStyle({ borderWidth: value });
    });

    this.priorityButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const priority = btn.dataset.priority as Priority;
        const currentNode = this.canvasManager.getSelectedNode();
        if (currentNode && currentNode.priority === priority) {
          this.canvasManager.updateSelectedNodeStyle({ priority: null });
        } else {
          this.canvasManager.updateSelectedNodeStyle({ priority });
        }
      });
    });
  }

  private bindKeyboardShortcuts(): void {
    document.addEventListener('keydown', (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        this.canvasManager.undo();
      }

      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        this.canvasManager.redo();
      }
    });
  }

  private onNodeSelect(node: MindMapNode | null): void {
    if (node) {
      this.nodePanel.classList.add('visible');
      this.borderSlider.value = node.borderWidth.toString();
      this.borderValue.textContent = node.borderWidth.toString();
      this.updatePriorityButtons(node.priority);
    } else {
      this.nodePanel.classList.remove('visible');
    }
  }

  private updatePanelState(): void {
    const node = this.canvasManager.getSelectedNode();
    if (node) {
      this.borderSlider.value = node.borderWidth.toString();
      this.borderValue.textContent = node.borderWidth.toString();
      this.updatePriorityButtons(node.priority);
    }
  }

  private updatePriorityButtons(currentPriority: Priority): void {
    this.priorityButtons.forEach(btn => {
      const priority = btn.dataset.priority as Priority;
      btn.classList.toggle('active', priority === currentPriority);
    });
  }

  private updateUndoRedoButtons(): void {
    const btnUndo = document.getElementById('btn-undo') as HTMLButtonElement;
    const btnRedo = document.getElementById('btn-redo') as HTMLButtonElement;

    if (btnUndo) {
      btnUndo.disabled = !this.nodeManager.canUndo();
    }
    if (btnRedo) {
      btnRedo.disabled = !this.nodeManager.canRedo();
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new MindMapApp();
});
