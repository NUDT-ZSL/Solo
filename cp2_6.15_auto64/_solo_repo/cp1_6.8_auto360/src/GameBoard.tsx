import { useRef, useEffect, useCallback } from 'react';
import {
  GameState,
  PlacedPlant,
  EnemyInstance,
  Particle,
  InteractivePointState,
  updateParticles,
  processSpawns,
  processAttacks,
  moveEnemies,
  checkWinLose,
  getCellFromMouse,
} from '@/utils/gameLogic';
import { GRID_COLS, GRID_ROWS, CELL_SIZE, isPathCell, PATH_WAYPOINTS, PLANTS } from '@/utils/plants';

interface GameBoardProps {
  gameState: GameState;
  onStateUpdate: (state: GameState) => void;
  hoveredCell: { col: number; row: number } | null;
  onMouseMove: (cell: { col: number; row: number } | null) => void;
  onCellClick: (col: number, row: number) => void;
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#4A7C59');
  grad.addColorStop(0.5, '#6B8F4A');
  grad.addColorStop(1, '#D4A843');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(0,0,0,0.03)';
  for (let i = 0; i < 60; i++) {
    const x = (Math.sin(i * 137.5) * 0.5 + 0.5) * w;
    const y = (Math.cos(i * 97.3) * 0.5 + 0.5) * h;
    ctx.beginPath();
    ctx.arc(x, y, 2 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGrid(
  ctx: CanvasRenderingContext2D,
  offsetX: number,
  offsetY: number,
  hoveredCell: { col: number; row: number } | null
) {
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const x = offsetX + col * CELL_SIZE;
      const y = offsetY + row * CELL_SIZE;
      const onPath = isPathCell(col, row);

      if (onPath) {
        ctx.fillStyle = 'rgba(139,119,83,0.35)';
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        ctx.fillStyle = 'rgba(160,140,100,0.2)';
        ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      } else {
        const grad = ctx.createLinearGradient(x, y, x + CELL_SIZE, y + CELL_SIZE);
        grad.addColorStop(0, 'rgba(90,130,70,0.25)');
        grad.addColorStop(1, 'rgba(70,110,50,0.15)');
        ctx.fillStyle = grad;
        ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);

        ctx.strokeStyle = 'rgba(255,255,255,0.08)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 3, y + 3, CELL_SIZE - 6, CELL_SIZE - 6);

        ctx.fillStyle = 'rgba(255,255,255,0.04)';
        ctx.fillRect(x + 4, y + 4, CELL_SIZE - 8, 2);
      }

      if (hoveredCell && hoveredCell.col === col && hoveredCell.row === row && !onPath) {
        ctx.fillStyle = 'rgba(255,255,200,0.15)';
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);
        ctx.strokeStyle = 'rgba(255,255,200,0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      }
    }
  }

  ctx.strokeStyle = 'rgba(255,255,255,0.06)';
  ctx.lineWidth = 0.5;
  for (let row = 0; row <= GRID_ROWS; row++) {
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY + row * CELL_SIZE);
    ctx.lineTo(offsetX + GRID_COLS * CELL_SIZE, offsetY + row * CELL_SIZE);
    ctx.stroke();
  }
  for (let col = 0; col <= GRID_COLS; col++) {
    ctx.beginPath();
    ctx.moveTo(offsetX + col * CELL_SIZE, offsetY);
    ctx.lineTo(offsetX + col * CELL_SIZE, offsetY + GRID_ROWS * CELL_SIZE);
    ctx.stroke();
  }
}

function drawPath(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number) {
  if (PATH_WAYPOINTS.length < 2) return;

  ctx.strokeStyle = 'rgba(180,160,120,0.5)';
  ctx.lineWidth = 20;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(offsetX + PATH_WAYPOINTS[0].col * CELL_SIZE + CELL_SIZE / 2, offsetY + PATH_WAYPOINTS[0].row * CELL_SIZE + CELL_SIZE / 2);
  for (let i = 1; i < PATH_WAYPOINTS.length; i++) {
    ctx.lineTo(offsetX + PATH_WAYPOINTS[i].col * CELL_SIZE + CELL_SIZE / 2, offsetY + PATH_WAYPOINTS[i].row * CELL_SIZE + CELL_SIZE / 2);
  }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(200,180,140,0.3)';
  ctx.lineWidth = 12;
  ctx.beginPath();
  ctx.moveTo(offsetX + PATH_WAYPOINTS[0].col * CELL_SIZE + CELL_SIZE / 2, offsetY + PATH_WAYPOINTS[0].row * CELL_SIZE + CELL_SIZE / 2);
  for (let i = 1; i < PATH_WAYPOINTS.length; i++) {
    ctx.lineTo(offsetX + PATH_WAYPOINTS[i].col * CELL_SIZE + CELL_SIZE / 2, offsetY + PATH_WAYPOINTS[i].row * CELL_SIZE + CELL_SIZE / 2);
  }
  ctx.stroke();

  const startWp = PATH_WAYPOINTS[1];
  if (startWp) {
    const sx = offsetX + startWp.col * CELL_SIZE + CELL_SIZE / 2;
    const sy = offsetY + startWp.row * CELL_SIZE + CELL_SIZE / 2;
    ctx.fillStyle = 'rgba(255,80,80,0.7)';
    ctx.beginPath();
    ctx.moveTo(sx, sy - 10);
    ctx.lineTo(sx + 8, sy);
    ctx.lineTo(sx, sy + 10);
    ctx.closePath();
    ctx.fill();
  }

  const endWp = PATH_WAYPOINTS[PATH_WAYPOINTS.length - 2];
  if (endWp) {
    const ex = offsetX + endWp.col * CELL_SIZE + CELL_SIZE / 2;
    const ey = offsetY + endWp.row * CELL_SIZE + CELL_SIZE / 2;
    ctx.fillStyle = 'rgba(80,255,80,0.7)';
    ctx.beginPath();
    ctx.arc(ex, ey, 8, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawInteractivePoints(
  ctx: CanvasRenderingContext2D,
  offsetX: number,
  offsetY: number,
  points: InteractivePointState[],
  time: number
) {
  for (const point of points) {
    const cx = offsetX + point.col * CELL_SIZE + CELL_SIZE / 2;
    const cy = offsetY + point.row * CELL_SIZE + CELL_SIZE / 2;

    if (point.frozen) {
      if (point.freezeAnim > 0) {
        const animProgress = 1 - point.freezeAnim;
        const radius = 20 * animProgress;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
        grad.addColorStop(0, 'rgba(168,216,234,0.6)');
        grad.addColorStop(1, 'rgba(168,216,234,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
      }

      const iceGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 22);
      iceGrad.addColorStop(0, 'rgba(200,240,255,0.7)');
      iceGrad.addColorStop(0.5, 'rgba(168,216,234,0.5)');
      iceGrad.addColorStop(1, 'rgba(168,216,234,0.1)');
      ctx.fillStyle = iceGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 22, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = 'rgba(200,240,255,0.4)';
      ctx.lineWidth = 1;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6 + time * 0.01;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * 16, cy + Math.sin(angle) * 16);
        ctx.stroke();
      }
    } else {
      const pondGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 18);
      pondGrad.addColorStop(0, 'rgba(70,130,180,0.5)');
      pondGrad.addColorStop(0.7, 'rgba(70,130,180,0.3)');
      pondGrad.addColorStop(1, 'rgba(70,130,180,0)');
      ctx.fillStyle = pondGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, 18, 0, Math.PI * 2);
      ctx.fill();

      const ripple = Math.sin(time * 0.05) * 3;
      ctx.strokeStyle = 'rgba(100,160,210,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 12 + ripple, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
}

function drawPlant(ctx: CanvasRenderingContext2D, plant: PlacedPlant, offsetX: number, offsetY: number, time: number) {
  const cx = offsetX + plant.col * CELL_SIZE + CELL_SIZE / 2;
  const cy = offsetY + plant.row * CELL_SIZE + CELL_SIZE / 2;
  const pulse = Math.sin(time * plant.config.animationParams.pulseSpeed * 0.05) * 3;

  const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 28 + pulse);
  glowGrad.addColorStop(0, plant.config.glowColor);
  glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glowGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, 28 + pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = plant.config.color;
  ctx.beginPath();
  ctx.arc(cx, cy, 16 + pulse * 0.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.beginPath();
  ctx.arc(cx - 4, cy - 5, 5, 0, Math.PI * 2);
  ctx.fill();

  switch (plant.config.season) {
    case 'spring': {
      ctx.strokeStyle = 'rgba(92,184,92,0.6)';
      ctx.lineWidth = 2;
      for (let i = 0; i < 3; i++) {
        const angle = (Math.PI * 2 * i) / 3 + time * 0.02;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        const endX = cx + Math.cos(angle) * (20 + pulse);
        const endY = cy + Math.sin(angle) * (20 + pulse);
        const cpx = cx + Math.cos(angle + 0.5) * 12;
        const cpy = cy + Math.sin(angle + 0.5) * 12;
        ctx.quadraticCurveTo(cpx, cpy, endX, endY);
        ctx.stroke();
      }
      break;
    }
    case 'summer': {
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI * 2 * i) / 5 + time * 0.03;
        const len = 10 + pulse * 0.5 + Math.sin(time * 0.1 + i) * 3;
        ctx.fillStyle = `rgba(255,${150 + i * 20},50,0.6)`;
        ctx.beginPath();
        ctx.ellipse(
          cx + Math.cos(angle) * (14 + len * 0.3),
          cy + Math.sin(angle) * (14 + len * 0.3),
          3, len * 0.4,
          angle, 0, Math.PI * 2
        );
        ctx.fill();
      }
      break;
    }
    case 'autumn': {
      for (let i = 0; i < 4; i++) {
        const angle = (Math.PI * 2 * i) / 4 + Math.sin(time * 0.02) * 0.3;
        const lx = cx + Math.cos(angle) * (18 + pulse * 0.3);
        const ly = cy + Math.sin(angle) * (18 + pulse * 0.3);
        ctx.fillStyle = 'rgba(232,197,71,0.5)';
        ctx.beginPath();
        ctx.ellipse(lx, ly, 6, 3, angle, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'winter': {
      ctx.strokeStyle = 'rgba(168,216,234,0.6)';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI * 2 * i) / 6 + time * 0.01;
        const len = 14 + pulse * 0.3;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
        ctx.stroke();

        const branchLen = 6;
        const bx = cx + Math.cos(angle) * len * 0.6;
        const by = cy + Math.sin(angle) * len * 0.6;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(angle + 0.8) * branchLen, by + Math.sin(angle + 0.8) * branchLen);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.lineTo(bx + Math.cos(angle - 0.8) * branchLen, by + Math.sin(angle - 0.8) * branchLen);
        ctx.stroke();
      }
      break;
    }
  }

  if (plant.shieldHp > 0) {
    ctx.strokeStyle = 'rgba(212,168,67,0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(212,168,67,0.8)';
    ctx.font = '10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${plant.shieldHp}`, cx, cy + 28);
  }

  if (plant.cooldownTimer > 0) {
    const cdRatio = plant.cooldownTimer / (plant.config.cooldown * 30);
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 20, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * cdRatio);
    ctx.closePath();
    ctx.fill();
  }
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: EnemyInstance, time: number) {
  if (!enemy.alive && enemy.deathTimer <= 0) return;

  const alpha = enemy.alive ? 1 : enemy.deathTimer / 30;

  ctx.save();
  ctx.globalAlpha = alpha;

  if (!enemy.alive) {
    const scale = 1 + (1 - enemy.deathTimer / 30) * 0.5;
    ctx.translate(enemy.x, enemy.y);
    ctx.scale(scale, scale);
    ctx.translate(-enemy.x, -enemy.y);
  }

  const wobble = enemy.sliding ? Math.sin(time * 0.2) * 3 : Math.sin(time * 0.05) * 1;
  const cx = enemy.x + wobble;
  const cy = enemy.y;
  const size = enemy.config.size;

  const shadowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, size);
  shadowGrad.addColorStop(0, enemy.config.color);
  shadowGrad.addColorStop(0.7, enemy.config.shadowColor);
  shadowGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = shadowGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, size, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(100,60,150,0.4)';
  ctx.beginPath();
  ctx.ellipse(cx - size * 0.3, cy - size * 0.2, 3, 5, -0.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(cx + size * 0.3, cy - size * 0.2, 3, 5, 0.3, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(200,100,255,0.8)';
  ctx.beginPath();
  ctx.arc(cx - size * 0.25, cy - 2, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx + size * 0.25, cy - 2, 2, 0, Math.PI * 2);
  ctx.fill();

  if (enemy.frozen) {
    ctx.strokeStyle = 'rgba(168,216,234,0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, size + 4, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI * 2 * i) / 4 + time * 0.02;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (size + 2), cy + Math.sin(a) * (size + 2));
      ctx.lineTo(cx + Math.cos(a) * (size + 8), cy + Math.sin(a) * (size + 8));
      ctx.stroke();
    }
  }

  if (enemy.slowed) {
    ctx.strokeStyle = 'rgba(92,184,92,0.5)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(cx, cy, size + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  const hpRatio = enemy.hp / enemy.maxHp;
  const barW = size * 2;
  const barH = 3;
  const barX = cx - barW / 2;
  const barY = cy - size - 8;

  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(barX, barY, barW, barH);

  ctx.fillStyle = hpRatio > 0.5 ? '#5CB85C' : hpRatio > 0.25 ? '#FF6B35' : '#FF3333';
  ctx.fillRect(barX, barY, barW * hpRatio, barH);

  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]) {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.alpha * 0.8;
    const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
    grad.addColorStop(0, p.color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export default function GameBoard({ gameState, onStateUpdate, hoveredCell, onMouseMove, onCellClick }: GameBoardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef(gameState);
  const animFrameRef = useRef<number>(0);
  const timeRef = useRef(0);

  stateRef.current = gameState;

  const getOffset = useCallback((canvas: HTMLCanvasElement) => {
    const boardW = GRID_COLS * CELL_SIZE;
    const boardH = GRID_ROWS * CELL_SIZE;
    return {
      ox: (canvas.width - boardW) / 2,
      oy: (canvas.height - boardH) / 2,
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    let lastTime = 0;
    let tickAccum = 0;
    const TICK_RATE = 1000 / 60;

    const resizeCanvas = () => {
      const rect = canvas.parentElement!.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };

    const resizeObs = new ResizeObserver(resizeCanvas);
    resizeObs.observe(canvas.parentElement!);
    resizeCanvas();

    const gameLoop = (timestamp: number) => {
      const delta = timestamp - lastTime;
      lastTime = timestamp;

      if (delta > 0 && delta < 200) {
        tickAccum += delta;
        while (tickAccum >= TICK_RATE) {
          tickAccum -= TICK_RATE;
          timeRef.current += 1;

          let state = { ...stateRef.current };

          state.particles = updateParticles(state.particles);

          state = processSpawns(state);

          if (state.phase === 'attack') {
            state.attackPhaseTimer -= 1;
            if (state.attackPhaseTimer % 20 === 0) {
              state = processAttacks(state);
            }
            if (state.attackPhaseTimer <= 0) {
              state = { ...state, phase: 'enemy_move', enemyMovePhaseTimer: 120 };
            }
          }

          if (state.phase === 'enemy_move') {
            state = moveEnemies(state);
            state.enemyMovePhaseTimer -= 1;

            const allDead = state.enemies.every((e) => !e.alive);
            const queueEmpty = state.enemySpawnQueue.length === 0;
            if (allDead && queueEmpty) {
              const newHand = [...state.handCards];
              while (newHand.length < 3) {
                const idx = Math.floor(Math.random() * PLANTS.length);
                newHand.push(PLANTS[idx]);
              }
              state = {
                ...state,
                phase: 'player',
                turn: state.turn + 1,
                energy: Math.min(3 + Math.floor(state.turn / 3), 8),
                handCards: newHand,
              };
            }
          }

          state = checkWinLose(state);

          for (const point of state.interactivePoints) {
            if (point.freezeAnim > 0) {
              point.freezeAnim = Math.max(0, point.freezeAnim - 0.02);
            }
          }

          onStateUpdate(state);
        }
      }

      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;
      const { ox, oy } = getOffset(canvas);

      ctx.save();
      ctx.clearRect(0, 0, w, h);

      drawBackground(ctx, w, h);
      drawGrid(ctx, ox, oy, hoveredCell);
      drawPath(ctx, ox, oy);
      drawInteractivePoints(ctx, ox, oy, stateRef.current.interactivePoints, timeRef.current);

      for (const plant of stateRef.current.plants) {
        drawPlant(ctx, plant, ox, oy, timeRef.current);
      }

      for (const enemy of stateRef.current.enemies) {
        drawEnemy(ctx, enemy, timeRef.current);
      }

      drawParticles(ctx, stateRef.current.particles);

      if (stateRef.current.phase === 'game_over') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#FF6B6B';
        ctx.font = 'bold 48px "ZCOOL KuaiLe", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('森林沦陷...', w / 2, h / 2 - 20);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '18px "Noto Sans SC", sans-serif';
        ctx.fillText('点击任意处重新开始', w / 2, h / 2 + 30);
      }

      if (stateRef.current.phase === 'victory') {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, w, h);
        ctx.fillStyle = '#E8C547';
        ctx.font = 'bold 48px "ZCOOL KuaiLe", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('森林守护成功！', w / 2, h / 2 - 20);
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '18px "Noto Sans SC", sans-serif';
        ctx.fillText(`最终得分: ${stateRef.current.score}`, w / 2, h / 2 + 30);
      }

      ctx.restore();

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      resizeObs.disconnect();
    };
  }, [getOffset, hoveredCell, onStateUpdate]);

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;
      const cell = getCellFromMouse(x, y, w, h);
      onMouseMove(cell);
    },
    [onMouseMove]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const w = canvas.width / window.devicePixelRatio;
      const h = canvas.height / window.devicePixelRatio;
      const cell = getCellFromMouse(x, y, w, h);
      if (cell) {
        onCellClick(cell.col, cell.row);
      }
    },
    [onCellClick]
  );

  return (
    <canvas
      ref={canvasRef}
      className="game-canvas"
      onMouseMove={handleMouseMove}
      onClick={handleClick}
    />
  );
}
