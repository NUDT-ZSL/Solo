import { Part } from '../utils/monsterData';

interface MonsterSpriteProps {
  parts: {
    head: Part | null;
    torso: Part | null;
    legs: Part | null;
    tail: Part | null;
  };
  size?: number;
  animated?: boolean;
  showSlotLabels?: boolean;
}

function drawPixelRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  color: string, accent?: string
) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
  if (accent) {
    ctx.fillStyle = accent;
    ctx.fillRect(x, y, w, 2);
    ctx.fillRect(x, y, 2, h);
  }
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
}

export default function MonsterSprite({ parts, size = 200, animated = false, showSlotLabels = false }: MonsterSpriteProps) {
  const canvasSize = size;
  const grid = canvasSize / 16;

  const drawHead = (ctx: CanvasRenderingContext2D, part: Part, offsetY = 0) => {
    const x = 5 * grid;
    const y = 1 * grid + offsetY;
    const w = 6 * grid;
    const h = 5 * grid;
    drawPixelRect(ctx, x, y, w, h, part.color, part.accentColor);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(x + grid, y + 2 * grid, grid * 1.2, grid * 1.2);
    ctx.fillRect(x + 3.8 * grid, y + 2 * grid, grid * 1.2, grid * 1.2);
    ctx.fillStyle = '#000000';
    ctx.fillRect(x + 1.2 * grid, y + 2.2 * grid, grid * 0.6, grid * 0.6);
    ctx.fillRect(x + 4 * grid, y + 2.2 * grid, grid * 0.6, grid * 0.6);
    ctx.fillStyle = '#333333';
    ctx.fillRect(x + 2 * grid, y + 3.8 * grid, 2 * grid, grid * 0.5);
  };

  const drawTorso = (ctx: CanvasRenderingContext2D, part: Part, offsetY = 0) => {
    const x = 4 * grid;
    const y = 5.5 * grid + offsetY;
    const w = 8 * grid;
    const h = 5.5 * grid;
    drawPixelRect(ctx, x, y, w, h, part.color, part.accentColor);
    ctx.fillStyle = part.accentColor;
    ctx.fillRect(x + grid, y + 2 * grid, grid, grid);
    ctx.fillRect(x + 6 * grid, y + 2 * grid, grid, grid);
    ctx.fillRect(x + 2.5 * grid, y + 3.5 * grid, 3 * grid, grid * 0.8);
  };

  const drawLegs = (ctx: CanvasRenderingContext2D, part: Part, offsetY = 0) => {
    const y = 10.5 * grid + offsetY;
    drawPixelRect(ctx, 4 * grid, y, 3 * grid, 4 * grid, part.color, part.accentColor);
    drawPixelRect(ctx, 9 * grid, y, 3 * grid, 4 * grid, part.color, part.accentColor);
    ctx.fillStyle = '#333333';
    ctx.fillRect(4 * grid, y + 3.8 * grid, 3 * grid, 0.3 * grid);
    ctx.fillRect(9 * grid, y + 3.8 * grid, 3 * grid, 0.3 * grid);
  };

  const drawTail = (ctx: CanvasRenderingContext2D, part: Part, offsetY = 0) => {
    const startX = 12 * grid;
    const startY = 7 * grid + offsetY;
    ctx.fillStyle = part.color;
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.quadraticCurveTo(startX + 2.5 * grid, startY + grid, startX + 3.5 * grid, startY - 0.5 * grid);
    ctx.quadraticCurveTo(startX + 3.5 * grid, startY + 2.5 * grid, startX + 0.5 * grid, startY + 3 * grid);
    ctx.closePath();
    ctx.fill();
    if (part.accentColor) {
      ctx.fillStyle = part.accentColor;
      ctx.fillRect(startX + 1.5 * grid, startY - 0.3 * grid, grid * 0.5, grid * 0.5);
      ctx.fillRect(startX + 2.5 * grid, startY + 0.8 * grid, grid * 0.4, grid * 0.4);
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  };

  const drawSlot = (ctx: CanvasRenderingContext2D, label: string, y: number, h: number) => {
    ctx.strokeStyle = '#666666';
    ctx.setLineDash([grid * 0.3, grid * 0.3]);
    ctx.lineWidth = 2;
    ctx.strokeRect(4 * grid, y, 8 * grid, h);
    ctx.setLineDash([]);
    if (showSlotLabels) {
      ctx.fillStyle = '#888888';
      ctx.font = `${grid * 0.8}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(label, 8 * grid, y + h / 2 + grid * 0.3);
    }
  };

  return (
    <canvas
      width={canvasSize}
      height={canvasSize}
      style={{
        width: canvasSize,
        height: canvasSize,
        imageRendering: 'pixelated',
        animation: animated ? 'float 2s ease-in-out infinite' : undefined,
      }}
      ref={(canvas) => {
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.clearRect(0, 0, canvasSize, canvasSize);

        if (parts.tail) drawTail(ctx, parts.tail);
        else drawSlot(ctx, '尾巴', 7 * grid, 3 * grid);

        if (parts.legs) drawLegs(ctx, parts.legs);
        else drawSlot(ctx, '腿', 10.5 * grid, 4 * grid);

        if (parts.torso) drawTorso(ctx, parts.torso);
        else drawSlot(ctx, '躯干', 5.5 * grid, 5.5 * grid);

        if (parts.head) drawHead(ctx, parts.head);
        else drawSlot(ctx, '头', 1 * grid, 5 * grid);
      }}
    />
  );
}
