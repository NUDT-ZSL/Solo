import Phaser from 'phaser';
import { MenuScene } from './scene/MenuScene';
import { GameScene } from './scene/GameScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: 800,
  height: 500,
  backgroundColor: '#7EC8E3',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 800 },
      debug: false,
    },
  },
  scene: [MenuScene, GameScene],
  render: {
    pixelArt: false,
    antialias: true,
  },
};

const game = new Phaser.Game(config);
