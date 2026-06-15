import { TreeNode } from './treeNode';

let idCounter = 0;

function generateId(): string {
  idCounter += 1;
  return `node-${idCounter}-${Date.now()}`;
}

export function parseMarkdown(text: string): TreeNode[] {
  idCounter = 0;
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  if (lines.length === 0) {
    return [];
  }

  const roots: TreeNode[] = [];
  const stack: { node: TreeNode; level: number }[] = [];

  for (const line of lines) {
    const trimmedLine = line.trimStart();
    const level = getLevel(trimmedLine, line);
    
    if (level < 1) continue;
    
    const text = extractText(trimmedLine, level);
    const node: TreeNode = {
      id: generateId(),
      text,
      level,
      parentId: null,
      children: [],
      collapsed: false,
    };

    while (stack.length > 0 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    if (stack.length === 0) {
      roots.push(node);
    } else {
      const parent = stack[stack.length - 1].node;
      node.parentId = parent.id;
      parent.children.push(node);
    }

    stack.push({ node, level });
  }

  return roots;
}

function getLevel(trimmedLine: string, originalLine: string): number {
  const hashMatch = trimmedLine.match(/^(#{1,4})\s+/);
  if (hashMatch) {
    return hashMatch[1].length;
  }

  const indentSpaces = originalLine.length - trimmedLine.length;
  if (indentSpaces > 0) {
    const level = Math.floor(indentSpaces / 2) + 1;
    return Math.min(level, 4);
  }

  if (trimmedLine.length > 0) {
    return 1;
  }

  return 0;
}

function extractText(line: string, level: number): string {
  const hashMatch = line.match(/^#{1,4}\s+(.*)/);
  if (hashMatch) {
    return hashMatch[1].trim();
  }
  return line.trim();
}

export function treeToMarkdown(roots: TreeNode[]): string {
  const lines: string[] = [];

  function traverse(nodes: TreeNode[]) {
    for (const node of nodes) {
      const prefix = '#'.repeat(node.level) + ' ';
      lines.push(prefix + node.text);
      if (node.children.length > 0) {
        traverse(node.children);
      }
    }
  }

  traverse(roots);
  return lines.join('\n');
}

export function flattenTree(roots: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = [];

  function traverse(nodes: TreeNode[]) {
    for (const node of nodes) {
      result.push(node);
      if (node.children.length > 0) {
        traverse(node.children);
      }
    }
  }

  traverse(roots);
  return result;
}

export function findNodeById(roots: TreeNode[], id: string): TreeNode | null {
  function traverse(nodes: TreeNode[]): TreeNode | null {
    for (const node of nodes) {
      if (node.id === id) return node;
      if (node.children.length > 0) {
        const found = traverse(node.children);
        if (found) return found;
      }
    }
    return null;
  }
  return traverse(roots);
}

export function getDescendantIds(node: TreeNode): string[] {
  const ids: string[] = [];
  function traverse(n: TreeNode) {
    for (const child of n.children) {
      ids.push(child.id);
      if (child.children.length > 0) {
        traverse(child);
      }
    }
  }
  traverse(node);
  return ids;
}
