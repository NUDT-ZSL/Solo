import { Renderer } from './Renderer';
import { ParticleSystem } from './ParticleSystem';
import { ScrollManager } from './ScrollManager';

function bootstrap(): void {
  const canvas = document.getElementById('scrollCanvas') as HTMLCanvasElement | null;
  const leftRod = document.getElementById('leftRod');
  const rightRod = document.getElementById('rightRod');
  const chapterNav = document.getElementById('chapterNav');
  const scrollWrapper = document.getElementById('scrollWrapper');

  if (!canvas || !leftRod || !rightRod || !chapterNav || !scrollWrapper) {
    console.error('残章卷轴初始化失败：缺少必要的 DOM 元素');
    return;
  }

  try {
    const renderer = new Renderer(canvas);
    const particleSystem = new ParticleSystem(canvas);
    const manager = new ScrollManager(renderer, particleSystem, canvas, {
      leftRod,
      rightRod,
      chapterNav,
      scrollWrapper
    });

    manager.start();
  } catch (err) {
    console.error('残章卷轴初始化异常：', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
