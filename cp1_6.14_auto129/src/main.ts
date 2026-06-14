import {
  GameEngine,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  PADDLE_WIDTH,
  type GameStateData,
  type Difficulty,
  type Paddle,
  type ChargeState,
} from './GameEngine.js';
import { ParticleSystem } from './ParticleSystem.js';

const CANVAS_FULL_HEIGHT = 540;

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const gameEngine = new GameEngine();
const particleSystem = new ParticleSystem();

let mouseX = CANVAS_WIDTH / 2;
let mouseY = CANVAS_HEIGHT / 2;
let isMouseDown = false;
let selectedDifficulty: Difficulty = 'normal';
let hoveredButton: string | null = null;

const difficultyButtons = [
  { key: 'easy' as Difficulty, label: '简单', x: CANVAS_WIDTH / 2 - 270, y: CANVAS_HEIGHT / 2 + 40, w: 160, h: 56 },
  { key: 'normal' as Difficulty, label: '普通', x: CANVAS_WIDTH / 2 - 80, y: CANVAS_HEIGHT / 2 + 40, w: 160, h: 56 },
  { key: 'hard' as Difficulty, label: '困难', x: CANVAS_WIDTH / 2 + 110, y: CANVAS_HEIGHT / 2 + 40, w: 160, h: 56 },
];

const restartButton = { x: CANVAS_WIDTH / 2 - 100, y: CANVAS_HEIGHT / 2 + 60, w: 200, h: 48 };

function drawBackground(): void {
  const gradient = ctx.createRadialGradient(
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT / 2,
    50,
    CANVAS_WIDTH / 2,
    CANVAS_HEIGHT / 2,
    CANVAS_WIDTH
  );
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#0a0a0a');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function drawCenterLine(): void {
  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.lineWidth = 2;
  ctx.setLineDash([10, 10]);
  ctx.beginPath();
  ctx.moveTo(CANVAS_WIDTH / 2, 0);
  ctx.lineTo(CANVAS_WIDTH / 2, 500);
  ctx.stroke();
  ctx.restore();
}

function roundRect(x: number, y: number, w: number, h: number, r: number): void {
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

function drawPaddleGlow(paddle: Paddle, charge: ChargeState): void {
  if (charge.glowProgress <= 0) return;

  const easeProgress = 1 - Math.pow(1 - charge.glowProgress, 3);
  const minRadius = PADDLE_WIDTH * 0.6;
  const maxRadius = PADDLE_WIDTH * 1.0;
  const outerRadius = minRadius + (maxRadius - minRadius) * easeProgress;

  const cx = paddle.x + paddle.width / 2;
  const cy = paddle.y + paddle.height / 2;

  const r1 = 0, g1 = 245, b1 = 212;
  const r2 = 247, g2 = 37, b2 = 133;
  const r = Math.round(r1 + (r2 - r1) * easeProgress);
  const g = Math.round(g1 + (g2 - g1) * easeProgress);
  const b = Math.round(b1 + (b2 - b1) * easeProgress);

  ctx.save();
  const gradient = ctx.createRadialGradient(cx, cy, minRadius * 0.5, cx, cy, outerRadius);
  gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.6 * easeProgress})`);
  gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.9 * easeProgress})`;
  ctx.lineWidth = 3;
  ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.8)`;
  ctx.shadowBlur = 20;
  ctx.beginPath();
  ctx.arc(cx, cy, outerRadius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

function drawPaddle(paddle: Paddle, charge: ChargeState): void {
  drawPaddleGlow(paddle, charge);

  const r1 = 0, g1 = 245, b1 = 212;
  const r2 = 247, g2 = 37, b2 = 133;
  const r = Math.round(r1 + (r2 - r1) * charge.chargePercent);
  const g = Math.round(g1 + (g2 - g1) * charge.chargePercent);
  const b = Math.round(b1 + (b2 - b1) * charge.chargePercent);
  const color = `rgb(${r}, ${g}, ${b})`;

  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.fillStyle = color;
  roundRect(paddle.x, paddle.y, paddle.width, paddle.height, paddle.radius);
  ctx.fill();
  ctx.restore();
}

function drawBall(ball: GameStateData['ball']): void {
  ctx.save();
  ctx.shadowColor = '#f72585';
  ctx.shadowBlur = 20;
  ctx.fillStyle = '#f72585';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
  ctx.beginPath();
  ctx.arc(ball.x - ball.radius * 0.3, ball.y - ball.radius * 0.3, ball.radius * 0.4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawScores(state: GameStateData): void {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  roundRect(20, CANVAS_HEIGHT / 2 - 30, 80, 60, 8);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 24px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${state.topScore}`, 60, CANVAS_HEIGHT / 2 - 15);
  ctx.fillText(`${state.bottomScore}`, 60, CANVAS_HEIGHT / 2 + 15);
  ctx.restore();
}

function drawChargeBar(state: GameStateData): void {
  const barX = CANVAS_WIDTH / 2 - 100;
  const barY = CANVAS_HEIGHT + 16;
  const barW = 200;
  const barH = 8;
  const barRadius = 4;

  const activeCharge = state.bottomCharge.chargePercent > 0 ? state.bottomCharge : state.topCharge;
  const chargePercent = activeCharge.chargePercent;

  ctx.save();
  ctx.fillStyle = '#333333';
  roundRect(barX, barY, barW, barH, barRadius);
  ctx.fill();

  if (chargePercent > 0) {
    const fillW = barW * chargePercent;
    const gradient = ctx.createLinearGradient(barX, barY, barX + barW, barY);
    gradient.addColorStop(0, '#00f5d4');
    gradient.addColorStop(1, '#f72585');
    ctx.fillStyle = gradient;
    roundRect(barX, barY, fillW, barH, barRadius);
    ctx.fill();
  }
  ctx.restore();
}

function drawScorePopup(state: GameStateData): void {
  if (!state.scorePopup.show) return;

  ctx.save();
  ctx.translate(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);
  ctx.scale(state.scorePopup.scale, state.scorePopup.scale);
  ctx.globalAlpha = state.scorePopup.opacity;

  ctx.font = 'bold 48px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f72585';
  ctx.shadowColor = '#f72585';
  ctx.shadowBlur = 20;
  ctx.fillText(state.scorePopup.text, 0, 0);

  ctx.restore();
}

function drawScreenFlash(state: GameStateData): void {
  if (!state.screenFlash.active) return;

  ctx.save();
  ctx.globalAlpha = state.screenFlash.opacity;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.restore();
}

function drawMenu(): void {
  ctx.save();

  ctx.font = 'bold 56px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const gradient = ctx.createLinearGradient(CANVAS_WIDTH / 2 - 150, 0, CANVAS_WIDTH / 2 + 150, 0);
  gradient.addColorStop(0, '#00f5d4');
  gradient.addColorStop(1, '#f72585');
  ctx.fillStyle = gradient;
  ctx.shadowColor = '#f72585';
  ctx.shadowBlur = 30;
  ctx.fillText('GlowPong', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);

  ctx.shadowBlur = 0;
  ctx.font = '20px "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
  ctx.fillText('选择难度开始游戏', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);

  for (const btn of difficultyButtons) {
    const isSelected = selectedDifficulty === btn.key;
    const isHovered = hoveredButton === btn.key;

    ctx.save();
    if (isHovered && !isSelected) {
      ctx.shadowColor = '#f72585';
      ctx.shadowBlur = 15;
    }

    ctx.strokeStyle = '#f72585';
    ctx.lineWidth = 2;
    ctx.fillStyle = isSelected ? '#f72585' : '#14213d';
    roundRect(btn.x, btn.y, btn.w, btn.h, 16);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isSelected ? '#ffffff' : '#ffffff';
    ctx.font = 'bold 18px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(btn.label, btn.x + btn.w / 2, btn.y + btn.h / 2);
    ctx.restore();
  }

  ctx.font = '14px "Segoe UI", sans-serif';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.fillText('鼠标控制球拍，按住左键蓄力击球', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 130);

  ctx.restore();
}

function drawGameOver(state: GameStateData): void {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const panelX = CANVAS_WIDTH / 2 - 200;
  const panelY = CANVAS_HEIGHT / 2 - 150;
  const panelW = 400;
  const panelH = 300;

  const bgGradient = ctx.createLinearGradient(panelX, panelY, panelX, panelY + panelH);
  bgGradient.addColorStop(0, '#1a1a2e');
  bgGradient.addColorStop(1, '#16213e');
  ctx.fillStyle = bgGradient;
  roundRect(panelX, panelY, panelW, panelH, 24);
  ctx.fill();

  ctx.strokeStyle = 'rgba(247, 37, 133, 0.3)';
  ctx.lineWidth = 1;
  roundRect(panelX, panelY, panelW, panelH, 24);
  ctx.stroke();

  ctx.font = 'bold 36px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#f72585';
  ctx.shadowColor = '#f72585';
  ctx.shadowBlur = 20;

  const winnerText = state.winner === 'top' ? '上方获胜!' : '下方获胜!';
  ctx.fillText(winnerText, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);

  ctx.shadowBlur = 0;
  ctx.font = 'bold 24px "Segoe UI", sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`${state.topScore} : ${state.bottomScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

  const btn = restartButton;
  const isHovered = hoveredButton === 'restart';

  ctx.save();
  if (isHovered) {
    ctx.translate(btn.x + btn.w / 2, btn.y + btn.h / 2);
    ctx.scale(1.05, 1.05);
    ctx.translate(-(btn.x + btn.w / 2), -(btn.y + btn.h / 2));
    ctx.shadowColor = '#f72585';
    ctx.shadowBlur = 20;
  }

  ctx.fillStyle = '#f72585';
  roundRect(btn.x, btn.y, btn.w, btn.h, 24);
  ctx.fill();

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 18px "Segoe UI", sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('再玩一局', btn.x + btn.w / 2, btn.y + btn.h / 2);
  ctx.restore();

  ctx.restore();
}

function drawGame(state: GameStateData): void {
  drawBackground();
  drawCenterLine();
  drawScores(state);
  drawPaddle(state.topPaddle, state.topCharge);
  drawPaddle(state.bottomPaddle, state.bottomCharge);
  drawBall(state.ball);
  particleSystem.draw(ctx);
  drawScorePopup(state);
  drawScreenFlash(state);
}

function render(): void {
  const state = gameEngine.getStateData();

  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_FULL_HEIGHT);

  if (state.state === 'menu') {
    drawBackground();
    drawMenu();
  } else if (state.state === 'playing') {
    drawGame(state);
    drawChargeBar(state);
  } else if (state.state === 'gameover') {
    drawGame(state);
    drawChargeBar(state);
    drawGameOver(state);
  }
}

let lastTime = performance.now();

function gameLoop(currentTime: number): void {
  const dt = Math.min((currentTime - lastTime) / 1000, 0.05);
  lastTime = currentTime;

  if (gameEngine.getState() === 'playing') {
    gameEngine.setPaddlePosition('bottom', mouseX);
    gameEngine.setPaddlePosition('top', CANVAS_WIDTH - mouseX);
  }

  gameEngine.update(dt);

  const state = gameEngine.getStateData();
  if (state.state === 'playing') {
    if (state.hitOccurred) {
      particleSystem.spawnHit(state.hitX, state.hitY, 16);
    }
    if (gameEngine.isTrailing()) {
      particleSystem.spawn(state.ball.x, state.ball.y, 8);
    }
  }

  particleSystem.update(dt);
  render();

  requestAnimationFrame(gameLoop);
}

function getCanvasMousePos(e: MouseEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * scaleX,
    y: (e.clientY - rect.top) * scaleY,
  };
}

canvas.addEventListener('mousemove', (e) => {
  const pos = getCanvasMousePos(e);
  mouseX = pos.x;
  mouseY = pos.y;

  hoveredButton = null;
  const state = gameEngine.getState();

  if (state === 'menu') {
    for (const btn of difficultyButtons) {
      if (pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
        hoveredButton = btn.key;
        break;
      }
    }
  } else if (state === 'gameover') {
    const btn = restartButton;
    if (pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
      hoveredButton = 'restart';
    }
  }
});

canvas.addEventListener('mousedown', (e) => {
  if (e.button !== 0) return;
  const pos = getCanvasMousePos(e);
  const state = gameEngine.getState();

  if (state === 'menu') {
    for (const btn of difficultyButtons) {
      if (pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
        selectedDifficulty = btn.key;
        gameEngine.setDifficulty(selectedDifficulty);
        gameEngine.startGame();
        particleSystem.clear();
        return;
      }
    }
  } else if (state === 'gameover') {
    const btn = restartButton;
    if (pos.x >= btn.x && pos.x <= btn.x + btn.w && pos.y >= btn.y && pos.y <= btn.y + btn.h) {
      gameEngine.resetGame();
      particleSystem.clear();
      return;
    }
  } else if (state === 'playing') {
    isMouseDown = true;
    gameEngine.startCharge('bottom');
    gameEngine.startCharge('top');
  }
});

canvas.addEventListener('mouseup', (e) => {
  if (e.button !== 0) return;
  if (!isMouseDown) return;
  isMouseDown = false;
  if (gameEngine.getState() === 'playing') {
    gameEngine.endCharge('bottom');
    gameEngine.endCharge('top');
  }
});

canvas.addEventListener('mouseleave', () => {
  hoveredButton = null;
  if (isMouseDown) {
    isMouseDown = false;
    if (gameEngine.getState() === 'playing') {
      gameEngine.endCharge('bottom');
      gameEngine.endCharge('top');
    }
  }
});

requestAnimationFrame(gameLoop);
