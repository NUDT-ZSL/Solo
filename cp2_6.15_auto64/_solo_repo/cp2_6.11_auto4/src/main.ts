import { Orchestrator, NoteInput } from './orchestrator';

interface BackgroundStar {
  x: number;
  y: number;
  radius: number;
  phase: number;
  period: number;
}

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const orchestrator = new Orchestrator();

let width = window.innerWidth;
let height = window.innerHeight;
let bgStars: BackgroundStar[] = [];
let bgCanvas: HTMLCanvasElement;
let noisePattern: CanvasPattern | null = null;

function generateBackgroundStars(): void {
  const count = 60 + Math.floor(Math.random() * 41);
  bgStars = [];
  for (let i = 0; i < count; i++) {
    bgStars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 0.5 + Math.random() * 1.5,
      phase: Math.random() * Math.PI * 2,
      period: 2 + Math.random() * 2,
    });
  }
}

function createNoiseTexture(): void {
  const noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = 128;
  noiseCanvas.height = 128;
  const nctx = noiseCanvas.getContext('2d')!;
  const imageData = nctx.createImageData(128, 128);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const v = Math.random() * 255;
    imageData.data[i] = v;
    imageData.data[i + 1] = v;
    imageData.data[i + 2] = v;
    imageData.data[i + 3] = 10;
  }
  nctx.putImageData(imageData, 0, 0);
  noisePattern = ctx.createPattern(noiseCanvas, 'repeat');
}

function renderBackground(): void {
  bgCanvas = document.createElement('canvas');
  bgCanvas.width = width;
  bgCanvas.height = height;
  const bgCtx = bgCanvas.getContext('2d')!;

  const cx = width * 0.5;
  const cy = height * 0.45;
  const maxDim = Math.max(width, height);
  const grad = bgCtx.createRadialGradient(cx, cy, 0, cx, cy, maxDim * 0.75);
  grad.addColorStop(0, '#0E1225');
  grad.addColorStop(0.5, '#0A0E1A');
  grad.addColorStop(1, '#0A1628');
  bgCtx.fillStyle = grad;
  bgCtx.fillRect(0, 0, width, height);

  const nebulaGrad = bgCtx.createRadialGradient(
    width * 0.3, height * 0.3, 0,
    width * 0.3, height * 0.3, maxDim * 0.4
  );
  nebulaGrad.addColorStop(0, 'rgba(20, 30, 80, 0.15)');
  nebulaGrad.addColorStop(0.5, 'rgba(15, 20, 50, 0.08)');
  nebulaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
  bgCtx.fillStyle = nebulaGrad;
  bgCtx.fillRect(0, 0, width, height);

  const nebula2 = bgCtx.createRadialGradient(
    width * 0.7, height * 0.6, 0,
    width * 0.7, height * 0.6, maxDim * 0.35
  );
  nebula2.addColorStop(0, 'rgba(40, 15, 50, 0.12)');
  nebula2.addColorStop(0.6, 'rgba(20, 10, 30, 0.06)');
  nebula2.addColorStop(1, 'rgba(0, 0, 0, 0)');
  bgCtx.fillStyle = nebula2;
  bgCtx.fillRect(0, 0, width, height);
}

function updatePanelResponsive(): void {
  const panel = document.getElementById('panel')!;
  const isMobile = width < 481;
  const isLandscapeMobile = width > height && width < 1024;
  const isTabletPortrait = width >= 481 && width <= 1024 && height >= width;

  if (isLandscapeMobile) {
    panel.classList.add('landscape-mobile');
  } else {
    panel.classList.remove('landscape-mobile');
  }

  if (isTabletPortrait) {
    panel.classList.add('tablet-portrait');
  } else {
    panel.classList.remove('tablet-portrait');
  }
}

function resize(): void {
  width = window.innerWidth;
  height = window.innerHeight;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  orchestrator.setCanvasSize(width, height);
  generateBackgroundStars();
  renderBackground();
  createNoiseTexture();
  updatePanelResponsive();
}

let lastTime = 0;

function animate(time: number): void {
  const dt = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;

  if (bgCanvas && bgCanvas.width > 0 && bgCanvas.height > 0) {
    ctx.drawImage(bgCanvas, 0, 0);
  } else {
    ctx.fillStyle = '#0A0E1A';
    ctx.fillRect(0, 0, width, height);
  }

  if (noisePattern) {
    ctx.globalAlpha = 0.12;
    ctx.fillStyle = noisePattern;
    ctx.fillRect(0, 0, width, height);
    ctx.globalAlpha = 1;
  }

  const timeSec = time / 1000;
  for (const star of bgStars) {
    const brightness =
      0.65 + 0.35 * Math.sin((timeSec / star.period) * Math.PI * 2 + star.phase);
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(200,215,240,${brightness.toFixed(3)})`;
    ctx.fill();

    if (star.radius > 1.2 && brightness > 0.85) {
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.radius * 3, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(200,215,240,${(brightness * 0.12).toFixed(3)})`;
      ctx.fill();
    }
  }

  orchestrator.update(dt);
  orchestrator.draw(ctx);

  requestAnimationFrame(animate);
}

let pointerDownTime = 0;

canvas.addEventListener('pointerdown', (e) => {
  pointerDownTime = performance.now();
});

canvas.addEventListener('pointerup', (e) => {
  const duration = performance.now() - pointerDownTime;
  const velocity = Math.min(1, Math.max(0.1, duration / 800));
  const rect = canvas.getBoundingClientRect();
  const note: NoteInput = {
    pitch: 1 + Math.floor(Math.random() * 7),
    velocity,
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };
  orchestrator.addStar(note);
});

document.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  const key = parseInt(e.key);
  if (key >= 1 && key <= 7) {
    const note: NoteInput = {
      pitch: key,
      velocity: 0.3 + Math.random() * 0.4,
      x: width * 0.15 + Math.random() * width * 0.7,
      y: height * 0.15 + Math.random() * height * 0.7,
    };
    orchestrator.addStar(note);
  }
});

const densitySlider = document.getElementById('density') as HTMLInputElement;
const densityValue = document.getElementById('density-value')!;
const durationSlider = document.getElementById('duration') as HTMLInputElement;
const durationValue = document.getElementById('duration-value')!;
const resetBtn = document.getElementById('reset-btn')!;

densitySlider.addEventListener('input', () => {
  const val = parseInt(densitySlider.value);
  orchestrator.maxDensity = val;
  densityValue.textContent = val.toString();
});

durationSlider.addEventListener('input', () => {
  const val = parseInt(durationSlider.value);
  orchestrator.decayTime = val;
  durationValue.textContent = val + 's';
});

resetBtn.addEventListener('click', () => {
  orchestrator.reset();
});

window.addEventListener('resize', resize);
resize();
requestAnimationFrame(animate);
