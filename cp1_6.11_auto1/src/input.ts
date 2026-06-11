import type { AimData, LaunchConfig, Vec2 } from './types';
import { LAUNCH_POS } from './types_internal';

export interface InputStateInternal {
  isDragging: boolean;
  dragStart: Vec2;
  dragCurrent: Vec2;
  angle: number;
  power: number;
  justReleased: boolean;
  aim: AimData;
  launchRequest: LaunchConfig | null;
}

export function createInputState(): InputStateInternal {
  return {
    isDragging: false,
    dragStart: { x: LAUNCH_POS.x, y: LAUNCH_POS.y },
    dragCurrent: { x: LAUNCH_POS.x, y: LAUNCH_POS.y },
    angle: 0,
    power: 1,
    justReleased: false,
    aim: {
      startPos: { x: LAUNCH_POS.x, y: LAUNCH_POS.y },
      endPos: { x: LAUNCH_POS.x, y: LAUNCH_POS.y },
      angleRad: 0,
      angleDeg: 0,
      power: 1,
      powerPercent: 0.1,
      isActive: false
    },
    launchRequest: null
  };
}

function toCanvasCoords(
  e: MouseEvent,
  canvas: HTMLCanvasElement
): Vec2 {
  const rect = canvas.getBoundingClientRect();
  const sx = canvas.width / rect.width;
  const sy = canvas.height / rect.height;
  return {
    x: (e.clientX - rect.left) * sx,
    y: (e.clientY - rect.top) * sy
  };
}

function calcAngle(from: Vec2, to: Vec2): number {
  return Math.atan2(to.y - from.y, to.x - from.x);
}

function calcPower(from: Vec2, to: Vec2): number {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const d = Math.sqrt(dx * dx + dy * dy);
  const ratio = Math.min(1, d / 160);
  return Math.round((1 + ratio * 9) * 10) / 10;
}

function computeAim(state: InputStateInternal): void {
  if (!state.isDragging) {
    state.aim = {
      ...state.aim,
      isActive: false
    };
    return;
  }
  const start: Vec2 = { x: LAUNCH_POS.x, y: LAUNCH_POS.y };
  const a = state.angle;
  const pw = state.power;
  const line = 35 + pw * 15;
  state.aim = {
    startPos: start,
    endPos: {
      x: start.x + Math.cos(a) * line,
      y: start.y + Math.sin(a) * line
    },
    angleRad: a,
    angleDeg: ((a * 180) / Math.PI + 360) % 360,
    power: pw,
    powerPercent: (pw - 1) / 9,
    isActive: true
  };
}

export function setupInputHandlers(
  canvas: HTMLCanvasElement,
  input: InputStateInternal,
  canLaunch: () => boolean
): () => void {
  const handleDown = (e: MouseEvent): void => {
    if (!canLaunch()) return;
    const pos = toCanvasCoords(e, canvas);
    input.isDragging = true;
    input.justReleased = false;
    input.launchRequest = null;
    input.dragStart = { x: LAUNCH_POS.x, y: LAUNCH_POS.y };
    input.dragCurrent = pos;
    input.angle = calcAngle(input.dragStart, pos);
    input.power = calcPower(input.dragStart, pos);
    computeAim(input);
  };

  const handleMove = (e: MouseEvent): void => {
    if (!input.isDragging) return;
    const pos = toCanvasCoords(e, canvas);
    input.dragCurrent = pos;
    input.angle = calcAngle(input.dragStart, pos);
    input.power = calcPower(input.dragStart, pos);
    computeAim(input);
  };

  const handleUp = (): void => {
    if (!input.isDragging) return;
    input.isDragging = false;
    input.justReleased = true;
    if (canLaunch()) {
      input.launchRequest = {
        angleRad: input.angle,
        power: input.power
      };
    }
    computeAim(input);
    setTimeout(() => {
      if (!input.isDragging) {
        input.aim = { ...input.aim, isActive: false };
      }
    }, 100);
  };

  canvas.addEventListener('mousedown', handleDown);
  window.addEventListener('mousemove', handleMove);
  window.addEventListener('mouseup', handleUp);

  return (): void => {
    canvas.removeEventListener('mousedown', handleDown);
    window.removeEventListener('mousemove', handleMove);
    window.removeEventListener('mouseup', handleUp);
  };
}

export function consumeLaunchRequest(
  input: InputStateInternal
): LaunchConfig | null {
  const r = input.launchRequest;
  input.launchRequest = null;
  input.justReleased = false;
  return r;
}

export function getAimSnapshot(input: InputStateInternal): AimData {
  return { ...input.aim };
}
