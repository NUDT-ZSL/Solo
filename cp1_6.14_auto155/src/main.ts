import { SceneManager } from './scene-manager';

function bootstrap(): void {
  const canvas = document.getElementById('gameCanvas') as HTMLCanvasElement | null;
  if (!canvas) {
    console.error('[FleetTactics] Canvas element #gameCanvas not found');
    return;
  }

  try {
    const scene = new SceneManager(canvas);
    scene.start();
    console.info('[FleetTactics] 太空舰队战术模拟启动成功');
  } catch (err) {
    console.error('[FleetTactics] 启动失败:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
