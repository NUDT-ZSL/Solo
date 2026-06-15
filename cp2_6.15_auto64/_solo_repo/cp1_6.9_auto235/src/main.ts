import { Controller } from './controller.js';

function bootstrap(): void {
  const canvas = document.getElementById('stage') as HTMLCanvasElement | null;
  const countDisplay = document.getElementById('bubbleCount') as HTMLElement | null;
  const resetBtn = document.getElementById('resetBtn') as HTMLElement | null;

  if (!canvas || !countDisplay || !resetBtn) {
    console.error('[微光回响] 必要的DOM元素未找到');
    return;
  }

  const controller = new Controller(canvas, countDisplay, resetBtn);
  controller.init();

  console.log('[微光回响] 已初始化 · 点击播撒 · 拖拽吸引');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
