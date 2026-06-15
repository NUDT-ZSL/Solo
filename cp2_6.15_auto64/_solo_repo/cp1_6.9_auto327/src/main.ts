import type { StainedGlass, Fragment } from './types';
import {
  createGlassLayout,
  updateStainedGlass,
  renderStainedGlass,
  findHoveredFragment,
  clearHoverStates,
  setHovered,
  LightPulseSystem,
} from './stainedGlass';
import { ParticleSystem } from './particles';
import { createStars, updateStars, renderStars, regenerateStars } from './stars';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let viewportWidth = window.innerWidth;
let viewportHeight = window.innerHeight;
let dpr = Math.min(window.devicePixelRatio || 1, 2);

let isMobile = window.innerWidth < 768;
let glasses: StainedGlass[] = [];
let stars = createStars(viewportWidth, viewportHeight);
const particleSystem = new ParticleSystem();
const lightPulseSystem = new LightPulseSystem();

let mouseX = -1000;
let mouseY = -1000;
let currentHovered: { glass: StainedGlass; fragment: Fragment } | null = null;
let lastParticleEmit = 0;

function resizeCanvas(): void {
  viewportWidth = window.innerWidth;
  viewportHeight = window.innerHeight;
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  canvas.width = Math.floor(viewportWidth * dpr);
  canvas.height = Math.floor(viewportHeight * dpr);
  canvas.style.width = viewportWidth + 'px';
  canvas.style.height = viewportHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const newIsMobile = viewportWidth < 768;
  if (newIsMobile !== isMobile || glasses.length === 0) {
    isMobile = newIsMobile;
    particleSystem.setMobile(isMobile);
    glasses = createGlassLayout(viewportWidth, viewportHeight, isMobile);
    lightPulseSystem.clear();
    particleSystem.clear();
  }
  stars = regenerateStars(stars, viewportWidth, viewportHeight);
}

function drawBackgroundGradient(): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, viewportHeight);
  gradient.addColorStop(0, '#1E1B4B');
  gradient.addColorStop(1, '#312E81');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, viewportWidth, viewportHeight);
}

function handleMouseMove(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
}

function handleMouseLeave(): void {
  mouseX = -1000;
  mouseY = -1000;
  if (currentHovered) {
    setHovered(currentHovered.glass, currentHovered.fragment, false);
    currentHovered = null;
  }
}

function handleClick(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  const cx = e.clientX - rect.left;
  const cy = e.clientY - rect.top;
  const hit = findHoveredFragment(glasses, cx, cy);
  if (hit) {
    lightPulseSystem.trigger(hit.glass, hit.fragment);
  }
}

let lastTime = performance.now();
let frameCount = 0;
let fpsTime = 0;
let fps = 60;

function animate(now: number): void {
  const deltaTime = Math.min(now - lastTime, 50);
  lastTime = now;

  frameCount++;
  fpsTime += deltaTime;
  if (fpsTime >= 1000) {
    fps = Math.round((frameCount * 1000) / fpsTime);
    frameCount = 0;
    fpsTime = 0;
  }

  updateStars(stars, deltaTime);
  for (const g of glasses) updateStainedGlass(g, deltaTime);
  particleSystem.update(deltaTime);
  lightPulseSystem.update(glasses, deltaTime);

  const hit = findHoveredFragment(glasses, mouseX, mouseY);
  if (hit) {
    if (!currentHovered || currentHovered.fragment.id !== hit.fragment.id || currentHovered.glass.id !== hit.glass.id) {
      if (currentHovered) {
        setHovered(currentHovered.glass, currentHovered.fragment, false);
      }
      setHovered(hit.glass, hit.fragment, true);
      currentHovered = hit;
    }
    if (now - lastParticleEmit > 80) {
      particleSystem.emit(
        hit.fragment.centroid.x + (Math.random() - 0.5) * 20,
        hit.fragment.centroid.y + (Math.random() - 0.5) * 20,
        hit.fragment.baseColor
      );
      lastParticleEmit = now;
    }
  } else if (currentHovered) {
    setHovered(currentHovered.glass, currentHovered.fragment, false);
    currentHovered = null;
  }

  drawBackgroundGradient();
  renderStars(ctx, stars);
  for (const g of glasses) renderStainedGlass(ctx, g, now / 1000);
  lightPulseSystem.render(ctx, glasses);
  particleSystem.render(ctx);

  if (fps < 55) {
    // could trigger adaptive quality here
  }

  requestAnimationFrame(animate);
}

function init(): void {
  resizeCanvas();
  window.addEventListener('resize', () => {
    clearHoverStates(glasses);
    resizeCanvas();
  });
  canvas.addEventListener('mousemove', handleMouseMove);
  canvas.addEventListener('mouseleave', handleMouseLeave);
  canvas.addEventListener('click', handleClick);
  canvas.addEventListener('touchstart', (e) => {
    if (e.touches.length > 0) {
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      mouseX = t.clientX - rect.left;
      mouseY = t.clientY - rect.top;
      handleClick({ clientX: t.clientX, clientY: t.clientY } as MouseEvent);
    }
  }, { passive: true });
  canvas.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      const t = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      mouseX = t.clientX - rect.left;
      mouseY = t.clientY - rect.top;
    }
  }, { passive: true });
  canvas.addEventListener('touchend', () => {
    mouseX = -1000;
    mouseY = -1000;
    if (currentHovered) {
      setHovered(currentHovered.glass, currentHovered.fragment, false);
      currentHovered = null;
    }
  });

  requestAnimationFrame((t) => {
    lastTime = t;
    animate(t);
  });
}

init();
