import Phaser from 'phaser';
import { GameScene } from './scene/GameScene.js';
import { RoomPanel } from './ui/roomPanel.js';

const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.CANVAS,
  canvas: canvas,
  width: 960,
  height: 540,
  parent: 'game-canvas-wrapper',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 960,
    height: 540,
  },
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
});

window.addEventListener('beforeunload', () => {
  game.destroy(true);
});
