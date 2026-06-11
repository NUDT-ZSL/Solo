import { Orchestrator } from './orchestrator';

interface BackgroundStar {
  x: number;
  y: number;
  baseRadius: number;
  baseBrightness: number;
  phase: number;
  period: number;
}

const canvas = document.getElementById('starCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const hintOverlay = document.getElementById('hintOverlay')!;
const densitySlider = document.getElementById('densitySlider') as HTMLInputElement;
const densityValue = document.getElementById('densityValue')!;
const decaySlider = document.getElementById('decaySlider') as HTMLInputElement;
const decayValue = document.getElementById('decayValue')!;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;

let dpr = window.devicePixelRatio || 1;
let W = window.innerWidth;
let H = window.innerHeight;

canvas.width = W * dpr;
canvas.height = H * dpr;
ctx.scale(dpr, dpr);

const orchestrator = new Orchestrator(W, H);

const bgStars: BackgroundStar[] = [];
const starCount = 60 + Math.floor(Math.random() * 41);

for (let i = 0; i < starCount; i++) {
  bgStars.push({
    x: Math.random() * W,
    y: Math.random() * H,
    baseRadius: 0.5 + Math.random() * 1.5,
    baseBrightness: 0.3 + Math.random() * 0.7,
    phase: Math.random() * Math.PI * 2,
    period: 2 + Math.random() * 2,
  });
}

let lastTime = 0;
let mouseDownTime = 0;
let mouseDownPos = { x: 0, y: 0 };
let hintVisible = true;

function drawBackground(time: number): void {
  const gradient = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, Math.max(W, H) * 0.7);
  gradient.addColorStop(0, '#0A0E1A');
  gradient.addColorStop(1, '#0A1628');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);

  const t = time / 1000;
  for (const star of bgStars) {
    const brightness = star.baseBrightness + (1 - star.baseBrightness) * 0.5 * (1 + Math.sin(t * (Math.PI * 2 / star.period) + star.phase));
    const clamped = Math.max(0.3, Math.min(1, brightness));
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.baseRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(220,230,255,${clamped.toFixed(3)})`;
    ctx.fill();
  }
}

function gameLoop(timestamp: number): void {
  if (lastTime === 0) lastTime = timestamp;
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05);
  lastTime = timestamp;

  drawBackground(timestamp);

  orchestrator.update(dt);
  orchestrator.draw(ctx);

  requestAnimationFrame(gameLoop);
}

function handleNoteTrigger(velocity: number, x?: number, y?: number): void {
  if (hintVisible) {
    hintOverlay.classList.add('hidden');
    hintVisible = false;
  }
  orchestrator.spawnNote(0, velocity, x, y);
}

const noteMap: Record<string, number> = {
  '1': 0.0,
  '2': 0.17,
  '3': 0.33,
  '4': 0.5,
  '5': 0.6,
  '6': 0.77,
  '7': 1.0,
};

window.addEventListener('keydown', (e) => {
  if (noteMap[e.key] !== undefined) {
    handleNoteTrigger(noteMap[e.key]);
  }
});

canvas.addEventListener('mousedown', (e) => {
  mouseDownTime = performance.now();
  mouseDownPos = { x: e.clientX, y: e.clientY };
});

canvas.addEventListener('mouseup', (e) => {
  const duration = performance.now() - mouseDownTime;
  const velocity = Math.min(1, duration / 1000);
  handleNoteTrigger(velocity, e.clientX, e.clientY);
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const touch = e.touches[0];
  mouseDownTime = performance.now();
  mouseDownPos = { x: touch.clientX, y: touch.clientY };
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  const duration = performance.now() - mouseDownTime;
  const velocity = Math.min(1, duration / 1000);
  handleNoteTrigger(velocity, mouseDownPos.x, mouseDownPos.y);
}, { passive: false });

densitySlider.addEventListener('input', () => {
  const val = parseInt(densitySlider.value, 10);
  densityValue.textContent = String(val);
  orchestrator.setDensity(val);
});

decaySlider.addEventListener('input', () => {
  const val = parseInt(decaySlider.value, 10);
  decayValue.textContent = `${val}s`;
  orchestrator.setDecayTime(val);
});

resetBtn.addEventListener('click', () => {
  orchestrator.reset();
});

function handleResize(): void {
  dpr = window.devicePixelRatio || 1;
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  ctx.scale(dpr, dpr);
  orchestrator.resize(W, H);

  for (const star of bgStars) {
    star.x = Math.random() * W;
    star.y = Math.random() * H;
  }
}

window.addEventListener('resize', handleResize);

requestAnimationFrame(gameLoop);
