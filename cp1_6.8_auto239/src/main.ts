import Phaser from 'phaser';
import { MazeScene } from './scenes/MazeScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 800,
  height: 600,
  parent: document.body,
  backgroundColor: '#000000',
  fps: {
    target: 60,
    forceSetTimeOut: false,
  },
  scene: [MazeScene],
  physics: {
    default: 'arcade',
    arcade: {
      debug: false,
    },
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: true,
  },
};

const game = new Phaser.Game(config);
