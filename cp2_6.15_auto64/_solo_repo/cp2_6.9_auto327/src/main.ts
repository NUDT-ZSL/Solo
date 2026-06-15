import { GameEngine, GameEvents } from './game/gameEngine.js';
import { Renderer } from './game/renderer.js';
import { InputHandler } from './game/inputHandler.js';

function main(): void {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const wrapper = document.getElementById('game-wrapper') as HTMLDivElement;
  const energyBar = document.getElementById('energy-bar') as HTMLDivElement;
  const energyLabel = document.getElementById('energy-label') as HTMLDivElement;
  const timerEl = document.getElementById('timer') as HTMLDivElement;
  const scorePanel = document.getElementById('score-panel') as HTMLDivElement;
  const scoreValue = document.getElementById('score-value') as HTMLDivElement;
  const scoreDetail = document.getElementById('score-detail') as HTMLDivElement;
  const restartBtn = document.getElementById('restart-btn') as HTMLButtonElement;

  function resizeCanvas(): void {
    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';
  }

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  const engine = new GameEngine({
    width: 900,
    height: 650,
    hexSize: 30,
    gameDuration: 120,
    initialEnergy: 100,
    energyDecayRate: 0.5,
    energyGainPerMinion: 5,
    minionSpawnInterval: 2000,
    coreRadius: 20,
    minionRadius: 12,
    energyShardRadius: 8
  });

  const renderer = new Renderer(canvas, engine);
  const input = new InputHandler(canvas, engine, renderer);

  engine.on(GameEvents.ENERGY_UPDATE, (data: unknown) => {
    const d = data as { energy: number; maxEnergy: number; lowEnergy: boolean };
    const pct = Math.max(0, Math.min(100, (d.energy / d.maxEnergy) * 100));
    energyBar.style.width = pct + '%';
    energyLabel.textContent = `${Math.floor(d.energy)} / ${d.maxEnergy}`;
    if (d.lowEnergy) {
      energyBar.style.boxShadow = '0 0 8px rgba(255, 0, 0, 0.8)';
    } else {
      energyBar.style.boxShadow = 'none';
    }
  });

  engine.on(GameEvents.TIMER_UPDATE, (data: unknown) => {
    const d = data as { remaining: number };
    timerEl.textContent = `${Math.ceil(d.remaining)}s`;
  });

  engine.on(GameEvents.GAME_OVER, (data: unknown) => {
    const d = data as { score: number; devoured: number; remainingEnergy: number };
    scoreValue.textContent = String(d.score);
    scoreDetail.innerHTML = `吞噬仆从: ${d.devoured} × 100<br>剩余能量: ${Math.floor(d.remainingEnergy)} × 2`;
    scorePanel.classList.add('show');
    renderer.triggerScoreExplosion();
  });

  restartBtn.addEventListener('click', () => {
    scorePanel.classList.remove('show');
    engine.reset();
    renderer.reset();
    input.reset();
  });

  engine.start();

  let lastTime = performance.now();
  function loop(now: number): void {
    const dt = Math.min(50, now - lastTime);
    lastTime = now;
    engine.update(dt);
    renderer.render(dt);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

window.addEventListener('DOMContentLoaded', main);
