import { useEffect, useRef, useMemo, useCallback } from 'react';
import {
  GameState,
  TileType,
  VIEW_SIZE,
  TILE_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  GamePhase,
} from '../game/types';

interface GameBoardProps {
  gameState: GameState;
  movePlayer: (dx: number, dy: number) => void;
  restartGame: () => void;
}

const COLORS = {
  wall: '#111111',
  corridor: '#333333',
  room: '#222222',
  entrance: '#2a4a2a',
  exit: '#4a4a2a',
  grid: 'rgba(68, 68, 68, 0.4)',
  fog: 'rgba(0, 0, 0, 0.8)',
  player: '#ffffff',
  monster: '#ff3344',
  boss: '#8b0000',
  equipment: '#4488ff',
};

function tileColor(tile: TileType): string {
  switch (tile) {
    case TileType.WALL:
      return COLORS.wall;
    case TileType.CORRIDOR:
      return COLORS.corridor;
    case TileType.ROOM:
      return COLORS.room;
    case TileType.ENTRANCE:
      return COLORS.entrance;
    case TileType.EXIT:
      return COLORS.exit;
    default:
      return COLORS.wall;
  }
}

export function GameBoard({ gameState, movePlayer, restartGame }: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastMoveTimeRef = useRef<number>(0);
  const animFrameRef = useRef(0);

  const { player, map, monsters, equipments, floatingTexts, isBossSpecialAttack, phase } =
    gameState;

  const canvasPixels = VIEW_SIZE * TILE_SIZE;

  const cameraOffset = useMemo(() => {
    const offsetX = Math.max(
      0,
      Math.min(MAP_WIDTH - VIEW_SIZE, player.position.x - Math.floor(VIEW_SIZE / 2))
    );
    const offsetY = Math.max(
      0,
      Math.min(MAP_HEIGHT - VIEW_SIZE, player.position.y - Math.floor(VIEW_SIZE / 2))
    );
    return { x: offsetX, y: offsetY };
  }, [player.position.x, player.position.y]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const now = performance.now();
      if (now - lastMoveTimeRef.current < 50) return;

      let handled = true;
      switch (e.key.toLowerCase()) {
        case 'w':
        case 'arrowup':
          movePlayer(0, -1);
          break;
        case 's':
        case 'arrowdown':
          movePlayer(0, 1);
          break;
        case 'a':
        case 'arrowleft':
          movePlayer(-1, 0);
          break;
        case 'd':
        case 'arrowright':
          movePlayer(1, 0);
          break;
        case 'r':
          if (phase === GamePhase.VICTORY || phase === GamePhase.GAME_OVER) {
            restartGame();
          }
          break;
        default:
          handled = false;
          break;
      }
      if (handled) {
        e.preventDefault();
        lastMoveTimeRef.current = now;
      }
    },
    [movePlayer, restartGame, phase]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      animFrameRef.current += 1;
      const t = animFrameRef.current;

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvasPixels, canvasPixels);

      for (let vy = 0; vy < VIEW_SIZE; vy++) {
        for (let vx = 0; vx < VIEW_SIZE; vx++) {
          const mapX = vx + cameraOffset.x;
          const mapY = vy + cameraOffset.y;

          if (mapX >= 0 && mapX < MAP_WIDTH && mapY >= 0 && mapY < MAP_HEIGHT) {
            const tile = map[mapY][mapX];
            ctx.fillStyle = tileColor(tile);
            ctx.fillRect(vx * TILE_SIZE, vy * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          } else {
            ctx.fillStyle = COLORS.wall;
            ctx.fillRect(vx * TILE_SIZE, vy * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }

          ctx.strokeStyle = COLORS.grid;
          ctx.lineWidth = 1;
          ctx.strokeRect(
            vx * TILE_SIZE + 0.5,
            vy * TILE_SIZE + 0.5,
            TILE_SIZE - 1,
            TILE_SIZE - 1
          );
        }
      }

      const viewCenterX = player.position.x - cameraOffset.x;
      const viewCenterY = player.position.y - cameraOffset.y;
      const viewHalf = Math.floor(VIEW_SIZE / 2);

      for (let vy = 0; vy < VIEW_SIZE; vy++) {
        for (let vx = 0; vx < VIEW_SIZE; vx++) {
          const dist = Math.max(Math.abs(vx - viewCenterX), Math.abs(vy - viewCenterY));
          if (dist > viewHalf - 1) {
            const alpha = Math.min(1, (dist - (viewHalf - 1)) * 0.8 + 0);
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.fillRect(vx * TILE_SIZE, vy * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }
        }
      }

      for (const eq of equipments) {
        const vx = eq.position.x - cameraOffset.x;
        const vy = eq.position.y - cameraOffset.y;
        if (vx < 0 || vx >= VIEW_SIZE || vy < 0 || vy >= VIEW_SIZE) continue;

        const dist = Math.max(
          Math.abs(vx - viewCenterX),
          Math.abs(vy - viewCenterY)
        );
        if (dist > viewHalf) continue;

        const pulse = 0.6 + 0.4 * Math.sin(t * 0.08);
        const cx = vx * TILE_SIZE + TILE_SIZE / 2;
        const cy = vy * TILE_SIZE + TILE_SIZE / 2;
        const size = 10;

        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.fillStyle = COLORS.equipment;
        ctx.beginPath();
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx + size, cy);
        ctx.lineTo(cx, cy + size);
        ctx.lineTo(cx - size, cy);
        ctx.closePath();
        ctx.fill();

        ctx.strokeStyle = '#aaccff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      for (const monster of monsters) {
        if (monster.hp <= 0) continue;

        const vx = monster.position.x - cameraOffset.x;
        const vy = monster.position.y - cameraOffset.y;
        if (vx < 0 || vx >= VIEW_SIZE || vy < 0 || vy >= VIEW_SIZE) continue;

        const dist = Math.max(
          Math.abs(vx - viewCenterX),
          Math.abs(vy - viewCenterY)
        );
        if (dist > viewHalf) continue;

        const cx = vx * TILE_SIZE + TILE_SIZE / 2;
        const cy = vy * TILE_SIZE + TILE_SIZE / 2;
        const radius = monster.isBoss ? 16 : 8;
        const color = monster.isBoss ? COLORS.boss : COLORS.monster;

        let alpha = 1;
        if (monster.isBlinking) {
          alpha = 0.3 + 0.7 * Math.abs(Math.sin(t * 0.8));
        }

        ctx.save();
        ctx.globalAlpha = alpha;

        if (monster.isBoss) {
          const gradient = ctx.createRadialGradient(cx, cy, 4, cx, cy, radius);
          gradient.addColorStop(0, '#ff4444');
          gradient.addColorStop(0.5, color);
          gradient.addColorStop(1, '#5a0000');
          ctx.fillStyle = gradient;
        } else {
          ctx.fillStyle = color;
        }

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        if (!monster.isBoss) {
          ctx.strokeStyle = '#ff9999';
          ctx.lineWidth = 1;
          ctx.stroke();
        } else {
          ctx.strokeStyle = '#ffaaaa';
          ctx.lineWidth = 2;
          ctx.stroke();

          const eyeOffset = 5;
          const eyeY = cy - 2;
          ctx.fillStyle = '#ffff00';
          ctx.beginPath();
          ctx.arc(cx - eyeOffset, eyeY, 2.5, 0, Math.PI * 2);
          ctx.arc(cx + eyeOffset, eyeY, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }

        if (monster.hp < monster.maxHp) {
          const barWidth = monster.isBoss ? 40 : 20;
          const barHeight = 3;
          const barX = cx - barWidth / 2;
          const barY = cy + radius + 3;
          const hpPct = monster.hp / monster.maxHp;

          ctx.fillStyle = '#333';
          ctx.fillRect(barX, barY, barWidth, barHeight);
          ctx.fillStyle = monster.isBoss ? '#ff2222' : '#ff6666';
          ctx.fillRect(barX, barY, barWidth * hpPct, barHeight);
        }

        ctx.restore();
      }

      {
        const vx = player.position.x - cameraOffset.x;
        const vy = player.position.y - cameraOffset.y;
        const cx = vx * TILE_SIZE + TILE_SIZE / 2;
        const cy = vy * TILE_SIZE + TILE_SIZE / 2;
        const radius = 10;

        const gradient = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.7, '#dddddd');
        gradient.addColorStop(1, '#888888');
        ctx.fillStyle = gradient;

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1;
        ctx.stroke();
      }

      for (const ft of floatingTexts) {
        const age = (Date.now() - ft.createdAt) / ft.duration;
        if (age >= 1) continue;

        const vx = ft.worldX - cameraOffset.x;
        const vy = ft.worldY - cameraOffset.y;
        if (vx < 0 || vx >= VIEW_SIZE || vy < 0 || vy >= VIEW_SIZE) continue;

        const cx = vx * TILE_SIZE + TILE_SIZE / 2;
        const cy = vy * TILE_SIZE + TILE_SIZE / 2 - age * 30;
        const alpha = 1 - age;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.font = 'bold 14px Roboto Mono, monospace';
        ctx.fillStyle = ft.color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.strokeStyle = 'rgba(0,0,0,0.8)';
        ctx.lineWidth = 3;
        ctx.strokeText(ft.text, cx, cy);
        ctx.fillText(ft.text, cx, cy);
        ctx.restore();
      }

      if (phase === GamePhase.BOSS) {
        const gradient = ctx.createRadialGradient(
          canvasPixels / 2,
          canvasPixels / 2,
          canvasPixels * 0.3,
          canvasPixels / 2,
          canvasPixels / 2,
          canvasPixels * 0.5
        );
        gradient.addColorStop(0, 'rgba(139, 0, 0, 0)');
        gradient.addColorStop(1, 'rgba(139, 0, 0, 0.35)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasPixels, canvasPixels);
      }

      if (isBossSpecialAttack) {
        ctx.fillStyle = `rgba(255, 0, 0, ${0.4 * Math.abs(Math.sin(t * 0.5))})`;
        ctx.fillRect(0, 0, canvasPixels, canvasPixels);
      }

      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [
    map,
    player.position.x,
    player.position.y,
    monsters,
    equipments,
    floatingTexts,
    cameraOffset.x,
    cameraOffset.y,
    canvasPixels,
    phase,
    isBossSpecialAttack,
  ]);

  const shakeStyle = gameState.isShaking
    ? {
        animation: 'screenShake 0.2s linear',
      }
    : {};

  const overlayContent = () => {
    if (phase === GamePhase.VICTORY) {
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.85)',
            zIndex: 10,
          }}
        >
          <div
            style={{
              padding: '48px 72px',
              border: '3px solid #ffd700',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
              boxShadow: '0 0 60px rgba(255, 215, 0, 0.4)',
              textAlign: 'center',
            }}
          >
            <h1
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '48px',
                fontWeight: 700,
                color: '#ffd700',
                marginBottom: '16px',
                letterSpacing: '4px',
                textShadow: '0 0 20px rgba(255, 215, 0, 0.6)',
              }}
            >
              胜利
            </h1>
            <p
              style={{
                color: '#e0e0e0',
                fontSize: '16px',
                marginBottom: '32px',
                fontFamily: 'Cinzel, serif',
              }}
            >
              你击败了Boss，逃出了暗影回廊！
            </p>
            <button
              onClick={restartGame}
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '18px',
                padding: '12px 32px',
                background: 'linear-gradient(135deg, #ffd700, #b8860b)',
                color: '#1a1a2e',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                letterSpacing: '2px',
                boxShadow: '0 4px 12px rgba(255, 215, 0, 0.4)',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = 'scale(1.05)')
              }
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              重新开始 (R)
            </button>
          </div>
        </div>
      );
    }
    if (phase === GamePhase.GAME_OVER) {
      return (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.85)',
            zIndex: 10,
          }}
        >
          <div
            style={{
              padding: '48px 72px',
              border: '3px solid #8b0000',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #1a1a2e, #2a1a1a)',
              boxShadow: '0 0 60px rgba(139, 0, 0, 0.4)',
              textAlign: 'center',
            }}
          >
            <h1
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '48px',
                fontWeight: 700,
                color: '#ff4444',
                marginBottom: '16px',
                letterSpacing: '4px',
                textShadow: '0 0 20px rgba(255, 68, 68, 0.6)',
              }}
            >
              死亡
            </h1>
            <p
              style={{
                color: '#e0e0e0',
                fontSize: '16px',
                marginBottom: '32px',
                fontFamily: 'Cinzel, serif',
              }}
            >
              你在暗影回廊中陨落...
            </p>
            <button
              onClick={restartGame}
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '18px',
                padding: '12px 32px',
                background: 'linear-gradient(135deg, #8b0000, #5a0000)',
                color: '#e0e0e0',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                letterSpacing: '2px',
                boxShadow: '0 4px 12px rgba(139, 0, 0, 0.4)',
                transition: 'transform 0.15s ease',
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.transform = 'scale(1.05)')
              }
              onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
            >
              重新开始 (R)
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        width: '100%',
        height: '100%',
        background: '#1a1a2e',
        ...shakeStyle,
      }}
    >
      <div
        style={{
          position: 'relative',
          width: canvasPixels,
          height: canvasPixels,
          boxShadow: '0 0 40px rgba(0,0,0,0.8), inset 0 0 30px rgba(0,0,0,0.5)',
          borderRadius: '4px',
          overflow: 'hidden',
          border: '1px solid #333',
        }}
      >
        <canvas
          ref={canvasRef}
          width={canvasPixels}
          height={canvasPixels}
          style={{
            display: 'block',
            width: canvasPixels,
            height: canvasPixels,
            imageRendering: 'pixelated',
          }}
        />
        {overlayContent()}
      </div>

      <style>{`
        @keyframes screenShake {
          0% { transform: translate(0, 0); }
          20% { transform: translate(-2px, 1px); }
          40% { transform: translate(2px, -1px); }
          60% { transform: translate(-1px, -2px); }
          80% { transform: translate(1px, 2px); }
          100% { transform: translate(0, 0); }
        }
      `}</style>
    </div>
  );
}
