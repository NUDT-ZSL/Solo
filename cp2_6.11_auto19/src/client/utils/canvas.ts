/**
 * Canvas 绘制工具
 * 封装节点、连线、箭头的绘制逻辑
 * 性能优化：使用 requestAnimationFrame + 脏区域重绘
 */

import { GraphNode, GraphEdge, THEME } from '../../shared/types';

export interface CanvasState {
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  hoveredNodeId: string | null;
  selectedNodeId: string | null;
  highlightNodeIds: Set<string>;
  time: number;  // 当前时间戳，用于动画
}

/**
 * 绘制背景渐变
 */
export function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  // 径向渐变：从深墨绿到暗灰蓝
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, 0,
    width / 2, height / 2, Math.max(width, height) * 0.7
  );
  gradient.addColorStop(0, THEME.backgroundEnd);
  gradient.addColorStop(1, THEME.backgroundStart);

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // 微妙的网格纹理，增强"梦境"质感
  ctx.strokeStyle = 'rgba(255,255,255,0.02)';
  ctx.lineWidth = 1;
  const gridSize = 50;
  for (let x = 0; x < width; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }
  for (let y = 0; y < height; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

/**
 * 绘制带箭头的连线
 */
export function drawEdge(
  state: CanvasState,
  edge: GraphEdge,
  sourceNode: GraphNode,
  targetNode: GraphNode,
  opacity: number = 1
): void {
  const { ctx } = state;

  const dx = targetNode.x - sourceNode.x;
  const dy = targetNode.y - sourceNode.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  if (distance < 1) return;

  // 计算箭头起点（从节点边缘开始，而不是中心）
  const startX = sourceNode.x + (dx / distance) * sourceNode.size;
  const startY = sourceNode.y + (dy / distance) * sourceNode.size;
  const endX = targetNode.x - (dx / distance) * (targetNode.size + 8); // 留箭头位置
  const endY = targetNode.y - (dy / distance) * (targetNode.size + 8);

  // 线宽与关联强度成正比
  const lineWidth = 1 + edge.strength * 3;

  ctx.save();
  ctx.globalAlpha = opacity * 0.5;
  ctx.strokeStyle = THEME.edgeColor;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';

  // 绘制主线
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // 绘制箭头
  const arrowSize = 6 + edge.strength * 4;
  const angle = Math.atan2(dy, dx);

  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - arrowSize * Math.cos(angle - Math.PI / 6),
    endY - arrowSize * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    endX - arrowSize * Math.cos(angle + Math.PI / 6),
    endY - arrowSize * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

/**
 * 绘制单个节点
 */
export function drawNode(
  state: CanvasState,
  node: GraphNode,
  opacity: number = 1
): void {
  const { ctx, hoveredNodeId, selectedNodeId, highlightNodeIds, time } = state;

  const isHovered = hoveredNodeId === node.id;
  const isSelected = selectedNodeId === node.id;
  const isHighlighted = highlightNodeIds.has(node.id);

  // 计算节点显示大小
  let displaySize = node.size;
  if (isHovered) displaySize *= 1.2; // 悬停放大1.2倍

  ctx.save();
  ctx.globalAlpha = opacity;

  // 1. 节点外发光 / 脉动光晕
  if (node.pulseStartTime && time - node.pulseStartTime < 600) {
    // 点击光晕动画，持续0.6秒
    const pulseProgress = (time - node.pulseStartTime) / 600;
    const pulseRadius = displaySize * (1 + pulseProgress * 1.5);
    const pulseAlpha = (1 - pulseProgress) * 0.6;

    const glow = ctx.createRadialGradient(
      node.x, node.y, displaySize,
      node.x, node.y, pulseRadius
    );
    glow.addColorStop(0, `rgba(74, 144, 217, ${pulseAlpha})`);
    glow.addColorStop(1, 'rgba(74, 144, 217, 0)');

    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(node.x, node.y, pulseRadius, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. 阴影效果
  if (isHovered || isSelected || isHighlighted) {
    ctx.shadowColor = node.color;
    ctx.shadowBlur = isSelected ? 20 : 12;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
  }

  // 3. 节点主体（径向渐变）
  const bodyGradient = ctx.createRadialGradient(
    node.x - displaySize * 0.3, node.y - displaySize * 0.3, 0,
    node.x, node.y, displaySize
  );
  bodyGradient.addColorStop(0, lightenColor(node.color, 30));
  bodyGradient.addColorStop(1, node.color);

  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.arc(node.x, node.y, displaySize, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0; // 重置阴影

  // 4. 节点边框
  ctx.strokeStyle = isSelected ? '#FFFFFF' : 'rgba(255,255,255,0.3)';
  ctx.lineWidth = isSelected ? 2 : 1;
  ctx.beginPath();
  ctx.arc(node.x, node.y, displaySize, 0, Math.PI * 2);
  ctx.stroke();

  // 5. 节点文字
  ctx.fillStyle = THEME.textPrimary;
  ctx.font = `${isHovered ? 600 : 400} ${Math.max(10, displaySize * 0.35)}px "Noto Sans SC", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // 如果文字过长，截断显示
  let text = node.word;
  const maxWidth = displaySize * 1.8;
  if (ctx.measureText(text).width > maxWidth) {
    while (ctx.measureText(text + '…').width > maxWidth && text.length > 0) {
      text = text.slice(0, -1);
    }
    text += '…';
  }
  ctx.fillText(text, node.x, node.y);

  // 6. 笔记/标签图标提示
  if (node.note || (node.tags && node.tags.length > 0)) {
    const iconSize = 8;
    const iconY = node.y - displaySize - 6;

    if (node.note) {
      // 笔记图标（小方块）
      ctx.fillStyle = '#4ECDC4';
      ctx.fillRect(node.x - iconSize - 4, iconY - iconSize / 2, iconSize, iconSize);
    }

    if (node.tags && node.tags.length > 0) {
      // 标签图标（小圆形）
      ctx.fillStyle = '#FF6B6B';
      ctx.beginPath();
      ctx.arc(node.x + iconSize + 4, iconY, iconSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

/**
 * 绘制拖拽时的节点预览（半透明）
 */
export function drawDragPreview(
  state: CanvasState,
  node: GraphNode,
  mouseX: number,
  mouseY: number
): void {
  const { ctx } = state;

  ctx.save();
  ctx.globalAlpha = 0.5;

  const displaySize = node.size * 1.1;

  // 半透明节点预览
  ctx.fillStyle = node.color;
  ctx.beginPath();
  ctx.arc(mouseX, mouseY, displaySize, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 2;
  ctx.setLineDash([5, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
}

/**
 * 颜色变亮工具函数
 */
function lightenColor(rgbStr: string, percent: number): string {
  // 解析 rgb(r, g, b) 格式
  const match = rgbStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (!match) {
    // 处理十六进制格式
    if (rgbStr.startsWith('#')) {
      const r = parseInt(rgbStr.slice(1, 3), 16);
      const g = parseInt(rgbStr.slice(3, 5), 16);
      const b = parseInt(rgbStr.slice(5, 7), 16);
      return `rgb(${Math.min(255, r + percent)}, ${Math.min(255, g + percent)}, ${Math.min(255, b + percent)})`;
    }
    return rgbStr;
  }

  const r = Math.min(255, parseInt(match[1]) + percent);
  const g = Math.min(255, parseInt(match[2]) + percent);
  const b = Math.min(255, parseInt(match[3]) + percent);
  return `rgb(${r}, ${g}, ${b})`;
}

/**
 * 脏区域计算 - 性能优化
 * 只重绘节点变化的区域，而不是整个画布
 */
export function calculateDirtyRect(
  nodes: GraphNode[],
  prevPositions: Map<string, { x: number; y: number }>
): { x: number; y: number; width: number; height: number } | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  let hasChanges = false;

  nodes.forEach(node => {
    const prev = prevPositions.get(node.id);
    if (!prev || prev.x !== node.x || prev.y !== node.y) {
      hasChanges = true;
      const margin = node.size * 2;
      minX = Math.min(minX, node.x - margin, (prev?.x ?? node.x) - margin);
      minY = Math.min(minY, node.y - margin, (prev?.y ?? node.y) - margin);
      maxX = Math.max(maxX, node.x + margin, (prev?.x ?? node.x) + margin);
      maxY = Math.max(maxY, node.y + margin, (prev?.y ?? node.y) + margin);
    }
  });

  if (!hasChanges) return null;

  return {
    x: Math.floor(minX),
    y: Math.floor(minY),
    width: Math.ceil(maxX - minX),
    height: Math.ceil(maxY - minY),
  };
}
