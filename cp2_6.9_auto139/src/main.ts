import { SpiralManager } from './spiral';
import { ColorTheme, THEME_RANGES } from './particle';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const themeLabel = document.getElementById('theme-label') as HTMLElement;
const fpsDisplay = document.getElementById('fps') as HTMLElement;
const particleCountDisplay = document.getElementById('particle-count') as HTMLElement;
const clearBtn = document.getElementById('clear-btn') as HTMLElement;
const colorTransition = document.getElementById('color-transition') as HTMLElement;

let spiralManager: SpiralManager;

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  if (spiralManager) {
    spiralManager.setCanvasSize(rect.width, rect.height);
  }
}

function init(): void {
  resizeCanvas();
  spiralManager = new SpiralManager(canvas.clientWidth, canvas.clientHeight);
  spiralManager.setTransitionOverlay(colorTransition);
  updateThemeLabel();

  let lastTime = performance.now();
  let frameCount = 0;
  let fpsUpdateTime = 0;
  let currentFps = 60;

  function animate(now: number): void {
    const deltaTime = now - lastTime;
    lastTime = now;

    frameCount++;
    fpsUpdateTime += deltaTime;
    if (fpsUpdateTime >= 1000) {
      currentFps = Math.round((frameCount * 1000) / fpsUpdateTime);
      fpsDisplay.textContent = currentFps.toString();
      frameCount = 0;
      fpsUpdateTime = 0;
    }

    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    ctx.fillStyle = 'rgba(15, 15, 35, 0.25)';
    ctx.fillRect(0, 0, width, height);

    spiralManager.update(deltaTime);
    spiralManager.draw(ctx);

    particleCountDisplay.textContent = spiralManager.getParticleCount().toString();

    if (spiralManager.isPerformanceMode()) {
      particleCountDisplay.style.color = '#ffaa00';
      particleCountDisplay.style.textShadow = '0 0 8px #ffaa00';
    } else {
      particleCountDisplay.style.color = '#00e5ff';
      particleCountDisplay.style.textShadow = '0 0 8px #00e5ff';
    }

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

function updateThemeLabel(): void {
  const theme = spiralManager.getTheme();
  const info = THEME_RANGES[theme];
  themeLabel.textContent = info.name;

  const glowColors: Record<ColorTheme, string> = {
    rainbow: '0 0 15px rgba(255, 200, 100, 0.4), inset 0 0 10px rgba(255, 200, 100, 0.1)',
    red:     '0 0 15px rgba(255, 60, 60, 0.4), inset 0 0 10px rgba(255, 60, 60, 0.1)',
    green:   '0 0 15px rgba(60, 255, 120, 0.4), inset 0 0 10px rgba(60, 255, 120, 0.1)',
    blue:    '0 0 15px rgba(60, 180, 255, 0.4), inset 0 0 10px rgba(60, 180, 255, 0.1)'
  };
  themeLabel.style.boxShadow = glowColors[theme];
}

function handleMouse(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  spiralManager.spawnParticles(x, y);
}

let isMouseDown = false;

canvas.addEventListener('mousedown', (e) => {
  isMouseDown = true;
  handleMouse(e);
});

canvas.addEventListener('mousemove', (e) => {
  if (isMouseDown) {
    handleMouse(e);
  }
});

canvas.addEventListener('mouseup', () => {
  isMouseDown = false;
});

canvas.addEventListener('mouseleave', () => {
  isMouseDown = false;
});

canvas.addEventListener('click', handleMouse);

document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase();
  if (key === 'r') {
    spiralManager.setTheme('red');
    updateThemeLabel();
  } else if (key === 'g') {
    spiralManager.setTheme('green');
    updateThemeLabel();
  } else if (key === 'b') {
    spiralManager.setTheme('blue');
    updateThemeLabel();
  } else if (key === 'escape') {
    spiralManager.setTheme('rainbow');
    updateThemeLabel();
  }
});

clearBtn.addEventListener('click', () => {
  spiralManager.clearAll();
});

window.addEventListener('resize', resizeCanvas);

init();
