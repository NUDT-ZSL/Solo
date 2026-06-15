import { Garden } from './garden';
import { EmotionType } from './flower';

function init(): void {
  const canvas = document.getElementById('garden-canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const garden = new Garden(canvas);
  garden.start();

  const emotionButtons = document.querySelectorAll<HTMLButtonElement>('.emotion-btn');
  let activeButton: HTMLButtonElement | null = null;

  emotionButtons.forEach(button => {
    button.addEventListener('click', () => {
      const emotion = button.dataset.emotion as EmotionType;
      if (!emotion) return;

      emotionButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      activeButton = button;

      garden.setEmotion(emotion);
    });
  });

  const defaultButton = document.querySelector('.emotion-btn.calm') as HTMLButtonElement;
  if (defaultButton) {
    defaultButton.classList.add('active');
    activeButton = defaultButton;
  }

  let lastFpsTime = performance.now();
  let frameCount = 0;
  function monitorFps() {
    frameCount++;
    const now = performance.now();
    if (now - lastFpsTime >= 1000) {
      const fps = frameCount * 1000 / (now - lastFpsTime);
      if (fps < 55) {
        console.warn(`FPS dropped below 55: ${fps.toFixed(1)}`);
      }
      frameCount = 0;
      lastFpsTime = now;
    }
    requestAnimationFrame(monitorFps);
  }
  requestAnimationFrame(monitorFps);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
