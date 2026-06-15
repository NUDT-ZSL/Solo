import { AnimationLoop } from './animation';
import { Plant } from './plant';
import { ParticleSystem } from './particle';
import { AudioManager } from './audio';

interface FloatingLight {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  alpha: number;
  phase: number;
  speed: number;
  amplitude: number;
}

const canvasEl = document.getElementById('main-canvas') as HTMLCanvasElement | null;
const progressBarEl = document.getElementById('progress-bar') as HTMLDivElement | null;

if (!canvasEl || !progressBarEl) {
  throw new Error('Required DOM elements not found');
}

const canvas: HTMLCanvasElement = canvasEl;
const progressBar: HTMLDivElement = progressBarEl;

const ctxNullable = canvas.getContext('2d');
if (!ctxNullable) {
  throw new Error('Could not get 2D rendering context');
}

const ctx: CanvasRenderingContext2D = ctxNullable;

function resizeCanvas(): void {
  const rect = canvas.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

const audio = AudioManager.getInstance();
audio.init();

function getCenter(): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return { x: rect.width / 2, y: rect.height / 2 };
}

const center = getCenter();
const plant = new Plant(center.x, center.y);
const particles = new ParticleSystem();
const animLoop = new AnimationLoop();

const floatingLights: FloatingLight[] = [];
function initFloatingLights(): void {
  floatingLights.length = 0;
  const rect = canvas.getBoundingClientRect();
  for (let i = 0; i < 20; i++) {
    floatingLights.push({
      x: Math.random() * rect.width,
      y: Math.random() * rect.height,
      baseX: Math.random() * rect.width,
      baseY: Math.random() * rect.height,
      size: Math.random() * 2 + 2,
      alpha: Math.random() * 0.3 + 0.3,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 0.001 + 0.0005,
      amplitude: 5
    });
  }
}
initFloatingLights();

let progress: number = 0;
let lastProgressUpdate: number = 0;
let cycleComplete: boolean = false;
let cycleCompleteTime: number = 0;

function updateProgressBar(): void {
  progressBar.style.width = `${progress}%`;
}

canvas.addEventListener('click', (e: MouseEvent) => {
  audio.ensureStarted();
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const node = plant.hitTest(x, y);
  if (node) {
    plant.onClickNode(node, performance.now());
    particles.emit(node.x, node.y);
  }
});

function renderFloatingLights(): void {
  const rect = canvas.getBoundingClientRect();
  for (const light of floatingLights) {
    light.phase += light.speed * 16;
    light.x = light.baseX + Math.sin(light.phase) * light.amplitude;
    light.y = light.baseY + Math.cos(light.phase * 0.7) * light.amplitude * 0.6;
    if (light.baseX < 0) light.baseX = rect.width;
    if (light.baseX > rect.width) light.baseX = 0;
    if (light.baseY < 0) light.baseY = rect.height;
    if (light.baseY > rect.height) light.baseY = 0;

    ctx.save();
    ctx.globalAlpha = light.alpha * (0.7 + Math.sin(light.phase * 2) * 0.3);
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 6;
    ctx.beginPath();
    ctx.arc(light.x, light.y, light.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function mainFrame(dt: number, timestamp: number): void {
  const rect = canvas.getBoundingClientRect();
  ctx.clearRect(0, 0, rect.width, rect.height);

  renderFloatingLights();

  plant.update(dt, timestamp);
  particles.update(dt);

  plant.render(ctx, timestamp);
  particles.render(ctx);

  if (timestamp - lastProgressUpdate >= 1000) {
    progress = Math.min(100, progress + 1);
    updateProgressBar();
    lastProgressUpdate = timestamp;
  }

  if (progress >= 100 && !cycleComplete) {
    cycleComplete = true;
    cycleCompleteTime = timestamp;
    plant.startFlickering(timestamp);
    audio.playChord(['C4', 'E4', 'G4'], 0.4, 1.5);
  }

  if (cycleComplete && timestamp - cycleCompleteTime >= 1500) {
    progress = 0;
    updateProgressBar();
    plant.reset();
    cycleComplete = false;
  }
}

animLoop.addCallback(mainFrame);
animLoop.start();

updateProgressBar();
