import Phaser from 'phaser';
import MainScene from './Scene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  backgroundColor: '#0a0a14',
  scale: {
    mode: Phaser.Scale.RESIZE,
    width: window.innerWidth,
    height: window.innerHeight,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  },
  fps: {
    target: 60,
    forceSetTimeOut: true
  },
  scene: [MainScene]
};

export default new Phaser.Game(config);
