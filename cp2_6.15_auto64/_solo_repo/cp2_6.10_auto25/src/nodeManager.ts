export type Priority = 'high' | 'medium' | 'low' | null;

export interface MindMapNode {
  id: string;
  parentId: string | null;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  bgColor: string;
  textColor: string;
  borderWidth: number;
  priority: Priority;
  createdAt: number;
  updatedAt: number;
}

export type ActionType =
  | 'add'
  | 'delete'
  | 'update'
  | 'move'
  | 'clear'
  | 'batch';

export interface HistoryAction {
  type: ActionType;
  nodes: MindMapNode[];
  previousNodes: MindMapNode[];
  timestamp: number;
}

const COLOR_PALETTE = [
  '#ffffff', '#f8f9fa', '#e8f4fd', '#e6f7e6', '#fff4e6',
  '#fde6e6', '#f3e5f5', '#fff8e1', '#e0f2f1', '#ffebee'
];

const TEXT_COLORS = [
  '#333333', '#ffffff', '#4285f4', '#34a853', '#ea4335',
  '#fbbc04', '#9334e6', '#ff6d00', '#00acc1', '#607d8b'
];

export class NodeManager {
  private nodes: Map<string, MindMapNode> = new Map();
  private historyStack: HistoryAction[] = [];
  private redoStack: HistoryAction[] = [];
  private readonly MAX_HISTORY = 50;
  private listeners: Set<() => void> = new Set();

  getDefaultBgColor(): string {
    return COLOR_PALETTE[0];
  }

  getDefaultTextColor(): string {
    return TEXT_COLORS[0];
  }

  getColorPalette(): string[] {
    return [...COLOR_PALETTE];
  }

  getTextColors(): string[] {
    return [...TEXT_COLORS];
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(l => l());
  }

  generateId(): string {
    return `node_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  getNodes(): MindMapNode[] {
    return Array.from(this.nodes.values());
  }

  getNode(id: string): MindMapNode | undefined {
    return this.nodes.get(id);
  }

  measureTextWidth(text: string, fontSize: number = 14): number {
    return Math.max(text.length * fontSize * 0.6 + 32, 100);
  }

  addNode(
    x: number,
    y: number,
    text: string = '新节点',
    parentId: string | null = null,
    options?: Partial<MindMapNode>
  ): MindMapNode {
    const id = this.generateId();
    const width = this.measureTextWidth(text);
    const height = 48;

    const node: MindMapNode = {
      id,
      parentId,
      text,
      x,
      y,
      width,
      height,
      bgColor: options?.bgColor ?? this.getDefaultBgColor(),
      textColor: options?.textColor ?? this.getDefaultTextColor(),
      borderWidth: options?.borderWidth ?? 2,
      priority: options?.priority ?? null,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    const previousNodes = this.snapshotNodes();
    this.nodes.set(id, node);

    this.pushHistory({
      type: 'add',
      nodes: [{ ...node }],
      previousNodes,
      timestamp: Date.now()
    });

    this.notify();
    return node;
  }

  addNodeWithoutHistory(
    x: number,
    y: number,
    text: string = '新节点',
    parentId: string | null = null,
    options?: Partial<MindMapNode>
  ): MindMapNode {
    const id = options?.id ?? this.generateId();
    const width = this.measureTextWidth(text);
    const height = 48;

    const node: MindMapNode = {
      id,
      parentId,
      text,
      x,
      y,
      width,
      height,
      bgColor: options?.bgColor ?? this.getDefaultBgColor(),
      textColor: options?.textColor ?? this.getDefaultTextColor(),
      borderWidth: options?.borderWidth ?? 2,
      priority: options?.priority ?? null,
      createdAt: options?.createdAt ?? Date.now(),
      updatedAt: Date.now()
    };

    this.nodes.set(id, node);
    this.notify();
    return node;
  }

  deleteNode(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;

    const previousNodes = this.snapshotNodes();
    const deletedNodes: MindMapNode[] = [];

    const deleteRecursive = (nodeId: string): void => {
      const n = this.nodes.get(nodeId);
      if (n) {
        deletedNodes.push({ ...n });
        this.nodes.delete(nodeId);
      }
      this.getChildren(nodeId).forEach(child => deleteRecursive(child.id));
    };

    deleteRecursive(id);

    this.pushHistory({
      type: 'delete',
      nodes: deletedNodes,
      previousNodes,
      timestamp: Date.now()
    });

    this.notify();
    return true;
  }

  deleteNodeWithoutHistory(id: string): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;

    const deleteRecursive = (nodeId: string): void => {
      this.nodes.delete(nodeId);
      this.getChildren(nodeId).forEach(child => deleteRecursive(child.id));
    };

    deleteRecursive(id);
    this.notify();
    return true;
  }

  updateNode(id: string, updates: Partial<MindMapNode>, recordHistory: boolean = true): MindMapNode | null {
    const node = this.nodes.get(id);
    if (!node) return null;

    const previousNode = { ...node };
    const previousNodes = this.snapshotNodes();

    Object.assign(node, updates, { updatedAt: Date.now() });

    if (updates.text !== undefined) {
      node.width = this.measureTextWidth(updates.text);
    }

    if (recordHistory) {
      this.pushHistory({
        type: 'update',
        nodes: [{ ...node }],
        previousNodes,
        timestamp: Date.now()
      });
    }

    this.notify();
    return node;
  }

  moveNode(id: string, x: number, y: number, recordHistory: boolean = true): boolean {
    const node = this.nodes.get(id);
    if (!node) return false;

    const previousNodes = this.snapshotNodes();
    node.x = x;
    node.y = y;
    node.updatedAt = Date.now();

    if (recordHistory) {
      this.pushHistory({
        type: 'move',
        nodes: [{ ...node }],
        previousNodes,
        timestamp: Date.now()
      });
    }

    this.notify();
    return true;
  }

  getChildren(parentId: string | null): MindMapNode[] {
    return Array.from(this.nodes.values()).filter(n => n.parentId === parentId);
  }

  clear(): void {
    if (this.nodes.size === 0) return;

    const previousNodes = this.snapshotNodes();
    const clearedNodes = this.snapshotNodes();
    this.nodes.clear();

    this.pushHistory({
      type: 'clear',
      nodes: clearedNodes,
      previousNodes,
      timestamp: Date.now()
    });

    this.notify();
  }

  clearWithoutHistory(): void {
    this.nodes.clear();
    this.notify();
  }

  private snapshotNodes(): MindMapNode[] {
    return Array.from(this.nodes.values()).map(n => ({ ...n }));
  }

  restoreFromSnapshot(snapshot: MindMapNode[]): void {
    this.nodes.clear();
    snapshot.forEach(n => this.nodes.set(n.id, { ...n }));
    this.notify();
  }

  private pushHistory(action: HistoryAction): void {
    this.historyStack.push(action);
    if (this.historyStack.length > this.MAX_HISTORY) {
      this.historyStack.shift();
    }
    this.redoStack = [];
  }

  canUndo(): boolean {
    return this.historyStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  undo(): HistoryAction | null {
    const action = this.historyStack.pop();
    if (!action) return null;

    this.redoStack.push(action);
    this.restoreFromSnapshot(action.previousNodes);
    return action;
  }

  redo(): HistoryAction | null {
    const action = this.redoStack.pop();
    if (!action) return null;

    this.historyStack.push(action);

    switch (action.type) {
      case 'add':
        action.nodes.forEach(n => {
          this.nodes.set(n.id, { ...n });
        });
        break;
      case 'delete':
      case 'clear':
        action.nodes.forEach(n => this.nodes.delete(n.id));
        break;
      case 'update':
      case 'move':
        action.nodes.forEach(n => {
          this.nodes.set(n.id, { ...n });
        });
        break;
    }

    this.notify();
    return action;
  }

  getHistoryStack(): HistoryAction[] {
    return [...this.historyStack];
  }
}
