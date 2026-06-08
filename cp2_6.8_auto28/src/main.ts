import { PixelEditor, createEmptyFrame, FrameData, PIXEL_SIZE, SCALE } from './editor';
import { Animator } from './animator';

const SKIN = '#f4a88c';
const SKIN_DARK = '#d88868';
const HAIR = '#5a3825';
const HAIR_DARK = '#3a2418';
const SHIRT = '#5c7cfa';
const SHIRT_DARK = '#3b5bdb';
const SHIRT_LIGHT = '#748ffc';
const PANTS = '#495057';
const PANTS_DARK = '#343a40';
const SHOES = '#212529';
const EYE_WHITE = '#ffffff';
const EYE = '#1a1a2e';
const OUTLINE = '#1a1a2e';

function drawPixel(frame: FrameData, x: number, y: number, color: string | null): void {
  if (x >= 0 && x < PIXEL_SIZE && y >= 0 && y < PIXEL_SIZE) {
    frame[y][x] = color;
  }
}

function drawRect(frame: FrameData, x: number, y: number, w: number, h: number, color: string): void {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      drawPixel(frame, x + dx, y + dy, color);
    }
  }
}

function createIdleFrame(): FrameData {
  const frame = createEmptyFrame();

  drawRect(frame, 11, 5, 10, 10, OUTLINE);
  drawRect(frame, 12, 6, 8, 8, SKIN);
  drawRect(frame, 11, 4, 10, 2, HAIR);
  drawPixel(frame, 10, 5, HAIR);
  drawPixel(frame, 21, 5, HAIR);
  drawPixel(frame, 10, 6, HAIR);
  drawPixel(frame, 21, 6, HAIR_DARK);

  drawPixel(frame, 14, 9, EYE);
  drawPixel(frame, 17, 9, EYE);
  drawPixel(frame, 14, 8, EYE_WHITE);
  drawPixel(frame, 15, 8, EYE_WHITE);
  drawPixel(frame, 16, 8, EYE_WHITE);
  drawPixel(frame, 17, 8, EYE_WHITE);

  drawPixel(frame, 15, 12, SKIN_DARK);
  drawPixel(frame, 16, 12, SKIN_DARK);

  drawRect(frame, 10, 15, 12, 10, OUTLINE);
  drawRect(frame, 11, 16, 10, 8, SHIRT);
  drawRect(frame, 11, 16, 10, 1, SHIRT_LIGHT);
  drawPixel(frame, 15, 18, SHIRT_DARK);
  drawPixel(frame, 16, 18, SHIRT_DARK);
  drawPixel(frame, 15, 19, SHIRT_DARK);
  drawPixel(frame, 16, 19, SHIRT_DARK);
  drawPixel(frame, 15, 20, SHIRT_DARK);
  drawPixel(frame, 16, 20, SHIRT_DARK);

  drawRect(frame, 8, 16, 2, 8, OUTLINE);
  drawPixel(frame, 9, 17, SKIN);
  drawPixel(frame, 9, 18, SKIN);
  drawPixel(frame, 9, 19, SKIN);
  drawPixel(frame, 9, 20, SKIN);
  drawPixel(frame, 9, 21, SKIN);
  drawPixel(frame, 9, 22, SKIN);

  drawRect(frame, 22, 16, 2, 8, OUTLINE);
  drawPixel(frame, 22, 17, SKIN);
  drawPixel(frame, 22, 18, SKIN);
  drawPixel(frame, 22, 19, SKIN);
  drawPixel(frame, 22, 20, SKIN);
  drawPixel(frame, 22, 21, SKIN);
  drawPixel(frame, 22, 22, SKIN);

  drawRect(frame, 11, 25, 4, 5, OUTLINE);
  drawRect(frame, 12, 26, 2, 3, PANTS);
  drawPixel(frame, 12, 28, PANTS_DARK);

  drawRect(frame, 17, 25, 4, 5, OUTLINE);
  drawRect(frame, 18, 26, 2, 3, PANTS);
  drawPixel(frame, 18, 28, PANTS_DARK);

  drawRect(frame, 11, 29, 4, 2, OUTLINE);
  drawPixel(frame, 12, 30, SHOES);
  drawPixel(frame, 13, 30, SHOES);

  drawRect(frame, 17, 29, 4, 2, OUTLINE);
  drawPixel(frame, 18, 30, SHOES);
  drawPixel(frame, 19, 30, SHOES);

  return frame;
}

function createWalkFrame1(): FrameData {
  const frame = createIdleFrame();

  drawRect(frame, 10, 15, 12, 10, OUTLINE);
  drawRect(frame, 11, 16, 10, 8, SHIRT);
  drawRect(frame, 11, 16, 10, 1, SHIRT_LIGHT);
  drawPixel(frame, 15, 18, SHIRT_DARK);
  drawPixel(frame, 16, 18, SHIRT_DARK);
  drawPixel(frame, 15, 19, SHIRT_DARK);
  drawPixel(frame, 16, 19, SHIRT_DARK);

  drawRect(frame, 8, 15, 2, 7, OUTLINE);
  drawPixel(frame, 9, 16, SKIN);
  drawPixel(frame, 9, 17, SKIN);
  drawPixel(frame, 9, 18, SKIN);
  drawPixel(frame, 9, 19, SKIN);
  drawPixel(frame, 9, 20, SKIN);

  drawRect(frame, 22, 17, 2, 7, OUTLINE);
  drawPixel(frame, 22, 18, SKIN);
  drawPixel(frame, 22, 19, SKIN);
  drawPixel(frame, 22, 20, SKIN);
  drawPixel(frame, 22, 21, SKIN);
  drawPixel(frame, 22, 22, SKIN);

  for (let y = 25; y <= 30; y++) {
    for (let x = 10; x <= 15; x++) {
      drawPixel(frame, x, y, null);
    }
    for (let x = 16; x <= 21; x++) {
      drawPixel(frame, x, y, null);
    }
  }

  drawRect(frame, 10, 25, 4, 4, OUTLINE);
  drawRect(frame, 11, 26, 2, 2, PANTS);
  drawRect(frame, 10, 28, 5, 2, OUTLINE);
  drawPixel(frame, 11, 29, SHOES);
  drawPixel(frame, 12, 29, SHOES);
  drawPixel(frame, 13, 29, SHOES);

  drawRect(frame, 17, 25, 4, 6, OUTLINE);
  drawRect(frame, 18, 26, 2, 4, PANTS);
  drawRect(frame, 17, 30, 4, 1, OUTLINE);
  drawPixel(frame, 18, 30, SHOES);
  drawPixel(frame, 19, 30, SHOES);
  drawPixel(frame, 20, 30, SHOES);

  return frame;
}

function createWalkFrame2(): FrameData {
  const frame = createIdleFrame();

  drawRect(frame, 10, 15, 12, 10, OUTLINE);
  drawRect(frame, 11, 16, 10, 8, SHIRT);
  drawRect(frame, 11, 16, 10, 1, SHIRT_LIGHT);
  drawPixel(frame, 15, 18, SHIRT_DARK);
  drawPixel(frame, 16, 18, SHIRT_DARK);
  drawPixel(frame, 15, 19, SHIRT_DARK);
  drawPixel(frame, 16, 19, SHIRT_DARK);
  drawPixel(frame, 14, 20, SHIRT_DARK);
  drawPixel(frame, 17, 20, SHIRT_DARK);

  drawRect(frame, 7, 17, 2, 7, OUTLINE);
  drawPixel(frame, 8, 18, SKIN);
  drawPixel(frame, 8, 19, SKIN);
  drawPixel(frame, 8, 20, SKIN);
  drawPixel(frame, 8, 21, SKIN);
  drawPixel(frame, 8, 22, SKIN);

  drawRect(frame, 23, 15, 2, 7, OUTLINE);
  drawPixel(frame, 23, 16, SKIN);
  drawPixel(frame, 23, 17, SKIN);
  drawPixel(frame, 23, 18, SKIN);
  drawPixel(frame, 23, 19, SKIN);
  drawPixel(frame, 23, 20, SKIN);

  for (let y = 25; y <= 31; y++) {
    for (let x = 10; x <= 22; x++) {
      drawPixel(frame, x, y, null);
    }
  }

  drawRect(frame, 12, 26, 4, 5, OUTLINE);
  drawRect(frame, 13, 27, 2, 3, PANTS);
  drawRect(frame, 11, 30, 5, 1, OUTLINE);
  drawPixel(frame, 12, 30, SHOES);
  drawPixel(frame, 13, 30, SHOES);
  drawPixel(frame, 14, 30, SHOES);
  drawPixel(frame, 15, 30, SHOES);

  drawRect(frame, 18, 24, 4, 4, OUTLINE);
  drawRect(frame, 19, 25, 2, 2, PANTS);
  drawRect(frame, 17, 27, 5, 2, OUTLINE);
  drawPixel(frame, 18, 28, SHOES);
  drawPixel(frame, 19, 28, SHOES);
  drawPixel(frame, 20, 28, SHOES);

  return frame;
}

function createWalkFrame3(): FrameData {
  const frame = createIdleFrame();

  drawRect(frame, 10, 15, 12, 10, OUTLINE);
  drawRect(frame, 11, 16, 10, 8, SHIRT);
  drawRect(frame, 11, 16, 10, 1, SHIRT_LIGHT);
  drawPixel(frame, 15, 18, SHIRT_DARK);
  drawPixel(frame, 16, 18, SHIRT_DARK);
  drawPixel(frame, 15, 19, SHIRT_DARK);
  drawPixel(frame, 16, 19, SHIRT_DARK);

  drawRect(frame, 8, 17, 2, 7, OUTLINE);
  drawPixel(frame, 9, 18, SKIN);
  drawPixel(frame, 9, 19, SKIN);
  drawPixel(frame, 9, 20, SKIN);
  drawPixel(frame, 9, 21, SKIN);
  drawPixel(frame, 9, 22, SKIN);

  drawRect(frame, 22, 15, 2, 7, OUTLINE);
  drawPixel(frame, 22, 16, SKIN);
  drawPixel(frame, 22, 17, SKIN);
  drawPixel(frame, 22, 18, SKIN);
  drawPixel(frame, 22, 19, SKIN);
  drawPixel(frame, 22, 20, SKIN);

  for (let y = 25; y <= 30; y++) {
    for (let x = 10; x <= 21; x++) {
      drawPixel(frame, x, y, null);
    }
  }

  drawRect(frame, 11, 25, 4, 6, OUTLINE);
  drawRect(frame, 12, 26, 2, 4, PANTS);
  drawRect(frame, 10, 30, 5, 1, OUTLINE);
  drawPixel(frame, 11, 30, SHOES);
  drawPixel(frame, 12, 30, SHOES);
  drawPixel(frame, 13, 30, SHOES);
  drawPixel(frame, 14, 30, SHOES);

  drawRect(frame, 18, 25, 4, 4, OUTLINE);
  drawRect(frame, 19, 26, 2, 2, PANTS);
  drawRect(frame, 17, 28, 5, 2, OUTLINE);
  drawPixel(frame, 18, 29, SHOES);
  drawPixel(frame, 19, 29, SHOES);
  drawPixel(frame, 20, 29, SHOES);

  return frame;
}

function createWalkFrame4(): FrameData {
  const frame = createIdleFrame();

  drawRect(frame, 10, 15, 12, 10, OUTLINE);
  drawRect(frame, 11, 16, 10, 8, SHIRT);
  drawRect(frame, 11, 16, 10, 1, SHIRT_LIGHT);
  drawPixel(frame, 15, 18, SHIRT_DARK);
  drawPixel(frame, 16, 18, SHIRT_DARK);
  drawPixel(frame, 15, 19, SHIRT_DARK);
  drawPixel(frame, 16, 19, SHIRT_DARK);
  drawPixel(frame, 14, 20, SHIRT_DARK);
  drawPixel(frame, 17, 20, SHIRT_DARK);

  drawRect(frame, 8, 15, 2, 7, OUTLINE);
  drawPixel(frame, 9, 16, SKIN);
  drawPixel(frame, 9, 17, SKIN);
  drawPixel(frame, 9, 18, SKIN);
  drawPixel(frame, 9, 19, SKIN);
  drawPixel(frame, 9, 20, SKIN);

  drawRect(frame, 23, 17, 2, 7, OUTLINE);
  drawPixel(frame, 23, 18, SKIN);
  drawPixel(frame, 23, 19, SKIN);
  drawPixel(frame, 23, 20, SKIN);
  drawPixel(frame, 23, 21, SKIN);
  drawPixel(frame, 23, 22, SKIN);

  for (let y = 25; y <= 31; y++) {
    for (let x = 10; x <= 22; x++) {
      drawPixel(frame, x, y, null);
    }
  }

  drawRect(frame, 10, 25, 4, 4, OUTLINE);
  drawRect(frame, 11, 26, 2, 2, PANTS);
  drawRect(frame, 9, 28, 5, 2, OUTLINE);
  drawPixel(frame, 10, 29, SHOES);
  drawPixel(frame, 11, 29, SHOES);
  drawPixel(frame, 12, 29, SHOES);

  drawRect(frame, 17, 25, 4, 6, OUTLINE);
  drawRect(frame, 18, 26, 2, 4, PANTS);
  drawRect(frame, 16, 30, 5, 1, OUTLINE);
  drawPixel(frame, 17, 30, SHOES);
  drawPixel(frame, 18, 30, SHOES);
  drawPixel(frame, 19, 30, SHOES);
  drawPixel(frame, 20, 30, SHOES);

  return frame;
}

function buildPresetFrames(): FrameData[] {
  return [
    createIdleFrame(),
    createWalkFrame1(),
    createWalkFrame2(),
    createWalkFrame3(),
    createWalkFrame4()
  ];
}

function handleResponsiveEditor(canvas: HTMLCanvasElement): void {
  const apply = () => {
    if (window.innerWidth <= 768) {
      canvas.style.width = `${PIXEL_SIZE * 8}px`;
      canvas.style.height = `${PIXEL_SIZE * 8}px`;
    } else {
      canvas.style.width = `${PIXEL_SIZE * SCALE}px`;
      canvas.style.height = `${PIXEL_SIZE * SCALE}px`;
    }
  };
  apply();
  window.addEventListener('resize', apply);
}

function init(): void {
  const editorCanvas = document.getElementById('editorCanvas') as HTMLCanvasElement;
  handleResponsiveEditor(editorCanvas);

  const editor = new PixelEditor(
    'editorCanvas',
    'paletteGrid',
    'framesContainer',
    'pixelInfo',
    'frameInfo'
  );

  const animator = new Animator('previewCanvas', 'previewInfo', editor);

  editor.setFrames(buildPresetFrames());
  animator.refresh();

  editor.onFrameChange = (index) => {
    animator.goToFrame(index);
  };

  editor.onFramesUpdate = () => {
    animator.refresh();
  };

  const playBtn = document.getElementById('playBtn') as HTMLButtonElement;
  const prevFrameBtn = document.getElementById('prevFrameBtn') as HTMLButtonElement;
  const nextFrameBtn = document.getElementById('nextFrameBtn') as HTMLButtonElement;
  const speedSlider = document.getElementById('speedSlider') as HTMLInputElement;
  const speedLabel = document.getElementById('speedLabel') as HTMLElement;
  const loopToggle = document.getElementById('loopToggle') as HTMLInputElement;
  const gridToggle = document.getElementById('gridToggle') as HTMLInputElement;
  const frameTimeInput = document.getElementById('frameTimeInput') as HTMLInputElement;
  const exportPngBtn = document.getElementById('exportPngBtn') as HTMLButtonElement;
  const exportJsonBtn = document.getElementById('exportJsonBtn') as HTMLButtonElement;

  animator.onPlayStateChange = (playing) => {
    playBtn.textContent = playing ? '⏸' : '▶';
  };

  playBtn.addEventListener('click', () => animator.toggle());
  prevFrameBtn.addEventListener('click', () => animator.prevFrame());
  nextFrameBtn.addEventListener('click', () => animator.nextFrame());

  speedSlider.addEventListener('input', () => {
    const speed = parseFloat(speedSlider.value);
    animator.setSpeed(speed);
    speedLabel.textContent = `${speed.toFixed(1)}x`;
  });

  loopToggle.addEventListener('change', () => {
    animator.setLoop(loopToggle.checked);
  });

  gridToggle.addEventListener('change', () => {
    editor.setShowGrid(gridToggle.checked);
  });

  frameTimeInput.addEventListener('change', () => {
    let val = parseInt(frameTimeInput.value, 10);
    if (isNaN(val)) val = 200;
    val = Math.max(100, Math.min(500, val));
    frameTimeInput.value = String(val);
    animator.setFrameDuration(val);
  });

  exportPngBtn.addEventListener('click', () => editor.exportSpriteSheetPNG());
  exportJsonBtn.addEventListener('click', () => editor.exportAnimationJSON());

  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        animator.toggle();
        break;
      case 'ArrowLeft':
        animator.prevFrame();
        break;
      case 'ArrowRight':
        animator.nextFrame();
        break;
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
