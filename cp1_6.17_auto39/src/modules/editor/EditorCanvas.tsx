import React, { useRef, useEffect, useCallback } from 'react';
import { MapData, TileType, GRID_COLS, GRID_ROWS, TILE_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT, GRID_COLOR, TILE_COLORS } from '../../types';

interface EditorCanvasProps {
  mapData: MapData;
  selectedTile: TileType;
  onMapChange: (mapData: MapData) => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({ mapData, selectedTile, onMapChange }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastCellRef = useRef<{ row: number; col: number } | null>(null);
  const shiftStartRef = useRef<{ row: number; col: number } | null>(null);
  const hoverCellRef = useRef<{ row: number; col: number } | null>(null);
  const drawingWithShiftRef = useRef(false);
  const erasingRef = useRef(false);
  const mapDataRef = useRef(mapData);

  useEffect(() => {
    mapDataRef.current = mapData;
  }, [mapData]);

  const drawGrid = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#161B22';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tile = mapData[row][col];
        if (tile !== 0) {
          ctx.fillStyle = TILE_COLORS[tile];
          ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, TILE_SIZE);

          if (tile === 1) {
            ctx.fillStyle = '#4B5563';
            ctx.fillRect(col * TILE_SIZE, row * TILE_SIZE, TILE_SIZE, 2);
          } else if (tile === 2) {
            ctx.strokeStyle = '#4B5563';
            ctx.lineWidth = 1;
            for (let i = 0; i < TILE_SIZE; i += 6) {
              ctx.beginPath();
              ctx.moveTo(col * TILE_SIZE + i, row * TILE_SIZE);
              ctx.lineTo(col * TILE_SIZE, row * TILE_SIZE + i);
              ctx.stroke();
            }
          } else if (tile === 3) {
            ctx.fillStyle = '#991B1B';
            const cx = col * TILE_SIZE + TILE_SIZE / 2;
            const by = row * TILE_SIZE + TILE_SIZE;
            ctx.beginPath();
            ctx.moveTo(cx, row * TILE_SIZE + 4);
            ctx.lineTo(cx - 8, by);
            ctx.lineTo(cx + 8, by);
            ctx.closePath();
            ctx.fill();
          } else if (tile === 4) {
            ctx.fillStyle = '#F59E0B';
            ctx.beginPath();
            ctx.arc(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2, 8, 0, Math.PI * 2);
            ctx.fill();
            ctx.fillStyle = '#FFD700';
            ctx.beginPath();
            ctx.arc(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2, 5, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    ctx.strokeStyle = GRID_COLOR;
    ctx.lineWidth = 1;
    for (let col = 0; col <= GRID_COLS; col++) {
      ctx.beginPath();
      ctx.moveTo(col * TILE_SIZE + 0.5, 0);
      ctx.lineTo(col * TILE_SIZE + 0.5, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let row = 0; row <= GRID_ROWS; row++) {
      ctx.beginPath();
      ctx.moveTo(0, row * TILE_SIZE + 0.5);
      ctx.lineTo(CANVAS_WIDTH, row * TILE_SIZE + 0.5);
      ctx.stroke();
    }

    const hover = hoverCellRef.current;
    if (hover) {
      ctx.fillStyle = 'rgba(255, 213, 79, 0.3)';
      ctx.fillRect(hover.col * TILE_SIZE, hover.row * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      ctx.strokeStyle = '#FFD54F';
      ctx.lineWidth = 2;
      ctx.strokeRect(hover.col * TILE_SIZE + 1, hover.row * TILE_SIZE + 1, TILE_SIZE - 2, TILE_SIZE - 2);
    }
  }, [mapData]);

  useEffect(() => {
    drawGrid();
  }, [drawGrid]);

  const getCellFromEvent = (e: React.MouseEvent<HTMLCanvasElement>): { row: number; col: number } | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const col = Math.floor(x / TILE_SIZE);
    const row = Math.floor(y / TILE_SIZE);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
    return { row, col };
  };

  const getLinePoints = (r0: number, c0: number, r1: number, c1: number): { row: number; col: number }[] => {
    const points: { row: number; col: number }[] = [];
    let dr = Math.abs(r1 - r0);
    let dc = Math.abs(c1 - c0);
    let sr = r0 < r1 ? 1 : -1;
    let sc = c0 < c1 ? 1 : -1;
    let err = dr - dc;
    let cr = r0;
    let cc = c0;

    while (true) {
      points.push({ row: cr, col: cc });
      if (cr === r1 && cc === c1) break;
      const e2 = 2 * err;
      if (e2 > -dc) {
        err -= dc;
        cr += sr;
      }
      if (e2 < dr) {
        err += dr;
        cc += sc;
      }
    }
    return points;
  };

  const commitChanges = useCallback((changes: Map<number, TileType>) => {
    if (changes.size === 0) return;
    const newMap = mapDataRef.current.map(r => [...r]);
    for (const [key, tile] of changes.entries()) {
      const row = Math.floor(key / GRID_COLS);
      const col = key % GRID_COLS;
      if (row >= 0 && row < GRID_ROWS && col >= 0 && col < GRID_COLS) {
        newMap[row][col] = tile;
      }
    }
    onMapChange(newMap);
  }, [onMapChange]);

  const placePointsOnLine = useCallback((startRow: number, startCol: number, endRow: number, endCol: number, tileType: TileType) => {
    const changes = new Map<number, TileType>();
    const points = getLinePoints(startRow, startCol, endRow, endCol);
    for (const p of points) {
      if (p.row >= 0 && p.row < GRID_ROWS && p.col >= 0 && p.col < GRID_COLS) {
        const key = p.row * GRID_COLS + p.col;
        changes.set(key, tileType);
      }
    }
    commitChanges(changes);
  }, [commitChanges]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const cell = getCellFromEvent(e);
    if (!cell) return;

    isDrawingRef.current = true;
    lastCellRef.current = cell;

    if (e.button === 2) {
      erasingRef.current = true;
    } else {
      erasingRef.current = false;
    }

    if (e.shiftKey && e.button !== 2) {
      drawingWithShiftRef.current = true;
      shiftStartRef.current = cell;
      placePointsOnLine(cell.row, cell.col, cell.row, cell.col, selectedTile);
    } else {
      drawingWithShiftRef.current = false;
      shiftStartRef.current = null;
      const tile = erasingRef.current ? (0 as TileType) : selectedTile;
      placePointsOnLine(cell.row, cell.col, cell.row, cell.col, tile);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const cell = getCellFromEvent(e);
    if (!cell) {
      hoverCellRef.current = null;
      drawGrid();
      return;
    }

    hoverCellRef.current = cell;

    if (isDrawingRef.current && cell) {
      if (drawingWithShiftRef.current && shiftStartRef.current) {
        placePointsOnLine(
          shiftStartRef.current.row,
          shiftStartRef.current.col,
          cell.row,
          cell.col,
          selectedTile
        );
        lastCellRef.current = cell;
      } else {
        if (!lastCellRef.current || lastCellRef.current.row !== cell.row || lastCellRef.current.col !== cell.col) {
          const tile = erasingRef.current ? (0 as TileType) : selectedTile;
          if (lastCellRef.current) {
            placePointsOnLine(
              lastCellRef.current.row,
              lastCellRef.current.col,
              cell.row,
              cell.col,
              tile
            );
          } else {
            placePointsOnLine(cell.row, cell.col, cell.row, cell.col, tile);
          }
          lastCellRef.current = cell;
        }
      }
    }

    drawGrid();
  };

  const handleMouseUp = () => {
    isDrawingRef.current = false;
    lastCellRef.current = null;
    shiftStartRef.current = null;
    drawingWithShiftRef.current = false;
    erasingRef.current = false;
  };

  const handleMouseLeave = () => {
    hoverCellRef.current = null;
    isDrawingRef.current = false;
    lastCellRef.current = null;
    shiftStartRef.current = null;
    drawingWithShiftRef.current = false;
    erasingRef.current = false;
    drawGrid();
  };

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
  };

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      style={{
        width: '100%',
        maxWidth: CANVAS_WIDTH,
        height: 'auto',
        aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
        imageRendering: 'pixelated',
        cursor: 'crosshair',
        border: '1px solid #30363D',
        borderRadius: '4px',
      }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onContextMenu={handleContextMenu}
    />
  );
};
