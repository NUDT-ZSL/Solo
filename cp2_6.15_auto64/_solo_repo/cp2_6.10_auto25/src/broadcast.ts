import type { MindMapNode, ActionType } from './nodeManager';

export type BroadcastActionType = ActionType | 'sync-request' | 'sync-response';

export interface BroadcastMessage {
  type: BroadcastActionType;
  senderId: string;
  timestamp: number;
  nodes?: MindMapNode[];
  nodeId?: string;
  updates?: Partial<MindMapNode>;
  x?: number;
  y?: number;
}

export class BroadcastManager {
  private channel: BroadcastChannel | null = null;
  private clientId: string;
  private listeners: Set<(msg: BroadcastMessage) => void> = new Set();
  private isReady: boolean = false;

  constructor(channelName: string = 'mindmap-collab') {
    this.clientId = `client_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

    try {
      this.channel = new BroadcastChannel(channelName);
      this.channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
        this.handleMessage(event.data);
      };
      this.isReady = true;
    } catch (e) {
      console.warn('BroadcastChannel not supported, collaboration disabled');
      this.isReady = false;
    }
  }

  getClientId(): string {
    return this.clientId;
  }

  isAvailable(): boolean {
    return this.isReady && this.channel !== null;
  }

  subscribe(listener: (msg: BroadcastMessage) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private handleMessage(msg: BroadcastMessage): void {
    if (msg.senderId === this.clientId) return;
    this.listeners.forEach(l => l(msg));
  }

  private send(msg: Omit<BroadcastMessage, 'senderId' | 'timestamp'>): void {
    if (!this.channel || !this.isReady) return;

    const fullMsg: BroadcastMessage = {
      ...msg,
      senderId: this.clientId,
      timestamp: Date.now()
    };

    try {
      this.channel.postMessage(fullMsg);
    } catch (e) {
      console.error('Failed to broadcast message:', e);
    }
  }

  broadcastAdd(node: MindMapNode): void {
    this.send({
      type: 'add',
      nodes: [{ ...node }]
    });
  }

  broadcastDelete(nodeId: string): void {
    this.send({
      type: 'delete',
      nodeId
    });
  }

  broadcastUpdate(nodeId: string, updates: Partial<MindMapNode>): void {
    this.send({
      type: 'update',
      nodeId,
      updates: { ...updates }
    });
  }

  broadcastMove(nodeId: string, x: number, y: number): void {
    this.send({
      type: 'move',
      nodeId,
      x,
      y
    });
  }

  broadcastClear(): void {
    this.send({
      type: 'clear'
    });
  }

  requestSync(): void {
    this.send({
      type: 'sync-request'
    });
  }

  respondSync(nodes: MindMapNode[]): void {
    this.send({
      type: 'sync-response',
      nodes: nodes.map(n => ({ ...n }))
    });
  }

  close(): void {
    if (this.channel) {
      this.channel.close();
      this.channel = null;
      this.isReady = false;
    }
  }
}
