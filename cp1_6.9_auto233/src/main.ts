import Phaser from 'phaser';
import { BootScene } from './scenes/BootScene';
import { GameScene } from './scenes/GameScene';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from './config/gameConfig';

const container = document.getElementById('game-container');

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: container ?? undefined,
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  backgroundColor: '#0a0015',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  render: {
    antialias: true,
    pixelArt: false,
    roundPixels: false,
    powerPreference: 'high-performance'
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false
    }
  },
  scene: [BootScene, GameScene],
  fps: {
    target: 60,
    forceSetTimeOut: false
  }
};

new Phaser.Game(config);
