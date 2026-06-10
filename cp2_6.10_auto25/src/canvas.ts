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

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    this.canvas.addEventListener('mousemove', this.onMouseMove);
    this.canvas.addEventListener('mouseup', this.onMouseUp);
    this.canvas.addEventListener('mouseleave', this.onMouseUp);
    this.canvas.addEventListener('dblclick', this.onDoubleClick);

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('keydown', this.onKeyDown);
  }

  private setupBroadcastListener(): void {
    this.broadcast.subscribe((msg: BroadcastMessage) => {
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
          if (msg.nodeId && msg.updates)