import React, { useState, useRef, useEffect, useCallback } from 'react';
import { GRID_SIZE, CellType, Player, Hint, Position } from '../types';

interface MazeGridProps {
  grid: CellType[][];
  players: Player[];
  hints: Hint[];
  currentPlayerId: string;
  editMaze: (type: 'toggle_obstacle' | 'move' | 'add_hint', position: Position, data?: any) => void;
  isReplaying: boolean;
}

const MazeGrid: React.FC<MazeGridProps> = ({
  grid,
  players,
  hints,
  currentPlayerId,
  editMaze,
  isReplaying,
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const [cellSize, setCellSize] = useState(30);
  const [draggedPlayerId, setDraggedPlayerId] = useState<string | null>(null);
  const [dragTargetCell, setDragTargetCell] = useState<Position | null>(null);
  const [hintInputCell, setHintInputCell] = useState<Position | null>(null);
  const [hintText, setHintText] = useState('');
  const [typedHints, setTypedHints] = useState<Map<string, number>>(new Map());

  const typingTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  useEffect(() => {
    const updateSize = () => {
      if (gridRef.current) {
        const containerWidth = gridRef.current.clientWidth - 40;
        const containerHeight = gridRef.current.clientHeight - 40;
        const maxSize = Math.min(containerWidth, containerHeight);
        const size = Math.floor(maxSize / GRID_SIZE);
        setCellSize(Math.max(15, Math.min(size, 40)));
      }
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    hints.forEach((hint) => {
      if (!typedHints.has(hint.id) && !typingTimeoutsRef.current.has(hint.id)) {
        let charIndex = 0;
        const typeNext = () => {
          if (charIndex <= hint.text.length) {
            setTypedHints((prev) => new Map(prev).set(hint.id, charIndex));
            charIndex++;
            if (charIndex <= hint.text.length) {
              const t = setTimeout(typeNext, 40);
              typingTimeoutsRef.current.set(`typing_${hint.id}`, t);
            }
          }
        };
        typeNext();
        const cleanupT = setTimeout(() => {
          setTypedHints((prev) => {
            const next = new Map(prev);
            next.delete(hint.id);
            return next;
          });
          typingTimeoutsRef.current.delete(`typing_${hint.id}`);
        }, hint.duration);
        typingTimeoutsRef.current.set(`cleanup_${hint.id}`, cleanupT);
      }
    });
    return () => {
      typingTimeoutsRef.current.forEach((t) => clearTimeout(t));
      typingTimeoutsRef.current.clear();
    };
  }, [hints]);

  const getCellFromCoords = useCallback(
    (clientX: number, clientY: number): Position | null => {
      if (!gridRef.current) return null;
      const rect = gridRef.current.getBoundingClientRect();
      const offsetX = (rect.width - cellSize * GRID_SIZE) / 2;
      const offsetY = (rect.height - cellSize * GRID_SIZE) / 2;
      const x = Math.floor((clientX - rect.left - offsetX) / cellSize);
      const y = Math.floor((clientY - rect.top - offsetY) / cellSize);
      if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
        return { x, y };
      }
      return null;
    },
    [cellSize]
  );

  const handleGridMouseDown = (e: React.MouseEvent) => {
    if (isReplaying) return;
    const cell = getCellFromCoords(e.clientX, e.clientY);
    if (!cell) return;

    const player = players.find(
      (p) => p.position.x === cell.x && p.position.y === cell.y
    );

    if (player && player.id === currentPlayerId) {
      e.preventDefault();
      setDraggedPlayerId(player.id);
    }
  };

  const handleGridMouseMove = (e: React.MouseEvent) => {
    if (!draggedPlayerId) return;
    const cell = getCellFromCoords(e.clientX, e.clientY);
    if (cell) {
      setDragTargetCell(cell);
    }
  };

  const handleGridMouseUp = (_e: React.MouseEvent) => {
    if (draggedPlayerId && dragTargetCell) {
      const { x, y } = dragTargetCell;
      if (grid[y][x] !== 'obstacle') {
        const otherPlayer = players.find(
          (p) => p.id !== draggedPlayerId && p.position.x === x && p.position.y === y
        );
        if (!otherPlayer) {
          const dragged = players.find((p) => p.id === draggedPlayerId);
          if (dragged && (dragged.position.x !== x || dragged.position.y !== y)) {
            editMaze('move', { x, y });
          }
        }
      }
    }
    setDraggedPlayerId(null);
    setDragTargetCell(null);
  };

  const handleCellClick = (x: number, y: number) => {
    if (isReplaying) return;
    if (draggedPlayerId) return;

    const playerAtCell = players.find(
      (p) => p.position.x === x && p.position.y === y
    );

    if (playerAtCell) {
      setHintInputCell({ x, y });
      setHintText('');
      return;
    }

    if (hintInputCell) {
      if (hintInputCell.x === x && hintInputCell.y === y) {
        return;
      }
      setHintInputCell(null);
    }

    editMaze('toggle_obstacle', { x, y });
  };

  const handleHintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hintInputCell || !hintText.trim()) {
      setHintInputCell(null);
      return;
    }
    editMaze('add_hint', hintInputCell, { text: hintText.trim() });
    setHintInputCell(null);
    setHintText('');
  };

  const renderCell = (x: number, y: number) => {
    const isObstacle = grid[y][x] === 'obstacle';
    const player = players.find((p) => p.position.x === x && p.position.y === y);
    const hint = hints.find((h) => h.position.x === x && h.position.y === y);
    const typedCount = hint ? typedHints.get(hint.id) : 0;
    const isDragTarget =
      dragTargetCell && dragTargetCell.x === x && dragTargetCell.y === y && draggedPlayerId;
    const isHintInputCell = hintInputCell && hintInputCell.x === x && hintInputCell.y === y;
    const isDraggingFromHere = draggedPlayerId && player && player.id === draggedPlayerId;

    return (
      <div
        key={`${x}-${y}`}
        onClick={() => handleCellClick(x, y)}
        style={{
          width: cellSize,
          height: cellSize,
          border: '1px solid rgba(255, 255, 255, 0.08)',
          position: 'relative',
          cursor: isReplaying
            ? 'default'
            : player && player.id === currentPlayerId
            ? 'grab'
            : 'pointer',
          backgroundColor: isObstacle ? '#4E342E' : 'rgba(255,255,255,0.01)',
          boxShadow: isObstacle
            ? 'inset 3px 3px 0px rgba(141, 110, 99, 0.5), inset -2px -2px 6px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0,0,0,0.3)'
            : 'none',
          transition: 'background-color 0.1s ease',
        }}
        onMouseEnter={() => {
          if (draggedPlayerId) {
            setDragTargetCell({ x, y });
          }
        }}
      >
        {isDragTarget && grid[y][x] !== 'obstacle' && (
          <div
            style={{
              position: 'absolute',
              top: '15%',
              left: '15%',
              width: '70%',
              height: '70%',
              borderRadius: '50%',
              border: '2px dashed rgba(255,255,255,0.4)',
              pointerEvents: 'none',
            }}
          />
        )}

        {player && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: isDraggingFromHere
                ? 'translate(-50%, -50%) scale(1.15)'
                : 'translate(-50%, -50%)',
              width: Math.min(cellSize * 0.65, 22),
              height: Math.min(cellSize * 0.65, 22),
              borderRadius: '50%',
              backgroundColor: player.color,
              cursor: player.id === currentPlayerId ? 'grab' : 'default',
              zIndex: 10,
              color: player.color,
              transition: 'transform 0.15s ease',
              animation:
                player.id === currentPlayerId && !isDraggingFromHere
                  ? 'player-pulse 1.5s ease-in-out infinite'
                  : 'player-pulse-soft 2s ease-in-out infinite',
            }}
          />
        )}

        {hint && typedCount !== undefined && typedCount > 0 && (
          <div
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 6px)',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '7px 12px',
              backgroundColor: 'rgba(15, 15, 30, 0.82)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              borderRadius: '10px',
              fontSize: 11,
              whiteSpace: 'nowrap',
              zIndex: 20,
              pointerEvents: 'none',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              color: '#fff',
              boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              maxWidth: '200px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {hint.text.slice(0, typedCount)}
            {typedCount < hint.text.length && (
              <span style={{ opacity: 0.7, animation: 'blink 0.8s infinite' }}>|</span>
            )}
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                border: '6px solid transparent',
                borderTopColor: 'rgba(15, 15, 30, 0.82)',
              }}
            />
          </div>
        )}

        {isHintInputCell && (
          <form
            onSubmit={handleHintSubmit}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              bottom: 'calc(100% + 8px)',
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 30,
            }}
          >
            <input
              type="text"
              value={hintText}
              onChange={(e) => setHintText(e.target.value)}
              placeholder="输入提示..."
              autoFocus
              onBlur={() => setTimeout(() => setHintInputCell(null), 150)}
              style={{
                padding: '8px 12px',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.25)',
                backgroundColor: 'rgba(15, 15, 30, 0.9)',
                backdropFilter: 'blur(6px)',
                color: 'white',
                fontSize: 13,
                width: 160,
                outline: 'none',
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
              }}
            />
          </form>
        )}
      </div>
    );
  };

  const gridWidth = cellSize * GRID_SIZE;
  const gridHeight = cellSize * GRID_SIZE;

  return (
    <div
      ref={gridRef}
      onMouseDown={handleGridMouseDown}
      onMouseMove={handleGridMouseMove}
      onMouseUp={handleGridMouseUp}
      onMouseLeave={handleGridMouseUp}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: gridWidth,
          height: gridHeight,
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, ${cellSize}px)`,
          backgroundColor: 'rgba(255, 255, 255, 0.015)',
          borderRadius: '16px',
          boxShadow:
            '0 12px 48px rgba(0, 0, 0, 0.5), inset 0 0 80px rgba(255, 255, 255, 0.02), 0 0 0 1px rgba(255,255,255,0.05)',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'radial-gradient(circle at 30% 20%, rgba(78, 205, 196, 0.04), transparent 50%), radial-gradient(circle at 70% 80%, rgba(255, 107, 107, 0.04), transparent 50%)',
            pointerEvents: 'none',
          }}
        />
        {Array(GRID_SIZE)
          .fill(null)
          .map((_, y) =>
            Array(GRID_SIZE)
              .fill(null)
              .map((_, x) => renderCell(x, y))
          )}
      </div>

      <style>{`
        @keyframes player-pulse {
          0%, 100% {
            box-shadow: 
              0 0 0 0 currentColor,
              0 0 8px currentColor,
              0 0 16px rgba(255,255,255,0.2);
          }
          50% {
            box-shadow: 
              0 0 0 8px transparent,
              0 0 20px currentColor,
              0 0 40px currentColor,
              0 0 24px rgba(255,255,255,0.3);
          }
        }
        @keyframes player-pulse-soft {
          0%, 100% {
            box-shadow: 0 0 6px currentColor, 0 0 12px rgba(255,255,255,0.15);
          }
          50% {
            box-shadow: 0 0 14px currentColor, 0 0 24px currentColor;
          }
        }
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default MazeGrid;
