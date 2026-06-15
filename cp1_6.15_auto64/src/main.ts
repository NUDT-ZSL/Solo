import { GridManager } from './GridManager';
import { TurbineManager } from './TurbineManager';
import { WindSimulation } from './WindSimulation';

const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const configPanel = document.getElementById('config-panel') as HTMLDivElement;
const panelTitle = document.getElementById('panel-title') as HTMLHeadingElement;
const cfgRpm = document.getElementById('cfg-rpm') as HTMLInputElement;
const cfgWind = document.getElementById('cfg-wind') as HTMLInputElement;
const cfgRpmVal = document.getElementById('cfg-rpm-val') as HTMLDivElement;
const cfgWindVal = document.getElementById('cfg-wind-val') as HTMLDivElement;
const btnReset = document.getElementById('btn-reset') as HTMLButtonElement;
const btnExport = document.getElementById('btn-export') as HTMLButtonElement;
const tooltip = document.getElementById('tooltip') as HTMLDivElement;
const controlBar = document.getElementById('control-bar') as HTMLDivElement;

const windSim = new WindSimulation();
const gridManager = new GridManager(canvas);
const turbineManager = new TurbineManager(windSim);

let lastTime = performance.now();
let tooltipTimer: ReturnType<typeof setTimeout> | null = null;

cfgRpm.addEventListener('input', () => {
  const selId = turbineManager.getSelectedId();
  if (selId !== null) {
    const rpm = parseInt(cfgRpm.value, 10);
    const wind = parseInt(cfgWind.value, 10);
    turbineManager.updateConfig(selId, rpm, wind);
    cfgRpmVal.textContent = `${rpm} RPM`;
  }
});

cfgWind.addEventListener('input', () => {
  const selId = turbineManager.getSelectedId();
  if (selId !== null) {
    const rpm = parseInt(cfgRpm.value, 10);
    const wind = parseInt(cfgWind.value, 10);
    turbineManager.updateConfig(selId, rpm, wind);
    cfgWindVal.textContent = `${wind}°`;
  }
});

btnReset.addEventListener('click', () => {
  turbineManager.clearAll();
  gridManager.triggerFadeIn();
  closePanel();
});

btnExport.addEventListener('click', () => {
  const data = turbineManager.exportData();
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  a.download = `windfarm-${ts}.json`;
  a.click();
  URL.revokeObjectURL(url);
});

canvas.addEventListener('click', (e: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const logical = gridManager.toLogicalCoord(cx, cy);

  const hit = turbineManager.getTurbineAt(logical.x, logical.y);
  if (hit) {
    turbineManager.selectTurbine(hit.id);
    openPanel(hit.id, hit.rpm, hit.windAngle);
  } else {
    if (logical.x >= 0 && logical.x <= 600 && logical.y >= 0 && logical.y <= 400) {
      turbineManager.addTurbine(logical.x, logical.y);
    }
    closePanel();
    turbineManager.selectTurbine(null);
  }
});

canvas.addEventListener('mousemove', (e: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const logical = gridManager.toLogicalCoord(cx, cy);

  const hit = turbineManager.getTurbineAt(logical.x, logical.y);
  turbineManager.setHovered(hit ? hit.id : null);

  if (tooltipTimer) {
    clearTimeout(tooltipTimer);
    tooltipTimer = null;
  }

  if (hit) {
    tooltipTimer = setTimeout(() => {
      showTooltip(e.clientX, e.clientY, `涡轮机 #${hit.id}\n转速: ${hit.rpm} RPM\n风向: ${hit.windAngle}°\n效率: ${hit.efficiency}%`);
    }, 100);
  } else {
    const wakeInfo = windSim.getWakeInfoAtPoint(logical.x, logical.y);
    if (wakeInfo.affectedCount > 0) {
      tooltipTimer = setTimeout(() => {
        showTooltip(e.clientX, e.clientY, `影响涡轮机: ${wakeInfo.affectedCount} 台\n平均降效: ${wakeInfo.avgPenalty}%`);
      }, 100);
    } else {
      hideTooltip();
    }
  }

  canvas.style.cursor = hit ? 'pointer' : 'crosshair';
});

canvas.addEventListener('mouseleave', () => {
  turbineManager.setHovered(null);
  hideTooltip();
});

function openPanel(id: number, rpm: number, windAngle: number): void {
  panelTitle.textContent = `涡轮机 #${id}`;
  cfgRpm.value = String(rpm);
  cfgWind.value = String(windAngle);
  cfgRpmVal.textContent = `${rpm} RPM`;
  cfgWindVal.textContent = `${windAngle}°`;
  configPanel.classList.add('open');
}

function closePanel(): void {
  configPanel.classList.remove('open');
}

function showTooltip(clientX: number, clientY: number, text: string): void {
  const wrapperRect = canvas.parentElement!.getBoundingClientRect();
  tooltip.style.display = 'block';
  tooltip.innerHTML = text.replace(/\n/g, '<br/>');
  tooltip.style.left = `${clientX - wrapperRect.left + 12}px`;
  tooltip.style.top = `${clientY - wrapperRect.top - 10}px`;
}

function hideTooltip(): void {
  tooltip.style.display = 'none';
}

function adjustControlBarWidth(): void {
  const cw = canvas.width;
  controlBar.style.width = `${cw}px`;
}

function gameLoop(now: number): void {
  const dt = Math.min((now - lastTime) / 1000, 0.1);
  lastTime = now;

  adjustControlBarWidth();

  gridManager.drawBackground(dt);

  const scale = gridManager.getScale();
  ctx.save();
  ctx.scale(scale.x, scale.y);
  windSim.drawWakes(ctx, turbineManager.getTurbines().map((t) => ({ id: t.id, x: t.x, y: t.y })));
  ctx.restore();

  turbineManager.update(dt);
  turbineManager.draw(ctx, scale);

  requestAnimationFrame(gameLoop);
}

adjustControlBarWidth();
requestAnimationFrame(gameLoop);
