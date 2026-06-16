import React, { useRef, useEffect, useCallback, useState } from 'react';
import { MapData, PlayerState, InputState, Position, GameStats, RippleEffect, CoinAnimation, CANVAS_WIDTH, CANVAS_HEIGHT, TILE_SIZE, GRID_COLS, GRID_ROWS, TILE_COLORS, PLAYER_COLOR, PLAYER_SIZE, HeatmapData } from '../../types';
import { PhysicsEngine } from './PhysicsEngine';
import { HeatmapCalculator } from './HeatmapCalculator';

interface GameCanvasProps {
  mapData: MapData;
  onStatsUpdate: (stats: GameStats) => void;
  onHeatmapUpdate: (data: HeatmapData) => void;
  onGameOver: () => void;
  isPlaying: boolean;
  onReplay: () => void;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({
  mapData,
  onStatsUpdate,
  onHeatmapUpdate,
  onGameOver,
  isPlaying,
  onReplay,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<PhysicsEngine | null>(null);
  const heatmapCalcRef = useRef(new HeatmapCalculator());
  const animFrameRef = useRef<number>(0);
  const inputRef = useRef<InputState>({ left: false, right: false, up: false, down: false });
  const playerRef = useRef<PlayerState>({
    x: 0, y: 0, vx: 0, vy: 0,
    width: PLAYER_SIZE, height: PLAYER_SIZE,
    isGrounded: false, lives: 3, coins: 0,
  });
  const mapDataRef = useRef<MapData>(mapData);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const heatmapDataRef = useRef<HeatmapData>({ positions: [], densityMatrix: [] });
  const positionRecordsRef = useRef<Position[]>([]);
  const lastRecordTimeRef = useRef<number>(0);
  const ripplesRef = useRef<RippleEffect[]>([]);
  const coinAnimsRef = useRef<CoinAnimation[]>([]);
  const wasGroundedRef = useRef(false);
  const deathsRef = useRef(0);
  const startTimeRef = useRef<number>(0);
  const gameOverRef = useRef(false);
  const fpsFramesRef = useRef<number[]>([]);
  const lastFrameTimeRef = useRef<number>(0);
  const spawnPointRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    mapDataRef.current = mapData;
    if (engineRef.current) {
      engineRef.current.updateMapData(mapData);
    }
  }, [mapData]);

  const initGame = useCallback(() => {
    const engine = new PhysicsEngine(mapData);
    engineRef.current = engine;

    const spawn = engine.findSpawnPoint();
    spawnPointRef.current = spawn;

    playerRef.current = {
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      width: PLAYER_SIZE,
      height: PLAYER_SIZE,
      isGrounded: false,
      lives: 3,
      coins: 0,
    };
    wasGroundedRef.current = false;
    deathsRef.current = 0;
    startTimeRef.current = performance.now();
    gameOverRef.current = false;
    positionRecordsRef.current = [];
    lastRecordTimeRef.current = 0;
    ripplesRef.current = [];
    coinAnimsRef.current = [];
    fpsFramesRef.current = [];
    lastFrameTimeRef.current = performance.now();
    setShowHeatmap(false);
    heatmapDataRef.current = { positions: [], densityMatrix: [] };

    onStatsUpdate({
      fps: 0,
      deaths: 0,
      coins: 0,
      playTime: 0,
      isGameOver: false,
    });
  }, [mapData, onStatsUpdate]);

  useEffect(() => {
    if (isPlaying) {
      initGame();
    }
  }, [isPlaying, initGame]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPlaying || gameOverRef.current) return;
      const key = e.key.toLowerCase();
      if (key === 'a' || key === 'arrowleft') inputRef.current.left = true;
      if (key === 'd' || key === 'arrowright') inputRef.current.right = true;
      if (key === 'w' || key === 'arrowup') inputRef.current.up = true;
      if (key === 's' || key === 'arrowdown') inputRef.current.down = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (key === 'a' || key === 'arrowleft') inputRef.current.left = false;
      if (key === 'd' || key === 'arrowright') inputRef.current.right = false;
      if (key === 'w' || key === 'arrowup') inputRef.current.up = false;
      if (key === 's' || key === 'arrowdown') inputRef.current.down = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isPlaying]);

  const gameLoop = useCallback((timestamp: number) => {
    if (!isPlaying) return;

    const now = performance.now();
    const delta = now - lastFrameTimeRef.current;
    fpsFramesRef.current.push(delta);
    if (fpsFramesRef.current.length > 60) {
      fpsFramesRef.current.shift();
    }
    lastFrameTimeRef.current = now;

    const avgDelta = fpsFramesRef.current.reduce((a, b) => a + b, 0) / fpsFramesRef.current.length;
    const fps = Math.round(1000 / avgDelta);

    const player = playerRef.current;
    const engine = engineRef.current;
    if (!engine) return;

    if (!gameOverRef.current) {
      const updated = engine.update(player, inputRef.current);

      if (updated.isGrounded && !wasGroundedRef.current) {
        ripplesRef.current.push({
          x: updated.x + updated.width / 2,
          y: updated.y + updated.height,
          startTime: timestamp,
          duration: 300,
        });
      }
      wasGroundedRef.current = updated.isGrounded;

      if (engine.checkSpikeCollision(updated.x, updated.y, updated.width, updated.height)) {
        updated.lives -= 1;
        deathsRef.current += 1;

        if (updated.lives <= 0) {
          gameOverRef.current = true;
          onGameOver();

          const calc = heatmapCalcRef.current;
          const density = calc.calculateDensity(positionRecordsRef.current);
          heatmapDataRef.current = { positions: [...positionRecordsRef.current], densityMatrix: density };
          onHeatmapUpdate(heatmapDataRef.current);
          setShowHeatmap(true);
        } else {
          updated.x = spawnPointRef.current.x;
          updated.y = spawnPointRef.current.y;
          updated.vx = 0;
          updated.vy = 0;
          updated.isGrounded = false;
        }
      }

      const coinHit = engine.checkCoinCollision(updated.x, updated.y, updated.width, updated.height);
      if (coinHit) {
        const newMap = mapDataRef.current.map(r => [...r]);
        newMap[coinHit.row][coinHit.col] = 0;
        mapDataRef.current = newMap;
        engine.updateMapData(newMap);

        updated.coins += 10;
        coinAnimsRef.current.push({
          row: coinHit.row,
          col: coinHit.col,
          startTime: timestamp,
          duration: 300,
        });
      }

      playerRef.current = updated;

      if (now - lastRecordTimeRef.current >= 500) {
        positionRecordsRef.current.push({
          x: updated.x + updated.width / 2,
          y: updated.y + updated.height / 2,
          timestamp: now,
        });
        lastRecordTimeRef.current = now;
      }

      const playTime = (now - startTimeRef.current) / 1000;
      onStatsUpdate({
        fps,
        deaths: deathsRef.current,
        coins: playerRef.current.coins,
        playTime: Math.round(playTime * 10) / 10,
        isGameOver: gameOverRef.current,
      });
    }

    render(timestamp);
    animFrameRef.current = requestAnimationFrame(gameLoop);
  }, [isPlaying, onGameOver, onHeatmapUpdate, onStatsUpdate]);

  const render = useCallback((timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const gradient = ctx.createRadialGradient(
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 0,
      CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH
    );
    gradient.addColorStop(0, '#1A1A2E');
    gradient.addColorStop(1, '#16213E');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    const currentMap = mapDataRef.current;
    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tile = currentMap[row]?.[col];
        if (tile === 0 || tile === undefined) continue;

        const tx = col * TILE_SIZE;
        const ty = row * TILE_SIZE;

        if (tile === 1) {
          ctx.fillStyle = '#6B7280';
          ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
          ctx.fillStyle = '#4B5563';
          ctx.fillRect(tx, ty, TILE_SIZE, 2);
          ctx.fillStyle = '#9CA3AF';
          ctx.fillRect(tx, ty + TILE_SIZE - 2, TILE_SIZE, 2);
        } else if (tile === 2) {
          ctx.fillStyle = '#374151';
          ctx.fillRect(tx, ty, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#4B5563';
          ctx.lineWidth = 1;
          for (let i = 0; i < TILE_SIZE; i += 8) {
            ctx.beginPath();
            ctx.moveTo(tx + i, ty);
            ctx.lineTo(tx, ty + i);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(tx + i, ty + TILE_SIZE);
            ctx.lineTo(tx + TILE_SIZE, ty + i);
            ctx.stroke();
          }
        } else if (tile === 3) {
          ctx.fillStyle = '#EF4444';
          const cx = tx + TILE_SIZE / 2;
          ctx.beginPath();
          ctx.moveTo(cx, ty + 4);
          ctx.lineTo(cx - 10, ty + TILE_SIZE);
          ctx.lineTo(cx - 3, ty + TILE_SIZE - 6);
          ctx.lineTo(cx, ty + TILE_SIZE);
          ctx.lineTo(cx + 3, ty + TILE_SIZE - 6);
          ctx.lineTo(cx + 10, ty + TILE_SIZE);
          ctx.closePath();
          ctx.fill();
        } else if (tile === 4) {
          ctx.fillStyle = '#F59E0B';
          ctx.beginPath();
          ctx.arc(tx + TILE_SIZE / 2, ty + TILE_SIZE / 2, 10, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#FFD700';
          ctx.beginPath();
          ctx.arc(tx + TILE_SIZE / 2, ty + TILE_SIZE / 2, 6, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    const activeAnims = coinAnimsRef.current.filter(a => timestamp - a.startTime < a.duration);
    for (const anim of activeAnims) {
      const progress = (timestamp - anim.startTime) / anim.duration;
      const scale = 1 - progress;
      const tx = anim.col * TILE_SIZE + TILE_SIZE / 2;
      const ty = anim.row * TILE_SIZE + TILE_SIZE / 2;
      ctx.fillStyle = `rgba(255, 215, 0, ${1 - progress})`;
      ctx.beginPath();
      ctx.arc(tx, ty, 10 * scale, 0, Math.PI * 2);
      ctx.fill();
    }
    coinAnimsRef.current = activeAnims;

    if (!gameOverRef.current || !showHeatmap) {
      const player = playerRef.current;
      ctx.fillStyle = PLAYER_COLOR;
      ctx.fillRect(player.x, player.y, player.width, player.height);
      ctx.fillStyle = '#60A5FA';
      ctx.fillRect(player.x + 2, player.y + 2, player.width - 4, 4);
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(player.x + 3, player.y + 5, 3, 3);
      ctx.fillRect(player.x + player.width - 6, player.y + 5, 3, 3);
    }

    const activeRipples = ripplesRef.current.filter(r => timestamp - r.startTime < r.duration);
    for (const ripple of activeRipples) {
      const progress = (timestamp - ripple.startTime) / ripple.duration;
      const radius = 16 * progress;
      const alpha = 1 - progress;
      ctx.strokeStyle = `rgba(79, 195, 247, ${alpha})`;
      ctx.lineWidth = 2 * (1 - progress);
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
    ripplesRef.current = activeRipples;

    if (showHeatmap && heatmapDataRef.current.positions.length > 0) {
      const calc = heatmapCalcRef.current;
      calc.renderHeatmapGaussian(ctx, heatmapDataRef.current.positions);
    }

    if (gameOverRef.current) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.fillStyle = '#F85149';
      ctx.font = "bold 24px 'Orbitron', sans-serif";
      ctx.textAlign = 'center';
      ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
      ctx.fillStyle = '#8B949E';
      ctx.font = "14px 'Noto Sans SC', sans-serif";
      ctx.fillText('查看右下角面板导出数据或重玩', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
    }
  }, [showHeatmap]);

  useEffect(() => {
    if (isPlaying) {
      animFrameRef.current = requestAnimationFrame(gameLoop);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, gameLoop]);

  const handleReplay = () => {
    initGame();
    onReplay();
  };

  return (
    <div style={{ position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          width: '100%',
          maxWidth: CANVAS_WIDTH,
          height: 'auto',
          aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
          imageRendering: 'pixelated',
          border: '1px solid #30363D',
          borderRadius: '4px',
        }}
        tabIndex={0}
      />
      {!isPlaying && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(0,0,0,0.6)',
          borderRadius: '4px',
        }}>
          <div style={{
            color: '#8B949E',
            fontFamily: "'Noto Sans SC', sans-serif",
            fontSize: '14px',
            textAlign: 'center',
          }}>
            请先在编辑器中设计关卡<br />然后点击"导出地图"
          </div>
        </div>
      )}
    </div>
  );
};
