import Phaser from 'phaser';
import GameScene from './GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1000,
  height: 700,
  parent: 'game-container',
  backgroundColor: '#1a1a2e',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    min: {
      width: 1000,
      height: 700
    }
  },
  physics: {
    default: 'matter',
    matter: {
      gravity: { x: 0, y: 1.2 },
      debug: false,
      enableSleeping: false,
      positionIterations: 6,
      velocityIterations: 4,
      constraintIterations: 2
    }
  },
  scene: [GameScene],
  render: {
    pixelArt: false,
    antialias: true,
    antialiasGL: true,
    roundPixels: false
  },
  fps: {
    target: 60,
    forceSetTimeOut: false
  }
};

new Phaser.Game(config);
