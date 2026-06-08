import { Core, Enemy } from './core';
import { EnemyManager } from './enemy';
import { ParticlePool, distance, lerpColor } from './utils';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const CORE_X = 400;
const CORE_Y = 300;
const CORE_RADIUS = 20;
const GRID_SPACING = 50;
const GRID_COLOR = '#2D4A5A';
const BG_COLOR_START = '#0A0F2E';
const BG_COLOR_END = '#2A0A3A';
const EDGE_PULSE_INTERVAL = 20;

interface GameState {
  score: number;
  mouseX: number;
  mouseY: number;
  gridRotation: number;
  edgePulseTimer: number;
  flowTime: number;
}

function renderBackground(ctx: CanvasRenderingContext2D, state: GameState, core: Core): void {
  const pulseIntensity = 1 + Math.sin(state.flowTime * 2) * 0.03 * (core.energy / 100 + 0.5);
  const gradient = ctx.createRadialGradient(
    CORE_X,
    CORE_Y,
    0,
    CORE_X,
    CORE_Y,
    Math.max(CANVAS_WIDTH, CANVAS_HEIGHT) * 0.75 * pulseIntensity
  );
  gradient.addColorStop(0, BG_COLOR_START);
  gradient.addColorStop(1, BG_COLOR_END);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.save();
  ctx.translate(CORE_X, CORE_Y);
  ctx.rotate(state.gridRotation);
  ctx.strokeStyle = GRID_COLOR;
  ctx.lineWidth = 0.5;
  ctx.globalAlpha = 0.2;

  const maxExtent = Math.max(CANVAS_WIDTH, CANVAS_HEIGHT);
  const halfExtent = maxExtent;

  for (let x = -halfExtent; x <= halfExtent; x += GRID_SPACING) {
    ctx.beginPath();
    ctx.moveTo(x, -halfExtent);
    ctx.lineTo(x, halfExtent);
    ctx.stroke();
  }
  for (let y = -halfExtent; y <= halfExtent; y += GRID_SPACING) {
    ctx.beginPath();
    ctx.moveTo(-halfExtent, y);
    ctx.lineTo(halfExtent, y);
    ctx.stroke();
  }
  ctx.restore();

  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.lineWidth = 1.5;
  const flowColors = ['#00FFB9', '#A78BFA', '#00D4FF'];
  for (let i = 0; i < 3; i++) {
    ctx.strokeStyle = flowColors[i];
    ctx.shadowColor = flowColors[i];
    ctx.shadowBlur = 6;
    ctx.beginPath();
    const offset = state.flowTime * 0.3 + i * 2;
    for (let t = 0; t < Math.PI * 2; t += 0.05) {
      const r = 150 + i * 40 + Math.sin(t * 3 + offset) * 30;
      const x = CORE_X + Math.cos(t + offset * 0.5) * r;
      const y = CORE_Y + Math.sin(t + offset * 0.5) * r;
      if (t === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.stroke();
  }
  ctx.restore();
}

function renderCrosshair(ctx: CanvasRenderingContext2D, state: GameState, enemies: Enemy[]): void {
  let hoverEnemy = false;
  for (const e of enemies) {
    if (!e.alive) continue;
    if (distance(state.mouseX, state.mouseY, e.x, e.y) < e.size + 10) {
      hoverEnemy = true;
      break;
    }
  }

  const baseSize = 12;
  const size = hoverEnemy ? baseSize * 1.5 : baseSize;
  const color = hoverEnemy ? '#FF4444' : '#FFFFFF';
  const alpha = hoverEnemy ? 1 : 0.8;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.shadowColor = color;
  ctx.shadowBlur = hoverEnemy ? 12 : 6;

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const x = state.mouseX + Math.cos(angle) * size;
    const y = state.mouseY + Math.sin(angle) * size;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(state.mouseX, state.mouseY, 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function renderUI(ctx: CanvasRenderingContext2D, state: GameState, core: Core): void {
  ctx.save();
  ctx.font = 'bold 18px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = '#00FFB9';
  ctx.shadowBlur = 8;
  ctx.textAlign = 'left';
  ctx.fillText(`分数: ${state.score}`, 20, 32);
  ctx.restore();

  const barX = CANVAS_WIDTH - 140;
  const barY = 20;
  const barWidth = 120;
  const barHeight = 16;
  const radius = 8;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(barX + radius, barY);
  ctx.lineTo(barX + barWidth - radius, barY);
  ctx.quadraticCurveTo(barX + barWidth, barY, barX + barWidth, barY + radius);
  ctx.lineTo(barX + barWidth, barY + barHeight - radius);
  ctx.quadraticCurveTo(barX + barWidth, barY + barHeight, barX + barWidth - radius, barY + barHeight);
  ctx.lineTo(barX + radius, barY + barHeight);
  ctx.quadraticCurveTo(barX, barY + barHeight, barX, barY + barHeight - radius);
  ctx.lineTo(barX, barY + radius);
  ctx.quadraticCurveTo(barX, barY, barX + radius, barY);
  ctx.closePath();
  ctx.fillStyle = '#00000080';
  ctx.fill();
  ctx.strokeStyle = '#FFFFFF40';
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.restore();

  const fillWidth = (barWidth - 4) * (core.energy / 100);
  if (fillWidth > 0) {
    ctx.save();
    ctx.beginPath();
    const innerX = barX + 2;
    const innerY = barY + 2;
    const innerH = barHeight - 4;
    const innerR = radius - 2;
    ctx.moveTo(innerX + innerR, innerY);
    ctx.lineTo(innerX + fillWidth - innerR, innerY);
    ctx.quadraticCurveTo(innerX + fillWidth, innerY, innerX + fillWidth, innerY + innerR);
    ctx.lineTo(innerX + fillWidth, innerY + innerH - innerR);
    ctx.quadraticCurveTo(innerX + fillWidth, innerY + innerH, innerX + fillWidth - innerR, innerY + innerH);
    ctx.lineTo(innerX + innerR, innerY + innerH);
    ctx.quadraticCurveTo(innerX, innerY + innerH, innerX, innerY + innerH - innerR);
    ctx.lineTo(innerX, innerY + innerR);
    ctx.quadraticCurveTo(innerX, innerY, innerX + innerR, innerY);
    ctx.closePath();
    const energyColor = lerpColor(Core.COLOR_START, Core.COLOR_END, core.energy / 100);
    const barGradient = ctx.createLinearGradient(innerX, innerY, innerX + fillWidth, innerY);
    barGradient.addColorStop(0, Core.COLOR_START);
    barGradient.addColorStop(1, energyColor);
    ctx.fillStyle = barGradient;
    ctx.shadowColor = energyColor;
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.restore();
  }

  ctx.save();
  ctx.font = 'bold 11px "Segoe UI", Tahoma, Geneva, Verdana, sans-serif';
  ctx.fillStyle = '#FFFFFFCC';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.floor(core.energy)}%`, barX + barWidth / 2, barY + barHeight - 4);
  ctx.restore();
}

function init(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Canvas 2D context not available');
    return;
  }

  const loader = document.getElementById('loader');
  if (loader) {
    setTimeout(() => {
      loader.classList.add('hidden');
    }, 600);
  }

  const particlePool = new ParticlePool(800);
  const core = new Core(CORE_X, CORE_Y, CORE_RADIUS, particlePool);
  const enemyManager = new EnemyManager(particlePool);

  const state: GameState = {
    score: 0,
    mouseX: CANVAS_WIDTH / 2,
    mouseY: 100,
    gridRotation: 0,
    edgePulseTimer: 0,
    flowTime: 0
  };

  const handleMouseMove = (e: MouseEvent): void => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    state.mouseX = (e.clientX - rect.left) * scaleX;
    state.mouseY = (e.clientY - rect.top) * scaleY;
  };

  const handleClick = (): void => {
    core.fireBullet(state.mouseX, state.mouseY);
  };

  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('click', handleClick);

  let lastTime = performance.now();

  const onEnemyAbsorbed = (): void => {
    state.score += 10;
    core.addEnergy(5);
  };

  const gameLoop = (now: number): void => {
    const dt = Math.min((now - lastTime) / 1000, 0.05);
    lastTime = now;

    state.gridRotation += dt * 0.08;
    state.flowTime += dt;
    state.edgePulseTimer += dt;

    if (state.edgePulseTimer >= EDGE_PULSE_INTERVAL) {
      state.edgePulseTimer = 0;
      core.triggerEdgePulse(enemyManager.enemies, CANVAS_WIDTH, CANVAS_HEIGHT);
    }

    enemyManager.update(dt, CANVAS_WIDTH, CANVAS_HEIGHT, CORE_X, CORE_Y);
    core.update(dt, enemyManager.enemies, CANVAS_WIDTH, CANVAS_HEIGHT, onEnemyAbsorbed);
    core.absorbParticlesToCore(dt);
    particlePool.update(dt);

    renderBackground(ctx, state, core);
    core.renderParticles(ctx);
    enemyManager.render(ctx);
    core.render(ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
    renderUI(ctx, state, core);
    renderCrosshair(ctx, state, enemyManager.enemies);

    requestAnimationFrame(gameLoop);
  };

  requestAnimationFrame(gameLoop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
