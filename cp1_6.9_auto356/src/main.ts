import { Particle } from './particle';
import { Trail } from './trail';
import { UIController } from './ui';

const PALETTES: string[][] = [
  ['#00D2FF', '#3A7BD5', '#FF6B6B', '#F7DC6F', '#BB8FCE'],
  ['#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe'],
  ['#11998e', '#38ef7d', '#a8ff78', '#78ffd6', '#00b09b'],
  ['#ff9a9e', '#fad0c4', '#fbc2eb', '#a18cd1', '#f6d365'],
  ['#ff4e50', '#f9d423', '#fc913a', '#ff6a88', '#ff99ac']
];

const canvas: HTMLCanvasElement = document.getElementById('canvas') as HTMLCanvasElement;
const ctx: CanvasRenderingContext2D = canvas.getContext('2d')!;

let width = 0;
let height = 0;

function resizeCanvas(): void {
  width = window.innerWidth;
  height = window.innerHeight;
  canvas.width = width * window.devicePixelRatio;
  canvas.height = height * window.devicePixelRatio;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let particles: Particle[] = [];
let trails: Trail[] = [];
let currentPalette: string[] = PALETTES[0];
let colorCycleIndex = 0;

let isMouseDown = false;
let mouseX = 0;
let mouseY = 0;
let prevMouseX = 0;
let prevMouseY = 0;
let lastParticleTime = 0;

const BASE_PARTICLE_INTERVAL = 30;
const HIGH_LOAD_PARTICLE_INTERVAL = 40;
const BASE_TRAIL_INTERVAL = 150;
const HIGH_LOAD_TRAIL_INTERVAL = 300;
const HIGH_LOAD_THRESHOLD = 800;

function handleMouseMove(e: MouseEvent): void {
  const rect = canvas.getBoundingClientRect();
  prevMouseX = mouseX;
  prevMouseY = mouseY;
  mouseX = e.clientX - rect.left;
  mouseY = e.clientY - rect.top;
}

function handleTouchMove(e: TouchEvent): void {
  if (e.touches.length > 0) {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    prevMouseX = mouseX;
    prevMouseY = mouseY;
    mouseX = touch.clientX - rect.left;
    mouseY = touch.clientY - rect.top;
    isMouseDown = true;
  }
}

canvas.addEventListener('mousedown', () => { isMouseDown = true; });
canvas.addEventListener('mouseup', () => { isMouseDown = false; });
canvas.addEventListener('mouseleave', () => { isMouseDown = false; });
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('touchstart', (e) => {
  isMouseDown = true;
  if (e.touches.length > 0) {
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    mouseX = prevMouseX = touch.clientX - rect.left;
    mouseY = prevMouseY = touch.clientY - rect.top;
  }
});
canvas.addEventListener('touchend', () => { isMouseDown = false; });
canvas.addEventListener('touchmove', handleTouchMove);
document.addEventListener('mousemove', (e) => {
  ui.update(e.clientX);
});

const ui = new UIController(
  PALETTES,
  (index: number) => {
    currentPalette = PALETTES[index];
    colorCycleIndex = 0;
  },
  () => {
    particles = [];
    trails = [];
  }
);

function spawnParticle(): void {
  const offsetX = (Math.random() - 0.5) * 10;
  const offsetY = (Math.random() - 0.5) * 10;
  const size = 4 + Math.random() * 4;

  let vx = mouseX - prevMouseX;
  let vy = mouseY - prevMouseY;
  if (vx === 0 && vy === 0) {
    const angle = Math.random() * Math.PI * 2;
    vx = Math.cos(angle) * 10;
    vy = Math.sin(angle) * 10;
  }

  const colorIndex = colorCycleIndex % currentPalette.length;
  colorCycleIndex++;

  particles.push(new Particle(
    mouseX + offsetX,
    mouseY + offsetY,
    vx, vy,
    size,
    colorIndex,
    currentPalette
  ));
}

function drawBackground(): void {
  const gradient = ctx.createRadialGradient(
    width / 2, height / 2, Math.min(width, height) * 0.1,
    width / 2, height / 2, Math.max(width, height) * 0.8
  );
  gradient.addColorStop(0, '#1a1a3e');
  gradient.addColorStop(1, '#0a0a2e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

let lastTime = performance.now();

function animate(currentTime: number): void {
  const dt = Math.min(50, currentTime - lastTime);
  lastTime = currentTime;

  drawBackground();

  const totalParticles = particles.length + trails.length;
  const isHighLoad = totalParticles > HIGH_LOAD_THRESHOLD;
  const particleInterval = isHighLoad ? HIGH_LOAD_PARTICLE_INTERVAL : BASE_PARTICLE_INTERVAL;
  const trailInterval = isHighLoad ? HIGH_LOAD_TRAIL_INTERVAL : BASE_TRAIL_INTERVAL;

  if (isMouseDown || (Math.abs(mouseX - prevMouseX) + Math.abs(mouseY - prevMouseY) > 1)) {
    lastParticleTime += dt;
    if (lastParticleTime >= particleInterval) {
      lastParticleTime = 0;
      spawnParticle();
    }
  }

  ctx.globalCompositeOperation = 'lighter';

  for (let i = particles.length - 1; i >= 0; i--) {
    const alive = particles[i].update(dt, particles, trails, currentPalette, trailInterval);
    if (!alive) {
      particles.splice(i, 1);
    }
  }

  for (let i = trails.length - 1; i >= 0; i--) {
    const alive = trails[i].update(dt);
    if (!alive) {
      trails.splice(i, 1);
    }
  }

  for (const trail of trails) {
    trail.render(ctx);
  }
  for (const particle of particles) {
    particle.render(ctx);
  }

  ctx.globalCompositeOperation = 'source-over';

  ui.update(mouseX);

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
