import {
  createConfig,
  createIntersections,
  spawnVehicle,
  updateVehicle,
  updateSignals,
  updateIntersectionHistory,
  calculateQueueLengths,
  COLORS,
  TrafficConfig,
  Intersection,
  Vehicle,
  Direction,
  TrafficSignal
} from './traffic';
import {
  ScheduleStrategy,
  createGetGreenDuration,
  applyStrategyToAll
} from './scheduler';
import { UIPanel, computeStats, HistoryPoint } from './panel';

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let config: TrafficConfig;
let intersections: Intersection[] = [];
let vehicles: Vehicle[] = [];
let strategy: ScheduleStrategy = 'fixed';
let totalPassed = 0;
let lastTime = 0;
let spawnAccumulator = 0;
let statsAccumulator = 0;
let historyAccumulator = 0;
let history: HistoryPoint[] = [];
let selectedIntersection: Intersection | null = null;
let roadCanvas: HTMLCanvasElement | null = null;
let roadCtx: CanvasRenderingContext2D | null = null;
let uiPanel: UIPanel;

function resizeCanvas() {
  const wrap = document.getElementById('canvas-wrap')!;
  const rect = wrap.getBoundingClientRect();
  const w = Math.floor(rect.width * 0.95);
  const h = Math.floor(rect.height * 0.95);
  const dpr = window.devicePixelRatio || 1;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  config = createConfig(w, h, 3);
  intersections = createIntersections(config);
  applyStrategyToAll(strategy, intersections, true);
  vehicles = [];
  totalPassed = 0;
  history = [];
  buildRoadCache();
}

function buildRoadCache() {
  roadCanvas = document.createElement('canvas');
  roadCanvas.width = canvas.width;
  roadCanvas.height = canvas.height;
  roadCtx = roadCanvas.getContext('2d');
  if (!roadCtx) return;
  const dpr = window.devicePixelRatio || 1;
  roadCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  drawRoads(roadCtx, config, intersections);
}

function drawRoads(c: CanvasRenderingContext2D, cfg: TrafficConfig, ints: Intersection[]) {
  const rw = cfg.roadWidth;

  c.fillStyle = COLORS.bg;
  c.fillRect(0, 0, cfg.canvasWidth, cfg.canvasHeight);

  const offsetX = (cfg.canvasWidth - (cfg.gridSize - 1) * cfg.cellSize) / 2;
  const offsetY = (cfg.canvasHeight - (cfg.gridSize - 1) * cfg.cellSize) / 2;

  c.fillStyle = COLORS.road;
  for (let gx = 0; gx < cfg.gridSize; gx++) {
    const cx = offsetX + gx * cfg.cellSize;
    const top = 0;
    const bottom = cfg.canvasHeight;
    c.fillRect(cx - rw, top, rw * 2, bottom - top);
  }
  for (let gy = 0; gy < cfg.gridSize; gy++) {
    const cy = offsetY + gy * cfg.cellSize;
    const left = 0;
    const right = cfg.canvasWidth;
    c.fillRect(left, cy - rw, right - left, rw * 2);
  }

  for (const it of ints) {
    c.fillStyle = COLORS.road;
    c.fillRect(it.centerX - rw, it.centerY - rw, rw * 2, rw * 2);
  }

  c.strokeStyle = 'rgba(255,255,255,0.35)';
  c.lineWidth = 1;
  c.setLineDash([6, 6]);

  const drawVertical = (cx: number) => {
    c.beginPath();
    c.moveTo(cx, 0);
    c.lineTo(cx, cfg.canvasHeight);
    c.stroke();
  };
  const drawHorizontal = (cy: number) => {
    c.beginPath();
    c.moveTo(0, cy);
    c.lineTo(cfg.canvasWidth, cy);
    c.stroke();
  };

  for (let gx = 0; gx < cfg.gridSize; gx++) {
    const cx = offsetX + gx * cfg.cellSize;
    drawVertical(cx - cfg.laneWidth * 0.5);
    drawVertical(cx + cfg.laneWidth * 0.5);
  }
  for (let gy = 0; gy < cfg.gridSize; gy++) {
    const cy = offsetY + gy * cfg.cellSize;
    drawHorizontal(cy - cfg.laneWidth * 0.5);
    drawHorizontal(cy + cfg.laneWidth * 0.5);
  }

  c.setLineDash([]);
  c.strokeStyle = 'rgba(255,255,255,0.7)';
  c.lineWidth = 1.2;
  for (let gx = 0; gx < cfg.gridSize; gx++) {
    const cx = offsetX + gx * cfg.cellSize;
    for (let gy = 0; gy < cfg.gridSize; gy++) {
      const cy = offsetY + gy * cfg.cellSize;
      c.beginPath();
      c.moveTo(cx - rw, cy - rw);
      c.lineTo(cx - rw, cy + rw);
      c.moveTo(cx + rw, cy - rw);
      c.lineTo(cx + rw, cy + rw);
      c.moveTo(cx - rw, cy - rw);
      c.lineTo(cx + rw, cy - rw);
      c.moveTo(cx - rw, cy + rw);
      c.lineTo(cx + rw, cy + rw);
      c.stroke();
    }
  }
}

function drawSignalLights(c: CanvasRenderingContext2D, it: Intersection) {
  const signal = it.signal;
  const cx = it.centerX;
  const cy = it.centerY - config.roadWidth - 18;

  const r1 = 10 / 2;
  const r2 = 6 / 2;
  const gap = 2;
  const totalW = r1 * 2 + r2 * 2 + r1 * 2 + gap * 2;
  let x = cx - totalW / 2 + r1;

  const drawLight = (color: string, radius: number, active: boolean) => {
    c.beginPath();
    c.arc(x, cy, radius, 0, Math.PI * 2);
    c.fillStyle = active ? color : 'rgba(255,255,255,0.12)';
    if (active) {
      c.shadowColor = color;
      c.shadowBlur = 8;
    } else {
      c.shadowBlur = 0;
    }
    c.fill();
    c.shadowBlur = 0;
    x += radius * 2 + gap;
  };

  drawLight(COLORS.red, r1, signal.currentLight === 'red');
  drawLight(COLORS.yellow, r2, signal.currentLight === 'yellow');
  drawLight(COLORS.green, r1, signal.currentLight === 'green');

  c.fillStyle = '#CCCCDD';
  c.font = '10px sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(Math.max(0, signal.remainingTime).toFixed(0), cx, cy + 14);
  c.textAlign = 'start';
  c.textBaseline = 'alphabetic';
}

function drawVehicle(c: CanvasRenderingContext2D, v: Vehicle) {
  c.save();
  c.translate(v.x, v.y);
  c.rotate(v.angle);

  const w = 6, h = 3;
  c.shadowColor = 'rgba(0,0,0,0.4)';
  c.shadowBlur = 2;
  c.shadowOffsetY = 1;

  c.fillStyle = v.color;
  const r = 1;
  c.beginPath();
  c.moveTo(-w / 2 + r, -h / 2);
  c.lineTo(w / 2 - r, -h / 2);
  c.quadraticCurveTo(w / 2, -h / 2, w / 2, -h / 2 + r);
  c.lineTo(w / 2, h / 2 - r);
  c.quadraticCurveTo(w / 2, h / 2, w / 2 - r, h / 2);
  c.lineTo(-w / 2 + r, h / 2);
  c.quadraticCurveTo(-w / 2, h / 2, -w / 2, h / 2 - r);
  c.lineTo(-w / 2, -h / 2 + r);
  c.quadraticCurveTo(-w / 2, -h / 2, -w / 2 + r, -h / 2);
  c.closePath();
  c.fill();

  c.shadowBlur = 0;
  c.restore();
}

function drawHighlight(c: CanvasRenderingContext2D, it: Intersection) {
  const r = 40;
  const grad = c.createRadialGradient(it.centerX, it.centerY, 0, it.centerX, it.centerY, r);
  grad.addColorStop(0, 'rgba(255,220,80,0.3)');
  grad.addColorStop(1, 'rgba(255,220,80,0)');
  c.fillStyle = grad;
  c.beginPath();
  c.arc(it.centerX, it.centerY, r, 0, Math.PI * 2);
  c.fill();
}

function render() {
  if (roadCanvas) {
    ctx.drawImage(roadCanvas, 0, 0, roadCanvas.width, roadCanvas.height, 0, 0, canvas.width, canvas.height);
  } else {
    drawRoads(ctx, config, intersections);
  }

  if (selectedIntersection) drawHighlight(ctx, selectedIntersection);

  for (const it of intersections) drawSignalLights(ctx, it);
  for (const v of vehicles) drawVehicle(ctx, v);
}

function getIntersectionAt(px: number, py: number): Intersection | null {
  for (const it of intersections) {
    const dx = px - it.centerX;
    const dy = py - it.centerY;
    if (Math.abs(dx) < config.roadWidth + 8 && Math.abs(dy) < config.roadWidth + 8) {
      return it;
    }
  }
  return null;
}

function handleClick(e: MouseEvent) {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const it = getIntersectionAt(x, y);
  if (it) {
    selectedIntersection = it;
    uiPanel.showModal(it);
  }
}

function loop(timestamp: number) {
  if (!lastTime) lastTime = timestamp;
  let dt = (timestamp - lastTime) / (1000 / 60);
  lastTime = timestamp;
  if (dt > 3) dt = 3;

  spawnAccumulator += dt;
  const spawnIntervalFrames = 60 / (2 + Math.random() * 3);
  while (spawnAccumulator >= spawnIntervalFrames) {
    spawnAccumulator -= spawnIntervalFrames;
    const v = spawnVehicle(config, intersections, vehicles);
    if (v) vehicles.push(v);
  }

  const getDur = createGetGreenDuration(strategy);
  updateSignals(intersections, getDur, dt);

  const remaining: Vehicle[] = [];
  for (const v of vehicles) {
    const res = updateVehicle(v, intersections, vehicles, config, dt);
    if (!res.removed) remaining.push(v);
    else totalPassed++;
  }
  vehicles = remaining;

  calculateQueueLengths(intersections, vehicles);

  statsAccumulator += dt;
  historyAccumulator += dt;

  if (statsAccumulator >= 60) {
    statsAccumulator = 0;
    updateIntersectionHistory(intersections);
  }

  if (historyAccumulator >= 60) {
    historyAccumulator = 0;
    const stats = computeStats(vehicles, intersections, totalPassed);
    uiPanel.updateStats(stats);
    history.push({
      vehicles: stats.totalVehicles,
      avgWait: stats.avgWaitTime,
      maxQueue: stats.maxQueue,
      passed: stats.totalPassed
    });
    if (history.length > 60) history.shift();
    uiPanel.drawChart(history);
  }

  render();
  requestAnimationFrame(loop);
}

function init() {
  canvas = document.getElementById('traffic-canvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;

  uiPanel = new UIPanel();
  uiPanel.setStrategy(strategy);
  uiPanel.onStrategyChange = (val) => {
    strategy = val as ScheduleStrategy;
    applyStrategyToAll(strategy, intersections, false);
  };
  uiPanel.onModalClose = () => {
    selectedIntersection = null;
  };

  canvas.addEventListener('click', handleClick);
  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();

  const initialStats = computeStats(vehicles, intersections, totalPassed);
  uiPanel.updateStats(initialStats);

  requestAnimationFrame(loop);
}

document.addEventListener('DOMContentLoaded', init);
