import { CanvasManager } from './CanvasManager';

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16)
  };
}

document.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
  const startBtn = document.getElementById('startBtn') as HTMLButtonElement;
  const regenerateBtn = document.getElementById('regenerateBtn') as HTMLButtonElement;
  const collectedCountEl = document.getElementById('collectedCount') as HTMLElement;
  const totalCountEl = document.getElementById('totalCount') as HTMLElement;
  const progressFill = document.getElementById('progressFill') as HTMLElement;

  const manager = new CanvasManager(canvas);

  manager.setOnStateChange((collected: number, total: number) => {
    collectedCountEl.textContent = String(collected);
    totalCountEl.textContent = String(total);
    const progress = total > 0 ? collected / total : 0;
    progressFill.style.width = (progress * 100) + '%';
    progressFill.style.backgroundColor = lerpColor('#FF6B6B', '#4ECDC4', progress);
  });

  manager.setOnReassembled(() => {
    startBtn.style.display = 'none';
  });

  startBtn.addEventListener('click', () => {
    if (manager.getState() === 'idle') {
      manager.startScattering();
      startBtn.style.display = 'none';
    }
  });

  regenerateBtn.addEventListener('click', () => {
    manager.regenerate();
    startBtn.style.display = 'none';
  });

  (window as unknown as { __debugManager?: CanvasManager }).__debugManager = manager;

  manager.generateNewArt();
});
