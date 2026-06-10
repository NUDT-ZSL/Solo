import { App } from './App';

function bootstrap(): void {
  const container = document.getElementById('app');
  if (!container) {
    console.error('Container #app not found');
    return;
  }

  const app = new App(container);
  app.init();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
