import { FireworkManager, Config } from './fireworkManager.js';

const canvas = document.getElementById('fireworksCanvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

const keySequenceEl = document.getElementById('keySequence') as HTMLDivElement;
const scoreValueEl = document.getElementById('scoreValue') as HTMLSpanElement;
const missFlashEl = document.getElementById('missFlash') as HTMLDivElement;

const controlPanel = document.getElementById('controlPanel') as HTMLDivElement;
const panelToggle = document.getElementById('panelToggle') as HTMLButtonElement;
const particleCountSlider = document.getElementById('particleCount') as HTMLInputElement;
const particleCountValue = document.getElementById('particleCountValue') as HTMLSpanElement;
const particleSpeedSlider = document.getElementById('particleSpeed') as HTMLInputElement;
const particleSpeedValue = document.getElementById('particleSpeedValue') as HTMLSpanElement;
const themeButtons = document.querySelectorAll('.theme-btn') as NodeListOf<HTMLButtonElement>;
const resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;

const config: Config = {
  particleCount: parseInt(particleCountSlider.value, 10),
  particleSpeed: parseFloat(particleSpeedSlider.value),
  colorTheme: 0
};

const fireworkManager = new FireworkManager({
  onKeySequenceUpdate: (keys: string[]) => {
    keySequenceEl.innerHTML = '';
    if (keys.length === 0) {
      keySequenceEl.innerHTML = '<span style="opacity:0.5;font-size:16px;font-weight:400;letter-spacing:1px;">按数字键 1-8 开始演奏烟花</span>';
      return;
    }
    keys.forEach((k, i) => {
      const badge = document.createElement('span');
      badge.className = 'key-badge';
      badge.textContent = k;
      const colorIdx = parseInt(k, 10) - 1;
      const themes = [
        ['#FF3366', '#FF9933', '#FFD700', '#33CC66', '#33CCCC', '#3366FF', '#9933FF', '#FF66B2'],
        ['#FF6B9D', '#FFA07A', '#F0E68C', '#98FB98', '#87CEEB', '#B0E0E6', '#DDA0DD', '#FFB6C1'],
        ['#00FF87', '#00D4AA', '#00B4D8', '#0077B6', '#023E8A', '#48CAE4', '#5E60CE', '#7400B8']
      ];
      badge.style.background = `linear-gradient(135deg, ${themes[config.colorTheme][colorIdx]}44, ${themes[config.colorTheme][colorIdx]}22)`;
      badge.style.borderColor = themes[config.colorTheme][colorIdx] + '66';
      badge.style.color = themes[config.colorTheme][colorIdx];
      keySequenceEl.appendChild(badge);
      if (i < keys.length - 1) {
        const arrow = document.createElement('span');
        arrow.className = 'key-arrow';
        arrow.textContent = '→';
        keySequenceEl.appendChild(arrow);
      }
    });
  },
  onScoreUpdate: (score: number) => {
    scoreValueEl.textContent = score.toString();
  },
  onMiss: () => {
    missFlashEl.classList.remove('active');
    void missFlashEl.offsetWidth;
    missFlashEl.classList.add('active');
  }
}, config);

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  const w = window.innerWidth;
  const h = window.innerHeight;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  canvas.style.width = w + 'px';
  canvas.style.height = h + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  fireworkManager.setCanvasSize(w, h);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);

let mouseX = window.innerWidth / 2;
let mouseY = window.innerHeight / 2;

window.addEventListener('mousemove', (e) => {
  mouseX = e.clientX;
  mouseY = e.clientY;
  fireworkManager.setMousePosition(mouseX, mouseY);
});

window.addEventListener('touchmove', (e) => {
  if (e.touches.length > 0) {
    mouseX = e.touches[0].clientX;
    mouseY = e.touches[0].clientY;
    fireworkManager.setMousePosition(mouseX, mouseY);
  }
}, { passive: true });

window.addEventListener('keydown', (e) => {
  if (e.key >= '1' && e.key <= '8') {
    e.preventDefault();
    fireworkManager.triggerKey(e.key, performance.now() / 1000);
  }
});

particleCountSlider.addEventListener('input', () => {
  config.particleCount = parseInt(particleCountSlider.value, 10);
  particleCountValue.textContent = config.particleCount.toString();
  fireworkManager.setConfig({ particleCount: config.particleCount });
});

particleSpeedSlider.addEventListener('input', () => {
  config.particleSpeed = parseFloat(particleSpeedSlider.value);
  particleSpeedValue.textContent = config.particleSpeed.toFixed(1) + 'x';
  fireworkManager.setConfig({ particleSpeed: config.particleSpeed });
});

themeButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    themeButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    config.colorTheme = parseInt(btn.dataset.theme || '0', 10);
    fireworkManager.setConfig({ colorTheme: config.colorTheme });
  });
});

resetBtn.addEventListener('click', () => {
  fireworkManager.reset();
});

panelToggle.addEventListener('click', () => {
  controlPanel.classList.toggle('open');
});

let isDragging = false;
let dragOffsetX = 0;
let dragOffsetY = 0;

controlPanel.addEventListener('mousedown', (e) => {
  if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'BUTTON') {
    return;
  }
  isDragging = true;
  const rect = controlPanel.getBoundingClientRect();
  dragOffsetX = e.clientX - rect.left;
  dragOffsetY = e.clientY - rect.top;
  controlPanel.style.right = 'auto';
  controlPanel.style.left = rect.left + 'px';
  controlPanel.style.top = rect.top + 'px';
});

window.addEventListener('mousemove', (e) => {
  if (!isDragging) return;
  const newX = e.clientX - dragOffsetX;
  const newY = e.clientY - dragOffsetY;
  controlPanel.style.left = Math.max(0, Math.min(window.innerWidth - controlPanel.offsetWidth, newX)) + 'px';
  controlPanel.style.top = Math.max(0, Math.min(window.innerHeight - controlPanel.offsetHeight, newY)) + 'px';
});

window.addEventListener('mouseup', () => {
  isDragging = false;
});

let lastTime = performance.now();
function animate(): void {
  const now = performance.now();
  const deltaTime = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;

  fireworkManager.update(deltaTime);
  fireworkManager.draw(ctx);

  requestAnimationFrame(animate);
}

fireworkManager.setMousePosition(mouseX, mouseY);
requestAnimationFrame(animate);
