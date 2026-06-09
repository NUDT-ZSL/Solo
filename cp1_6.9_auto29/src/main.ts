import {
  createGrowthState,
  updateGrowth,
  getBranchesForRendering,
  getProgress,
  GrowthState
} from './crystalGrowth';

import {
  createScene,
  updateCrystalBranches,
  removeBranchMeshes,
  updateCameraSmooth,
  updateSceneAnimation,
  render,
  disposeScene,
  SceneContext
} from './sceneSetup';

import {
  createInteractionState,
  setupInteractionHandlers,
  updateParticles,
  getActiveParticleCount,
  disposeInteraction,
  InteractionState
} from './interaction';

interface AppState {
  sceneCtx: SceneContext;
  growthState: GrowthState;
  interaction: InteractionState;
  clock: { start: number; last: number; elapsed: number };
  running: boolean;
  animationFrameId: number | null;
  ui: {
    branchCount: HTMLElement;
    growthProgress: HTMLElement;
    particleCount: HTMLElement;
    progressFill: HTMLElement;
  };
}

let app: AppState | null = null;

function getUIElements() {
  const branchCount = document.getElementById('branch-count');
  const growthProgress = document.getElementById('growth-progress');
  const particleCount = document.getElementById('particle-count');
  const progressFill = document.getElementById('progress-fill');

  if (!branchCount || !growthProgress || !particleCount || !progressFill) {
    throw new Error('UI elements not found');
  }

  return { branchCount, growthProgress, particleCount, progressFill };
}

function init(): AppState {
  const sceneCtx = createScene('scene-container');
  const growthState = createGrowthState();
  const interaction = createInteractionState(sceneCtx.scene);
  const ui = getUIElements();

  setupInteractionHandlers(sceneCtx, interaction, growthState, (explodedIds) => {
    removeBranchMeshes(sceneCtx, explodedIds);
  });

  const appState: AppState = {
    sceneCtx,
    growthState,
    interaction,
    clock: {
      start: performance.now(),
      last: performance.now(),
      elapsed: 0
    },
    running: true,
    animationFrameId: null,
    ui
  };

  app = appState;
  return appState;
}

function animate(appState: AppState): void {
  if (!appState.running) return;

  const now = performance.now();
  const deltaTime = Math.min((now - appState.clock.last) / 1000, 0.1);
  appState.clock.last = now;
  appState.clock.elapsed = (now - appState.clock.start) / 1000;

  updateGrowth(appState.growthState, deltaTime);

  const branches = getBranchesForRendering(appState.growthState);
  updateCrystalBranches(appState.sceneCtx, branches);

  updateCameraSmooth(appState.sceneCtx, deltaTime);

  updateSceneAnimation(appState.sceneCtx, deltaTime);

  updateParticles(appState.interaction, deltaTime);

  updateUI(appState);

  render(appState.sceneCtx);

  appState.animationFrameId = requestAnimationFrame(() => animate(appState));
}

function updateUI(appState: AppState): void {
  const branchCount = appState.growthState.totalBranches;
  const progress = getProgress(appState.growthState);
  const progressPct = Math.round(progress * 100);
  const particleCount = getActiveParticleCount(appState.interaction);

  appState.ui.branchCount.textContent = branchCount.toString();
  appState.ui.growthProgress.textContent = `${progressPct}%`;
  appState.ui.particleCount.textContent = particleCount.toString();
  appState.ui.progressFill.style.width = `${progressPct}%`;
}

function dispose(): void {
  if (!app) return;

  app.running = false;
  if (app.animationFrameId !== null) {
    cancelAnimationFrame(app.animationFrameId);
  }

  disposeInteraction(app.interaction);
  disposeScene(app.sceneCtx);

  app = null;
}

window.addEventListener('DOMContentLoaded', () => {
  try {
    const appState = init();
    animate(appState);
  } catch (error) {
    console.error('Failed to initialize application:', error);
  }
});

window.addEventListener('beforeunload', () => {
  dispose();
});
