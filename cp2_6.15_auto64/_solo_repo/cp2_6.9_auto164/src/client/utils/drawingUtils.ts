import { ShapeData, ShapeType } from '../../types';

export const PALETTE = [
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DDA0DD'
];

export function getRandomColor(): string {
  return PALETTE[Math.floor(Math.random() * PALETTE.length)];
}

export function drawShape(ctx: CanvasRenderingContext2D, shape: ShapeData, scale: number = 1, offsetX: number = 0, offsetY: number = 0) {
  ctx.save();
  ctx.globalAlpha = shape.opacity;
  ctx.fillStyle = shape.color;
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1;

  const cx = shape.centerX * scale + offsetX;
  const cy = shape.centerY * scale + offsetY;
  const w = shape.width * scale;
  const h = shape.height * scale;

  ctx.translate(cx, cy);
  ctx.rotate((shape.rotation * Math.PI) / 180);

  switch (shape.type) {
    case 'rectangle':
      ctx.beginPath();
      ctx.rect(-w / 2, -h / 2, w, h);
      ctx.fill();
      ctx.stroke();
      break;
    case 'circle':
      ctx.beginPath();
      ctx.arc(0, 0, (shape.radius || Math.min(w, h) / 2) * scale, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    case 'triangle':
      ctx.beginPath();
      ctx.moveTo(0, -h / 2);
      ctx.lineTo(-w / 2, h / 2);
      ctx.lineTo(w / 2, h / 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      break;
    case 'star':
      drawStar(ctx, 0, 0, 5, Math.min(w, h) / 2 * scale, Math.min(w, h) / 4 * scale);
      ctx.fill();
      ctx.stroke();
      break;
  }

  ctx.restore();
}

function drawStar(ctx: CanvasRenderingContext2D, cx: number, cy: number, spikes: number, outerRadius: number, innerRadius: number) {
  let rot = (Math.PI / 2) * 3;
  let x = cx;
  let y = cy;
  const step = Math.PI / spikes;

  ctx.beginPath();
  ctx.moveTo(cx, cy - outerRadius);

  for (let i = 0; i < spikes; i++) {
    x = cx + Math.cos(rot) * outerRadius;
    y = cy + Math.sin(rot) * outerRadius;
    ctx.lineTo(x, y);
    rot += step;

    x = cx + Math.cos(rot) * innerRadius;
    y = cy + Math.sin(rot) * innerRadius;
    ctx.lineTo(x, y);
    rot += step;
  }

  ctx.lineTo(cx, cy - outerRadius);
  ctx.closePath();
}

export function createShapeFromDrag(
  type: ShapeType,
  startX: number,
  startY: number,
  currentX: number,
  currentY: number,
  color?: string
): ShapeData {
  const width = Math.abs(currentX - startX);
  const height = Math.abs(currentY - startY);
  const centerX = (startX + currentX) / 2;
  const centerY = (startY + currentY) / 2;

  return {
    id: '',
    type,
    centerX,
    centerY,
    width: Math.max(width, 20),
    height: Math.max(height, 20),
    radius: type === 'circle' ? Math.max(width, height, 20) / 2 : undefined,
    color: color || getRandomColor(),
    rotation: 0,
    opacity: 0.8
  };
}

export function drawThumbnail(canvas: HTMLCanvasElement, shape: ShapeData) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const scaleX = 40 / Math.max(shape.width, 1);
  const scaleY = 40 / Math.max(shape.height, 1);
  const scale = Math.min(scaleX, scaleY, 1);

  const offsetX = (canvas.width - shape.width * scale) / 2;
  const offsetY = (canvas.height - shape.height * scale) / 2;

  drawShape(ctx, shape, scale, offsetX, offsetY);
}
