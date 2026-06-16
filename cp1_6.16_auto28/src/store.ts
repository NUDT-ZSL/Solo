import { v4 as uuidv4 } from 'uuid';

export interface Tag {
  id: string;
  name: string;
  color: string;
}

export interface NodeData {
  id: string;
  title: string;
  content: string;
  x: number;
  y: number;
  tags: string[];
}

export interface Connection {
  id: string;
  from: string;
  to: string;
}

export const PRESET_TAGS: Tag[] = [
  { id: 'tag-inspiration', name: '灵感', color: '#FF6B6B' },
  { id: 'tag-todo', name: '待办', color: '#F4D03F' },
  { id: 'tag-resource', name: '资料', color: '#58D68D' },
  { id: 'tag-question', name: '问题', color: '#AF7AC5' },
];

const STORAGE_KEY = 'inspiration-notes-data';
const NODE_WIDTH = 200;
const NODE_HEIGHT = 100;
const H_GAP = 80;
const V_GAP = 40;

interface StoreState {
  nodes: NodeData[];
  connections: Connection[];
  selectedTag: string | null;
}

let state: StoreState = {
  nodes: [],
  connections: [],
  selectedTag: null,
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getState() {
  return state;
}

function setState(newState: Partial<StoreState>) {
  state = { ...state, ...newState };
  notify();
  scheduleSave();
}

let saveTimer: number | null = null;

function scheduleSave() {
  if (saveTimer) {
    clearTimeout(saveTimer);
  }
  setSaveStatus('saving');
  saveTimer = window.setTimeout(() => {
    saveToLocal();
    setSaveStatus('saved');
    setTimeout(() => setSaveStatus('idle'), 2000);
  }, 500) as unknown as number;
}

type SaveStatus = 'idle' | 'saving' | 'saved';
let saveStatus: SaveStatus = 'idle';
const saveStatusListeners = new Set<(status: SaveStatus) => void>();

export function subscribeSaveStatus(listener: (status: SaveStatus) => void) {
  saveStatusListeners.add(listener);
  return () => saveStatusListeners.delete(listener);
}

function setSaveStatus(status: SaveStatus) {
  saveStatus = status;
  saveStatusListeners.forEach((l) => l(status));
}

export function getSaveStatus() {
  return saveStatus;
}

function saveToLocal() {
  try {
    const data = {
      nodes: state.nodes,
      connections: state.connections,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('保存失败', e);
  }
}

export function loadFromLocal() {
  try {
    const dataStr = localStorage.getItem(STORAGE_KEY);
    if (dataStr) {
      const data = JSON.parse(dataStr);
      state = {
        nodes: data.nodes || [],
        connections: data.connections || [],
        selectedTag: null,
      };
      notify();
      return true;
    }
  } catch (e) {
    console.error('加载失败', e);
  }
  return false;
}

export function addNode(x: number, y: number): NodeData {
  const newNode: NodeData = {
    id: uuidv4(),
    title: '新卡片',
    content: '',
    x,
    y,
    tags: [],
  };
  setState({ nodes: [...state.nodes, newNode] });
  return newNode;
}

export function updateNode(id: string, updates: Partial<NodeData>) {
  const nodes = state.nodes.map((n) =>
    n.id === id ? { ...n, ...updates } : n
  );
  setState({ nodes });
}

export function deleteNode(id: string) {
  const nodes = state.nodes.filter((n) => n.id !== id);
  const connections = state.connections.filter(
    (c) => c.from !== id && c.to !== id
  );
  setState({ nodes, connections });
}

export function addConnection(from: string, to: string): Connection | null {
  if (from === to) return null;
  const exists = state.connections.some(
    (c) => (c.from === from && c.to === to) || (c.from === to && c.to === from)
  );
  if (exists) return null;

  const newConn: Connection = {
    id: uuidv4(),
    from,
    to,
  };
  const connections = [...state.connections, newConn];
  setState({ connections });

  requestAnimationFrame(() => {
    autoLayoutTree(from);
  });

  return newConn;
}

export function deleteConnection(id: string) {
  const connections = state.connections.filter((c) => c.id !== id);
  setState({ connections });
}

export function setSelectedTag(tagId: string | null) {
  setState({ selectedTag: tagId });
}

export function toggleNodeTag(nodeId: string, tagId: string) {
  const node = state.nodes.find((n) => n.id === nodeId);
  if (!node) return;

  const hasTag = node.tags.includes(tagId);
  const newTags = hasTag
    ? node.tags.filter((t) => t !== tagId)
    : [...node.tags, tagId];

  updateNode(nodeId, { tags: newTags });
}

function buildAdjacencyList(): Map<string, string[]> {
  const adj = new Map<string, string[]>();
  state.connections.forEach((conn) => {
    if (!adj.has(conn.from)) adj.set(conn.from, []);
    if (!adj.has(conn.to)) adj.set(conn.to, []);
    adj.get(conn.from)!.push(conn.to);
    adj.get(conn.to)!.push(conn.from);
  });
  return adj;
}

function getTreeNodeInfo(rootId: string): {
  depths: Map<string, number>;
  parents: Map<string, string | null>;
  order: string[];
} {
  const adj = buildAdjacencyList();
  const depths = new Map<string, number>();
  const parents = new Map<string, string | null>();
  const order: string[] = [];
  const visited = new Set<string>();

  const queue: string[] = [rootId];
  depths.set(rootId, 0);
  parents.set(rootId, null);
  visited.add(rootId);

  while (queue.length > 0) {
    const current = queue.shift()!;
    order.push(current);
    const neighbors = adj.get(current) || [];

    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        depths.set(neighbor, depths.get(current)! + 1);
        parents.set(neighbor, current);
        queue.push(neighbor);
      }
    }
  }

  return { depths, parents, order };
}

function getSubtreeLeafCount(
  nodeId: string,
  adj: Map<string, string[]>,
  parentId: string | null,
  leafCounts: Map<string, number>
): number {
  const children = (adj.get(nodeId) || []).filter((c) => c !== parentId);
  if (children.length === 0) {
    leafCounts.set(nodeId, 1);
    return 1;
  }

  let count = 0;
  for (const child of children) {
    count += getSubtreeLeafCount(child, adj, nodeId, leafCounts);
  }
  leafCounts.set(nodeId, Math.max(count, 1));
  return leafCounts.get(nodeId)!;
}

export function autoLayoutTree(rootId: string) {
  const adj = buildAdjacencyList();
  const rootNode = state.nodes.find((n) => n.id === rootId);
  if (!rootNode) return;

  const { depths, parents, order } = getTreeNodeInfo(rootId);

  const leafCounts = new Map<string, number>();
  getSubtreeLeafCount(rootId, adj, null, leafCounts);

  const positions = new Map<string, { x: number; y: number }>();

  const maxDepth = Math.max(...depths.values(), 0);
  const depthNodes = new Map<number, string[]>();
  depths.forEach((depth, id) => {
    if (!depthNodes.has(depth)) depthNodes.set(depth, []);
    depthNodes.get(depth)!.push(id);
  });

  const rootX = rootNode.x;
  const rootY = rootNode.y;

  function layoutSubtree(
    nodeId: string,
    parentId: string | null,
    baseY: number
  ): number {
    const children = (adj.get(nodeId) || []).filter((c) => c !== parentId);
    const depth = depths.get(nodeId) || 0;

    if (children.length === 0) {
      positions.set(nodeId, {
        x: rootX + depth * (NODE_WIDTH + H_GAP),
        y: baseY,
      });
      return baseY;
    }

    let currentY = baseY;
    const childPositions: { id: string; y: number }[] = [];

    for (const child of children) {
      const childLeafCount = leafCounts.get(child) || 1;
      const childCenterY = currentY + (childLeafCount - 1) * (NODE_HEIGHT + V_GAP) / 2;
      childPositions.push({ id: child, y: childCenterY });
      layoutSubtree(child, nodeId, currentY);
      currentY += childLeafCount * (NODE_HEIGHT + V_GAP);
    }

    const nodeY = baseY + ((leafCounts.get(nodeId) || 1) - 1) * (NODE_HEIGHT + V_GAP) / 2;
    positions.set(nodeId, {
      x: rootX + depth * (NODE_WIDTH + H_GAP),
      y: nodeY,
    });

    return baseY;
  }

  layoutSubtree(rootId, null, rootY);

  const newNodes = state.nodes.map((n) => {
    const pos = positions.get(n.id);
    if (pos) {
      return { ...n, x: pos.x, y: pos.y };
    }
    return n;
  });

  state = { ...state, nodes: newNodes };
  notify();
  scheduleSave();
}

export function exportToJson(): string {
  const data = {
    nodes: state.nodes,
    connections: state.connections,
    exportedAt: new Date().toISOString(),
  };
  return JSON.stringify(data, null, 2);
}

export function getNodeById(id: string): NodeData | undefined {
  return state.nodes.find((n) => n.id === id);
}

export { NODE_WIDTH, NODE_HEIGHT };
