import { Hourglass, HourglassParams } from './Hourglass';
import { Particle } from './Particle';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 640;

canvas.width = CANVAS_WIDTH;
canvas.height = CANVAS_HEIGHT;

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = CANVAS_WIDTH * dpr;
  canvas.height = CANVAS_HEIGHT * dpr;
  canvas.style.width = CANVAS_WIDTH + 'px';
  canvas.style.height = CANVAS_HEIGHT + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

function centerCanvas(): void {
  const marginLeft = Math.max(0, (window.innerWidth - CANVAS_WIDTH) / 2);
  const marginTop = Math.max(0, (window.innerHeight - CANVAS_HEIGHT) / 2);
  canvas.style.position = 'fixed';
  canvas.style.left = marginLeft + 'px';
  canvas.style.top = marginTop + 'px';
}
centerCanvas();
window.addEventListener('resize', centerCanvas);

const hourglass = new Hourglass(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2);

const colorSlider = document.getElementById('colorSlider') as HTMLInputElement;
const speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
const angleSlider = document.getElementById('angleSlider') as HTMLInputElement;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;
const colorValue = document.getElementById('colorValue') as HTMLDivElement;
const speedValue = document.getElementById('speedValue') as HTMLDivElement;
const angleValue = document.getElementById('angleValue') as HTMLDivElement;

const colorStart = Particle.hexToHsl('#C2A77D');
const colorEnd = Particle.hexToHsl('#5C3D2E');

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function getColorFromSlider(value: number): string {
  const t = value / 100;
  const h = lerp(colorStart.h, colorEnd.h, t);
  const s = lerp(colorStart.s, colorEnd.s, t);
  const l = lerp(colorStart.l, colorEnd.l, t);
  return Particle.hslToHex(h, s, l);
}

function updateSliderThumbColor(color: string): void {
  const styleSheets = document.styleSheets;
  for (let i = 0; i < styleSheets.length; i++) {
    const sheet = styleSheets[i] as CSSStyleSheet;
    try {
      const rules = sheet.rules || sheet.cssRules;
      for (let j = 0; j < rules.length; j++) {
        const rule = rules[j] as CSSStyleRule;
        if (rule.selectorText && (
          rule.selectorText.includes('::-webkit-slider-thumb') ||
          rule.selectorText.includes('::-moz-range-thumb')
        )) {
          rule.style.setProperty('background', color, 'important');
        }
      }
    } catch (e) { }
  }
}

let params: HourglassParams = {
  particleColor: getColorFromSlider(0),
  flowSpeed: parseInt(speedSlider.value),
  tiltAngle: parseInt(angleSlider.value)
};

colorSlider.addEventListener('input', () => {
  const color = getColorFromSlider(parseInt(colorSlider.value));
  params.particleColor = color;
  colorValue.textContent = color.toUpperCase();
  updateSliderThumbColor(color);
});

speedSlider.addEventListener('input', () => {
  params.flowSpeed = parseInt(speedSlider.value);
  speedValue.textContent = params.flowSpeed.toString();
});

angleSlider.addEventListener('input', () => {
  params.tiltAngle = parseInt(angleSlider.value);
  angleValue.textContent = params.tiltAngle + '°';
});

resetBtn.addEventListener('click', () => {
  hourglass.reset();
});

canvas.addEventListener('click', (e: MouseEvent) => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  if (hourglass.containsPoint(x, y)) {
    hourglass.flip();
  }
});

updateSliderThumbColor(getColorFromSlider(parseInt(colorSlider.value)));

let lastTime = performance.now();

function renderBackground(): void {
  const gradient = ctx.createRadialGradient(
    CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 50,
    CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH
  );
  gradient.addColorStop(0, '#1F2833');
  gradient.addColorStop(1, '#0B0C10');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const lightGradient = ctx.createRadialGradient(
    CANVAS_WIDTH / 2 - 200, CANVAS_HEIGHT / 2 - 200, 0,
    CANVAS_WIDTH / 2 - 200, CANVAS_HEIGHT / 2 - 200, 500
  );
  lightGradient.addColorStop(0, 'rgba(255, 200, 120, 0.2)');
  lightGradient.addColorStop(1, 'rgba(255, 200, 120, 0)');
  ctx.fillStyle = lightGradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
}

function renderStatus(): void {
  ctx.save();
  ctx.font = '300 18px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = '#aaa';
  const text = hourglass.isComplete ? '完成' : (hourglass.isTiming ? '计时中' : '就绪');
  ctx.fillText(text, 24, 40);
  ctx.restore();
}

function animate(currentTime: number): void {
  const deltaTime = currentTime - lastTime;
  lastTime = currentTime;

  hourglass.update(deltaTime, params);

  renderBackground();
  hourglass.render(ctx);
  renderStatus();

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);
