export type CurrentMode = 'north_pacific' | 'south_atlantic' | 'indian_monsoon';
export type Season = 0 | 1 | 2 | 3;

export interface FlowVector {
  vx: number;
  vy: number;
}

const SEA_WIDTH = 1200;
const SEA_HEIGHT = 800;

interface ModeConfig {
  centerX: number;
  centerY: number;
  radiusX: number;
  radiusY: number;
  direction: number;
  baseSpeed: number;
  perturbation: number;
  seasonalShift: number;
}

const MODE_CONFIGS: Record<CurrentMode, ModeConfig> = {
  north_pacific: {
    centerX: 600,
    centerY: 400,
    radiusX: 450,
    radiusY: 300,
    direction: 1,
    baseSpeed: 45,
    perturbation: 0.3,
    seasonalShift: 0.25,
  },
  south_atlantic: {
    centerX: 600,
    centerY: 400,
    radiusX: 420,
    radiusY: 280,
    direction: -1,
    baseSpeed: 38,
    perturbation: 0.25,
    seasonalShift: 0.2,
  },
  indian_monsoon: {
    centerX: 600,
    centerY: 400,
    radiusX: 400,
    radiusY: 320,
    direction: 1,
    baseSpeed: 50,
    perturbation: 0.45,
    seasonalShift: 0.4,
  },
};

function computeFlowAt(
  x: number,
  y: number,
  config: ModeConfig,
  season: Season
): FlowVector {
  const dx = x - config.centerX;
  const dy = y - config.centerY;
  const nx = dx / config.radiusX;
  const ny = dy / config.radiusY;
  const dist = Math.sqrt(nx * nx + ny * ny);

  if (dist > 1.4) {
    return { vx: 0, vy: 0 };
  }

  const seasonFactor = 1 + (season - 1.5) * config.seasonalShift;
  const angle = Math.atan2(dy, dx);
  const tangentAngle = angle + (Math.PI / 2) * config.direction;

  const radialDecay = dist < 1 ? 1 - (1 - dist) * (1 - dist) : Math.max(0, 1.4 - dist) / 0.4;

  let speed = config.baseSpeed * radialDecay * seasonFactor;

  const pertX = Math.sin(x * 0.008 + season * 0.5) * config.perturbation;
  const pertY = Math.cos(y * 0.006 + season * 0.7) * config.perturbation;

  const inwardFactor = dist > 0.8 ? (dist - 0.8) * 2 : 0;
  const inwardAngle = angle + Math.PI;

  const tangentSpeed = speed;
  const inwardSpeed = speed * inwardFactor * 0.3;

  const finalAngle =
    tangentAngle * (1 - inwardFactor * 0.3) + inwardAngle * inwardFactor * 0.3;

  let vx = Math.cos(finalAngle) * tangentSpeed + Math.cos(inwardAngle) * inwardSpeed;
  let vy = Math.sin(finalAngle) * tangentSpeed + Math.sin(inwardAngle) * inwardSpeed;

  vx += pertX * speed * 0.5;
  vy += pertY * speed * 0.5;

  if (season === 2 || season === 3) {
    const monsoonEffect = Math.sin(x * 0.005 + y * 0.003) * config.perturbation * speed * 0.3;
    vy += monsoonEffect * (config.direction > 0 ? 1 : -1);
  }

  return { vx, vy };
}

let currentMode: CurrentMode = 'north_pacific';
let currentSeason: Season = 0;

let transitionFrom: CurrentMode = 'north_pacific';
let transitionTo: CurrentMode = 'north_pacific';
let transitionProgress = 1;
let transitionStart = 0;
const TRANSITION_DURATION = 600;

export function setMode(mode: CurrentMode): void {
  if (mode === currentMode && transitionProgress >= 1) return;
  transitionFrom = currentMode;
  transitionTo = mode;
  transitionStart = performance.now();
  transitionProgress = 0;
  currentMode = mode;
}

export function setSeason(season: Season): void {
  currentSeason = season;
}

export function getCurrentMode(): CurrentMode {
  return currentMode;
}

export function getCurrentSeason(): Season {
  return currentSeason;
}

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export function getFlowAt(x: number, y: number): FlowVector {
  if (transitionProgress < 1) {
    const elapsed = performance.now() - transitionStart;
    transitionProgress = Math.min(1, elapsed / TRANSITION_DURATION);
    const t = easeInOut(transitionProgress);

    const fromFlow = computeFlowAt(x, y, MODE_CONFIGS[transitionFrom], currentSeason);
    const toFlow = computeFlowAt(x, y, MODE_CONFIGS[transitionTo], currentSeason);

    return {
      vx: fromFlow.vx * (1 - t) + toFlow.vx * t,
      vy: fromFlow.vy * (1 - t) + toFlow.vy * t,
    };
  }

  return computeFlowAt(x, y, MODE_CONFIGS[currentMode], currentSeason);
}

export function drawFlowField(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number
): void {
  const gridSize = 40;
  const maxArrowLen = 20;

  for (let gx = gridSize / 2; gx < width; gx += gridSize) {
    for (let gy = gridSize / 2; gy < height; gy += gridSize) {
      const flow = getFlowAt(gx, gy);
      const speed = Math.sqrt(flow.vx * flow.vx + flow.vy * flow.vy);
      const maxSpeed = 70;
      const normalizedSpeed = Math.min(speed / maxSpeed, 1);

      const r1 = 13;
      const g1 = 27;
      const b1 = 42;
      const r2 = 79;
      const g2 = 195;
      const b2 = 247;
      const r = Math.round(r1 + (r2 - r1) * normalizedSpeed);
      const g = Math.round(g1 + (g2 - g1) * normalizedSpeed);
      const b = Math.round(b1 + (b2 - b1) * normalizedSpeed);

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(gx - gridSize / 2, gy - gridSize / 2, gridSize, gridSize);

      if (speed > 1) {
        const arrowLen = Math.min((speed / maxSpeed) * maxArrowLen, maxArrowLen);
        const angle = Math.atan2(flow.vy, flow.vx);
        const endX = gx + Math.cos(angle) * arrowLen;
        const endY = gy + Math.sin(angle) * arrowLen;

        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(gx, gy);
        ctx.lineTo(endX, endY);
        ctx.stroke();

        const headLen = 4;
        const headAngle = Math.PI / 6;
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - Math.cos(angle - headAngle) * headLen,
          endY - Math.sin(angle - headAngle) * headLen
        );
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(endX, endY);
        ctx.lineTo(
          endX - Math.cos(angle + headAngle) * headLen,
          endY - Math.sin(angle + headAngle) * headLen
        );
        ctx.stroke();
      }
    }
  }
}
