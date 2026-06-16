import { useState, useEffect, useCallback } from 'react';
import type { MindMapNode, Priority } from '../types';

const STORAGE_KEY = 'mindmap-scheduler-data';

function generateId(): string {
  return `node-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

function getDefaultDate(daysFromNow: number = 7): string {
  const date = new Date();
  date.setDate(date.getDate() + daysFromNow);
  return date.toISOString().split('T')[0];
}

function createDefaultNodes(): Record<string, MindMapNode> {
  const rootId = generateId();
  const child1Id = generateId();
  const child2Id = generateId();
  const child3Id = generateId();
  const grandChild1Id = generateId();

  const nodes: Record<string, MindMapNode> = {};

  nodes[rootId] = {
    id: rootId,
    title: '我的目标',
    priority: 'high',
    dueDate: getDefaultDate(30),
    notes: '这是我的主要目标',
    isMilestone: true,
    x: 400,
    y: 300,
    parentId: null,
    children: [child1Id, child2Id, child3Id],
    collapsed: false,
    progress: 35,
  };

  nodes[child1Id] = {
    id: child1Id,
    title: '完成项目开发',
    priority: 'high',
    dueDate: getDefaultDate(14),
    notes: '完成所有核心功能开发',
    isMilestone: false,
    x: 700,
    y: 150,
    parentId: rootId,
    children: [grandChild1Id],
    collapsed: false,
    progress: 60,
  };

  nodes[child2Id] = {
    id: child2Id,
    title: '学习新技术',
    priority: 'medium',
    dueDate: getDefaultDate(21),
    notes: '学习 D3.js 和高级 React 模式',
    isMilestone: false,
    x: 700,
    y: 300,
    parentId: rootId,
    children: [],
    collapsed: false,
    progress: 25,
  };

  nodes[child3Id] = {
    id: child3Id,
    title: '锻炼身体',
    priority: 'low',
    dueDate: getDefaultDate(7),
    notes: '每周至少锻炼3次',
    isMilestone: false,
    x: 700,
    y: 450,
    parentId: rootId,
    children: [],
    collapsed: false,
    progress: 80,
  };

  nodes[grandChild1Id] = {
    id: grandChild1Id,
    title: 'UI 设计稿评审',
    priority: 'medium',
    dueDate: getDefaultDate(5),
    notes: '与设计师一起评审 UI 设计稿',
    isMilestone: true,
    x: 1000,
    y: 100,
    parentId: child1Id,
    children: [],
    collapsed: false,
    progress: 50,
  };

  return nodes;
}

function loadFromStorage(): { nodes: Record<string, MindMapNode>; rootId: string } | null {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      return parsed;
    }
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
  }
  return null;
}

function saveToStorage(nodes: Record<string, MindMapNode>, rootId: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes, rootId }));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

export function useData() {
  const [nodes, setNodes] = useState<Record<string, MindMapNode>>({});
  const [rootId, setRootId] = useState<string>('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  useEffect(() => {
    const stored = loadFromStorage();
    if (stored && stored.nodes && stored.rootId) {
      setNodes(stored.nodes);
      setRootId(stored.rootId);
    } else {
      const defaultNodes = createDefaultNodes();
      const firstRootId = Object.keys(defaultNodes).find(
        (id) => defaultNodes[id].parentId === null
      ) || '';
      setNodes(defaultNodes);
      setRootId(firstRootId);
    }
  }, []);

  useEffect(() => {
    if (rootId && Object.keys(nodes).length > 0) {
      saveToStorage(nodes, rootId);
    }
  }, [nodes, rootId]);

  const addNode = useCallback(
    (parentId: string, position?: { x: number; y: number }) => {
      const parent = nodes[parentId];
      if (!parent) return null;

      const newId = generateId();
      const pos = position || {
        x: parent.x + 280,
        y: parent.y + parent.children.length * 100,
      };

      const newNode: MindMapNode = {
        id: newId,
        title: '新任务',
        priority: 'medium',
        dueDate: getDefaultDate(7),
        notes: '',
        isMilestone: false,
        x: pos.x,
        y: pos.y,
        parentId,
        children: [],
        collapsed: false,
        progress: 0,
      };

      setNodes((prev) => ({
        ...prev,
        [newId]: newNode,
        [parentId]: {
          ...prev[parentId],
          children: [...prev[parentId].children, newId],
          collapsed: false,
        },
      }));

      return newId;
    },
    [nodes]
  );

  const deleteNode = useCallback((nodeId: string) => {
    setNodes((prev) => {
      const node = prev[nodeId];
      if (!node) return prev;

      const newNodes = { ...prev };
      const toDelete = new Set<string>();

      function collectDelete(id: string) {
        toDelete.add(id);
        const n = newNodes[id];
        if (n) {
          n.children.forEach((childId) => collectDelete(childId));
        }
      }

      collectDelete(nodeId);

      if (node.parentId) {
        const parent = newNodes[node.parentId];
        if (parent) {
          newNodes[node.parentId] = {
            ...parent,
            children: parent.children.filter((id) => id !== nodeId),
          };
        }
      }

      toDelete.forEach((id) => {
        delete newNodes[id];
      });

      return newNodes;
    });

    setSelectedNodeId((prev) => (prev === nodeId ? null : prev));
  }, []);

  const updateNode = useCallback(
    (nodeId: string, updates: Partial<MindMapNode>) => {
      setNodes((prev) => {
        if (!prev[nodeId]) return prev;
        return {
          ...prev,
          [nodeId]: {
            ...prev[nodeId],
            ...updates,
          },
        };
      });
    },
    []
  );

  const moveNode = useCallback((nodeId: string, x: number, y: number) => {
    setNodes((prev) => {
      if (!prev[nodeId]) return prev;
      return {
        ...prev,
        [nodeId]: {
          ...prev[nodeId],
          x,
          y,
        },
      };
    });
  }, []);

  const toggleCollapse = useCallback((nodeId: string) => {
    setNodes((prev) => {
      if (!prev[nodeId]) return prev;
      return {
        ...prev,
        [nodeId]: {
          ...prev[nodeId],
          collapsed: !prev[nodeId].collapsed,
        },
      };
    });
  }, []);

  const getSelectedNode = useCallback(() => {
    return selectedNodeId ? nodes[selectedNodeId] : null;
  }, [selectedNodeId, nodes]);

  return {
    nodes,
    rootId,
    selectedNodeId,
    setSelectedNodeId,
    addNode,
    deleteNode,
    updateNode,
    moveNode,
    toggleCollapse,
    getSelectedNode,
  };
}
