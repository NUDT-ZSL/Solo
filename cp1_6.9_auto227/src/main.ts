import { Renderer } from './renderer';

function bootstrap(): void {
  const canvas = document.getElementById('stage') as HTMLCanvasElement | null;

  if (!canvas) {
    console.error('[浮光掠影集] Canvas 元素未找到');
    return;
  }

  const renderer = new Renderer(canvas);
  renderer.start();

  console.log('[浮光掠影集] 初始化完成 · 移动鼠标吸引光符 · 点击捕获');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
