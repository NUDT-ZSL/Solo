import { StackFrame, ParseResult } from '../types';

const formatDate = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  return `${year}${month}${day}_${hours}${minutes}${seconds}`;
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
  const filename = `stacktrace_${formatDate()}.json`;
  downloadFile(jsonContent, filename, 'application/json');
};

interface SVGNode {
  x: number;
  y: number;
  node: StackFrame;
  level: number;
}

const flattenTree = (node: StackFrame, level: number, x: number, nodes: SVGNode[]): number => {
  const nodeWidth = 280;
  const nodeHeight = 50;
  const horizontalGap = 40;
  const verticalGap = 20;

  let currentX = x;

  if (node.children.length > 0) {
    for (const child of node.children) {
      currentX = flattenTree(child, level + 1, currentX, nodes);
    }
    
    const firstChild = nodes.find(n => n.node === node.children[0]);
    const lastChild = nodes.find(n => n.node === node.children[node.children.length - 1]);
    
    if (firstChild && lastChild) {
      const centerX = (firstChild.x + lastChild.x + nodeWidth) / 2 - nodeWidth / 2;
      nodes.push({ x: centerX, y: level * (nodeHeight + verticalGap), node, level });
    } else {
      nodes.push({ x: currentX, y: level * (nodeHeight + verticalGap), node, level });
      currentX += nodeWidth + horizontalGap;
    }
  } else {
    nodes.push({ x: currentX, y: level * (nodeHeight + verticalGap), node, level });
    currentX += nodeWidth + horizontalGap;
  }

  return currentX;
};

export const exportToSVG = (data: ParseResult): void => {
  const nodes: SVGNode[] = [];
  const nodeWidth = 280;
  const nodeHeight = 50;
  const horizontalGap = 40;
  const verticalGap = 20;

  let maxX = 0;
  let maxY = 0;

  if (data.callTree.length > 0) {
    flattenTree(data.callTree[0], 0, 20, nodes);
    
    maxX = Math.max(...nodes.map(n => n.x)) + nodeWidth + 40;
    maxY = Math.max(...nodes.map(n => n.y)) + nodeHeight + 40;
  }

  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${maxX}" height="${maxY}" viewBox="0 0 ${maxX} ${maxY}">
  <defs>
    <style>
      .node-rect { fill: #1e1e2e; stroke: #2a2a3e; stroke-width: 1; rx: 8; }
      .node-rect-error { fill: #1e1e2e; stroke: #ff5252; stroke-width: 2; rx: 8; }
      .node-text { font-family: 'Fira Code', monospace; font-size: 12px; fill: #e0e0e0; }
      .node-text-secondary { font-family: 'Fira Code', monospace; font-size: 10px; fill: #888; }
      .node-text-error { font-family: 'Fira Code', monospace; font-size: 12px; fill: #ff5252; }
      .connector { fill: none; stroke: #3d3d55; stroke-width: 1.5; }
      .bg { fill: #1a1a2e; }
    </style>
  </defs>
  <rect class="bg" width="100%" height="100%" />
  ${nodes.map(n => {
    const isError = n.node.id === data.errorFrameId;
    return `
  <rect class="${isError ? 'node-rect-error' : 'node-rect'}" x="${n.x}" y="${n.y}" width="${nodeWidth}" height="${nodeHeight}" />
  ${isError ? `
  <circle cx="${n.x + 15}" cy="${n.y + 25}" r="6" fill="#ff5252" />
  <text x="${n.x + 15}" y="${n.y + 29}" text-anchor="middle" font-size="8" fill="#fff" font-weight="bold">!</text>` : ''}
  <text class="${isError ? 'node-text-error' : 'node-text'}" x="${n.x + (isError ? 35 : 15)}" y="${n.y + 20}">${n.node.functionName.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</text>
  <text class="node-text-secondary" x="${n.x + 15}" y="${n.y + 38}">${n.node.fileName.split('/').pop()}:${n.node.lineNumber}:${n.node.columnNumber}</text>`;
  }).join('')}
  ${nodes.filter(n => n.node.children.length > 0).map(parent => {
    return parent.node.children.map(child => {
      const childNode = nodes.find(n => n.node === child);
      if (!childNode) return '';
      const startX = parent.x + nodeWidth / 2;
      const startY = parent.y + nodeHeight;
      const endX = childNode.x + nodeWidth / 2;
      const endY = childNode.y;
      const midY = (startY + endY) / 2;
      return `<path class="connector" d="M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}" />`;
    }).join('');
  }).join('')}
</svg>`;

  const filename = `stacktrace_${formatDate()}.svg`;
  downloadFile(svgContent, filename, 'image/svg+xml');
};
