export type LayoutBlockType = 'header' | 'sidebar' | 'main' | 'card' | 'footer';

export interface LayoutBlock {
  id: string;
  type: LayoutBlockType;
  x: number;
  y: number;
  width: number;
  height: number;
  backgroundColor: string;
  borderRadius: number;
  widthPercent: number;
  parentId: string | null;
  children: string[];
}

export interface LayoutConnection {
  id: string;
  fromId: string;
  toId: string;
}

export interface ExportBlock {
  type: LayoutBlockType;
  x: number;
  y: number;
  width: number;
  height: number;
  children: ExportBlock[];
}

export const GRID_SIZE = 10;
export const MIN_GAP = 8;
export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 600;

export const DEFAULT_BLOCK_DIMENSIONS: Record<LayoutBlockType, { width: number; height: number }> = {
  header: { width: 960, height: 60 },
  sidebar: { width: 200, height: 400 },
  main: { width: 720, height: 400 },
  card: { width: 240, height: 180 },
  footer: { width: 960, height: 60 },
};

export const BLOCK_LABELS: Record<LayoutBlockType, string> = {
  header: '页头',
  sidebar: '侧栏',
  main: '主内容区',
  card: '图文卡片',
  footer: '页脚',
};

export const DEFAULT_BACKGROUND_COLORS: Record<LayoutBlockType, string> = {
  header: '#dbeafe',
  sidebar: '#e0e7ff',
  main: '#f3f4f6',
  card: '#fef3c7',
  footer: '#d1fae5',
};

export const WIDTH_OPTIONS = [25, 33, 50, 100];

export function snapToGrid(value: number, gridSize: number = GRID_SIZE): number {
  return Math.round(value / gridSize) * gridSize;
}

export function snapPointToGrid(x: number, y: number): { x: number; y: number } {
  return {
    x: snapToGrid(x),
    y: snapToGrid(y),
  };
}

export function calculateActualWidth(percent: number, parentWidth: number = CANVAS_WIDTH): number {
  return Math.round((percent / 100) * parentWidth);
}

export function adjustBlockPosition(
  block: LayoutBlock,
  blocks: Map<string, LayoutBlock>,
  movedBlockId: string
): LayoutBlock {
  let { x, y } = block;
  const snapped = snapPointToGrid(x, y);
  x = snapped.x;
  y = snapped.y;

  x = Math.max(0, Math.min(x, CANVAS_WIDTH - block.width));
  y = Math.max(0, Math.min(y, CANVAS_HEIGHT - block.height));

  const otherBlocks = Array.from(blocks.values()).filter((b) => b.id !== movedBlockId && b.id !== block.id);

  for (const other of otherBlocks) {
    const overlapX =
      x < other.x + other.width + MIN_GAP && x + block.width + MIN_GAP > other.x;
    const overlapY =
      y < other.y + other.height + MIN_GAP && y + block.height + MIN_GAP > other.y;

    if (overlapX && overlapY) {
      const dxRight = other.x + other.width + MIN_GAP - x;
      const dxLeft = x + block.width + MIN_GAP - other.x;
      const dyBottom = other.y + other.height + MIN_GAP - y;
      const dyTop = y + block.height + MIN_GAP - other.y;

      const minDx = Math.min(dxRight, dxLeft);
      const minDy = Math.min(dyBottom, dyTop);

      if (minDx < minDy) {
        if (dxRight < dxLeft) {
          x += dxRight;
        } else {
          x -= dxLeft;
        }
      } else {
        if (dyBottom < dyTop) {
          y += dyBottom;
        } else {
          y -= dyTop;
        }
      }
    }
  }

  x = Math.max(0, Math.min(x, CANVAS_WIDTH - block.width));
  y = Math.max(0, Math.min(y, CANVAS_HEIGHT - block.height));

  const finalSnapped = snapPointToGrid(x, y);

  return {
    ...block,
    x: finalSnapped.x,
    y: finalSnapped.y,
  };
}

export function adjustChildrenPositions(
  parentId: string,
  blocks: Map<string, LayoutBlock>
): Map<string, LayoutBlock> {
  const updatedBlocks = new Map(blocks);
  const parent = updatedBlocks.get(parentId);

  if (!parent) return updatedBlocks;

  const adjustRecursive = (pid: string) => {
    const p = updatedBlocks.get(pid);
    if (!p) return;

    for (const childId of p.children) {
      const child = updatedBlocks.get(childId);
      if (!child) continue;

      let { x, y } = child;

      x = Math.max(p.x + MIN_GAP, x);
      y = Math.max(p.y + MIN_GAP, y);
      x = Math.min(x, p.x + p.width - child.width - MIN_GAP);
      y = Math.min(y, p.y + p.height - child.height - MIN_GAP);

      const snapped = snapPointToGrid(x, y);
      updatedBlocks.set(childId, {
        ...child,
        x: snapped.x,
        y: snapped.y,
      });

      adjustRecursive(childId);
    }
  };

  adjustRecursive(parentId);
  return updatedBlocks;
}

export function getDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
}

export function getEdgeMidpoint(
  block: LayoutBlock,
  edge: 'top' | 'right' | 'bottom' | 'left'
): { x: number; y: number } {
  switch (edge) {
    case 'top':
      return { x: block.x + block.width / 2, y: block.y };
    case 'right':
      return { x: block.x + block.width, y: block.y + block.height / 2 };
    case 'bottom':
      return { x: block.x + block.width / 2, y: block.y + block.height };
    case 'left':
      return { x: block.x, y: block.y + block.height / 2 };
  }
}

export function findNearestEdge(
  block: LayoutBlock,
  pointX: number,
  pointY: number
): { edge: 'top' | 'right' | 'bottom' | 'left'; point: { x: number; y: number } } {
  const edges = ['top', 'right', 'bottom', 'left'] as const;
  let nearest: 'top' | 'right' | 'bottom' | 'left' = edges[0];
  let minDist = Infinity;
  let nearestPoint = { x: 0, y: 0 };

  for (const edge of edges) {
    const mid = getEdgeMidpoint(block, edge);
    const dist = getDistance(mid.x, mid.y, pointX, pointY);
    if (dist < minDist) {
      minDist = dist;
      nearest = edge;
      nearestPoint = mid;
    }
  }

  return { edge: nearest, point: nearestPoint };
}

export function serializeToJSON(
  blocks: Map<string, LayoutBlock>,
  connections: LayoutConnection[]
): ExportBlock[] {
  const roots = Array.from(blocks.values()).filter((b) => b.parentId === null);

  const buildTree = (blockId: string): ExportBlock => {
    const block = blocks.get(blockId)!;
    return {
      type: block.type,
      x: block.x,
      y: block.y,
      width: block.width,
      height: block.height,
      children: block.children.map(buildTree),
    };
  };

  return roots.map((r) => buildTree(r.id));
}

export function downloadJSON(data: ExportBlock[], filename: string = 'layout.json'): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function getBlockGap(block1: LayoutBlock, block2: LayoutBlock): { horizontal: number; vertical: number } | null {
  const overlapX = block1.x < block2.x + block2.width && block1.x + block1.width > block2.x;
  const overlapY = block1.y < block2.y + block2.height && block1.y + block1.height > block2.y;

  if (overlapX || overlapY) {
    return null;
  }

  let horizontal = 0;
  let vertical = 0;

  if (!overlapX) {
    if (block1.x + block1.width <= block2.x) {
      horizontal = block2.x - (block1.x + block1.width);
    } else {
      horizontal = block1.x - (block2.x + block2.width);
    }
  }

  if (!overlapY) {
    if (block1.y + block1.height <= block2.y) {
      vertical = block2.y - (block1.y + block1.height);
    } else {
      vertical = block1.y - (block2.y + block2.height);
    }
  }

  return { horizontal, vertical };
}

export function getAdjacentBlocks(
  block: LayoutBlock,
  blocks: Map<string, LayoutBlock>,
  threshold: number = 50
): { block: LayoutBlock; gap: { horizontal: number; vertical: number } }[] {
  const result: { block: LayoutBlock; gap: { horizontal: number; vertical: number } }[] = [];

  for (const other of blocks.values()) {
    if (other.id === block.id) continue;
    const gap = getBlockGap(block, other);
    if (gap && (gap.horizontal <= threshold || gap.vertical <= threshold)) {
      if (gap.horizontal === 0 || gap.vertical === 0) {
        result.push({ block: other, gap });
      }
    }
  }

  return result;
}
