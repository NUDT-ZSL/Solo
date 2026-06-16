import React, { useState } from 'react';
import type { Guard, Enemy } from './GameLogic';
import { BOARD_ROWS, BOARD_COLS, MAX_LUCK } from './GameLogic';

interface BoardProps {
  guards: Guard[];
  enemies: Enemy[];
  luck: number;
  lives: number;
  wave: number;
  onCellClick: (row: number, col: number) => void;
  waveInProgress: boolean;
  isCountingDown: boolean;
  countdownNumber: number;
  onStartWave: () => void;
}

const LuckArcIndicator: React.FC<{ luck: number; size: number }> = ({ luck, size }) => {
  const percentage = Math.min(luck / MAX_LUCK, 1);
  const radius = (size / 2) - 4;
  const circumference = 2 * Math.PI * radius;
  const arcLength = circumference * percentage;
  const offset = circumference - arcLength;

  const r = Math.round(255 * (1 - percentage));
  const g = Math.round(215 * percentage);
  const b = 0;
  const arcColor = `rgb(${r}, ${g}, ${b})`;

  return (
    <svg
      width={size}
      height={size}
      style={{
        position: 'absolute',
        top: -8,
        left: -8,
        pointerEvents: 'none',
        zIndex: 5,
        transform: 'rotate(-90deg)',
      }}
    >
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="rgba(255, 255, 255, 0.1)"
        strokeWidth={4}
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={arcColor}
        strokeWidth={4}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{
          transition: 'stroke-dashoffset 0.5s ease, stroke 0.5s ease',
          filter: `drop-shadow(0 0 6px ${arcColor})`,
        }}
      />
    </svg>
  );
};

const RouletteWheel: React.FC<{ luck: number; size: number }> = ({ luck, size }) => {
  const sectors = [
    { color: '#E74C3C', label: '火' },
    { color: '#F39C12', label: '雷' },
    { color: '#2ECC71', label: '木' },
    { color: '#3498DB', label: '水' },
    { color: '#9B59B6', label: '暗' },
    { color: '#1ABC9C', label: '光' },
  ];

  const wheelSize = size;
  const centerSize = size * 0.55;

  return (
    <div style={{ position: 'relative', width: size + 16, height: size + 16 }}>
      <div
        style={{
          position: 'relative',
          width: wheelSize,
          height: wheelSize,
          borderRadius: '50%',
          overflow: 'hidden',
          boxShadow: '0 0 30px rgba(155, 89, 182, 0.5), inset 0 0 20px rgba(0, 0, 0, 0.5)',
          border: '3px solid #4A0E4E',
          margin: 8,
        }}
      >
        {sectors.map((sector, index) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: `conic-gradient(${sector.color} ${index * 60}deg, ${sector.color} ${(index + 1) * 60}deg, transparent ${(index + 1) * 60}deg)`,
              borderRadius: '50%',
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: centerSize,
            height: centerSize,
            background: 'radial-gradient(circle, #1A1A2E 0%, #4A0E4E 100%)',
            borderRadius: '50%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            border: '2px solid rgba(255, 215, 0, 0.3)',
            boxShadow: 'inset 0 0 15px rgba(255, 215, 0, 0.2)',
            zIndex: 2,
          }}
        >
          <div
            style={{
              fontSize: size < 120 ? 20 : 28,
              fontWeight: 'bold',
              color: '#FFD700',
              textShadow: '0 0 10px rgba(255, 215, 0, 0.5)',
              animation: 'luck-pulse 0.5s ease-out',
            }}
          >
            {luck}
          </div>
          <div style={{ fontSize: 10, color: '#bbb', marginTop: 2 }}>气运值</div>
        </div>
      </div>
      <LuckArcIndicator luck={luck} size={size} />
      <div
        style={{
          position: 'absolute',
          top: 3,
          left: 3,
          right: 3,
          bottom: 3,
          borderRadius: '50%',
          border: '2px solid rgba(255, 215, 0, 0.3)',
          pointerEvents: 'none',
          animation: 'ring-spin 10s linear infinite',
        }}
      />
    </div>
  );
};

const GuardDisplay: React.FC<{ guard: Guard }> = React.memo(({ guard }) => {
  const renderGuard = () => {
    const baseStyle: React.CSSProperties = {
      position: 'relative',
      width: 45,
      height: 45,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    };

    const baseFloor: React.CSSProperties = {
      position: 'absolute',
      bottom: -2,
      left: '50%',
      transform: 'translateX(-50%)',
      width: 35,
      height: 10,
      background: 'rgba(255, 255, 255, 0.2)',
      borderRadius: '50%',
    };

    const attackKey = guard.attackAnimationKey;

    switch (guard.type) {
      case 'warrior':
        return (
          <div key={attackKey} style={baseStyle} className="guard-attack-flash">
            <div style={{
              width: 24,
              height: 32,
              background: 'linear-gradient(180deg, #3498DB 0%, #2980B9 100%)',
              borderRadius: 4,
              position: 'relative',
            }} />
            <div style={{
              position: 'absolute',
              right: -12,
              top: 4,
              width: 4,
              height: 20,
              background: 'linear-gradient(180deg, #ECF0F1 0%, #BDC3C7 100%)',
              borderRadius: 2,
              transform: 'rotate(15deg)',
            }} />
            <div style={baseFloor} />
          </div>
        );
      case 'archer':
        return (
          <div key={attackKey} style={baseStyle} className="guard-attack-flash">
            <div style={{
              width: 20,
              height: 28,
              background: 'linear-gradient(180deg, #2ECC71 0%, #27AE60 100%)',
              clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)',
              position: 'relative',
            }} />
            <div style={{
              position: 'absolute',
              left: -10,
              top: 6,
              width: 8,
              height: 24,
              border: '3px solid #D35400',
              borderRadius: '50% 0 0 50%',
              borderRight: 'none',
            }} />
            <div style={baseFloor} />
          </div>
        );
      case 'mage':
        return (
          <div key={attackKey} style={baseStyle} className="guard-attack-flash">
            <div style={{
              width: 28,
              height: 28,
              background: 'radial-gradient(circle, #9B59B6 0%, #8E44AD 100%)',
              borderRadius: '50%',
              position: 'relative',
              boxShadow: '0 0 15px rgba(155, 89, 182, 0.5)',
            }} />
            <div style={{
              position: 'absolute',
              top: -8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 12,
              height: 12,
              background: 'radial-gradient(circle, #E8DAEF 0%, #9B59B6 100%)',
              borderRadius: '50%',
              animation: 'orb-float 1.5s ease-in-out infinite',
              boxShadow: '0 0 10px rgba(232, 218, 239, 0.8)',
            }} />
            <div style={baseFloor} />
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
      style={{
        position: 'absolute',
        left: x - 15,
        top: y - 15,
        width: 30,
        height: 30,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        pointerEvents: 'none',
      }}
    >
      <div style={{
        width: 22,
        height: 22,
        background: 'linear-gradient(135deg, #E74C3C 0%, #C0392B 100%)',
        borderRadius: '50%',
        boxShadow: '0 0 10px rgba(231, 76, 60, 0.5)',
        border: '2px solid #922B21',
      }} />
      <div style={{
        position: 'absolute',
        top: -8,
        left: '50%',
        transform: 'translateX(-50%)',
        width: 26,
        height: 4,
        background: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 2,
        overflow: 'hidden',
      }}>
        <div style={{
          height: '100%',
          background: 'linear-gradient(90deg, #E74C3C 0%, #F39C12 100%)',
          transition: 'width 0.1s ease',
          width: `${hpPercent}%`,
        }} />
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
  onCellClick,
  waveInProgress,
  isCountingDown,
  countdownNumber,
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
            className={`grid-cell ${isHovered ? 'hovered' : ''}`}
            style={{
              left: col * cellSize,
              top: row * cellSize,
              width: cellSize - 4,
              height: cellSize - 4,
            }}
            onMouseEnter={() => setHoveredCell({ row, col })}
            onMouseLeave={() => setHoveredCell(null)}
            onClick={() => {
              if (!isCenter && !guard) {
                onCellClick(row, col);
              }
            }}
          >
            {isCenter && (
              <div style={{
                width: 40,
                height: 40,
                background: 'radial-gradient(circle, #00FFFF 0%, #0066FF 50%, #000066 100%)',
                borderRadius: '50%',
                boxShadow: '0 0 20px rgba(0, 255, 255, 0.6), 0 0 40px rgba(0, 102, 255, 0.4)',
                animation: 'crystal-pulse 2s ease-in-out infinite',
              }} />
            )}
            {guard && <GuardDisplay guard={guard} />}
          </div>
        );
      }
    }
    return cells;
  };

  return (
    <div className="game-board-container">
      <div style={{ display: 'flex', gap: 30, marginBottom: 20, alignItems: 'center' }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '10px 20px',
          borderRadius: 10,
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}>
          <span style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>波次</span>
          <span style={{ fontSize: 24, fontWeight: 'bold', color: '#FFD700' }}>{wave}</span>
        </div>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          background: 'rgba(255, 255, 255, 0.1)',
          padding: '10px 20px',
          borderRadius: 10,
          border: '1px solid rgba(255, 255, 255, 0.2)',
        }}>
          <span style={{ fontSize: 12, color: '#aaa', marginBottom: 4 }}>生命</span>
          <span style={{ fontSize: 24, fontWeight: 'bold', color: '#E74C3C' }}>{lives}</span>
        </div>
        {!waveInProgress && !isCountingDown && wave > 0 && (
          <button
            className="start-wave-btn"
            onClick={onStartWave}
          >
            开始下一波
          </button>
        )}
        {wave === 0 && (
          <button
            className="start-wave-btn start-game"
            onClick={onStartWave}
          >
            开始游戏
          </button>
        )}
      </div>

      {isCountingDown && countdownNumber > 0 && (
        <div style={{
          textAlign: 'center',
          marginBottom: 15,
          fontSize: 22,
          fontWeight: 'bold',
          color: '#E74C3C',
          textShadow: '0 0 10px rgba(231, 76, 60, 0.5)',
          animation: 'countdown-pulse 1s ease-in-out infinite',
        }}>
          下一波敌人即将来袭: {countdownNumber}
        </div>
      )}

      <div className="board-layout">
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 20,
        }}>
          <RouletteWheel luck={luck} size={rouletteSize} />
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 6,
            fontSize: 12,
            color: '#ccc',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#E74C3C', display: 'inline-block' }} />
              火系
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#F39C12', display: 'inline-block' }} />
              雷系
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#2ECC71', display: 'inline-block' }} />
              木系
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#3498DB', display: 'inline-block' }} />
              水系
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#9B59B6', display: 'inline-block' }} />
              暗系
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#1ABC9C', display: 'inline-block' }} />
              光系
            </div>
          </div>
        </div>

        <div
          className="game-board"
          style={{
            width: BOARD_COLS * cellSize,
            height: BOARD_ROWS * cellSize,
          }}
        >
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
          }}>
            {Array.from({ length: BOARD_COLS + 1 }).map((_, i) => (
              <div
                key={`v-${i}`}
                style={{
                  position: 'absolute',
                  left: i * cellSize,
                  width: 1,
                  height: '100%',
                  background: 'rgba(255, 255, 255, 0.1)',
                }}
              />
            ))}
            {Array.from({ length: BOARD_ROWS + 1 }).map((_, i) => (
              <div
                key={`h-${i}`}
                style={{
                  position: 'absolute',
                  top: i * cellSize,
                  height: 1,
                  width: '100%',
                  background: 'rgba(255, 255, 255, 0.1)',
                }}
              />
            ))}
          </div>

          {renderGrid()}

          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            overflow: 'hidden',
            borderRadius: 12,
          }}>
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
