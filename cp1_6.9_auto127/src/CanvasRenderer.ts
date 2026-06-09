import { MindNode, Connection, UserCursor } from './types';

export interface RenderState {
  nodes: MindNode[];
  connections: Connection[];
  users: UserCursor[];
  selectedNodeId: string | null;
  editingNodeId: string | null;
  hoveredNodeId: string | null;
  hoveredConnectionId: string | null;
  draggingNodeId: string | null;
  connectingFromId: string | null;
  mouseX: number;
  mouseY: number;
  scale: number;
  offsetX: number;
  offsetY: number;
  editCursorVisible: boolean;
  editCursorPos: number;
}

const NODE_PADDING = 16;
const NODE_MIN_WIDTH = 100;
const NODE_HEIGHT = 48;
const NODE_RADIUS = 8;
const NODE_FONT_SIZE = 14;
const CONNECTION_WIDTH = 2;
const CONNECTION_COLOR = 'rgba(155, 89, 182, 0.7)';
const CONNECTION_HOVER_COLOR = 'rgba(155, 89, 182, 1.0)';
const GLOW_COLOR = '#4ecca3';
const GLOW_BLUR = 4;
const CURSOR_RADIUS = 3;
const BG_COLOR = '#1a1a2e';
const NODE_BG = '#16213e';

export function measureTextWidth(ctx: CanvasRenderingContext2D, text: string, fontSize: number = NODE_FONT_SIZE): number {
  ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
  return ctx.measureText(text).width;
}

export function calculateNodeSize(ctx: CanvasRenderingContext2D, title: string): { width: number; height: number } {
  const textWidth = measureTextWidth(ctx, title);
  const width = Math.max(NODE_MIN_WIDTH, textWidth + NODE_PADDING * 2);
  return { width, height: NODE_HEIGHT };
}

export function pointInNode(px: number, py: number, node: MindNode): boolean {
  return (
    px >= node.x &&
    px <= node.x + node.width &&
    py >= node.y &&
    py <= node.y + node.height
  );
}

export function pointNearNodeEdge(px: number, py: number, node: MindNode, threshold: number = 10): boolean {
  const cx = node.x + node.width / 2;
  const cy = node.y + node.height / 2;
  const inNode = pointInNode(px, py, node);
  if (!inNode) return false;
  const distToLeft = Math.abs(px - node.x);
  const distToRight = Math.abs(px - (node.x + node.width));
  const distToTop = Math.abs(py - node.y);
  const distToBottom = Math.abs(py - (node.y + node.height));
  const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);
  return minDist <= threshold;
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
): void {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawBezierConnection(
  ctx: CanvasRenderingContext2D,
  from: MindNode,
  to: MindNode,
  color: string,
  lineWidth: number = CONNECTION_WIDTH
): void {
  const fromX = from.x + from.width / 2;
  const fromY = from.y + from.height / 2;
  const toX = to.x + to.width / 2;
  const toY = to.y + to.height / 2;

  const dx = Math.abs(toX - fromX);
  const offsetX = Math.max(50, dx * 0.5);

  const startX = toX > fromX ? from.x + from.width : from.x;
  const startY = fromY;
  const endX = toX > fromX ? to.x : to.x + to.width;
  const endY = toY;

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.bezierCurveTo(
    startX + (toX > fromX ? offsetX : -offsetX),
    startY,
    endX + (toX > fromX ? -offsetX : offsetX),
    endY,
    endX,
    endY
  );
  ctx.stroke();
}

function drawTempConnection(
  ctx: CanvasRenderingContext2D,
  from: MindNode,
  mouseX: number,
  mouseY: number
): void {
  const fromX = from.x + from.width / 2;
  const fromY = from.y + from.height / 2;
  const startX = mouseX > fromX ? from.x + from.width : from.x;
  const startY = fromY;

  const dx = Math.abs(mouseX - startX);
  const offsetX = Math.max(50, dx * 0.5);

  ctx.strokeStyle = CONNECTION_COLOR;
  ctx.lineWidth = CONNECTION_WIDTH;
  ctx.lineCap = 'round';
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.bezierCurveTo(
    startX + (mouseX > startX ? offsetX : -offsetX),
    startY,
    mouseX + (mouseX > startX ? -offsetX : offsetX),
    mouseY,
    mouseX,
    mouseY
  );
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = CONNECTION_COLOR;
  ctx.beginPath();
  ctx.arc(mouseX, mouseY, 5, 0, Math.PI * 2);
  ctx.fill();
}

function drawNode(
  ctx: CanvasRenderingContext2D,
  node: MindNode,
  state: RenderState,
  time: number
): void {
  const isSelected = state.selectedNodeId === node.id;
  const isEditing = state.editingNodeId === node.id;
  const isHovered = state.hoveredNodeId === node.id;
  const isDragging = state.draggingNodeId === node.id;
  const isConnecting = state.connectingFromId === node.id;

  ctx.save();

  if (isSelected || isHovered || isDragging || isConnecting) {
    ctx.shadowColor = GLOW_COLOR;
    ctx.shadowBlur = GLOW_BLUR;
  }

  drawRoundedRect(ctx, node.x, node.y, node.width, node.height, NODE_RADIUS);
  ctx.fillStyle = NODE_BG;
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.lineWidth = isSelected ? 3 : 2;
  ctx.strokeStyle = node.color;
  drawRoundedRect(ctx, node.x, node.y, node.width, node.height, NODE_RADIUS);
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = `${NODE_FONT_SIZE}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  const textX = node.x + node.width / 2;
  const textY = node.y + node.height / 2;

  if (isEditing) {
    const textBefore = node.title;
    ctx.fillText(textBefore, textX, textY);

    if (state.editCursorVisible) {
      const textWidth = measureTextWidth(ctx, textBefore);
      const cursorX = textX + textWidth / 2 + 2;
      const cursorTop = node.y + 12;
      const cursorBottom = node.y + node.height - 12;

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cursorX, cursorTop);
      ctx.lineTo(cursorX, cursorBottom);
      ctx.stroke();
    }
  } else {
    let displayTitle = node.title;
    const maxTextWidth = node.width - NODE_PADDING * 2;
    if (measureTextWidth(ctx, displayTitle) > maxTextWidth) {
      while (displayTitle.length > 1 && measureTextWidth(ctx, displayTitle + '...') > maxTextWidth) {
        displayTitle = displayTitle.slice(0, -1);
      }
      displayTitle += '...';
    }
    ctx.fillText(displayTitle, textX, textY);
  }

  if (isConnecting || (isHovered && !isEditing && !isDragging)) {
    const dotRadius = 4;
    const dots = [
      { x: node.x, y: node.y + node.height / 2 },
      { x: node.x + node.width, y: node.y + node.height / 2 },
    ];
    ctx.fillStyle = node.color;
    dots.forEach((dot) => {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dotRadius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  ctx.restore();
}

function drawUserCursor(
  ctx: CanvasRenderingContext2D,
  cursor: UserCursor,
  currentUserId: string,
  time: number
): void {
  if (cursor.userId === currentUserId) return;
  if (cursor.x === 0 && cursor.y === 0) return;

  const pulseRadius = CURSOR_RADIUS + Math.sin(time / 200) * 1;

  ctx.save();

  ctx.fillStyle = cursor.color;
  ctx.globalAlpha = 0.8;
  ctx.beginPath();
  ctx.arc(cursor.x, cursor.y, pulseRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.fillStyle = cursor.color;
  ctx.font = 'bold 11px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const labelX = cursor.x + CURSOR_RADIUS + 6;
  const labelY = cursor.y - CURSOR_RADIUS - 6;
  const label = cursor.userName;
  const labelWidth = ctx.measureText(label).width;
  const labelPadding = 6;
  const labelHeight = 20;

  ctx.globalAlpha = 0.9;
  drawRoundedRect(ctx, labelX, labelY - labelHeight / 2, labelWidth + labelPadding * 2, labelHeight, 4);
  ctx.fill();

  ctx.globalAlpha = 1;
  ctx.fillStyle = '#ffffff';
  ctx.fillText(label, labelX + labelPadding, labelY);

  ctx.restore();
}

export function render(
  ctx: CanvasRenderingContext2D,
  state: RenderState,
  currentUserId: string,
  canvasWidth: number,
  canvasHeight: number,
  time: number
): void {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  ctx.save();
  ctx.fillStyle = BG_COLOR;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)';
  ctx.lineWidth = 1;
  const gridSize = 40;
  for (let x = 0; x < canvasWidth; x += gridSize) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvasHeight);
    ctx.stroke();
  }
  for (let y = 0; y < canvasHeight; y += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvasWidth, y);
    ctx.stroke();
  }
  ctx.restore();

  const nodeMap = new Map<string, MindNode>();
  state.nodes.forEach((n) => nodeMap.set(n.id, n));

  state.connections.forEach((conn) => {
    const from = nodeMap.get(conn.from);
    const to = nodeMap.get(conn.to);
    if (from && to) {
      const isHovered = state.hoveredConnectionId === conn.id;
      drawBezierConnection(
        ctx,
        from,
        to,
        isHovered ? CONNECTION_HOVER_COLOR : CONNECTION_COLOR,
        isHovered ? 3 : CONNECTION_WIDTH
      );
    }
  });

  if (state.connectingFromId) {
    const fromNode = nodeMap.get(state.connectingFromId);
    if (fromNode) {
      drawTempConnection(ctx, fromNode, state.mouseX, state.mouseY);
    }
  }

  state.nodes.forEach((node) => drawNode(ctx, node, state, time));

  state.users.forEach((u) => drawUserCursor(ctx, u, currentUserId, time));
}

export function hitTestConnection(
  px: number,
  py: number,
  connection: Connection,
  nodeMap: Map<string, MindNode>,
  threshold: number = 8
): boolean {
  const from = nodeMap.get(connection.from);
  const to = nodeMap.get(connection.to);
  if (!from || !to) return false;

  const fromX = from.x + from.width / 2;
  const fromY = from.y + from.height / 2;
  const toX = to.x + to.width / 2;
  const toY = to.y + to.height / 2;
  const startX = toX > fromX ? from.x + from.width : from.x;
  const startY = fromY;
  const endX = toX > fromX ? to.x : to.x + to.width;
  const endY = toY;

  const dx = Math.abs(endX - startX);
  const offsetX = Math.max(50, dx * 0.5);
  const cp1x = startX + (endX > startX ? offsetX : -offsetX);
  const cp1y = startY;
  const cp2x = endX + (endX > startX ? -offsetX : offsetX);
  const cp2y = endY;

  for (let t = 0; t <= 1; t += 0.02) {
    const t2 = t * t;
    const t3 = t2 * t;
    const mt = 1 - t;
    const mt2 = mt * mt;
    const mt3 = mt2 * mt;

    const x = mt3 * startX + 3 * mt2 * t * cp1x + 3 * mt * t2 * cp2x + t3 * endX;
    const y = mt3 * startY + 3 * mt2 * t * cp1y + 3 * mt * t2 * cp2y + t3 * endY;

    const dist = Math.sqrt((px - x) * (px - x) + (py - y) * (py - y));
    if (dist <= threshold) return true;
  }
  return false;
}

export function findNodeAt(nodes: MindNode[], x: number, y: number): MindNode | null {
  for (let i = nodes.length - 1; i >= 0; i--) {
    if (pointInNode(x, y, nodes[i])) {
      return nodes[i];
    }
  }
  return null;
}

export function findConnectionAt(
  connections: Connection[],
  nodes: MindNode[],
  x: number,
  y: number
): Connection | null {
  const nodeMap = new Map<string, MindNode>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  for (let i = connections.length - 1; i >= 0; i--) {
    if (hitTestConnection(x, y, connections[i], nodeMap)) {
      return connections[i];
    }
  }
  return null;
}
