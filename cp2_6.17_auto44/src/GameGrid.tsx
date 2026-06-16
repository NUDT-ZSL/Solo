import React, { useRef, useEffect, useCallback } from 'react';
import {
  HexCoord,
  Tower,
  TowerType,
  TideState,
  GRID_ROWS,
  GRID_COLS,
  HEX_SIZE,
  HEX_HORIZONTAL_SPACING,
  HEX_VERTICAL_SPACING,
  TOWER_RADIUS,
  TOWER_INFO,
} from './types';

interface GameGridProps {
  towers: Map<string, Tower>;
  tideState: TideState;
  selectedTowerId: string | null;
  onHexClick: (coord: HexCoord) => void;
  onTowerClick: (towerId: string) => void;
  onTowerHover: (towerId: string | null, mouseX: number, mouseY: number) => void;
  placementMenu: { coord: HexCoord; x: number; y: number } | null;
  onPlaceTower: (type: TowerType) => void;
  onCloseMenu: () => void;
  hoveredTowerId: string | null;
  mouseX: number;
  mouseY: number;
}

function hexCorner(cx: number, cy: number, size: number, i: number): [number, number] {
  const angleDeg = 60 * i - 30;
  const angleRad = (Math.PI / 180) * angleDeg;
  return [cx + size * Math.cos(angleRad), cy + size * Math.sin(angleRad)];
}

function drawHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number, fill: string, stroke: string, lineWidth: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const [x, y] = hexCorner(cx, cy, size, i);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.stroke();
}

function drawTowerIcon(ctx: CanvasRenderingContext2D, type: TowerType, cx: number, cy: number) {
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.fillStyle = '#ffffff';
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  switch (type) {
    case TowerType.TIDAL_TURBINE:
      ctx.beginPath();
      ctx.moveTo(cx, cy - 7);
      ctx.lineTo(cx, cy + 7);
      ctx.moveTo(cx - 4, cy - 3);
      ctx.lineTo(cx, cy - 7);
      ctx.lineTo(cx + 4, cy - 3);
      ctx.moveTo(cx - 4, cy + 3);
      ctx.lineTo(cx, cy + 7);
      ctx.lineTo(cx + 4, cy + 3);
      ctx.stroke();
      break;
    case TowerType.CURRENT_WING:
      ctx.beginPath();
      ctx.moveTo(cx - 7, cy);
      ctx.quadraticCurveTo(cx - 3, cy - 5, cx, cy);
      ctx.quadraticCurveTo(cx + 3, cy + 5, cx + 7, cy);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx - 5, cy + 4);
      ctx.quadraticCurveTo(cx - 1, cy - 1, cx + 2, cy + 4);
      ctx.stroke();
      break;
    case TowerType.OSCILLATING_WATER_COLUMN:
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const x = cx - 7 + (i / 11) * 14;
        const y = cy + Math.sin(i * 0.9) * 4;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      break;
    case TowerType.STORAGE_TOWER:
      ctx.strokeRect(cx - 5, cy - 7, 10, 14);
      ctx.fillRect(cx - 3, cy - 4, 6, 8);
      ctx.strokeRect(cx - 2, cy - 9, 4, 3);
      break;
  }
  ctx.restore();
}

function drawTower(ctx: CanvasRenderingContext2D, tower: Tower, isSelected: boolean) {
  const { pixelX: cx, pixelY: cy } = tower.position;
  const info = TOWER_INFO[tower.type];
  const scale = tower.scaleAnim;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(scale, scale);
  ctx.translate(-cx, -cy);

  ctx.beginPath();
  ctx.arc(cx, cy, TOWER_RADIUS, 0, Math.PI * 2);
  ctx.fillStyle = info.color;
  ctx.fill();
  ctx.strokeStyle = isSelected ? '#ffd54f' : 'rgba(255,255,255,0.3)';
  ctx.lineWidth = isSelected ? 2 : 1;
  ctx.stroke();

  drawTowerIcon(ctx, tower.type, cx, cy);
  ctx.restore();

  if (isSelected) {
    drawHex(ctx, cx, cy, HEX_SIZE, 'transparent', '#ffd54f', 2);
  }
}

const GRID_OFFSET_X = 50;
const GRID_OFFSET_Y = 30;

export function buildHexCoords(): HexCoord[] {
  const coords: HexCoord[] = [];
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const offsetX = row % 2 === 0 ? 0 : HEX_HORIZONTAL_SPACING / 2;
      const px = GRID_OFFSET_X + col * HEX_HORIZONTAL_SPACING + offsetX;
      const py = GRID_OFFSET_Y + row * HEX_VERTICAL_SPACING;
      coords.push({ row, col, pixelX: px, pixelY: py });
    }
  }
  return coords;
}

const HEX_COORDS = buildHexCoords();

function pointInHex(px: number, py: number, cx: number, cy: number, size: number): boolean {
  const dx = Math.abs(px - cx);
  const dy = Math.abs(py - cy);
  if (dx > size || dy > size) return false;
  return size * size - dx * dy * (1 + Math.sqrt(3)) / 2 - dx * dx / 2 > -size * size * 0.3;
}

const MENU_ICON_SIZE = 36;

const TowerMenu: React.FC<{
  x: number;
  y: number;
  onPlace: (type: TowerType) => void;
  onClose: () => void;
}> = ({ x, y, onPlace, onClose }) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const types = [
    TowerType.TIDAL_TURBINE,
    TowerType.CURRENT_WING,
    TowerType.OSCILLATING_WATER_COLUMN,
    TowerType.STORAGE_TOWER,
  ];

  return (
    <div
      ref={menuRef}
      style={{
        position: 'absolute',
        left: x,
        top: y,
        background: '#1a1a2e',
        border: '1px solid #4a4a6a',
        borderRadius: 12,
        padding: 8,
        display: 'flex',
        gap: 6,
        zIndex: 100,
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      }}
    >
      {types.map((t) => {
        const info = TOWER_INFO[t];
        return (
          <div
            key={t}
            onClick={() => onPlace(t)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: 8,
              transition: 'background 0.2s ease',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = '#2a2a4e';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.background = 'transparent';
            }}
          >
            <canvas
              width={MENU_ICON_SIZE}
              height={MENU_ICON_SIZE}
              ref={(canvas) => {
                if (!canvas) return;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;
                ctx.clearRect(0, 0, MENU_ICON_SIZE, MENU_ICON_SIZE);
                ctx.beginPath();
                ctx.arc(MENU_ICON_SIZE / 2, MENU_ICON_SIZE / 2, 14, 0, Math.PI * 2);
                ctx.fillStyle = info.color;
                ctx.fill();
                drawTowerIcon(ctx, t, MENU_ICON_SIZE / 2, MENU_ICON_SIZE / 2);
              }}
            />
            <span style={{ color: '#ccc', fontSize: 10, marginTop: 2, whiteSpace: 'nowrap' }}>
              {info.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};

const HoverCard: React.FC<{
  tower: Tower;
  mouseX: number;
  mouseY: number;
}> = ({ tower, mouseX, mouseY }) => {
  const info = TOWER_INFO[tower.type];
  const cardX = mouseX + 16;
  const cardY = mouseY - 10;
  return (
    <div
      style={{
        position: 'fixed',
        left: cardX,
        top: cardY,
        background: 'rgba(0,0,0,0.85)',
        borderRadius: 8,
        padding: '8px 12px',
        color: '#fff',
        fontSize: 12,
        lineHeight: 1.6,
        pointerEvents: 'none',
        zIndex: 200,
        whiteSpace: 'nowrap',
        boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
      }}
    >
      <div style={{ color: info.color, fontWeight: 'bold' }}>{info.name}</div>
      <div>效率: {(tower.efficiency * 100).toFixed(0)}%</div>
      <div>累计: {tower.accumulatedEnergy.toFixed(1)}</div>
    </div>
  );
};

const GameGrid: React.FC<GameGridProps> = ({
  towers,
  tideState,
  selectedTowerId,
  onHexClick,
  onTowerClick,
  onTowerHover,
  placementMenu,
  onPlaceTower,
  onCloseMenu,
  hoveredTowerId,
  mouseX,
  mouseY,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const canvasWidth = GRID_COLS * HEX_HORIZONTAL_SPACING + HEX_HORIZONTAL_SPACING + GRID_OFFSET_X;
  const canvasHeight = GRID_ROWS * HEX_VERTICAL_SPACING + GRID_OFFSET_Y * 2;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const tideNorm = (tideState.tideHeight - 0.5) / 4.0;
    const tideAlpha = 0.05 + tideNorm * 0.15;

    for (const coord of HEX_COORDS) {
      const key = `${coord.row},${coord.col}`;
      const hasTower = towers.has(key);
      const fillBase = hasTower ? '#1e2a3e' : '#1a1a2e';
      const r = parseInt(fillBase.slice(1, 3), 16);
      const g = parseInt(fillBase.slice(3, 5), 16);
      const b = parseInt(fillBase.slice(5, 7), 16);
      const fill = `rgba(${r},${g + Math.round(tideNorm * 30)},${b + Math.round(tideNorm * 50)},1)`;

      const isTideHighlight = tideNorm > 0.5 && !hasTower;
      const finalFill = isTideHighlight
        ? `rgba(26,36,60,${0.8 + tideAlpha})`
        : fill;

      drawHex(ctx, coord.pixelX, coord.pixelY, HEX_SIZE, finalFill, '#263238', 1);
    }

    towers.forEach((tower) => {
      const isSelected = tower.id === selectedTowerId;
      drawTower(ctx, tower, isSelected);
    });
  }, [towers, tideState, selectedTowerId, canvasWidth, canvasHeight]);

  useEffect(() => {
    draw();
  }, [draw]);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;

      for (const coord of HEX_COORDS) {
        if (pointInHex(px, py, coord.pixelX, coord.pixelY, HEX_SIZE)) {
          const key = `${coord.row},${coord.col}`;
          if (towers.has(key)) {
            onTowerClick(towers.get(key)!.id);
          } else {
            onHexClick(coord);
          }
          return;
        }
      }
    },
    [towers, onHexClick, onTowerClick]
  );

  const handleCanvasMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;

      let found = false;
      for (const coord of HEX_COORDS) {
        const key = `${coord.row},${coord.col}`;
        if (towers.has(key) && pointInHex(px, py, coord.pixelX, coord.pixelY, HEX_SIZE)) {
          onTowerHover(towers.get(key)!.id, e.clientX, e.clientY);
          found = true;
          break;
        }
      }
      if (!found) {
        onTowerHover(null, e.clientX, e.clientY);
      }
    },
    [towers, onTowerHover]
  );

  const hoveredTower = hoveredTowerId ? towers.get(hoveredTowerId) : null;

  return (
    <div ref={containerRef} style={{ position: 'relative', minWidth: 600 }}>
      <canvas
        ref={canvasRef}
        width={canvasWidth}
        height={canvasHeight}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasMouseMove}
        style={{ display: 'block', cursor: 'pointer' }}
      />
      {placementMenu && (
        <TowerMenu
          x={placementMenu.x}
          y={placementMenu.y}
          onPlace={onPlaceTower}
          onClose={onCloseMenu}
        />
      )}
      {hoveredTower && (
        <HoverCard tower={hoveredTower} mouseX={mouseX} mouseY={mouseY} />
      )}
    </div>
  );
};

export default GameGrid;
