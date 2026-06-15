import { WaveRenderer, THEMES } from './wave';
import { ParticleSystem } from './particles';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const themeToggle = document.getElementById('theme-toggle') as HTMLButtonElement;
const hint = document.getElementById('hint') as HTMLDivElement;

if (!canvas || !themeToggle) {
  throw new Error('无法找到必要的DOM元素');
}

const wave = new WaveRenderer(canvas);
const particles = new ParticleSystem(canvas, wave);

let currentThemeIndex = 0;
let lastTime = performance.now();
let hintFadeTimer: number | null = null;

const keys: { [key: string]: boolean } = {
  ArrowUp: false,
  ArrowLeft: false,
  ArrowRight: false,
  w: false,
  a: false,
  d: false,
  W: false,
  A: false,
  D: false,
};

let isDragging = false;
let dragStartY = 0;
let dragLastX = 0;
let dragLastY = 0;
let dragViewAngle = 0;

const DEFAULT_FLOW = 0.5;
const BOOSTED_FLOW = 1.5;
const MAX_ANGLE = 30;

function showHintOnce(): void {
  if (hintFadeTimer) return;
  hint.style.opacity = '1';
  hintFadeTimer = window.setTimeout(() => {
    hint.style.opacity = '0';
    hintFadeTimer = null;
  }, 6000);
}

function updateThemeButton(): void {
  const [r, g, b] = wave.getThemeButtonColor();
  themeToggle.style.borderColor = `rgba(${r}, ${g}, ${b}, 0.6)`;
  themeToggle.style.background = `rgba(${r}, ${g}, ${b}, 0.15)`;
  themeToggle.style.boxShadow = `0 0 20px rgba(${r}, ${g}, ${b}, 0.5)`;
}

function handleResize(): void {
  wave.resize();
  particles.resize();
}

function handleKeyDown(e: KeyboardEvent): void {
  if (e.key in keys) {
    keys[e.key] = true;
    e.preventDefault();
  }
}

function handleKeyUp(e: KeyboardEvent): void {
  if (e.key in keys) {
    keys[e.key] = false;
    e.preventDefault();
  }
}

function handleMouseDown(e: MouseEvent): void {
  if (e.target === themeToggle) return;
  if (e.button !== 0) return;

  isDragging = true;
  dragStartY = e.clientY;
  dragLastX = e.clientX;
  dragLastY = e.clientY;
  dragViewAngle = 0;

  wave.triggerPulse(e.clientX, e.clientY);
}

function handleMouseMove(e: MouseEvent): void {
  if (!isDragging) return;

  const dx = e.clientX - dragLastX;
  const dy = e.clientY - dragStartY;
  dragLastX = e.clientX;

  dragViewAngle += dx * 0.15;
  dragViewAngle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, dragViewAngle));
  wave.setViewAngle(dragViewAngle);

  if (dy < -20) {
    wave.setFlowSpeed(BOOSTED_FLOW);
  }
}

function handleMouseUp(): void {
  if (!isDragging) return;
  isDragging = false;

  const targetAngle = 0;
  wave.setViewAngle(targetAngle);
  dragViewAngle = 0;

  if (!keys.ArrowUp && !keys.w && !keys.W) {
    wave.setFlowSpeed(DEFAULT_FLOW);
  }
}

function handleTouchStart(e: TouchEvent): void {
  if (e.target === themeToggle) return;
  if (e.touches.length === 0) return;

  const touch = e.touches[0];
  isDragging = true;
  dragStartY = touch.clientY;
  dragLastX = touch.clientX;
  dragLastY = touch.clientY;
  dragViewAngle = 0;

  wave.triggerPulse(touch.clientX, touch.clientY);
}

function handleTouchMove(e: TouchEvent): void {
  if (!isDragging || e.touches.length === 0) return;

  const touch = e.touches[0];
  const dx = touch.clientX - dragLastX;
  const dy = touch.clientY - dragStartY;
  dragLastX = touch.clientX;

  dragViewAngle += dx * 0.15;
  dragViewAngle = Math.max(-MAX_ANGLE, Math.min(MAX_ANGLE, dragViewAngle));
  wave.setViewAngle(dragViewAngle);

  if (dy < -30) {
    wave.setFlowSpeed(BOOSTED_FLOW);
  }
  e.preventDefault();
}

function handleTouchEnd(): void {
  handleMouseUp();
}

function handleThemeToggle(): void {
  currentThemeIndex = (currentThemeIndex + 1) % THEMES.length;
  wave.setTheme(currentThemeIndex, themeToggle);
}

function loop(now: number): void {
  const dt = Math.min(now - lastTime, 50);
  lastTime = now;

  const movingForward = keys.ArrowUp || keys.w || keys.W || (isDragging && dragStartY - dragLastY > 20);
  wave.setFlowSpeed(movingForward ? BOOSTED_FLOW : DEFAULT_FLOW);

  if (!isDragging) {
    let targetAngle = 0;
    if (keys.ArrowLeft || keys.a || keys.A) targetAngle = -MAX_ANGLE;
    if (keys.ArrowRight || keys.d || keys.D) targetAngle = MAX_ANGLE;
    wave.setViewAngle(targetAngle);
  }

  wave.update(dt);
  particles.update(dt);

  wave.render();
  particles.render();

  updateThemeButton();

  requestAnimationFrame(loop);
}

window.addEventListener('resize', handleResize);
window.addEventListener('keydown', handleKeyDown);
window.addEventListener('keyup', handleKeyUp);

canvas.addEventListener('mousedown', handleMouseDown);
window.addEventListener('mousemove', handleMouseMove);
window.addEventListener('mouseup', handleMouseUp);

canvas.addEventListener('touchstart', handleTouchStart, { passive: true });
canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
canvas.addEventListener('touchend', handleTouchEnd, { passive: true });

themeToggle.addEventListener('click', handleThemeToggle);

showHintOnce();
updateThemeButton();

requestAnimationFrame(loop);
