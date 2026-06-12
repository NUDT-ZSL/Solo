import Phaser from 'phaser';
import { BoardScene } from './BoardScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: window.innerWidth,
  height: window.innerHeight,
  backgroundColor: '#2c3e50',
  scene: [BoardScene],
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
  fps: {
    target: 60,
    forceSetTimeOut: true,
  },
};

window.addEventListener('load', () => {
  new Phaser.Game(config);
});

window.addEventListener('resize', () => {
  const game = Phaser.Game as any;
  if (game.instance && game.instance.scale) {
    game.instance.scale.resize(window.innerWidth, window.innerHeight);
  }
});
