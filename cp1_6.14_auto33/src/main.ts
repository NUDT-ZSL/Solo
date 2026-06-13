import {
  initScene,
  animate,
  setControlParams,
  resetScene,
  handlePointerDown,
  handlePointerMove,
  handlePointerUp
} from './module-render/renderEngine';

declare global {
  interface Window {
    __updateNeuronInfo: ((data: any) => void) | undefined;
  }
}

const triggerRange = document.getElementById('trigger-range') as HTMLInputElement;
const propDelay = document.getElementById('prop-delay') as HTMLInputElement;
const particleCount = document.getElementById('particle-count') as HTMLInputElement;
const triggerRangeVal = document.getElementById('trigger-range-value') as HTMLElement;
const propDelayVal = document.getElementById('prop-delay-value') as HTMLElement;
const particleCountVal = document.getElementById('particle-count-value') as HTMLElement;
const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
const container = document.getElementById('canvas-container') as HTMLElement;

function syncParams() {
  setControlParams({
    triggerRange: parseFloat(triggerRange.value),
    propagationDelay: parseFloat(propDelay.value),
    particleCount: parseInt(particleCount.value, 10)
  });
}

triggerRange.addEventListener('input', () => {
  triggerRangeVal.textContent = triggerRange.value;
  syncParams();
});
propDelay.addEventListener('input', () => {
  propDelayVal.textContent = propDelay.value;
  syncParams();
});
particleCount.addEventListener('input', () => {
  particleCountVal.textContent = particleCount.value;
  syncParams();
});
resetBtn.addEventListener('click', () => {
  resetScene();
});

container.addEventListener('pointerdown', (e) => handlePointerDown(e));
container.addEventListener('pointermove', (e) => handlePointerMove(e));
container.addEventListener('pointerup', (e) => handlePointerUp(e));
container.addEventListener('pointerleave', (e) => handlePointerUp(e));
container.addEventListener('contextmenu', (e) => e.preventDefault());

const neuronInfo = document.getElementById('neuron-info') as HTMLElement;
window.__updateNeuronInfo = (data: any) => {
  if (!data) {
    neuronInfo.classList.add('empty');
    neuronInfo.textContent = '悬停在神经元上查看信息';
  } else {
    neuronInfo.classList.remove('empty');
    neuronInfo.innerHTML =
      `<div><strong>编号：</strong>#${String(data.id).padStart(2, '0')}</div>` +
      `<div><strong>色调：</strong><span style="color:${data.color}">${data.colorName}</span></div>` +
      `<div><strong>坐标：</strong>(${data.x.toFixed(1)}, ${data.y.toFixed(1)}, ${data.z.toFixed(1)})</div>`;
  }
};

initScene(container);
syncParams();
animate();
