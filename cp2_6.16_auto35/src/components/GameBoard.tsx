import { useEffect, useRef, useMemo, useCallback, useState } from 'react';
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
  const keysHeldRef = useRef<Record<string, boolean>>({});
  const moveAccumulatorRef = useRef(0);
  const interpolatedPlayerRef = useRef({
    x: gameState.player.position.x,
    y: gameState.player.position.y,
  });
  const interpolatedMonstersRef = useRef<
    Record<string, { x: number; y: number }>
  >({});
  const [shakeTick, setShakeTick] = useState(0);

  const { player, map, monsters, equipments, floatingTexts, isBossSpecialAttack, phase } =
    gameState;

  const canvasPixels = VIEW_SIZE * TILE_SIZE;

  const cameraOffset = useMemo(() => {
    const offsetX = Math.max(
      0,
      Math.min(
        MAP_WIDTH - VIEW_SIZE,
        Math.floor(interpolatedPlayerRef.current.x) - Math.floor(VIEW_SIZE / 2)
      )
    );
    const offsetY = Math.max(
      0,
      Math.min(
        MAP_HEIGHT - VIEW_SIZE,
        Math.floor(interpolatedPlayerRef.current.y) - Math.floor(VIEW_SIZE / 2)
      )
    );
    return { x: offsetX, y: offsetY };
  }, [player.position.x, player.position.y, interpolatedPlayerRef.current.x, interpolatedPlayerRef.current.y]);

  const tryMoveFromKey = useCallback(() => {
    let dx = 0;
    let dy = 0;
    if (keysHeldRef.current['w'] || keysHeldRef.current['arrowup']) dy = -1;
    else if (keysHeldRef.current['s'] || keysHeldRef.current['arrowdown']) dy = 1;
    else if (keysHeldRef.current['a'] || keysHeldRef.current['arrowleft']) dx = -1;
    else if (keysHeldRef.current['d'] || keysHeldRef.current['arrowright']) dx = 1;

    if (dx !== 0 || dy !== 0) {
      movePlayer(dx, dy);
    }
  }, [movePlayer]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();

      if (
        key === 'r' &&
        (phase === GamePhase.VICTORY || phase === GamePhase.GAME_OVER)
      ) {
        restartGame();
        e.preventDefault();
        return;
      }

      if (
        key !== 'w' &&
        key !== 'a' &&
        key !== 's' &&
        key !== 'd' &&
        key !== 'arrowup' &&
        key !== 'arrowdown' &&
        key !== 'arrowleft' &&
        key !== 'arrowright'
      ) {
        return;
      }

      const now = performance.now();
      if (now - lastMoveTimeRef.current < 50) return;

      keysHeldRef.current[key] = true;

      let dx = 0;
      let dy = 0;
      if (key === 'w' || key === 'arrowup') dy = -1;
      else if (key === 's' || key === 'arrowdown') dy = 1;
      else if (key === 'a' || key === 'arrowleft') dx = -1;
      else if (key === 'd' || key === 'arrowright') dx = 1;

      if (dx !== 0 || dy !== 0) {
        movePlayer(dx, dy);
        lastMoveTimeRef.current = now;
        moveAccumulatorRef.current = 0;
      }
      e.preventDefault();
    },
    [movePlayer, restartGame, phase]
  );

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    keysHeldRef.current[key] = false;
  }, []);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [handleKeyDown, handleKeyUp]);

  useEffect(() => {
    interpolatedPlayerRef.current = {
      x: player.position.x,
      y: player.position.y,
    };
  }, [player.position.x, player.position.y]);

  useEffect(() => {
    for (const m of monsters) {
      if (!interpolatedMonstersRef.current[m.id]) {
        interpolatedMonstersRef.current[m.id] = { x: m.position.x, y: m.position.y };
      } else {
        interpolatedMonstersRef.current[m.id].x = m.position.x;
        interpolatedMonstersRef.current[m.id].y = m.position.y;
      }
    }
  }, [monsters]);

  useEffect(() => {
    if (gameState.isShaking) {
      setShakeTick((t) => t + 1);
    }
  }, [gameState.isShaking]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      animFrameRef.current += 1;
      const t = animFrameRef.current;

      const playerInterp = interpolatedPlayerRef.current;
      const playerTargetX = gameState.player.position.x;
      const playerTargetY = gameState.player.position.y;
      const moveSpeed = 0.2;

      playerInterp.x += (playerTargetX - playerInterp.x) * moveSpeed * 2;
      playerInterp.y += (playerTargetY - playerInterp.y) * moveSpeed * 2;

      moveAccumulatorRef.current += 1;
      if (moveAccumulatorRef.current > 8) {
        const anyHeld = Object.values(keysHeldRef.current).some((v) => v);
        if (anyHeld && performance.now() - lastMoveTimeRef.current >= 120) {
          tryMoveFromKey();
          lastMoveTimeRef.current = performance.now();
        }
        moveAccumulatorRef.current = 0;
      }

      const camOffsetX = Math.max(
        0,
        Math.min(
          MAP_WIDTH - VIEW_SIZE,
          Math.floor(playerInterp.x) - Math.floor(VIEW_SIZE / 2)
        )
      );
      const camOffsetY = Math.max(
        0,
        Math.min(
          MAP_HEIGHT - VIEW_SIZE,
          Math.floor(playerInterp.y) - Math.floor(VIEW_SIZE / 2)
        )
      );

      let shakeDx = 0;
      let shakeDy = 0;
      if (gameState.isShaking) {
        const intensity = 2;
        shakeDx = (Math.sin(t * 2.5) * intensity) | 0;
        shakeDy = (Math.cos(t * 3.1) * intensity) | 0;
      }

      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, canvasPixels, canvasPixels);
      ctx.save();
      ctx.translate(shakeDx, shakeDy);

      for (let vy = 0; vy < VIEW_SIZE; vy++) {
        for (let vx = 0; vx < VIEW_SIZE; vx++) {
          const mapX = vx + camOffsetX;
          const mapY = vy + camOffsetY;

          if (mapX >= 0 && mapX < MAP_WIDTH && mapY >= 0 && mapY < MAP_HEIGHT) {
            const tile = map[mapY][mapX];
            ctx.fillStyle = tileColor(tile);
            ctx.fillRect(vx * TILE_SIZE, vy * TILE_SIZE, TILE_SIZE, TILE_SIZE);

            if (tile === TileType.EXIT) {
              const pulse = 0.5 + 0.5 * Math.sin(t * 0.1);
              ctx.fillStyle = `rgba(255, 215, 0, ${pulse * 0.3})`;
              ctx.fillRect(vx * TILE_SIZE, vy * TILE_SIZE, TILE_SIZE, TILE_SIZE);
              ctx.strokeStyle = `rgba(255, 215, 0, ${pulse})`;
              ctx.lineWidth = 2;
              ctx.strokeRect(
                vx * TILE_SIZE + 2,
                vy * TILE_SIZE + 2,
                TILE_SIZE - 4,
                TILE_SIZE - 4
              );
            }
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

      const viewCenterX = playerInterp.x - camOffsetX;
      const viewCenterY = playerInterp.y - camOffsetY;
      const viewHalf = Math.floor(VIEW_SIZE / 2);

      for (let vy = 0; vy < VIEW_SIZE; vy++) {
        for (let vx = 0; vx < VIEW_SIZE; vx++) {
          const dist = Math.max(
            Math.abs(vx - viewCenterX),
            Math.abs(vy - viewCenterY)
          );
          if (dist > viewHalf - 2) {
            const alpha = Math.min(0.92, (dist - (viewHalf - 2)) * 0.28);
            ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
            ctx.fillRect(vx * TILE_SIZE, vy * TILE_SIZE, TILE_SIZE, TILE_SIZE);
          }
        }
      }

      for (const eq of equipments) {
        const vx = eq.position.x - camOffsetX;
        const vy = eq.position.y - camOffsetY;
        if (vx < 0 || vx >= VIEW_SIZE || vy < 0 || vy >= VIEW_SIZE) continue;

        const dist = Math.max(
          Math.abs(vx - viewCenterX),
          Math.abs(vy - viewCenterY)
        );
        if (dist > viewHalf) continue;

        const pulse = 0.55 + 0.45 * Math.sin(t * 0.12);
        const cx = vx * TILE_SIZE + TILE_SIZE / 2;
        const cy = vy * TILE_SIZE + TILE_SIZE / 2;
        const size = 11 + Math.sin(t * 0.1) * 1.5;

        ctx.save();
        ctx.globalAlpha = pulse;
        ctx.shadowColor = '#4488ff';
        ctx.shadowBlur = 10;
        ctx.fillStyle = COLORS.equipment;
        ctx.beginPath();
        ctx.moveTo(cx, cy - size);
        ctx.lineTo(cx + size, cy);
        ctx.lineTo(cx, cy + size);
        ctx.lineTo(cx - size, cy);
        ctx.closePath();
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#bbdcff';
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.restore();
      }

      for (const monster of monsters) {
        if (monster.hp <= 0) continue;

        const monsterInterp = interpolatedMonstersRef.current[monster.id] || {
          x: monster.position.x,
          y: monster.position.y,
        };

        const vx = monsterInterp.x - camOffsetX;
        const vy = monsterInterp.y - camOffsetY;
        if (vx < -0.5 || vx >= VIEW_SIZE + 0.5 || vy < -0.5 || vy >= VIEW_SIZE + 0.5)
          continue;

        const dist = Math.max(
          Math.abs(vx - viewCenterX),
          Math.abs(vy - viewCenterY)
        );
        if (dist > viewHalf + 1) continue;

        const cx = vx * TILE_SIZE + TILE_SIZE / 2;
        const cy = vy * TILE_SIZE + TILE_SIZE / 2;
        const radius = monster.isBoss ? 18 : 9;
        const color = monster.isBoss ? COLORS.boss : COLORS.monster;

        let alpha = 1;
        if (monster.isBlinking) {
          alpha = 0.15 + 0.85 * Math.abs(Math.sin(t * 1.2));
        }

        ctx.save();
        ctx.globalAlpha = alpha;

        if (monster.isBoss) {
          ctx.shadowColor = '#ff0000';
          ctx.shadowBlur = 18;
          const gradient = ctx.createRadialGradient(cx, cy, 3, cx, cy, radius);
          gradient.addColorStop(0, '#ff6666');
          gradient.addColorStop(0.5, color);
          gradient.addColorStop(1, '#4a0000');
          ctx.fillStyle = gradient;
        } else {
          ctx.shadowColor = '#ff3344';
          ctx.shadowBlur = 8;
          ctx.fillStyle = color;
        }

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        if (!monster.isBoss) {
          ctx.strokeStyle = '#ffaabb';
          ctx.lineWidth = 1.5;
          ctx.stroke();
        } else {
          ctx.strokeStyle = '#ffcccc';
          ctx.lineWidth = 2.5;
          ctx.stroke();

          const eyeOffset = 6;
          const eyeY = cy - 3;
          ctx.fillStyle = '#ffff00';
          ctx.shadowColor = '#ffff00';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.arc(cx - eyeOffset, eyeY, 3, 0, Math.PI * 2);
          ctx.arc(cx + eyeOffset, eyeY, 3, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 0;
          ctx.fillStyle = '#000';
          ctx.beginPath();
          ctx.arc(cx - eyeOffset, eyeY, 1.5, 0, Math.PI * 2);
          ctx.arc(cx + eyeOffset, eyeY, 1.5, 0, Math.PI * 2);
          ctx.fill();
        }

        if (monster.hp < monster.maxHp) {
          const barWidth = monster.isBoss ? 50 : 26;
          const barHeight = monster.isBoss ? 5 : 4;
          const barX = cx - barWidth / 2;
          const barY = cy + radius + (monster.isBoss ? 6 : 4);
          const hpPct = monster.hp / monster.maxHp;

          ctx.fillStyle = '#222';
          ctx.fillRect(barX, barY, barWidth, barHeight);
          ctx.strokeStyle = 'rgba(255,255,255,0.2)';
          ctx.lineWidth = 1;
          ctx.strokeRect(barX, barY, barWidth, barHeight);
          ctx.fillStyle = monster.isBoss ? '#ff1111' : '#ff5555';
          ctx.fillRect(barX, barY, barWidth * hpPct, barHeight);
        }

        ctx.restore();
      }

      {
        const vx = playerInterp.x - camOffsetX;
        const vy = playerInterp.y - camOffsetY;
        const cx = vx * TILE_SIZE + TILE_SIZE / 2;
        const cy = vy * TILE_SIZE + TILE_SIZE / 2;
        const radius = 11;

        ctx.save();
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 12;
        const gradient = ctx.createRadialGradient(cx, cy, 2, cx, cy, radius);
        gradient.addColorStop(0, '#ffffff');
        gradient.addColorStop(0.6, '#e8e8e8');
        gradient.addColorStop(1, '#999999');
        ctx.fillStyle = gradient;

        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();

        ctx.shadowBlur = 0;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      for (const ft of floatingTexts) {
        const age = (Date.now() - ft.createdAt) / ft.duration;
        if (age >= 1) continue;

        const vx = ft.worldX - camOffsetX;
        const vy = ft.worldY - camOffsetY;
        if (vx < -0.5 || vx >= VIEW_SIZE + 0.5 || vy < -0.5 || vy >= VIEW_SIZE + 0.5)
          continue;

        const dist = Math.max(
          Math.abs(vx - viewCenterX),
          Math.abs(vy - viewCenterY)
        );
        if (dist > viewHalf + 2) continue;

        const cx = vx * TILE_SIZE + TILE_SIZE / 2;
        const floatAmt = age * 55;
        const cy = vy * TILE_SIZE + TILE_SIZE / 2 - floatAmt;
        const scale = 1 + age * 0.3;
        const alpha = age < 0.8 ? 1 - age * age : (1 - age) * 5;

        ctx.save();
        ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
        ctx.translate(cx, cy);
        ctx.scale(scale, scale);
        ctx.font = 'bold 20px Roboto Mono, monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        ctx.shadowColor = ft.color;
        ctx.shadowBlur =12;
        ctx.strokeStyle = 'rgba(0,0,0,0.9)';
        ctx.lineWidth = 4;
        ctx.strokeText(ft.text, 0, 0);
        ctx.fillStyle = ft.color;
        ctx.fillText(ft.text, 0, 0);
        ctx.restore();
      }

      if (phase === GamePhase.BOSS) {
        const gradient = ctx.createRadialGradient(
          canvasPixels / 2,
          canvasPixels / 2,
          canvasPixels * 0.25,
          canvasPixels / 2,
          canvasPixels / 2,
          canvasPixels * 0.55
        );
        gradient.addColorStop(0, 'rgba(139, 0, 0, 0)');
        gradient.addColorStop(1, `rgba(139, 0, 0, ${0.45 + 0.1 * Math.sin(t * 0.06)})`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvasPixels, canvasPixels);
      }

      if (isBossSpecialAttack) {
        const flash = 0.55 + 0.45 * Math.abs(Math.sin(t * 0.8));
        ctx.save();
        ctx.globalAlpha = flash;
        ctx.fillStyle = '#ff0000';
        ctx.fillRect(0, 0, canvasPixels, canvasPixels);

        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + t * 0.1;
          const dist = 40 + Math.sin(t * 0.3 + i) * 20;
          const cx = canvasPixels / 2 + Math.cos(angle) * dist;
          const cy = canvasPixels / 2 + Math.sin(angle) * dist;
          const lightningGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60);
          lightningGrad.addColorStop(0, 'rgba(255, 80, 80, 0.6)');
          lightningGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
          ctx.fillStyle = lightningGrad;
          ctx.fillRect(cx - 60, cy - 60, 120, 120);
        }
        ctx.restore();
      }

      ctx.restore();
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
    monsters,
    equipments,
    floatingTexts,
    canvasPixels,
    phase,
    isBossSpecialAttack,
    gameState.isShaking,
    gameState.player.position.x,
    gameState.player.position.y,
    tryMoveFromKey,
  ]);

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
            background: 'rgba(0,0,0,0.88)',
            zIndex: 10,
          }}
        >
          <div
            style={{
              padding: '48px 72px',
              border: '3px solid #ffd700',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
              boxShadow:
                '0 0 80px rgba(255, 215, 0, 0.5), inset 0 0 30px rgba(255, 215, 0, 0.1)',
              textAlign: 'center',
            }}
          >
            <h1
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '52px',
                fontWeight: 700,
                color: '#ffd700',
                marginBottom: '16px',
                letterSpacing: '6px',
                textShadow:
                  '0 0 30px rgba(255, 215, 0, 0.8), 0 0 60px rgba(255, 215, 0, 0.4)',
              }}
            >
              胜 利
            </h1>
            <p
              style={{
                color: '#e0e0e0',
                fontSize: '17px',
                marginBottom: '32px',
                fontFamily: 'Cinzel, serif',
                letterSpacing: '1px',
              }}
            >
              你击败了暗影回廊之主，重见光明！
            </p>
            <button
              onClick={restartGame}
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '18px',
                padding: '14px 36px',
                background: 'linear-gradient(135deg, #ffd700, #b8860b)',
                color: '#1a1a2e',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                letterSpacing: '3px',
                boxShadow: '0 6px 20px rgba(255, 215, 0, 0.5)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.06)';
                e.currentTarget.style.boxShadow =
                  '0 8px 28px rgba(255, 215, 0, 0.7)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow =
                  '0 6px 20px rgba(255, 215, 0, 0.5)';
              }}
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
            background: 'rgba(0,0,0,0.88)',
            zIndex: 10,
          }}
        >
          <div
            style={{
              padding: '48px 72px',
              border: '3px solid #8b0000',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #1a1a2e, #2a1a1a)',
              boxShadow:
                '0 0 80px rgba(139, 0, 0, 0.5), inset 0 0 30px rgba(139, 0, 0, 0.1)',
              textAlign: 'center',
            }}
          >
            <h1
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '52px',
                fontWeight: 700,
                color: '#ff4444',
                marginBottom: '16px',
                letterSpacing: '6px',
                textShadow:
                  '0 0 30px rgba(255, 68, 68, 0.8), 0 0 60px rgba(255, 68, 68, 0.4)',
              }}
            >
              死 亡
            </h1>
            <p
              style={{
                color: '#e0e0e0',
                fontSize: '17px',
                marginBottom: '32px',
                fontFamily: 'Cinzel, serif',
                letterSpacing: '1px',
              }}
            >
              黑暗吞噬了你的灵魂...
            </p>
            <button
              onClick={restartGame}
              style={{
                fontFamily: 'Cinzel, serif',
                fontSize: '18px',
                padding: '14px 36px',
                background: 'linear-gradient(135deg, #8b0000, #5a0000)',
                color: '#e0e0e0',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 600,
                letterSpacing: '3px',
                boxShadow: '0 6px 20px rgba(139, 0, 0, 0.5)',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'scale(1.06)';
                e.currentTarget.style.boxShadow =
                  '0 8px 28px rgba(139, 0, 0, 0.7)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
                e.currentTarget.style.boxShadow =
                  '0 6px 20px rgba(139, 0, 0, 0.5)';
              }}
            >
              重新开始 (R)
            </button>
          </div>
        </div>
      );
    }
    return null;
  };

  const containerStyle: React.CSSProperties = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
    height: '100%',
    background: '#1a1a2e',
  };

  if (gameState.isShaking) {
    containerStyle.animation = `screenShake${shakeTick % 1000} 0.2s linear`;
  }

  return (
    <div
      ref={containerRef}
      key={`container-${shakeTick}`}
      style={containerStyle}
    >
      <div
        style={{
          position: 'relative',
          width: canvasPixels,
          height: canvasPixels,
          boxShadow:
            '0 0 50px rgba(0,0,0,0.9), inset 0 0 40px rgba(0,0,0,0.6)',
          borderRadius: '6px',
          overflow: 'hidden',
          border: '2px solid #333',
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
        @keyframes screenShake0 {
          0% { transform: translate(0, 0); }
          15% { transform: translate(-3px, 2px); }
          30% { transform: translate(3px, -2px); }
          45% { transform: translate(-2px, -3px); }
          60% { transform: translate(2px, 3px); }
          75% { transform: translate(-3px, 1px); }
          90% { transform: translate(2px, -2px); }
          100% { transform: translate(0, 0); }
        }
      `}</style>

      {Array.from({ length: 999 }, (_, i) => i + 1).map((n) => (
        <style key={n}>{`
          @keyframes screenShake${n} {
            0% { transform: translate(0, 0); }
            15% { transform: translate(-${2 + (n % 2)}px, ${1 + (n % 3)}px); }
            30% { transform: translate(${2 + (n % 3)}px, -${1 + (n % 2)}px); }
            45% { transform: translate(-${1 + (n % 2)}px, -${2 + (n % 3)}px); }
            60% { transform: translate(${1 + (n % 3)}px, ${2 + (n % 2)}px); }
            75% { transform: translate(-${2 + (n % 2)}px, ${1 + (n % 2)}px); }
            90% { transform: translate(${1 + (n % 2)}px, -${2 + (n % 2)}px); }
            100% { transform: translate(0, 0); }
          }
        `}</style>
      ))}
    </div>
  );
}
