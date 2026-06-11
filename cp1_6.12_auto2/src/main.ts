import Phaser from 'phaser';
import { GameScene } from './scene/GameScene.js';
import { RoomPanel } from './ui/roomPanel.js';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  canvas: canvas,
  width: 960,
  height: 540,
  parent: 'game-area',
  scene: [GameScene],
  backgroundColor: '#0a0a0f',
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
  input: {
    keyboard: true,
    mouse: true,
    touch: true,
  },
};

const game = new Phaser.Game(config);

game.events.on('ready', () => {
  const roomPanel = new RoomPanel();
  roomPanel.initialize();

  function resizeCanvas() {
    const gameArea = document.querySelector('.game-area') as HTMLElement;
    if (!gameArea) return;

    const maxWidth = gameArea.clientWidth - 32;
    const maxHeight = gameArea.clientHeight - 32;
    const aspectRatio = 16 / 9;

    let width = maxWidth;
    let height = width / aspectRatio;

    if (height > maxHeight) {
      height = maxHeight;
      width = height * aspectRatio;
    }

    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }

  window.addEventListener('resize', resizeCanvas);
  resizeCanvas();
});

window.addEventListener('beforeunload', () => {
  game.destroy(true);
});
