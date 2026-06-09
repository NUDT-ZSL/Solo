import { v4 as uuidv4 } from 'uuid';

export type NodeShape = 'circle' | 'rectangle' | 'diamond';

export interface WhiteboardNode {
  id: string;
  x: number;
  y: number;
  shape: NodeShape;
  color: string;
  text: string;
  rotation: number;
  scale: number;
}

export interface HistoryAction {
  type: 'create' | 'delete' | 'move' | 'edit' | 'scale' | 'rotate';
  nodeId: string;
  before?: Partial<WhiteboardNode>;
  after?: Partial<WhiteboardNode>;
  nodeSnapshot?: WhiteboardNode;
}

const SOFT_COLORS = ['#FFDAB9', '#B0E0E6', '#E6E6FA', '#FFFACD', '#D8BFD8'];
const MAX_HISTORY = 50;

export class NodeManager {
  private nodes: Map<string, WhiteboardNode> = new Map();
  private container: HTMLElement;
  private history: HistoryAction[] = [];
  private historyIndex: number = -1;
  private selectedNodeId: string | null = null;
  private onNodesChanged: () => void;
  private onSelectionChanged: (nodeId: string | null) => void;
  private onNodeDragging: (nodeId: string) => void;
  private onRequestSave: () => void;
  private viewportOffset = { x: 0, y: 0 };
  private viewportScale = 1;

  constructor(
    container: HTMLElement,
    onNodesChanged: () => void,
    onSelectionChanged: (nodeId: string | null) => void,
    onNodeDragging: (nodeId: string) => void,
    onRequestSave: () => void
  ) {
    this.container = container;
    this.onNodesChanged = onNodesChanged;
    this.onSelectionChanged = onSelectionChanged;
    this.onNodeDragging = onNodeDragging;
    this.onRequestSave = onRequestSave;
  }

  setViewport(offset: { x: number; y: number }, scale: number) {
    this.viewportOffset = offset;
    this.viewportScale = scale;
    this.updateAllNodePositions();
  }

  private getRandomColor(): string {
    return SOFT_COLORS[Math.floor(Math.random() * SOFT_COLORS.length)];
  }

  getNodeSize(shape: NodeShape): { width: number; height: number } {
    switch (shape) {
      case 'circle':
        return { width: 60, height: 60 };
      case 'rectangle':
        return { width: 120, height: 80 };
      case 'diamond':
        return { width: 80, height: 80 };
    }
  }

  getNodes(): WhiteboardNode[] {
    return Array.from(this.nodes.values());
  }

  getNode(id: string): WhiteboardNode | undefined {
    return this.nodes.get(id);
  }

  getSelectedNodeId(): string | null {
    return this.selectedNodeId;
  }

  getAnchorPoints(node: WhiteboardNode): { x: number; y: number }[] {
    const { width, height } = this.getNodeSize(node.shape);
    const w = width * node.scale;
    const h = height * node.scale;
    const cx = node.x;
    const cy = node.y;
    return [
      { x: cx - w / 2, y: cy - h / 2 },
      { x: cx, y: cy - h / 2 },
      { x: cx + w / 2, y: cy - h / 2 },
      { x: cx + w / 2, y: cy },
      { x: cx + w / 2, y: cy + h / 2 },
      { x: cx, y: cy + h / 2 },
      { x: cx - w / 2, y: cy + h / 2 },
      { x: cx - w / 2, y: cy }
    ];
  }

  private screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: (screenX - this.viewportOffset.x) / this.viewportScale,
      y: (screenY - this.viewportOffset.y) / this.viewportScale
    };
  }

  createNode(
    shape: NodeShape,
    worldX: number,
    worldY: number,
    recordHistory: boolean = true
  ): WhiteboardNode {
    const node: WhiteboardNode = {
      id: uuidv4(),
      x: worldX,
      y: worldY,
      shape,
      color: this.getRandomColor(),
      text: '',
      rotation: 0,
      scale: 1
    };
    this.nodes.set(node.id, node);
    this.createNodeElement(node);

    if (recordHistory) {
      this.pushHistory({
        type: 'create',
        nodeId: node.id,
        nodeSnapshot: { ...node }
      });
      this.onRequestSave();
    }

    this.onNodesChanged();
    return node;
  }

  deleteNode(id: string, recordHistory: boolean = true) {
    const node = this.nodes.get(id);
    if (!node) return;

    if (recordHistory) {
      this.pushHistory({
        type: 'delete',
        nodeId: id,
        nodeSnapshot: { ...node }
      });
    }

    const el = document.getElementById(`node-${id}`);
    if (el) el.remove();
    this.nodes.delete(id);

    if (this.selectedNodeId === id) {
      this.setSelectedNode(null);
    }

    if (recordHistory) {
      this.onRequestSave();
    }
    this.onNodesChanged();
  }

  clearAll() {
    const snapshot = this.getNodes().map(n => ({ ...n }));
    for (const node of this.getNodes()) {
      this.deleteNode(node.id, false);
    }
    this.history = [];
    this.historyIndex = -1;
    if (snapshot.length > 0) {
      this.pushHistory({
        type: 'delete',
        nodeId: '__all__',
        before: { nodes: snapshot } as any
      });
      this.onRequestSave();
    }
  }

  loadNodes(nodes: WhiteboardNode[]) {
    for (const node of this.getNodes()) {
      const el = document.getElementById(`node-${node.id}`);
      if (el) el.remove();
    }
    this.nodes.clear();
    this.history = [];
    this.historyIndex = -1;
    this.selectedNodeId = null;

    for (const nodeData of nodes) {
      const node = { ...nodeData };
      this.nodes.set(node.id, node);
      this.createNodeElement(node);
    }
    this.onNodesChanged();
    this.onSelectionChanged(null);
  }

  private createNodeElement(node: WhiteboardNode) {
    const el = document.createElement('div');
    el.id = `node-${node.id}`;
    el.className = 'wb-node';
    el.dataset.nodeId = node.id;
    this.updateNodeElementStyle(el, node);
    this.setupNodeEvents(el, node);
    this.container.appendChild(el);
  }

  private calculateFontSize(text: string): number {
    if (text.length <= 10) return 16;
    if (text.length <= 20) return 14;
    if (text.length <= 30) return 13;
    if (text.length <= 40) return 12;
    if (text.length <= 50) return 11;
    return 10;
  }

  private updateNodeElementStyle(el: HTMLElement, node: WhiteboardNode) {
    const { width, height } = this.getNodeSize(node.shape);
    const screenX = node.x * this.viewportScale + this.viewportOffset.x;
    const screenY = node.y * this.viewportScale + this.viewportOffset.y;
    const scaledW = width * node.scale * this.viewportScale;
    const scaledH = height * node.scale * this.viewportScale;

    el.style.position = 'absolute';
    el.style.left = `${screenX - scaledW / 2}px`;
    el.style.top = `${screenY - scaledH / 2}px`;
    el.style.width = `${scaledW}px`;
    el.style.height = `${scaledH}px`;
    el.style.backgroundColor = node.color;
    el.style.border = this.selectedNodeId === node.id
      ? '2px solid #4A90D9'
      : '1px solid #999';
    el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
    el.style.cursor = 'move';
    el.style.userSelect = 'none';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.padding = '8px';
    el.style.overflow = 'hidden';
    el.style.zIndex = this.selectedNodeId === node.id ? '100' : '10';
    el.style.transition = 'border 0.15s ease, transform 0.1s ease';
    el.style.transform = `rotate(${node.rotation}deg)`;
    el.style.transformOrigin = 'center center';
    el.style.boxSizing = 'border-box';

    if (node.shape === 'circle') {
      el.style.borderRadius = '50%';
    } else if (node.shape === 'diamond') {
      el.style.borderRadius = '4px';
      el.style.transform = `rotate(${node.rotation + 45}deg)`;
    } else {
      el.style.borderRadius = '6px';
    }

    let textEl = el.querySelector('.node-text') as HTMLElement;
    if (!textEl) {
      textEl = document.createElement('div');
      textEl.className = 'node-text';
      el.appendChild(textEl);
    }
    textEl.style.fontSize = `${this.calculateFontSize(node.text)}px`;
    textEl.style.color = '#333';
    textEl.style.textAlign = 'center';
    textEl.style.lineHeight = '1.3';
    textEl.style.maxWidth = '100%';
    textEl.style.wordBreak = 'break-word';
    textEl.style.overflow = 'hidden';
    textEl.style.pointerEvents = 'none';
    if (node.shape === 'diamond') {
      textEl.style.transform = 'rotate(-45deg)';
    }
    textEl.textContent = node.text;
  }

  private updateAllNodePositions() {
    for (const node of this.nodes.values()) {
      const el = document.getElementById(`node-${node.id}`);
      if (el) this.updateNodeElementStyle(el, node);
    }
  }

  updateNodeElement(id: string) {
    const node = this.nodes.get(id);
    const el = document.getElementById(`node-${id}`);
    if (node && el) this.updateNodeElementStyle(el, node);
  }

  private setupNodeEvents(el: HTMLElement, node: WhiteboardNode) {
    let isDragging = false;
    let startX = 0, startY = 0;
    let nodeStartX = 0, nodeStartY = 0;
    let clickTimeout: ReturnType<typeof setTimeout> | null = null;
    let lastClickTime = 0;

    el.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).classList.contains('node-input')) return;
      e.stopPropagation();
      this.setSelectedNode(node.id);

      const now = Date.now();
      if (now - lastClickTime < 300) {
        if (clickTimeout) clearTimeout(clickTimeout);
        this.startEditMode(node.id);
        lastClickTime = 0;
        return;
      }
      lastClickTime = now;

      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      nodeStartX = node.x;
      nodeStartY = node.y;

      el.style.transform = `scale(1.02) rotate(${node.rotation}deg)`;
      if (node.shape === 'diamond') {
        el.style.transform = `scale(1.02) rotate(${node.rotation + 45}deg)`;
      }
      el.style.transition = 'transform 0.1s ease';

      setTimeout(() => {
        el.style.transform = `rotate(${node.rotation}deg)`;
        if (node.shape === 'diamond') {
          el.style.transform = `rotate(${node.rotation + 45}deg)`;
        }
      }, 100);
    });

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = (e.clientX - startX) / this.viewportScale;
      const dy = (e.clientY - startY) / this.viewportScale;
      node.x = nodeStartX + dx;
      node.y = nodeStartY + dy;
      this.updateNodeElementStyle(el, node);
      this.onNodeDragging(node.id);
    };

    const onMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      const moved = Math.abs(node.x - nodeStartX) > 1 || Math.abs(node.y - nodeStartY) > 1;
      if (moved) {
        this.pushHistory({
          type: 'move',
          nodeId: node.id,
          before: { x: nodeStartX, y: nodeStartY },
          after: { x: node.x, y: node.y }
        });
        this.onRequestSave();
      }
      this.onNodesChanged();
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }

  private startEditMode(nodeId: string) {
    const node = this.nodes.get(nodeId);
    const el = document.getElementById(`node-${nodeId}`);
    if (!node || !el) return;

    const textEl = el.querySelector('.node-text') as HTMLElement;
    if (!textEl) return;

    const oldText = node.text;
    textEl.style.display = 'none';

    const input = document.createElement('textarea');
    input.className = 'node-input';
    input.value = node.text;
    input.style.position = 'absolute';
    input.style.width = '90%';
    input.style.height = '80%';
    input.style.border = 'none';
    input.style.background = 'transparent';
    input.style.outline = 'none';
    input.style.resize = 'none';
    input.style.textAlign = 'center';
    input.style.fontSize = `${this.calculateFontSize(node.text)}px`;
    input.style.color = '#333';
    input.style.fontFamily = 'inherit';
    input.style.lineHeight = '1.3';
    input.style.overflow = 'hidden';
    if (node.shape === 'diamond') {
      input.style.transform = 'rotate(-45deg)';
    }
    el.appendChild(input);
    input.focus();
    input.select();

    const finishEdit = () => {
      let newText = input.value;
      if (newText.length > 50) newText = newText.substring(0, 50);
      node.text = newText;
      input.remove();
      textEl.style.display = '';
      if (oldText !== newText) {
        this.pushHistory({
          type: 'edit',
          nodeId: node.id,
          before: { text: oldText },
          after: { text: newText }
        });
        this.onRequestSave();
      }
      this.updateNodeElementStyle(el, node);
    };

    input.addEventListener('blur', finishEdit);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        input.blur();
      }
      if (e.key === 'Escape') {
        input.value = oldText;
        input.blur();
      }
    });
  }

  setSelectedNode(nodeId: string | null) {
    const prevId = this.selectedNodeId;
    this.selectedNodeId = nodeId;
    if (prevId) this.updateNodeElement(prevId);
    if (nodeId) this.updateNodeElement(nodeId);
    this.onSelectionChanged(nodeId);
    this.showHandles(nodeId);
  }

  private showHandles(nodeId: string | null) {
    document.querySelectorAll('.wb-handle').forEach(h => h.remove());

    if (!nodeId) return;
    const node = this.nodes.get(nodeId);
    const el = document.getElementById(`node-${nodeId}`);
    if (!node || !el) return;

    const { width, height } = this.getNodeSize(node.shape);
    const screenX = node.x * this.viewportScale + this.viewportOffset.x;
    const screenY = node.y * this.viewportScale + this.viewportOffset.y;
    const scaledW = width * node.scale * this.viewportScale;
    const scaledH = height * node.scale * this.viewportScale;

    const scaleHandle = document.createElement('div');
    scaleHandle.className = 'wb-handle scale-handle';
    scaleHandle.style.position = 'absolute';
    scaleHandle.style.left = `${screenX + scaledW / 2 + 10}px`;
    scaleHandle.style.top = `${screenY + scaledH / 2}px`;
    scaleHandle.style.width = '16px';
    scaleHandle.style.height = '16px';
    scaleHandle.style.background = '#fff';
    scaleHandle.style.border = '2px solid #4A90D9';
    scaleHandle.style.borderRadius = '50%';
    scaleHandle.style.cursor = 'nwse-resize';
    scaleHandle.style.zIndex = '200';
    scaleHandle.title = '缩放';

    const rotateHandle = document.createElement('div');
    rotateHandle.className = 'wb-handle rotate-handle';
    rotateHandle.style.position = 'absolute';
    rotateHandle.style.left = `${screenX + scaledW / 2 + 10}px`;
    rotateHandle.style.top = `${screenY - scaledH / 2 - 10}px`;
    rotateHandle.style.width = '16px';
    rotateHandle.style.height = '16px';
    rotateHandle.style.background = '#fff';
    rotateHandle.style.border = '2px solid #4A90D9';
    rotateHandle.style.borderRadius = '50%';
    rotateHandle.style.cursor = 'grab';
    rotateHandle.style.zIndex = '200';
    rotateHandle.title = '旋转 (45°步长)';

    this.container.appendChild(scaleHandle);
    this.container.appendChild(rotateHandle);

    let scaleStartDist = 0;
    let scaleStart = node.scale;
    scaleHandle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      scaleStartDist = Math.hypot(e.clientX - screenX, e.clientY - screenY);
      scaleStart = node.scale;

      const onMove = (ev: MouseEvent) => {
        const dist = Math.hypot(ev.clientX - screenX, ev.clientY - screenY);
        const ratio = dist / scaleStartDist;
        let newScale = scaleStart * ratio;
        newScale = Math.max(0.3, Math.min(3, newScale));
        const oldScale = node.scale;
        node.scale = newScale;
        this.updateNodeElement(node.id);
        this.showHandles(nodeId);
        if (Math.abs(newScale - oldScale) > 0.01) this.onNodesChanged();
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        this.pushHistory({
          type: 'scale',
          nodeId: node.id,
          before: { scale: scaleStart },
          after: { scale: node.scale }
        });
        this.onRequestSave();
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });

    rotateHandle.addEventListener('mousedown', (e) => {
      e.stopPropagation();
      const oldRotation = node.rotation;
      const startAngle = Math.atan2(e.clientY - screenY, e.clientX - screenX);

      const onMove = (ev: MouseEvent) => {
        const angle = Math.atan2(ev.clientY - screenY, ev.clientX - screenX);
        let deg = (angle - startAngle) * 180 / Math.PI + oldRotation;
        deg = Math.round(deg / 45) * 45;
        node.rotation = deg;
        this.updateNodeElement(node.id);
        this.showHandles(nodeId);
        this.onNodesChanged();
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
        if (node.rotation !== oldRotation) {
          this.pushHistory({
            type: 'rotate',
            nodeId: node.id,
            before: { rotation: oldRotation },
            after: { rotation: node.rotation }
          });
          this.onRequestSave();
        }
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    });
  }

  private pushHistory(action: HistoryAction) {
    this.history = this.history.slice(0, this.historyIndex + 1);
    this.history.push(action);
    if (this.history.length > MAX_HISTORY) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }
  }

  canUndo(): boolean {
    return this.historyIndex >= 0;
  }

  canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  undo() {
    if (!this.canUndo()) return;
    const action = this.history[this.historyIndex];
    this.historyIndex--;

    switch (action.type) {
      case 'create':
        this.deleteNode(action.nodeId, false);
        break;
      case 'delete':
        if (action.nodeId === '__all__' && (action.before as any)?.nodes) {
          const nodes = (action.before as any).nodes as WhiteboardNode[];
          for (const n of nodes) {
            this.nodes.set(n.id, n);
            this.createNodeElement(n);
          }
          this.onNodesChanged();
        } else if (action.nodeSnapshot) {
          this.nodes.set(action.nodeId, { ...action.nodeSnapshot });
          this.createNodeElement(this.nodes.get(action.nodeId)!);
          this.onNodesChanged();
        }
        break;
      case 'move':
      case 'edit':
      case 'scale':
      case 'rotate':
        const node = this.nodes.get(action.nodeId);
        if (node && action.before) {
          Object.assign(node, action.before);
          this.updateNodeElement(action.nodeId);
          this.showHandles(this.selectedNodeId);
          this.onNodesChanged();
        }
        break;
    }
    this.onRequestSave();
  }

  redo() {
    if (!this.canRedo()) return;
    this.historyIndex++;
    const action = this.history[this.historyIndex];

    switch (action.type) {
      case 'create':
        if (action.nodeSnapshot) {
          this.nodes.set(action.nodeId, { ...action.nodeSnapshot });
          this.createNodeElement(this.nodes.get(action.nodeId)!);
          this.onNodesChanged();
        }
        break;
      case 'delete':
        this.deleteNode(action.nodeId, false);
        break;
      case 'move':
      case 'edit':
      case 'scale':
      case 'rotate':
        const node = this.nodes.get(action.nodeId);
        if (node && action.after) {
          Object.assign(node, action.after);
          this.updateNodeElement(action.nodeId);
          this.showHandles(this.selectedNodeId);
          this.onNodesChanged();
        }
        break;
    }
    this.onRequestSave();
  }
}
