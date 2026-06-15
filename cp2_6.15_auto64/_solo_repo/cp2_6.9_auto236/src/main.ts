import { HexRing, MAX_DISTANCE } from './HexRings';
import { AudioEngine } from './AudioEngine';
import { SequenceManager } from './SequenceManager';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const progressBar = document.getElementById('progress-bar') as HTMLDivElement;
const btnPlay = document.getElementById('btn-play') as HTMLButtonElement;
const btnLoop = document.getElementById('btn-loop') as HTMLButtonElement;
const btnClear = document.getElementById('btn-clear') as HTMLButtonElement;
const btnRandom = document.getElementById('btn-random') as HTMLButtonElement;

const audioEngine = new AudioEngine();
const hexRing = new HexRing(16);
let sequenceManager: SequenceManager;

let lastTime = 0;

function resizeCanvas(): void {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = window.innerWidth + 'px';
  canvas.style.height = window.innerHeight + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  const isMobile = window.innerWidth < 768;
  const diameter = isMobile ? window.innerWidth * 0.7 : window.innerHeight * 0.6;
  const scale = diameter / 2 / (MAX_DISTANCE + 50);
  hexRing.setScale(Math.max(0.6, scale));
  hexRing.setCenter(window.innerWidth / 2, window.innerHeight / 2);
}

function updateProgressBar(): void {
  const activeCount = hexRing.getActiveCount();
  const maxActive = 8;
  const ratio = Math.min(activeCount / maxActive, 1);
  progressBar.style.width = (ratio * 100) + '%';
}

function onSequenceChange(): void {
  updateProgressBar();
}

function onPlayProgress(progress: number): void {
  if (sequenceManager.getIsPlaying()) {
    progressBar.style.width = (progress * 100) + '%';
  } else {
    updateProgressBar();
  }
}

sequenceManager = new SequenceManager(
  hexRing,
  audioEngine,
  onSequenceChange,
  onPlayProgress
);

function getCanvasPos(e: MouseEvent | TouchEvent): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  if ('touches' in e) {
    const touch = e.touches[0] || e.changedTouches[0];
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top
    };
  }
  return {
    x: (e as MouseEvent).clientX - rect.left,
    y: (e as MouseEvent).clientY - rect.top
  };
}

let isMouseDown = false;

canvas.addEventListener('mousedown', (e) => {
  e.preventDefault();
  const pos = getCanvasPos(e);
  const hitIndex = hexRing.hitTest(pos.x, pos.y);
  isMouseDown = true;

  if (hitIndex >= 0) {
    const hex = hexRing.hexagons[hitIndex];
    if (hex.isActive) {
      hexRing.startDrag(hitIndex);
      hex.pressScale = 0.9;
    } else {
      if (hexRing.activateHexagon(hitIndex)) {
        audioEngine.playTone(hexRing.getHexFrequency(hexRing.hexagons[hitIndex]), 0.3, 0.3);
        sequenceManager.addToSequence(hitIndex);
        hex.pressScale = 0.9;
      }
    }
  }
});

canvas.addEventListener('mousemove', (e) => {
  const pos = getCanvasPos(e);
  if (isMouseDown && hexRing.isDragging()) {
    hexRing.updateDrag(pos.x, pos.y);
  } else {
    const hitIndex = hexRing.hitTest(pos.x, pos.y);
    hexRing.setHover(hitIndex);
  }
});

canvas.addEventListener('mouseup', () => {
  hexRing.endDrag();
  isMouseDown = false;
});

canvas.addEventListener('mouseleave', () => {
  if (isMouseDown) {
    hexRing.endDrag();
  }
  isMouseDown = false;
  hexRing.setHover(-1);
});

canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const pos = getCanvasPos(e);
  const hitIndex = hexRing.hitTest(pos.x, pos.y);
  isMouseDown = true;

  if (hitIndex >= 0) {
    const hex = hexRing.hexagons[hitIndex];
    if (hex.isActive) {
      hexRing.startDrag(hitIndex);
      hex.pressScale = 0.9;
    } else {
      if (hexRing.activateHexagon(hitIndex)) {
        audioEngine.playTone(hexRing.getHexFrequency(hexRing.hexagons[hitIndex]), 0.3, 0.3);
        sequenceManager.addToSequence(hitIndex);
        hex.pressScale = 0.9;
      }
    }
  }
}, { passive: false });

canvas.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const pos = getCanvasPos(e);
  if (isMouseDown && hexRing.isDragging()) {
    hexRing.updateDrag(pos.x, pos.y);
  }
}, { passive: false });

canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  hexRing.endDrag();
  isMouseDown = false;
}, { passive: false });

btnPlay.addEventListener('click', () => {
  audioEngine.ensureContext();
  if (sequenceManager.getIsPlaying()) {
    sequenceManager.stop();
    btnPlay.textContent = '播放';
  } else {
    sequenceManager.play();
    btnPlay.textContent = '停止';
  }
});

btnLoop.addEventListener('click', () => {
  const looping = sequenceManager.toggleLoop();
  hexRing.isRotating = looping && sequenceManager.getIsPlaying();
  if (looping) {
    btnLoop.classList.add('active');
  } else {
    btnLoop.classList.remove('active');
  }
});

btnClear.addEventListener('click', () => {
  sequenceManager.clear();
  btnPlay.textContent = '播放';
  btnLoop.classList.remove('active');
});

btnRandom.addEventListener('click', () => {
  audioEngine.ensureContext();
  sequenceManager.randomActivateRandom();
  for (const hex of hexRing.hexagons) {
    if (hex.isActive) {
      audioEngine.playTone(hexRing.getHexFrequency(hex), 0.2, 0.2);
    }
  }
});

function drawBackground(): void {
  const gradient = ctx.createLinearGradient(0, 0, 0, window.innerHeight);
  gradient.addColorStop(0, '#0A0515');
  gradient.addColorStop(1, '#1A0A2E');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
}

function gameLoop(currentTime: number): void {
  const deltaTime = lastTime ? currentTime - lastTime : 16;
  lastTime = currentTime;

  hexRing.update(deltaTime, currentTime);

  drawBackground();
  hexRing.draw(ctx, currentTime);

  requestAnimationFrame(gameLoop);
}

window.addEventListener('resize', resizeCanvas);
resizeCanvas();
updateProgressBar();
requestAnimationFrame(gameLoop);
