import React from 'react';
import { HeroData, Position } from '../types';

interface GameBoardProps {
  boardHeroes: (HeroData | null)[][];
  selectedHeroId: string | null;
  onCellClick: (pos: Position) => void;
  disabled?: boolean;
}

export const GameBoard: React.FC<GameBoardProps> = React.memo(({
  boardHeroes,
  selectedHeroId,
  onCellClick,
  disabled = false,
}) => {
  const boardSize = boardHeroes.length;

  const renderStar = (star: number) => {
    const colors = ['#ffffff', '#fdd835', '#e53935'];
    const color = colors[Math.min(star - 1, colors.length - 1)];
    return (
      <span style={{ ...styles.star, color }}>
        {'★'.repeat(star)}
      </span>
    );
  };

  return (
    <div style={styles.boardContainer}>
      {boardHeroes.map((row, y) => (
        <div key={y} style={styles.row}>
          {row.map((cell, x) => {
            const isSelected = cell && cell.id === selectedHeroId;
            const hasHero = cell !== null;
            const isEnemy = cell?.isEnemy;

            return (
              <div
                key={`${x}-${y}`}
                style={{
                  ...styles.cell,
                  backgroundColor: hasHero ? '#3e2723' : 'transparent',
                  border: isSelected
                    ? '2px solid #fdd835'
                    : hasHero
                    ? '2px solid #5d4037'
                    : '1px solid #2a2a3e',
                  boxShadow: isSelected ? '0 0 10px #fdd835' : 'none',
                  cursor: disabled ? 'default' : 'pointer',
                }}
                onClick={() => {
                  if (!disabled) {
                    onCellClick({ x, y });
                  }
                }}
              >
                {cell && (
                  <div
                    style={{
                      ...styles.heroUnit,
                      transition: 'transform 0.3s ease-out',
                    }}
                  >
                    <div style={styles.starContainer}>
                      {renderStar(cell.star)}
                    </div>
                    <div style={styles.heroEmoji}>
                      {cell.emoji}
                    </div>
                    <div style={styles.hpBarContainer}>
                      <div
                        style={{
                          ...styles.hpBar,
                          width: `${(cell.hp / cell.maxHp) * 100}%`,
                          backgroundColor: isEnemy ? '#9c27b0' : '#4caf50',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
});

GameBoard.displayName = 'GameBoard';

const styles: Record<string, React.CSSProperties> = {
  boardContainer: {
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: '#0d0d0d',
    padding: 4,
    borderRadius: 8,
  },
  row: {
    display: 'flex',
  },
  cell: {
    width: 80,
    height: 80,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    margin: 1,
    borderRadius: 4,
    transition: 'all 0.2s ease',
  },
  heroUnit: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  starContainer: {
    position: 'absolute',
    top: 2,
    left: 4,
    fontSize: 10,
    zIndex: 1,
  },
  star: {
    textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
  },
  heroEmoji: {
    fontSize: 36,
    lineHeight: 1,
  },
  hpBarContainer: {
    position: 'absolute',
    bottom: 4,
    width: '80%',
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    overflow: 'hidden',
  },
  hpBar: {
    height: '100%',
    transition: 'width 0.3s ease',
  },
};
