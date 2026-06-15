import { GridManager } from './grid';
import { InteractionHandler } from './interaction';

const canvas = document.getElementById('app') as HTMLCanvasElement;
if (!canvas) {
  throw new Error('Canvas element #app not found');
}

const grid = new GridManager(canvas);
new InteractionHandler(canvas, grid);

let lastFrameTime = performance.now();
let frameCount = 0;
let fpsReportTime = lastFrameTime;

function animate(now: number): void {
  const deltaTime = Math.min(now - lastFrameTime, 100);
  lastFrameTime = now;

  grid.update(deltaTime, now);
  grid.render(now);

  frameCount++;
  if (now - fpsReportTime >= 2000) {
    const fps = Math.round((frameCount * 1000) / (now - fpsReportTime));
    const cells = grid.getCellCount();
    console.debug(`[液态光毯] FPS: ${fps} | 色块数: ${cells}`);
    frameCount = 0;
    fpsReportTime = now;
  }

  requestAnimationFrame(animate);
}

requestAnimationFrame(animate);

console.log('[液态光毯] 已启动。移动鼠标产生风效，按下产生波纹，抬起触以色爆。');
