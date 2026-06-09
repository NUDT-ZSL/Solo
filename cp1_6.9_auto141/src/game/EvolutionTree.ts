import { CellEntityData, EvolutionNode } from './types';

export class EvolutionTree {
  private root: EvolutionNode | null = null;
  private nodeMap: Map<string, EvolutionNode> = new Map();

  addCell(cell: CellEntityData): void {
    const node: EvolutionNode = {
      cellId: cell.id,
      hue: cell.hue,
      radius: cell.radius,
      divisionCount: cell.divisionCount,
      birthTime: cell.birthTime,
      children: []
    };
    this.nodeMap.set(cell.id, node);

    if (!cell.parentId) {
      this.root = node;
    } else {
      const parent = this.nodeMap.get(cell.parentId);
      if (parent) {
        parent.children.push(node);
      }
    }
  }

  markDeath(cellId: string, deathTime: number): void {
    const node = this.nodeMap.get(cellId);
    if (node && node.deathTime === undefined) {
      node.deathTime = deathTime;
    }
  }

  getRoot(): EvolutionNode | null {
    return this.root;
  }

  getNode(cellId: string): EvolutionNode | undefined {
    return this.nodeMap.get(cellId);
  }

  getAllNodes(): EvolutionNode[] {
    return Array.from(this.nodeMap.values());
  }
}

export function flattenTree(root: EvolutionNode | null): EvolutionNode[] {
  if (!root) return [];
  const result: EvolutionNode[] = [];
  const stack: EvolutionNode[] = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    result.push(node);
    for (let i = node.children.length - 1; i >= 0; i--) {
      stack.push(node.children[i]);
    }
  }
  return result;
}

export function getTreeDepth(root: EvolutionNode | null): number {
  if (!root) return 0;
  let maxDepth = 0;
  function traverse(node: EvolutionNode, depth: number): void {
    maxDepth = Math.max(maxDepth, depth);
    for (const child of node.children) {
      traverse(child, depth + 1);
    }
  }
  traverse(root, 1);
  return maxDepth;
}

export function getMaxBreadth(root: EvolutionNode | null): number {
  if (!root) return 0;
  let maxBreadth = 0;
  const queue: { node: EvolutionNode; depth: number }[] = [{ node: root, depth: 0 }];
  const breadthMap: Map<number, number> = new Map();
  while (queue.length > 0) {
    const { node, depth } = queue.shift()!;
    breadthMap.set(depth, (breadthMap.get(depth) ?? 0) + 1);
    maxBreadth = Math.max(maxBreadth, breadthMap.get(depth)!);
    for (const child of node.children) {
      queue.push({ node: child, depth: depth + 1 });
    }
  }
  return maxBreadth;
}
