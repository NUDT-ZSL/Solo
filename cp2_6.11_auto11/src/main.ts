import { RuneManager, SteleRect } from './runeManager';
import { EffectManager } from './effectManager';
import { Renderer, SteleConfig } from './renderer';
import { Rune } from './rune';

let canvas: HTMLCanvasElement;
let ctx: CanvasRenderingContext2D;
let renderer: Renderer;
let runeManager: RuneManager;
let effectManager: EffectManager;

let mouseX: number = -9999;
let mouseY: number = -9999;
let lastTime: number = 0;
let startTime: number = 0;

let steleConfig: SteleConfig = {
  x: 0,
  y: 0,
  w: 0,
  h: 0,
  rotation: -15,
};

let goldenTransition: number = 0;
let goldenTransitionTarget: number = 0;

function init(): void {
  canvas = document.getElementById('main-canvas') as HTMLCanvasElement;
  ctx = canvas.getContext('2d')!;

  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  renderer = new Renderer(ctx);
  renderer.resize(canvas.width, canvas.height);

  const steleRect = getSteleRect();
  runeManager = new RuneManager(steleRect);
  effectManager = new EffectManager();

  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchstart', handleTouchMove, { passive: false });

  canvas.addEventListener('click', () => {
    if (effectManager.audioContext?.state === 'suspended') {
      effectManager.audioContext.resume();
    }
  });

  startTime = performance.now();
  lastTime = startTime;
  requestAnimationFrame(gameLoop);
}

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  ctx.scale(dpr, dpr);

  if (renderer) {
    renderer.resize(rect.width, rect.height);
  }

  updateSteleConfig(rect.width, rect.height);

  if (runeManager) {
    runeManager.updateSteleRect(getSteleRect());
  }
}

function updateSteleConfig(viewportW: number, viewportH: number): void {
  const w = viewportW * 0.5;
  const h = viewportH * 0.7;
  const x = (viewportW - w) / 2;
  const y = (viewportH - h) / 2;

  steleConfig = {
    x,
    y,
    w,
    h,
    rotation: -15,
  };
}

function getSteleRect(): SteleRect {
  return {
    x: steleConfig.x,
    y: steleConfig.y,
    w: steleConfig.w,
    h: steleConfig.h,
  };
}

function handleMouseMove(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
}

function handleTouchMove(e: TouchEvent): void {
  e.preventDefault();
  const rect = canvas.getBoundingClientRect();
  const touch = e.touches[0];
  mouseX = touch.clientX - rect.left;
  mouseY = touch.clientY - rect.top;
}

function gameLoop(currentTime: number): void {
  const dt = Math.min(currentTime - lastTime, 50);
  lastTime = currentTime;

  update(dt, currentTime);
  render(currentTime - startTime);

  requestAnimationFrame(gameLoop);
}

function update(dt: number, currentTime: number): void {
  const activatedRunes = runeManager.update(dt, mouseX, mouseY);

  for (const rune of activatedRunes) {
    handleRuneActivated(rune, currentTime);
  }

  effectManager.update(dt, currentTime);

  if (effectManager.isGoldenPhase && goldenTransition < 1) {
    goldenTransition = Math.min(1, goldenTransition + dt / 2000);
    if (goldenTransition >= 0.5 && goldenTransitionTarget === 0) {
      goldenTransitionTarget = 1;
      runeManager.setSpeedMultiplier(2);
    }
  }
}

function handleRuneActivated(rune: Rune, currentTime: number): void {
  effectManager.addShockwave(rune.x, rune.y);
  effectManager.addTrailPoint(rune.x, rune.y, '#00FFC8');
  effectManager.playBuzzSound();

  const isComboComplete = effectManager.addComboRune(rune, currentTime);

  if (isComboComplete) {
    triggerComboEffect();
    effectManager.triggerSuccess(currentTime);
  }
}

function triggerComboEffect(): void {
  const steleTop = steleConfig.y;
  const steleCenterX = steleConfig.x + steleConfig.w / 2;

  effectManager.triggerLightBeam(steleCenterX, steleTop, steleConfig.w);
  effectManager.triggerShake();

  const comboRunes = effectManager.comboRunes;
  for (let i = 0; i < comboRunes.length - 1; i++) {
    const t = i / Math.max(1, comboRunes.length - 1);
    const color = lerpColor('#00FFC8', '#FF6B8A', t);
    effectManager.addTrailPoint(comboRunes[i].x, comboRunes[i].y, color);
  }
}

function render(elapsed: number): void {
  const viewportW = canvas.width / (window.devicePixelRatio || 1);
  const viewportH = canvas.height / (window.devicePixelRatio || 1);

  ctx.clearRect(0, 0, viewportW, viewportH);

  renderer.drawBackground(elapsed);

  const shakeOffset = effectManager.shake.offsetX;

  renderer.drawStele(
    steleConfig,
    shakeOffset,
    effectManager.cracks,
    effectManager.isGoldenPhase,
    goldenTransition
  );

  ctx.save();
  ctx.translate(shakeOffset, 0);
  renderer.drawRunes(runeManager.runes);
  renderer.drawEffects(effectManager);
  ctx.restore();
}

function lerpColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + (c2.r - c1.r) * t);
  const g = Math.round(c1.g + (c2.g - c1.g) * t);
  const b = Math.round(c1.b + (c2.b - c1.b) * t);
  return `rgb(${r}, ${g}, ${b})`;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) {
    return { r: 0, g: 0, b: 0 };
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
