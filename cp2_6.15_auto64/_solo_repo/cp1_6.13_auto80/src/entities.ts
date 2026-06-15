export const GRID_SIZE = 64;
export const BLOCK_SIZE = 32;
export const MAX_BLOCKS = 12;
export const MAX_TOOLS = 10;
export const MOVE_SPEED = 0.04;

export const COLORS = {
  red: '#ef4444',
  yellow: '#f59e0b',
  green: '#22c55e',
  blue: '#3b82f6',
  conveyor: '#9ca3af',
  sorter: '#a855f7',
  arm: '#14b8a6',
  background: '#f3f4f6',
  gridLine: '#e0e7ff',
  obstacle: '#64748b',
  primary: '#1e40af',
  accent: '#f97316',
  error: '#ef4444',
};

export type BlockColor = 'red' | 'yellow' | 'green' | 'blue';
export type ToolType = 'conveyor' | 'sorter' | 'arm';
export type Direction = 'up' | 'down' | 'left' | 'right';

export interface GridPos {
  x: number;
  y: number;
}

export interface PixelPos {
  x: number;
  y: number;
}

export interface Block {
  id: number;
  color: BlockColor;
  pos: PixelPos;
  gridPos: GridPos;
  targetGridPos: GridPos;
  progress: number;
  isMoving: boolean;
  spawnAnimation: number;
}

export interface Conveyor {
  id: number;
  gridPos: GridPos;
  direction: Direction;
  placementAnimation: number;
}

export interface Sorter {
  id: number;
  gridPos: GridPos;
  colorMap: Record<BlockColor, Direction>;
  placementAnimation: number;
}

export interface Arm {
  id: number;
  gridPos: GridPos;
  rotation: number;
  rotationSpeed: number;
  placementAnimation: number;
}

export interface TargetZone {
  id: number;
  gridPos: GridPos;
  color: BlockColor;
  filled: number;
  required: number;
  celebrateAnimation: number;
}

export interface Obstacle {
  gridPos: GridPos;
}

export interface Level {
  id: number;
  name: string;
  gridSize: { width: number; height: number };
  spawnInterval: number;
  timeLimit: number;
  spawnPoint: GridPos;
  spawnDirection: Direction;
  targetZones: Omit<TargetZone, 'celebrateAnimation'>[];
  obstacles: Obstacle[];
  availableTools: Record<ToolType, number>;
  preplacedConveyors?: Omit<Conveyor, 'placementAnimation'>[];
}

export interface GameState {
  currentLevel: number;
  isRunning: boolean;
  isPaused: boolean;
  isWon: boolean;
  isLost: boolean;
  timeRemaining: number;
  blocks: Block[];
  conveyors: Conveyor[];
  sorters: Sorter[];
  arms: Arm[];
  targetZones: TargetZone[];
  selectedTool: ToolType | null;
  selectedCell: GridPos | null;
  steps: number;
  lastSpawnTime: number;
  blockIdCounter: number;
  toolIdCounter: number;
  availableTools: Record<ToolType, number>;
  hoveredCell: GridPos | null;
}

export function gridToPixel(gridX: number, gridY: number): PixelPos {
  return {
    x: gridX * GRID_SIZE + GRID_SIZE / 2,
    y: gridY * GRID_SIZE + GRID_SIZE / 2,
  };
}

export function pixelToGrid(pixelX: number, pixelY: number): GridPos {
  return {
    x: Math.floor(pixelX / GRID_SIZE),
    y: Math.floor(pixelY / GRID_SIZE),
  };
}

export function getDirectionOffset(dir: Direction): GridPos {
  switch (dir) {
    case 'up': return { x: 0, y: -1 };
    case 'down': return { x: 0, y: 1 };
    case 'left': return { x: -1, y: 0 };
    case 'right': return { x: 1, y: 0 };
  }
}

export function easeOut(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function drawGrid(ctx: CanvasRenderingContext2D, width: number, height: number): void {
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = COLORS.gridLine;
  ctx.lineWidth = 1;

  for (let x = 0; x <= width; x += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

  for (let y = 0; y <= height; y += GRID_SIZE) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
    ctx.stroke();
  }
}

export function drawObstacle(ctx: CanvasRenderingContext2D, obstacle: Obstacle): void {
  const pos = gridToPixel(obstacle.gridPos.x, obstacle.gridPos.y);
  ctx.fillStyle = COLORS.obstacle;
  ctx.beginPath();
  const size = GRID_SIZE - 4;
  ctx.roundRect(pos.x - size / 2, pos.y - size / 2, size, size, 6);
  ctx.fill();

  ctx.fillStyle = '#475569';
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const px = pos.x - size / 2 + 8 + i * 16;
      const py = pos.y - size / 2 + 8 + j * 16;
      ctx.fillRect(px, py, 6, 6);
    }
  }
}

export function drawConveyor(ctx: CanvasRenderingContext2D, conveyor: Conveyor): void {
  const pos = gridToPixel(conveyor.gridPos.x, conveyor.gridPos.y);
  const animOffset = conveyor.placementAnimation > 0 ? -4 * Math.sin(conveyor.placementAnimation * Math.PI) : 0;

  ctx.save();
  ctx.translate(pos.x, pos.y + animOffset);

  let rotation = 0;
  switch (conveyor.direction) {
    case 'right': rotation = 0; break;
    case 'down': rotation = Math.PI / 2; break;
    case 'left': rotation = Math.PI; break;
    case 'up': rotation = -Math.PI / 2; break;
  }
  ctx.rotate(rotation);

  const size = GRID_SIZE - 8;
  ctx.fillStyle = COLORS.conveyor;
  ctx.beginPath();
  ctx.roundRect(-size / 2, -size / 4, size, size / 2, 4);
  ctx.fill();

  ctx.fillStyle = '#6b7280';
  const rollerSize = 6;
  ctx.fillRect(-size / 2 + 4, -rollerSize / 2, rollerSize, rollerSize);
  ctx.fillRect(size / 2 - 4 - rollerSize, -rollerSize / 2, rollerSize, rollerSize);
  ctx.fillRect(-rollerSize / 2, -rollerSize / 2, rollerSize, rollerSize);

  ctx.strokeStyle = '#d1d5db';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 6]);
  ctx.beginPath();
  ctx.moveTo(-size / 2 + 8, 0);
  ctx.lineTo(size / 2 - 8, 0);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.fillStyle = '#4b5563';
  ctx.beginPath();
  ctx.moveTo(size / 2 - 12, -6);
  ctx.lineTo(size / 2 - 4, 0);
  ctx.lineTo(size / 2 - 12, 6);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

export function drawSorter(ctx: CanvasRenderingContext2D, sorter: Sorter): void {
  const pos = gridToPixel(sorter.gridPos.x, sorter.gridPos.y);
  const animOffset = sorter.placementAnimation > 0 ? -4 * Math.sin(sorter.placementAnimation * Math.PI) : 0;

  ctx.save();
  ctx.translate(pos.x, pos.y + animOffset);

  const size = GRID_SIZE - 8;
  ctx.fillStyle = COLORS.sorter;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3 - Math.PI / 6;
    const x = (size / 2) * Math.cos(angle);
    const y = (size / 2) * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#9333ea';
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i * Math.PI) / 3 - Math.PI / 6;
    const x = (size / 2 - 4) * Math.cos(angle);
    const y = (size / 2 - 4) * Math.sin(angle);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();

  const dotPositions: Record<BlockColor, { x: number; y: number }> = {
    red: { x: -12, y: 0 },
    blue: { x: 12, y: 0 },
    green: { x: 0, y: -12 },
    yellow: { x: 0, y: 12 },
  };

  (['red', 'blue', 'green', 'yellow'] as BlockColor[]).forEach(color => {
    const dot = dotPositions[color];
    ctx.fillStyle = COLORS[color];
    ctx.beginPath();
    ctx.arc(dot.x, dot.y, 5, 0, Math.PI * 2);
    ctx.fill();
  });

  ctx.restore();
}

export function drawArm(ctx: CanvasRenderingContext2D, arm: Arm, time: number): void {
  const pos = gridToPixel(arm.gridPos.x, arm.gridPos.y);
  const animOffset = arm.placementAnimation > 0 ? -4 * Math.sin(arm.placementAnimation * Math.PI) : 0;

  ctx.save();
  ctx.translate(pos.x, pos.y + animOffset);

  ctx.fillStyle = '#0d9488';
  ctx.beginPath();
  ctx.arc(0, 0, 8, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.rotate((arm.rotation * Math.PI) / 180);

  ctx.fillStyle = COLORS.arm;
  ctx.beginPath();
  ctx.roundRect(0, -4, 20, 8, 2);
  ctx.fill();

  ctx.save();
  ctx.translate(20, 0);
  ctx.rotate(Math.PI / 2 + Math.sin(time * 3) * 0.3);
  ctx.fillStyle = COLORS.arm;
  ctx.beginPath();
  ctx.roundRect(0, -3, 16, 6, 2);
  ctx.fill();

  ctx.fillStyle = '#0d9488';
  ctx.beginPath();
  ctx.arc(16, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#0d9488';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(13, -6);
  ctx.lineTo(20, 0);
  ctx.lineTo(13, 6);
  ctx.stroke();

  ctx.restore();
  ctx.restore();

  ctx.fillStyle = '#0f766e';
  ctx.beginPath();
  ctx.arc(0, 0, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

export function drawBlock(ctx: CanvasRenderingContext2D, block: Block): void {
  const pos = block.pos;
  const spawnScale = block.spawnAnimation > 0 ? 0.5 + 0.5 * easeOut(1 - block.spawnAnimation) : 1;
  const size = BLOCK_SIZE * spawnScale;

  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 2;

  ctx.fillStyle = COLORS[block.color];
  ctx.beginPath();
  ctx.roundRect(pos.x - size / 2, pos.y - size / 2, size, size, 4);
  ctx.fill();

  ctx.restore();

  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fillRect(pos.x - size / 2 + 4, pos.y - size / 2 + 4, size / 3, size / 6);

  ctx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(pos.x - size / 2, pos.y - size / 2, size, size, 4);
  ctx.stroke();
}

export function drawTargetZone(ctx: CanvasRenderingContext2D, zone: TargetZone): void {
  const pos = gridToPixel(zone.gridPos.x, zone.gridPos.y);
  const size = GRID_SIZE - 4;

  const brightness = zone.celebrateAnimation > 0 ? 1 + 0.5 * Math.sin(zone.celebrateAnimation * Math.PI * 6) : 1;

  ctx.save();

  ctx.fillStyle = COLORS[zone.color] + '40';
  ctx.beginPath();
  ctx.roundRect(pos.x - size / 2, pos.y - size / 2, size, size, 8);
  ctx.fill();

  if (brightness > 1) {
    ctx.filter = `brightness(${brightness})`;
  }

  ctx.strokeStyle = COLORS[zone.color];
  ctx.lineWidth = 3;
  ctx.setLineDash([8, 4]);
  ctx.beginPath();
  ctx.roundRect(pos.x - size / 2, pos.y - size / 2, size, size, 8);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.filter = 'none';

  const innerSize = size - 12;
  for (let i = 0; i < zone.required; i++) {
    const row = Math.floor(i / 3);
    const col = i % 3;
    const bx = pos.x - innerSize / 2 + col * (innerSize / 3 + 2) + 4;
    const by = pos.y - innerSize / 2 + row * (innerSize / 3 + 2) + 4;
    const bs = innerSize / 3 - 4;

    if (i < zone.filled) {
      ctx.fillStyle = COLORS[zone.color];
      ctx.beginPath();
      ctx.roundRect(bx, by, bs, bs, 3);
      ctx.fill();
    } else {
      ctx.strokeStyle = COLORS[zone.color] + '60';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(bx, by, bs, bs, 3);
      ctx.stroke();
    }
  }

  ctx.restore();
}

export function drawSpawnPoint(ctx: CanvasRenderingContext2D, pos: GridPos, direction: Direction): void {
  const pixelPos = gridToPixel(pos.x, pos.y);
  const size = GRID_SIZE - 8;

  ctx.save();
  ctx.translate(pixelPos.x, pixelPos.y);

  ctx.fillStyle = '#dbeafe';
  ctx.strokeStyle = COLORS.primary;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.roundRect(-size / 2, -size / 2, size, size, 8);
  ctx.fill();
  ctx.stroke();

  let rotation = 0;
  switch (direction) {
    case 'right': rotation = 0; break;
    case 'down': rotation = Math.PI / 2; break;
    case 'left': rotation = Math.PI; break;
    case 'up': rotation = -Math.PI / 2; break;
  }
  ctx.rotate(rotation);

  ctx.fillStyle = COLORS.primary;
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('▶', 0, 0);

  ctx.fillStyle = COLORS.primary;
  ctx.font = '10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('入口', 0, -size / 2 + 12);

  ctx.restore();
}

export function drawCellHighlight(
  ctx: CanvasRenderingContext2D,
  cell: GridPos,
  isValid: boolean,
  isSelected: boolean
): void {
  const pos = gridToPixel(cell.x, cell.y);
  const size = GRID_SIZE - 2;

  ctx.save();

  if (isSelected) {
    ctx.strokeStyle = COLORS.accent;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.roundRect(pos.x - size / 2, pos.y - size / 2, size, size, 4);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    ctx.fillStyle = isValid ? 'rgba(30, 64, 175, 0.15)' : 'rgba(239, 68, 68, 0.15)';
    ctx.beginPath();
    ctx.roundRect(pos.x - size / 2, pos.y - size / 2, size, size, 4);
    ctx.fill();

    ctx.strokeStyle = isValid ? COLORS.primary : COLORS.error;
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.roundRect(pos.x - size / 2, pos.y - size / 2, size, size, 4);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  ctx.restore();
}
