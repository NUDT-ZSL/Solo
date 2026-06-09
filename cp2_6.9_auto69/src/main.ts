import { FluidWaveRenderer, WaveParams } from './fluid';

const defaultParams: WaveParams = {
  amplitude: 60,
  frequency: 0.05,
  speed: 0.01,
  layers: 5,
  primaryColor: '#00c6ff',
  secondaryColor: '#0072ff'
};

function createRipple(e: MouseEvent, target: HTMLElement): void {
  const rect = target.getBoundingClientRect();
  const ripple = document.createElement('span');
  ripple.className = 'ripple';

  const size = 60;
  const x = e.clientX - rect.left - size / 2;
  const y = e.clientY - rect.top - size / 2;

  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;

  target.appendChild(ripple);

  setTimeout(() => {
    ripple.remove();
  }, 400);
}

function bindRipple(element: HTMLElement): void {
  element.addEventListener('click', (e) => {
    createRipple(e, element);
  });
}

function init(): void {
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const renderer = new FluidWaveRenderer(canvas, defaultParams);
  renderer.start();

  const amplitudeSlider = document.getElementById('amplitude') as HTMLInputElement;
  const frequencySlider = document.getElementById('frequency') as HTMLInputElement;
  const speedSlider = document.getElementById('speed') as HTMLInputElement;
  const layersSlider = document.getElementById('layers') as HTMLInputElement;
  const primaryColorPicker = document.getElementById('primaryColor') as HTMLInputElement;
  const secondaryColorPicker = document.getElementById('secondaryColor') as HTMLInputElement;
  const pauseBtn = document.getElementById('pauseBtn') as HTMLButtonElement;
  const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;

  amplitudeSlider?.addEventListener('input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    renderer.setParams({ amplitude: value });
  });

  frequencySlider?.addEventListener('input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    renderer.setParams({ frequency: value });
  });

  speedSlider?.addEventListener('input', (e) => {
    const value = parseFloat((e.target as HTMLInputElement).value);
    renderer.setParams({ speed: value });
  });

  layersSlider?.addEventListener('input', (e) => {
    const value = parseInt((e.target as HTMLInputElement).value, 10);
    renderer.setParams({ layers: value });
  });

  primaryColorPicker?.addEventListener('input', (e) => {
    const value = (e.target as HTMLInputElement).value;
    renderer.setParams({ primaryColor: value });
  });

  secondaryColorPicker?.addEventListener('input', (e) => {
    const value = (e.target as HTMLInputElement).value;
    renderer.setParams({ secondaryColor: value });
  });

  pauseBtn?.addEventListener('click', () => {
    const isPaused = renderer.togglePause();
    pauseBtn.textContent = isPaused ? '继续' : '暂停';
  });

  resetBtn?.addEventListener('click', () => {
    renderer.reset(defaultParams);

    amplitudeSlider.value = String(defaultParams.amplitude);
    frequencySlider.value = String(defaultParams.frequency);
    speedSlider.value = String(defaultParams.speed);
    layersSlider.value = String(defaultParams.layers);
    primaryColorPicker.value = defaultParams.primaryColor;
    secondaryColorPicker.value = defaultParams.secondaryColor;

    if (renderer.getPaused()) {
      renderer.resume();
      pauseBtn.textContent = '暂停';
    }
  });

  [pauseBtn, resetBtn].forEach((btn) => {
    if (btn) bindRipple(btn);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
