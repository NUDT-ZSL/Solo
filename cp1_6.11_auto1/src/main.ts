/// <reference types="vite/client" />

import type {
  PhysicsOutput,
  RenderInput,
  AimData,
  LaunchConfig,
  CollisionEvent
} from './types';
import {
  createPhysicsState,
  updatePhysicsState,
  launchPhysicsBall,
  resetPhysicsBall,
  drainPhysicsEvents,
  getPhysicsOutput,
  PhysicsInternalState
} from './physics';
import {
  createInputState,
  setupInputHandlers,
  consumeLaunchRequest,
  getAimSnapshot,
  InputStateInternal
} from './input';
import {
  renderScene,
  setupGameOverClick,
  invalidateBackgroundCache
} from './renderer';

import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT
} from './types_internal';

const INITIAL_LAUNCHES = 3;
const FIXED_DT = 1 / 60;
const MAX_SUB_STEPS = 4;

interface GameRuntime {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  internalState: PhysicsInternalState;
  input: InputStateInternal;
  launches: number;
  gameOver: boolean;
  planetRanges: number[];
  lastTime: number;
  accumulator: number;
  animationId: number;
  rafRunning: boolean;
  cleanupInput: (() => void) | null;
  cleanupGameOver: (() => void) | null;
}

const rt: GameRuntime = {
  canvas: null as unknown as HTMLCanvasElement,
  ctx: null as unknown as CanvasRenderingContext2D,
  internalState: null as unknown as PhysicsInternalState,
  input: null as unknown as InputStateInternal,
  launches: INITIAL_LAUNCHES,
  gameOver: false,
  planetRanges: [],
  lastTime: 0,
  accumulator: 0,
  animationId: 0,
  rafRunning: false,
  cleanupInput: null,
  cleanupGameOver: null
};

function canLaunch(): boolean {
  return (
    !rt.internalState.ball.launched &&
    !rt.internalState.ball.absorbing &&
    !rt.gameOver &&
    rt.launches > 0
  );
}

function processEvents(events: CollisionEvent[]): void {
  for (const _ev of events) {
    void _ev;
  }
}

function buildRenderInput(
  physics: PhysicsOutput,
  aim: AimData
): RenderInput {
  return {
    physics,
    aim,
    launchesRemaining: rt.launches,
    gameOver: rt.gameOver,
    dt: FIXED_DT
  };
}

function fixedStep(): void {
  let steps = 0;
  while (rt.accumulator >= FIXED_DT && steps < MAX_SUB_STEPS) {
    const req = consumeLaunchRequest(rt.input);
    if (req && canLaunch()) {
      const cfg: LaunchConfig = req;
      rt.launches--;
      launchPhysicsBall(rt.internalState, cfg);
    }
    updatePhysicsState(rt.internalState, FIXED_DT);
    const evs = drainPhysicsEvents(rt.internalState);
    if (evs.length > 0) processEvents(evs);
    rt.accumulator -= FIXED_DT;
    steps++;
  }
  if (steps >= MAX_SUB_STEPS) rt.accumulator = 0;
}

function detectGameOver(): void {
  if (rt.gameOver) return;
  if (
    rt.launches <= 0 &&
    !rt.internalState.ball.launched &&
    !rt.internalState.ball.absorbing
  ) {
    const sp2 =
      rt.internalState.ball.vel.x ** 2 + rt.internalState.ball.vel.y ** 2;
    if (sp2 < 0.0025) {
      rt.gameOver = true;
    }
  }
}

function loop(time: number): void {
  if (!rt.rafRunning) return;
  let frameDt = (time - rt.lastTime) / 1000;
  if (frameDt > 0.1) frameDt = 0.1;
  rt.lastTime = time;
  rt.accumulator += frameDt;

  fixedStep();
  detectGameOver();

  const physics = getPhysicsOutput(rt.internalState);
  const aim = getAimSnapshot(rt.input);
  const ri = buildRenderInput(physics, aim);

  renderScene(rt.ctx, ri, rt.planetRanges, restartGame);

  rt.animationId = requestAnimationFrame(loop);
}

function restartGame(): void {
  rt.internalState = createPhysicsState();
  rt.input = createInputState();
  rt.launches = INITIAL_LAUNCHES;
  rt.gameOver = false;
  rt.accumulator = 0;
  rt.lastTime = performance.now();
  rt.planetRanges = rt.internalState.planets.map(p => p.gravityRange);
  invalidateBackgroundCache();
}

function initGame(): void {
  const el = document.getElementById('game-canvas') as HTMLCanvasElement | null;
  if (!el) {
    console.error('[StarOrbit] canvas#game-canvas not found');
    return;
  }
  rt.canvas = el;
  rt.canvas.width = CANVAS_WIDTH;
  rt.canvas.height = CANVAS_HEIGHT;

  const c = rt.canvas.getContext('2d', { alpha: false });
  if (!c) {
    console.error('[StarOrbit] failed to get 2D context');
    return;
  }
  rt.ctx = c;

  rt.internalState = createPhysicsState();
  rt.input = createInputState();
  rt.launches = INITIAL_LAUNCHES;
  rt.gameOver = false;
  rt.accumulator = 0;
  rt.lastTime = performance.now();
  rt.planetRanges = rt.internalState.planets.map(p => p.gravityRange);

  if (rt.cleanupInput) rt.cleanupInput();
  if (rt.cleanupGameOver) rt.cleanupGameOver();

  rt.cleanupInput = setupInputHandlers(
    rt.canvas,
    rt.input,
    canLaunch
  );
  rt.cleanupGameOver = setupGameOverClick(rt.canvas);

  if (rt.rafRunning && rt.animationId) {
    cancelAnimationFrame(rt.animationId);
  }
  rt.rafRunning = true;
  rt.animationId = requestAnimationFrame(loop);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initGame);
} else {
  initGame();
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    rt.rafRunning = false;
    if (rt.animationId) cancelAnimationFrame(rt.animationId);
    if (rt.cleanupInput) rt.cleanupInput();
    if (rt.cleanupGameOver) rt.cleanupGameOver();
  });
}

export type { AimData };
void resetPhysicsBall;
