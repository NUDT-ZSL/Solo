import type { TreeNode } from '../types';

let nodeIdCounter = 0;

function genId(): string {
  nodeIdCounter += 1;
  return `node-${Date.now()}-${nodeIdCounter}`;
}

export function parseToTree(data: any, key: string = 'root'): TreeNode {
  if (data === null) {
    return { key, value: null, type: 'null', id: genId() };
  }

  if (Array.isArray(data)) {
    const children = data.map((item, index) => parseToTree(item, `[${index}]`));
    return { key, value: data, type: 'array', children, collapsed: false, id: genId() };
  }

  if (typeof data === 'object') {
    const children = Object.entries(data).map(([k, v]) => parseToTree(v, k));
    return { key, value: data, type: 'object', children, collapsed: false, id: genId() };
  }

  if (typeof data === 'string') {
    return { key, value: data, type: 'string', id: genId() };
  }

  if (typeof data === 'number') {
    return { key, value: data, type: 'number', id: genId() };
  }

  if (typeof data === 'boolean') {
    return { key, value: data, type: 'boolean', id: genId() };
  }

  return { key, value: String(data), type: 'string', id: genId() };
}

function treeToValue(node: TreeNode): any {
  switch (node.type) {
    case 'object': {
      const result: Record<string, any> = {};
      if (node.children) {
        for (const child of node.children) {
          result[child.key] = treeToValue(child);
        }
      }
      return result;
    }
    case 'array': {
      if (node.children) {
        return node.children.map((child) => treeToValue(child));
      }
      return [];
    }
    case 'null':
      return null;
    case 'boolean':
      return node.value === true || node.value === 'true';
    case 'number': {
      const num = Number(node.value);
      return isNaN(num) ? node.value : num;
    }
    case 'string':
    default:
      return node.value;
  }
}

export function rebuildFromTree(tree: TreeNode): any {
  return treeToValue(tree);
}

export function findNodeById(tree: TreeNode, id: string): TreeNode | null {
  if (tree.id === id) return tree;
  if (tree.children) {
    for (const child of tree.children) {
      const found = findNodeById(child, id);
      if (found) return found;
    }
  }
  return null;
}

export function updateNodeInTree(
  tree: TreeNode,
  id: string,
  newValue: any,
  newType?: TreeNode['type']
): TreeNode {
  if (tree.id === id) {
    const type = newType || tree.type;
    return { ...tree, value: newValue, type };
  }
  if (tree.children) {
    return {
      ...tree,
      children: tree.children.map((child) => updateNodeInTree(child, id, newValue, newType))
    };
  }
  return tree;
}

export function toggleCollapse(tree: TreeNode, id: string): TreeNode {
  if (tree.id === id) {
    return { ...tree, collapsed: !tree.collapsed };
  }
  if (tree.children) {
    return {
      ...tree,
      children: tree.children.map((child) => toggleCollapse(child, id))
    };
  }
  return tree;
}
