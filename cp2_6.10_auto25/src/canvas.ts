import type { MindMapNode, Priority } from './nodeManager';
import { NodeManager } from './nodeManager';
import type { BroadcastMessage } from './broadcast';
import { BroadcastManager } from './broadcast';

interface DragState {
  isDragging: boolean;
  nodeId: string | null;
  startX: number;
  startY: number;
  nodeStartX: number;
  nodeStartY: number;
  hasMoved: boolean;
}

interface EditorState {
  isEditing: boolean;
  nodeId: string | null;
  element: HTMLTextAreaElement | null;
}

export class CanvasManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private nodeManager: NodeManager;
  private broadcast: BroadcastManager;

  private selectedNodeId: string | null = null;
  private drag: DragState = {
    isDragging: false,
    nodeId: null,
    startX: 0,
    startY: 0,
    nodeStartX: 0,
    nodeStartY: 0,
    hasMoved: false
  };
  private editor: EditorState = {
    isEditing: false,
    nodeId: null,
    element: null
  };

  private dpr: number = 1;
  private animationFrameId: number | null = null;
  private pendingRedraw: boolean = false;
  private isBroadcasting: boolean = false;

  private onNodeSelect?: (node: MindMapNode | null) => void;

  constructor(
    canvas: HTMLCanvasElement,
    container: HTMLElement,
    nodeManager: NodeManager,
    broadcast: BroadcastManager
  ) {
    this.canvas = canvas;
    this.container = container;
    this.nodeManager = nodeManager;
    this.broadcast = broadcast;

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2d context');
    this.ctx = ctx;

    this.dpr = window.devicePixelRatio || 1;
    this.resize();

    this.bindEvents();
    this.nodeManager.subscribe(() => this.requestRedraw());
    this.setupBroadcastListener();

    this.requestRedraw();
  }

  setOnNodeSelect(callback: (node: MindMapNode | null) => void): void {
    this.onNodeSelect = callback;
  }

  getSelectedNode(): MindMapNode | null {
    return this.selectedNodeId ? this.nodeManager.getNode(this.selectedNodeId) ?? null : null;
  }

  selectNode(nodeId: string | null): void {
    this.selectedNodeId = nodeId;
    if (this.onNodeSelect) {
      this.onNodeSelect(this.getSelectedNode());
    }
    this.requestRedraw();
  }

  resize(): void {
    const rect = this.container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    this.canvas.width = width * this.dpr;
    this.canvas.height = height * this.dpr;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.requestRedraw();
  }

  private getCanvasCoords(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private findNodeAt(x: number, y: number): MindMapNode | null {
    const nodes = this.nodeManager.getNodes();
    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i];
      if (
        x >= node.x - node.width / 2 &&
        x <= node.x + node.width / 2 &&
        y >= node.y - node.height / 2 &&
        y <= node.y + node.height / 2
      ) {
        return node;
      }
    }
    return null;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mouseleave', this.onMouseUp);
    this.canvas.addEventListener('dblclick', this.onDoubleClick);
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', this.onKeyDown);
  }

  private setupBroadcastListener(): void {
    this.broadcast.subscribe((msg: BroadcastMessage) => {
      this.isBroadcasting = true;
      try {
        switch (msg.type) {
          case 'add':
            if (msg.nodes && msg.nodes.length > 0) {
              const n = msg.nodes[0];
              this.nodeManager.addNodeWithoutHistory(n.x, n.y, n.text, n.parentId, n);
            }
            break;
          case 'delete':
            if (msg.nodeId) {
              this.nodeManager.deleteNodeWithoutHistory(msg.nodeId);
              if (this.selectedNodeId === msg.nodeId) {
                this.selectNode(null);
              }
            }
            break;
          case 'update':
            if (msg.nodeId && msg.updates) {
              this.nodeManager.updateNode(msg.nodeId, msg.updates, false);
            }
            break;
          case 'move':
            if (msg.nodeId && msg.x !== undefined && msg.y !== undefined) {
              this.nodeManager.moveNode(msg.nodeId, msg.x, msg.y, false);
            }
            break;
          case 'clear':
            this.nodeManager.clearWithoutHistory();
            this.selectNode(null);
            break;
          case 'sync-request':
            this.broadcast.respondSync(this.nodeManager.getNodes());
            break;
          case 'sync-response':
            if (msg.nodes && this.nodeManager.getNodes().length === 0) {
              msg.nodes.forEach(n => {
                this.nodeManager.addNodeWithoutHistory(n.x, n.y, n.text, n.parentId, n);
              });
            }
            break;
        }
      } finally {
        this.isBroadcasting = false;
      }
    });
  }

  private onMouseDown = (e: MouseEvent): void => {
    if (this.editor.isEditing) {
      this.finishEditing();
    }

    const { x, y } = this.getCanvasCoords(e);
    const node = this.findNodeAt(x, y);

    if (node) {
      this.selectNode(node.id);
      this.drag = {
        isDragging: true,
        nodeId: node.id,
        startX: x,
        startY: y,
        nodeStartX: node.x,
        nodeStartY: node.y,
        hasMoved: false
      };
      this.canvas.style.cursor = 'grabbing';
    } else {
      this.selectNode(null);
      this.canvas.style.cursor = 'default';
    }
  };

  private onMouseMove = (e: MouseEvent): void => {
    const { x, y } = this.getCanvasCoords(e);

    if (this.drag.isDragging && this.drag.nodeId) {
      const dx = x - this.drag.startX;
      const dy = y - this.drag.startY;

      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
        this.drag.hasMoved = true;
      }

      const newX = this.drag.nodeStartX + dx;
      const newY = this.drag.nodeStartY + dy;

      this.nodeManager.moveNode(this.drag.nodeId, newX, newY, false);

      if (!this.isBroadcasting && this.drag.hasMoved) {
        this.broadcast.broadcastMove(this.drag.nodeId, newX, newY);
      }
    } else {
      const node = this.findNodeAt(x, y);
      this.canvas.style.cursor = node ? 'grab' : 'crosshair';
    }
  };

  private onMouseUp = (): void => {
    if (this.drag.isDragging && this.drag.nodeId && this.drag.hasMoved) {
      const node = this.nodeManager.getNode(this.drag.nodeId);
      if (node) {
        this.nodeManager.moveNode(this.drag.nodeId, node.x, node.y, true);
      }
    }

    this.drag = {
      isDragging: false,
      nodeId: null,
      startX: 0,
      startY: 0,
      nodeStartX: 0,
      nodeStartY: 0,
      hasMoved: false
    };
    this.canvas.style.cursor = 'default';
  };

  private onDoubleClick = (e: MouseEvent): void => {
    const { x, y } = this.getCanvasCoords(e);
    const node = this.findNodeAt(x, y);

    if (node) {
      this.startEditing(node.id);
    } else {
      const newNode = this.nodeManager.addNode(x, y, '新节点', null);
      if (!this.isBroadcasting) {
        this.broadcast.broadcastAdd(newNode);
      }
      this.selectNode(newNode.id);
      this.startEditing(newNode.id);
    }
  };

  private onKeyDown = (e: KeyboardEvent): void => {
    if (this.editor.isEditing && e.key === 'Escape') {
      this.cancelEditing();
      return;
    }

    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        if (e.shiftKey) {
          this.redo();
        } else {
          this.undo();
        }
        return;
      }
    }

    if (!this.editor.isEditing && (e.key === 'Delete' || e.key === 'Backspace')) {
      if (this.selectedNodeId) {
        e.preventDefault();
        this.deleteSelectedNode();
      }
    }

    if (!this.editor.isEditing && e.key === 'Enter' && this.selectedNodeId) {
      e.preventDefault();
      this.startEditing(this.selectedNodeId);
    }
  };

  undo(): void {
    const action = this.nodeManager.undo();
    if (action) {
      if (this.selectedNodeId && !this.nodeManager.getNode(this.selectedNodeId)) {
        this.selectNode(null);
      }
      this.requestRedraw();
    }
  }

  redo(): void {
    const action = this.nodeManager.redo();
    if (action) {
      this.requestRedraw();
    }
  }

  addNodeAtCenter(): void {
    const rect = this.canvas.getBoundingClientRect();
    const x = rect.width / 2;
    const y = rect.height / 2;
    const newNode = this.nodeManager.addNode(x, y, '新节点', null);
    this.broadcast.broadcastAdd(newNode);
    this.selectNode(newNode.id);
    this.startEditing(newNode.id);
  }

  deleteSelectedNode(): void {
    if (!this.selectedNodeId) return;
    const nodeId = this.selectedNodeId;
    this.nodeManager.deleteNode(nodeId);
    this.broadcast.broadcastDelete(nodeId);
    this.selectNode(null);
  }

  clearCanvas(): void {
    if (this.nodeManager.getNodes().length === 0) return;
    if (!confirm('确定要清空画布吗？此操作可以撤销。')) return;
    this.nodeManager.clear();
    this.broadcast.broadcastClear();
    this.selectNode(null);
  }

  private startEditing(nodeId: string): void {
    const node = this.nodeManager.getNode(nodeId);
    if (!node) return;

    if (this.editor.isEditing) {
      this.finishEditing();
    }

    const textarea = document.createElement('textarea');
    textarea.className = 'node-editor';
    textarea.value = node.text;
    textarea.style.left = `${node.x - node.width / 2}px`;
    textarea.style.top = `${node.y - node.height / 2}px`;
    textarea.style.width = `${node.width}px`;
    textarea.style.height = `${node.height}px`;
    textarea.style.color = node.textColor;
    textarea.style.backgroundColor = node.bgColor;

    textarea.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.finishEditing();
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        this.cancelEditing();
      }
    });

    textarea.addEventListener('blur', () => {
      this.finishEditing();
    });

    this.container.appendChild(textarea);
    textarea.focus();
    textarea.select();

    this.editor = {
      isEditing: true,
      nodeId,
      element: textarea
    };
  }

  private finishEditing(): void {
    if (!this.editor.isEditing || !this.editor.element || !this.editor.nodeId) return;

    const newText = this.editor.element.value.trim() || '新节点';
    const node = this.nodeManager.getNode(this.editor.nodeId);

    if (node && node.text !== newText) {
      this.nodeManager.updateNode(this.editor.nodeId, { text: newText }, true);
      this.broadcast.broadcastUpdate(this.editor.nodeId, { text: newText });
    }

    this.editor.element.remove();
    this.editor = {
      isEditing: false,
      nodeId: null,
      element: null
    };
  }

  private cancelEditing(): void {
    if (!this.editor.element) return;
    this.editor.element.remove();
    this.editor = {
      isEditing: false,
      nodeId: null,
      element: null
    };
  }

  updateSelectedNodeStyle(updates: Partial<MindMapNode>): void {
    if (!this.selectedNodeId) return;
    this.nodeManager.updateNode(this.selectedNodeId, updates, true);
    this.broadcast.broadcastUpdate(this.selectedNodeId, updates);
  }

  exportToPNG(): void {
    const nodes = this.nodeManager.getNodes();
    if (nodes.length === 0) {
      alert('画布为空，无法导出');
      return;
    }

    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    nodes.forEach(node => {
      minX = Math.min(minX, node.x - node.width / 2);
      minY = Math.min(minY, node.y - node.height / 2);
      maxX = Math.max(maxX, node.x + node.width / 2);
      maxY = Math.max(maxY, node.y + node.height / 2);
    });

    const padding = 40;
    const exportWidth = maxX - minX + padding * 2;
    const exportHeight = maxY - minY + padding * 2;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = exportWidth * this.dpr;
    exportCanvas.height = exportHeight * this.dpr;
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) return;

    exportCtx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    exportCtx.fillStyle = '#ffffff';
    exportCtx.fillRect(0, 0, exportWidth, exportHeight);
    exportCtx.translate(-minX + padding, -minY + padding);

    this.drawConnections(exportCtx);
    nodes.forEach(node => this.drawNode(exportCtx, node, null));

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const link = document.createElement('a');
    link.download = `mindmap-${timestamp}.png`;
    link.href = exportCanvas.toDataURL('image/png');
    link.click();
  }

  private requestRedraw(): void {
    if (this.pendingRedraw) return;
    this.pendingRedraw = true;

    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }

    this.animationFrameId = requestAnimationFrame(() => {
      this.redraw();
      this.pendingRedraw = false;
      this.animationFrameId = null;
    });
  }

  private redraw(): void {
    const startTime = performance.now();
    const rect = this.canvas.getBoundingClientRect();

    this.ctx.clearRect(0, 0, rect.width, rect.height);
    this.drawConnections(this.ctx);

    const nodes = this.nodeManager.getNodes();
    nodes.forEach(node => {
      this.drawNode(this.ctx, node, this.selectedNodeId);
    });

    const elapsed = performance.now() - startTime;
    if (elapsed > 50) {
      console.warn(`Canvas redraw took ${elapsed.toFixed(1)}ms, target < 50ms`);
    }
  }

  private drawConnections(ctx: CanvasRenderingContext2D): void {
    const nodes = this.nodeManager.getNodes();

    ctx.strokeStyle = '#b0b0b0';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';

    nodes.forEach(node => {
      if (node.parentId) {
        const parent = this.nodeManager.getNode(node.parentId);
        if (parent) {
          this.drawBezierCurve(ctx, parent, node);
        }
      }
    });
  }

  private drawBezierCurve(
    ctx: CanvasRenderingContext2D,
    parent: MindMapNode,
    child: MindMapNode
  ): void {
    const startX = parent.x + parent.width / 2;
    const startY = parent.y;
    const endX = child.x - child.width / 2;
    const endY = child.y;

    const dx = Math.abs(endX - startX);
    const controlOffset = Math.max(dx * 0.5, 50);

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(
      startX + controlOffset,
      startY,
      endX - controlOffset,
      endY,
      endX,
      endY
    );
    ctx.stroke();
  }

  private getPriorityIcon(priority: Priority): string {
    switch (priority) {
      case 'high':
        return '🔴';
      case 'medium':
        return '🟡';
      case 'low':
        return '🟢';
      default:
        return '';
    }
  }

  private drawNode(
    ctx: CanvasRenderingContext2D,
    node: MindMapNode,
    selectedId: string | null
  ): void {
    const x = node.x;
    const y = node.y;
    const w = node.width;
    const h = node.height;
    const radius = 12;
    const isSelected = node.id === selectedId;

    if (isSelected) {
      ctx.shadowColor = 'rgba(66, 133, 244, 0.6)';
      ctx.shadowBlur = 12;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 0;
    } else {
      ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetX = 0;
      ctx.shadowOffsetY = 2;
    }

    ctx.fillStyle = node.bgColor;
    ctx.beginPath();
    ctx.roundRect(x - w / 2, y - h / 2, w, h, radius);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;

    ctx.strokeStyle = '#d0d0d0';
    ctx.lineWidth = node.borderWidth;
    ctx.stroke();

    ctx.fillStyle = node.textColor;
    ctx.font = '14px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    const icon = this.getPriorityIcon(node.priority);
    const displayText = icon ? `${icon} ${node.text}` : node.text;

    ctx.fillText(displayText, x, y);
  }

  getNodeManager(): NodeManager {
    return this.nodeManager;
  }

  getBroadcast(): BroadcastManager {
    return this.broadcast;
  }

  destroy(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.broadcast.close();
  }
}
