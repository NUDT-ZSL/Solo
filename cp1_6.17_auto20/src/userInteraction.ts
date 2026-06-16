import * as THREE from 'three';
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
let sunCanvas: HTMLCanvasElement | null = null;
let sunCtx: CanvasRenderingContext2D | null = null;
let sunColorValueEl: HTMLElement | null = null;
let sunColorBarEl: HTMLElement | null = null;
let sunIntDisplayEl: HTMLElement | null = null;
let sunIntBarEl: HTMLElement | null = null;

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

  sunCanvas = document.getElementById('sunSkyCanvas') as HTMLCanvasElement;
  sunCtx = sunCanvas?.getContext('2d') || null;
  sunColorValueEl = document.getElementById('sunColorValue');
  sunColorBarEl = document.getElementById('sunColorBar');
  sunIntDisplayEl = document.getElementById('sunIntDisplay');
  sunIntBarEl = document.getElementById('sunIntBar');

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

  function updateSunIndicator(t: number): void {
    if (!sunCtx || !sunCanvas) return;

    const w = sunCanvas.width;
    const h = sunCanvas.height;

    sunCtx.clearRect(0, 0, w, h);

    const skyGradient = sunCtx.createLinearGradient(0, 0, 0, h * 0.7);
    if (t >= 5 && t < 7) {
      const alpha = (t - 5) / 2;
      skyGradient.addColorStop(0, `rgba(20, 20, 60, ${1 - alpha * 0.7})`);
      skyGradient.addColorStop(1, `rgba(80, 40, 60, ${1 - alpha * 0.5})`);
    } else if (t >= 7 && t < 17) {
      skyGradient.addColorStop(0, '#5BA8D6');
      skyGradient.addColorStop(1, '#B8D4E8');
    } else if (t >= 17 && t < 20) {
      const alpha = (t - 17) / 3;
      skyGradient.addColorStop(0, `rgba(${91 - alpha * 70}, ${168 - alpha * 140}, ${214 - alpha * 180}, 1)`);
      skyGradient.addColorStop(1, `rgba(${255 - alpha * 200}, ${140 - alpha * 110}, ${80 - alpha * 60}, 1)`);
    } else {
      skyGradient.addColorStop(0, '#0A0A20');
      skyGradient.addColorStop(1, '#1A1A3A');
    }

    const arcCenterX = w / 2;
    const arcCenterY = h * 0.75;
    const arcRadius = w * 0.42;

    sunCtx.save();
    sunCtx.beginPath();
    sunCtx.rect(0, 0, w, h * 0.75);
    sunCtx.clip();
    sunCtx.fillStyle = skyGradient;
    sunCtx.fillRect(0, 0, w, h);
    sunCtx.restore();

    const groundGrad = sunCtx.createLinearGradient(0, h * 0.75, 0, h);
    groundGrad.addColorStop(0, '#2A2A3A');
    groundGrad.addColorStop(1, '#1A1A2A');
    sunCtx.fillStyle = groundGrad;
    sunCtx.fillRect(0, h * 0.75, w, h * 0.25);

    sunCtx.beginPath();
    sunCtx.arc(arcCenterX, arcCenterY, arcRadius, Math.PI, 0, false);
    sunCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    sunCtx.lineWidth = 1;
    sunCtx.setLineDash([3, 4]);
    sunCtx.stroke();
    sunCtx.setLineDash([]);

    const angle = Math.PI - ((t - 6) / 12) * Math.PI;
    const sunX = arcCenterX + Math.cos(angle) * arcRadius;
    const sunY = arcCenterY - Math.sin(angle) * arcRadius;

    const sunColor = getSunColorHex(t);
    const sunIntensity = getSunIntensityAt(t);
    const isVisible = t >= 5 && t <= 20;

    if (isVisible && sunIntensity > 0) {
      const glowRadius = 16 + sunIntensity * 6;
      const glow = sunCtx.createRadialGradient(sunX, sunY, 2, sunX, sunY, glowRadius);
      glow.addColorStop(0, `${sunColor}80`);
      glow.addColorStop(0.4, `${sunColor}30`);
      glow.addColorStop(1, `${sunColor}00`);
      sunCtx.fillStyle = glow;
      sunCtx.beginPath();
      sunCtx.arc(sunX, sunY, glowRadius, 0, Math.PI * 2);
      sunCtx.fill();

      sunCtx.fillStyle = sunColor;
      sunCtx.beginPath();
      sunCtx.arc(sunX, sunY, 6 + sunIntensity * 2, 0, Math.PI * 2);
      sunCtx.fill();

      sunCtx.fillStyle = '#FFFFFF';
      sunCtx.beginPath();
      sunCtx.arc(sunX - 1.5, sunY - 1.5, 2.5, 0, Math.PI * 2);
      sunCtx.fill();
    } else {
      const moonX = arcCenterX - arcRadius * 0.8;
      const moonY = h * 0.2;
      sunCtx.fillStyle = '#E8E8F0';
      sunCtx.beginPath();
      sunCtx.arc(moonX, moonY, 5, 0, Math.PI * 2);
      sunCtx.fill();
      sunCtx.fillStyle = '#0A0A20';
      sunCtx.beginPath();
      sunCtx.arc(moonX + 1.5, moonY - 1, 4, 0, Math.PI * 2);
      sunCtx.fill();

      if (t < 5 || t > 20) {
        for (let i = 0; i < 8; i++) {
          const sx = (i * 17 + 5) % w;
          const sy = (i * 11 + 3) % (h * 0.5);
          const size = (i % 3) * 0.5 + 0.5;
          sunCtx.fillStyle = `rgba(255, 255, 255, ${0.3 + (i % 3) * 0.2})`;
          sunCtx.beginPath();
          sunCtx.arc(sx, sy, size, 0, Math.PI * 2);
          sunCtx.fill();
        }
      }
    }

    const arrowAngle = angle + Math.PI / 2;
    const arrowLen = 14;
    const arrowStartX = sunX + Math.cos(arrowAngle) * 4;
    const arrowStartY = sunY + Math.sin(arrowAngle) * 4;
    const arrowEndX = sunX + Math.cos(arrowAngle) * arrowLen;
    const arrowEndY = sunY + Math.sin(arrowAngle) * arrowLen;

    if (isVisible && sunIntensity > 0) {
      sunCtx.strokeStyle = `${sunColor}CC`;
      sunCtx.lineWidth = 2;
      sunCtx.beginPath();
      sunCtx.moveTo(arrowStartX, arrowStartY);
      sunCtx.lineTo(arrowEndX, arrowEndY);
      sunCtx.stroke();

      const headLen = 4;
      const headAngle1 = arrowAngle + Math.PI * 0.75;
      const headAngle2 = arrowAngle - Math.PI * 0.75;
      sunCtx.beginPath();
      sunCtx.moveTo(arrowEndX, arrowEndY);
      sunCtx.lineTo(
        arrowEndX + Math.cos(headAngle1) * headLen,
        arrowEndY + Math.sin(headAngle1) * headLen
      );
      sunCtx.moveTo(arrowEndX, arrowEndY);
      sunCtx.lineTo(
        arrowEndX + Math.cos(headAngle2) * headLen,
        arrowEndY + Math.sin(headAngle2) * headLen
      );
      sunCtx.stroke();
    }

    const tickTimes = [6, 12, 18];
    const tickLabels = ['6时', '12时', '18时'];
    sunCtx.fillStyle = 'rgba(255, 255, 255, 0.35)';
    sunCtx.font = '9px system-ui, sans-serif';
    sunCtx.textAlign = 'center';
    for (let i = 0; i < tickTimes.length; i++) {
      const tt = tickTimes[i];
      const ta = Math.PI - ((tt - 6) / 12) * Math.PI;
      const tx = arcCenterX + Math.cos(ta) * (arcRadius + 6);
      const ty = arcCenterY - Math.sin(ta) * (arcRadius + 6);
      if (ty < h * 0.72) {
        sunCtx.fillText(tickLabels[i], tx, ty);
      }
    }

    if (sunColorValueEl) {
      sunColorValueEl.textContent = sunColor.toUpperCase();
    }
    if (sunColorBarEl) {
      sunColorBarEl.style.backgroundColor = sunColor;
      sunColorBarEl.style.color = sunColor;
    }
    if (sunIntDisplayEl) {
      sunIntDisplayEl.textContent = sunIntensity.toFixed(2);
    }
    if (sunIntBarEl) {
      const pct = Math.min(100, (sunIntensity / 2) * 100);
      sunIntBarEl.style.width = `${pct}%`;
    }
  }

  function getSunColorHex(time: number): string {
    const col = new THREE.Color();
    if (time >= 0 && time < 5) {
      col.setHex(0x111122);
    } else if (time >= 5 && time < 7) {
      const t = (time - 5) / 2;
      const ca = new THREE.Color(0x111122);
      const cb = new THREE.Color(0xFFD700);
      ca.lerp(cb, t);
      col.copy(ca);
    } else if (time >= 7 && time < 9) {
      const t = (time - 7) / 2;
      const ca = new THREE.Color(0xFFD700);
      const cb = new THREE.Color(0xFFFFFF);
      ca.lerp(cb, t);
      col.copy(ca);
    } else if (time >= 9 && time < 16) {
      col.setHex(0xFFFFFF);
    } else if (time >= 16 && time < 18) {
      const t = (time - 16) / 2;
      const ca = new THREE.Color(0xFFFFFF);
      const cb = new THREE.Color(0xFF8C00);
      ca.lerp(cb, t);
      col.copy(ca);
    } else if (time >= 18 && time < 20) {
      const t = (time - 18) / 2;
      const ca = new THREE.Color(0xFF8C00);
      const cb = new THREE.Color(0x111122);
      ca.lerp(cb, t);
      col.copy(ca);
    } else {
      col.setHex(0x111122);
    }
    return '#' + col.getHexString();
  }

  function getSunIntensityAt(time: number): number {
    if (time >= 0 && time < 5) return 0;
    if (time >= 5 && time < 7) {
      const t = (time - 5) / 2;
      return 0.5 + t * 1.0;
    }
    if (time >= 7 && time < 17) return 1.5;
    if (time >= 17 && time < 20) {
      const t = (time - 17) / 3;
      return 1.5 * (1 - t);
    }
    return 0;
  }

  timeSlider.addEventListener('input', () => {
    const t = parseFloat(timeSlider.value);
    timeValue.textContent = t.toFixed(1);
    timeDisplay.textContent = formatTime(t);
    timeLabel.textContent = getTimePeriodName(t);
    updateSunLight(t);
    updateSunIndicator(t);

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

      const startVal = parseFloat(timeSlider.value);
      const startTime = performance.now();
      const duration = 500;

      const animateSlider = () => {
        const elapsed = performance.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = progress < 0.5
          ? 2 * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 2) / 2;
        const newVal = startVal + (targetTime - startVal) * eased;

        timeSlider.value = newVal.toFixed(1);
        timeValue.textContent = newVal.toFixed(1);
        timeDisplay.textContent = formatTime(newVal);
        timeLabel.textContent = getTimePeriodName(newVal);
        updateSunIndicator(newVal);

        if (progress < 1) {
          requestAnimationFrame(animateSlider);
        } else {
          updateSunIndicator(targetTime);
        }
      };
      animateSlider();
    });
  });

  sunIntensitySlider.addEventListener('input', () => {
    const val = parseFloat(sunIntensitySlider.value);
    sunIntValue.textContent = val.toFixed(1);
    const s = getState();
    if (s) {
      s.sunLight.intensity = val;
    }
  });

  sunColorInput.addEventListener('input', () => {
    const color = sunColorInput.value;
    const s = getState();
    if (s) {
      s.sunLight.color.set(color);
      if (sunColorValueEl) sunColorValueEl.textContent = color.toUpperCase();
      if (sunColorBarEl) {
        sunColorBarEl.style.backgroundColor = color;
        sunColorBarEl.style.color = color;
      }
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
  updateSunIndicator(12);
}

export function updateSunIndicatorFromState(time: number): void {
  if (!sunCtx) return;
}

export function getSelectedLightIndex(): number {
  return selectedLightIndex;
}
