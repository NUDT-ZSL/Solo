import type { MeteorConfig } from './particleSystem';

export interface AppController {
  updateConfig(config: Partial<MeteorConfig>): void;
  triggerBurst(): void;
}

export function initControls(app: AppController): void {
  const densitySlider = document.getElementById('slider-density') as HTMLInputElement | null;
  const directionSlider = document.getElementById('slider-direction') as HTMLInputElement | null;
  const speedSlider = document.getElementById('slider-speed') as HTMLInputElement | null;

  const densityValue = document.getElementById('value-density') as HTMLSpanElement | null;
  const directionValue = document.getElementById('value-direction') as HTMLSpanElement | null;
  const speedValue = document.getElementById('value-speed') as HTMLSpanElement | null;

  densitySlider?.addEventListener('input', () => {
    const val = parseInt(densitySlider.value, 10);
    if (densityValue) densityValue.textContent = String(val);
    app.updateConfig({ density: val });
  });

  directionSlider?.addEventListener('input', () => {
    const val = parseInt(directionSlider.value, 10);
    if (directionValue) directionValue.textContent = `${val}°`;
    app.updateConfig({ direction: val });
  });

  speedSlider?.addEventListener('input', () => {
    const val = parseFloat(speedSlider.value);
    if (speedValue) speedValue.textContent = String(Math.round(val));
    app.updateConfig({ speed: val });
  });

  const handleClick = (e: MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest('#control-panel')) return;
    if (target.closest('#loading-screen')) return;
    app.triggerBurst();
  };

  document.body.addEventListener('click', handleClick);
}
