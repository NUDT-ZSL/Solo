import React, { useEffect, useRef, useState, useCallback } from 'react';
import { MazeGenerator, MazeData } from './systems/MazeGenerator';
import { PathManager } from './systems/PathManager';
import { Renderer, PlayerState, ShadowMonster } from './systems/Renderer';

type GameState = 'menu' | 'playing' | 'gameover';

interface LevelConfig {
  size: number;
  exitCount: number;
  monsterSpawnInterval: number;
}

const LEVEL_CONFIGS: LevelConfig[] = [
  { size: 15, exitCount: 3, monsterSpawnInterval: 2000 },
  { size: 16, exitCount: 4, monsterSpawnInterval: 1800 },
  { size: 17, exitCount: 5, monsterSpawnInterval: 1600 },
  { size: 18, exitCount: 6, monsterSpawnInterval: 1400 },
  { size: 19, exitCount: 7, monsterSpawnInterval: 1200 },
];

const MAX_MONSTERS = 5;
const PLAYER_MOVE_DURATION = 150;

const Game: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const mazeRef = useRef<MazeData | null>(null);
  const mazeGeneratorRef = useRef<MazeGenerator | null>(null);
  const pathManagerRef = useRef<PathManager>(new PathManager());
  const rendererRef = useRef<Renderer>(new Renderer());
  const audioCtxRef = useRef<AudioContext | null>(null);

  const playerRef = useRef<PlayerState>({
    gridX: 0, gridY: 0,
    displayX: 0, displayY: 0,
    moving: false,
    moveStartX: 0, moveStartY: 0,
    moveTargetX: 0, moveTargetY: 0,
    moveProgress: 0, moveStartTime: 0,
    moveDuration: PLAYER_MOVE_DURATION
  });
  const monstersRef = useRef<ShadowMonster[]>([]);
  const discoveredExitsRef = useRef<Set<string>>(new Set());
  const flashAlphaRef = useRef(0);
  const lastMonsterSpawnRef = useRef(0);
  const pendingKeyRef = useRef<'up' | 'down' | 'left' | 'right' | null>(null);

  const [gameState, setGameState] = useState<GameState>('menu');
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(3);
  const [discoveredCount, setDiscoveredCount] = useState(0);
  const [totalExits, setTotalExits] = useState(3);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 800 });

  const gameStateRef = useRef<GameState>('menu');
  const levelRef = useRef(1);
  const livesRef = useRef(3);

  useEffect(() => { gameStateRef.current = gameState; }, [gameState]);
  useEffect(() => { levelRef.current = level; }, [level]);
  useEffect(() => { livesRef.current = lives; }, [lives]);

  const getLevelConfig = useCallback((): LevelConfig => {
    const idx = Math.min(levelRef.current - 1, LEVEL_CONFIGS.length - 1);
    return LEVEL_CONFIGS[idx];
  }, []);

  const getCellSize = useCallback((): { cellSize: number; offsetX: number; offsetY: number } => {
    if (!mazeRef.current) return { cellSize: 30, offsetX: 0, offsetY: 0 };
    const w = canvasSize.width;
    const h = canvasSize.height;
    const cell = Math.floor(Math.min((w - 40) / mazeRef.current.width, (h - 80) / mazeRef.current.height));
    const offsetX = Math.floor((w - cell * mazeRef.current.width) / 2);
    const offsetY = Math.floor((h - cell * mazeRef.current.height) / 2 + 20);
    return { cellSize: cell, offsetX, offsetY };
  }, [canvasSize]);

  const playSound = useCallback((frequency: number, duration: number, type: OscillatorType = 'sine', volume: number = 0.3) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration / 1000);
    } catch { /* ignore */ }
  }, []);

  const spawnMonster = useCallback((now: number) => {
    if (!mazeRef.current) return;
    if (monstersRef.current.length >= MAX_MONSTERS) return;

    const corners = [
      { x: 0, y: 0 },
      { x: mazeRef.current.width - 1, y: 0 },
      { x: 0, y: mazeRef.current.height - 1 },
      { x: mazeRef.current.width - 1, y: mazeRef.current.height - 1 }
    ];
    const corner = corners[Math.floor(Math.random() * corners.length)];
    const { cellSize, offsetX, offsetY } = getCellSize();

    const monster: ShadowMonster = {
      gridX: corner.x, gridY: corner.y,
      x: offsetX + corner.x * cellSize + cellSize / 2,
      y: offsetY + corner.y * cellSize + cellSize / 2,
      targetGridX: corner.x, targetGridY: corner.y,
      moveProgress: 1,
      moveStartX: 0, moveStartY: 0,
      moveTargetX: 0, moveTargetY: 0,
      lastMoveTime: now,
      opacity: 1, fadingOut: false, fadeStartTime: 0,
      moving: false
    };
    monstersRef.current.push(monster);
  }, [getCellSize]);

  const startNewGame = useCallback(() => {
    levelRef.current = 1;
    livesRef.current = 3;
    setLevel(1);
    setLives(3);
    pathManagerRef.current.clear();
    monstersRef.current = [];
    discoveredExitsRef.current = new Set();
    flashAlphaRef.current = 0;
    loadLevel(1);
    setGameState('playing');
  }, []);

  const loadLevel = useCallback((lvl: number) => {
    const config = LEVEL_CONFIGS[Math.min(lvl - 1, LEVEL_CONFIGS.length - 1)];
    mazeGeneratorRef.current = new MazeGenerator(config.size, config.size, config.exitCount);
    mazeRef.current = mazeGeneratorRef.current.generate();
    pathManagerRef.current.clear();
    monstersRef.current = [];
    discoveredExitsRef.current = new Set();
    lastMonsterSpawnRef.current = 0;
    rendererRef.current.resetStaticCache();

    const player = playerRef.current;
    player.gridX = 0; player.gridY = 0;
    const { cellSize, offsetX, offsetY } = getCellSize();
    player.displayX = offsetX + cellSize / 2;
    player.displayY = offsetY + cellSize / 2;
    player.moving = false;
    player.moveProgress = 0;

    setDiscoveredCount(0);
    setTotalExits(config.exitCount);

    const now = performance.now();
    pathManagerRef.current.addPoint(player.displayX, player.displayY, 0, 0, now);
  }, [getCellSize]);

  const handleLevelComplete = useCallback(() => {
    flashAlphaRef.current = 1.0;
    playSound(1500, 500, 'sine', 0.4);
    setTimeout(() => playSound(2000, 500, 'sine', 0.3), 100);

    setTimeout(() => {
      livesRef.current = 3;
      setLives(3);
      const newLevel = levelRef.current + 1;
      levelRef.current = newLevel;
      setLevel(newLevel);
      loadLevel(newLevel);
    }, 600);
  }, [playSound, loadLevel]);

  const handleDeath = useCallback(() => {
    playSound(150, 400, 'sawtooth', 0.3);
    livesRef.current -= 1;
    setLives(livesRef.current);

    if (livesRef.current <= 0) {
      setGameState('gameover');
      return;
    }

    setTimeout(() => {
      if (mazeRef.current) {
        const player = playerRef.current;
        player.gridX = 0; player.gridY = 0;
        const { cellSize, offsetX, offsetY } = getCellSize();
        player.displayX = offsetX + cellSize / 2;
        player.displayY = offsetY + cellSize / 2;
        player.moving = false;
        pathManagerRef.current.clear();
        monstersRef.current = [];
        const now = performance.now();
        pathManagerRef.current.addPoint(player.displayX, player.displayY, 0, 0, now);
        discoveredExitsRef.current = new Set();
        setDiscoveredCount(0);
      }
    }, 300);
  }, [playSound, getCellSize]);

  const tryMovePlayer = useCallback((direction: 'up' | 'down' | 'left' | 'right') => {
    if (!mazeRef.current || !mazeGeneratorRef.current) return;
    const player = playerRef.current;
    if (player.moving) { pendingKeyRef.current = direction; return; }

    if (!mazeGeneratorRef.current.canMoveFrom(player.gridX, player.gridY, direction)) return;

    const { cellSize, offsetX, offsetY } = getCellSize();
    let dx = 0, dy = 0;
    switch (direction) {
      case 'up': dy = -1; break;
      case 'down': dy = 1; break;
      case 'left': dx = -1; break;
      case 'right': dx = 1; break;
    }

    const now = performance.now();
    player.moveStartTime = now;
    player.moveStartX = player.displayX;
    player.moveStartY = player.displayY;
    player.gridX += dx;
    player.gridY += dy;
    player.moveTargetX = offsetX + player.gridX * cellSize + cellSize / 2;
    player.moveTargetY = offsetY + player.gridY * cellSize + cellSize / 2;
    player.moving = true;
    player.moveProgress = 0;
  }, [getCellSize]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (gameStateRef.current !== 'playing') return;
      const key = e.key.toLowerCase();
      let dir: 'up' | 'down' | 'left' | 'right' | null = null;
      if (key === 'w' || key === 'arrowup') dir = 'up';
      else if (key === 's' || key === 'arrowdown') dir = 'down';
      else if (key === 'a' || key === 'arrowleft') dir = 'left';
      else if (key === 'd' || key === 'arrowright') dir = 'right';
      if (dir) { e.preventDefault(); tryMovePlayer(dir); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tryMovePlayer]);

  useEffect(() => {
    const updateSize = () => {
      const w = Math.max(600, window.innerWidth);
      const h = Math.max(600, window.innerHeight);
      setCanvasSize({ width: w, height: h });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  useEffect(() => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;
    const loop = (now: number) => {
      const player = playerRef.current;
      const { cellSize, offsetX, offsetY } = getCellSize();

      if (player.moving) {
        const elapsed = now - player.moveStartTime;
        player.moveProgress = Math.min(1, elapsed / player.moveDuration);
        const t = player.moveProgress;
        player.displayX = player.moveStartX + (player.moveTargetX - player.moveStartX) * t;
        player.displayY = player.moveStartY + (player.moveTargetY - player.moveStartY) * t;

        if (player.moveProgress >= 1) {
          player.moving = false;
          player.displayX = player.moveTargetX;
          player.displayY = player.moveTargetY;
          pathManagerRef.current.addPoint(player.displayX, player.displayY, player.gridX, player.gridY, now);

          if (mazeRef.current) {
            let newDiscovered = 0;
            for (const exit of mazeRef.current.exits) {
              const key = `${exit.x},${exit.y}`;
              if (!discoveredExitsRef.current.has(key)) {
                const covered = pathManagerRef.current.getGridCellsCovered();
                if (covered.has(key)) {
                  discoveredExitsRef.current.add(key);
                  playSound(1000, 100, 'sine', 0.35);
                  newDiscovered++;
                }
              }
            }
            if (newDiscovered > 0) {
              setDiscoveredCount(discoveredExitsRef.current.size);
            }

            if (discoveredExitsRef.current.size === mazeRef.current.exits.length) {
              handleLevelComplete();
            }
          }

          if (pendingKeyRef.current) {
            const next = pendingKeyRef.current;
            pendingKeyRef.current = null;
            tryMovePlayer(next);
          }
        }
      }

      const pathResult = pathManagerRef.current.update(now);
      const config = getLevelConfig();

      if (pathResult.expiredCount > 0 && now - lastMonsterSpawnRef.current > config.monsterSpawnInterval) {
        lastMonsterSpawnRef.current = now;
        for (let i = 0; i < Math.min(pathResult.expiredCount, 1); i++) {
          spawnMonster(now);
        }
      }

      if (pathManagerRef.current.isEmpty() && monstersRef.current.length === 0 && livesRef.current > 0 && gameStateRef.current === 'playing') {
        if (mazeRef.current) {
          const aliveCells = pathManagerRef.current.getCount();
          if (aliveCells === 0 && player.gridX === 0 && player.gridY === 0 && now - player.moveStartTime > 3000) {
            // Only lose life if truly stuck with no light
          }
        }
      }

      const activeMonsters: ShadowMonster[] = [];
      for (const monster of monstersRef.current) {
        if (monster.fadingOut) {
          const elapsed = now - monster.fadeStartTime;
          if (elapsed < 2000) { activeMonsters.push(monster); }
          continue;
        }

        if (!monster.moving || monster.moveProgress >= 1) {
          const closest = pathManagerRef.current.getClosestVisiblePoint(monster.x, monster.y, now);
          if (closest) {
            const targetGridX = closest.gridX;
            const targetGridY = closest.gridY;
            if (targetGridX !== monster.gridX || targetGridY !== monster.gridY) {
              if (mazeGeneratorRef.current) {
                const directions: Array<{ dir: 'up' | 'down' | 'left' | 'right'; dx: number; dy: number }> = [
                  { dir: 'up', dx: 0, dy: -1 },
                  { dir: 'down', dx: 0, dy: 1 },
                  { dir: 'left', dx: -1, dy: 0 },
                  { dir: 'right', dx: 1, dy: 0 }
                ];
                directions.sort((a, b) => {
                  const da = Math.abs((monster.gridX + a.dx) - targetGridX) + Math.abs((monster.gridY + a.dy) - targetGridY);
                  const db = Math.abs((monster.gridX + b.dx) - targetGridX) + Math.abs((monster.gridY + b.dy) - targetGridY);
                  return da - db;
                });

                for (const { dir, dx, dy } of directions) {
                  if (mazeGeneratorRef.current.canMoveFrom(monster.gridX, monster.gridY, dir)) {
                    monster.gridX += dx;
                    monster.gridY += dy;
                    monster.moveStartX = monster.x;
                    monster.moveStartY = monster.y;
                    monster.targetGridX = monster.gridX;
                    monster.targetGridY = monster.gridY;
                    monster.moveProgress = 0;
                    monster.lastMoveTime = now;
                    monster.moveTargetX = offsetX + monster.gridX * cellSize + cellSize / 2;
                    monster.moveTargetY = offsetY + monster.gridY * cellSize + cellSize / 2;
                    monster.moving = true;
                    break;
                  }
                }
              }
            } else {
              const removed = pathManagerRef.current.removePointAt(monster.gridX, monster.gridY);
              if (removed) { playSound(200, 200, 'sine', 0.25); monster.fadingOut = true; monster.fadeStartTime = now; }
            }
          } else {
            monster.fadingOut = true;
            monster.fadeStartTime = now;
          }
        }

        if (monster.moveTargetX !== undefined && monster.moveTargetY !== undefined && monster.moving) {
          const elapsed = now - monster.lastMoveTime;
          const progress = Math.min(1, elapsed / (config.monsterSpawnInterval * 0.8));
          monster.moveProgress = progress;
          monster.x = monster.moveStartX + (monster.moveTargetX - monster.moveStartX) * progress;
          monster.y = monster.moveStartY + (monster.moveTargetY - monster.moveStartY) * progress;
          if (progress >= 1) { monster.moving = false; }
        }

        const dx = monster.x - player.displayX;
        const dy = monster.y - player.displayY;
        const distSq = dx * dx + dy * dy;
        if (distSq < 100 && gameStateRef.current === 'playing') {
          handleDeath();
        }

        if (!monster.fadingOut) activeMonsters.push(monster);
      }
      monstersRef.current = activeMonsters;

      if (flashAlphaRef.current > 0) {
        flashAlphaRef.current = Math.max(0, flashAlphaRef.current - (1.0 / 0.3) * (1 / 60));
      }

      if (mazeRef.current) {
        rendererRef.current.render(
          {
            maze: mazeRef.current,
            pathManager: pathManagerRef.current,
            player: playerRef.current,
            monsters: monstersRef.current,
            discoveredExits: discoveredExitsRef.current,
            flashAlpha: flashAlphaRef.current,
            now,
            cellSize, offsetX, offsetY
          },
          ctx,
          canvas.width,
          canvas.height
        );
      }

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [gameState, getCellSize, handleLevelComplete, handleDeath, playSound, spawnMonster, tryMovePlayer]);

  const renderHearts = () => {
    const hearts = [];
    for (let i = 0; i < 3; i++) {
      hearts.push(
        <svg
          key={i}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          style={{
            marginRight: '6px',
            opacity: i < lives ? 1 : 0.2,
            transition: 'opacity 0.2s ease'
          }}
        >
          <path
            fill="#FF0040"
            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
          />
        </svg>
      );
    }
    return hearts;
  };

  if (gameState === 'menu') {
    return (
      <div
        ref={containerRef}
        style={{
          width: '100%',
          height: '100%',
          background: '#000',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#fff',
          position: 'relative'
        }}
      >
        <h1
          style={{
            fontSize: '56px',
            marginBottom: '16px',
            background: 'linear-gradient(90deg, #00FFFF, #FF00FF)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            textShadow: '0 0 40px rgba(0,191,255,0.3)',
            letterSpacing: '4px'
          }}
        >
          时痕迷宫
        </h1>
        <h2 style={{ fontSize: '28px', color: '#00BFFF', marginBottom: '48px', letterSpacing: '8px', fontWeight: 300 }}>
          · 光 绘 逃 脱 ·
        </h2>
        <div style={{
          maxWidth: '500px',
          textAlign: 'center',
          color: '#aaa',
          lineHeight: '1.8',
          marginBottom: '48px',
          fontSize: '14px'
        }}>
          <p>🕹️ 使用 <span style={{ color: '#00BFFF' }}>WASD</span> 或 <span style={{ color: '#00BFFF' }}>方向键</span> 移动发光光点</p>
          <p>✨ 走过的路径会留下短暂的光痕，用光痕照亮所有出口</p>
          <p>⚠️ 当心吞噬光芒的暗影怪！</p>
        </div>
        <button
          onClick={startNewGame}
          style={{
            padding: '16px 48px',
            fontSize: '20px',
            background: 'transparent',
            border: '2px solid #00BFFF',
            color: '#00BFFF',
            cursor: 'pointer',
            borderRadius: '4px',
            letterSpacing: '4px',
            transition: 'all 0.2s ease',
            boxShadow: '0 0 20px rgba(0,191,255,0.3)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = '#00BFFF';
            e.currentTarget.style.color = '#000';
            e.currentTarget.style.boxShadow = '0 0 40px rgba(0,191,255,0.6)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = '#00BFFF';
            e.currentTarget.style.boxShadow = '0 0 20px rgba(0,191,255,0.3)';
          }}
        >
          开 始 游 戏
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ width: '100%', height: '100%', position: 'relative', background: '#000' }}>
      <canvas
        ref={canvasRef}
        width={canvasSize.width}
        height={canvasSize.height}
        style={{ display: 'block' }}
      />

      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '60px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 24px',
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderBottom: '1px solid rgba(0,191,255,0.2)',
          transition: 'all 0.2s ease'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ color: '#fff', fontSize: '18px', fontWeight: 500 }}>
            关卡 <span style={{ color: '#00BFFF', marginLeft: '4px' }}>{level}</span>
          </span>
          <div style={{ display: 'flex', alignItems: 'center', marginLeft: '32px' }}>
            {renderHearts()}
          </div>
        </div>

        <div style={{ color: '#fff', fontSize: '18px', fontWeight: 500 }}>
          <span style={{ color: '#888' }}>出口：</span>
          <span style={{ color: discoveredCount === totalExits ? '#00FF00' : '#00BFFF' }}>
            {discoveredCount}/{totalExits}
          </span>
        </div>
      </div>

      {gameState === 'gameover' && (
        <div
          style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            background: 'rgba(139,0,0,0.6)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10,
            animation: 'fadeIn 0.3s ease'
          }}
        >
          <h1
            style={{
              fontSize: '48px',
              color: '#fff',
              marginBottom: '8px',
              animation: 'shake 0.5s infinite',
              letterSpacing: '8px',
              textShadow: '0 0 30px rgba(255,0,64,0.8)'
            }}
          >
            GAME OVER
          </h1>
          <p style={{ color: '#aaa', marginBottom: '40px', fontSize: '16px' }}>
            你抵达了第 <span style={{ color: '#00BFFF' }}>{level}</span> 关
          </p>
          <div style={{ display: 'flex', gap: '20px' }}>
            <button
              onClick={startNewGame}
              style={{
                padding: '12px 32px',
                fontSize: '16px',
                background: '#00BFFF',
                color: '#fff',
                border: 'none',
                cursor: 'pointer',
                borderRadius: '4px',
                letterSpacing: '2px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => { e.currentTarget.style.filter = 'brightness(1.2)'; }}
              onMouseOut={(e) => { e.currentTarget.style.filter = 'brightness(1)'; }}
            >
              重新开始
            </button>
            <button
              onClick={() => setGameState('menu')}
              style={{
                padding: '12px 32px',
                fontSize: '16px',
                background: 'transparent',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                cursor: 'pointer',
                borderRadius: '4px',
                letterSpacing: '2px',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.5)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
              }}
            >
              返回主菜单
            </button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes shake {
          0%, 100% { transform: translate(0, 0); }
          25% { transform: translate(-2px, 1px); }
          50% { transform: translate(2px, -1px); }
          75% { transform: translate(-1px, 2px); }
        }
      `}</style>
    </div>
  );
};

export default Game;
