import React, { memo } from 'react';
import { BoardProps, CellState, Position, Particle } from './types';

const Cell = memo(({ 
  cell, 
  x, 
  y, 
  onClick, 
  isPlayer, 
  isAI 
}: { 
  cell: CellState; 
  x: number; 
  y: number; 
  onClick: (x: number, y: number) => void;
  isPlayer: boolean;
  isAI: boolean;
}) => {
  const classNames = ['cell'];
  
  if (cell.type === 'player-start' || cell.type === 'player') classNames.push('player-start');
  if (cell.type === 'ai-start' || cell.type === 'ai') classNames.push('ai-start');
  if (cell.type === 'goal') classNames.push('goal');
  if (cell.type === 'trap') classNames.push('trap');
  if (cell.isFlashing) classNames.push('flashing');
  if (cell.isExploding) classNames.push('exploding');
  if (cell.isPulsing) classNames.push('pulsing');
  if (isPlayer || isAI || cell.type === 'goal') classNames.push('occupied');

  const renderIcon = () => {
    if (isPlayer) return <span className="player-icon">●</span>;
    if (isAI) return <span className="ai-icon">▼</span>;
    if (cell.type === 'trap') return <span className="trap-icon">⚡</span>;
    if (cell.type === 'goal') return <span className="goal-icon">★</span>;
    return null;
  };

  const renderParticles = (particles: Particle[]) => {
    return (
      <div className="particles">
        {particles.map((p) => (
          <span
            key={p.id}
            className="particle"
            style={{
              '--dx': `${p.dx}px`,
              '--dy': `${p.dy}px`,
              left: '50%',
              top: '50%'
            } as React.CSSProperties}
          />
        ))}
      </div>
    );
  };

  return (
    <div 
      className={classNames.join(' ')} 
      onClick={() => onClick(x, y)}
    >
      {renderIcon()}
      {cell.particles && renderParticles(cell.particles)}
    </div>
  );
}, (prevProps, nextProps) => {
  return (
    prevProps.cell === nextProps.cell &&
    prevProps.isPlayer === nextProps.isPlayer &&
    prevProps.isAI === nextProps.isAI
  );
});

Cell.displayName = 'Cell';

const PathRenderer = memo(({ path, cellSize, gap }: { 
  path: Position[]; 
  cellSize: number; 
  gap: number; 
}) => {
  if (path.length < 2) return null;

  const cellWithGap = cellSize + gap;
  const halfCell = cellSize / 2;

  const getPoint = (pos: Position) => ({
    x: pos.x * cellWithGap + halfCell,
    y: pos.y * cellWithGap + halfCell
  });

  let pathD = '';
  path.forEach((pos, index) => {
    const point = getPoint(pos);
    if (index === 0) {
      pathD += `M ${point.x} ${point.y}`;
    } else {
      pathD += ` L ${point.x} ${point.y}`;
    }
  });

  const totalLength = path.reduce((acc, pos, index) => {
    if (index === 0) return 0;
    const prev = path[index - 1];
    return acc + Math.abs(pos.x - prev.x) + Math.abs(pos.y - prev.y);
  }, 0) * cellWithGap;

  const gradientId = `path-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <svg className="path-layer" style={{ width: '100%', height: '100%' }}>
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#00FF88" />
          <stop offset="100%" stopColor="#FF6600" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <path
        d={pathD}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#glow)"
        strokeDasharray={totalLength}
        strokeDashoffset={0}
        style={{
          animation: 'dashDraw 1s ease-out forwards'
        }}
      />
    </svg>
  );
});

PathRenderer.displayName = 'PathRenderer';

export const Board: React.FC<BoardProps> = ({ state, onCellClick, cellSize = 70 }) => {
  const gap = 4;

  const isPlayerAt = (x: number, y: number) => {
    return state.playerPos.x === x && state.playerPos.y === y;
  };

  const isAIAt = (x: number, y: number) => {
    return state.aiPos.x === x && state.aiPos.y === y;
  };

  return (
    <div className="board">
      <PathRenderer path={state.path} cellSize={cellSize} gap={gap} />
      {state.board.map((row, y) =>
        row.map((cell, x) => (
          <Cell
            key={`${x}-${y}`}
            cell={cell}
            x={x}
            y={y}
            onClick={onCellClick}
            isPlayer={isPlayerAt(x, y)}
            isAI={isAIAt(x, y)}
          />
        ))
      )}
      <style>{`
        @keyframes dashDraw {
          from {
            stroke-dashoffset: 1000;
          }
          to {
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </div>
  );
};

export default Board;
