import { SceneState, createSceneState, getCurrentLevel, advanceLevel, resetLevel, LEVELS } from './scene';
import { RuneBall, Slot, createBall, createSlot, updateBall, collideBallWithWalls, collideBalls, checkSlotCapture, updateSlot } from './ball';
import { Pendulum, Particle, createPendulum, updatePendulum, collidePendulumWithBall, collidePendulumWithWalls, createTrailParticle, updateParticle, isPointOnPendulum, startDrag, updateDrag, releaseDrag } from './pendulum';
import { drawBackground, drawWall, drawExit, drawSlot, drawRuneBall, drawPendulum, drawParticles } from './renderer';
import { UIState, createUIState, layoutButtons, updateHint, drawUI, hitTestButton, updateButtonHover } from './ui';

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let sceneState: SceneState;
let uiState: UIState;
let pendulum: Pendulum;
let balls: RuneBall[] = [];
let slots: Slot[] = [];
let particles: Particle[] = [];
let trailTimer = 0;
let lastTime = 0;
let audioCtx: AudioContext | null = null;

const GAME_WIDTH = 700;
const GAME_HEIGHT = 650;

function initAudio(): void {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
}

function playSlotSound(color: string): void {
  if (!audioCtx) return;
  const freqMap: Record<string, number> = {
    red: 220,
    blue: 330,
    green: 440,
    gold: 554,
  };
  const freq = freqMap[color] || 330;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.5, audioCtx.currentTime + 0.8);
  gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.8);

  const osc2 = audioCtx.createOscillator();
  const gain2 = audioCtx.createGain();
  osc2.type = 'triangle';
  osc2.frequency.setValueAtTime(freq * 1.5, audioCtx.currentTime);
  osc2.frequency.exponentialRampToValueAtTime(freq * 0.75, audioCtx.currentTime + 1.2);
  gain2.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain2.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 1.2);
  osc2.connect(gain2);
  gain2.connect(audioCtx.destination);
  osc2.start();
  osc2.stop(audioCtx.currentTime + 1.2);
}

function playCollisionSound(): void {
  if (!audioCtx) return;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(800 + Math.random() * 400, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(200, audioCtx.currentTime + 0.15);
  gain.gain.setValueAtTime(0.15, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.15);
  osc.connect(gain);
  gain.connect(audioCtx.destination);
  osc.start();
  osc.stop(audioCtx.currentTime + 0.15);
}

function loadLevel(): void {
  const level = getCurrentLevel(sceneState);
  pendulum = createPendulum(level.pendulumAnchor.x, level.pendulumAnchor.y, level.pendulumAnchor.ropeLength);
  balls = level.balls.map(b => createBall(b));
  slots = level.slots.map(s => createSlot(s));
  particles = [];
  trailTimer = 0;
  updateHint(uiState, sceneState);
}

function init(): void {
  canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  if (!canvas) return;

  ctx = canvas.getContext('2d')!;
  if (!ctx) return;

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  sceneState = createSceneState();
  uiState = createUIState();
  layoutButtons(uiState, canvas.width);

  loadLevel();

  canvas.addEventListener('mousedown', onMouseDown);
  canvas.addEventListener('mousemove', onMouseMove);
  canvas.addEventListener('mouseup', onMouseUp);
  canvas.addEventListener('touchstart', onTouchStart, { passive: false });
  canvas.addEventListener('touchmove', onTouchMove, { passive: false });
  canvas.addEventListener('touchend', onTouchEnd);

  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = GAME_WIDTH * dpr;
  canvas.height = GAME_HEIGHT * dpr;
  canvas.style.width = GAME_WIDTH + 'px';
  canvas.style.height = GAME_HEIGHT + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  if (uiState) layoutButtons(uiState, GAME_WIDTH);
}

function getCanvasPos(e: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (e.clientX - rect.left) * (GAME_WIDTH / rect.width),
    y: (e.clientY - rect.top) * (GAME_HEIGHT / rect.height),
  };
}

function onMouseDown(e: MouseEvent): void {
  initAudio();
  const pos = getCanvasPos(e);
  handlePointerDown(pos.x, pos.y);
}

function onMouseMove(e: MouseEvent): void {
  const pos = getCanvasPos(e);
  handlePointerMove(pos.x, pos.y);
}

function onMouseUp(e: MouseEvent): void {
  const pos = getCanvasPos(e);
  handlePointerUp();
}

function onTouchStart(e: TouchEvent): void {
  e.preventDefault();
  initAudio();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const x = (touch.clientX - rect.left) * (GAME_WIDTH / rect.width);
  const y = (touch.clientY - rect.top) * (GAME_HEIGHT / rect.height);
  handlePointerDown(x, y);
}

function onTouchMove(e: TouchEvent): void {
  e.preventDefault();
  const touch = e.touches[0];
  const rect = canvas.getBoundingClientRect();
  const x = (touch.clientX - rect.left) * (GAME_WIDTH / rect.width);
  const y = (touch.clientY - rect.top) * (GAME_HEIGHT / rect.height);
  handlePointerMove(x, y);
}

function onTouchEnd(e: TouchEvent): void {
  handlePointerUp();
}

function handlePointerDown(mx: number, my: number): void {
  if (sceneState.isPaused) {
    sceneState.isPaused = false;
    return;
  }

  if (sceneState.isLevelComplete) {
    advanceLevel(sceneState);
    if (!sceneState.allComplete) {
      loadLevel();
    }
    return;
  }

  if (sceneState.allComplete) return;

  const btnAction = hitTestButton(uiState, mx, my);
  if (btnAction === 'pause') {
    sceneState.isPaused = !sceneState.isPaused;
    return;
  }
  if (btnAction === 'reset') {
    resetLevel(sceneState);
    loadLevel();
    return;
  }

  if (isPointOnPendulum(pendulum, mx, my)) {
    startDrag(pendulum, mx, my);
  }
}

function handlePointerMove(mx: number, my: number): void {
  updateButtonHover(uiState, mx, my);
  updateDrag(pendulum, mx, my);
}

function handlePointerUp(): void {
  if (pendulum.isDragging) {
    const wasSwinging = pendulum.isSwinging;
    releaseDrag(pendulum);
    if (pendulum.isSwinging && !wasSwinging) {
      sceneState.swingCount++;
    }
  }
}

function gameLoop(timestamp: number): void {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  if (!sceneState.isPaused && !sceneState.isLevelComplete && !sceneState.allComplete) {
    update(dt, timestamp);
  }

  render(timestamp);
  requestAnimationFrame(gameLoop);
}

function update(dt: number, time: number): void {
  updatePendulum(pendulum, dt);
  collidePendulumWithWalls(pendulum, getCurrentLevel(sceneState).walls);

  const level = getCurrentLevel(sceneState);

  for (let i = 0; i < balls.length; i++) {
    updateBall(balls[i], dt);
    collideBallWithWalls(balls[i], level.walls);

    const impactParticles = collidePendulumWithBall(pendulum, balls[i]);
    if (impactParticles.length > 0) {
      particles.push(...impactParticles);
      playCollisionSound();
    }
  }

  for (let i = 0; i < balls.length; i++) {
    for (let j = i + 1; j < balls.length; j++) {
      collideBalls(balls[i], balls[j]);
    }
  }

  for (const ball of balls) {
    for (const slot of slots) {
      if (checkSlotCapture(ball, slot)) {
        playSlotSound(ball.color);
      }
    }
  }

  for (const slot of slots) {
    updateSlot(slot, dt);
  }

  if (pendulum.isSwinging || pendulum.isDragging) {
    trailTimer += dt;
    if (trailTimer > 0.03) {
      trailTimer = 0;
      particles.push(createTrailParticle(pendulum.x, pendulum.y));
    }
  }

  particles = particles.filter(p => updateParticle(p, dt));

  const allSlotted = slots.every(s => s.isFilled);
  if (allSlotted && slots.length > 0) {
    sceneState.isLevelComplete = true;
  }
}

function render(time: number): void {
  ctx.clearRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

  drawBackground(ctx, GAME_WIDTH, GAME_HEIGHT);

  const level = getCurrentLevel(sceneState);
  for (const wall of level.walls) {
    drawWall(ctx, wall, time);
  }

  const exitOpen = slots.every(s => s.isFilled);
  drawExit(ctx, level.exit, exitOpen, time);

  for (const slot of slots) {
    drawSlot(ctx, slot, time);
  }

  for (const ball of balls) {
    drawRuneBall(ctx, ball, time);
  }

  drawPendulum(ctx, pendulum, time);
  drawParticles(ctx, particles);
  drawUI(ctx, sceneState, uiState, GAME_WIDTH, GAME_HEIGHT, time);

  if (sceneState.isPaused) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = '#0a0612';
    ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    ctx.globalAlpha = 1;
    ctx.font = '32px "Segoe UI", sans-serif';
    ctx.fillStyle = '#b8a0d0';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('已暂停', GAME_WIDTH / 2, GAME_HEIGHT / 2);
    ctx.font = '14px "Segoe UI", sans-serif';
    ctx.fillStyle = '#8b6fb0';
    ctx.fillText('点击继续', GAME_WIDTH / 2, GAME_HEIGHT / 2 + 36);
    ctx.restore();
  }
}

window.addEventListener('DOMContentLoaded', init);
