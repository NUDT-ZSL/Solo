export interface TreeParams {
  depth: number;
  angle: number;
  lengthRatio: number;
  trunkLength: number;
}

export interface BranchNode {
  id: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  depth: number;
  maxDepth: number;
  angle: number;
  length: number;
  parentId: number | null;
  children: BranchNode[];
  opacity: number;
  isPruning: boolean;
  pruneStartTime: number;
}

export interface TreeStats {
  totalBranches: number;
  totalNodes: number;
  maxHeight: number;
  avgAngle: number;
  currentDepth: number;
}

export interface PresetTemplate {
  name: string;
  color: string;
  params: TreeParams;
}

export const PRESETS: PresetTemplate[] = [
  {
    name: 'pine',
    color: '#E53E3E',
    params: { depth: 6, angle: 30, lengthRatio: 0.7, trunkLength: 50 },
  },
  {
    name: 'willow',
    color: '#38A169',
    params: { depth: 5, angle: 50, lengthRatio: 0.45, trunkLength: 50 },
  },
  {
    name: 'oak',
    color: '#805AD5',
    params: { depth: 7, angle: 25, lengthRatio: 0.8, trunkLength: 50 },
  },
];

let idCounter = 0;

function nextId(): number {
  return ++idCounter;
}

export function resetIdCounter(): void {
  idCounter = 0;
}

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function createBranch(
  startX: number,
  startY: number,
  angle: number,
  length: number,
  depth: number,
  maxDepth: number,
  parentId: number | null
): BranchNode {
  const rad = toRadians(angle);
  const endX = startX + Math.sin(rad) * length;
  const endY = startY - Math.cos(rad) * length;

  return {
    id: nextId(),
    startX,
    startY,
    endX,
    endY,
    depth,
    maxDepth,
    angle,
    length,
    parentId,
    children: [],
    opacity: 1,
    isPruning: false,
    pruneStartTime: 0,
  };
}

function generateBranches(
  parent: BranchNode,
  params: TreeParams,
  currentDepth: number,
  maxDepth: number
): void {
  if (currentDepth >= maxDepth) return;

  const childLength = parent.length * params.lengthRatio;

  const leftBranch = createBranch(
    parent.endX,
    parent.endY,
    parent.angle - params.angle,
    childLength,
    currentDepth + 1,
    maxDepth,
    parent.id
  );

  const rightBranch = createBranch(
    parent.endX,
    parent.endY,
    parent.angle + params.angle,
    childLength,
    currentDepth + 1,
    maxDepth,
    parent.id
  );

  parent.children.push(leftBranch, rightBranch);

  generateBranches(leftBranch, params, currentDepth + 1, maxDepth);
  generateBranches(rightBranch, params, currentDepth + 1, maxDepth);
}

export function generateTree(
  params: TreeParams,
  centerX: number,
  groundY: number
): BranchNode {
  resetIdCounter();

  const trunk = createBranch(
    centerX,
    groundY,
    0,
    params.trunkLength,
    0,
    params.depth,
    null
  );

  generateBranches(trunk, params, 0, params.depth);

  return trunk;
}

function markPrune(node: BranchNode, now: number): void {
  node.isPruning = true;
  node.pruneStartTime = now;
  node.children.forEach((child) => markPrune(child, now));
}

function removePruned(node: BranchNode): BranchNode {
  node.children = node.children.filter((c) => {
    if (c.isPruning && performance.now() - c.pruneStartTime > 500) {
      return false;
    }
    removePruned(c);
    return true;
  });
  return node;
}

export function pruneBranch(root: BranchNode, branchId: number): BranchNode {
  const now = performance.now();

  function findAndPrune(node: BranchNode): boolean {
    if (node.id === branchId) {
      markPrune(node, now);
      return true;
    }
    for (const child of node.children) {
      if (findAndPrune(child)) return true;
    }
    return false;
  }

  findAndPrune(root);
  return root;
}

export function cleanupPruned(root: BranchNode): BranchNode {
  return removePruned(root);
}

export function getTreeStats(root: BranchNode): TreeStats {
  let totalBranches = 0;
  let totalNodes = 0;
  let minY = root.startY;
  let angleSum = 0;
  let angleCount = 0;
  let maxDepth = 0;

  function traverse(node: BranchNode): void {
    totalBranches++;
    totalNodes++;
    if (node.children.length > 0) totalNodes += node.children.length;

    if (node.endY < minY) minY = node.endY;
    if (node.depth > maxDepth) maxDepth = node.depth;

    if (node.parentId !== null) {
      angleSum += Math.abs(node.angle);
      angleCount++;
    }

    node.children.forEach(traverse);
  }

  traverse(root);

  return {
    totalBranches,
    totalNodes,
    maxHeight: Math.round(root.startY - minY),
    avgAngle: angleCount > 0 ? Math.round(angleSum / angleCount) : 0,
    currentDepth: maxDepth,
  };
}

export function findBranchAtPoint(
  root: BranchNode,
  x: number,
  y: number,
  threshold: number = 8
): BranchNode | null {
  let closest: BranchNode | null = null;
  let closestDist = Infinity;

  function pointToSegmentDist(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;

    if (lenSq === 0) {
      return Math.hypot(px - x1, py - y1);
    }

    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;

    return Math.hypot(px - projX, py - projY);
  }

  function traverse(node: BranchNode): void {
    if (node.isPruning) return;

    if (node.children.length === 0) {
      const endDist = Math.hypot(x - node.endX, y - node.endY);
      if (endDist < threshold && endDist < closestDist) {
        closestDist = endDist;
        closest = node;
      }
    }

    const segDist = pointToSegmentDist(
      x,
      y,
      node.startX,
      node.startY,
      node.endX,
      node.endY
    );
    if (segDist < threshold && segDist < closestDist) {
      if (node.children.length === 0 || segDist < 4) {
        closestDist = segDist;
        closest = node;
      }
    }

    node.children.forEach(traverse);
  }

  traverse(root);
  return closest;
}

export function collectAllIds(root: BranchNode): Set<number> {
  const ids = new Set<number>();

  function traverse(node: BranchNode): void {
    ids.add(node.id);
    node.children.forEach(traverse);
  }

  traverse(root);
  return ids;
}

export function findBranchById(root: BranchNode, id: number): BranchNode | null {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findBranchById(child, id);
    if (found) return found;
  }
  return null;
}
