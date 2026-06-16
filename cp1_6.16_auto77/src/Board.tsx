import React, { useState } from 'react';
import type { Guard, Enemy, DiceType } from './GameLogic';
import { BOARD_ROWS, BOARD_COLS, getGuardTypeFromDice } from './GameLogic';
import './Board.css';

interface BoardProps {
  guards: Guard[];
  enemies: Enemy[];
  luck: number;
  lives: number;
  wave: number;
  selectedDice: DiceType | null;
  onCellClick: (row: number, col: number) => void;
  waveInProgress: boolean;
  onStartWave: () => void;
}

const RouletteWheel: React.FC<{ luck: number; size: number }> = ({ luck, size }) => {
  const sectors = [
    { color: '#E74C3C', label: '火' },
    { color: '#F39C12', label: '雷' },
    { color: '#2ECC71', label: '木' },
    { color: '#3498DB', label: '水' },
    { color: '#9B59B6', label: '暗' },
    { color: '#1ABC9C', label: '光' },
  ];

  return (
    <div className="roulette-container" style={{ width: size, height: size }}>
      <div className="roulette-wheel" style={{ width: size, height: size }}>
        {sectors.map((sector, index) => {
          const angle = index * 60;
          return (
            <div
              key={index}
              className="roulette-sector"
              style={{
                background: `conic-gradient(${sector.color} ${angle}deg, ${sector.color} ${angle + 60}deg, transparent ${angle + 60}deg)`,
                borderRadius: '50%',
              }}
            />
          );
        })}
        <div className="roulette-center">
          <div className="luck-value">{luck}</div>
          <div className="luck-label">气运值</div>
        </div>
      </div>
      <div className="roulette-ring" />
    </div>
  );
};

const GuardDisplay: React.FC<{ guard: Guard }> = React.memo(({ guard }) => {
  const renderGuard = () => {
    switch (guard.type) {
      case 'warrior':
        return (
          <div className={`guard warrior ${guard.isAttacking ? 'attacking' : ''}`}>
            <div className="warrior-body" />
            <div className="warrior-sword" />
            <div className="guard-base" />
          </div>
        );
      case 'archer':
        return (
          <div className={`guard archer ${guard.isAttacking ? 'attacking' : ''}`}>
            <div className="archer-body" />
            <div className="archer-bow" />
            <div className="guard-base" />
          </div>
        );
      case 'mage':
        return (
          <div className={`guard mage ${guard.isAttacking ? 'attacking' : ''}`}>
            <div className="mage-body" />
            <div className="mage-orb" />
            <div className="guard-base" />
          </div>
        );
      default:
        return null;
    }
  };

  return renderGuard();
});

const EnemyDisplay: React.FC<{ enemy: Enemy; cellSize: number }> = React.memo(({ enemy, cellSize }) => {
  const x = enemy.x * cellSize;
  const y = enemy.y * cellSize;
  const hpPercent = (enemy.hp / enemy.maxHp) * 100;

  return (
    <div
      className="enemy"
      style={{
        left: x - 15,
        top: y - 15,
        width: 30,
        height: 30,
      }}
    >
      <div className="enemy-body" />
      <div className="enemy-hp-bar">
        <div
          className="enemy-hp-fill"
          style={{ width: `${hpPercent}%` }}
        />
      </div>
    </div>
  );
});

const Board: React.FC<BoardProps> = ({
  guards,
  enemies,
  luck,
  lives,
  wave,
  selectedDice,
  onCellClick,
  waveInProgress,
  onStartWave,
}) => {
  const [hoveredCell, setHoveredCell] = useState<{ row: number; col: number } | null>(null);
  const cellSize = 60;
  const rouletteSize = window.innerWidth < 900 ? 100 : 150;

  const renderGrid = () => {
    const cells = [];
    for (let row = 0; row < BOARD_ROWS; row++) {
      for (let col = 0; col < BOARD_COLS; col++) {
        const guard = guards.find(g => g.row === row && g.col === col);
        const isHovered = hoveredCell?.row === row && hoveredCell?.col === col;
        const isCenter = row === Math.floor(BOARD_ROWS / 2) && col === Math.floor(BOARD_COLS / 2);

        cells.push(
          <div
            key={`${row}-${col}`}
            className={`grid-cell ${isHovered ? 'hovered' : ''} ${selectedDice ? 'placeable' : ''}`}
            style={{
              left: col * cellSize,
              top: row * cellSize,
              width: cellSize - 4,
              height: cellSize - 4,
            }}
            onMouseEnter={() => setHoveredCell({ row, col })}
            onMouseLeave={() => setHoveredCell(null)}
            onClick={() => {
              if (!isCenter && selectedDice && !guard) {
                onCellClick(row, col);
              }
            }}
          >
            {isCenter && <div className="core-crystal" />}
            {guard && <GuardDisplay guard={guard} />}
          </div>
        );
      }
    }
    return cells;
  };

  return (
    <div className="game-board-container">
      <div className="game-info">
        <div className="info-item">
          <span className="info-label">波次</span>
          <span className="info-value">{wave}</span>
        </div>
        <div className="info-item">
          <span className="info-label">生命</span>
          <span className="info-value lives">{lives}</span>
        </div>
        {!waveInProgress && wave > 0 && (
          <button className="start-wave-btn" onClick={onStartWave}>
            开始下一波
          </button>
        )}
        {wave === 0 && (
          <button className="start-wave-btn start-game" onClick={onStartWave}>
            开始游戏
          </button>
        )}
      </div>

      <div className="board-layout">
        <div className="roulette-sidebar">
          <RouletteWheel luck={luck} size={rouletteSize} />
          <div className="sector-legend">
            <div className="legend-item"><span className="legend-dot" style={{ background: '#E74C3C' }} />火系</div>
            <div className="legend-item"><span className="legend-dot" style={{ background: '#F39C12' }} />雷系</div>
            <div className="legend-item"><span className="legend-dot" style={{ background: '#2ECC71' }} />木系</div>
            <div className="legend-item"><span className="legend-dot" style={{ background: '#3498DB' }} />水系</div>
            <div className="legend-item"><span className="legend-dot" style={{ background: '#9B59B6' }} />暗系</div>
            <div className="legend-item"><span className="legend-dot" style={{ background: '#1ABC9C' }} />光系</div>
          </div>
        </div>

        <div
          className="game-board"
          style={{
            width: BOARD_COLS * cellSize,
            height: BOARD_ROWS * cellSize,
          }}
        >
          <div className="grid-lines">
            {Array.from({ length: BOARD_COLS + 1 }).map((_, i) => (
              <div
                key={`v-${i}`}
                className="grid-line vertical"
                style={{ left: i * cellSize }}
              />
            ))}
            {Array.from({ length: BOARD_ROWS + 1 }).map((_, i) => (
              <div
                key={`h-${i}`}
                className="grid-line horizontal"
                style={{ top: i * cellSize }}
              />
            ))}
          </div>

          {renderGrid()}

          <div className="enemies-layer">
            {enemies.map(enemy => (
              <EnemyDisplay key={enemy.id} enemy={enemy} cellSize={cellSize} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Board;
