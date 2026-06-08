import { Ship } from './ship';
import { AIStrategy } from './ai';
import { Renderer } from './renderer';

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
if (!canvas) {
  throw new Error('Canvas element not found');
}

const playerShip = new Ship('玩家战舰', { weapon: 50, shield: 50, engine: 50 }, true);
const aiShip = new Ship('敌方AI', { weapon: 45, shield: 60, engine: 45 }, false);
const aiStrategy = new AIStrategy();
const renderer = new Renderer(canvas, playerShip, aiShip, aiStrategy);

const resize = () => {
  renderer.resize();
};

resize();
window.addEventListener('resize', resize);

let lastTime = performance.now();

const gameLoop = (now: number) => {
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  playerShip.updateTween(now);

  const battleResult = aiStrategy.update(dt, playerShip, aiShip, now);
  if (battleResult) {
    if (battleResult.playerHit && battleResult.aiDamage > 0) {
      renderer.addDamageFloat('ai', battleResult.aiDamage, now);
    }
    if (battleResult.aiHit && battleResult.playerDamage > 0) {
      renderer.addDamageFloat('player', battleResult.playerDamage, now);
    }
  }

  playerShip.shieldFlashFrequency = Math.max(0, playerShip.shieldFlashFrequency - dt * 0.8);
  aiShip.shieldFlashFrequency = Math.max(0, aiShip.shieldFlashFrequency - dt * 0.8);

  renderer.render(now);

  requestAnimationFrame(gameLoop);
};

requestAnimationFrame(gameLoop);
