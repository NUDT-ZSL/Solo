import Phaser from 'phaser';
import { GameScene } from './scenes/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game',
  width: 1200,
  height: 800,
  backgroundColor: '#2B0000',
  pixelArt: false,
  antialias: true,
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [GameScene],
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false
  }
};

new Phaser.Game(config);
