import React, { useMemo } from 'react';
import { HeroData, Position } from '../types';

interface GameBoardProps {
  boardHeroes: (HeroData | null)[][];
  selectedHeroId: string | null;
  onCellClick: (pos: Position) => void;
  disabled?: boolean;
}

const CELL_SIZE = 80;
const BOARD_PADDING = 4;
const GRID_GAP = 2;

interface FlatUnit {
  id: string;
  hero: HeroData;
  pos: Position;
}

export const GameBoard: React.FC<GameBoardProps> = React.memo(({
  boardHeroes,
  selectedHeroId,
  onCellClick,
  disabled = false,
}) => {
  const size = boardHeroes.length;

  const { cells, units } = useMemo(() => {
    const flatUnits: FlatUnit[] = [];
    const cellData: Array<{ pos: Position; hero: HeroData | null }> = [];

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const h = boardHeroes[y]?.[x] ?? null;
        cellData.push({ pos: { x, y }, hero: h });
        if (h) {
          flatUnits.push({ id: h.id, hero: h, pos: { x, y } });
        }
      }
    }
    return { cells: cellData, units: flatUnits };
  }, [boardHeroes, size]);

  const renderStar = (star: number) => {
    const colors = ['#ffffff', '#fdd835', '#e53935'];
    const color = colors[Math.min(star - 1, colors.length - 1)];
    return (
      <span style={{ ...styles.star, color }}>
        {'★'.repeat(star)}
      </span>
    );
  };

  const boardPx = size * CELL_SIZE + (size - 1) * GRID_GAP + BOARD_PADDING * 2;

  return (
    <div
      style={{
        ...styles.boardContainer,
        width: boardPx,
        height: boardPx,
      }}
    >
      {/* 格子背景层 */}
      <div style={styles.gridLayer}>
        {Array.from({ length: size }).map((_, y) => (
          <div key={`row-${y}`} style={styles.row}>
            {Array.from({ length: size }).map((_, x) => {
              const pos = { x, y };
              const cell = boardHeroes[y]?.[x] ?? null;
              const hasHero = cell !== null;
              const isSelected = cell && cell.id === selectedHeroId;

              return (
                <div
                  key={`c-${x}-${y}`}
                  style={{
                    ...styles.cell,
                    backgroundColor: hasHero ? '#3e2723' : 'transparent',
                    border: isSelected
                      ? '2px solid #fdd835'
                      : hasHero
                      ? '2px solid #5d4037'
                      : '1px solid #2a2a3e',
                    boxShadow: isSelected ? '0 0 12px #fdd835, 0 0 4px #fdd835 inset' : 'none',
                    cursor: disabled ? 'default' : 'pointer',
                  }}
                  onClick={() => {
                    if (!disabled) onCellClick(pos);
                  }}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* 英雄移动层 - 绝对定位平滑移动 */}
      <div style={styles.unitLayer}>
        {units.map(({ hero, pos }) => {
          const isSelected = hero.id === selectedHeroId;
          const isEnemy = hero.isEnemy;
          const left = BOARD_PADDING + pos.x * (CELL_SIZE + GRID_GAP);
          const top = BOARD_PADDING + pos.y * (CELL_SIZE + GRID_GAP);

          return (
            <div
              key={hero.id}
              style={{
                position: 'absolute',
                left: left,
                top: top,
                width: CELL_SIZE,
                height: CELL_SIZE,
                transition: 'left 0.3s ease-out, top 0.3s ease-out, transform 0.2s ease',
                pointerEvents: 'none',
                zIndex: isSelected ? 10 : isEnemy ? 5 : 2,
              }}
            >
              <div style={styles.heroUnit}>
                <div style={styles.starContainer}>
                  {renderStar(hero.star)}
                </div>
                <div style={{
                  ...styles.heroEmoji,
                  filter: isEnemy ? 'drop-shadow(0 0 4px #9c27b0)' : 'drop-shadow(0 0 2px rgba(0,0,0,0.5))',
                }}>
                  {hero.emoji}
                </div>
                <div style={styles.hpBarContainer}>
                  <div
                    style={{
                      ...styles.hpBar,
                      width: `${Math.max(0, (hero.hp / hero.maxHp) * 100)}%`,
                      backgroundColor: isEnemy ? '#9c27b0' : '#4caf50',
                      transition: 'width 0.2s ease-out, background-color 0.2s ease',
                    }}
                  />
                </div>
                <div style={styles.hpText}>
                  {hero.hp}/{hero.maxHp}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});

GameBoard.displayName = 'GameBoard';

const styles: Record<string, React.CSSProperties> = {
  boardContainer: {
    position: 'relative',
    backgroundColor: '#0d0d0d',
    padding: 0,
    borderRadius: 8,
    overflow: 'hidden',
    flexShrink: 0,
  },
  gridLayer: {
    position: 'absolute',
    left: BOARD_PADDING,
    top: BOARD_PADDING,
    right: BOARD_PADDING,
    bottom: BOARD_PADDING,
    zIndex: 1,
  },
  row: {
    display: 'flex',
    marginBottom: GRID_GAP,
  },
  cell: {
    width: CELL_SIZE,
    height: CELL_SIZE,
    marginRight: GRID_GAP,
    position: 'relative',
    borderRadius: 4,
    transition: 'all 0.15s ease',
    userSelect: 'none',
  },
  unitLayer: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  heroUnit: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    position: 'relative',
    transform: 'scale(0.95)',
  },
  starContainer: {
    position: 'absolute',
    top: 2,
    left: 4,
    fontSize: 10,
    zIndex: 2,
  },
  star: {
    textShadow: '1px 1px 2px rgba(0,0,0,0.9), 0 0 3px rgba(0,0,0,0.8)',
    lineHeight: 1,
  },
  heroEmoji: {
    fontSize: 36,
    lineHeight: 1,
    marginTop: 4,
  },
  hpBarContainer: {
    position: 'absolute',
    bottom: 10,
    width: '78%',
    height: 5,
    backgroundColor: 'rgba(0,0,0,0.7)',
    borderRadius: 3,
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.1)',
  },
  hpBar: {
    height: '100%',
  },
  hpText: {
    position: 'absolute',
    bottom: 0,
    fontSize: 9,
    color: '#ffffff',
    textShadow: '1px 1px 2px #000',
    fontFamily: 'monospace',
    fontWeight: 'bold',
  },
};
