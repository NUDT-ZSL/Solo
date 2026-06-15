import { BadgeEngine, StyleType } from './badgeEngine';

const textInput = document.getElementById('textInput') as HTMLInputElement;
const canvas = document.getElementById('badgeCanvas') as HTMLCanvasElement;
const exportBtn = document.getElementById('exportBtn') as HTMLButtonElement;
const styleButtons = document.querySelectorAll('.style-btn');
const loadingEl = document.getElementById('loading');

let badgeEngine: BadgeEngine;
let currentStyle: StyleType = 'minimal';
let lastFrameTime = 0;
let animationId: number;

function init(): void {
  badgeEngine = new BadgeEngine(canvas);
  badgeEngine.generateBadge('HELLO', currentStyle);

  textInput.addEventListener('input', handleInput);
  textInput.addEventListener('keydown', handleKeydown);

  styleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const style = (btn as HTMLElement).dataset.style as StyleType;
      if (style && style !== currentStyle) {
        setActiveStyle(style);
        regenerateBadge();
      }
    });
  });

  exportBtn.addEventListener('click', handleExport);

  window.addEventListener('resize', handleResize);

  if (loadingEl) {
    loadingEl.classList.add('hidden');
  }

  startAnimationLoop();
}

function handleInput(): void {
  clearTimeout((handleInput as any)._timeout);
  (handleInput as any)._timeout = setTimeout(() => {
    regenerateBadge();
  }, 300);
}

function handleKeydown(e: KeyboardEvent): void {
  if (e.key === 'Enter') {
    regenerateBadge();
  }
}

function setActiveStyle(style: StyleType): void {
  currentStyle = style;
  styleButtons.forEach(btn => {
    const btnStyle = (btn as HTMLElement).dataset.style;
    if (btnStyle === style) {
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });
}

function regenerateBadge(): void {
  const text = textInput.value.trim();
  badgeEngine.generateBadge(text || 'BADGE', currentStyle);
}

function handleExport(): void {
  const dataUrl = badgeEngine.exportPNG();

  const timestamp = Date.now();
  const filename = `badge_${timestamp}.png`;

  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function handleResize(): void {
  const container = canvas.parentElement;
  if (!container) return;

  const rect = container.getBoundingClientRect();
  const size = Math.min(rect.width, rect.height);

  if (size > 0) {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.scale(dpr, dpr);
    }

    badgeEngine.resize(size, size);
    regenerateBadge();
  }
}

function startAnimationLoop(): void {
  function animate(currentTime: number): void {
    const deltaTime = lastFrameTime ? currentTime - lastFrameTime : 16.67;
    lastFrameTime = currentTime;

    const clampedDelta = Math.min(deltaTime, 50);

    badgeEngine.update(clampedDelta, currentTime);
    badgeEngine.render();

    animationId = requestAnimationFrame(animate);
  }

  animationId = requestAnimationFrame(animate);
}

document.addEventListener('DOMContentLoaded', init);

if (document.readyState !== 'loading') {
  init();
}
