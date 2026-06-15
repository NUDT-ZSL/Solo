import React, { useMemo, useCallback, useEffect, useRef, useState } from 'react';
import { CELL_SIZE, NUMBER_COLORS, FRAGMENT_DROP_CHANCE } from '../types';
import type { Cell, GameState } from '../core/GameEngine';
import { countRevealed, countFlags, revealAllMines } from '../core/GameEngine';
import type { CardFragment } from '../core/CardSystem';
import { getRandomFragment } from '../core/CardSystem';

interface MinesweeperGridProps {
  gameState: GameState;
  onCellClick: (row: number, col: number) => void;
  onCellRightClick: (row: number, col: number) => void;
  onRestart: () => void;
  onFragmentDrop: (fragment: CardFragment, cellX: number, cellY: number) => void;
  isGameOver: boolean;
  isWin: boolean;
}

interface ShatterPiece {
  id: string;
  x: number;
  y: number;
  dx: number;
  dy: number;
  startTime: number;
}

interface ExplosionState {
  row: number;
  col: number;
  phase: 'flash-white' | 'flash-red' | 'shatter';
  startTime: number;
  pieces: ShatterPiece[];
}

const SHATTER_DURATION = 400;

function playExplosionSound() {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = 150;
    gain.gain.value = 0.3;
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.02);
    setTimeout(() => ctx.close(), 100);
  } catch {}
}

export default function MinesweeperGrid({
  gameState,
  onCellClick,
  onCellRightClick,
  onRestart,
  onFragmentDrop,
  isGameOver,
  isWin
}: MinesweeperGridProps) {
  const [explosions, setExplosions] = useState<Map<string, ExplosionState>>(new Map());
  const [shatterPieces, setShatterPieces] = useState<ShatterPiece[]>([]);
  const animFrameRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  const prevHitMineRef = useRef<{ row: number; col: number } | null>(null);

  const handleLeftClick = useCallback((row: number, col: number) => {
    if (isGameOver || isWin) return;
    const cell = gameState.grid[row]?.[col];
    if (!cell || cell.state !== 'hidden') return;
    onCellClick(row, col);
  }, [isGameOver, isWin, gameState.grid, onCellClick]);

  const handleRightClick = useCallback((e: React.MouseEvent, row: number, col: number) => {
    e.preventDefault();
    if (isGameOver || isWin) return;
    const cell = gameState.grid[row]?.[col];
    if (!cell || cell.state === 'revealed') return;
    onCellRightClick(row, col);
  }, [isGameOver, isWin, gameState.grid, onCellRightClick]);

  useEffect(() => {
    if (!isGameOver) {
      prevHitMineRef.current = null;
      return;
    }
    for (let r = 0; r < gameState.rows; r++) {
      for (let c = 0; c < gameState.cols; c++) {
        const cell = gameState.grid[r][c];
        if (cell.isMine && cell.state === 'revealed') {
          const key = `${r},${c}`;
          if (prevHitMineRef.current?.row === r && prevHitMineRef.current?.col === c) continue;
          prevHitMineRef.current = { row: r, col: c };

          playExplosionSound();

          const pieces: ShatterPiece[] = [
            { id: `${key}-0`, x: c * CELL_SIZE, y: r * CELL_SIZE, dx: -3, dy: -3, startTime: performance.now() },
            { id: `${key}-1`, x: c * CELL_SIZE + CELL_SIZE / 2, y: r * CELL_SIZE, dx: 3, dy: -3, startTime: performance.now() },
            { id: `${key}-2`, x: c * CELL_SIZE, y: r * CELL_SIZE + CELL_SIZE / 2, dx: -3, dy: 3, startTime: performance.now() },
            { id: `${key}-3`, x: c * CELL_SIZE + CELL_SIZE / 2, y: r * CELL_SIZE + CELL_SIZE / 2, dx: 3, dy: 3, startTime: performance.now() }
          ];

          setExplosions(prev => {
            const next = new Map(prev);
            next.set(key, { row: r, col: c, phase: 'flash-white', startTime: performance.now(), pieces });
            return next;
          });
          setShatterPieces(prev => [...prev, ...pieces]);
        }
      }
    }
  }, [isGameOver, gameState.grid, gameState.rows, gameState.cols]);

  useEffect(() => {
    if (shatterPieces.length === 0 && explosions.size === 0) return;

    const animate = () => {
      const now = performance.now();

      setExplosions(prev => {
        const next = new Map(prev);
        let changed = false;
        for (const [key, exp] of next) {
          const elapsed = now - exp.startTime;
          if (exp.phase === 'flash-white' && elapsed > 100) {
            next.set(key, { ...exp, phase: 'flash-red', startTime: now });
            changed = true;
          } else if (exp.phase === 'flash-red' && elapsed > 300) {
            next.set(key, { ...exp, phase: 'shatter', startTime: now });
            changed = true;
          } else if (exp.phase === 'shatter' && elapsed > SHATTER_DURATION) {
            next.delete(key);
            changed = true;
          }
        }
        return changed ? next : prev;
      });

      setShatterPieces(prev => {
        const active = prev.filter(p => now - p.startTime < SHATTER_DURATION);
        return active.length === prev.length ? prev : active;
      });

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [shatterPieces.length > 0, explosions.size > 0]);

  useEffect(() => {
    if (isGameOver) return;
    const grid = gameState.grid;
    for (let r = 0; r < gameState.rows; r++) {
      for (let c = 0; c < gameState.cols; c++) {
        const cell = grid[r][c];
        if (cell.state === 'revealed' && !cell.isMine) {
          if (Math.random() < FRAGMENT_DROP_CHANCE) {
            const fragment = getRandomFragment();
            if (fragment) {
              const cellX = c * CELL_SIZE + CELL_SIZE / 2;
              const cellY = r * CELL_SIZE + CELL_SIZE / 2;
              onFragmentDrop(fragment, cellX, cellY);
            }
          }
        }
      }
    }
  }, [isGameOver, gameState.grid, gameState.rows, gameState.cols, onFragmentDrop]);

  const gridCells = useMemo(() => {
    const cells: React.ReactNode[] = [];
    const grid = gameState.grid;
    for (let r = 0; r < gameState.rows; r++) {
      for (let c = 0; c < gameState.cols; c++) {
        const cell = grid[r][c];
        const key = `${r}-${c}`;

        let content: React.ReactNode = null;
        let style: React.CSSProperties = {
          width: CELL_SIZE,
          height: CELL_SIZE,
          border: '1px solid #555',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '14px',
          fontWeight: 'bold',
          cursor: isGameOver || isWin ? 'default' : 'pointer',
          userSelect: 'none',
          boxSizing: 'border-box',
          position: 'relative'
        };

        if (cell.state === 'hidden') {
          style.background = '#c0c0c0';
          style.borderTop = '3px solid #fff';
          style.borderLeft = '3px solid #fff';
          style.borderRight = '3px solid #808080';
          style.borderBottom = '3px solid #808080';
        } else if (cell.state === 'revealed') {
          if (cell.isMine) {
            style.background = '#bdbdbd';
            content = '💣';
          } else if (cell.adjacentMines > 0) {
            style.background = '#bdbdbd';
            style.color = NUMBER_COLORS[cell.adjacentMines] || '#000';
            content = String(cell.adjacentMines);
          } else {
            style.background = '#bdbdbd';
          }
        } else if (cell.state === 'flagged') {
          style.background = '#c0c0c0';
          style.borderTop = '3px solid #fff';
          style.borderLeft = '3px solid #fff';
          style.borderRight = '3px solid #808080';
          style.borderBottom = '3px solid #808080';
          content = '🚩';
        } else if (cell.state === 'questioned') {
          style.background = '#c0c0c0';
          style.borderTop = '3px solid #fff';
          style.borderLeft = '3px solid #fff';
          style.borderRight = '3px solid #808080';
          style.borderBottom = '3px solid #808080';
          content = '?';
          style.color = '#333';
        }

        cells.push(
          <div
            key={key}
            style={style}
            onClick={() => handleLeftClick(r, c)}
            onContextMenu={(e) => handleRightClick(e, r, c)}
          >
            {content}
          </div>
        );
      }
    }
    return cells;
  }, [gameState.grid, gameState.rows, gameState.cols, isGameOver, isWin, handleLeftClick, handleRightClick]);

  const explosionOverlays = useMemo(() => {
    const overlays: React.ReactNode[] = [];
    for (const [key, exp] of explosions) {
      if (exp.phase === 'flash-white') {
        overlays.push(
          <div
            key={`flash-w-${key}`}
            style={{
              position: 'absolute',
              left: exp.col * CELL_SIZE,
              top: exp.row * CELL_SIZE,
              width: CELL_SIZE,
              height: CELL_SIZE,
              background: 'white',
              pointerEvents: 'none',
              zIndex: 10
            }}
          />
        );
      } else if (exp.phase === 'flash-red') {
        overlays.push(
          <div
            key={`flash-r-${key}`}
            style={{
              position: 'absolute',
              left: exp.col * CELL_SIZE,
              top: exp.row * CELL_SIZE,
              width: CELL_SIZE,
              height: CELL_SIZE,
              background: 'red',
              pointerEvents: 'none',
              zIndex: 10
            }}
          />
        );
      }
    }
    return overlays;
  }, [explosions]);

  const shatterElements = useMemo(() => {
    return shatterPieces.map(piece => {
      const elapsed = performance.now() - piece.startTime;
      const progress = Math.min(elapsed / SHATTER_DURATION, 1);
      const offsetX = piece.dx * progress * 60;
      const offsetY = piece.dy * progress * 60 + progress * progress * 40;
      const rotation = progress * 360 * (piece.dx > 0 ? 1 : -1);
      const opacity = 1 - progress;

      return (
        <div
          key={piece.id}
          style={{
            position: 'absolute',
            left: piece.x,
            top: piece.y,
            width: CELL_SIZE / 2 - 1,
            height: CELL_SIZE / 2 - 1,
            background: '#ff4444',
            transform: `translate(${offsetX}px, ${offsetY}px) rotate(${rotation}deg)`,
            opacity,
            pointerEvents: 'none',
            zIndex: 20
          }}
        />
      );
    });
  }, [shatterPieces]);

  const revealed = countRevealed(gameState.grid);
  const flags = countFlags(gameState.grid);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
      <div style={{ display: 'flex', gap: '16px', alignItems: 'center', fontSize: '14px' }}>
        <span>💣 {gameState.mineCount - flags}</span>
        <span>🟩 {revealed}</span>
        {(isGameOver || isWin) && (
          <button
            onClick={onRestart}
            style={{
              padding: '4px 12px',
              cursor: 'pointer',
              fontSize: '14px',
              border: '1px solid #555',
              borderRadius: '4px',
              background: isWin ? '#4caf50' : '#f44336',
              color: '#fff'
            }}
          >
            {isWin ? '🎉 You Win!' : '💥 Game Over!'} Restart
          </button>
        )}
      </div>
      <div
        ref={containerRef}
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gameState.cols}, ${CELL_SIZE}px)`,
          position: 'relative'
        }}
      >
        {gridCells}
        {explosionOverlays}
        {shatterElements}
      </div>
    </div>
  );
}
