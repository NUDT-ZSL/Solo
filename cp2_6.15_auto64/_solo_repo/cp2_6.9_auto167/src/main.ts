import { ParticleSystem } from './particleSystem';
import { EmotionManager, EMOTIONS, type EmotionType } from './emotionManager';

function getDevicePixelRatio(): number {
  return window.devicePixelRatio || 1;
}

function setupCanvas(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): {
  width: number;
  height: number;
} {
  const dpr = getDevicePixelRatio();
  const cssWidth = window.innerWidth;
  const cssHeight = window.innerHeight;

  canvas.width = Math.floor(cssWidth * dpr);
  canvas.height = Math.floor(cssHeight * dpr);
  canvas.style.width = cssWidth + 'px';
  canvas.style.height = cssHeight + 'px';

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  return { width: cssWidth, height: cssHeight };
}

interface ThumbStyleMap {
  webkit: string;
  moz: string;
}

function getSliderThumbSelectors(): ThumbStyleMap {
  return {
    webkit: '.slider-group input[type="range"]::-webkit-slider-thumb',
    moz: '.slider-group input[type="range"]::-moz-range-thumb',
  };
}

function updateSliderThumbColor(color: string): void {
  const styleId = 'dynamic-slider-thumb';
  let styleEl = document.getElementById(styleId) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = styleId;
    document.head.appendChild(styleEl);
  }
  const selectors = getSliderThumbSelectors();
  styleEl.textContent = `
    ${selectors.webkit} { background: ${color} !important; }
    ${selectors.moz} { background: ${color} !important; }
  `;
}

function animateButton(btn: HTMLElement): void {
  btn.style.transform = 'scale(0.9)';
  setTimeout(() => {
    btn.style.transform = 'scale(1)';
  }, 100);
}

function init(): void {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const ctxMaybe = canvas.getContext('2d', { alpha: false });
  if (!ctxMaybe) {
    console.error('Could not get 2D context');
    return;
  }
  const ctx: CanvasRenderingContext2D = ctxMaybe;

  const { width, height } = setupCanvas(canvas, ctx);

  const particleSystem = new ParticleSystem();
  particleSystem.resize(width, height);
  particleSystem.setDensity(2000, '#888888');

  const emotionManager = new EmotionManager();

  const densitySlider = document.getElementById('density') as HTMLInputElement;
  const speedSlider = document.getElementById('speed') as HTMLInputElement;
  const densityVal = document.getElementById('density-val') as HTMLSpanElement;
  const speedVal = document.getElementById('speed-val') as HTMLSpanElement;

  densitySlider.addEventListener('input', () => {
    const count = parseInt(densitySlider.value, 10);
    densityVal.textContent = String(count);
    const config = emotionManager.getCurrentConfig();
    particleSystem.setDensity(count, config.colorStart);
  });

  speedSlider.addEventListener('input', () => {
    const speed = parseFloat(speedSlider.value);
    speedVal.textContent = speed.toFixed(1);
    particleSystem.setGlobalSpeed(speed);
  });

  const emotionButtons = document.querySelectorAll<HTMLButtonElement>(
    '.emotion-btn'
  );
  emotionButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const emotion = btn.dataset.emotion as EmotionType;
      if (emotion && emotion !== 'neutral') {
        animateButton(btn);
        emotionManager.setEmotion(emotion);
        particleSystem.startConverge(performance.now());
      }
    });
  });

  window.addEventListener('resize', () => {
    const { width: w, height: h } = setupCanvas(canvas, ctx);
    particleSystem.resize(w, h);
  });

  updateSliderThumbColor('#888888');

  let lastTime = performance.now();
  let frameCount = 0;
  let fpsUpdateTime = lastTime;

  function loop(now: number): void {
    const dt = Math.min(now - lastTime, 50);
    lastTime = now;

    frameCount++;
    if (now - fpsUpdateTime >= 1000) {
      fpsUpdateTime = now;
      frameCount = 0;
    }

    emotionManager.update(now);
    const config = emotionManager.getCurrentConfig();

    updateSliderThumbColor(config.primaryColor);

    particleSystem.update(now, dt, config);

    const w = window.innerWidth;
    const h = window.innerHeight;
    const grad = ctx.createLinearGradient(0, 0, w, h);
    grad.addColorStop(0, '#1a1a2e');
    grad.addColorStop(1, '#16213e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    particleSystem.render(ctx, config);

    requestAnimationFrame(loop);
  }

  requestAnimationFrame((t) => {
    lastTime = t;
    fpsUpdateTime = t;
    loop(t);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
