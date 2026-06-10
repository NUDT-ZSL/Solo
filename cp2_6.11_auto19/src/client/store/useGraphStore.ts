/**
 * Zustand 全局状态管理
 * 管理图谱数据、选中状态、搜索、UI状态等
 */

import { create } from 'zustand';
import { GraphNode, GraphEdge, KnowledgeGraph } from '../../shared/types';

interface GraphState {
  // 图谱数据
  nodes: GraphNode[];
  edges: GraphEdge[];
  rootWord: string;
  currentGraphId: string | null;

  // 交互状态
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  searchQuery: string;
  highlightNodeIds: Set<string>;

  // UI状态
  isLoading: boolean;
  isSidebarOpen: boolean;
  isNoteModalOpen: boolean;
  isSaveDialogOpen: boolean;
  savedGraphs: KnowledgeGraph[];
  contextMenu: {
    visible: boolean;
    x: number;
    y: number;
    nodeId: string | null;
  };

  // 视图变换
  viewScale: number;
  viewOffsetX: number;
  viewOffsetY: number;

  // Actions
  setGraph: (nodes: GraphNode[], edges: GraphEdge[], rootWord: string) => void;
  addNodesAndEdges: (nodes: GraphNode[], edges: GraphEdge[]) => void;
  updateNode: (id: string, updates: Partial<GraphNode>) => void;
  setNodeExpanded: (id: string, expanded: boolean) => void;
  deleteNode: (id: string) => void;
  clearGraph: () => void;

  selectNode: (id: string | null) => void;
  setHoveredNode: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setHighlightNodes: (ids: Set<string>) => void;

  setLoading: (loading: boolean) => void;
  setSidebarOpen: (open: boolean) => void;
  setNoteModalOpen: (open: boolean) => void;
  setSaveDialogOpen: (open: boolean) => void;
  setSavedGraphs: (graphs: KnowledgeGraph[]) => void;
  setCurrentGraphId: (id: string | null) => void;

  showContextMenu: (x: number, y: number, nodeId: string) => void;
  hideContextMenu: () => void;

  setViewTransform: (scale: number, offsetX: number, offsetY: number) => void;

  // API调用封装
  generateGraph: (keyword: string) => Promise<void>;
  expandNode: (nodeId: string) => Promise<void>;
  saveCurrentGraph: (name: string) => Promise<string | null>;
  loadGraph: (id: string) => Promise<void>;
  deleteGraph: (id: string) => Promise<void>;
  fetchSavedGraphs: () => Promise<void>;
  updateNodeNote: (nodeId: string, note: string, tags: string[]) => Promise<void>;
}

export const useGraphStore = create<GraphState>((set, get) => ({
  nodes: [],
  edges: [],
  rootWord: '',
  currentGraphId: null,
  selectedNodeId: null,
  hoveredNodeId: null,
  searchQuery: '',
  highlightNodeIds: new Set(),
  isLoading: false,
  isSidebarOpen: true,
  isNoteModalOpen: false,
  isSaveDialogOpen: false,
  savedGraphs: [],
  contextMenu: { visible: false, x: 0, y: 0, nodeId: null },
  viewScale: 1,
  viewOffsetX: 0,
  viewOffsetY: 0,

  setGraph: (nodes, edges, rootWord) => set({
    nodes,
    edges,
    rootWord,
    selectedNodeId: null,
    highlightNodeIds: new Set(),
  }),

  addNodesAndEdges: (newNodes, newEdges) => set(state => ({
    nodes: [...state.nodes, ...newNodes],
    edges: [...state.edges, ...newEdges],
  })),

  updateNode: (id, updates) => set(state => ({
    nodes: state.nodes.map(n =>
      n.id === id ? { ...n, ...updates } : n
    ),
  })),

  setNodeExpanded: (id, expanded) => set(state => ({
    nodes: state.nodes.map(n =>
      n.id === id ? { ...n, expanded } : n
    ),
  })),

  deleteNode: (id) => set(state => {
    // 递归删除该节点及其所有子节点
    const idsToDelete = new Set<string>();
    const collectChildren = (parentId: string) => {
      state.nodes.forEach(n => {
        if (n.parentId === parentId) {
          idsToDelete.add(n.id);
          collectChildren(n.id);
        }
      });
    };
    idsToDelete.add(id);
    collectChildren(id);

    return {
      nodes: state.nodes.filter(n => !idsToDelete.has(n.id)),
      edges: state.edges.filter(e => !idsToDelete.has(e.sourceId) && !idsToDelete.has(e.targetId)),
      selectedNodeId: state.selectedNodeId === id ? null : state.selectedNodeId,
    };
  }),

  clearGraph: () => set({
    nodes: [],
    edges: [],
    rootWord: '',
    selectedNodeId: null,
    highlightNodeIds: new Set(),
    currentGraphId: null,
  }),

  selectNode: (id) => set({ selectedNodeId: id }),
  setHoveredNode: (id) => set({ hoveredNodeId: id }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setHighlightNodes: (ids) => set({ highlightNodeIds: ids }),

  setLoading: (loading) => set({ isLoading: loading }),
  setSidebarOpen: (open) => set({ isSidebarOpen: open }),
  setNoteModalOpen: (open) => set({ isNoteModalOpen: open }),
  setSaveDialogOpen: (open) => set({ isSaveDialogOpen: open }),
  setSavedGraphs: (graphs) => set({ savedGraphs: graphs }),
  setCurrentGraphId: (id) => set({ currentGraphId: id }),

  showContextMenu: (x, y, nodeId) => set({
    contextMenu: { visible: true, x, y, nodeId },
  }),

  hideContextMenu: () => set({
    contextMenu: { visible: false, x: 0, y: 0, nodeId: null },
  }),

  setViewTransform: (scale, offsetX, offsetY) => set({
    viewScale: scale,
    viewOffsetX: offsetX,
    viewOffsetY: offsetY,
  }),

  generateGraph: async (keyword: string) => {
    if (!keyword.trim()) return;
    set({ isLoading: true });

    try {
      const response = await fetch('/api/graph/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keyword: keyword.trim() }),
      });
      const data = await response.json();

      if (data.nodes && data.nodes.length > 0) {
        set({
          nodes: data.nodes,
          edges: data.edges,
          rootWord: keyword.trim(),
          selectedNodeId: null,
          currentGraphId: null,
        });
      }
    } catch (error) {
      console.error('生成图谱失败:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  expandNode: async (nodeId: string) => {
    const state = get();
    const node = state.nodes.find(n => n.id === nodeId);
    if (!node || node.expanded) return;

    set({ isLoading: true });

    try {
      const response = await fetch('/api/graph/expand', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId,
          word: node.word,
          parentX: node.x,
          parentY: node.y,
          parentLevel: node.level,
        }),
      });
      const data = await response.json();

      if (data.nodes && data.nodes.length > 0) {
        // 先标记父节点为已展开
        set(s => ({
          nodes: s.nodes.map(n =>
            n.id === nodeId ? { ...n, expanded: true } : n
          ),
        }));

        // 展开动画：逐步添加节点
        const duration = 800;
        const startTime = performance.now();

        const animate = () => {
          const elapsed = performance.now() - startTime;
          const progress = Math.min(1, elapsed / duration);

          // 弹性缓动
          const easeOutElastic = (t: number): number => {
            const c4 = (2 * Math.PI) / 3;
            return t === 0 ? 0 : t === 1 ? 1
              : Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
          };

          const eased = easeOutElastic(progress);

          // 更新新节点位置
          set(s => ({
            nodes: s.nodes.map(n => {
              const newNode = data.nodes.find((nn: GraphNode) => nn.id === n.id);
              if (newNode) {
                return {
                  ...n,
                  x: node.x + (newNode.targetX! - node.x) * eased,
                  y: node.y + (newNode.targetY! - node.y) * eased,
                };
              }
              return n;
            }),
            // 如果是第一帧，添加新节点和边
            ...(progress < 0.01 ? {
              nodes: [...s.nodes, ...data.nodes],
              edges: [...s.edges, ...data.edges],
            } : {}),
          }));

          if (progress < 1) {
            requestAnimationFrame(animate);
          }
        };

        requestAnimationFrame(animate);
      }
    } catch (error) {
      console.error('展开节点失败:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  saveCurrentGraph: async (name: string) => {
    const state = get();
    if (state.nodes.length === 0) return null;

    set({ isLoading: true });

    try {
      const url = state.currentGraphId
        ? `/api/graph/save/${state.currentGraphId}`
        : '/api/graph/save';
      const method = state.currentGraphId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          rootWord: state.rootWord,
          nodes: state.nodes,
          edges: state.edges,
        }),
      });
      const data = await response.json();

      if (data.success) {
        set({ currentGraphId: data.id });
        // 刷新列表
        await get().fetchSavedGraphs();
        return data.id;
      }
      return null;
    } catch (error) {
      console.error('保存图谱失败:', error);
      return null;
    } finally {
      set({ isLoading: false });
    }
  },

  loadGraph: async (id: string) => {
    set({ isLoading: true });

    try {
      const response = await fetch(`/api/graph/${id}`);
      const data = await response.json();

      if (data.nodes) {
        set({
          nodes: data.nodes,
          edges: data.edges,
          rootWord: data.rootWord,
          currentGraphId: data.id,
          selectedNodeId: null,
          highlightNodeIds: new Set(),
        });
      }
    } catch (error) {
      console.error('加载图谱失败:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  deleteGraph: async (id: string) => {
    try {
      await fetch(`/api/graph/${id}`, { method: 'DELETE' });
      await get().fetchSavedGraphs();
      if (get().currentGraphId === id) {
        get().clearGraph();
      }
    } catch (error) {
      console.error('删除图谱失败:', error);
    }
  },

  fetchSavedGraphs: async () => {
    try {
      const response = await fetch('/api/graph/saved');
      const data = await response.json();
      set({ savedGraphs: data || [] });
    } catch (error) {
      console.error('获取图谱列表失败:', error);
    }
  },

  updateNodeNote: async (nodeId: string, note: string, tags: string[]) => {
    // 先更新本地状态，实现乐观UI
    set(state => ({
      nodes: state.nodes.map(n =>
        n.id === nodeId ? { ...n, note, tags } : n
      ),
    }));

    try {
      await fetch(`/api/graph/node/${nodeId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note, tags }),
      });
    } catch (error) {
      console.error('更新节点笔记失败:', error);
    }
  },
}));
