import { UIController } from './uiController.js';

function bootstrap(): void {
  const root = document.getElementById('app');
  if (!root) {
    console.error('Mount point #app not found');
    return;
  }
  const controller = new UIController(root);
  controller.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
