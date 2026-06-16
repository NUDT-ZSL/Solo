import React, { useRef, useEffect, useCallback, useState } from 'react';
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
  onPlaceTower: (coord: HexCoord, type: TowerType) => void;
  onTowerClick: (towerId: string) => void;
  onTowerHover: (towerId: string | null, mouseX: number, mouseY: number) => void;
  hoveredTowerId: string | null;
  mouseX: number;
  mouseY: number;
}

function hexCorner(cx: number, cy: number, size: number, i: number): [number, number] {
  const angleDeg = 60 * i - 30;
  const angleRad = (Math.PI / 180) * angleDeg;
  return [cx + size * Math.cos(angleRad), cy + size * Math.sin(angleRad)];
}

function drawHex(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number,
  fill: string,
  stroke: string,
  lineWidth: number
) {
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
  const w = (size * Math.sqrt(3)) / 2;
  const h = size;
  if (dy > h) return false;
  if (dx > w) return false;
  if (dx <= w / 2) return true;
  return dy <= h - (dx * h) / w;
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
    const timeoutId = setTimeout(() => {
      document.addEventListener('mousedown', handler);
    }, 0);
    return () => {
      clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handler);
    };
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
        userSelect: 'none',
      }}
    >
      {types.map((t) => {
        const info = TOWER_INFO[t];
        return (
          <button
            key={t}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onPlace(t);
            }}
            onMouseDown={(e) => e.stopPropagation()}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              cursor: 'pointer',
              padding: '4px 6px',
              borderRadius: 8,
              transition: 'background 0.2s ease',
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'inherit',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = '#2a2a4e';
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            <canvas
              width={MENU_ICON_SIZE}
              height={MENU_ICON_SIZE}
              style={{ pointerEvents: 'none' }}
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
            <span style={{ color: '#ccc', fontSize: 10, marginTop: 2, whiteSpace: 'nowrap', pointerEvents: 'none' }}>
              {info.name}
            </span>
          </button>
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
  onPlaceTower,
  onTowerClick,
  onTowerHover,
  hoveredTowerId,
  mouseX,
  mouseY,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [placementMenu, setPlacementMenu] = useState<{ coord: HexCoord; x: number; y: number } | null>(null);

  const canvasWidth = GRID_COLS * HEX_HORIZONTAL_SPACING + HEX_HORIZONTAL_SPACING + GRID_OFFSET_X;
  const canvasHeight = GRID_ROWS * HEX_VERTICAL_SPACING + GRID_OFFSET_Y * 2;

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    const tideNorm = (tideState.tideHeight - 0.5) / 4.0;

    for (const coord of HEX_COORDS) {
      const key = `${coord.row},${coord.col}`;
      const hasTower = towers.has(key);
      const fillBase = hasTower ? '#1e2a3e' : '#1a1a2e';
      const r = parseInt(fillBase.slice(1, 3), 16);
      const g = parseInt(fillBase.slice(3, 5), 16);
      const b = parseInt(fillBase.slice(5, 7), 16);
      const tideBoost = Math.round(tideNorm * 25);
      const fill = `rgb(${r},${Math.min(255, g + tideBoost)},${Math.min(255, b + tideBoost + 10)})`;

      drawHex(ctx, coord.pixelX, coord.pixelY, HEX_SIZE, fill, '#263238', 1);
    }

    towers.forEach((tower) => {
      const isSelected = tower.id === selectedTowerId;
      drawTower(ctx, tower, isSelected);
    });
  }, [towers, tideState, selectedTowerId, canvasWidth, canvasHeight]);

  useEffect(() => {
    draw();
  }, [draw]);

  const getHexAt = useCallback(
    (canvasX: number, canvasY: number): HexCoord | null => {
      for (const coord of HEX_COORDS) {
        if (pointInHex(canvasX, canvasY, coord.pixelX, coord.pixelY, HEX_SIZE)) {
          return coord;
        }
      }
      return null;
    },
    []
  );

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const px = (e.clientX - rect.left) * scaleX;
      const py = (e.clientY - rect.top) * scaleY;

      const coord = getHexAt(px, py);
      if (!coord) {
        setPlacementMenu(null);
        return;
      }

      const key = `${coord.row},${coord.col}`;
      if (towers.has(key)) {
        setPlacementMenu(null);
        onTowerClick(towers.get(key)!.id);
      } else {
        const menuCssX = (coord.pixelX / scaleX) - 80;
        const menuCssY = (coord.pixelY / scaleY) - 60;
        setPlacementMenu({ coord, x: menuCssX, y: menuCssY });
      }
    },
    [towers, onTowerClick, getHexAt]
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

      let foundId: string | null = null;
      for (const coord of HEX_COORDS) {
        const key = `${coord.row},${coord.col}`;
        const tower = towers.get(key);
        if (tower && pointInHex(px, py, coord.pixelX, coord.pixelY, HEX_SIZE)) {
          foundId = tower.id;
          break;
        }
      }
      onTowerHover(foundId, e.clientX, e.clientY);
    },
    [towers, onTowerHover]
  );

  const handlePlace = useCallback(
    (type: TowerType) => {
      if (!placementMenu) return;
      onPlaceTower(placementMenu.coord, type);
      setPlacementMenu(null);
    },
    [placementMenu, onPlaceTower]
  );

  const handleCloseMenu = useCallback(() => {
    setPlacementMenu(null);
  }, []);

  const hoveredTower = hoveredTowerId
    ? Array.from(towers.values()).find((t) => t.id === hoveredTowerId) || null
    : null;

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', minWidth: 600, display: 'inline-block' }}
    >
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
          onPlace={handlePlace}
          onClose={handleCloseMenu}
        />
      )}
      {hoveredTower && (
        <HoverCard tower={hoveredTower} mouseX={mouseX} mouseY={mouseY} />
      )}
    </div>
  );
};

export default GameGrid;
