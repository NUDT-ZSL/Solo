import { App } from './App';

const container = document.getElementById('app');
if (!container) {
  throw new Error('Root element #app not found');
}

new App(container);
