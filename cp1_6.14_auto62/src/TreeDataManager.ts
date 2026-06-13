export type SkillCategory = 'active' | 'passive' | 'ultimate' | 'support' | 'aura';

export type ConnectionType = 'prerequisite' | 'evolution';

export interface SkillNode {
  id: string;
  name: string;
  category: SkillCategory;
  icon: string;
  x: number;
  y: number;
  cost: number;
  cooldown: number;
  description: string;
  levelRequired: number;
}

export interface SkillConnection {
  id: string;
  sourceId: string;
  targetId: string;
  type: ConnectionType;
}

export interface SkillTreeData {
  nodes: SkillNode[];
  connections: SkillConnection[];
}

export const CATEGORY_COLORS: Record<SkillCategory, string> = {
  active: '#4fc3f7',
  passive: '#ff7043',
  ultimate: '#ffd54f',
  support: '#81c784',
  aura: '#ba68c8'
};

export const CATEGORY_LABELS: Record<SkillCategory, string> = {
  active: '主动技能',
  passive: '被动技能',
  ultimate: '终极技能',
  support: '辅助技能',
  aura: '光环技能'
};

export const CATEGORY_ICONS: Record<SkillCategory, string> = {
  active: '⚔️',
  passive: '🛡️',
  ultimate: '👑',
  support: '💚',
  aura: '✨'
};

const generateId = (): string => Math.random().toString(36).substring(2, 11);

export class TreeDataManager {
  private nodes: Map<string, SkillNode> = new Map();
  private connections: Map<string, SkillConnection> = new Map();
  private listeners: Set<() => void> = new Set();

  constructor(initialData?: SkillTreeData) {
    if (initialData) {
      this.loadData(initialData);
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach(l => l());
  }

  getNodes(): SkillNode[] {
    return Array.from(this.nodes.values());
  }

  getNode(id: string): SkillNode | undefined {
    return this.nodes.get(id);
  }

  getConnections(): SkillConnection[] {
    return Array.from(this.connections.values());
  }

  getConnection(id: string): SkillConnection | undefined {
    return this.connections.get(id);
  }

  getData(): SkillTreeData {
    return {
      nodes: this.getNodes(),
      connections: this.getConnections()
    };
  }

  addNode(template: Partial<SkillNode> & { category: SkillCategory; x: number; y: number }): SkillNode {
    const defaults: Omit<SkillNode, 'id' | 'category' | 'x' | 'y'> = {
      name: CATEGORY_LABELS[template.category],
      icon: CATEGORY_ICONS[template.category],
      cost: 1,
      cooldown: 0,
      description: '',
      levelRequired: 1
    };

    const node: SkillNode = {
      ...defaults,
      ...template,
      id: generateId()
    };

    this.nodes.set(node.id, node);
    this.notify();
    return node;
  }

  updateNode(id: string, updates: Partial<SkillNode>): SkillNode | undefined {
    const node = this.nodes.get(id);
    if (!node) return undefined;

    const updated = { ...node, ...updates };
    this.nodes.set(id, updated);
    this.notify();
    return updated;
  }

  removeNode(id: string): boolean {
    if (!this.nodes.has(id)) return false;

    this.nodes.delete(id);
    const connectionsToRemove = this.getConnections()
      .filter(c => c.sourceId === id || c.targetId === id)
      .map(c => c.id);
    connectionsToRemove.forEach(cid => this.connections.delete(cid));

    this.notify();
    return true;
  }

  addConnection(sourceId: string, targetId: string, type: ConnectionType = 'prerequisite'): SkillConnection | null {
    if (sourceId === targetId) return null;
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) return null;

    const exists = this.getConnections().some(
      c => (c.sourceId === sourceId && c.targetId === targetId) ||
           (c.sourceId === targetId && c.targetId === sourceId)
    );
    if (exists) return null;

    const connection: SkillConnection = {
      id: generateId(),
      sourceId,
      targetId,
      type
    };

    this.connections.set(connection.id, connection);
    this.notify();
    return connection;
  }

  updateConnection(id: string, updates: Partial<SkillConnection>): SkillConnection | undefined {
    const conn = this.connections.get(id);
    if (!conn) return undefined;

    const updated = { ...conn, ...updates };
    this.connections.set(id, updated);
    this.notify();
    return updated;
  }

  removeConnection(id: string): boolean {
    const result = this.connections.delete(id);
    if (result) this.notify();
    return result;
  }

  removeConnectionBetween(sourceId: string, targetId: string): boolean {
    const conn = this.getConnections().find(
      c => (c.sourceId === sourceId && c.targetId === targetId) ||
           (c.sourceId === targetId && c.targetId === sourceId)
    );
    return conn ? this.removeConnection(conn.id) : false;
  }

  getNodePrerequisites(nodeId: string): SkillNode[] {
    return this.getConnections()
      .filter(c => c.targetId === nodeId && c.type === 'prerequisite')
      .map(c => this.nodes.get(c.sourceId))
      .filter((n): n is SkillNode => !!n);
  }

  exportJSON(): string {
    return JSON.stringify(this.getData(), null, 2);
  }

  importJSON(json: string): SkillTreeData {
    const data = JSON.parse(json) as SkillTreeData;
    this.loadData(data);
    return data;
  }

  private loadData(data: SkillTreeData): void {
    this.nodes.clear();
    this.connections.clear();
    data.nodes.forEach(n => this.nodes.set(n.id, n));
    data.connections.forEach(c => this.connections.set(c.id, c));
    this.notify();
  }

  clear(): void {
    this.nodes.clear();
    this.connections.clear();
    this.notify();
  }
}
