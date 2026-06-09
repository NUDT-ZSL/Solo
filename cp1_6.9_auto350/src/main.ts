import { NoteBeam, NOTE_CONFIGS, Star, Particle, NoteConfig } from './noteBeam';

export interface Config {
  beamSpeed: number;
  beamWidth: number;
  starCount: number;
  particleCount: number;
  bgStarCount: number;
  overlapDistance: number;
  overlapBoost: number;
}

export const config: Config = {
  beamSpeed: 200,
  beamWidth: 30,
  starCount: 100,
  particleCount: 400,
  bgStarCount: 400,
  overlapDistance: 60,
  overlapBoost: 0.3
};

interface BackgroundStar {
  x: number;
  y: number;
  size: number;
  opacity: number;
  speed: number;
}

interface FlashEffect {
  active: boolean;
  opacity: number;
  duration: number;
  timer: number;
}

const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const controlText = document.getElementById('controlText')!;

let beams: NoteBeam[] = [];
let stars: Star[] = [];
let particles: Particle[] = [];
let bgStars: BackgroundStar[] = [];
let flash: FlashEffect = { active: false, opacity: 0, duration: 0.2, timer: 0 };
let activeKeys: Set<string> = new Set();
let lastTime: number = 0;

const STAR_COLORS = ['#FFD700', '#FFA07A', '#FF69B4', '#FFDEAD', '#FFB6C1', '#FFA500'];

export function resizeCanvas(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

export function initStars(): void {
  stars = [];
  const topAreaStart = -50;
  const topAreaEnd = 100;
  for (let i = 0; i < config.starCount; i++) {
    const size = 6 + Math.random() * 8;
    const color = STAR_COLORS[Math.floor(Math.random() * STAR_COLORS.length)];
    stars.push({
      x: Math.random() * canvas.width,
      y: topAreaStart + Math.random() * (topAreaEnd - topAreaStart),
      size,
      baseColor: color,
      color,
      opacity: 0.6 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      alive: true
    });
  }
}

export function initBgStars(): void {
  bgStars = [];
  for (let i = 0; i < config.bgStarCount; i++) {
    bgStars.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      size: 1 + Math.random(),
      opacity: 0.2 + Math.random() * 0.3,
      speed: 0.1
    });
  }
}

export function createExplosion(star: Star): void {
  const count = 12 + Math.floor(Math.random() * 9);
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 2 + Math.random() * 3;
    particles.push({
      x: star.x,
      y: star.y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: 2 + Math.random() * 2,
      color: star.baseColor,
      opacity: 1,
      life: 0,
      maxLife: 1.5
    });
  }
  flash.active = true;
  flash.timer = 0;
  flash.opacity = 0.05;
}

export function triggerFlash(): void {
  flash.active = true;
  flash.timer = 0;
  flash.opacity = 0.05;
}

export function drawBackground(time: number): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, '#0a0a2e');
  gradient.addColorStop(1, '#1a1a3e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const s of bgStars) {
    s.x += s.speed;
    if (s.x > canvas.width) s.x = 0;
    ctx.globalAlpha = s.opacity;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function drawStar(star: Star, time: number): void {
  if (!star.alive) return;
  const pulse = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.5 * time + star.phase));
  const opacity = star.opacity * pulse;
  const color = star.baseColor;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.fillStyle = color;
  ctx.shadowColor = color;
  ctx.shadowBlur = 12;

  drawHexagram(ctx, star.x, star.y, star.size);

  ctx.restore();
}

export function drawHexagram(ctx: CanvasRenderingContext2D, cx: number, cy: number, size: number): void {
  const outerR = size / 2;
  const innerR = outerR * 0.38;

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const outerAngle = (Math.PI / 3) * i - Math.PI / 2;
    const innerAngle = outerAngle + Math.PI / 6;
    const ox = cx + outerR * Math.cos(outerAngle);
    const oy = cy + outerR * Math.sin(outerAngle);
    const ix = cx + innerR * Math.cos(innerAngle);
    const iy = cy + innerR * Math.sin(innerAngle);
    if (i === 0) ctx.moveTo(ox, oy);
    else ctx.lineTo(ox, oy);
    ctx.lineTo(ix, iy);
  }
  ctx.closePath();
  ctx.fill();
}

export function drawParticles(deltaTime: number): void {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.life += deltaTime;
    const lifeRatio = p.life / p.maxLife;
    p.opacity = Math.exp(-lifeRatio * 4);
    p.x += p.vx;
    p.y += p.vy;

    if (p.life >= p.maxLife || p.opacity <= 0.01) {
      particles.splice(i, 1);
      continue;
    }

    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function updateStars(time: number): void {
  for (const star of stars) {
    if (star.alive) {
      const pulse = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(2 * Math.PI * 0.5 * time + star.phase));
      star.opacity = pulse;
    }
  }
}

export function computeOverlaps(): void {
  for (let i = 0; i < beams.length; i++) {
    beams[i].overlapBoost = 0;
  }
  for (let i = 0; i < beams.length; i++) {
    for (let j = i + 1; j < beams.length; j++) {
      const dist = Math.abs(beams[i].x - beams[j].x);
      if (dist < config.overlapDistance) {
        beams[i].overlapBoost = config.overlapBoost;
        beams[j].overlapBoost = config.overlapBoost;
      }
    }
  }
}

export function updateAndDrawBeams(deltaTime: number): void {
  computeOverlaps();

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  for (let i = beams.length - 1; i >= 0; i--) {
    const beam = beams[i];
    beam.update(deltaTime);

    const collidedStar = beam.collisionCheck(stars);
    if (collidedStar) {
      collidedStar.alive = false;
      createExplosion(collidedStar);
    }

    if (beam.active) {
      beam.draw(ctx);
    } else {
      beams.splice(i, 1);
    }
  }

  ctx.restore();
}

export function drawFlash(deltaTime: number): void {
  if (!flash.active) return;
  flash.timer += deltaTime;
  const ratio = flash.timer / flash.duration;
  const currentOpacity = flash.opacity * (1 - ratio);

  if (flash.timer >= flash.duration) {
    flash.active = false;
    return;
  }

  ctx.save();
  ctx.globalAlpha = currentOpacity;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

export function updateControlBar(): void {
  const activeNotes: string[] = [];
  for (const key of activeKeys) {
    const cfg = NOTE_CONFIGS.find(c => c.key === key);
    if (cfg) activeNotes.push(cfg.noteName);
  }
  const noteStr = activeNotes.length > 0 ? activeNotes.join('、') : '无';
  controlText.textContent = `按 A-L 键触发光柱 · 当前音符: ${noteStr} · 光柱数: ${beams.length}`;
}

export function keyboardHandler(e: KeyboardEvent): void {
  const key = e.key.toLowerCase();
  const cfg = NOTE_CONFIGS.find(c => c.key === key);
  if (!cfg) return;

  if (e.type === 'keydown') {
    if (activeKeys.has(key)) return;
    activeKeys.add(key);
    spawnBeam(cfg);
  } else if (e.type === 'keyup') {
    activeKeys.delete(key);
  }
  updateControlBar();
}

export function spawnBeam(cfg: NoteConfig): void {
  const beamX = 80 + (NOTE_CONFIGS.indexOf(cfg) + 0.5) * ((canvas.width - 160) / NOTE_CONFIGS.length);
  const beam = new NoteBeam(cfg.key, cfg.noteName, cfg.frequency, beamX, canvas.height);
  beams.push(beam);
  updateControlBar();
}

export function renderLoop(currentTime: number): void {
  if (!lastTime) lastTime = currentTime;
  const deltaTime = Math.min((currentTime - lastTime) / 1000, 1 / 30);
  lastTime = currentTime;

  const timeSec = currentTime / 1000;

  drawBackground(timeSec);
  updateStars(timeSec);

  for (const star of stars) {
    drawStar(star, timeSec);
  }

  updateAndDrawBeams(deltaTime);
  drawParticles(deltaTime);
  drawFlash(deltaTime);
  updateControlBar();

  requestAnimationFrame(renderLoop);
}

export function init(): void {
  resizeCanvas();
  initStars();
  initBgStars();

  window.addEventListener('resize', () => {
    resizeCanvas();
    initStars();
  });

  window.addEventListener('keydown', keyboardHandler);
  window.addEventListener('keyup', keyboardHandler);

  requestAnimationFrame(renderLoop);
}

init();
