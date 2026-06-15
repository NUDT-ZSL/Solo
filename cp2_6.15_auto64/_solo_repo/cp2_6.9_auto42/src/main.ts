import { Particle, Shockwave } from './particle';
import { playChord, playGlide } from './audio';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const countEl = document.getElementById('count')!;
const maxREl = document.getElementById('maxR')!;

function resize(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener('resize', resize);

const particles: Particle[] = [];
const shockwaves: Shockwave[] = [];
const MAX_PARTICLES = 50;
const SPAWN_INTERVAL = 500;
let lastSpawn = 0;

interface ClickPulse {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  duration: number;
  elapsed: number;
}
const clickPulses: ClickPulse[] = [];

interface ClickAccel {
  x: number;
  y: number;
  elapsed: number;
  duration: number;
}
const clickAccels: ClickAccel[] = [];

let mouseX = -9999;
let mouseY = -9999;

function createParticle(): Particle {
  const x = Math.random() * canvas.width;
  const y = canvas.height - 10;
  const vx = (Math.random() - 0.5) * 4;
  const vy = -(Math.random() * 2 + 1);
  const radius = Math.random() * 5 + 3;
  const hue = Math.random() * 360;
  const saturation = Math.random() * 20 + 80;
  const lightness = Math.random() * 20 + 60;
  return new Particle(x, y, vx, vy, radius, hue, saturation, lightness);
}

canvas.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
});

canvas.addEventListener('mouseleave', () => {
  mouseX = -9999;
  mouseY = -9999;
});

canvas.addEventListener('click', (e) => {
  clickPulses.push({
    x: e.clientX,
    y: e.clientY,
    radius: 0,
    maxRadius: 80,
    alpha: 1,
    duration: 0.4,
    elapsed: 0
  });
  clickAccels.push({
    x: e.clientX,
    y: e.clientY,
    elapsed: 0,
    duration: 0.5
  });
  playGlide();
});

let lastTime = performance.now();
const TARGET_DT = 1000 / 60;

function loop(now: number): void {
  const dt = Math.min(now - lastTime, 33) / TARGET_DT;
  lastTime = now;

  if (now - lastSpawn > SPAWN_INTERVAL && particles.length < MAX_PARTICLES) {
    particles.push(createParticle());
    lastSpawn = now;
  }

  ctx.fillStyle = 'rgba(0, 0, 17, 0.25)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  clickAccels.forEach(ca => {
    ca.elapsed += (now - lastTime) / 1000;
    if (ca.elapsed < ca.duration) {
      particles.forEach(p => {
        p.applyAttraction(ca.x, ca.y, 2, 100);
      });
    }
  });
  for (let i = clickAccels.length - 1; i >= 0; i--) {
    if (clickAccels[i].elapsed >= clickAccels[i].duration) {
      clickAccels.splice(i, 1);
    }
  }

  if (mouseX > 0 && mouseY > 0) {
    particles.forEach(p => {
      p.applyAttraction(mouseX, mouseY, 0.5, 50);
    });
  }

  for (let i = 0; i < particles.length; i++) {
    const sw = particles[i].update(canvas.width, canvas.height);
    if (sw) shockwaves.push(sw);
  }

  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      if (particles[i].isMerging || particles[j].isMerging) continue;
      const dist = particles[i].distanceTo(particles[j]);
      if (dist < particles[i].radius + particles[j].radius) {
        const merged = Particle.merge(particles[i], particles[j]);
        playChord(merged.radius);
        particles.push(merged);
        break;
      }
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    if (particles[i].isMerging) {
      particles.splice(i, 1);
    }
  }

  particles.forEach(p => p.draw(ctx));

  for (let i = shockwaves.length - 1; i >= 0; i--) {
    const sw = shockwaves[i];
    sw.elapsed += (now - lastTime) / 1000;
    if (sw.elapsed >= sw.duration) {
      shockwaves.splice(i, 1);
      continue;
    }
    const t = sw.elapsed / sw.duration;
    sw.radius = sw.maxRadius * t;
    sw.alpha = 1 - t;
    ctx.beginPath();
    ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${sw.alpha})`;
    ctx.lineWidth = 2;
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#ffffff';
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  for (let i = clickPulses.length - 1; i >= 0; i--) {
    const cp = clickPulses[i];
    cp.elapsed += (now - lastTime) / 1000;
    if (cp.elapsed >= cp.duration) {
      clickPulses.splice(i, 1);
      continue;
    }
    const t = cp.elapsed / cp.duration;
    cp.radius = cp.maxRadius * t;
    cp.alpha = 1 - t;
    ctx.beginPath();
    ctx.arc(cp.x, cp.y, cp.radius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 0, ${cp.alpha})`;
    ctx.lineWidth = 3;
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#ffff00';
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  let maxR = 0;
  particles.forEach(p => {
    if (p.radius > maxR) maxR = p.radius;
  });
  countEl.textContent = String(particles.length);
  maxREl.textContent = maxR.toFixed(1);

  requestAnimationFrame(loop);
}

requestAnimationFrame(loop);
