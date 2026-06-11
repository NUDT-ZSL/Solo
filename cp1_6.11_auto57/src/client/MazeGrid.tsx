import React, { useRef, useState, useCallback, useEffect } from 'react';
import { CellType, Hint, Player } from '@shared/types';
import HintBubble from './components/HintBubble';

interface MazeGridProps {
  grid: CellType[][];
  players: Player[];
  hints: Hint[];
  selfPlayerId: string | null;
  cellSize: number;
  disabled?: boolean;
  onToggleObstacle: (x: number, y: number) => void;
  onMovePlayer: (newX: number, newY: number) => void;
  onCellHint: (x: number, y: number) => void;
}

interface DragState {
  playerId: string;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  currentGridX: number;
  currentGridY: number;
}

const MazeGrid: React.FC<MazeGridProps> = ({
  grid,
  players,
  hints,
  selfPlayerId,
  cellSize,
  disabled = false,
  onToggleObstacle,
  onMovePlayer,
  onCellHint,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [hoveredCell, setHoveredCell] = useState<{ x: number; y: number } | null>(null);

  const width = grid[0]?.length || 0;
  const height = grid.length;

  const gridPixelWidth = width * cellSize;
  const gridPixelHeight = height * cellSize;

  const screenToGrid = useCallback(
    (clientX: number, clientY: number): { x: number; y: number } => {
      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return { x: -1, y: -1 };
      const x = Math.floor((clientX - rect.left) / cellSize);
      const y = Math.floor((clientY - rect.top) / cellSize);
      return { x, y };
    },
    [cellSize]
  );

  const clampToGrid = useCallback(
    (x: number, y: number): { x: number; y: number } => {
      return {
        x: Math.max(0, Math.min(width - 1, x)),
        y: Math.max(0, Math.min(height - 1, y)),
      };
    },
    [width, height]
  );

  const isObstacle = useCallback(
    (x: number, y: number): boolean => {
      if (x < 0 || x >= width || y < 0 || y >= height) return true;
      return grid[y][x] === 'obstacle';
    },
    [grid, width, height]
  );

  const isOccupiedByOther = useCallback(
    (x: number, y: number, excludePlayerId: string): boolean => {
      return players.some((p) => p.id !== excludePlayerId && p.x === x && p.y === y);
    },
    [players]
  );

  const handleCellClick = useCallback(
    (x: number, y: number, e: React.MouseEvent) => {
      if (disabled || dragState) return;
      e.preventDefault();

      const playerOnCell = players.find((p) => p.x === x && p.y === y);
      if (playerOnCell) {
        if (e.shiftKey) {
          onCellHint(x, y);
        }
        return;
      }

      if (e.shiftKey) {
        onCellHint(x, y);
      } else {
        onToggleObstacle(x, y);
      }
    },
    [disabled, dragState, players, onToggleObstacle, onCellHint]
  );

  const handleContextMenu = useCallback(
    (x: number, y: number, e: React.MouseEvent) => {
      e.preventDefault();
      if (disabled) return;
      onCellHint(x, y);
    },
    [disabled, onCellHint]
  );

  const startDrag = useCallback(
    (player: Player, e: React.MouseEvent | React.TouchEvent) => {
      if (disabled || player.id !== selfPlayerId) return;
      e.preventDefault();

      let clientX: number;
      let clientY: number;

      if ('touches' in e) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return;

      const playerCenterX = rect.left + player.x * cellSize + cellSize / 2;
      const playerCenterY = rect.top + player.y * cellSize + cellSize / 2;

      setDragState({
        playerId: player.id,
        startX: player.x,
        startY: player.y,
        offsetX: clientX - playerCenterX,
        offsetY: clientY - playerCenterY,
        currentGridX: player.x,
        currentGridY: player.y,
      });
    },
    [disabled, selfPlayerId, cellSize]
  );

  const handleDragMove = useCallback(
    (clientX: number, clientY: number) => {
      if (!dragState) return;

      const rect = gridRef.current?.getBoundingClientRect();
      if (!rect) return;

      const adjustedX = clientX - dragState.offsetX - rect.left;
      const adjustedY = clientY - dragState.offsetY - rect.top;

      const gridX = Math.round(adjustedX / cellSize - 0.5);
      const gridY = Math.round(adjustedY / cellSize - 0.5);

      const clamped = clampToGrid(gridX, gridY);

      if (
        clamped.x !== dragState.currentGridX ||
        clamped.y !== dragState.currentGridY
      ) {
        if (
          !isObstacle(clamped.x, clamped.y) &&
          !isOccupiedByOther(clamped.x, clamped.y, dragState.playerId)
        ) {
          setDragState((prev) =>
            prev
              ? {
                  ...prev,
                  currentGridX: clamped.x,
                  currentGridY: clamped.y,
                }
              : null
          );
        }
      }
    },
    [dragState, cellSize, clampToGrid, isObstacle, isOccupiedByOther]
  );

  const endDrag = useCallback(() => {
    if (!dragState) return;

    if (
      dragState.currentGridX !== dragState.startX ||
      dragState.currentGridY !== dragState.startY
    ) {
      onMovePlayer(dragState.currentGridX, dragState.currentGridY);
    }

    setDragState(null);
  }, [dragState, onMovePlayer]);

  useEffect(() => {
    if (!dragState) return;

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      endDrag();
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        handleDragMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    const handleTouchEnd = () => {
      endDrag();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [dragState, handleDragMove, endDrag]);

  const getPlayerDisplayPosition = (player: Player): { x: number; y: number } => {
    if (dragState && dragState.playerId === player.id) {
      return { x: dragState.currentGridX, y: dragState.currentGridY };
    }
    return { x: player.x, y: player.y };
  };

  return (
    <div className="maze-grid-wrapper">
      <div
        ref={gridRef}
        className="maze-grid"
        style={{
          width: gridPixelWidth,
          height: gridPixelHeight,
          gridTemplateColumns: `repeat(${width}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${height}, ${cellSize}px)`,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
        onMouseMove={(e) => {
          if (!disabled) {
            const pos = screenToGrid(e.clientX, e.clientY);
            if (pos.x >= 0 && pos.x < width && pos.y >= 0 && pos.y < height) {
              setHoveredCell(pos);
            } else {
              setHoveredCell(null);
            }
          }
        }}
        onMouseLeave={() => setHoveredCell(null)}
      >
        {grid.map((row, y) =>
          row.map((cell, x) => {
            const isHovered = hoveredCell?.x === x && hoveredCell?.y === y;
            return (
              <div
                key={`${x}-${y}`}
                className={`maze-cell ${cell} ${isHovered && !disabled ? 'hovered' : ''}`}
                style={{ width: cellSize, height: cellSize }}
                onClick={(e) => handleCellClick(x, y, e)}
                onContextMenu={(e) => handleContextMenu(x, y, e)}
              >
                {cell === 'obstacle' && <div className="obstacle-inner" />}
              </div>
            );
          })
        )}

        {hints.map((hint) => (
          <HintBubble
            key={hint.id}
            hint={hint}
            cellSize={cellSize}
          />
        ))}

        {players.map((player) => {
          const pos = getPlayerDisplayPosition(player);
          const isSelf = player.id === selfPlayerId;
          const isDragging = dragState?.playerId === player.id;
          return (
            <div
              key={player.id}
              className={`player-icon ${isSelf ? 'self' : ''} ${isDragging ? 'dragging' : ''}`}
              style={{
                width: cellSize * 0.7,
                height: cellSize * 0.7,
                left: pos.x * cellSize + cellSize * 0.15,
                top: pos.y * cellSize + cellSize * 0.15,
                backgroundColor: player.color,
                cursor: isSelf && !disabled ? 'grab' : 'default',
              }}
              onMouseDown={(e) => startDrag(player, e)}
              onTouchStart={(e) => startDrag(player, e)}
              title={player.name}
            >
              <span className="player-initial">
                {player.name.charAt(0)}
              </span>
              <div className="player-pulse" style={{ borderColor: player.color }} />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MazeGrid;
