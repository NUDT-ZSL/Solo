import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface NodeStyle {
  radius: number;
  bgColor: string;
  textColor: string;
  bold: boolean;
  colorMark: string | null;
}

export interface MindMapNode {
  id: string;
  text: string;
  x: number;
  y: number;
  parentId: string | null;
  style: NodeStyle;
  createdBy: string;
  updatedAt: number;
}

export interface NoteData {
  id: string;
  nodeId: string;
  title: string;
  content: string;
  versions: NoteVersion[];
  updatedAt: number;
}

export interface NoteVersion {
  id: string;
  noteId: string;
  content: string;
  createdAt: number;
}

export interface SearchResult {
  nodes: MindMapNode[];
  notes: NoteData[];
}

interface MindMapState {
  nodes: MindMapNode[];
  selectedNodeIds: string[];
  selectedNodeId: string | null;
  noteData: NoteData | null;
  searchQuery: string;
  searchResults: SearchResult | null;
  highlightedNodeIds: string[];
  ws: WebSocket | null;
  userId: string;
  remoteEdits: Map<string, { userId: string; color: string; timestamp: number }>;

  loadNodes: () => Promise<void>;
  connectWebSocket: () => void;
  createNode: (parent: MindMapNode | null, x: number, y: number) => void;
  updateNode: (node: Partial<MindMapNode> & { id: string }) => void;
  moveNode: (id: string, x: number, y: number) => void;
  deleteNode: (id: string) => void;
  selectNode: (id: string | null, multi?: boolean) => void;
  loadNote: (nodeId: string) => Promise<void>;
  saveNote: (nodeId: string, title: string, content: string) => Promise<void>;
  restoreVersion: (nodeId: string, versionId: string) => Promise<void>;
  search: (query: string) => Promise<void>;
  setHighlightedNodeIds: (ids: string[]) => void;
  alignNodes: (alignment: 'left' | 'right' | 'center') => void;
}

const PRESET_COLORS = ['#e91e63', '#2196f3', '#4caf50', '#ff9800', '#9c27b0'];
const USER_COLORS = ['#e91e63', '#9c27b0', '#3f51b5', '#009688', '#ff5722', '#795548'];

export const useMindMapStore = create<MindMapState>((set, get) => ({
  nodes: [],
  selectedNodeIds: [],
  selectedNodeId: null,
  noteData: null,
  searchQuery: '',
  searchResults: null,
  highlightedNodeIds: [],
  ws: null,
  userId: uuidv4(),
  remoteEdits: new Map(),

  loadNodes: async () => {
    try {
      const res = await fetch('/api/mindmap');
      const nodes = await res.json();
      set({ nodes: nodes.map((n: any) => ({ ...n, style: typeof n.style === 'string' ? JSON.parse(n.style) : n.style })) });
    } catch (err) {
      console.error('Failed to load nodes:', err);
    }
  },

  connectWebSocket: () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}/ws`);

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: 'sync:request', payload: {}, userId: get().userId, timestamp: Date.now() }));
    };

    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      const { type, payload, userId } = msg;
      if (userId === get().userId) return;

      const editColor = USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];

      switch (type) {
        case 'node:created':
        case 'sync:response':
          if (type === 'sync:response') {
            set({ nodes: payload.map((n: any) => ({ ...n, style: typeof n.style === 'string' ? JSON.parse(n.style) : n.style })) });
          } else {
            const newNode = { ...payload, style: typeof payload.style === 'string' ? JSON.parse(payload.style) : payload.style };
            set({ nodes: [...get().nodes, newNode] });
          }
          break;
        case 'node:updated': {
          const nodes = get().nodes.map(n => n.id === payload.id ? { ...n, ...payload, style: typeof payload.style === 'string' ? JSON.parse(payload.style) : payload.style } : n);
          const edits = new Map(get().remoteEdits);
          edits.set(payload.id, { userId, color: editColor, timestamp: Date.now() });
          set({ nodes, remoteEdits: edits });
          break;
        }
        case 'node:moved': {
          const nodes = get().nodes.map(n => n.id === payload.id ? { ...n, x: payload.x, y: payload.y, updatedAt: payload.updatedAt } : n);
          const edits = new Map(get().remoteEdits);
          edits.set(payload.id, { userId, color: editColor, timestamp: Date.now() });
          set({ nodes, remoteEdits: edits });
          break;
        }
        case 'node:deleted': {
          const nodes = get().nodes.filter(n => n.id !== payload.id).map(n => n.parentId === payload.id ? { ...n, parentId: null } : n);
          set({ nodes });
          break;
        }
      }
    };

    ws.onclose = () => {
      setTimeout(() => get().connectWebSocket(), 3000);
    };

    set({ ws });
  },

  createNode: (parent, x, y) => {
    const id = uuidv4();
    const isRoot = parent === null;
    const node: MindMapNode = {
      id,
      text: '',
      x,
      y,
      parentId: parent?.id || null,
      style: {
        radius: isRoot ? 40 : 30,
        bgColor: isRoot ? '#4caf50' : '#ff9800',
        textColor: '#ffffff',
        bold: false,
        colorMark: null,
      },
      createdBy: get().userId,
      updatedAt: Date.now(),
    };

    set({ nodes: [...get().nodes, node] });
    const ws = get().ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'node:create', payload: node, userId: get().userId, timestamp: Date.now() }));
    }
  },

  updateNode: (partial) => {
    const nodes = get().nodes.map(n => n.id === partial.id ? { ...n, ...partial, updatedAt: Date.now() } : n);
    set({ nodes });
    const node = nodes.find(n => n.id === partial.id);
    if (node) {
      const ws = get().ws;
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'node:update', payload: node, userId: get().userId, timestamp: Date.now() }));
      }
    }
  },

  moveNode: (id, x, y) => {
    const nodes = get().nodes.map(n => n.id === id ? { ...n, x, y, updatedAt: Date.now() } : n);
    set({ nodes });
    const ws = get().ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'node:move', payload: { id, x, y }, userId: get().userId, timestamp: Date.now() }));
    }
  },

  deleteNode: (id) => {
    const nodes = get().nodes.filter(n => n.id !== id).map(n => n.parentId === id ? { ...n, parentId: null } : n);
    set({ nodes, selectedNodeId: null, selectedNodeIds: get().selectedNodeIds.filter(sid => sid !== id) });
    const ws = get().ws;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: 'node:delete', payload: { id }, userId: get().userId, timestamp: Date.now() }));
    }
  },

  selectNode: (id, multi = false) => {
    if (multi && id) {
      const ids = get().selectedNodeIds;
      set({ selectedNodeIds: ids.includes(id) ? ids.filter(i => i !== id) : [...ids, id], selectedNodeId: id });
    } else {
      set({ selectedNodeId: id, selectedNodeIds: id ? [id] : [] });
    }
    if (id) get().loadNote(id);
  },

  loadNote: async (nodeId) => {
    try {
      const res = await fetch(`/api/notes/${nodeId}`);
      const data = await res.json();
      set({ noteData: data });
    } catch (err) {
      set({ noteData: null });
    }
  },

  saveNote: async (nodeId, title, content) => {
    try {
      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, title, content }),
      });
      const data = await res.json();
      set({ noteData: data });
    } catch (err) {
      console.error('Failed to save note:', err);
    }
  },

  restoreVersion: async (nodeId, versionId) => {
    try {
      const res = await fetch(`/api/notes/${nodeId}/restore/${versionId}`, { method: 'POST' });
      const data = await res.json();
      set({ noteData: data });
    } catch (err) {
      console.error('Failed to restore version:', err);
    }
  },

  search: async (query) => {
    set({ searchQuery: query });
    if (!query.trim()) {
      set({ searchResults: null, highlightedNodeIds: [] });
      return;
    }
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      const highlightedIds = [...(data.nodes || []).map((n: any) => n.id)];
      set({ searchResults: data, highlightedNodeIds: highlightedIds });
    } catch (err) {
      console.error('Search failed:', err);
    }
  },

  setHighlightedNodeIds: (ids) => set({ highlightedNodeIds: ids }),

  alignNodes: (alignment) => {
    const { nodes, selectedNodeIds } = get();
    if (selectedNodeIds.length < 2) return;
    const selected = nodes.filter(n => selectedNodeIds.includes(n.id));

    switch (alignment) {
      case 'left': {
        const minX = Math.min(...selected.map(n => n.x));
        selected.forEach(n => get().moveNode(n.id, minX, n.y));
        break;
      }
      case 'right': {
        const maxX = Math.max(...selected.map(n => n.x));
        selected.forEach(n => get().moveNode(n.id, maxX, n.y));
        break;
      }
      case 'center': {
        const avgX = selected.reduce((s, n) => s + n.x, 0) / selected.length;
        selected.forEach(n => get().moveNode(n.id, avgX, n.y));
        break;
      }
    }
  },
}));
