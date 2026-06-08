export interface TreeParams {
  depth: number;
  angle: number;
  lengthRatio: number;
  trunkLength: number;
  randomOffset?: number;
}

export interface Branch {
  id: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  depth: number;
  maxDepth: number;
  parent: Branch | null;
  children: Branch[];
  pruned: boolean;
  color: string;
  thickness: number;
}

export interface TreeData {
  root: Branch | null;
  allBranches: Branch[];
  params: TreeParams;
  rootX: number;
  rootY: number;
}

const ROOT_COLOR = '#8B4513';
const TIP_COLOR = '#48BB78';

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : { r: 0, g: 0, b: 0 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
}

function interpolateColor(depth: number, maxDepth: number): string {
  const t = maxDepth <= 1 ? 1 : depth / (maxDepth - 1);
  const root = hexToRgb(ROOT_COLOR);
  const tip = hexToRgb(TIP_COLOR);
  const r = Math.round(root.r + (tip.r - root.r) * t);
  const g = Math.round(root.g + (tip.g - root.g) * t);
  const b = Math.round(root.b + (tip.b - root.b) * t);
  return rgbToHex(r, g, b);
}

function calculateThickness(depth: number, maxDepth: number): number {
  const baseThickness = Math.max(2, maxDepth * 0.8);
  const t = maxDepth <= 1 ? 0 : depth / (maxDepth - 1);
  return Math.max(1, baseThickness * (1 - t * 0.85));
}

let branchIdCounter = 0;
function generateId(): string {
  return `branch_${++branchIdCounter}`;
}

export function generateTree(
  params: TreeParams,
  rootX: number,
  rootY: number
): TreeData {
  const allBranches: Branch[] = [];

  function createBranch(
    startX: number,
    startY: number,
    length: number,
    angleRad: number,
    depth: number,
    parent: Branch | null
  ): Branch | null {
    if (depth >= params.depth || length < 1) {
      return null;
    }

    const actualAngle = params.randomOffset
      ? angleRad + (Math.random() - 0.5) * (params.randomOffset * Math.PI / 180) * 2
      : angleRad;

    const endX = startX + Math.sin(actualAngle) * length;
    const endY = startY - Math.cos(actualAngle) * length;

    const branch: Branch = {
      id: generateId(),
      startX,
      startY,
      endX,
      endY,
      depth,
      maxDepth: params.depth,
      parent,
      children: [],
      pruned: false,
      color: interpolateColor(depth, params.depth),
      thickness: calculateThickness(depth, params.depth)
    };

    allBranches.push(branch);

    const childLength = length * params.lengthRatio;
    const angleOffset = (params.angle * Math.PI) / 180;

    const leftChild = createBranch(
      endX,
      endY,
      childLength,
      actualAngle - angleOffset,
      depth + 1,
      branch
    );
    const rightChild = createBranch(
      endX,
      endY,
      childLength,
      actualAngle + angleOffset,
      depth + 1,
      branch
    );

    if (leftChild) branch.children.push(leftChild);
    if (rightChild) branch.children.push(rightChild);

    return branch;
  }

  const root = createBranch(rootX, rootY, params.trunkLength, 0, 0, null);

  return {
    root,
    allBranches,
    params,
    rootX,
    rootY
  };
}

export function collectDescendants(branch: Branch): Branch[] {
  const descendants: Branch[] = [branch];
  for (const child of branch.children) {
    if (!child.pruned) {
      descendants.push(...collectDescendants(child));
    }
  }
  return descendants;
}

export function countVisibleBranches(tree: TreeData): number {
  return tree.allBranches.filter(b => !b.pruned).length;
}

export function drawTree(
  ctx: CanvasRenderingContext2D,
  tree: TreeData,
  options: {
    progress?: number;
    highlightedBranch?: Branch | null;
    glowingBranches?: Set<string>;
    pruningBranches?: Map<string, number>;
  } = {}
): void {
  const {
    progress = 1,
    highlightedBranch = null,
    glowingBranches = new Set(),
    pruningBranches = new Map()
  } = options;

  const highlightedSet = highlightedBranch
    ? new Set(collectDescendants(highlightedBranch).map(b => b.id))
    : new Set<string>();

  function drawBranch(branch: Branch, parentProgress: number): void {
    if (branch.pruned) return;

    const branchStartDepth = branch.depth / tree.params.depth;
    const branchEndDepth = (branch.depth + 1) / tree.params.depth;

    if (progress <= branchStartDepth) return;

    const branchProgress = Math.min(
      1,
      (progress - branchStartDepth) / (branchEndDepth - branchStartDepth)
    );

    let drawProgress = branchProgress;
    const pruningProgress = pruningBranches.get(branch.id);
    if (pruningProgress !== undefined) {
      drawProgress *= 1 - pruningProgress;
    }

    if (drawProgress <= 0) return;

    const currentEndX = branch.startX + (branch.endX - branch.startX) * drawProgress;
    const currentEndY = branch.startY + (branch.endY - branch.startY) * drawProgress;

    const isHighlighted = highlightedSet.has(branch.id);
    const isGlowing = glowingBranches.has(branch.id);

    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    let color = branch.color;
    let alpha = 1;

    if (pruningProgress !== undefined) {
      alpha = 1 - pruningProgress;
    }

    if (isHighlighted) {
      color = '#FFD700';
    }

    if (isGlowing) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 15;
    }

    ctx.globalAlpha = alpha;
    ctx.strokeStyle = color;
    ctx.lineWidth = branch.thickness * (isHighlighted ? 1.3 : 1);

    ctx.beginPath();
    ctx.moveTo(branch.startX, branch.startY);
    ctx.lineTo(currentEndX, currentEndY);
    ctx.stroke();

    if (isGlowing && branchProgress >= 0.9) {
      const pulseSize = 8 + Math.sin(Date.now() / 80) * 4;
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle = '#48BB78';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#48BB78';
      ctx.beginPath();
      ctx.arc(currentEndX, currentEndY, pulseSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();

    if (drawProgress >= 0.99) {
      for (const child of branch.children) {
        drawBranch(child, parentProgress);
      }
    }
  }

  if (tree.root) {
    drawBranch(tree.root, 1);
  }
}

export function findBranchAtPoint(
  tree: TreeData,
  x: number,
  y: number,
  threshold: number = 8
): Branch | null {
  let closestBranch: Branch | null = null;
  let closestDistance = threshold;

  function distanceToSegment(
    px: number,
    py: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number
  ): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      return Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
    }

    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;

    return Math.sqrt((px - projX) ** 2 + (py - projY) ** 2);
  }

  function checkBranch(branch: Branch): void {
    if (branch.pruned) return;

    const dist = distanceToSegment(
      x,
      y,
      branch.startX,
      branch.startY,
      branch.endX,
      branch.endY
    );

    if (dist < closestDistance) {
      closestDistance = dist;
      closestBranch = branch;
    }

    for (const child of branch.children) {
      checkBranch(child);
    }
  }

  if (tree.root) {
    checkBranch(tree.root);
  }

  return closestBranch;
}

export function exportToSVG(tree: TreeData, width: number, height: number): string {
  function branchToBezier(branch: Branch): string {
    const dx = branch.endX - branch.startX;
    const dy = branch.endY - branch.startY;
    const midX = (branch.startX + branch.endX) / 2;
    const midY = (branch.startY + branch.endY) / 2;

    const perpX = -dy * 0.05;
    const perpY = dx * 0.05;

    const cp1x = midX + perpX;
    const cp1y = midY + perpY;
    const cp2x = midX - perpX;
    const cp2y = midY - perpY;

    return `M ${branch.startX.toFixed(2)} ${branch.startY.toFixed(2)} C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${branch.endX.toFixed(2)} ${branch.endY.toFixed(2)}`;
  }

  const paths: string[] = [];

  function addBranch(branch: Branch): void {
    if (branch.pruned) return;

    paths.push(
      `<path d="${branchToBezier(branch)}" stroke="${branch.color}" stroke-width="${branch.thickness.toFixed(2)}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`
    );

    for (const child of branch.children) {
      addBranch(child);
    }
  }

  if (tree.root) {
    addBranch(tree.root);
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#1A202C"/>
  <g>
${paths.join('\n    ')}
  </g>
</svg>`;
}
