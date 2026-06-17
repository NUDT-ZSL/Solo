import { CardGame } from './cardGame';

window.addEventListener('DOMContentLoaded', () => {
  const app = document.getElementById('app');
  if (!app) {
    console.error('#app 元素未找到');
    return;
  }
  const container = document.createElement('div');
  container.id = 'game-container';
  app.appendChild(container);

  const game = new CardGame('game-container');
  game.start();
});
