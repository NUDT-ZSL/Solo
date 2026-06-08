import { SceneManager } from './SceneManager';
import { ThemeName } from './config';

const sceneManager = new SceneManager();
sceneManager.start();

const speedSlider = document.getElementById('speed-slider') as HTMLInputElement;
const speedVal = document.getElementById('speed-val') as HTMLSpanElement;
const densitySlider = document.getElementById('density-slider') as HTMLInputElement;
const densityVal = document.getElementById('density-val') as HTMLSpanElement;
const themeSelect = document.getElementById('theme-select') as HTMLSelectElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const hint = document.getElementById('hint') as HTMLDivElement;

speedSlider.addEventListener('input', () => {
  const v = parseFloat(speedSlider.value);
  sceneManager.setSpeed(v);
  speedVal.textContent = v.toFixed(1) + 'x';
});

densitySlider.addEventListener('input', () => {
  const v = parseFloat(densitySlider.value);
  sceneManager.setDensity(v);
  if (v < 0.33) densityVal.textContent = '稀疏';
  else if (v < 0.66) densityVal.textContent = '中等';
  else densityVal.textContent = '密集';
});

themeSelect.addEventListener('change', () => {
  sceneManager.setTheme(themeSelect.value as ThemeName);
});

resetBtn.addEventListener('click', () => {
  sceneManager.resetView();
});

setTimeout(() => {
  if (hint) hint.style.opacity = '0';
}, 5000);
