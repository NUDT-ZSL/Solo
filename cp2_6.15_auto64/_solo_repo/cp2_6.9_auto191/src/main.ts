import { drawMap } from './map';
import { Player } from './player';
import { Ghost } from './ghost';
import { Rune, Particle } from './rune';

const CANVAS_WIDTH = 600;
const CANVAS_HEIGHT = 400;
const DAMAGE_FLASH_DURATION = 0.3;
const GAME_OVER_FADE_DURATION = 0.5;

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let player: Player;
let ghosts: Ghost[];
let runes: Rune[];
let particles: Particle[];
let lastTime: number = 0;
let running: boolean = true;
let gameOver: boolean = false;
let damageFlashTimer: number = 0;
let gameOverTimer: number = 0;

function init(): void {
  canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  resetGame();
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
  lastTime = performance.now();
  requestAnimationFrame(loop);
}

function resetGame(): void {
  player = new Player(1, 1);
  ghosts = [
    new Ghost([
      { x: 1, y: 7 },
      { x: 5, y: 7 },
      { x: 5, y: 10 },
      { x: 1, y: 10 },
    ], 0),
    new Ghost([
      { x: 10, y: 3 },
      { x: 15, y: 3 },
      { x: 15, y: 5 },
    ], 0.2),
    new Ghost([
      { x: 20, y: 8 },
      { x: 24, y: 8 },
      { x: 24, y: 13 },
    ], 0.1),
    new Ghost([
      { x: 14, y: 13 },
      { x: 14, y: 17 },
      { x: 10, y: 17 },
      { x: 10, y: 13 },
    ], 0.15),
  ];
  runes = [
    new Rune(3, 1),
    new Rune(7, 3),
    new Rune(27, 1),
    new Rune(28, 10),
    new Rune(1, 13),
    new Rune(14, 10),
    new Rune(22, 17),
    new Rune(14, 17),
  ];
  particles = [];
  running = true;
  gameOver = false;
  damageFlashTimer = 0;
  gameOverTimer = 0;
}

function handleKeyDown(e: KeyboardEvent): void {
  const key = e.key.toLowerCase();
  if (key === 'r' && gameOver) {
    resetGame();
    return;
  }
  if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
    e.preventDefault();
  }
  player?.handleKeyDown(e.key);
}

function handleKeyUp(e: KeyboardEvent): void {
  player?.handleKeyUp(e.key);
}

function update(dt: number): void {
  if (gameOver) {
    gameOverTimer = Math.min(GAME_OVER_FADE_DURATION, gameOverTimer + dt);
    return;
  }
  player.update(dt);
  for (const ghost of ghosts) {
    ghost.update(dt);
  }
  for (const rune of runes) {
    rune.update(dt);
  }
  if (damageFlashTimer > 0) {
    damageFlashTimer = Math.max(0, damageFlashTimer - dt);
  }
  for (const rune of runes) {
    if (rune.checkCollision(player.x, player.y)) {
      const result = rune.collect();
      player.addScore(result.score);
      for (const p of result.particles) {
        particles.push(p);
      }
    }
  }
  for (const ghost of ghosts) {
    if (ghost.checkCollision(player.x, player.y)) {
      if (player.takeDamage(ghost.getCenterX(), ghost.getCenterY())) {
        damageFlashTimer = DAMAGE_FLASH_DURATION;
        if (player.lives <= 0) {
          gameOver = true;
        }
      }
    }
  }
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0) {
      particles.splice(i, 1);
    }
  }
}

function drawParticles(): void {
  for (const p of particles) {
    const alpha = p.life / p.maxLife;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#FF8C00';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawHUD(): void {
  ctx.font = '16px monospace';
  ctx.textBaseline = 'top';
  let heartX = CANVAS_WIDTH - 80;
  const heartY = CANVAS_HEIGHT - 26;
  for (let i = 0; i < 3; i++) {
    ctx.fillStyle = i < player.lives ? '#FF3333' : '#808080';
    const hx = heartX + i * 24;
    ctx.beginPath();
    ctx.moveTo(hx + 8, heartY + 6);
    ctx.bezierCurveTo(hx + 8, heartY + 4, hx + 4, heartY, hx + 4, heartY + 4);
    ctx.bezierCurveTo(hx + 4, heartY + 2, hx, heartY + 2, hx, heartY + 6);
    ctx.bezierCurveTo(hx, heartY + 10, hx + 8, heartY + 16, hx + 8, heartY + 16);
    ctx.bezierCurveTo(hx + 8, heartY + 16, hx + 16, heartY + 10, hx + 16, heartY + 6);
    ctx.bezierCurveTo(hx + 16, heartY + 2, hx + 12, heartY + 2, hx + 12, heartY + 4);
    ctx.bezierCurveTo(hx + 12, heartY, hx + 8, heartY + 4, hx + 8, heartY + 6);
    ctx.closePath();
    ctx.fill();
  }
  ctx.fillStyle = '#FFFFFF';
  ctx.textAlign = 'right';
  ctx.fillText(`Score: ${player.score}`, CANVAS_WIDTH - 8, 8);
}

function drawDamageFlash(): void {
  if (damageFlashTimer <= 0) return;
  const alpha = (damageFlashTimer / DAMAGE_FLASH_DURATION) * 0.3;
  ctx.save();
  ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.restore();
}

function drawGameOver(): void {
  if (!gameOver) return;
  const alpha = Math.min(1, gameOverTimer / GAME_OVER_FADE_DURATION);
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FF0000';
  ctx.font = '32px monospace';
  ctx.fillText('Game Over', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 30);
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '18px monospace';
  ctx.fillText(`Final Score: ${player.score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
  ctx.fillStyle = '#AAAAAA';
  ctx.font = '14px monospace';
  ctx.fillText('Press R to Restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
  ctx.restore();
}

function render(): void {
  drawMap(ctx);
  for (const rune of runes) {
    rune.draw(ctx);
  }
  player.draw(ctx);
  for (const ghost of ghosts) {
    ghost.draw(ctx);
  }
  drawParticles();
  drawHUD();
  drawDamageFlash();
  drawGameOver();
}

function loop(currentTime: number): void {
  if (!running) return;
  let dt = (currentTime - lastTime) / 1000;
  lastTime = currentTime;
  if (dt > 0.05) dt = 0.05;
  update(dt);
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  render();
  requestAnimationFrame(loop);
}

window.addEventListener('load', init);
