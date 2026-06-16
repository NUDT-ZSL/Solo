import {
  updateSunLight,
  setPointLightPosition,
  setPointLightColor,
  setPointLightIntensity,
  getPointLightConfig,
  transitionToTime,
  getState,
} from './lightController';

let selectedLightIndex = 0;

export function initInteraction(): void {
  const timeSlider = document.getElementById('timeSlider') as HTMLInputElement;
  const timeValue = document.getElementById('timeValue') as HTMLSpanElement;
  const timeDisplay = document.getElementById('timeDisplay') as HTMLDivElement;
  const timeLabel = document.getElementById('timeLabel') as HTMLDivElement;

  const sunIntensitySlider = document.getElementById('sunIntensity') as HTMLInputElement;
  const sunIntValue = document.getElementById('sunIntValue') as HTMLSpanElement;
  const sunColorInput = document.getElementById('sunColor') as HTMLInputElement;

  const lightSelect = document.getElementById('lightSelect') as HTMLSelectElement;
  const pointIntensitySlider = document.getElementById('pointIntensity') as HTMLInputElement;
  const pointIntValue = document.getElementById('pointIntValue') as HTMLSpanElement;
  const pointColorInput = document.getElementById('pointColor') as HTMLInputElement;
  const pointXSlider = document.getElementById('pointX') as HTMLInputElement;
  const pointXValue = document.getElementById('pointXValue') as HTMLSpanElement;
  const pointYSlider = document.getElementById('pointY') as HTMLInputElement;
  const pointYValue = document.getElementById('pointYValue') as HTMLSpanElement;
  const pointZSlider = document.getElementById('pointZ') as HTMLInputElement;
  const pointZValue = document.getElementById('pointZValue') as HTMLSpanElement;

  const presetButtons = document.querySelectorAll('.preset-btn');

  function getTimePeriodName(t: number): string {
    if (t >= 5 && t < 8) return '清晨';
    if (t >= 8 && t < 11) return '上午';
    if (t >= 11 && t < 14) return '正午';
    if (t >= 14 && t < 17) return '下午';
    if (t >= 17 && t < 20) return '黄昏';
    return '夜晚';
  }

  function formatTime(t: number): string {
    const hours = Math.floor(t) % 24;
    const minutes = Math.floor((t % 1) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  }

  function syncPointLightUI(): void {
    const config = getPointLightConfig(selectedLightIndex);
    if (!config) return;

    pointIntensitySlider.value = config.intensity.toFixed(1);
    pointIntValue.textContent = config.intensity.toFixed(1);
    pointColorInput.value = config.color;
    pointXSlider.value = config.position.x.toFixed(2);
    pointXValue.textContent = config.position.x.toFixed(1);
    pointYSlider.value = config.position.y.toFixed(2);
    pointYValue.textContent = config.position.y.toFixed(1);
    pointZSlider.value = config.position.z.toFixed(2);
    pointZValue.textContent = config.position.z.toFixed(1);
  }

  timeSlider.addEventListener('input', () => {
    const t = parseFloat(timeSlider.value);
    timeValue.textContent = t.toFixed(1);
    timeDisplay.textContent = formatTime(t);
    timeLabel.textContent = getTimePeriodName(t);
    updateSunLight(t);

    presetButtons.forEach((btn) => {
      const btnTime = parseFloat((btn as HTMLElement).dataset.time || '0');
      btn.classList.toggle('active', Math.abs(btnTime - t) < 0.5);
    });
  });

  presetButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const targetTime = parseFloat((btn as HTMLElement).dataset.time || '0');

      presetButtons.forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');

      transitionToTime(targetTime);

      const animateSlider = () => {
        const currentState = parseFloat(timeSlider.value);
        const diff = targetTime - currentState;
        if (Math.abs(diff) < 0.05) {
          timeSlider.value = targetTime.toString();
          timeValue.textContent = targetTime.toFixed(1);
          timeDisplay.textContent = formatTime(targetTime);
          timeLabel.textContent = getTimePeriodName(targetTime);
          updateSunLight(targetTime);
          return;
        }
        const step = diff * 0.08;
        const newVal = currentState + step;
        timeSlider.value = newVal.toFixed(1);
        timeValue.textContent = newVal.toFixed(1);
        timeDisplay.textContent = formatTime(newVal);
        timeLabel.textContent = getTimePeriodName(newVal);
        requestAnimationFrame(animateSlider);
      };
      animateSlider();
    });
  });

  sunIntensitySlider.addEventListener('input', () => {
    const val = parseFloat(sunIntensitySlider.value);
    sunIntValue.textContent = val.toFixed(1);
  });

  sunColorInput.addEventListener('input', () => {
    const color = sunColorInput.value;
    const state = getState();
    if (state) {
      state.sunLight.color.set(color);
    }
  });

  lightSelect.addEventListener('change', () => {
    selectedLightIndex = parseInt(lightSelect.value);
    syncPointLightUI();
  });

  pointIntensitySlider.addEventListener('input', () => {
    const val = parseFloat(pointIntensitySlider.value);
    pointIntValue.textContent = val.toFixed(1);
    setPointLightIntensity(selectedLightIndex, val);
  });

  pointColorInput.addEventListener('input', () => {
    const color = pointColorInput.value;
    setPointLightColor(selectedLightIndex, color);
  });

  pointXSlider.addEventListener('input', () => {
    const val = parseFloat(pointXSlider.value);
    pointXValue.textContent = val.toFixed(1);
    const config = getPointLightConfig(selectedLightIndex);
    if (config) {
      setPointLightPosition(selectedLightIndex, val, config.position.y, config.position.z);
    }
  });

  pointYSlider.addEventListener('input', () => {
    const val = parseFloat(pointYSlider.value);
    pointYValue.textContent = val.toFixed(1);
    const config = getPointLightConfig(selectedLightIndex);
    if (config) {
      setPointLightPosition(selectedLightIndex, config.position.x, val, config.position.z);
    }
  });

  pointZSlider.addEventListener('input', () => {
    const val = parseFloat(pointZSlider.value);
    pointZValue.textContent = val.toFixed(1);
    const config = getPointLightConfig(selectedLightIndex);
    if (config) {
      setPointLightPosition(selectedLightIndex, config.position.x, config.position.y, val);
    }
  });

  syncPointLightUI();
}


export function getSelectedLightIndex(): number {
  return selectedLightIndex;
}
