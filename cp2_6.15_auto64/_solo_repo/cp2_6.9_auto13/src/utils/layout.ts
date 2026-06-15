import type { FlowNode, FlowEdge, Position } from '../types';

const NODE_SPACING_X = 150;
const NODE_SPACING_Y = 100;

function buildTree(
  nodes: FlowNode[],
  edges: FlowEdge[]
): Map<string, string[]> {
  const adjacency = new Map<string, string[]>();
  nodes.forEach((n) => adjacency.set(n.id, []));
  edges.forEach((e) => {
    const children = adjacency.get(e.source) || [];
    children.push(e.target);
    adjacency.set(e.source, children);
  });
  return adjacency;
}

function findRootNodes(
  nodes: FlowNode[],
  edges: FlowEdge[]
): string[] {
  const hasParent = new Set<string>();
  edges.forEach((e) => hasParent.add(e.target));
  return nodes.filter((n) => !hasParent.has(n.id)).map((n) => n.id);
}

export function calculateLayout(
  nodes: FlowNode[],
  edges: FlowEdge[],
  canvasWidth: number,
  canvasHeight: number
): Map<string, Position> {
  const result = new Map<string, Position>();
  if (nodes.length === 0) return result;

  const adjacency = buildTree(nodes, edges);
  const roots = findRootNodes(nodes, edges);
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  const levels = new Map<string, number>();
  const positionsInLevel = new Map<string, number>();
  const levelCounts = new Map<number, number>();

  function dfs(
    nodeId: string,
    level: number,
    visited: Set<string>
  ): number {
    if (visited.has(nodeId)) return 0;
    visited.add(nodeId);
    levels.set(nodeId, level);

    const children = adjacency.get(nodeId) || [];
    let subtreeWidth = 0;

    if (children.length === 0) {
      const pos = levelCounts.get(level) || 0;
      positionsInLevel.set(nodeId, pos);
      levelCounts.set(level, pos + 1);
      subtreeWidth = 1;
    } else {
      for (const child of children) {
        subtreeWidth += dfs(child, level + 1, visited);
      }
      const firstChildPos = positionsInLevel.get(children[0]) || 0;
      const lastChildPos =
        positionsInLevel.get(children[children.length - 1]) || 0;
      const centerPos = (firstChildPos + lastChildPos) / 2;
      positionsInLevel.set(nodeId, centerPos);
    }

    return Math.max(subtreeWidth, children.length);
  }

  const visited = new Set<string>();
  let maxLevel = 0;
  roots.forEach((root) => {
    dfs(root, 0, visited);
  });

  nodes.forEach((n) => {
    if (!visited.has(n.id)) {
      const level = 0;
      const pos = levelCounts.get(level) || 0;
      levels.set(n.id, level);
      positionsInLevel.set(n.id, pos);
      levelCounts.set(level, pos + 1);
    }
    const lvl = levels.get(n.id) || 0;
    maxLevel = Math.max(maxLevel, lvl);
  });

  const levelNodes = new Map<number, string[]>();
  levels.forEach((level, nodeId) => {
    if (!levelNodes.has(level)) {
      levelNodes.set(level, []);
    }
    levelNodes.get(level)!.push(nodeId);
  });

  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;

  levelNodes.forEach((nodeIds, level) => {
    const count = nodeIds.length;
    const totalWidth = (count - 1) * NODE_SPACING_X;
    const startX = centerX - totalWidth / 2;
    nodeIds.forEach((nodeId, idx) => {
      const node = nodeMap.get(nodeId);
      if (!node) return;
      const x = startX + idx * NODE_SPACING_X;
      const y = 80 + level * NODE_SPACING_Y;
      result.set(nodeId, { x, y });
    });
  });

  return result;
}

export function animatePositions(
  nodes: FlowNode[],
  targetPositions: Map<string, Position>,
  duration: number,
  onUpdate: (updated: FlowNode[]) => void,
  onComplete: () => void
) {
  const startPositions = new Map<string, Position>();
  nodes.forEach((n) => startPositions.set(n.id, { x: n.x, n.y }));

  const startTime = performance.now();

  function ease(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  function step(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const eased = ease(progress);

    const updated = nodes.map((n) => {
      const start = startPositions.get(n.id)!;
      const target = targetPositions.get(n.id);
      if (!target) return n;
      return {
        ...n,
        x: start.x + (target.x - start.x) * eased,
        y: start.y + (target.y - start.y) * eased,
      };
    });

    onUpdate(updated);

    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      onComplete();
    }
  }

  requestAnimationFrame(step);
}
