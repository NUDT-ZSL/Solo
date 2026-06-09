import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { ParticleSystem, COLORS } from './effects/ParticleSystem';
import type { Direction, CellType, PistilType } from './game/types';

const CANVAS_W = 800;
const CANVAS_H = 800;

const PISTIL_COLORS: Record<string, string> = {
  RED_SPEED: COLORS.redPistil,
  GREEN_PIERCE: COLORS.greenPistil,
  BLUE_MIRROR: COLORS.bluePistil,
};

interface UIState {
  lightEnergy: number;
  maxEnergy: number;
  speedBoost: boolean;
  speedBoostTime: number;
  wallPierce: boolean;
  hasMirror: boolean;
  mirrorTime: number;
  gameStatus: 'PLAYING' | 'WON' | 'LOST';
  loseReason: string | null;
  lowLight: boolean;
  lowLightTimer: number;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const particleRef = useRef<ParticleSystem | null>(null);
  const lastTimeRef = useRef<number>(performance.now());
  const rafRef = useRef<number>(0);
  const keysHeld = useRef<Record<string, boolean>>({});
  const keyCooldown = useRef<number>(0);

  const [uiState, setUiState] = useState<UIState>({
    lightEnergy: 10,
    maxEnergy: 15,
    speedBoost: false,
    speedBoostTime: 0,
    wallPierce: false,
    hasMirror: false,
    mirrorTime: 0,
    gameStatus: 'PLAYING',
    loseReason: null,
    lowLight: false,
    lowLightTimer: 0,
  });

  const syncUiFromEngine = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const state = engine.getState();
    const ff = state.firefly;
    const ab = ff.abilities;
    setUiState({
      lightEnergy: ff.lightEnergy,
      maxEnergy: 15,
      speedBoost: ab.speedBoost,
      speedBoostTime: ab.speedBoostTime,
      wallPierce: ab.wallPierce,
      hasMirror: ab.hasMirror,
      mirrorTime: ab.mirrorTime,
      gameStatus: state.status as UIState['gameStatus'],
      loseReason: state.loseReason,
      lowLight: ff.lowLight,
      lowLightTimer: ff.lowLightTimer,
    });
  }, []);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const engine = engineRef.current;
    const particles = particleRef.current;
    if (!canvas || !engine || !particles) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rd = engine.getRenderData();

    const grad = ctx.createLinearGradient(0, 0, 0, CANVAS_H);
    grad.addColorStop(0, '#0B0B2B');
    grad.addColorStop(1, '#1A1A3A');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

    drawBackgroundStars(ctx, rd.globalTime);

    const metrics = GameEngine.getGridMetrics();
    const cs = metrics.cellSize;

    drawMaze(ctx, rd.maze.cells, cs, rd.globalTime);
    drawSeed(ctx, rd.maze.endPos.x, rd.maze.endPos.y, cs, rd.globalTime, rd.seedActivated, rd.seedBurstProgress);

    drawPulses(ctx, particles.getPulses());

    drawAfterImages(ctx, particles.getAfterImages());

    if (uiState.gameStatus === 'PLAYING') {
      const ff = rd.firefly;
      const brightness = computeBrightness(ff.lightEnergy, ff.lowLight, rd.globalTime);
      if (uiState.hasMirror && rd.mirror) {
        const mAlpha = Math.min(1, rd.mirror.remainTime / 3 * 1.2);
        drawFirefly(ctx, rd.mirror.visualX, rd.mirror.visualY, COLORS.bluePistil, 0.6 * mAlpha, cs);
      }
      drawFirefly(ctx, ff.visualX, ff.visualY, COLORS.firefly, brightness, cs);
    }

    drawParticles(ctx, particles.getParticles());

    if (rd.edgeFlashColor && rd.edgeFlashAlpha > 0) {
      drawEdgeFlash(ctx, rd.edgeFlashColor, rd.edgeFlashAlpha);
    }

    if (uiState.gameStatus === 'WON') {
      drawWinVignette(ctx, rd.seedBurstProgress);
    }

    if (uiState.gameStatus === 'LOST') {
      drawLoseVignette(ctx, rd.globalTime);
    }
  }, [uiState.gameStatus, uiState.hasMirror]);

  const gameLoop = useCallback((t: number) => {
    const engine = engineRef.current;
    if (!engine) {
      rafRef.current = requestAnimationFrame(gameLoop);
      return;
    }
    const dt = Math.min(0.05, (t - lastTimeRef.current) / 1000);
    lastTimeRef.current = t;

    keyCooldown.current = Math.max(0, keyCooldown.current - dt);
    if (keyCooldown.current <= 0) {
      const k = keysHeld.current;
      let dir: Direction | null = null;
      if (k['ArrowUp'] || k['KeyW']) dir = 'UP';
      else if (k['ArrowDown'] || k['KeyS']) dir = 'DOWN';
      else if (k['ArrowLeft'] || k['KeyA']) dir = 'LEFT';
      else if (k['ArrowRight'] || k['KeyD']) dir = 'RIGHT';
      if (dir) {
        engine.move(dir);
        keyCooldown.current = engine.getState().firefly.abilities.speedBoost ? 0.09 : 0.18;
      }
    }

    engine.update(dt);
    render();

    syncUiFromEngine();

    rafRef.current = requestAnimationFrame(gameLoop);
  }, [render, syncUiFromEngine]);

  const restartGame = useCallback(() => {
    engineRef.current?.reset();
    lastTimeRef.current = performance.now();
    syncUiFromEngine();
  }, [syncUiFromEngine]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    const ps = new ParticleSystem();
    const engine = new GameEngine(ps);
    particleRef.current = ps;
    engineRef.current = engine;
    engine.start();

    const onKeyDown = (e: KeyboardEvent) => {
      const code = e.code;
      if (
        code === 'ArrowUp' || code === 'ArrowDown' || code === 'ArrowLeft' || code === 'ArrowRight' ||
        code === 'KeyW' || code === 'KeyA' || code === 'KeyS' || code === 'KeyD'
      ) {
        e.preventDefault();
        keysHeld.current[code] = true;
      }
      if (code === 'KeyR') {
        restartGame();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keysHeld.current[e.code] = false;
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    lastTimeRef.current = performance.now();
    rafRef.current = requestAnimationFrame(gameLoop);
    syncUiFromEngine();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, [gameLoop, restartGame, syncUiFromEngine]);

  const energyRatio = Math.min(1, uiState.lightEnergy / uiState.maxEnergy);
  const energyPct = (energyRatio * 100).toFixed(0);

  return (
    <div style={{
      width: '100vw', height: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      position: 'relative',
    }}>
      <div style={{ position: 'relative', width: CANVAS_W, height: CANVAS_H }}>
        <canvas
          ref={canvasRef}
          id="game-canvas"
          style={{ display: 'block', borderRadius: 12 }}
        />

        {/* HUD - 左上角光能条 */}
        <div style={{
          position: 'absolute', top: 18, left: 20,
          width: 240, pointerEvents: 'none',
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            marginBottom: 6,
          }}>
            <div style={{
              width: 14, height: 14, borderRadius: '50%',
              background: COLORS.firefly,
              boxShadow: `0 0 10px ${COLORS.firefly}`,
              opacity: uiState.lowLight ? (Math.sin(performance.now() / 250) * 0.5 + 0.5) : 1,
            }} />
            <div style={{
              fontSize: 14, fontWeight: 600, letterSpacing: 1,
              color: uiState.lowLight ? '#ff9999' : '#FFE082',
              textShadow: `0 0 6px rgba(241,196,15,${uiState.lowLight ? 0.3 : 0.6})`,
            }}>
              光能 {uiState.lightEnergy.toFixed(1)} / {uiState.maxEnergy}
            </div>
          </div>
          <div style={{
            width: '100%', height: 8, borderRadius: 4,
            background: 'rgba(255,255,255,0.08)',
            overflow: 'hidden',
            boxShadow: 'inset 0 0 4px rgba(0,0,0,0.3)',
          }}>
            <div style={{
              width: `${energyPct}%`, height: '100%',
              background: uiState.lowLight
                ? 'linear-gradient(90deg, #e74c3c, #f39c12)'
                : 'linear-gradient(90deg, #F39C12, #F1C40F, #FFE082)',
              boxShadow: `0 0 10px ${uiState.lowLight ? '#e74c3c' : COLORS.firefly}`,
              transition: 'width 120ms ease-out',
            }} />
          </div>
          {uiState.lowLight && (
            <div style={{
              marginTop: 6, fontSize: 12, color: '#ff7777',
              letterSpacing: 1,
              animation: 'pulse 0.5s infinite alternate',
            }}>
              ⚠ 低光！5秒内未补光将消散（{(5 - uiState.lowLightTimer).toFixed(1)}s）
            </div>
          )}
        </div>

        {/* HUD - 右上角能力图标 */}
        <div style={{
          position: 'absolute', top: 18, right: 20,
          display: 'flex', gap: 10, alignItems: 'center',
          pointerEvents: 'none',
        }}>
          <AbilityBadge
            active={uiState.speedBoost}
            color={COLORS.redPistil}
            label="加速"
            time={uiState.speedBoostTime}
            max={5}
          />
          <AbilityBadge
            active={uiState.wallPierce}
            color={COLORS.greenPistil}
            label="穿墙"
            time={uiState.wallPierce ? 1 : 0}
            max={1}
            booleanOnly
          />
          <AbilityBadge
            active={uiState.hasMirror}
            color={COLORS.bluePistil}
            label="镜像"
            time={uiState.mirrorTime}
            max={3}
          />
        </div>

        {/* HUD - 底部操作提示 */}
        <div style={{
          position: 'absolute', bottom: 18, left: 0, right: 0,
          textAlign: 'center', pointerEvents: 'none',
        }}>
          <div style={{
            fontSize: 12, letterSpacing: 2,
            color: 'rgba(255,255,255,0.45)',
          }}>
            方向键 / WASD 移动 · 触碰花蕊获得能力 · 抵达中央种子通关 · 按 R 重新开始
          </div>
        </div>

        {/* 通关覆盖层 */}
        {uiState.gameStatus === 'WON' && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'auto',
            animation: 'fadeIn 800ms ease-out',
          }}>
            <div style={{
              textAlign: 'center',
              padding: '40px 60px',
              borderRadius: 20,
              background: 'radial-gradient(circle, rgba(249,168,37,0.15), rgba(11,11,43,0.6))',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(249,168,37,0.25)',
              boxShadow: '0 0 80px rgba(249,168,37,0.3)',
            }}>
              <h1 style={{
                margin: 0, marginBottom: 10,
                fontSize: 56, fontWeight: 800, letterSpacing: 12,
                color: '#FFE082',
                textShadow:
                  '0 0 10px rgba(249,168,37,0.8), 0 0 40px rgba(249,168,37,0.6), 0 0 80px rgba(241,196,15,0.4)',
              }}>
                灵光绽放
              </h1>
              <p style={{
                margin: 0, marginBottom: 30, fontSize: 16,
                color: 'rgba(255,255,255,0.75)', letterSpacing: 4,
              }}>
                魔法种子绽放，夜空被绚烂的萤火点亮 · 试炼达成
              </p>
              <button
                onClick={restartGame}
                style={{
                  padding: '12px 36px', fontSize: 16, letterSpacing: 4,
                  color: '#0B0B2B', background: 'linear-gradient(90deg, #F1C40F, #FFE082)',
                  border: 'none', borderRadius: 30, cursor: 'pointer',
                  fontWeight: 700,
                  boxShadow: '0 0 20px rgba(241,196,15,0.6)',
                  transition: 'transform 150ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                再度试炼
              </button>
            </div>
          </div>
        )}

        {/* 失败覆盖层 */}
        {uiState.gameStatus === 'LOST' && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex',
            alignItems: 'center', justifyContent: 'center',
            pointerEvents: 'auto',
            animation: 'fadeIn 600ms ease-out',
          }}>
            <div style={{
              textAlign: 'center',
              padding: '40px 60px',
              borderRadius: 20,
              background: 'radial-gradient(circle, rgba(231,76,60,0.12), rgba(0,0,0,0.7))',
              backdropFilter: 'blur(4px)',
              border: '1px solid rgba(231,76,60,0.25)',
              boxShadow: '0 0 60px rgba(231,76,60,0.2)',
            }}>
              <h1 style={{
                margin: 0, marginBottom: 12,
                fontSize: 48, fontWeight: 800, letterSpacing: 10,
                color: '#ff8a80',
                textShadow: '0 0 20px rgba(231,76,60,0.6)',
              }}>
                试炼未竟
              </h1>
              <p style={{
                margin: 0, marginBottom: 8, fontSize: 14,
                color: 'rgba(255,180,180,0.8)', letterSpacing: 2,
              }}>
                {uiState.loseReason}
              </p>
              <p style={{
                margin: 0, marginBottom: 30, fontSize: 13,
                color: 'rgba(255,255,255,0.4)',
              }}>
                萤火虽灭，初心未改
              </p>
              <button
                onClick={restartGame}
                style={{
                  padding: '12px 36px', fontSize: 16, letterSpacing: 4,
                  color: '#fff', background: 'linear-gradient(90deg, #C62828, #E74C3C)',
                  border: 'none', borderRadius: 30, cursor: 'pointer',
                  fontWeight: 700,
                  boxShadow: '0 0 20px rgba(231,76,60,0.5)',
                  transition: 'transform 150ms',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
              >
                重新试炼
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}

function AbilityBadge({
  active, color, label, time, max, booleanOnly = false,
}: {
  active: boolean; color: string; label: string; time: number; max: number; booleanOnly?: boolean;
}) {
  const pct = booleanOnly ? (active ? 1 : 0) : Math.max(0, Math.min(1, time / max));
  return (
    <div style={{
      position: 'relative',
      width: 46, height: 46, borderRadius: '50%',
      background: active ? color : 'rgba(255,255,255,0.05)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      border: `2px solid ${active ? color : 'rgba(255,255,255,0.1)'}`,
      boxShadow: active ? `0 0 14px ${color}` : 'none',
      opacity: active ? 1 : 0.4,
      transition: 'all 200ms',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        height: `${pct * 100}%`,
        background: `linear-gradient(180deg, transparent, ${color})`,
        opacity: 0.35,
      }} />
      <span style={{
        fontSize: 11, fontWeight: 700, letterSpacing: 1,
        color: active ? '#fff' : 'rgba(255,255,255,0.5)',
        zIndex: 1,
      }}>
        {label}
      </span>
    </div>
  );
}

// ============ Canvas 绘制工具函数 ============

function drawBackgroundStars(ctx: CanvasRenderingContext2D, t: number) {
  const count = 60;
  for (let i = 0; i < count; i++) {
    const seed = i * 9301 + 49297;
    const x = (seed * 233) % CANVAS_W;
    const y = (seed * 239) % CANVAS_H;
    const a = 0.15 + 0.15 * Math.sin(t * 2 + i);
    const r = 0.5 + ((seed % 5) / 5) * 1.2;
    ctx.fillStyle = `rgba(200, 210, 255, ${a.toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawMaze(
  ctx: CanvasRenderingContext2D,
  cells: any[][],
  cs: number,
  t: number,
) {
  for (let y = 0; y < cells.length; y++) {
    for (let x = 0; x < cells[y].length; x++) {
      const c = cells[y][x];
      const px = x * cs;
      const py = y * cs;
      if (c.type === ('WALL' as CellType)) {
        ctx.fillStyle = 'rgba(46, 204, 113, 0.3)';
        roundRect(ctx, px + 2, py + 2, cs - 4, cs - 4, 6);
        ctx.fill();
        ctx.strokeStyle = 'rgba(46, 204, 113, 0.08)';
        ctx.lineWidth = 1;
        roundRect(ctx, px + 2, py + 2, cs - 4, cs - 4, 6);
        ctx.stroke();
      } else {
        ctx.fillStyle = 'rgba(213, 219, 219, 0.06)';
        roundRect(ctx, px + 4, py + 4, cs - 8, cs - 8, 4);
        ctx.fill();
        if (c.isStart) {
          ctx.fillStyle = 'rgba(241, 196, 15, 0.12)';
          roundRect(ctx, px + 6, py + 6, cs - 12, cs - 12, 6);
          ctx.fill();
        }
        if (c.pistilType) {
          drawPistil(ctx, px + cs / 2, py + cs / 2, PISTIL_COLORS[c.pistilType], t);
        }
        if (c.hasLightPoint) {
          drawLightPoint(ctx, px + cs / 2, py + cs / 2, t);
        }
      }
    }
  }
}

function drawPistil(ctx: CanvasRenderingContext2D, cx: number, cy: number, color: string, t: number) {
  const pulse = 1 + 0.08 * Math.sin(t * 4);
  const r = 12 * pulse;
  const grad = ctx.createRadialGradient(cx, cy, 1, cx, cy, r * 2.2);
  grad.addColorStop(0, color);
  grad.addColorStop(0.4, hexWithAlpha(color, 0.6));
  grad.addColorStop(1, hexWithAlpha(color, 0));
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, r * 2.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + t;
    const px = cx + Math.cos(a) * (r * 0.5);
    const py = cy + Math.sin(a) * (r * 0.5);
    ctx.moveTo(cx, cy);
    ctx.arc(px, py, r * 0.45, 0, Math.PI * 2);
  }
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.beginPath();
  ctx.arc(cx, cy, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function drawLightPoint(ctx: CanvasRenderingContext2D, cx: number, cy: number, t: number) {
  const a = 0.5 + 0.5 * Math.sin(t * 2 + cx * 0.1 + cy * 0.1);
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14);
  grad.addColorStop(0, `rgba(255,255,255,${a.toFixed(2)})`);
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(cx, cy, 14, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = `rgba(255,255,255,${(0.5 + a * 0.5).toFixed(2)})`;
  ctx.beginPath();
  ctx.arc(cx, cy, 2, 0, Math.PI * 2);
  ctx.fill();
}

function drawSeed(
  ctx: CanvasRenderingContext2D,
  gx: number, gy: number, cs: number,
  t: number, activated: boolean, progress: number,
) {
  const cx = gx * cs + cs / 2;
  const cy = gy * cs + cs / 2;
  const baseR = 22 + 2 * Math.sin(t * 3);

  const glowR = baseR * (activated ? (2 + progress * 10) : 3);
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR);
  if (activated) {
    glow.addColorStop(0, `rgba(255,255,255,${0.9 * (1 - progress * 0.4)})`);
    glow.addColorStop(0.3, `rgba(255,224,130,${0.7 * (1 - progress)})`);
    glow.addColorStop(1, 'rgba(249,168,37,0)');
  } else {
    glow.addColorStop(0, 'rgba(255,224,130,0.5)');
    glow.addColorStop(1, 'rgba(249,168,37,0)');
  }
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(cx, cy, glowR, 0, Math.PI * 2);
  ctx.fill();

  if (!activated) {
    const seedGrad = ctx.createRadialGradient(cx - 5, cy - 5, 1, cx, cy, baseR);
    seedGrad.addColorStop(0, '#FFF59D');
    seedGrad.addColorStop(0.5, '#F9A825');
    seedGrad.addColorStop(1, '#E65100');
    ctx.fillStyle = seedGrad;
    ctx.beginPath();
    ctx.ellipse(cx, cy, baseR * 0.9, baseR, t * 0.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,240,200,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(cx, cy - baseR);
    ctx.quadraticCurveTo(cx + 4, cy, cx, cy + baseR * 0.9);
    ctx.stroke();
  }
}

function drawFirefly(
  ctx: CanvasRenderingContext2D,
  x: number, y: number,
  color: string, brightness: number, cs: number,
) {
  if (brightness <= 0.001) return;
  void cs;
  const glowR = 45 * brightness;
  const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
  glow.addColorStop(0, hexWithAlpha(color, 0.9 * brightness));
  glow.addColorStop(0.25, hexWithAlpha(color, 0.4 * brightness));
  glow.addColorStop(1, hexWithAlpha(color, 0));
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(x, y, glowR, 0, Math.PI * 2);
  ctx.fill();

  const r = 8 * brightness;
  const bodyGrad = ctx.createRadialGradient(x, y, 0, x, y, r);
  bodyGrad.addColorStop(0, '#FFFFFF');
  bodyGrad.addColorStop(0.5, color);
  bodyGrad.addColorStop(1, hexWithAlpha(color, 0.7));
  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

function drawPulses(ctx: CanvasRenderingContext2D, pulses: any[]) {
  for (const p of pulses) {
    const t = Math.max(0, p.life / p.maxLife);
    const alpha = t;
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
    grad.addColorStop(0, hexWithAlpha(p.color, 0));
    grad.addColorStop(0.75, hexWithAlpha(p.color, 0.35 * alpha));
    grad.addColorStop(1, hexWithAlpha(p.color, 0));
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = hexWithAlpha(p.color, 0.8 * alpha);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawAfterImages(ctx: CanvasRenderingContext2D, imgs: any[]) {
  for (const a of imgs) {
    const t = Math.max(0, a.life / a.maxLife);
    drawFirefly(ctx, a.x, a.y, a.color, 0.35 * t, 80);
  }
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: any[]) {
  if (particles.length === 0) return;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const a = Math.max(0, p.alpha);
    if (a <= 0.01) continue;
    const size = Math.max(0.2, p.size);
    const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, size * 2.2);
    g.addColorStop(0, hexWithAlpha(p.color, a));
    g.addColorStop(1, hexWithAlpha(p.color, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.x, p.y, size * 2.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawEdgeFlash(ctx: CanvasRenderingContext2D, color: string, alpha: number) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const s = 40;
  const grad = ctx.createLinearGradient(0, 0, 0, s);
  grad.addColorStop(0, hexWithAlpha(color, alpha * 0.6));
  grad.addColorStop(1, hexWithAlpha(color, 0));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, s);
  const grad2 = ctx.createLinearGradient(0, h, 0, h - s);
  grad2.addColorStop(0, hexWithAlpha(color, alpha * 0.6));
  grad2.addColorStop(1, hexWithAlpha(color, 0));
  ctx.fillStyle = grad2;
  ctx.fillRect(0, h - s, w, s);
  const grad3 = ctx.createLinearGradient(0, 0, s, 0);
  grad3.addColorStop(0, hexWithAlpha(color, alpha * 0.5));
  grad3.addColorStop(1, hexWithAlpha(color, 0));
  ctx.fillStyle = grad3;
  ctx.fillRect(0, 0, s, h);
  const grad4 = ctx.createLinearGradient(w, 0, w - s, 0);
  grad4.addColorStop(0, hexWithAlpha(color, alpha * 0.5));
  grad4.addColorStop(1, hexWithAlpha(color, 0));
  ctx.fillStyle = grad4;
  ctx.fillRect(w - s, 0, s, h);
}

function drawWinVignette(ctx: CanvasRenderingContext2D, progress: number) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const p = Math.min(1, progress);
  const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.max(w, h) * 0.7);
  g.addColorStop(0, `rgba(255,240,200,${0.25 * p})`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function drawLoseVignette(ctx: CanvasRenderingContext2D, t: number) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  void t;
  const g = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.2, w / 2, h / 2, Math.max(w, h) * 0.7);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(20,0,0,0.7)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function computeBrightness(energy: number, lowLight: boolean, t: number): number {
  if (lowLight) {
    const blink = (Math.sin(t * Math.PI * 2 * 2) * 0.5 + 0.5);
    return 0.1 + blink * 0.08;
  }
  const r = Math.min(1, energy / 10);
  return 0.5 + r * 0.5;
}

function hexWithAlpha(hex: string, alpha: number): string {
  if (hex.startsWith('#') && hex.length === 7) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    const a = Math.max(0, Math.min(1, alpha));
    return `rgba(${r}, ${g}, ${b}, ${a.toFixed(4)})`;
  }
  return hex;
}
