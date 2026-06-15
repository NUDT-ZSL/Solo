import { useState, useEffect, useCallback, useRef } from 'react';
import { TreeNode } from '../Parser/treeNode';
import { parseMarkdown, treeToMarkdown, findNodeById, getDescendantIds } from '../Parser/indentParser';

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
    setTreeData(prevTree => {
      const newTree = deepCloneTree(prevTree);
      
      let sourceNode: TreeNode | null = null;
      let sourceParent: TreeNode | null = null;
      let targetNode: TreeNode | null = null;
      
      const findSource = (nodes: TreeNode[], parent: TreeNode | null): boolean => {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].id === sourceId) {
            sourceNode = nodes[i];
            sourceParent = parent;
            nodes.splice(i, 1);
            return true;
          }
          if (findSource(nodes[i].children, nodes[i])) {
            return true;
          }
        }
        return false;
      };
      
      const findTarget = (nodes: TreeNode[]): boolean => {
        for (const node of nodes) {
          if (node.id === targetId) {
            targetNode = node;
            return true;
          }
          if (findTarget(node.children)) {
            return true;
          }
        }
        return false;
      };
      
      const isDescendant = (node: TreeNode, targetId: string): boolean => {
        for (const child of node.children) {
          if (child.id === targetId) return true;
          if (isDescendant(child, targetId)) return true;
        }
        return false;
      };
      
      findSource(newTree, null);
      findTarget(newTree);
      
      if (!sourceNode || !targetNode) return prevTree;
      if (sourceNode.id === targetNode.id) return prevTree;
      if (isDescendant(sourceNode, targetId)) return prevTree;
      
      const newLevel = targetNode.level + 1;
      if (newLevel > 4) return prevTree;
      
      updateNodeLevel(sourceNode, newLevel);
      sourceNode.parentId = targetNode.id;
      targetNode.children.push(sourceNode);
      
      return newTree;
    });
    
    setMarkdownText(prev => {
      const tree = parseMarkdown(prev);
      
      let sourceNode: TreeNode | null = null;
      let sourceParentChildren: TreeNode[] | null = null;
      let targetNode: TreeNode | null = null;
      
      const findSource = (nodes: TreeNode[]): boolean => {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].id === sourceId) {
            sourceNode = nodes[i];
            sourceParentChildren = nodes;
            nodes.splice(i, 1);
            return true;
          }
          if (findSource(nodes[i].children)) {
            return true;
          }
        }
        return false;
      };
      
      const findTarget = (nodes: TreeNode[]): boolean => {
        for (const node of nodes) {
          if (node.id === targetId) {
            targetNode = node;
            return true;
          }
          if (findTarget(node.children)) {
            return true;
          }
        }
        return false;
      };
      
      const isDescendant = (node: TreeNode, tid: string): boolean => {
        for (const child of node.children) {
          if (child.id === tid) return true;
          if (isDescendant(child, tid)) return true;
        }
        return false;
      };
      
      findSource(tree);
      findTarget(tree);
      
      if (!sourceNode || !targetNode) return prev;
      if (sourceNode.id === targetNode.id) return prev;
      if (isDescendant(sourceNode, targetId)) return prev;
      
      const newLevel = targetNode.level + 1;
      if (newLevel > 4) return prev;
      
      updateNodeLevel(sourceNode, newLevel);
      sourceNode.parentId = targetNode.id;
      targetNode.children.push(sourceNode);
      
      return treeToMarkdown(tree);
    });
  }, []);

  const updateNodeLevel = (node: TreeNode, newLevel: number): void => {
    node.level = newLevel;
    for (const child of node.children) {
      updateNodeLevel(child, newLevel + 1);
    }
  };

  const deepCloneTree = (tree: TreeNode[]): TreeNode[] => {
    return tree.map(node => ({
      ...node,
      children: deepCloneTree(node.children),
    }));
  };

  const exportMarkdown = useCallback((): string => {
    return treeToMarkdown(treeData);
  }, [treeData]);

  const downloadMarkdown = useCallback(() => {
    const content = exportMarkdown();
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
  }, [exportMarkdown]);

  return {
    markdownText,
    treeData,
    collapsedNodes,
    updateMarkdown,
    toggleNodeCollapse,
    moveNode,
    exportMarkdown,
    downloadMarkdown,
  };
}
