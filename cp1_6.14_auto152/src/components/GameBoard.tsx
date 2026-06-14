import React, { useEffect, useState } from 'react';
import type { Cell } from '../types';
import { GRID_SIZE, CELL_PX } from '../GridMap';
import { eventBus } from '../utils/EventBus';

interface GameBoardProps {
  cells: Cell[][];
  playerX: number;
  playerY: number;
  battleMode: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = ({ cells, playerX, playerY, battleMode }) => {
  const [flashingCell, setFlashingCell] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const offFlash = eventBus.on('trap:flash', ({ x, y }) => {
      setFlashingCell({ x, y });
      window.setTimeout(() => setFlashingCell(null), 500);
    });
    return () => offFlash();
  }, []);

  return (
    <div className={`game-board ${battleMode ? 'battle-mode' : ''}`}>
      {cells.map((row, y) =>
        row.map((cell, x) => {
          const isPlayer = playerX === x && playerY === y;
          const isFlashing = flashingCell && flashingCell.x === x && flashingCell.y === y;
          const classes = [
            'cell',
            `type-${cell.type}`,
            cell.visited ? 'visited' : '',
            isPlayer ? 'player-cell' : '',
            isFlashing ? 'trap-flash' : '',
          ].filter(Boolean).join(' ');
          return (
            <div
              key={`${x}-${y}`}
              className={classes}
              style={{ width: CELL_PX, height: CELL_PX }}
            >
              {isPlayer && (
                <div
                  className="player-sprite"
                  style={{
                    width: 32,
                    height: 32,
                    left: `${x * CELL_PX + CELL_PX / 2}px`,
                    top: `${y * CELL_PX + CELL_PX / 2}px`,
                    position: 'absolute',
                    transform: 'translate(-50%, -50%)',
                    transition: 'left 0.3s ease-in-out, top 0.3s ease-in-out',
                  }}
                />
              )}
            </div>
          );
        })
      )}
    </div>
  );
};
