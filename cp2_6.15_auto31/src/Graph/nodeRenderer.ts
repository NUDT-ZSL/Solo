import { GraphNode, LEVEL_COLORS, NODE_WIDTH, NODE_HEIGHT, NODE_RADIUS, BADGE_RADIUS } from '../Parser/treeNode';

export interface DrawNodeOptions {
  hovered?: boolean;
  pulseScale?: number;
  fontSize?: number;
}

export function drawNode(
  ctx: CanvasRenderingContext2D,
  node: GraphNode,
  options: DrawNodeOptions = {}
): void {
  const { hovered = false, pulseScale = 1, fontSize = 14 } = options;
  
  if (node.opacity <= 0 || !node.visible) return;

  const scale = pulseScale;
  const w = NODE_WIDTH * scale;
  const h = NODE_HEIGHT * scale;
  const x = node.x - w / 2;
  const y = node.y - h / 2;
  const r = NODE_RADIUS * scale;

  ctx.save();
  ctx.globalAlpha = node.opacity;

  const bgColor = LEVEL_COLORS[node.level] || LEVEL_COLORS[4];

  if (hovered) {
    ctx.shadowColor = bgColor;
    ctx.shadowBlur = 12;
  }

  ctx.fillStyle = bgColor;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();

  ctx.shadowBlur = 0;

  ctx.fillStyle = '#333';
  ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  
  const paddingX = 10 * scale;
  const textMaxWidth = w - paddingX * 2 - (node.children.length > 0 ? BADGE_RADIUS * 2 + 8 * scale : 0);
  const textY = node.y;
  
  const displayText = truncateText(ctx, node.text, textMaxWidth);
  ctx.fillText(displayText, x + paddingX, textY);

  if (node.children.length > 0) {
    const badgeX = x + w - BADGE_RADIUS * scale;
    const badgeY = node.y;
    
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(badgeX, badgeY, BADGE_RADIUS * scale, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = bgColor;
    ctx.font = `bold ${10 * scale}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(node.children.length), badgeX, badgeY);
  }

  ctx.restore();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function truncateText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) {
    return text;
  }

  let result = '';
  for (let i = 0; i < text.length; i++) {
    const test = result + text[i] + '...';
    if (ctx.measureText(test).width > maxWidth) {
      return result + '...';
    }
    result += text[i];
  }
  return result + '...';
}

export function drawEdge(
  ctx: CanvasRenderingContext2D,
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  opacity: number = 1
): void {
  if (opacity <= 0) return;

  ctx.save();
  ctx.globalAlpha = opacity * 0.6;
  ctx.strokeStyle = '#999';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  
  const midX = (sourceX + targetX) / 2;
  const cp1x = midX;
  const cp1y = sourceY;
  const cp2x = midX;
  const cp2y = targetY;
  
  ctx.moveTo(sourceX, sourceY);
  ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, targetX, targetY);
  ctx.stroke();
  ctx.restore();
}

export function isPointInNode(node: GraphNode, px: number, py: number): boolean {
  const left = node.x - NODE_WIDTH / 2;
  const right = node.x + NODE_WIDTH / 2;
  const top = node.y - NODE_HEIGHT / 2;
  const bottom = node.y + NODE_HEIGHT / 2;
  
  return px >= left && px <= right && py >= top && py <= bottom;
}
