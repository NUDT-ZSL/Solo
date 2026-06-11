import { LetterEngine } from './letterEngine';
import { Controls } from './controls';

function hideLoading(): void {
  const loading = document.getElementById('loading');
  if (loading) {
    loading.classList.add('hidden');
    setTimeout(() => {
      loading.remove();
    }, 600);
  }
}

function preloadFonts(): Promise<void> {
  return new Promise((resolve) => {
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => resolve());
      setTimeout(() => resolve(), 1500);
    } else {
      setTimeout(() => resolve(), 500);
    }
  });
}

function init(): void {
  const particleCanvas = document.getElementById('particleCanvas') as HTMLCanvasElement;
  const textCanvas = document.getElementById('textCanvas') as HTMLCanvasElement;
  const letterCard = document.getElementById('letterCard') as HTMLElement;
  const letterEdge = document.getElementById('letterEdge') as HTMLElement;
  const backIcon = document.getElementById('backIcon') as HTMLElement;
  const backProverb = document.getElementById('backProverb') as HTMLElement;

  if (!particleCanvas || !textCanvas || !letterCard || !letterEdge || !backIcon || !backProverb) {
    console.error('必要的DOM元素未找到');
    hideLoading();
    return;
  }

  const engine = new LetterEngine(
    particleCanvas,
    textCanvas,
    letterCard,
    letterEdge,
    backIcon,
    backProverb
  );

  let resizeTimer: number | null = null;
  window.addEventListener('resize', () => {
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      engine.resize();
    }, 150);
  });

  new Controls(engine);
  engine.start();
  hideLoading();
}

window.addEventListener('DOMContentLoaded', async () => {
  await preloadFonts();
  init();
});
