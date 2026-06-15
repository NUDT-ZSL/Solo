import { useState, useEffect, useCallback, useRef } from 'react';
import type { Node, Edge, HistoryState, NodeColor } from '@/types';
import {
  STORAGE_KEY,
  MAX_HISTORY_STACK,
  NODE_DEFAULT_WIDTH,
  NODE_DEFAULT_HEIGHT,
} from '@/utils/constants';
import { generateId } from '@/utils/exportUtils';

export function useKnowledgeGraph() {
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [isSaved, setIsSaved] = useState(true);
  const [isLoading, setIsLoading] = useState(true);

  const historyStack = useRef<HistoryState[]>([]);
  const historyIndex = useRef(-1);
  const saveTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const data = JSON.parse(saved);
        setNodes(data.nodes || []);
        setEdges(data.edges || []);
      } catch {
        console.error('Failed to load saved data');
      }
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    document.title = isSaved ? '知识图谱 - 已保存' : '知识图谱 - *未保存';
  }, [isSaved]);

  const saveToStorage = useCallback(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(() => {
      const data = {
        nodes,
        edges,
        version: 1,
        lastModified: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setIsSaved(true);
    }, 300);
  }, [nodes, edges]);

  const pushHistory = useCallback(() => {
    const currentState: HistoryState = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };

    historyStack.current = historyStack.current.slice(0, historyIndex.current + 1);
    historyStack.current.push(currentState);

    if (historyStack.current.length > MAX_HISTORY_STACK) {
      historyStack.current.shift();
    } else {
      historyIndex.current++;
    }
  }, [nodes, edges]);

  const markUnsaved = useCallback(() => {
    setIsSaved(false);
    saveToStorage();
  }, [saveToStorage]);

  const addNode = useCallback(
    (x: number, y: number, isRoot = false): Node => {
      pushHistory();

      const newNode: Node = {
        id: generateId(),
        label: '新节点',
        description: '',
        color: 'blue',
        x,
        y,
        width: NODE_DEFAULT_WIDTH,
        height: NODE_DEFAULT_HEIGHT,
        isRoot,
      };

      setNodes((prev) => [...prev, newNode]);
      markUnsaved();

      return newNode;
    },
    [pushHistory, markUnsaved]
  );

  const updateNode = useCallback(
    (id: string, updates: Partial<Node>) => {
      pushHistory();
      setNodes((prev) =>
        prev.map((node) => (node.id === id ? { ...node, ...updates } : node))
      );
      markUnsaved();
    },
    [pushHistory, markUnsaved]
  );

  const updateNodePosition = useCallback(
    (id: string, x: number, y: number) => {
      setNodes((prev) =>
        prev.map((node) => (node.id === id ? { ...node, x, y } : node))
      );
      setIsSaved(false);
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = window.setTimeout(() => {
        const data = {
          nodes: nodes.map((n) => (n.id === id ? { ...n, x, y } : n)),
          edges,
          version: 1,
          lastModified: new Date().toISOString(),
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        setIsSaved(true);
      }, 300);
    },
    [nodes, edges]
  );

  const deleteNode = useCallback(
    (id: string) => {
      pushHistory();
      setNodes((prev) => prev.filter((node) => node.id !== id));
      setEdges((prev) =>
        prev.filter((edge) => edge.source !== id && edge.target !== id)
      );
      markUnsaved();
    },
    [pushHistory, markUnsaved]
  );

  const addEdge = useCallback(
    (source: string, target: string, label = '关联'): Edge => {
      pushHistory();

      const exists = edges.some(
        (e) => e.source === source && e.target === target
      );
      if (exists || source === target) {
        return {} as Edge;
      }

      const newEdge: Edge = {
        id: generateId(),
        source,
        target,
        label,
      };

      setEdges((prev) => [...prev, newEdge]);
      markUnsaved();

      return newEdge;
    },
    [edges, pushHistory, markUnsaved]
  );

  const updateEdge = useCallback(
    (id: string, updates: Partial<Edge>) => {
      pushHistory();
      setEdges((prev) =>
        prev.map((edge) => (edge.id === id ? { ...edge, ...updates } : edge))
      );
      markUnsaved();
    },
    [pushHistory, markUnsaved]
  );

  const deleteEdge = useCallback(
    (id: string) => {
      pushHistory();
      setEdges((prev) => prev.filter((edge) => edge.id !== id));
      markUnsaved();
    },
    [pushHistory, markUnsaved]
  );

  const changeNodeColor = useCallback(
    (id: string, color: NodeColor) => {
      pushHistory();
      setNodes((prev) =>
        prev.map((node) => (node.id === id ? { ...node, color } : node))
      );
      markUnsaved();
    },
    [pushHistory, markUnsaved]
  );

  const clearCanvas = useCallback(() => {
    pushHistory();
    setNodes([]);
    setEdges([]);
    markUnsaved();
  }, [pushHistory, markUnsaved]);

  const applyLayout = useCallback(
    (positions: { id: string; x: number; y: number }[]) => {
      pushHistory();
      const positionMap = new Map(positions.map((p) => [p.id, p]));
      setNodes((prev) =>
        prev.map((node) => {
          const pos = positionMap.get(node.id);
          return pos ? { ...node, x: pos.x, y: pos.y } : node;
        })
      );
      markUnsaved();
    },
    [pushHistory, markUnsaved]
  );

  const undo = useCallback(() => {
    if (historyIndex.current > 0) {
      historyIndex.current--;
      const state = historyStack.current[historyIndex.current];
      setNodes(state.nodes);
      setEdges(state.edges);
      markUnsaved();
    }
  }, [markUnsaved]);

  const redo = useCallback(() => {
    if (historyIndex.current < historyStack.current.length - 1) {
      historyIndex.current++;
      const state = historyStack.current[historyIndex.current];
      setNodes(state.nodes);
      setEdges(state.edges);
      markUnsaved();
    }
  }, [markUnsaved]);

  const canUndo = historyIndex.current > 0;
  const canRedo = historyIndex.current < historyStack.current.length - 1;

  return {
    nodes,
    edges,
    isSaved,
    isLoading,
    setNodes,
    setEdges,
    addNode,
    updateNode,
    updateNodePosition,
    deleteNode,
    addEdge,
    updateEdge,
    deleteEdge,
    changeNodeColor,
    clearCanvas,
    applyLayout,
    undo,
    redo,
    canUndo,
    canRedo,
    saveToStorage,
  };
}
