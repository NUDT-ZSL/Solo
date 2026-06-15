import { useState, useEffect, useCallback, useRef } from 'react';
import { TreeNode } from '../Parser/treeNode';
import { parseMarkdown, treeToMarkdown } from '../Parser/indentParser';

const DEFAULT_MARKDOWN = `# 项目规划
## 需求分析
### 用户调研
### 竞品分析
### 需求文档
## 设计阶段
### UI设计
### 交互设计
### 原型制作
## 开发阶段
### 前端开发
#### 页面开发
#### 组件开发
### 后端开发
#### 接口开发
#### 数据库设计
## 测试阶段
### 单元测试
### 集成测试
### 验收测试
## 上线部署
### 发布准备
### 正式上线
### 运维监控`;

interface NodeInfo {
  node: TreeNode;
  parentId: string | null;
  parentChildrenRef: TreeNode[] | null;
}

function findNodeInfo(tree: TreeNode[], id: string, parent: TreeNode | null, parentChildren: TreeNode[] | null): NodeInfo | null {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].id === id) {
      return {
        node: tree[i],
        parentId: parent ? parent.id : null,
        parentChildrenRef: tree,
      };
    }
    const found = findNodeInfo(tree[i].children, id, tree[i], tree[i].children);
    if (found) return found;
  }
  return null;
}

function isDescendantOf(node: TreeNode, targetId: string): boolean {
  for (const child of node.children) {
    if (child.id === targetId) return true;
    if (isDescendantOf(child, targetId)) return true;
  }
  return false;
}

function removeNodeFromTree(tree: TreeNode[], nodeId: string): TreeNode | null {
  for (let i = 0; i < tree.length; i++) {
    if (tree[i].id === nodeId) {
      const removed = tree[i];
      tree.splice(i, 1);
      return removed;
    }
    const removed = removeNodeFromTree(tree[i].children, nodeId);
    if (removed) return removed;
  }
  return null;
}

function updateLevelsRecursive(node: TreeNode, newLevel: number, newParentId: string | null): void {
  node.level = newLevel;
  node.parentId = newParentId;
  for (const child of node.children) {
    updateLevelsRecursive(child, newLevel + 1, node.id);
  }
}

function deepCloneTree(tree: TreeNode[]): TreeNode[] {
  return tree.map(node => ({
    ...node,
    children: deepCloneTree(node.children),
  }));
}

export function useGraphData() {
  const [markdownText, setMarkdownText] = useState<string>(DEFAULT_MARKDOWN);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const tree = parseMarkdown(DEFAULT_MARKDOWN);
    setTreeData(tree);
  }, []);

  const updateMarkdown = useCallback((text: string) => {
    setMarkdownText(text);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      const tree = parseMarkdown(text);
      setTreeData(tree);
      setCollapsedNodes(new Set());
    }, 500);
  }, []);

  const toggleNodeCollapse = useCallback((nodeId: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
        return next;
    });
  }, []);

  const moveNode = useCallback((sourceId: string, targetId: string) => {
    if (sourceId === targetId) return;

    setTreeData(prevTree => {
      const newTree = deepCloneTree(prevTree);
      const sourceNode = removeNodeFromTree(newTree, sourceId);

      if (!sourceNode) return prevTree;
      if (isDescendantOf(sourceNode, targetId)) return prevTree;

      const targetInfo = findNodeInfo(newTree, targetId, null, null);
      if (!targetInfo) return prevTree;

      const newLevel = targetInfo.node.level + 1;
      if (newLevel > 4) return prevTree;

      updateLevelsRecursive(sourceNode, newLevel, targetId);
      targetInfo.node.children.push(sourceNode);
      return newTree;
    });

    setMarkdownText(prev => {
      const tree = parseMarkdown(prev);
      const sourceNode = removeNodeFromTree(tree, sourceId);

      if (!sourceNode) return prev;
      if (isDescendantOf(sourceNode, targetId)) return prev;

      const targetInfo = findNodeInfo(tree, targetId, null, null);
      if (!targetInfo) return prev;

      const newLevel = targetInfo.node.level + 1;
      if (newLevel > 4) return prev;

      updateLevelsRecursive(sourceNode, newLevel, targetId);
      targetInfo.node.children.push(sourceNode);
      return treeToMarkdown(tree);
    });
  }, []);

  const downloadMarkdown = useCallback(() => {
    const content = treeToMarkdown(treeData);
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const fileName = `mindmap-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}-${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}.md`;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [treeData]);

  return {
    markdownText,
    treeData,
    collapsedNodes,
    updateMarkdown,
    toggleNodeCollapse,
    moveNode,
    downloadMarkdown,
  };
}
