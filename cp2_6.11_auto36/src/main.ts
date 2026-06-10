import { InkEngine, type WeatherType } from './ink-engine';
import { WeatherScene } from './weather-scene';

function initApp(): void {
  const inkCanvas = document.getElementById('inkCanvas') as HTMLCanvasElement | null;
  const sceneCanvas = document.getElementById('sceneCanvas') as HTMLCanvasElement | null;
  const sceneContainer = document.querySelector('.scene-wrapper') as HTMLElement | null;
  const clearBtn = document.getElementById('clearBtn') as HTMLButtonElement | null;
  const colorDots = document.querySelectorAll('.color-dot');

  if (!inkCanvas || !sceneCanvas || !sceneContainer) {
    console.error('Required elements not found');
    return;
  }

  const inkEngine = new InkEngine(inkCanvas);
  const weatherScene = new WeatherScene(sceneContainer, sceneCanvas);

  inkEngine.setOnAnalysisReady((analysis) => {
    weatherScene.updateWeather(analysis);
  });

  colorDots.forEach((dot) => {
    dot.addEventListener('click', () => {
      const color = dot.getAttribute('data-color') as WeatherType | null;
      if (!color) return;

      colorDots.forEach((d) => d.classList.remove('active'));
      dot.classList.add('active');
      inkEngine.setColor(color);
    });
  });

  if (clearBtn) {
    clearBtn.addEventListener('click', () => {
      inkEngine.clear();
    });
  }

  setTimeout(() => {
    window.dispatchEvent(new Event('resize'));
  }, 100);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
