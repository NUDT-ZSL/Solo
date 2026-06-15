import { InkBrush, type BrushParams } from './inkBrush';
import { UIControls, type UIControlsParams } from './uiControls';

const canvas = document.getElementById('canvas') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;
const controlPanel = document.getElementById('controlPanel')!;

let dpr = window.devicePixelRatio || 1;
let inkBrush: InkBrush;

const initialParams: UIControlsParams = {
  inkAmount: 0.7,
  waterAmount: 12,
  pressure: 14
};

function resizeCanvas(): void {
  dpr = window.devicePixelRatio || 1;
  const width = window.innerWidth;
  const height = window.innerHeight;

  const imageData = canvas.width > 0 && canvas.height > 0
    ? ctx.getImageData(0, 0, canvas.width, canvas.height)
    : null;

  canvas.width = width * dpr;
  canvas.height = height * dpr;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  ctx.scale(dpr, dpr);
  drawPaperBackground(width, height);

  if (imageData) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = imageData.width;
    tempCanvas.height = imageData.height;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);
    ctx.drawImage(
      tempCanvas,
      0, 0, imageData.width, imageData.height,
      0, 0, canvas.width, canvas.height
    );
    ctx.restore();
  }
}

function drawPaperBackground(w: number, h: number): void {
  ctx.fillStyle = '#f5f0e6';
  ctx.fillRect(0, 0, w, h);

  const noiseCanvas = document.createElement('canvas');
  noiseCanvas.width = 200;
  noiseCanvas.height = 200;
  const noiseCtx = noiseCanvas.getContext('2d')!;
  const imageData = noiseCtx.createImageData(200, 200);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 12;
    data[i] = Math.min(255, Math.max(0, 245 + noise));
    data[i + 1] = Math.min(255, Math.max(0, 240 + noise));
    data[i + 2] = Math.min(255, Math.max(0, 230 + noise));
    data[i + 3] = 5;
  }

  noiseCtx.putImageData(imageData, 0, 0);
  const pattern = ctx.createPattern(noiseCanvas, 'repeat');
  if (pattern) {
    ctx.fillStyle = pattern;
    ctx.fillRect(0, 0, w, h);
  }
}

function getCanvasCoordinates(e: MouseEvent | Touch): { x: number; y: number } {
  const rect = canvas.getBoundingClientRect();
  return {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top
  };
}

let isDrawing = false;

function handleMouseDown(e: MouseEvent): void {
  isDrawing = true;
  const { x, y } = getCanvasCoordinates(e);
  inkBrush.start(x, y);
}

function handleMouseMove(e: MouseEvent): void {
  if (!isDrawing) return;
  const { x, y } = getCanvasCoordinates(e);
  inkBrush.move(x, y);
}

function handleMouseUp(): void {
  if (!isDrawing) return;
  isDrawing = false;
  inkBrush.end();
}

function handleTouchStart(e: TouchEvent): void {
  e.preventDefault();
  if (e.touches.length === 0) return;
  isDrawing = true;
  const { x, y } = getCanvasCoordinates(e.touches[0]);
  inkBrush.start(x, y);
}

function handleTouchMove(e: TouchEvent): void {
  e.preventDefault();
  if (!isDrawing || e.touches.length === 0) return;
  const { x, y } = getCanvasCoordinates(e.touches[0]);
  inkBrush.move(x, y);
}

function handleTouchEnd(e: TouchEvent): void {
  e.preventDefault();
  if (!isDrawing) return;
  isDrawing = false;
  inkBrush.end();
}

function clearCanvas(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  ctx.clearRect(0, 0, width, height);
  drawPaperBackground(width, height);
}

function saveCanvas(): void {
  const link = document.createElement('a');
  link.download = `水墨书法_${Date.now()}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function updateBrushParams(params: BrushParams): void {
  inkBrush.updateParams(params);
}

function init(): void {
  resizeCanvas();

  inkBrush = new InkBrush(ctx, {
    inkAmount: initialParams.inkAmount,
    waterAmount: initialParams.waterAmount,
    pressure: initialParams.pressure
  });

  new UIControls(
    controlPanel,
    initialParams,
    updateBrushParams,
    clearCanvas,
    saveCanvas
  );

  window.addEventListener('resize', resizeCanvas);

  canvas.addEventListener('mousedown', handleMouseDown);
  window.addEventListener('mousemove', handleMouseMove);
  window.addEventListener('mouseup', handleMouseUp);

  canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
  canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
  canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
  canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });
}

init();
