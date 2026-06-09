import { SceneManager } from './SceneManager';
import { InteractionHandler } from './InteractionHandler';

const container = document.getElementById('app');
if (!container) {
  throw new Error('Container element #app not found');
}

const sceneManager = SceneManager.instance;
sceneManager.mount(container);

const interactionHandler = new InteractionHandler(container, sceneManager);

const canvas = sceneManager.renderer.domElement;
canvas.style.outline = 'none';
container.style.cursor = 'crosshair';

for (let i = 0; i < 12; i++) {
  sceneManager.addNode();
}

const fpsCounter = document.createElement('div');
fpsCounter.style.position = 'fixed';
fpsCounter.style.bottom = '20px';
fpsCounter.style.right = '20px';
fpsCounter.style.color = 'rgba(200, 200, 255, 0.6)';
fpsCounter.style.fontFamily = "'Segoe UI', sans-serif";
fpsCounter.style.fontSize = '12px';
fpsCounter.style.lineHeight = '1.8';
fpsCounter.style.pointerEvents = 'none';
fpsCounter.style.textAlign = 'right';
document.body.appendChild(fpsCounter);

let lastTime = performance.now();
let frameCount = 0;
let fpsTime = 0;
let currentFps = 60;

function updateStats() {
  const stats = sceneManager.getStats();
  fpsCounter.innerHTML =
    `<span style="color: rgba(255, 220, 180, 0.8)">FPS</span>: ${currentFps}<br/>` +
    `<span style="color: rgba(255, 220, 180, 0.8)">节点</span>: ${stats.nodes} / 200<br/>` +
    `<span style="color: rgba(255, 220, 180, 0.8)">丝线</span>: ${stats.threads} / 5000<br/>` +
    `<span style="color: rgba(255, 220, 180, 0.8)">粒子</span>: ${stats.particles}`;
}

function animate(): void {
  requestAnimationFrame(animate);

  const now = performance.now();
  const delta = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;

  frameCount++;
  fpsTime += delta;
  if (fpsTime >= 0.5) {
    currentFps = Math.round(frameCount / fpsTime);
    frameCount = 0;
    fpsTime = 0;
    updateStats();
  }

  interactionHandler.update();
  sceneManager.update(delta);

  const blur = sceneManager.radialBlurAmount;
  if (blur > 0.01) {
    canvas.style.filter = `blur(${blur * 3}px) brightness(${1 + blur * 0.2}) contrast(${1 + blur * 0.1})`;
  } else {
    canvas.style.filter = 'none';
  }

  sceneManager.render();
}

animate();

console.log('%c星芒织机 已启动', 'color: #b8a0ff; font-size: 16px; font-weight: bold;');
console.log('%c操作说明：点击空白生成节点，点击节点触发局部脉冲', 'color: #a090cc;');
console.log('%c拖拽旋转视角，Shift+拖拽平移，滚轮缩放，空格爆发', 'color: #a090cc;');
