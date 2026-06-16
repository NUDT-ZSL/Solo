import React, { useState, useEffect, useRef, useCallback } from 'react';
import './styles.css';
import {
  createInitialGameState,
  generateMazeBSP,
  findCenterFloor,
  placeTorches,
  placeMonsters,
  calculateFOV,
  directionToDelta,
  canMoveTo,
  tryPickupTorch,
  applyTorchEffect,
  decrementTorchTimer,
  moveMonster,
  getMonsterBlockedSet,
  monsterInLightRadius,
  MAP_SIZE,
  TILE_SIZE,
  TOTAL_TILES,
  PLAYER_MAX_HP,
  DEFAULT_LIGHT_RADIUS,
  posKey
} from './core';
import {
  GameState,
  Player,
  Monster,
  Torch,
  Direction,
  TileType,
  VisibleTile
} from './types';

interface AnimatedNumberProps {
  value: number;
  suffix?: string;
  prefix?: string;
}

const AnimatedNumber: React.FC<AnimatedNumberProps> = ({ value, suffix = '', prefix = '' }) => {
  const [display, setDisplay] = useState(value);
  const startRef = useRef(value);
  const targetRef = useRef(value);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const DURATION = 300;

  useEffect(() => {
    if (value === targetRef.current) return;
    startRef.current = display;
    targetRef.current = value;
    startTimeRef.current = performance.now();

    const animate = (t: number) => {
      const elapsed = t - startTimeRef.current;
      const progress = Math.min(1, elapsed / DURATION);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startRef.current + (targetRef.current - startRef.current) * eased);
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };
    rafRef.current = requestAnimationFrame(animate);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value]);

  return <span>{prefix}{display}{suffix}</span>;
};

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [gameState, setGameState] = useState<GameState>(() => createInitialGameState());
  const [tick, setTick] = useState(0);
  const [battleFlash, setBattleFlash] = useState(false);
  const fogAnimRef = useRef<Map<string, { start: number; from: number; to: number }>>(new Map());
  const battleAnimRef = useRef<{ monsterId: number; start: number } | null>(null);
  const lastTurnTimeRef = useRef(0);

  const resetGame = useCallback(() => {
    setGameState(createInitialGameState());
    fogAnimRef.current.clear();
    battleAnimRef.current = null;
  }, []);

  // ------- 键盘输入 -------
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (gameState.won || gameState.gameOver || gameState.battleAnimation) return;
      let dir: Direction | null = null;
      switch (e.key.toLowerCase()) {
        case 'w': case 'arrowup': dir = Direction.UP; break;
        case 's': case 'arrowdown': dir = Direction.DOWN; break;
        case 'a': case 'arrowleft': dir = Direction.LEFT; break;
        case 'd': case 'arrowright': dir = Direction.RIGHT; break;
      }
      if (dir) {
        e.preventDefault();
        processTurn(dir);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameState]);

  const processTurn = useCallback((dir: Direction) => {
    setGameState((prev) => {
      if (prev.won || prev.gameOver || prev.battleAnimation) return prev;

      const delta = directionToDelta(dir);
      const newPos = {
        x: prev.player.position.x + delta.x,
        y: prev.player.position.y + delta.y
      };

      let newState: GameState = { ...prev };
      let player: Player = { ...prev.player };
      let monsters: Monster[] = prev.monsters.map((m) => ({ ...m }));
      let torches: Torch[] = prev.torches.map((t) => ({ ...t }));
      let turn = prev.turn;
      let battleAnim: GameState['battleAnimation'] = null;

      // 玩家移动
      if (canMoveTo(prev.tiles, newPos, monsters)) {
        player.position = newPos;

        // 火炬拾取
        const pickup = tryPickupTorch(player, torches, newPos);
        if (pickup.torchPicked) {
          torches = pickup.torches;
          player = applyTorchEffect(player);
        }
      }

      // 战斗判定：玩家是否踩到怪物（同格）
      for (let i = 0; i < monsters.length; i++) {
        if (monsters[i].alive &&
            monsters[i].position.x === player.position.x &&
            monsters[i].position.y === player.position.y) {
          monsters[i] = { ...monsters[i], alive: false };
          battleAnim = { monsterId: monsters[i].id, progress: 0 };
          // 掉落火炬
          torches.push({
            id: torches.length,
            position: { ...monsters[i].position },
            picked: false
          });
          setBattleFlash(true);
          setTimeout(() => setBattleFlash(false), 300);
        }
      }

      turn = turn + 1;

      // 火炬倒计时
      player = decrementTorchTimer(player);

      // 怪物每两回合移动一次
      if (turn % 2 === 0) {
        for (let i = 0; i < monsters.length; i++) {
          if (!monsters[i].alive) continue;
          const blocked = getMonsterBlockedSet(monsters, monsters[i].id);
          blocked.add(`${player.position.x},${player.position.y}`);
          monsters[i] = moveMonster(prev.tiles, monsters[i], player.position, blocked);

          // 怪物移动后是否与玩家同格
          if (monsters[i].alive &&
              monsters[i].position.x === player.position.x &&
              monsters[i].position.y === player.position.y) {
            monsters[i] = { ...monsters[i], alive: false };
            battleAnim = { monsterId: monsters[i].id, progress: 0 };
            torches.push({
              id: torches.length,
              position: { ...monsters[i].position },
              picked: false
            });
            setBattleFlash(true);
            setTimeout(() => setBattleFlash(false), 300);
          }

          // 怪物进入光照范围 0 距离（相邻即可战斗）
          if (monsters[i].alive) {
            const dx = monsters[i].position.x - player.position.x;
            const dy = monsters[i].position.y - player.position.y;
            if (Math.abs(dx) + Math.abs(dy) <= 1 &&
                monsterInLightRadius(player.position, monsters[i].position, player.lightRadius)) {
              monsters[i] = { ...monsters[i], alive: false };
              battleAnim = { monsterId: monsters[i].id, progress: 0 };
              torches.push({
                id: torches.length,
                position: { ...monsters[i].position },
                picked: false
              });
              setBattleFlash(true);
              setTimeout(() => setBattleFlash(false), 300);
            }
          }
        }
      }

      // 视野计算
      const prevVisibleSet = new Set(prev.visibleMap.keys());
      const visibleMap = calculateFOV(prev.tiles, player.position, player.lightRadius, prevVisibleSet);
      const exploredSet = new Set(prev.exploredSet);
      visibleMap.forEach((v) => exploredSet.add(`${v.x},${v.y}`));

      // 雾状渐变动画初始化
      const fogMap = new Map<string, number>();
      const newVisibleSet = new Set(visibleMap.keys());
      const allAffected = new Set<string>();
      prevVisibleSet.forEach((k) => allAffected.add(k));
      newVisibleSet.forEach((k) => allAffected.add(k));
      const now = performance.now();
      allAffected.forEach((k) => {
        const wasVisible = prevVisibleSet.has(k);
        const isVisible = newVisibleSet.has(k);
        if (wasVisible !== isVisible) {
          fogAnimRef.current.set(k, {
            start: now,
            from: wasVisible ? 0 : 0.8,
            to: isVisible ? 0 : 0.8
          });
        }
      });

      // 胜利判定
      const allExplored = exploredSet.size >= TOTAL_TILES;
      const allMonstersDead = monsters.every((m) => !m.alive);
      const won = allExplored && allMonstersDead;

      newState = {
        ...prev,
        player,
        monsters,
        torches,
        turn,
        exploredSet,
        visibleMap,
        prevVisibleSet: prevVisibleSet,
        fogTransitionMap: fogMap,
        battleAnimation: battleAnim,
        won
      };

      if (battleAnim) {
        battleAnimRef.current = { monsterId: battleAnim.monsterId, start: performance.now() };
      }

      return newState;
    });
  }, []);

  // ------- Canvas 渲染循环 -------
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;

    const render = () => {
      const W = MAP_SIZE * TILE_SIZE;
      const H = MAP_SIZE * TILE_SIZE;
      ctx.clearRect(0, 0, W, H);

      // 1. 全部先填充黑色
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, W, H);

      const now = performance.now();

      // 2. 渲染可见格子与已探索格子
      for (let y = 0; y < MAP_SIZE; y++) {
        for (let x = 0; x < MAP_SIZE; x++) {
          const tile = gameState.tiles[y][x];
          const key = posKey(x, y);
          const visible = gameState.visibleMap.get(key);
          const explored = gameState.exploredSet.has(key);

          const sx = x * TILE_SIZE;
          const sy = y * TILE_SIZE;

          if (visible) {
            drawTile(ctx, tile, sx, sy, visible.brightness);
          } else if (explored) {
            drawTile(ctx, tile, sx, sy, 0.25);
          }

          // 边框
          if (visible || explored) {
            ctx.strokeStyle = '#34495E';
            ctx.lineWidth = 1;
            ctx.strokeRect(sx + 0.5, sy + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
          }
        }
      }

      // 3. 雾状过渡渐变
      fogAnimRef.current.forEach((anim, key) => {
        const elapsed = now - anim.start;
        const DURATION = 500;
        if (elapsed >= DURATION) {
          fogAnimRef.current.delete(key);
          return;
        }
        const progress = elapsed / DURATION;
        const alpha = anim.from + (anim.to - anim.from) * progress;
        const [xs, ys] = key.split(',').map(Number);
        ctx.fillStyle = `rgba(0, 0, 0, ${alpha})`;
        ctx.fillRect(xs * TILE_SIZE, ys * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      });

      // 4. 火炬道具
      for (const torch of gameState.torches) {
        if (torch.picked) continue;
        const key = posKey(torch.position.x, torch.position.y);
        const visible = gameState.visibleMap.has(key);
        if (!visible) continue;
        const sx = torch.position.x * TILE_SIZE;
        const sy = torch.position.y * TILE_SIZE;
        drawTorch(ctx, sx, sy);
      }

      // 5. 怪物（仅可见区域）+ 路径高亮
      for (const monster of gameState.monsters) {
        if (!monster.alive) continue;
        const key = posKey(monster.position.x, monster.position.y);
        const visible = gameState.visibleMap.has(key);

        // 战斗动画
        const battleRef = battleAnimRef.current;
        if (battleRef && battleRef.monsterId === monster.id) {
          const elapsed = now - battleRef.start;
          const DURATION = 800;
          if (elapsed < DURATION) {
            const p = elapsed / DURATION;
            ctx.save();
            const sx = monster.position.x * TILE_SIZE;
            const sy = monster.position.y * TILE_SIZE;
            ctx.globalAlpha = 1 - p;
            ctx.translate(sx + TILE_SIZE / 2, sy + TILE_SIZE / 2);
            ctx.rotate(p * Math.PI * 2);
            ctx.scale(1 + p * 0.5, 1 + p * 0.5);
            drawMonster(ctx, -TILE_SIZE / 2, -TILE_SIZE / 2);
            ctx.restore();
          } else {
            battleAnimRef.current = null;
            setGameState((gs) => ({ ...gs, battleAnimation: null }));
          }
          continue;
        }

        if (!visible) continue;

        // 路径虚线
        if (monster.nextPath && monster.nextPath.length > 0) {
          ctx.save();
          ctx.strokeStyle = '#E74C3C';
          ctx.lineWidth = 2;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          const startX = monster.position.x * TILE_SIZE + TILE_SIZE / 2;
          const startY = monster.position.y * TILE_SIZE + TILE_SIZE / 2;
          ctx.moveTo(startX, startY);
          const limit = Math.min(monster.nextPath.length, 6);
          for (let i = 0; i < limit; i++) {
            const p = monster.nextPath[i];
            ctx.lineTo(p.x * TILE_SIZE + TILE_SIZE / 2, p.y * TILE_SIZE + TILE_SIZE / 2);
          }
          ctx.stroke();
          ctx.restore();
        }

        const sx = monster.position.x * TILE_SIZE;
        const sy = monster.position.y * TILE_SIZE;
        drawMonster(ctx, sx, sy);
      }

      // 6. 玩家
      {
        const sx = gameState.player.position.x * TILE_SIZE;
        const sy = gameState.player.position.y * TILE_SIZE;
        drawPlayer(ctx, sx, sy);
      }

      // 7. 战斗闪光
      if (battleFlash) {
        ctx.fillStyle = 'rgba(231, 76, 60, 0.2)';
        ctx.fillRect(0, 0, W, H);
      }

      // 强制 tick 更新
      if (fogAnimRef.current.size > 0 || battleAnimRef.current) {
        setTick((t) => (t + 1) % 1000000);
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [gameState, battleFlash]);

  // ------- 渲染辅助函数 -------
  function drawTile(
    ctx: CanvasRenderingContext2D,
    tile: { type: TileType; x: number; y: number },
    x: number,
    y: number,
    brightness: number
  ) {
    let baseColor: string;
    if (tile.type === TileType.WALL) {
      baseColor = '#2C3E50';
    } else {
      baseColor = '#7F8C8D';
    }
    const col = applyBrightness(baseColor, brightness);
    ctx.fillStyle = col;
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE);

    // 墙体纹理
    if (tile.type === TileType.WALL && brightness > 0.3) {
      ctx.fillStyle = applyBrightness('#1A252F', brightness);
      ctx.fillRect(x, y, TILE_SIZE, 4);
      ctx.fillRect(x, y + TILE_SIZE - 4, TILE_SIZE, 4);
      ctx.fillRect(x, y, 4, TILE_SIZE);
      ctx.fillRect(x + TILE_SIZE - 4, y, 4, TILE_SIZE);
    }
    if (tile.type === TileType.FLOOR && brightness > 0.3) {
      ctx.fillStyle = applyBrightness('#5D6D7E', brightness);
      ctx.fillRect(x + 4, y + 4, 3, 3);
      ctx.fillRect(x + TILE_SIZE - 8, y + TILE_SIZE - 8, 3, 3);
      ctx.fillRect(x + TILE_SIZE - 10, y + 6, 2, 2);
    }
  }

  function applyBrightness(hex: string, b: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b2 = parseInt(hex.slice(5, 7), 16);
    const nr = Math.round(r * b);
    const ng = Math.round(g * b);
    const nb = Math.round(b2 * b);
    return `rgb(${nr},${ng},${nb})`;
  }

  function drawPlayer(ctx: CanvasRenderingContext2D, x: number, y: number) {
    const cx = x + TILE_SIZE / 2;
    const cy = y + TILE_SIZE / 2;
    ctx.save();
    ctx.fillStyle = '#F1C40F';
    ctx.strokeStyle = '#B7950B';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx + 8, cy + 6);
    ctx.lineTo(cx, cy + 2);
    ctx.lineTo(cx - 8, cy + 6);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.shadowColor = 'rgba(241, 196, 15, 0.6)';
    ctx.shadowBlur = 8;
    ctx.fill();
    ctx.restore();
  }

  function drawMonster(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.save();
    ctx.font = `${TILE_SIZE - 6}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#E74C3C';
    ctx.shadowColor = 'rgba(231, 76, 60, 0.6)';
    ctx.shadowBlur = 6;
    ctx.fillText('☠', x + TILE_SIZE / 2, y + TILE_SIZE / 2 + 1);
    ctx.restore();
  }

  function drawTorch(ctx: CanvasRenderingContext2D, x: number, y: number) {
    ctx.save();
    ctx.font = `${TILE_SIZE - 8}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = 'rgba(255, 215, 0, 0.8)';
    ctx.shadowBlur = 10;
    ctx.fillText('★', x + TILE_SIZE / 2, y + TILE_SIZE / 2 + 1);
    ctx.restore();
  }

  // ------- 倒计时闪烁 -------
  const [blinkTick, setBlinkTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => {
      setBlinkTick((b) => b + 1);
    }, 500);
    return () => clearInterval(id);
  }, []);

  const torchLowWarning = gameState.player.torchTurnsRemaining > 0 &&
    gameState.player.torchTurnsRemaining <= 5;
  const torchTextVisible = !torchLowWarning || (blinkTick % 2 === 0);

  const canvasW = MAP_SIZE * TILE_SIZE;
  const canvasH = MAP_SIZE * TILE_SIZE;

  return (
    <div className="app-root">
      <div className="top-bar">
        <div className="turn-display">
          回合: <AnimatedNumber value={gameState.turn} />
        </div>
        <button className="reset-btn" onClick={resetGame}>
          重置地图
        </button>
      </div>

      <div className="game-layout">
        <aside className="left-panel">
          <div className="panel-title">{gameState.player.name}</div>
          <div className="panel-section">
            <div className="label">生命值</div>
            <div className="hp-bar">
              <div
                className="hp-fill"
                style={{ width: `${(gameState.player.hp / PLAYER_MAX_HP) * 100}%` }}
              />
              <span className="hp-text">
                <AnimatedNumber value={gameState.player.hp} /> / {PLAYER_MAX_HP}
              </span>
            </div>
          </div>
          <div className="panel-section">
            <div className="label">光照半径</div>
            <div className="value-big">
              <AnimatedNumber value={gameState.player.lightRadius} suffix=" 格" />
            </div>
          </div>
          <div className="panel-section">
            <div className="label">已拾取火炬</div>
            <div className="value-big">
              <AnimatedNumber value={gameState.player.torchesPicked} suffix=" 个" />
            </div>
          </div>
          <div className="panel-section">
            <div className="label">已探索</div>
            <div className="value-big">
              <AnimatedNumber value={gameState.exploredSet.size} /> / {TOTAL_TILES} 格
            </div>
          </div>
          <div className="panel-section">
            <div className="label">剩余怪物</div>
            <div className="value-big">
              <AnimatedNumber value={gameState.monsters.filter((m) => m.alive).length} suffix=" 只" />
            </div>
          </div>
          <div className="panel-section hint">
            <div>使用 WASD 或方向键移动</div>
          </div>
        </aside>

        <main className="canvas-container">
          <canvas
            ref={canvasRef}
            width={canvasW}
            height={canvasH}
            className="game-canvas"
          />
          {gameState.won && (
            <div className="overlay">
              <div className="overlay-box">
                <h2>🏆 胜利！</h2>
                <p>你已探索所有 {TOTAL_TILES} 格并击败所有怪物！</p>
                <button className="reset-btn" onClick={resetGame}>再来一局</button>
              </div>
            </div>
          )}
        </main>

        <aside className="right-panel">
          {gameState.player.torchTurnsRemaining > 0 ? (
            <div
              className="torch-countdown"
              style={{
                color: torchLowWarning ? '#E74C3C' : '#FFFFFF',
                opacity: torchTextVisible ? 1 : 0.4
              }}
            >
              <div className="countdown-icon">🔥</div>
              <div className="countdown-label">火炬持续</div>
              <div className="countdown-value">
                <AnimatedNumber value={gameState.player.torchTurnsRemaining} suffix=" 回合" />
              </div>
              <div className="countdown-bonus">
                光照 +{DEFAULT_LIGHT_RADIUS + 2 - gameState.player.baseLightRadius} 格
              </div>
            </div>
          ) : (
            <div className="torch-countdown inactive">
              <div className="countdown-icon">🕯️</div>
              <div className="countdown-label">无火炬增益</div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

import { createRoot } from 'react-dom/client';
const root = createRoot(document.getElementById('root')!);
root.render(<App />);

export default App;
