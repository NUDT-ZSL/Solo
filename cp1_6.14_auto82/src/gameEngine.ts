import {
  GameState,
  LevelElement,
  EnemySimState,
  ParticleState,
  BulletState,
  PathNode,
  Cover,
  ToolType,
} from './types';

const MAX_PARTICLES = 50;
const BULLET_SPEED = 500;
const SPARK_COUNT = 6;
const SPARK_LIFE = 0.3;
const ENEMY_RADIUS = 14;
const ENEMY_SPEED = 80;

let idCounter = 0;
function uid(): string {
  return `sim_${++idCounter}`;
}

function createGameState(elements: LevelElement[], canvasW: number, canvasH: number): GameState {
  const enemies: EnemySimState[] = [];
  const covers: Cover[] = [];

  for (const el of elements) {
    if (el.type === ToolType.ENEMY_SPAWN) {
      const spawn = el as { id: string; x: number; y: number; pathNodes: PathNode[]; patrolSpeed: number };
      const nodes = spawn.pathNodes.length >= 2 ? spawn.pathNodes : [
        { id: uid(), x: spawn.x + 80, y: spawn.y },
        { id: uid(), x: spawn.x - 80, y: spawn.y },
      ];
      enemies.push({
        id: uid(),
        x: spawn.x,
        y: spawn.y,
        radius: ENEMY_RADIUS,
        pathNodes: nodes,
        currentNodeIndex: 0,
        speed: spawn.patrolSpeed || ENEMY_SPEED,
        flashTimer: 0,
        alive: true,
      });
    }
    if (el.type === ToolType.COVER) {
      covers.push({ ...(el as Cover) });
    }
  }

  return {
    player: {
      x: canvasW / 2,
      y: canvasH / 2,
      radius: 12,
      speed: 200,
    },
    bullets: [],
    enemies,
    particles: [],
    covers,
    keys: {},
    mouseX: 0,
    mouseY: 0,
    running: false,
    animFrameId: 0,
    lastTime: 0,
  };
}

function spawnSparks(state: GameState, x: number, y: number) {
  if (state.particles.length >= MAX_PARTICLES) return;
  for (let i = 0; i < SPARK_COUNT; i++) {
    const angle = (Math.PI * 2 / SPARK_COUNT) * i + Math.random() * 0.5;
    const speed = 80 + Math.random() * 120;
    const p: ParticleState = {
      id: uid(),
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: SPARK_LIFE,
      maxLife: SPARK_LIFE,
      color: '#ffdd44',
      radius: 2 + Math.random() * 2,
    };
    state.particles.push(p);
    if (state.particles.length >= MAX_PARTICLES) break;
  }
}

function updatePlayer(state: GameState, dt: number, canvasW: number, canvasH: number) {
  const p = state.player;
  let dx = 0, dy = 0;
  if (state.keys['w'] || state.keys['arrowup']) dy -= 1;
  if (state.keys['s'] || state.keys['arrowdown']) dy += 1;
  if (state.keys['a'] || state.keys['arrowleft']) dx -= 1;
  if (state.keys['d'] || state.keys['arrowright']) dx += 1;
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 0) {
    dx /= len;
    dy /= len;
  }
  p.x += dx * p.speed * dt;
  p.y += dy * p.speed * dt;
  p.x = Math.max(p.radius, Math.min(canvasW - p.radius, p.x));
  p.y = Math.max(p.radius, Math.min(canvasH - p.radius, p.y));

  for (const c of state.covers) {
    const cx = c.x - c.width / 2;
    const cy = c.y - c.height / 2;
    const closestX = Math.max(cx, Math.min(p.x, cx + c.width));
    const closestY = Math.max(cy, Math.min(p.y, cy + c.height));
    const distX = p.x - closestX;
    const distY = p.y - closestY;
    const dist = Math.sqrt(distX * distX + distY * distY);
    if (dist < p.radius) {
      if (dist === 0) {
        p.x = cx - p.radius;
      } else {
        const overlap = p.radius - dist;
        p.x += (distX / dist) * overlap;
        p.y += (distY / dist) * overlap;
      }
    }
  }
}

function updateBullets(state: GameState, dt: number) {
  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;

    let hit = false;

    for (const c of state.covers) {
      const cx = c.x - c.width / 2;
      const cy = c.y - c.height / 2;
      if (b.x >= cx && b.x <= cx + c.width && b.y >= cy && b.y <= cy + c.height) {
        hit = true;
        spawnSparks(state, b.x, b.y);
        break;
      }
    }

    if (!hit) {
      for (const e of state.enemies) {
        if (!e.alive) continue;
        const dx = b.x - e.x;
        const dy = b.y - e.y;
        if (dx * dx + dy * dy < (b.radius + e.radius) * (b.radius + e.radius)) {
          e.flashTimer = 0.3;
          e.alive = false;
          hit = true;
          break;
        }
      }
    }

    if (hit || b.x < -50 || b.x > 3000 || b.y < -50 || b.y > 3000) {
      state.bullets.splice(i, 1);
    }
  }
}

function updateEnemies(state: GameState, dt: number) {
  for (const e of state.enemies) {
    if (!e.alive) {
      if (e.flashTimer > 0) e.flashTimer -= dt;
      continue;
    }
    if (e.pathNodes.length < 2) continue;

    const target = e.pathNodes[e.currentNodeIndex];
    const dx = target.x - e.x;
    const dy = target.y - e.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < 2) {
      e.currentNodeIndex = (e.currentNodeIndex + 1) % e.pathNodes.length;
    } else {
      const moveX = (dx / dist) * e.speed * dt;
      const moveY = (dy / dist) * e.speed * dt;
      e.x += moveX;
      e.y += moveY;
    }
  }
}

function updateParticles(state: GameState, dt: number) {
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) {
      state.particles.splice(i, 1);
    }
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = '#1a1a2e';
  ctx.lineWidth = 1;
  const step = 40;
  for (let x = 0; x <= w; x += step) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += step) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
}

function drawCovers(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const c of state.covers) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = '#4a4a5e';
    ctx.fillRect(c.x - c.width / 2, c.y - c.height / 2, c.width, c.height);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = '#8a8a9e';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(c.x - c.width / 2, c.y - c.height / 2, c.width, c.height);
    ctx.setLineDash([]);
    ctx.restore();
  }
}

function drawEnemies(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const e of state.enemies) {
    if (!e.alive && e.flashTimer <= 0) continue;

    ctx.save();
    if (!e.alive) {
      ctx.globalAlpha = e.flashTimer / 0.3;
      ctx.fillStyle = '#ff4444';
    } else {
      ctx.fillStyle = '#ff6b6b';
    }
    ctx.beginPath();
    ctx.arc(e.x, e.y, e.radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#cc4444';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();

    if (e.alive && e.pathNodes.length >= 2) {
      ctx.save();
      ctx.strokeStyle = '#4488ff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(e.pathNodes[0].x, e.pathNodes[0].y);
      for (let i = 1; i < e.pathNodes.length; i++) {
        ctx.lineTo(e.pathNodes[i].x, e.pathNodes[i].y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, state: GameState) {
  const p = state.player;
  ctx.save();
  ctx.fillStyle = '#4fc3f7';
  ctx.beginPath();
  ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#29b6f6';
  ctx.lineWidth = 2;
  ctx.stroke();

  const angle = Math.atan2(state.mouseY - p.y, state.mouseX - p.x);
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x, p.y);
  ctx.lineTo(p.x + Math.cos(angle) * (p.radius + 8), p.y + Math.sin(angle) * (p.radius + 8));
  ctx.stroke();
  ctx.restore();
}

function drawBullets(ctx: CanvasRenderingContext2D, state: GameState) {
  ctx.save();
  ctx.fillStyle = '#ffffff';
  for (const b of state.bullets) {
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, state: GameState) {
  for (const p of state.particles) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, p.life / p.maxLife);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius * (p.life / p.maxLife), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawPulsingBorder(ctx: CanvasRenderingContext2D, w: number, h: number, time: number) {
  const intensity = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin((time / 2000) * Math.PI * 2));
  ctx.save();
  ctx.strokeStyle = `rgba(79, 195, 247, ${intensity})`;
  ctx.lineWidth = 3;
  ctx.shadowColor = '#4fc3f7';
  ctx.shadowBlur = 12 * intensity;
  ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
  ctx.restore();
}

function render(ctx: CanvasRenderingContext2D, state: GameState, canvasW: number, canvasH: number, time: number) {
  ctx.clearRect(0, 0, canvasW, canvasH);
  ctx.fillStyle = '#0d0d15';
  ctx.fillRect(0, 0, canvasW, canvasH);
  drawGrid(ctx, canvasW, canvasH);
  drawCovers(ctx, state);
  drawEnemies(ctx, state);
  drawPlayer(ctx, state);
  drawBullets(ctx, state);
  drawParticles(ctx, state);
  drawPulsingBorder(ctx, canvasW, canvasH, time);
}

export function startSimulation(
  canvas: HTMLCanvasElement,
  elements: LevelElement[],
  onExit: () => void
): GameState {
  const ctx = canvas.getContext('2d')!;
  const w = canvas.width;
  const h = canvas.height;

  const state = createGameState(elements, w, h);
  state.running = true;
  state.lastTime = performance.now();

  function onKeyDown(e: KeyboardEvent) {
    state.keys[e.key.toLowerCase()] = true;
    if (e.key === 'Escape') {
      state.running = false;
    }
  }
  function onKeyUp(e: KeyboardEvent) {
    state.keys[e.key.toLowerCase()] = false;
  }
  function onMouseMove(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    state.mouseX = e.clientX - rect.left;
    state.mouseY = e.clientY - rect.top;
  }
  function onMouseDown(e: MouseEvent) {
    if (e.button !== 0) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;
    const dx = mx - state.player.x;
    const dy = my - state.player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist === 0) return;
    const b: BulletState = {
      id: uid(),
      x: state.player.x,
      y: state.player.y,
      vx: (dx / dist) * BULLET_SPEED,
      vy: (dy / dist) * BULLET_SPEED,
      radius: 3,
    };
    state.bullets.push(b);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mousedown', onMouseDown);

  function loop(time: number) {
    if (!state.running) {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mousedown', onMouseDown);
      onExit();
      return;
    }
    const dt = Math.min((time - state.lastTime) / 1000, 0.05);
    state.lastTime = time;

    updatePlayer(state, dt, w, h);
    updateBullets(state, dt);
    updateEnemies(state, dt);
    updateParticles(state, dt);
    render(ctx, state, w, h, time);

    state.animFrameId = requestAnimationFrame(loop);
  }

  state.animFrameId = requestAnimationFrame(loop);
  return state;
}

export function stopSimulation(state: GameState) {
  state.running = false;
  if (state.animFrameId) {
    cancelAnimationFrame(state.animFrameId);
  }
}
