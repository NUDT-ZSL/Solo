import { StackFrame, ParseResult } from '../types';

const padZero = (n: number, len = 2): string => String(n).padStart(len, '0');

const formatTimestamp = (): string => {
  const now = new Date();
  const YYYY = now.getFullYear();
  const MM = padZero(now.getMonth() + 1);
  const DD = padZero(now.getDate());
  const HH = padZero(now.getHours());
  const mm = padZero(now.getMinutes());
  const ss = padZero(now.getSeconds());
  return `${YYYY}${MM}${DD}_${HH}${mm}${ss}`;
};

const downloadFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const exportToJSON = (data: ParseResult): void => {
  const jsonContent = JSON.stringify(data, null, 2);
  const filename = `stacktrace_${formatTimestamp()}.json`;
  downloadFile(jsonContent, filename, 'application/json');
};

interface LayoutNode {
  node: StackFrame;
  level: number;
  x: number;
  y: number;
  width: number;
  height: number;
  subtreeWidth: number;
  children: LayoutNode[];
}

const NODE_WIDTH = 280;
const NODE_HEIGHT = 50;
const H_GAP = 40;
const V_GAP = 20;
const PADDING = 30;

const computeLayout = (
  node: StackFrame,
  level: number,
  xStart: number,
): { layout: LayoutNode; consumed: number } => {
  const childLayouts: LayoutNode[] = [];
  let cursorX = xStart;

  if (node.children.length > 0) {
    for (const child of node.children) {
      const result = computeLayout(child, level + 1, cursorX);
      childLayouts.push(result.layout);
      cursorX = result.consumed;
    }
  }

  let subtreeWidth: number;
  let selfX: number;

  if (childLayouts.length === 0) {
    subtreeWidth = NODE_WIDTH;
    selfX = xStart;
  } else {
    const firstChild = childLayouts[0];
    const lastChild = childLayouts[childLayouts.length - 1];
    const childrenSpan =
      lastChild.x + NODE_WIDTH / 2 - (firstChild.x - NODE_WIDTH / 2);
    subtreeWidth = Math.max(NODE_WIDTH, childrenSpan);
    selfX =
      childLayouts[0].x +
      (childLayouts[childLayouts.length - 1].x - childLayouts[0].x) / 2 +
      NODE_WIDTH / 2 -
      NODE_WIDTH;
  }

  const layout: LayoutNode = {
    node,
    level,
    x: selfX,
    y: PADDING + level * (NODE_HEIGHT + V_GAP),
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    subtreeWidth,
    children: childLayouts,
  };

  return {
    layout,
    consumed: Math.max(xStart + NODE_WIDTH, cursorX) + (node.children.length > 0 ? 0 : H_GAP),
  };
};

const walkLayouts = (layout: LayoutNode, collector: LayoutNode[]): void => {
  collector.push(layout);
  for (const child of layout.children) {
    walkLayouts(child, collector);
  }
};

const escapeXML = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

export const exportToSVG = (data: ParseResult): void => {
  if (!data.callTree || data.callTree.length === 0) {
    const emptySvg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="400" height="200" viewBox="0 0 400 200">
  <rect width="100%" height="100%" fill="#1a1a2e" />
  <text x="200" y="100" text-anchor="middle" font-family="Inter, sans-serif" font-size="14" fill="#888">
    暂无调用树数据
  </text>
</svg>`;
    const filename = `stacktrace_${formatTimestamp()}.svg`;
    downloadFile(emptySvg, filename, 'image/svg+xml');
    return;
  }

  const layoutResults = data.callTree.map((root) => computeLayout(root, 0, PADDING));
  const allNodes: LayoutNode[] = [];
  let offsetX = PADDING;
  const repositionedRoots: LayoutNode[] = [];

  for (let i = 0; i < layoutResults.length; i++) {
    const { layout } = layoutResults[i];
    const shift = offsetX - layout.x;

    const applyShift = (l: LayoutNode, dx: number): LayoutNode => ({
      ...l,
      x: l.x + dx,
      children: l.children.map((c) => applyShift(c, dx)),
    });

    const shifted = applyShift(layout, shift);
    repositionedRoots.push(shifted);
    walkLayouts(shifted, allNodes);

    offsetX = shifted.x + Math.max(NODE_WIDTH, shifted.subtreeWidth) + H_GAP;
  }

  const maxX = Math.max(...allNodes.map((n) => n.x + NODE_WIDTH)) + PADDING;
  const maxY = Math.max(...allNodes.map((n) => n.y + NODE_HEIGHT)) + PADDING;

  const connectors: string[] = [];
  for (const parent of allNodes) {
    for (const child of parent.children) {
      const x1 = parent.x + NODE_WIDTH / 2;
      const y1 = parent.y + NODE_HEIGHT;
      const x2 = child.x + NODE_WIDTH / 2;
      const y2 = child.y;
      const midY = (y1 + y2) / 2;
      connectors.push(
        `<path class="connector" d="M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${x1.toFixed(
          1,
        )} ${midY.toFixed(1)}, ${x2.toFixed(1)} ${midY.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}" />`,
      );
    }
  }

  const nodeSvg = allNodes
    .map((n) => {
      const isError = n.node.id === data.errorFrameId;
      const rectClass = isError ? 'node-rect-error' : 'node-rect';
      const textClass = isError ? 'node-text-error' : 'node-text';

      const errorBadge = isError
        ? `<circle cx="${(n.x + 15).toFixed(1)}" cy="${(n.y + NODE_HEIGHT / 2).toFixed(
            1,
          )}" r="6" fill="#ff5252" />
<text x="${(n.x + 15).toFixed(1)}" y="${(n.y + NODE_HEIGHT / 2 + 3).toFixed(
            1,
          )}" text-anchor="middle" font-size="9" font-weight="bold" fill="#ffffff">!</text>`
        : '';

      const labelPadX = isError ? 32 : 12;
      const fname = escapeXML(n.node.functionName);
      const location = escapeXML(
        `${n.node.fileName.split('/').pop() || n.node.fileName}:${n.node.lineNumber}:${n.node.columnNumber}`,
      );

      return `
  <g>
    <rect class="${rectClass}" x="${n.x.toFixed(1)}" y="${n.y.toFixed(1)}" width="${NODE_WIDTH}" height="${NODE_HEIGHT}" rx="8" />
    ${errorBadge}
    <text class="${textClass}" x="${(n.x + labelPadX).toFixed(1)}" y="${(n.y + 20).toFixed(1)}">${fname}</text>
    <text class="node-text-secondary" x="${(n.x + 12).toFixed(1)}" y="${(n.y + 38).toFixed(1)}">${location}</text>
  </g>`;
    })
    .join('');

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${Math.ceil(maxX)}" height="${Math.ceil(
    maxY,
  )}" viewBox="0 0 ${Math.ceil(maxX)} ${Math.ceil(maxY)}">
  <defs>
    <style>
      .node-rect { fill: #1e1e2e; stroke: #2a2a3e; stroke-width: 1; }
      .node-rect-error { fill: #1e1e2e; stroke: #ff5252; stroke-width: 2; }
      .node-text { font-family: 'Fira Code', Consolas, monospace; font-size: 12px; fill: #e0e0e0; }
      .node-text-secondary { font-family: 'Fira Code', Consolas, monospace; font-size: 10px; fill: #888; }
      .node-text-error { font-family: 'Fira Code', Consolas, monospace; font-size: 12px; fill: #ff5252; font-weight: 600; }
      .connector { fill: none; stroke: #3d3d55; stroke-width: 1.5; }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="#1a1a2e" />
  ${connectors.join('\n  ')}
  ${nodeSvg}
</svg>`;

  const filename = `stacktrace_${formatTimestamp()}.svg`;
  downloadFile(svgContent, filename, 'image/svg+xml');
};
