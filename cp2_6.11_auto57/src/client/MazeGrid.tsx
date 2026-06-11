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
  const [draggedPlayer, setDraggedPlayer] = useState<Player | null>(null);
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null);
  const [hintInput, setHintInput] = useState<Position | null>(null);
  const [hintText, setHintText] = useState('');
  const [displayedHints, setDisplayedHints] = useState<Map<string, { text: string; chars: number }>>(new Map());
  const hintTimeoutsRef = useRef<Map<string, NodeJS.Timeout>>(new Map());
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
      if (!displayedHints.has(hint.id)) {
        setDisplayedHints((prev) => new Map(prev).set(hint.id, { text: hint.text, chars: 0 }));
        
        const totalChars = hint.text.length;
        let currentChar = 0;
        
        const typeNextChar = () => {
          if (currentChar < totalChars) {
            currentChar++;
            setDisplayedHints((prev) => {
              const next = new Map(prev);
              const existing = next.get(hint.id);
              if (existing) {
                next.set(hint.id, { ...existing, chars: currentChar });
              }
              return next;
            });
            const timeout = setTimeout(typeNextChar, 50);
            typingTimeoutsRef.current.set(hint.id, timeout);
          }
        };
        typeNextChar();

        const cleanupTimeout = setTimeout(() => {
          setDisplayedHints((prev) => {
            const next = new Map(prev);
            next.delete(hint.id);
            return next;
          });
          typingTimeoutsRef.current.delete(hint.id);
          hintTimeoutsRef.current.delete(hint.id);
        }, hint.duration);
        hintTimeoutsRef.current.set(hint.id, cleanupTimeout);
      }
    });

    return () => {
      hintTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
      typingTimeoutsRef.current.forEach((timeout) => clearTimeout(timeout));
    };
  }, [hints]);

  const getGridPosition = useCallback((clientX: number, clientY: number): Position | null => {
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
  }, [cellSize]);

  const handleCellClick = (x: number, y: number, _e: React.MouseEvent) => {
    if (isReplaying) return;
    if (draggedPlayer) return;
    
    const playerAtCell = players.find(
      (p) => p.position.x === x && p.position.y === y
    );
    
    if (playerAtCell) {
      if (playerAtCell.id === currentPlayerId) {
        setHintInput({ x, y });
        setHintText('');
      }
      return;
    }
    
    if (hintInput) {
      setHintInput(null);
      return;
    }
    
    editMaze('toggle_obstacle', { x, y });
  };

  const handlePlayerMouseDown = (player: Player, e: React.MouseEvent) => {
    if (isReplaying) return;
    if (player.id !== currentPlayerId) return;
    e.preventDefault();
    e.stopPropagation();
    setDraggedPlayer(player);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggedPlayer) return;
    const pos = getGridPosition(e.clientX, e.clientY);
    if (pos) {
      setDragPosition(pos);
    }
  };

  const handleMouseUp = (_e: React.MouseEvent) => {
    if (!draggedPlayer || !dragPosition) {
      setDraggedPlayer(null);
      setDragPosition(null);
      return;
    }

    const { x, y } = dragPosition;
    if (grid[y][x] !== 'obstacle') {
      const otherPlayer = players.find(
        (p) => p.id !== draggedPlayer.id && p.position.x === x && p.position.y === y
      );
      if (!otherPlayer) {
        editMaze('move', { x, y });
      }
    }

    setDraggedPlayer(null);
    setDragPosition(null);
  };

  const handleHintSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!hintInput || !hintText.trim()) {
      setHintInput(null);
      return;
    }
    editMaze('add_hint', hintInput, { text: hintText.trim() });
    setHintInput(null);
    setHintText('');
  };

  const renderCell = (x: number, y: number) => {
    const isObstacle = grid[y][x] === 'obstacle';
    const player = players.find((p) => p.position.x === x && p.position.y === y);
    const hint = hints.find((h) => h.position.x === x && h.position.y === y);
    const displayedHint = hint ? displayedHints.get(hint.id) : null;
    const isDragTarget = dragPosition && dragPosition.x === x && dragPosition.y === y;
    const isHintInputCell = hintInput && hintInput.x === x && hintInput.y === y;

    return (
      <div
        key={`${x}-${y}`}
        onClick={(e) => handleCellClick(x, y, e)}
        style={{
          width: cellSize,
          height: cellSize,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          position: 'relative',
          cursor: isReplaying ? 'default' : (player ? (player.id === currentPlayerId ? 'grab' : 'default') : 'pointer'),
          backgroundColor: isObstacle ? '#4E342E' : 'transparent',
          boxShadow: isObstacle ? 'inset 2px 2px 4px rgba(93, 64, 55, 0.8), inset -2px -2px 4px rgba(0, 0, 0, 0.3)' : 'none',
          transition: 'background-color 0.15s ease',
        }}
        onMouseOver={() => {
          if (draggedPlayer) {
            setDragPosition({ x, y });
          }
        }}
      >
        {isDragTarget && draggedPlayer && grid[y][x] !== 'obstacle' && (
          <div
            style={{
              position: 'absolute',
              inset: 2,
              borderRadius: '50%',
              backgroundColor: draggedPlayer.color,
              opacity: 0.4,
            }}
          />
        )}

        {player && (
          <div
            onMouseDown={(e) => handlePlayerMouseDown(player, e)}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: Math.min(cellSize * 0.7, 20),
              height: Math.min(cellSize * 0.7, 20),
              borderRadius: '50%',
              backgroundColor: player.color,
              boxShadow: `0 0 10px ${player.color}, 0 0 20px ${player.color}40`,
              cursor: player.id === currentPlayerId ? 'grab' : 'default',
              zIndex: 10,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        )}

        {displayedHint && (
          <div
            style={{
              position: 'absolute',
              bottom: '110%',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '6px 10px',
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              borderRadius: '8px',
              fontSize: 11,
              whiteSpace: 'nowrap',
              zIndex: 20,
              pointerEvents: 'none',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            {displayedHint.text.slice(0, displayedHint.chars)}
            <div
              style={{
                position: 'absolute',
                top: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                border: '6px solid transparent',
                borderTopColor: 'rgba(0, 0, 0, 0.7)',
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
              bottom: '120%',
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
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                color: 'white',
                fontSize: 13,
                width: 150,
                backdropFilter: 'blur(4px)',
                outline: 'none',
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
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: gridWidth,
          height: gridHeight,
          display: 'grid',
          gridTemplateColumns: `repeat(${GRID_SIZE}, ${cellSize}px)`,
          gridTemplateRows: `repeat(${GRID_SIZE}, ${cellSize}px)`,
          backgroundColor: 'rgba(255, 255, 255, 0.02)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), inset 0 0 60px rgba(255, 255, 255, 0.03)',
          overflow: 'hidden',
        }}
      >
        {Array(GRID_SIZE).fill(null).map((_, y) =>
          Array(GRID_SIZE).fill(null).map((_, x) => renderCell(x, y))
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% {
            box-shadow: 0 0 10px currentColor, 0 0 20px currentColor;
          }
          50% {
            box-shadow: 0 0 20px currentColor, 0 0 40px currentColor, 0 0 60px currentColor;
          }
        }
      `}</style>
    </div>
  );
};

export default MazeGrid;
